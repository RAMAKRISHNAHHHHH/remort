// client/src/pages/Chat.jsx
// The main authenticated screen: sidebar + chat window + call handling.

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAllUsers, getMessages, deleteMessageHttp } from '../services/api';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import IncomingCall from '../components/IncomingCall';
import VideoCall from '../components/VideoCall';

export default function Chat() {
  const { user } = useAuth();
  const socket = useSocket();

  const [users, setUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [messagesByUser, setMessagesByUser] = useState({}); // { userId: [messages] }
  const [typingUserIds, setTypingUserIds] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [loadError, setLoadError] = useState('');

  // --- Call state ---
  const [incomingCall, setIncomingCall] = useState(null); // { from, offer, callType, callerName }
  const [activeCall, setActiveCall] = useState(null); // { remoteUserId, remoteUserName, callType, isCaller, incomingOffer }

  const selectedUserRef = useRef(selectedUser);
  selectedUserRef.current = selectedUser;

  // --- Load the user list once on mount ---
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await getAllUsers();
        setUsers(data.users);
        const initiallyOnline = new Set(
          data.users.filter((u) => u.status === 'online').map((u) => u._id)
        );
        setOnlineUserIds(initiallyOnline);
      } catch (err) {
        setLoadError('Could not load the user list. Please refresh the page.');
      }
    };
    loadUsers();
  }, []);

  // Apply dark mode to the document body
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // --- Load message history whenever a user is selected ---
  useEffect(() => {
    if (!selectedUser) return;
    const load = async () => {
      try {
        const { data } = await getMessages(selectedUser._id);
        setMessagesByUser((prev) => ({ ...prev, [selectedUser._id]: data.messages }));
        setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    load();
  }, [selectedUser]);

  // --- Socket event wiring ---
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = ({ userId }) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    };

    const handleUserOffline = ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleReceiveMessage = (msg) => {
      const otherUserId = msg.sender;
      setMessagesByUser((prev) => ({
        ...prev,
        [otherUserId]: [...(prev[otherUserId] || []), msg],
      }));

      if (selectedUserRef.current?._id === otherUserId) {
        // Chat is open - immediately tell the sender we've read it
        socket.emit('message-read', { messageId: msg._id, sender: otherUserId });
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
      }
    };

    const handleMessageSent = (msg) => {
      // Confirmation echo of a message this client just sent
      setMessagesByUser((prev) => ({
        ...prev,
        [msg.receiver]: [...(prev[msg.receiver] || []).filter((m) => m._id !== msg._id), msg],
      }));
    };

    const handleMessageDelivered = ({ messageId, sender }) => {
      const otherUserId = sender === user._id ? null : sender;
      setMessagesByUser((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map((m) =>
            m._id === messageId ? { ...m, isDelivered: true } : m
          );
        }
        return updated;
      });
    };

    const handleMessageRead = ({ messageId }) => {
      setMessagesByUser((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map((m) =>
            m._id === messageId ? { ...m, isRead: true, isDelivered: true } : m
          );
        }
        return updated;
      });
    };

    const handleTyping = ({ from }) => {
      setTypingUserIds((prev) => new Set(prev).add(from));
    };

    const handleStopTyping = ({ from }) => {
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(from);
        return next;
      });
    };

    // --- Call signaling ---
    const handleIncomingCall = ({ from, offer, callType }) => {
      const caller = users.find((u) => u._id === from);
      setIncomingCall({ from, offer, callType, callerName: caller?.name || 'Unknown user' });
    };

    const handleCallUnavailable = () => {
      alert('That user is not available right now.');
    };

    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('message-delivered', handleMessageDelivered);
    socket.on('message-read', handleMessageRead);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-unavailable', handleCallUnavailable);

    return () => {
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('message-delivered', handleMessageDelivered);
      socket.off('message-read', handleMessageRead);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-unavailable', handleCallUnavailable);
    };
  }, [socket, user, users]);

  // --- Message actions ---
  const handleSend = useCallback(
    (text) => {
      if (!selectedUser || !socket) return;
      socket.emit('send-message', { receiver: selectedUser._id, message: text });
    },
    [selectedUser, socket]
  );

  const handleDelete = useCallback(
    async (messageId) => {
      if (!selectedUser) return;
      try {
        await deleteMessageHttp(messageId);
        setMessagesByUser((prev) => ({
          ...prev,
          [selectedUser._id]: prev[selectedUser._id].filter((m) => m._id !== messageId),
        }));
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [selectedUser]
  );

  const handleTypingStart = useCallback(() => {
    if (selectedUser && socket) socket.emit('typing', { receiver: selectedUser._id });
  }, [selectedUser, socket]);

  const handleTypingStop = useCallback(() => {
    if (selectedUser && socket) socket.emit('stop-typing', { receiver: selectedUser._id });
  }, [selectedUser, socket]);

  // --- Call actions ---
  const startCall = (callType) => {
    if (!selectedUser) return;
    setActiveCall({
      remoteUserId: selectedUser._id,
      remoteUserName: selectedUser.name,
      callType,
      isCaller: true,
      incomingOffer: null,
    });
  };

  const acceptIncomingCall = () => {
    const caller = users.find((u) => u._id === incomingCall.from);
    setActiveCall({
      remoteUserId: incomingCall.from,
      remoteUserName: caller?.name || incomingCall.callerName,
      callType: incomingCall.callType,
      isCaller: false,
      incomingOffer: incomingCall.offer,
    });
    setIncomingCall(null);
  };

  const rejectIncomingCall = () => {
    socket.emit('reject-call', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endActiveCall = () => setActiveCall(null);

  const currentMessages = selectedUser ? messagesByUser[selectedUser._id] || [] : [];

  return (
    <div className={`chat-app ${selectedUser ? 'mobile-chat-open' : ''}`}>
      {loadError && <div className="global-error">{loadError}</div>}

      <Sidebar
        users={users}
        onlineUserIds={onlineUserIds}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        unreadCounts={unreadCounts}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
      />

      <ChatWindow
        selectedUser={selectedUser}
        messages={currentMessages}
        currentUserId={user._id}
        isOnline={selectedUser ? onlineUserIds.has(selectedUser._id) : false}
        isTyping={selectedUser ? typingUserIds.has(selectedUser._id) : false}
        onSend={handleSend}
        onDelete={handleDelete}
        onTyping={handleTypingStart}
        onStopTyping={handleTypingStop}
        onStartVideoCall={() => startCall('video')}
        onStartAudioCall={() => startCall('audio')}
        onBack={() => setSelectedUser(null)}
      />

      {incomingCall && !activeCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}

      {activeCall && (
        <VideoCall
          socket={socket}
          remoteUserId={activeCall.remoteUserId}
          remoteUserName={activeCall.remoteUserName}
          callType={activeCall.callType}
          isCaller={activeCall.isCaller}
          incomingOffer={activeCall.incomingOffer}
          onEndCall={endActiveCall}
        />
      )}
    </div>
  );
}
