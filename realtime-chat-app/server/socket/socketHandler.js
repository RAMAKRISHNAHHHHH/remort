// server/socket/socketHandler.js
//
// All real-time behaviour lives here: presence (online/offline), private
// messaging, typing indicators, delivery/read receipts, and WebRTC call
// signaling. Every user joins a private Socket.IO room named after their own
// user id, so events can be sent directly to one user without ever
// broadcasting to everyone connected.

const { verifySocketToken } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Message = require('../models/Message');

// Maps a userId -> socket.id, so we know who is currently online and which
// socket to notify. This is kept in memory; for a multi-server deployment
// you would move this to Redis, but for local development this is fine.
const onlineUsers = new Map();

function initSocket(io) {
  // --- Authenticate every socket connection using the JWT from the client ---
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: no token provided'));
      }
      const decoded = verifySocketToken(token);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: user ${userId} (${socket.id})`);

    // Each user gets a private room = their own user id.
    // io.to(userId).emit(...) will now reach only that user's active socket(s).
    socket.join(userId);
    onlineUsers.set(userId, socket.id);

    // Mark user online in the DB and tell everyone else
    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
    } catch (err) {
      console.error('Failed to set user online:', err.message);
    }
    socket.broadcast.emit('user-online', { userId });

    // --- Private messaging ---
    socket.on('send-message', async ({ receiver, message, messageType = 'text' }) => {
      try {
        if (!receiver || !message || !message.trim()) return;

        const saved = await Message.create({
          sender: userId,
          receiver,
          message: message.trim(),
          messageType,
        });

        const payload = {
          _id: saved._id,
          sender: userId,
          receiver,
          message: saved.message,
          messageType: saved.messageType,
          isDelivered: false,
          isRead: false,
          createdAt: saved.createdAt,
        };

        // Send to the receiver's private room only (if they are online)
        io.to(receiver).emit('receive-message', payload);
        // Echo back to the sender so their own UI can confirm/replace the optimistic message
        socket.emit('message-sent', payload);

        // If the receiver is online, mark as delivered immediately
        if (onlineUsers.has(receiver)) {
          saved.isDelivered = true;
          await saved.save();
          io.to(receiver).emit('message-delivered', { messageId: saved._id, sender: userId });
          socket.emit('message-delivered', { messageId: saved._id, sender: userId });
        }
      } catch (err) {
        console.error('send-message error:', err.message);
        socket.emit('error-message', { message: 'Failed to send message' });
      }
    });

    // Receiver's client tells us it has actually rendered/opened the message
    socket.on('message-read', async ({ messageId, sender }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { isRead: true, isDelivered: true });
        io.to(sender).emit('message-read', { messageId, reader: userId });
      } catch (err) {
        console.error('message-read error:', err.message);
      }
    });

    // --- Typing indicators ---
    socket.on('typing', ({ receiver }) => {
      if (receiver) io.to(receiver).emit('typing', { from: userId });
    });

    socket.on('stop-typing', ({ receiver }) => {
      if (receiver) io.to(receiver).emit('stop-typing', { from: userId });
    });

    // --- WebRTC call signaling (all routed through private rooms, never broadcast) ---

    // Caller initiates a call
    socket.on('call-user', ({ to, offer, callType }) => {
      if (!onlineUsers.has(to)) {
        socket.emit('call-unavailable', { to });
        return;
      }
      io.to(to).emit('incoming-call', { from: userId, offer, callType });
    });

    // Callee accepts and sends back their SDP answer
    socket.on('answer-call', ({ to, answer }) => {
      io.to(to).emit('call-answered', { from: userId, answer });
    });

    // Callee rejects the call
    socket.on('reject-call', ({ to }) => {
      io.to(to).emit('call-rejected', { from: userId });
    });

    // Either side exchanges ICE candidates during connection setup
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: userId, candidate });
    });

    // Either side ends an ongoing or ringing call
    socket.on('end-call', ({ to }) => {
      io.to(to).emit('call-ended', { from: userId });
    });

    // --- Disconnect handling ---
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: user ${userId} (${socket.id})`);
      onlineUsers.delete(userId);

      try {
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
      } catch (err) {
        console.error('Failed to set user offline:', err.message);
      }

      // Let any active call partner know the user disconnected
      socket.broadcast.emit('user-offline', { userId, lastSeen: new Date() });
      socket.broadcast.emit('call-ended', { from: userId, reason: 'disconnected' });
    });
  });
}

module.exports = { initSocket, onlineUsers };
