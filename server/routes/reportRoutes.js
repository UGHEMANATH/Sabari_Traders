const express = require('express');
const { getRevenueReport, getStockSummary, getTransactionsExport } = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.get('/revenue', getRevenueReport);
router.get('/stock-summary', getStockSummary);
router.get('/transactions/export', getTransactionsExport);

module.exports = router;
