const prisma = require('../prisma/client');

// Helper to generate order number
const generateOrderNumber = async () => {
    const year = new Date().getFullYear();
    const count = await prisma.order.count();
    return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Helper to auto-assign branch based on delivery city
const assignBranch = async (delivery_city) => {
    const branches = await prisma.branch.findMany();
    const cityLower = delivery_city.toLowerCase().trim();

    // Exact match in service_areas, location or name
    const exactMatch = branches.find(b =>
        (b.service_areas && b.service_areas.some(area => area.toLowerCase().trim() === cityLower)) ||
        (b.location && b.location.toLowerCase().trim() === cityLower) ||
        (b.name && b.name.toLowerCase().trim().replace(' branch', '') === cityLower)
    );
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = branches.find(b => {
        const inServiceAreas = b.service_areas && b.service_areas.some(area => area.toLowerCase().includes(cityLower) || cityLower.includes(area.toLowerCase()));
        const inLocation = b.location && (b.location.toLowerCase().includes(cityLower) || cityLower.includes(b.location.toLowerCase()));
        const inName = b.name && (b.name.toLowerCase().includes(cityLower) || cityLower.includes(b.name.toLowerCase().replace(' branch', '')));
        return inServiceAreas || inLocation || inName;
    });
    if (partialMatch) return partialMatch;

    // Default: first branch
    return branches[0] || null;
};

// Helper to send notifications
const createNotification = async (user_id, title, message, type, order_id = null) => {
    await prisma.notification.create({
        data: { user_id, title, message, type, order_id }
    });
};

exports.placeOrder = async (req, res) => {
    try {
        const { items, delivery_address, delivery_city, delivery_pincode, requested_delivery_date, payment_mode, note } = req.body;
        const customer_id = req.user.id;

        if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'No items in order' });

        // Auto-assign branch
        const branch = await assignBranch(delivery_city);

        // Validate brands and calculate total
        let total_amount = 0;
        const validatedItems = [];
        for (const item of items) {
            const brand = await prisma.brand.findUnique({ where: { id: item.brand_id } });
            if (!brand) return res.status(400).json({ success: false, error: `Brand not found: ${item.brand_id}` });
            const subtotal = brand.price_per_bag * item.quantity;
            total_amount += subtotal;
            validatedItems.push({ brand_id: brand.id, quantity: item.quantity, price_per_bag: brand.price_per_bag, subtotal, brand_name: brand.name });
        }

        const balance_due = total_amount;
        const order_number = await generateOrderNumber();

        const order = await prisma.order.create({
            data: {
                order_number,
                customer_id,
                branch_id: branch?.id,
                delivery_address,
                delivery_city,
                delivery_pincode,
                requested_delivery_date: requested_delivery_date ? new Date(requested_delivery_date) : null,
                total_amount,
                balance_due,
                payment_mode: payment_mode || 'cod',
                note,
                items: {
                    create: validatedItems.map(vi => ({
                        brand_id: vi.brand_id,
                        quantity: vi.quantity,
                        price_per_bag: vi.price_per_bag,
                        subtotal: vi.subtotal
                    }))
                }
            },
            include: { items: { include: { brand: true } }, branch: true }
        });

        // Format items for notification message
        const itemsText = validatedItems.map(it => `${it.brand_name} x${it.quantity}`).join(', ');

        // Notify owner
        const owner = await prisma.user.findFirst({ where: { role: 'owner' } });
        if (owner) {
            await createNotification(owner.id, 'New Order Received',
                `${order_number} from ${req.user.name}, ${delivery_city}. Total: ₹${total_amount}. Assigned to: ${branch?.name || 'N/A'}`,
                'new_order', order.id);
        }

        // Notify branch manager & staff
        if (branch) {
            const branchStaff = await prisma.user.findMany({
                where: { branch_id: branch.id, role: { in: ['manager', 'staff'] } }
            });
            for (const staff of branchStaff) {
                const title = staff.role === 'manager' ? 'New Order for Your Branch' : `Prepare Order ${order_number}`;
                const message = staff.role === 'manager'
                    ? `${order_number} from ${req.user.name}. ${itemsText}. Deliver to: ${delivery_city}. Total: ₹${total_amount}`
                    : `Customer: ${req.user.name}. Items: ${itemsText}. Delivery: ${delivery_address}, ${delivery_city}`;
                await createNotification(staff.id, title, message, 'new_order', order.id);
            }
        }

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { customer_id: req.user.id },
            include: { items: { include: { brand: true } }, branch: true },
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { items: { include: { brand: true } }, branch: true, customer: true }
        });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        // Allow customer to view own, or staff/manager/owner of assigned branch
        if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (order.customer_id !== req.user.id) return res.status(403).json({ success: false, error: 'Not authorized' });
        if (order.status !== 'pending') return res.status(400).json({ success: false, error: 'Only pending orders can be cancelled' });

        const updated = await prisma.order.update({
            where: { id: req.params.id },
            data: { status: 'cancelled' }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Admin: get all orders with filters
exports.getAllOrders = async (req, res) => {
    try {
        let whereClause = {};
        if (req.user.role === 'manager') whereClause.branch_id = req.user.branch_id;
        if (req.query.status) whereClause.status = req.query.status;
        if (req.query.branch_id && req.user.role === 'owner') whereClause.branch_id = req.query.branch_id;

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: { items: { include: { brand: true } }, branch: true, customer: true },
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { customer: true } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const updated = await prisma.order.update({
            where: { id: req.params.id },
            data: { status, updated_at: new Date() }
        });

        // Notify customer of status update
        const statusMessages = {
            confirmed: `Your order ${order.order_number} has been confirmed! We're preparing your cement.`,
            processing: `Your order ${order.order_number} is being processed and packed.`,
            out_for_delivery: `Your order ${order.order_number} is OUT FOR DELIVERY! Expected today.`,
            delivered: `Your order ${order.order_number} has been delivered. Thank you!`,
            cancelled: `Your order ${order.order_number} has been cancelled.`
        };

        if (statusMessages[status]) {
            await createNotification(order.customer_id, `Order ${status.replace(/_/g, ' ').toUpperCase()}`,
                statusMessages[status], 'order_update', order.id);
        }

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.convertToBill = async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { items: { include: { brand: true } }, customer: true }
        });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (!order.branch_id) return res.status(400).json({ success: false, error: 'Order has no assigned branch' });

        // Create bill and deduct stock in a transaction
        const bill = await prisma.$transaction(async (tx) => {
            const newBill = await tx.bill.create({
                data: {
                    branch_id: order.branch_id,
                    customer_name: order.customer.name,
                    customer_phone: order.customer.phone,
                    total_amount: order.total_amount,
                    paid_cash: order.amount_paid > 0 ? order.amount_paid : 0,
                    items: {
                        create: order.items.map(it => ({
                            brand_id: it.brand_id,
                            quantity: it.quantity,
                            price_per_bag: it.price_per_bag,
                            subtotal: it.subtotal
                        }))
                    }
                }
            });

            // Deduct stock for each item
            for (const item of order.items) {
                const stock = await tx.stock.findUnique({
                    where: { branch_id_brand_id: { branch_id: order.branch_id, brand_id: item.brand_id } }
                });
                if (stock && stock.quantity >= item.quantity) {
                    await tx.stock.update({
                        where: { id: stock.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                    await tx.stockTransaction.create({
                        data: { stock_id: stock.id, type: 'out', quantity: item.quantity, note: `Online Order ${order.order_number}`, bill_id: newBill.id }
                    });
                }
            }

            // Mark order as delivered
            await tx.order.update({ where: { id: order.id }, data: { status: 'delivered' } });

            return newBill;
        });

        // Notify customer
        await createNotification(order.customer_id, 'Order Delivered!',
            `Your order ${order.order_number} has been delivered. Bill generated.`, 'order_update', order.id);

        res.status(201).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.generateInvoicePdf = async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { items: { include: { brand: true } }, branch: true, customer: true }
        });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_number}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(22).font('Helvetica-Bold').text('SABARI TRADERS', { align: 'center' });
        doc.fontSize(11).font('Helvetica').text('Cement Dealer — Wholesale & Retail', { align: 'center' });
        if (order.branch) {
            doc.text(`Branch: ${order.branch.name} | ${order.branch.location}`, { align: 'center' });
        }
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#14b8a6').lineWidth(2).stroke();
        doc.moveDown(0.5);

        // Order Info
        doc.fontSize(13).font('Helvetica-Bold').text('INVOICE / ORDER CONFIRMATION');
        doc.moveDown(0.3);
        const infoY = doc.y;
        doc.fontSize(10).font('Helvetica');
        doc.text(`Order No: ${order.order_number}`, 50, infoY);
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 300, infoY);
        doc.text(`Status: ${order.status.toUpperCase().replace(/_/g, ' ')}`, 50, infoY + 16);
        doc.text(`Payment: ${order.payment_mode.toUpperCase()} — ${order.payment_status.toUpperCase()}`, 300, infoY + 16);
        doc.moveDown(2);

        // Customer Info
        doc.fontSize(11).font('Helvetica-Bold').text('BILL TO:');
        doc.fontSize(10).font('Helvetica');
        doc.text(order.customer.name);
        if (order.customer.phone) doc.text(`Phone: ${order.customer.phone}`);
        doc.text(`${order.delivery_address}, ${order.delivery_city} — ${order.delivery_pincode}`);
        doc.moveDown(1);

        // Items Table Header
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.moveDown(0.3);
        const tableY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('PRODUCT', 50, tableY);
        doc.text('QTY', 290, tableY, { width: 60, align: 'center' });
        doc.text('RATE/BAG', 360, tableY, { width: 80, align: 'right' });
        doc.text('SUBTOTAL', 450, tableY, { width: 100, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.moveDown(0.3);

        // Items
        doc.font('Helvetica');
        order.items.forEach(item => {
            const rowY = doc.y;
            doc.text(item.brand.name, 50, rowY);
            doc.text(`${item.quantity} bags`, 290, rowY, { width: 60, align: 'center' });
            doc.text(`₹${item.price_per_bag.toLocaleString()}`, 360, rowY, { width: 80, align: 'right' });
            doc.text(`₹${item.subtotal.toLocaleString()}`, 450, rowY, { width: 100, align: 'right' });
            doc.moveDown(0.5);
        });

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#14b8a6').lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        // Total
        doc.fontSize(13).font('Helvetica-Bold');
        doc.text('TOTAL AMOUNT', 360, doc.y, { width: 80, align: 'right' });
        doc.text(`₹${order.total_amount.toLocaleString()}`, 450, doc.y - 13, { width: 100, align: 'right' });
        doc.moveDown(1.5);

        // UPI Payment instructions
        if (order.payment_mode === 'upi' && order.payment_status !== 'paid') {
            const upiId = process.env.UPI_ID || 'sabaritraders@upi';
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text('PAYMENT PENDING — UPI TRANSFER REQUIRED');
            doc.fontSize(10).font('Helvetica').fillColor('#374151');
            doc.text(`Please transfer ₹${order.total_amount.toLocaleString()} to UPI ID: ${upiId}`);
            doc.text(`Reference: ${order.order_number}`);
        } else if (order.payment_mode === 'cod') {
            doc.fontSize(10).font('Helvetica').fillColor('#374151');
            doc.text('Payment Mode: Cash on Delivery. Amount to be paid upon cement delivery.');
        }

        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#6b7280').text('Thank you for your business! For queries call: +91 98765 43210', { align: 'center' });
        doc.text('Sabari Traders — Quality Cement, Delivered to Your Door', { align: 'center' });

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.confirmUpiPayment = async (req, res) => {
    try {
        const { utr_number } = req.body;
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const updated = await prisma.order.update({
            where: { id: req.params.id },
            data: {
                payment_status: 'paid',
                amount_paid: order.total_amount,
                balance_due: 0,
                razorpay_payment_id: utr_number || 'UPI-MANUAL'
            }
        });

        await createNotification(order.customer_id, 'Payment Received!',
            `Your UPI payment of ₹${order.total_amount} for ${order.order_number} has been received. Thank you!`,
            'payment', order.id);

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
