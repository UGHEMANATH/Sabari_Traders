import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Eye, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-orange-100 text-orange-700', out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700'
};

const allStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];

const AdminOrders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [convertingId, setConvertingId] = useState(null);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const res = await axios.get(`http://localhost:5001/api/orders${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [filterStatus]);

    const updateStatus = async (orderId, status) => {
        setUpdatingId(orderId);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/orders/${orderId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchOrders();
        } catch (e) { alert('Failed to update status'); }
        finally { setUpdatingId(null); }
    };

    const convertToBill = async (orderId) => {
        if (!window.confirm('Convert this order to a Bill? This will deduct stock.')) return;
        setConvertingId(orderId);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5001/api/orders/${orderId}/convert-to-bill`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Bill created and stock deducted!');
            fetchOrders();
        } catch (e) { alert(e.response?.data?.error || 'Conversion failed'); }
        finally { setConvertingId(null); }
    };

    const nextStatus = {
        pending: 'confirmed', confirmed: 'processing',
        processing: 'out_for_delivery', out_for_delivery: 'delivered'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
                    <p className="text-gray-500 mt-1">Online customer orders{user.role === 'manager' ? ' for your branch' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">All Statuses</option>
                        {allStatuses.map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400 animate-pulse">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <Package size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No orders found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Order No', 'Customer', 'City', 'Branch', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-sm text-gray-900">{order.order_number}</p>
                                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-medium text-sm text-gray-900">{order.customer?.name}</p>
                                            <p className="text-xs text-gray-500">{order.customer?.phone}</p>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700">{order.delivery_city}</td>
                                        <td className="px-4 py-4 text-xs text-gray-500">{order.branch?.name || '—'}</td>
                                        <td className="px-4 py-4 text-xs text-gray-600">
                                            {order.items.map(i => `${i.brand.name} ×${i.quantity}`).join(', ')}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-gray-900">₹{order.total_amount.toLocaleString()}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {nextStatus[order.status] && (
                                                    <button onClick={() => updateStatus(order.id, nextStatus[order.status])}
                                                        disabled={updatingId === order.id}
                                                        className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50">
                                                        {updatingId === order.id ? '...' : `→ ${nextStatus[order.status].replace(/_/g, ' ')}`}
                                                    </button>
                                                )}
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                    <button onClick={() => convertToBill(order.id)}
                                                        disabled={convertingId === order.id}
                                                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50">
                                                        {convertingId === order.id ? '...' : '→ Bill'}
                                                    </button>
                                                )}
                                                {order.status === 'pending' && (
                                                    <button onClick={() => updateStatus(order.id, 'cancelled')}
                                                        className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
