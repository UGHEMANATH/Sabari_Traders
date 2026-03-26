const prisma = require('../prisma/client');

exports.getBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, count: brands.length, data: brands });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createBrand = async (req, res) => {
    try {
        const { name, manufacturer, price_per_bag } = req.body;
        const brand = await prisma.brand.create({
            data: {
                name,
                manufacturer,
                price_per_bag: parseFloat(price_per_bag)
            }
        });
        res.status(201).json({ success: true, data: brand });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        // Price updates etc.
        const prevData = req.body;
        if (prevData.price_per_bag) prevData.price_per_bag = parseFloat(prevData.price_per_bag);

        const brand = await prisma.brand.update({
            where: { id: req.params.id },
            data: prevData
        });
        res.status(200).json({ success: true, data: brand });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
