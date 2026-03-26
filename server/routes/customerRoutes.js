const express = require('express');
const { getCustomers, getCustomer } = require('../controllers/customerController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.get('/', getCustomers);
router.get('/:id', getCustomer);

module.exports = router;
