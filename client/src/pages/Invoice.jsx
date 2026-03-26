import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Printer, CheckCircle, Package } from 'lucide-react';

const Invoice = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(res.data.data);
            } catch (e) {
                setError('Failed to load invoice. Please try again.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const downloadPdf = () => {
        window.open(`http://localhost:5001/api/orders/${orderId}/invoice?token=${token}`, '_blank');
    };

    const handlePrint = () => window.print();

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading invoice...</p>
            </div>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 font-medium">{error || 'Invoice not found'}</p>
                <button onClick={() => navigate('/orders')} className="mt-4 text-primary-600 underline">Go to Orders</button>
            </div>
        </div>
    );

    const grandTotal = order.total_amount + (order.customer?.outstanding_balance || 0);
    const isPaid = order.payment_status === 'paid';

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Action Bar — hidden when printing */}
            <div className="no-print bg-white shadow-sm sticky top-0 z-20 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
                    <button onClick={() => navigate('/orders')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-medium text-sm">
                        <ArrowLeft size={18} /> Back to Orders
                    </button>
                    <div className="flex items-center gap-3">
                        {isPaid && (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full text-sm font-semibold">
                                <CheckCircle size={16} /> PAID
                            </span>
                        )}
                        <button onClick={handlePrint}
                            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
                            <Printer size={16} /> Print
                        </button>
                        <button onClick={downloadPdf}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Box */}
            <div className="max-w-3xl mx-auto my-6 px-4 pb-10 invoice-box">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="invoice-header bg-gradient-to-r from-primary-700 to-primary-900 text-white p-8 text-center">
                        <h1 className="text-3xl font-extrabold tracking-wide mb-1">SABARI TRADERS</h1>
                        <p className="text-primary-200 text-sm">Wholesale & Retail Cement Dealer</p>
                        {order.branch && (
                            <p className="text-primary-100 text-sm mt-1 font-medium">{order.branch.name} — {order.branch.location}</p>
                        )}
                        <div className="mt-4 text-xs text-primary-200">
                            {isPaid ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-4 py-1.5 rounded-full font-bold text-sm">
                                    ✓ PAYMENT RECEIVED
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 bg-orange-500 text-white px-4 py-1.5 rounded-full font-bold text-sm paid-stamp">
                                    ⏳ PAYMENT PENDING
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {/* Invoice Meta */}
                        <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-100">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoice Details</p>
                                <p className="text-gray-900"><span className="font-semibold">Invoice No:</span> {order.order_number}</p>
                                <p className="text-gray-700 text-sm">Date: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                <p className="text-gray-700 text-sm">Payment: <span className="font-semibold capitalize">{order.payment_mode?.replace('_', ' ')}</span></p>
                                <p className="text-gray-700 text-sm">Status: <span className={`font-semibold capitalize ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{order.payment_status}</span></p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
                                <p className="font-bold text-gray-900 text-base">{order.customer?.name}</p>
                                {order.customer?.phone && <p className="text-gray-700 text-sm">{order.customer.phone}</p>}
                                <p className="text-gray-600 text-sm mt-1 leading-snug">
                                    {order.delivery_address},<br />
                                    {order.delivery_city} — {order.delivery_pincode}
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-6">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Package size={14} /> Items Ordered
                            </p>
                            <div className="overflow-x-auto">
                                <table className="invoice-table w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Brand</th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Qty (Bags)</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate (₹)</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {order.items.map((item, i) => (
                                            <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="py-3 px-4 font-medium text-gray-900">{item.brand.name}
                                                    <p className="text-xs text-gray-400 font-normal">{item.brand.manufacturer}</p>
                                                </td>
                                                <td className="py-3 px-4 text-center text-gray-700">{item.quantity}</td>
                                                <td className="py-3 px-4 text-right text-gray-700">₹{item.price_per_bag.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{item.subtotal.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-6">
                            <div className="w-full max-w-xs space-y-2 text-sm">
                                <div className="total-row flex justify-between text-gray-600">
                                    <span>Current Bill Total</span>
                                    <span className="font-medium">₹{order.total_amount.toLocaleString()}</span>
                                </div>
                                {order.customer?.outstanding_balance > 0 && (
                                    <div className="total-row balance flex justify-between text-red-600">
                                        <span>Previous Balance</span>
                                        <span className="font-medium">₹{order.customer.outstanding_balance.toLocaleString()}</span>
                                    </div>
                                )}
                                {order.customer?.outstanding_balance > 0 && (
                                    <div className="total-row grand flex justify-between border-t pt-2 text-gray-900 font-bold text-base">
                                        <span>Grand Total</span>
                                        <span>₹{grandTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600">
                                    <span>Amount Paid</span>
                                    <span className="font-semibold text-emerald-600">₹{order.amount_paid.toLocaleString()}</span>
                                </div>
                                {order.balance_due > 0 && (
                                    <div className="total-row balance flex justify-between text-red-600 font-semibold">
                                        <span>Balance Due</span>
                                        <span>₹{order.balance_due.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t-2 border-primary-500 pt-3 flex justify-between font-bold text-lg text-gray-900">
                                    <span>Net Payable</span>
                                    <span className="text-primary-700">₹{(order.balance_due || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Paid Stamp */}
                        {isPaid && (
                            <div className="text-center mb-6">
                                <div className="paid-stamp inline-flex items-center gap-2 border-2 border-emerald-500 text-emerald-600 px-6 py-2 rounded-xl font-bold text-xl">
                                    ✓ PAYMENT RECEIVED
                                </div>
                                {order.razorpay_payment_id && (
                                    <p className="text-xs text-gray-400 mt-1">Ref: {order.razorpay_payment_id}</p>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t border-gray-100 pt-5 text-center text-gray-400 text-sm space-y-1">
                            <p className="font-semibold text-gray-600">Thank you for your business!</p>
                            <p>For queries, contact: +91 98765 43210</p>
                            <p>Sabari Traders — Quality Cement, Delivered to Your Door 🏗️</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
