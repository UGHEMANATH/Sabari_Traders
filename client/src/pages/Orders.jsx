import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, CreditCard, Download, QrCode } from 'lucide-react';

const UPI_ID = 'hemanathug-2@okicici';
const MERCHANT_NAME = 'Sabari Traders';

const statusSteps = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered'];
const statusLabels = {
    pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};
const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-orange-100 text-orange-700', out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700'
};

export const OrdersList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5001/api/orders/my', { headers: { Authorization: `Bearer ${token}` } });
                setOrders(res.data.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500 animate-pulse">Loading orders...</div></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link to="/shop" className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={22} /></Link>
                    <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
                </div>
            </header>
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Package size={48} className="mx-auto mb-4" />
                        <p className="font-semibold text-lg">No orders yet</p>
                        <Link to="/shop" className="mt-4 inline-block bg-primary-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">Shop Now</Link>
                    </div>
                ) : orders.map(order => (
                    <Link to={`/orders/${order.id}`} key={order.id} className="block bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="font-bold text-gray-900">{order.order_number}</p>
                                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColors[order.status]}`}>
                                {statusLabels[order.status]}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                            {order.items.map(i => `${i.brand.name} ×${i.quantity}`).join(', ')}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <span className="font-bold text-primary-600 text-lg">₹{order.total_amount.toLocaleString()}</span>
                            <span className="text-xs text-primary-600 font-semibold">VIEW DETAILS →</span>
                        </div>
                    </Link>
                ))}
            </main>
        </div>
    );
};

export const OrderDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [utrNumber, setUtrNumber] = useState('');
    const [submittingUtr, setSubmittingUtr] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`http://localhost:5001/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                setOrder(res.data.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, [id]);

    const cancelOrder = async () => {
        if (!window.confirm('Cancel this order?')) return;
        setCancelling(true);
        try {
            await axios.put(`http://localhost:5001/api/orders/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setOrder(prev => ({ ...prev, status: 'cancelled' }));
        } catch (e) { alert('Failed to cancel order'); }
        finally { setCancelling(false); }
    };

    const submitUtr = async () => {
        if (!utrNumber.trim()) return alert('Enter UTR / reference number');
        setSubmittingUtr(true);
        try {
            const res = await axios.post(`http://localhost:5001/api/orders/${id}/confirm-upi`, { utr_number: utrNumber }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrder(prev => ({ ...prev, payment_status: 'paid', amount_paid: prev.total_amount }));
            alert('Payment reference submitted! Our team will verify it.');
        } catch (e) { alert('Failed to submit payment reference'); }
        finally { setSubmittingUtr(false); }
    };

    const downloadInvoice = () => {
        window.open(`http://localhost:5001/api/orders/${id}/invoice?token=${token}`, '_blank');
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500 animate-pulse">Loading order...</div></div>;
    if (!order) return <div className="text-center p-8 text-gray-500">Order not found.</div>;

    const currentStep = statusSteps.indexOf(order.status);

    // Build UPI deep link and QR URL
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${order.total_amount}&cu=INR&tn=${encodeURIComponent(order.order_number)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiLink)}&size=200x200&ecc=M&margin=10`;

    const showUpiPanel = order.payment_mode === 'upi' && order.payment_status !== 'paid';

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/orders" className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={22} /></Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
                            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <button onClick={downloadInvoice}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
                        <Download size={16} /> Invoice
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-10">
                {location.state?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                        <CheckCircle size={22} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-green-800">Order Placed Successfully! 🎉</p>
                            <p className="text-sm text-green-600 mt-1">Our team will confirm your order shortly. You will be notified of every update.</p>
                        </div>
                    </div>
                )}

                {/* UPI Payment Panel */}
                {showUpiPanel && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <QrCode size={22} className="text-purple-600" />
                            <h3 className="font-bold text-purple-900 text-lg">Pay via UPI — ₹{order.total_amount.toLocaleString()}</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6 items-center">
                            <div className="flex-shrink-0">
                                <div className="bg-white rounded-2xl p-3 shadow-md inline-block">
                                    <img src={qrUrl} alt="UPI QR Code" className="w-44 h-44" />
                                </div>
                                <p className="text-xs text-center text-purple-600 mt-2 font-medium">Scan with any UPI app</p>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="bg-white rounded-xl p-4 border border-purple-100">
                                    <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                                    <p className="font-bold text-gray-900 text-base select-all">{UPI_ID}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-purple-100">
                                    <p className="text-xs text-gray-500 mb-1">Amount</p>
                                    <p className="font-bold text-purple-700 text-xl">₹{order.total_amount.toLocaleString()}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-purple-100">
                                    <p className="text-xs text-gray-500 mb-1">Reference / Note</p>
                                    <p className="font-bold text-gray-900 select-all">{order.order_number}</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href={upiLink} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-center py-3 rounded-xl font-bold text-sm transition">
                                        📲 Open UPI App
                                    </a>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-2">After payment, enter UTR / Reference number:</p>
                                    <div className="flex gap-2">
                                        <input value={utrNumber} onChange={e => setUtrNumber(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400"
                                            placeholder="e.g. 123456789012" />
                                        <button onClick={submitUtr} disabled={submittingUtr}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50">
                                            {submittingUtr ? '...' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* UPI Paid Banner */}
                {order.payment_mode === 'upi' && order.payment_status === 'paid' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle size={22} className="text-emerald-500" />
                        <div>
                            <p className="font-bold text-emerald-800">UPI Payment Confirmed ✓</p>
                            {order.razorpay_payment_id && <p className="text-xs text-emerald-600">UTR: {order.razorpay_payment_id}</p>}
                        </div>
                    </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <span className="font-bold text-gray-900">Order Status</span>
                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                    </span>
                </div>

                {/* Progress Bar */}
                {order.status !== 'cancelled' && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center relative">
                            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
                                <div className="h-full bg-primary-500 transition-all" style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }} />
                            </div>
                            {statusSteps.map((step, i) => (
                                <div key={step} className="flex flex-col items-center gap-2 z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition ${i <= currentStep ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                                        {i < currentStep ? '✓' : i + 1}
                                    </div>
                                    <span className={`text-xs font-medium text-center max-w-[60px] leading-tight ${i <= currentStep ? 'text-primary-700' : 'text-gray-400'}`}>
                                        {statusLabels[step]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Package size={18} /> Items Ordered</h3>
                    <div className="space-y-3">
                        {order.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{item.brand.name}</p>
                                    <p className="text-sm text-gray-500">₹{item.price_per_bag}/bag × {item.quantity} bags</p>
                                </div>
                                <span className="font-bold text-gray-900">₹{item.subtotal.toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary-600">₹{order.total_amount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Truck size={18} /> Delivery Address</h3>
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                        <MapPin size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                        <p>{order.delivery_address}, {order.delivery_city} - {order.delivery_pincode}</p>
                    </div>
                    {order.requested_delivery_date && (
                        <p className="mt-2 text-sm text-gray-500 pl-5">Requested: {new Date(order.requested_delivery_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    )}
                    {order.branch && (
                        <p className="mt-2 text-sm font-medium text-primary-600 pl-5">Managed by: {order.branch.name}</p>
                    )}
                </div>

                {/* Payment */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard size={18} /> Payment</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                            <span>Mode</span>
                            <span className="font-semibold capitalize">{order.payment_mode?.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Status</span>
                            <span className={`font-semibold capitalize ${order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>{order.payment_status}</span>
                        </div>
                        {order.amount_paid > 0 && (
                            <div className="flex justify-between">
                                <span>Amount Paid</span>
                                <span className="font-semibold text-green-700">₹{order.amount_paid.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Download Invoice Button */}
                <button onClick={downloadInvoice}
                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition">
                    <Download size={20} /> Download Invoice PDF
                </button>

                {/* Cancel Button */}
                {order.status === 'pending' && (
                    <button onClick={cancelOrder} disabled={cancelling}
                        className="w-full py-4 border-2 border-red-400 text-red-500 hover:bg-red-50 rounded-2xl font-bold transition disabled:opacity-50">
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                )}
            </main>
        </div>
    );
};


