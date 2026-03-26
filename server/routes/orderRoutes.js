const express = require('express');
const { placeOrder, getMyOrders, getOrderById, cancelOrder, getAllOrders, updateOrderStatus, convertToBill, generateInvoicePdf, confirmUpiPayment } = require('../controllers/orderController');
const { isAuthenticated, isOwner, isBranchManager } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

// Customer routes
router.post('/', placeOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

// Admin/Manager routes
router.get('/', (req, res, next) => {
    if (['owner', 'manager'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, error: 'Not authorized' });
}, getAllOrders);

router.put('/:id/status', (req, res, next) => {
    if (['owner', 'manager'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, error: 'Not authorized' });
}, updateOrderStatus);

router.post('/:id/convert-to-bill', (req, res, next) => {
    if (['owner', 'manager'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, error: 'Not authorized' });
}, convertToBill);

// Invoice PDF — accessible by customer who owns order or admin
router.get('/:id/invoice', generateInvoicePdf);

// Customer confirms UPI payment made (submits UTR ref)
router.post('/:id/confirm-upi', confirmUpiPayment);

module.exports = router;
