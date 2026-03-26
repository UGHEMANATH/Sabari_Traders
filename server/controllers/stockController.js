const prisma = require('../prisma/client');

exports.getStock = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        if (req.user.role === 'manager') {
            branch_id = req.user.branch_id;
        }

        let whereClause = {};
        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const stock = await prisma.stock.findMany({
            where: whereClause,
            include: {
                brand: true,
                branch: true
            }
        });

        res.status(200).json({ success: true, count: stock.length, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const handleStockTransaction = async (req, res, type) => {
    let { branch_id, brand_id, quantity, note } = req.body;
    quantity = parseInt(quantity);

    if (req.user.role === 'manager') {
        branch_id = req.user.branch_id;
    }

    if (!branch_id || !brand_id || !quantity) {
        return res.status(400).json({ success: false, error: 'Please provide branch, brand, and quantity' });
    }

    try {
        // Find existing stock or create
        let stock = await prisma.stock.findUnique({
            where: {
                branch_id_brand_id: { branch_id, brand_id }
            }
        });

        if (!stock && type === 'out') {
            return res.status(400).json({ success: false, error: 'Insufficient stock' });
        }

        let newQuantity = type === 'in' ? quantity : -quantity;

        if (stock) {
            if (type === 'out' && stock.quantity < quantity) {
                return res.status(400).json({ success: false, error: 'Insufficient stock' });
            }
            stock = await prisma.stock.update({
                where: { id: stock.id },
                data: { quantity: { increment: newQuantity } }
            });
        } else {
            stock = await prisma.stock.create({
                data: {
                    branch_id,
                    brand_id,
                    quantity: newQuantity
                }
            });
        }

        // Log transaction
        await prisma.stockTransaction.create({
            data: {
                stock_id: stock.id,
                type,
                quantity,
                note
            }
        });

        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addStockIn = async (req, res) => {
    await handleStockTransaction(req, res, 'in');
};

exports.addStockOut = async (req, res) => {
    await handleStockTransaction(req, res, 'out');
};

exports.getTransactions = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        const brand_id = req.query.brand_id;

        if (req.user.role === 'manager') {
            branch_id = req.user.branch_id;
        }

        let whereClause = {};
        if (branch_id) {
            whereClause.stock = {
                branch_id: branch_id
            };
        }
        if (brand_id) {
            whereClause.stock = {
                ...whereClause.stock,
                brand_id: brand_id
            };
        }

        const transactions = await prisma.stockTransaction.findMany({
            where: whereClause,
            include: {
                stock: {
                    include: { brand: true, branch: true }
                },
                bill: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
