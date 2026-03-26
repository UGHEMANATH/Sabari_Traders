const express = require('express');
const { getStock, addStockIn, addStockOut, getTransactions } = require('../controllers/stockController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.get('/', getStock);
router.post('/in', addStockIn);
router.post('/out', addStockOut);
router.get('/transactions', getTransactions);

module.exports = router;
