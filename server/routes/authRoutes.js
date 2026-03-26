const express = require('express');
const { login, logout, getMe, setup, signup } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);
router.get('/me', isAuthenticated, getMe);

// One-time setup
router.post('/setup', setup);

module.exports = router;
