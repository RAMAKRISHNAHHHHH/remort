// client/src/components/MessageInput.jsx
// Text box + send button + typing indicator triggers + call buttons.

import { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTyping, onStopTyping, onStartVideoCall, onStartAudioCall }) {
  const [text, setText] = useState('');
  const typingTimeout = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();

    // Debounce: only fire "stop-typing" after the user pauses for 1.5s
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      onStopTyping?.();
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return; // guard against empty messages
    onSend(trimmed);
    setText('');
    onStopTyping?.();
  };

  return (
    <form className="message-input-bar" onSubmit={handleSubmit}>
      <button type="button" className="icon-btn" title="Audio call" onClick={onStartAudioCall}>
        📞
      </button>
      <button type="button" className="icon-btn" title="Video call" onClick={onStartVideoCall}>
        📹
      </button>
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Type a message..."
      />
      <button type="submit" className="send-btn" title="Send" disabled={!text.trim()}>
        ➤
      </button>
    </form>
  );
}
