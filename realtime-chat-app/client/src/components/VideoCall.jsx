// client/src/components/VideoCall.jsx
//
// Full one-to-one WebRTC video/audio call UI + signaling logic.
// A STUN server is used for NAT traversal during development. To support
// users behind restrictive/symmetric NATs later, add a "turns:" / "turn:"
// entry (with username/credential) to the iceServers array below - no other
// code in this component needs to change.

import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Example of how a TURN server would be added later:
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' },
  ],
};

export default function VideoCall({
  socket,
  remoteUserId,
  remoteUserName,
  callType, // 'video' | 'audio'
  isCaller, // true if this client started the call
  incomingOffer, // SDP offer, only present when isCaller === false
  onEndCall,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]); // ICE candidates that arrive before remote description is set
  const timerRef = useRef(null);

  const [status, setStatus] = useState('Connecting...'); // Calling... | Connecting... | Connected | Call Ended
  const [errorMsg, setErrorMsg] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    pcRef.current = null;
  }, [stopTimer]);

  const endCall = useCallback(
    (notifyRemote = true) => {
      if (notifyRemote) {
        socket?.emit('end-call', { to: remoteUserId });
      }
      cleanup();
      setStatus('Call Ended');
      setTimeout(() => onEndCall?.(), 600); // brief pause so the user sees "Call Ended"
    },
    [socket, remoteUserId, cleanup, onEndCall]
  );

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        // 1. Get local camera/microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2. Create the RTCPeerConnection and attach local tracks
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', { to: remoteUserId, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return;
          const state = pc.connectionState;
          if (state === 'connected') {
            setStatus('Connected');
            startTimer();
          } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            if (state === 'failed') setErrorMsg('Connection failed. The call has ended.');
            endCall(false);
          }
        };

        if (isCaller) {
          setStatus('Calling...');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call-user', { to: remoteUserId, offer, callType });
        } else {
          setStatus('Connecting...');
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          // Apply any ICE candidates that arrived before the remote description was ready
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer-call', { to: remoteUserId, answer });
        }
      } catch (err) {
        console.error('WebRTC setup error:', err);
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera/microphone permission was denied. Please allow access and try again.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No camera or microphone was found on this device.');
        } else {
          setErrorMsg('Could not start the call. Please try again.');
        }
      }
    };

    setup();

    // --- Socket listeners for this call's lifetime ---
    const handleAnswered = async ({ answer }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error applying remote answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Remote description not ready yet - queue it for later
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleRejected = () => {
      setErrorMsg(`${remoteUserName} declined the call.`);
      cleanup();
      setStatus('Call Ended');
      setTimeout(() => onEndCall?.(), 1200);
    };

    const handleEnded = () => {
      cleanup();
      setStatus('Call Ended');
      setTimeout(() => onEndCall?.(), 600);
    };

    socket.on('call-answered', handleAnswered);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-rejected', handleRejected);
    socket.on('call-ended', handleEnded);

    return () => {
      cancelled = true;
      socket.off('call-answered', handleAnswered);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-rejected', handleRejected);
      socket.off('call-ended', handleEnded);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const formatDuration = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />

        {(!camOn || callType === 'audio') && (
          <div className="audio-call-placeholder">
            <div className="incoming-call-avatar">{remoteUserName?.charAt(0).toUpperCase()}</div>
          </div>
        )}

        <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />

        <div className="call-status-bar">
          <span className="call-remote-name">{remoteUserName}</span>
          <span className="call-status-text">
            {status === 'Connected' ? formatDuration(duration) : status}
          </span>
          {errorMsg && <span className="call-error">{errorMsg}</span>}
        </div>

        <div className="call-controls">
          <button className={`call-btn ${micOn ? '' : 'off'}`} onClick={toggleMic} title="Toggle microphone">
            {micOn ? '🎤' : '🔇'}
          </button>
          <button className={`call-btn ${camOn ? '' : 'off'}`} onClick={toggleCam} title="Toggle camera">
            {camOn ? '📹' : '🚫'}
          </button>
          <button className="call-btn end" onClick={() => endCall(true)} title="End call">
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
