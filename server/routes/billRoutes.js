const express = require('express');
const { getBills, getBillById, createBill, generateBillPdf } = require('../controllers/billController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.route('/')
    .get(getBills)
    .post(createBill);

router.route('/:id')
    .get(getBillById);

router.get('/:id/pdf', generateBillPdf);

module.exports = router;
