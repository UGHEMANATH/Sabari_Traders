import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import { OrdersList, OrderDetail } from './pages/Orders';
import Invoice from './pages/Invoice';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import AddBill from './pages/AddBill';
import Settings from './pages/Settings';
import Users from './pages/Users';
import AdminOrders from './pages/AdminOrders';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (!user) return <Navigate to="/login" />;

    // Customers always go to shop
    if (user.role === 'customer') return <Navigate to="/shop" />;

    if (user.role === 'staff' && requiredRole && requiredRole !== 'staff') {
        return <Navigate to="/billing" />;
    }

    if (user.role === 'manager' && requiredRole === 'owner') {
        return <Navigate to="/dashboard" />;
    }

    return children;
};

const CustomerRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (user.role !== 'customer') return <Navigate to="/dashboard" />;
    return children;
};

function App() {
    return (
        <CartProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Customer Routes */}
                    <Route path="/shop" element={<CustomerRoute><Shop /></CustomerRoute>} />
                    <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
                    <Route path="/orders" element={<CustomerRoute><OrdersList /></CustomerRoute>} />
                    <Route path="/orders/:id" element={<CustomerRoute><OrderDetail /></CustomerRoute>} />
                    <Route path="/invoice/:orderId" element={<CustomerRoute><Invoice /></CustomerRoute>} />

                    {/* Admin/Staff Routes */}
                    <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<ProtectedRoute requiredRole="manager"><Dashboard /></ProtectedRoute>} />
                        <Route path="branches" element={<ProtectedRoute requiredRole="owner"><Branches /></ProtectedRoute>} />
                        <Route path="branches/:id/stock" element={<Stock />} />
                        <Route path="stock" element={<Stock />} />
                        <Route path="billing" element={<Billing />} />
                        <Route path="billing/new" element={<AddBill />} />
                        <Route path="reports" element={<ProtectedRoute requiredRole="manager"><Reports /></ProtectedRoute>} />
                        <Route path="settings" element={<ProtectedRoute requiredRole="owner"><Settings /></ProtectedRoute>} />
                        <Route path="users" element={<ProtectedRoute requiredRole="owner"><Users /></ProtectedRoute>} />
                        <Route path="admin/orders" element={<ProtectedRoute requiredRole="manager"><AdminOrders /></ProtectedRoute>} />
                    </Route>
                </Routes>
            </Router>
        </CartProvider>
    );
}

export default App;
