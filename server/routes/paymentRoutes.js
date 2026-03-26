const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../prisma/client');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();
router.use(isAuthenticated);

// POST /api/payments/create-order
router.post('/create-order', async (req, res) => {
    try {
        const { orderId, amount } = req.body;

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: order.order_number,
            notes: {
                orderId: order.id,
                customerName: order.customer.name
            }
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { razorpay_order_id: razorpayOrder.id }
        });

        res.json({
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            order_number: order.order_number
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/payments/verify
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                payment_status: 'paid',
                amount_paid: (await prisma.order.findUnique({ where: { id: orderId } })).total_amount,
                balance_due: 0,
                razorpay_payment_id,
                status: 'confirmed'
            },
            include: { customer: true, items: { include: { brand: true } }, branch: true }
        });

        // Notify customer
        await prisma.notification.create({
            data: {
                user_id: updatedOrder.customer_id,
                title: 'Payment Successful ✓',
                message: `Payment of ₹${updatedOrder.amount_paid.toLocaleString()} received for order ${updatedOrder.order_number}. Your order is confirmed!`,
                type: 'payment',
                order_id: orderId
            }
        });

        // Notify owner
        const owner = await prisma.user.findFirst({ where: { role: 'owner' } });
        if (owner) {
            await prisma.notification.create({
                data: {
                    user_id: owner.id,
                    title: 'Payment Received',
                    message: `Razorpay payment of ₹${updatedOrder.amount_paid} received for ${updatedOrder.order_number} from ${updatedOrder.customer.name}.`,
                    type: 'payment',
                    order_id: orderId
                }
            });
        }

        // Notify branch manager
        if (updatedOrder.branch_id) {
            const manager = await prisma.user.findFirst({ where: { branch_id: updatedOrder.branch_id, role: 'manager' } });
            if (manager) {
                await prisma.notification.create({
                    data: {
                        user_id: manager.id,
                        title: 'Order Paid & Confirmed',
                        message: `${updatedOrder.order_number} from ${updatedOrder.customer.name} is paid via Razorpay. Please process for delivery.`,
                        type: 'payment',
                        order_id: orderId
                    }
                });
            }
        }

        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
