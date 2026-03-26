const prisma = require('../prisma/client');
const PDFDocument = require('pdfkit');

exports.createBill = async (req, res) => {
    let { branch_id, customer_name, customer_phone, items, paid_cash, paid_gpay, paid_bank } = req.body;

    paid_cash = parseFloat(paid_cash) || 0;
    paid_gpay = parseFloat(paid_gpay) || 0;
    paid_bank = parseFloat(paid_bank) || 0;

    // items is an array of { brand_id, quantity }
    if (req.user.role === 'manager' || req.user.role === 'staff') {
        branch_id = req.user.branch_id;
    }

    if (!branch_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Validate stock and calculate total
        let total_amount = 0;
        let validatedItems = [];

        for (const item of items) {
            const brand = await prisma.brand.findUnique({ where: { id: item.brand_id } });
            if (!brand) return res.status(400).json({ success: false, error: `Brand not found: ${item.brand_id}` });

            const stock = await prisma.stock.findUnique({
                where: { branch_id_brand_id: { branch_id, brand_id: brand.id } }
            });

            if (!stock || stock.quantity < item.quantity) {
                return res.status(400).json({ success: false, error: `Insufficient stock for brand ${brand.name}` });
            }

            const subtotal = brand.price_per_bag * item.quantity;
            total_amount += subtotal;

            validatedItems.push({
                brand_id: brand.id,
                quantity: item.quantity,
                price_per_bag: brand.price_per_bag,
                subtotal,
                stock_id: stock.id
            });
        }

        // Start transaction for creating bill, deduxting stock, logging txns
        const newBill = await prisma.$transaction(async (tx) => {
            let customer_id = null;
            if (customer_phone) {
                const balanceOwed = total_amount - (paid_cash + paid_gpay + paid_bank);
                const customer = await tx.customer.upsert({
                    where: { phone: customer_phone },
                    update: {
                        name: customer_name,
                        balance: { increment: balanceOwed }
                    },
                    create: {
                        name: customer_name,
                        phone: customer_phone,
                        balance: balanceOwed
                    }
                });
                customer_id = customer.id;
            }

            const bill = await tx.bill.create({
                data: {
                    branch_id,
                    customer_name,
                    customer_phone,
                    customer_id,
                    total_amount,
                    paid_cash,
                    paid_gpay,
                    paid_bank,
                    items: {
                        create: validatedItems.map(vi => ({
                            brand_id: vi.brand_id,
                            quantity: vi.quantity,
                            price_per_bag: vi.price_per_bag,
                            subtotal: vi.subtotal
                        }))
                    }
                }
            });

            for (const vi of validatedItems) {
                // Deduct stock
                await tx.stock.update({
                    where: { id: vi.stock_id },
                    data: { quantity: { decrement: vi.quantity } }
                });

                // Log transaction
                await tx.stockTransaction.create({
                    data: {
                        stock_id: vi.stock_id,
                        type: 'out',
                        quantity: vi.quantity,
                        note: 'Sales Bill Generated',
                        bill_id: bill.id
                    }
                });
            }

            return bill;
        });

        res.status(201).json({ success: true, data: newBill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBills = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        if (req.user.role === 'manager' || req.user.role === 'staff') {
            branch_id = req.user.branch_id;
        }

        let whereClause = {};
        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const bills = await prisma.bill.findMany({
            where: whereClause,
            include: { branch: true },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ success: true, count: bills.length, data: bills });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBillById = async (req, res) => {
    try {
        const bill = await prisma.bill.findUnique({
            where: { id: req.params.id },
            include: {
                branch: true,
                items: {
                    include: { brand: true }
                }
            }
        });

        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        res.status(200).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.generateBillPdf = async (req, res) => {
    try {
        const bill = await prisma.bill.findUnique({
            where: { id: req.params.id },
            include: {
                branch: true,
                items: {
                    include: { brand: true }
                }
            }
        });

        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.id}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('Sabari Traders', { align: 'center' });
        doc.fontSize(12).text(`Branch: ${bill.branch.name}`, { align: 'center' });
        doc.text(`Location: ${bill.branch.location}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text(`Bill ID: ${bill.id}`);
        doc.text(`Date: ${new Date(bill.created_at).toLocaleString()}`);
        doc.text(`Customer: ${bill.customer_name}`);
        doc.text(`Phone: ${bill.customer_phone || 'N/A'}`);
        doc.moveDown();

        doc.text('----------------------------------------------------');
        doc.text('Brand         Qty    Price/Bag    Subtotal');
        doc.text('----------------------------------------------------');

        bill.items.forEach(item => {
            doc.text(`${item.brand.name.padEnd(12)} ${item.quantity.toString().padEnd(6)} Rs.${item.price_per_bag.toString().padEnd(9)} Rs.${item.subtotal}`);
        });

        doc.text('----------------------------------------------------');
        doc.fontSize(16).text(`Total Amount: Rs. ${bill.total_amount}`, { align: 'right' });

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
