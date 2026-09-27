// server/controllers/userController.js
// Provides the list of users for the sidebar and a single user's public profile.

const User = require('../models/User');

// @route  GET /api/users   (protected)
// Returns every user except the one making the request, for the sidebar list.
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json({ users });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ message: 'Could not load users. Please try again.' });
  }
};

// @route  GET /api/users/:id   (protected)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user by id error:', error.message);
    res.status(500).json({ message: 'Could not load this user. Please try again.' });
  }
};

module.exports = { getAllUsers, getUserById };
