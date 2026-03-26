import { useAuth } from '../context/AuthContext';
import { Package, Store, IndianRupee, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalRevenue: 0, revenueByBranch: {} });
    const [stockSummary, setStockSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                const [revenueRes, stockRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/reports/revenue', config),
                    axios.get('http://localhost:5001/api/reports/stock-summary', config)
                ]);

                setStats(revenueRes.data.data);
                setStockSummary(stockRes.data.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    const totalStock = stockSummary.reduce((acc, curr) => acc + curr.quantity, 0);
    const branchCount = Object.keys(stats.revenueByBranch || {}).length;

    const chartData = Object.keys(stats.revenueByBranch).map(branch => ({
        name: branch,
        revenue: stats.revenueByBranch[branch]
    }));

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-lg bg-${color}-50 text-${color}-600`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back, {user.name}!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {user.role === 'owner' && (
                    <StatCard title="Total Branches" value={branchCount} icon={Store} color="blue" />
                )}
                <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} color="green" />
                <StatCard title="Total Stock (Bags)" value={totalStock} icon={Package} color="accent" />
                <StatCard title="Today's Bills" value="--" icon={FileText} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue by Branch</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value) => [`₹${value}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Overview</h3>
                    <div className="overflow-y-auto flex-1 pr-2">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty (Bags)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockSummary.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900 border-t">{item.branch}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-t">{item.brand}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium border-t">
                                            <span className={item.quantity < 50 ? 'text-red-600' : 'text-green-600'}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stockSummary.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-gray-500 text-sm">No stock data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
