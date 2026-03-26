const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');

exports.getBranches = async (req, res) => {
    try {
        let branches;
        if (req.user.role === 'owner') {
            branches = await prisma.branch.findMany({
                include: { users: true }
            });
        } else {
            // Manager sees own branch
            branches = await prisma.branch.findMany({
                where: { id: req.user.branch_id },
                include: { users: true }
            });
        }
        res.status(200).json({ success: true, count: branches.length, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createBranch = async (req, res) => {
    try {
        const { name, location, manager_name, manager_email, manager_password } = req.body;

        let newBranch = await prisma.branch.create({
            data: {
                name,
                location
            }
        });

        if (manager_email && manager_password && manager_name) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(manager_password, salt);

            const newManager = await prisma.user.create({
                data: {
                    name: manager_name,
                    email: manager_email,
                    password_hash,
                    role: 'manager',
                    branch_id: newBranch.id
                }
            });
        }

        res.status(201).json({ success: true, data: newBranch });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateBranch = async (req, res) => {
    try {
        const branch = await prisma.branch.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.status(200).json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
