const express = require('express');
const { getBranches, createBranch, updateBranch } = require('../controllers/branchController');
const { isAuthenticated, isOwner } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.route('/')
    .get(getBranches)
    .post(isOwner, createBranch);

router.route('/:id')
    .put(isOwner, updateBranch);

module.exports = router;
