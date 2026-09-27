// server/routes/userRoutes.js
const express = require('express');
const { getAllUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAllUsers);
router.get('/:id', protect, getUserById);

module.exports = router;
