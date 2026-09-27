// client/src/components/ChatWindow.jsx
// The main conversation panel: header, message list, and the input bar.

import { useEffect, useRef } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';

export default function ChatWindow({
  selectedUser,
  messages,
  currentUserId,
  isOnline,
  isTyping,
  onSend,
  onDelete,
  onTyping,
  onStopTyping,
  onStartVideoCall,
  onStartAudioCall,
  onBack,
}) {
  const bottomRef = useRef(null);

  // Auto-scroll to the latest message whenever the list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!selectedUser) {
    return (
      <div className="chat-window empty">
        <div className="empty-state large">
          <h2>Select a conversation</h2>
          <p>Choose a user from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button type="button" className="icon-btn mobile-back-btn" onClick={onBack} title="Back to chats">
          ←
        </button>
        <div className="avatar">
          {selectedUser.profilePicture ? (
            <img src={selectedUser.profilePicture} alt={selectedUser.name} />
          ) : (
            <span>{selectedUser.name.charAt(0).toUpperCase()}</span>
          )}
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        </div>
        <div>
          <div className="chat-header-name">{selectedUser.name}</div>
          <div className="chat-header-status">
            {isTyping ? 'typing...' : isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="message-list">
        {messages.length === 0 && (
          <div className="empty-state">No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg) => (
          <Message
            key={msg._id}
            msg={msg}
            isOwn={msg.sender === currentUserId}
            onDelete={onDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={onSend}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
        onStartVideoCall={onStartVideoCall}
        onStartAudioCall={onStartAudioCall}
      />
    </div>
  );
}
