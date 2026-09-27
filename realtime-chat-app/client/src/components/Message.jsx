// client/src/components/Message.jsx
// Renders a single chat bubble, aligned left/right depending on the sender.

export default function Message({ msg, isOwn, onDelete }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  let statusIcon = '';
  if (isOwn) {
    if (msg.isRead) statusIcon = '✓✓'; // read (could be styled blue in CSS)
    else if (msg.isDelivered) statusIcon = '✓✓';
    else statusIcon = '✓';
  }

  return (
    <div className={`message-row ${isOwn ? 'own' : 'other'}`}>
      <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
        <p className="message-text">{msg.message}</p>
        <div className="message-meta">
          <span className="message-time">{time}</span>
          {isOwn && (
            <span className={`message-status ${msg.isRead ? 'read' : ''}`}>{statusIcon}</span>
          )}
          {isOwn && onDelete && (
            <button className="message-delete" onClick={() => onDelete(msg._id)} title="Delete">
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
