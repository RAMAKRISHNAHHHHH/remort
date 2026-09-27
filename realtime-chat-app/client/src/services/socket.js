// client/src/services/socket.js
// Creates (and reuses) a single Socket.IO client connection for the whole app.

import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

// Call this once, right after login, with the JWT token.
export const connectSocket = (token) => {
  if (socket && socket.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
