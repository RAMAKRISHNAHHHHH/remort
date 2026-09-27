// server/controllers/messageController.js
// Handles fetching, sending, and deleting private chat messages.

const Message = require('../models/Message');

// @route  GET /api/messages/:userId   (protected)
// Returns the full conversation history between the logged-in user and :userId
const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherUserId },
        { sender: otherUserId, receiver: myId },
      ],
    }).sort({ createdAt: 1 }); // oldest first, for a natural chat scroll

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ message: 'Could not load messages. Please try again.' });
  }
};

// @route  POST /api/messages   (protected)
// Mainly used as a fallback/history save; live delivery happens over Socket.IO.
const sendMessage = async (req, res) => {
  try {
    const { receiver, message, messageType } = req.body;

    if (!receiver || !message || !message.trim()) {
      return res.status(400).json({ message: 'A receiver and non-empty message are required' });
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      receiver,
      message: message.trim(),
      messageType: messageType || 'text',
    });

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ message: 'Could not send message. Please try again.' });
  }
};

// @route  DELETE /api/messages/:id   (protected)
const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the original sender can delete their own message
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await msg.deleteOne();
    res.status(200).json({ message: 'Message deleted', id: req.params.id });
  } catch (error) {
    console.error('Delete message error:', error.message);
    res.status(500).json({ message: 'Could not delete message. Please try again.' });
  }
};

module.exports = { getMessages, sendMessage, deleteMessage };
