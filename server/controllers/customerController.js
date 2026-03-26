const prisma = require('../prisma/client');

exports.getCustomers = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCustomer = async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.params.id },
            include: { bills: { orderBy: { created_at: 'desc' }, take: 5 } }
        });
        if (!customer) return res.status(404).json({ success: false, error: 'Not found' });
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
