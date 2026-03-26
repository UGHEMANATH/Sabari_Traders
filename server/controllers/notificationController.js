const prisma = require('../prisma/client');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
            take: 50
        });
        const unreadCount = notifications.filter(n => !n.is_read).length;
        res.status(200).json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id },
            data: { is_read: true }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { user_id: req.user.id, is_read: false },
            data: { is_read: true }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
