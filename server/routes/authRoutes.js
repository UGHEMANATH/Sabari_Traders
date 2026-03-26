const express = require('express');
const { login, logout, getMe, setup } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', isAuthenticated, getMe);

// One-time setup
router.post('/setup', setup);

module.exports = router;
