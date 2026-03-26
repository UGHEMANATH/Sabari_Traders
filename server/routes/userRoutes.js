const express = require('express');
const { getUsers, createUser, deleteUser } = require('../controllers/userController');
const { isAuthenticated, isOwner } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);
router.use(isOwner);

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .delete(deleteUser);

module.exports = router;
