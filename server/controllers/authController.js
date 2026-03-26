const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production'
    };

    const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user: userData
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ success: true, data: {} });
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                branch: true
            }
        });

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Initial setup to create first owner if none exist
exports.setup = async (req, res) => {
    try {
        const ownerExists = await prisma.user.findFirst({ where: { role: 'owner' } });
        if (ownerExists) {
            return res.status(400).json({ success: false, error: 'Owner already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('admin123', salt);

        const owner = await prisma.user.create({
            data: {
                name: 'Admin Owner',
                email: 'admin@sabaritraders.com',
                password_hash,
                role: 'owner'
            }
        });

        res.status(201).json({ success: true, data: owner });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password, phone, address, city, pincode } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, error: 'Please provide name, email, and password' });
        }

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password_hash,
                address,
                city,
                pincode,
                role: 'customer'
            }
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
