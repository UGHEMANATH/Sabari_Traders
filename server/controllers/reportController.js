const prisma = require('../prisma/client');

exports.getRevenueReport = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        if (req.user.role === 'manager' || req.user.role === 'staff') {
            branch_id = req.user.branch_id;
        }

        let whereClause = { status: 'active' };
        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const bills = await prisma.bill.findMany({
            where: whereClause,
            include: { branch: true }
        });

        let revenueByBranch = {};
        let totalRevenue = 0;
        let todaysBillsCount = 0;

        const todayStr = new Date().toISOString().split('T')[0];

        bills.forEach(bill => {
            const bName = bill.branch.name;
            if (!revenueByBranch[bName]) revenueByBranch[bName] = 0;
            revenueByBranch[bName] += bill.total_amount;
            totalRevenue += bill.total_amount;

            // Check if bill was created today
            const billDateStr = new Date(bill.created_at).toISOString().split('T')[0];
            if (billDateStr === todayStr) {
                todaysBillsCount++;
            }
        });

        res.status(200).json({
            success: true,
            data: { totalRevenue, revenueByBranch, todaysBillsCount }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getStockSummary = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        if (req.user.role === 'manager') {
            branch_id = req.user.branch_id;
        }

        let whereClause = {};
        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const stocks = await prisma.stock.findMany({
            where: whereClause,
            include: { brand: true, branch: true }
        });

        let summaryStr = [];
        stocks.forEach(st => {
            summaryStr.push({
                branch: st.branch.name,
                brand: st.brand.name,
                quantity: st.quantity
            });
        });

        res.status(200).json({ success: true, data: summaryStr });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

exports.getTransactionsExport = async (req, res) => {
    try {
        let branch_id = req.query.branch_id;
        if (req.user.role === 'manager' || req.user.role === 'staff') {
            branch_id = req.user.branch_id;
        }

        let whereClause = {};
        if (branch_id) {
            whereClause.stock = {
                branch_id: branch_id
            };
        }

        const transactions = await prisma.stockTransaction.findMany({
            where: whereClause,
            include: { stock: { include: { brand: true, branch: true } } },
            orderBy: { created_at: 'desc' }
        });

        let csv = "ID,Branch,Brand,Type,Quantity,Note,Date\n";
        transactions.forEach(t => {
            csv += `${t.id},${t.stock.branch.name},${t.stock.brand.name},${t.type},${t.quantity},${t.note || ''},${t.created_at}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
