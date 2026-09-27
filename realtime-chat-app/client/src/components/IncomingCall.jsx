// client/src/components/IncomingCall.jsx
// A small floating notification shown when someone is calling you.

export default function IncomingCall({ callerName, callType, onAccept, onReject }) {
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="incoming-call-avatar">{callerName?.charAt(0).toUpperCase()}</div>
        <h3>{callerName}</h3>
        <p>Incoming {callType === 'video' ? 'video' : 'audio'} call...</p>
        <div className="incoming-call-actions">
          <button className="call-btn reject" onClick={onReject} title="Reject">
            ✕
          </button>
          <button className="call-btn accept" onClick={onAccept} title="Accept">
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
