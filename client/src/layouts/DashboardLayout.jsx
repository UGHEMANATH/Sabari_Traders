import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Store, Package, FileText, PieChart, LogOut, Menu, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '../components/NotificationBell';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (!user) return <Navigate to="/login" replace />;

    const navigation = [
        ...(user.role !== 'staff' ? [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] : []),
        ...(user.role === 'owner' ? [{ name: 'Branches', href: '/branches', icon: Store }] : []),
        ...(user.role === 'owner' ? [{ name: 'Users', href: '/users', icon: Store }] : []),
        { name: 'Stock', href: '/stock', icon: Package },
        { name: 'Billing', href: '/billing', icon: FileText },
        ...(['owner', 'manager'].includes(user.role) ? [{ name: 'Orders', href: '/admin/orders', icon: ShoppingBag }] : []),
        ...(user.role !== 'staff' ? [{ name: 'Reports', href: '/reports', icon: PieChart }] : []),
        ...(user.role === 'owner' ? [{ name: 'Settings (Brands)', href: '/settings', icon: Store }] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
                <div className="flex items-center justify-center h-16 border-b border-primary-700">
                    <h1 className="text-xl font-bold uppercase tracking-wider">Sabari Traders</h1>
                </div>

                <div className="px-4 py-6 space-y-1">
                    <p className="text-xs text-primary-100 uppercase font-semibold mb-4 px-3">
                        {user.role} Panel
                    </p>
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary-700 text-white'
                                    : 'text-primary-100 hover:bg-primary-800'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="absolute bottom-0 w-full p-4 border-t border-primary-700">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 w-full text-red-300 hover:bg-primary-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-8">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden text-gray-500 hover:text-gray-700"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                        <NotificationBell />
                        <div className="w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-gray-700">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
