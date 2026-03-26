const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

exports.isAuthenticated = async (req, res, next) => {
    let token;

    // Cookie support, Authorization header, or query param (for PDF downloads)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { branch: true }
        });

        if (!user) {
            return res.status(401).json({ success: false, error: 'User does not exist' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }
};

exports.isOwner = (req, res, next) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only owners are allowed' });
    }
    next();
};

exports.isBranchManager = (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only branch managers or owners are allowed' });
    }
    next();
};
