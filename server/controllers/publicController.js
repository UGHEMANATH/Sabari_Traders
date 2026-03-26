const prisma = require('../prisma/client');

exports.getPublicBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
        // Aggregate stock status across all branches
        const result = [];
        for (const brand of brands) {
            const stocks = await prisma.stock.findMany({ where: { brand_id: brand.id } });
            const totalQty = stocks.reduce((a, s) => a + s.quantity, 0);
            result.push({
                ...brand,
                total_stock: totalQty,
                stock_status: totalQty > 100 ? 'in_stock' : totalQty > 20 ? 'low_stock' : 'out_of_stock'
            });
        }
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPublicBranches = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            select: { id: true, name: true, location: true, city: true, pincode: true, service_areas: true }
        });
        res.status(200).json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
