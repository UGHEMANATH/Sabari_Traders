import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import AddBill from './pages/AddBill';
import Settings from './pages/Settings';
import Users from './pages/Users';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (!user) return <Navigate to="/login" />;

    if (requiredRole && user.role !== requiredRole && user.role !== 'owner') {
        return <Navigate to="/dashboard" />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="branches" element={<ProtectedRoute requiredRole="owner"><Branches /></ProtectedRoute>} />
                    <Route path="branches/:id/stock" element={<Stock />} />
                    <Route path="stock" element={<Stock />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="billing/new" element={<AddBill />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<ProtectedRoute requiredRole="owner"><Settings /></ProtectedRoute>} />
                    <Route path="users" element={<ProtectedRoute requiredRole="owner"><Users /></ProtectedRoute>} />
                </Route>

            </Routes>
        </Router>
    )
}

export default App
