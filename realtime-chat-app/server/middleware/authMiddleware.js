// server/middleware/authMiddleware.js
// Protects REST routes by requiring a valid JWT in the Authorization header.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the logged-in user (without the password) to the request object
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers both an invalid signature and an expired token
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

// Helper used by the Socket.IO handler (not an Express middleware) to verify
// a token sent during the socket handshake.
const verifySocketToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { protect, verifySocketToken };
