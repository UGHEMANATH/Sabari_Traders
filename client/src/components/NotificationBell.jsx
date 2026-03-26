import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const unread = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:5001/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.data || []);
        } catch (e) { /* silent */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5001/api/notifications/read-all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) { /* silent */ }
    };

    const typeIcon = (type) => {
        if (type === 'new_order') return '📦';
        if (type === 'order_update') return '🚚';
        if (type === 'payment') return '💰';
        return '🔔';
    };

    return (
        <div className="relative">
            <button onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
                className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <Bell size={22} className="text-gray-600" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                            {unread > 0 && (
                                <button onClick={markAllRead} className="text-xs text-primary-600 font-medium hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
                            ) : notifications.map(n => (
                                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-primary-50' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">{typeIcon(n.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!n.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
