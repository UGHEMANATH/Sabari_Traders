import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, ShoppingBag, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Cart = () => {
    const { user } = useAuth();
    const { cart, updateQty, removeFromCart, clearCart, total } = useCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [delivery, setDelivery] = useState({
        delivery_address: user?.address || '',
        delivery_city: user?.city || '',
        delivery_pincode: user?.pincode || '',
        requested_delivery_date: '',
        payment_mode: 'cod',
        note: ''
    });

    const token = localStorage.getItem('token');

    // ─── Razorpay loader ───────────────────────────────────────────
    const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    // ─── Razorpay payment after order is placed ────────────────────
    const triggerRazorpay = async (orderId, orderNumber, amount) => {
        const loaded = await loadRazorpay();
        if (!loaded) { alert('Razorpay SDK failed to load. Try UPI QR instead.'); return; }

        const orderRes = await fetch('http://localhost:5001/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orderId, amount })
        });
        const orderData = await orderRes.json();

        if (!orderData.razorpay_order_id) {
            alert('Could not create payment. Check Razorpay keys in .env'); return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: 'INR',
            name: 'Sabari Traders',
            description: `Order ${orderData.order_number}`,
            order_id: orderData.razorpay_order_id,
            handler: async (response) => {
                const verifyRes = await fetch('http://localhost:5001/api/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        orderId
                    })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    navigate(`/invoice/${orderId}`);
                } else {
                    alert('Payment verification failed. Contact support.');
                }
            },
            prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.phone || ''
            },
            theme: { color: '#0d9488' },
            modal: {
                ondismiss: () => {
                    // User closed without paying — redirect to order page so they can pay later via UPI
                    navigate(`/orders/${orderId}`, { state: { success: true } });
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
            alert(`Payment failed: ${response.error.description}`);
            navigate(`/orders/${orderId}`, { state: { success: true } });
        });
        rzp.open();
    };

    // ─── Main submit ───────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return alert('Your cart is empty');
        setLoading(true);
        try {
            const payload = {
                items: cart.map(i => ({ brand_id: i.brand_id, quantity: i.quantity })),
                ...delivery
            };
            const res = await axios.post('http://localhost:5001/api/orders', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const placedOrder = res.data.data;
            clearCart();

            if (delivery.payment_mode === 'razorpay') {
                // Trigger Razorpay popup immediately after order is placed
                await triggerRazorpay(placedOrder.id, placedOrder.order_number, placedOrder.total_amount);
            } else {
                // COD / UPI / credit — redirect to order page
                navigate(`/orders/${placedOrder.id}`, { state: { success: true } });
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to place order');
            setLoading(false);
        }
    };

    if (cart.length === 0) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add cement products from our shop to get started</p>
            <Link to="/shop" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition">
                Browse Products
            </Link>
        </div>
    );

    const paymentOptions = [
        { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive your cement at your door' },
        { value: 'upi', label: 'UPI / GPay / PhonePe', icon: '📲', desc: 'Scan QR code shown on order page to pay' },
        { value: 'razorpay', label: 'Pay Now Online', icon: '⚡', desc: 'Instant payment via Razorpay — Card, Net Banking, UPI' },
        { value: 'credit', label: 'Add to Balance', icon: '📒', desc: "We'll track this in your credit account" }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link to="/shop" className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft size={22} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Order Checkout</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 pb-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Cart Items */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Your Items</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {cart.map(item => (
                                <div key={item.brand_id} className="p-4 flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-500">₹{item.price_per_bag}/bag</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => updateQty(item.brand_id, item.quantity - 1)}
                                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg">−</button>
                                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                                        <button type="button" onClick={() => updateQty(item.brand_id, item.quantity + 1)}
                                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg">+</button>
                                    </div>
                                    <div className="w-24 text-right font-bold text-gray-900">₹{(item.price_per_bag * item.quantity).toLocaleString()}</div>
                                    <button type="button" onClick={() => removeFromCart(item.brand_id)} className="text-red-400 hover:text-red-600 transition">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-900 mb-5">Delivery Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                                <input required value={delivery.delivery_address} onChange={e => setDelivery({ ...delivery, delivery_address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="House no, Street, Area" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City / Area *</label>
                                    <input required value={delivery.delivery_city} onChange={e => setDelivery({ ...delivery, delivery_city: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Uthukuli" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                    <input required value={delivery.delivery_pincode} onChange={e => setDelivery({ ...delivery, delivery_pincode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="638751" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Delivery Date</label>
                                <input type="date" min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                    value={delivery.requested_delivery_date} onChange={e => setDelivery({ ...delivery, requested_delivery_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Special Note (Optional)</label>
                                <textarea rows={2} value={delivery.note} onChange={e => setDelivery({ ...delivery, note: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    placeholder="Any specific delivery instructions..." />
                            </div>
                        </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-900 mb-5">Payment Method</h2>
                        <div className="space-y-3">
                            {paymentOptions.map(opt => (
                                <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${delivery.payment_mode === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="radio" name="payment_mode" value={opt.value} checked={delivery.payment_mode === opt.value}
                                        onChange={() => setDelivery({ ...delivery, payment_mode: opt.value })} className="sr-only" />
                                    <span className="text-2xl">{opt.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                                            {opt.label}
                                            {opt.value === 'razorpay' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Instant</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">{opt.desc}</p>
                                    </div>
                                    {delivery.payment_mode === opt.value && <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                        <div className="space-y-2">
                            {cart.map(i => (
                                <div key={i.brand_id} className="flex justify-between text-sm text-gray-600">
                                    <span>{i.name} × {i.quantity} bags</span>
                                    <span>₹{(i.price_per_bag * i.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between font-bold text-lg text-gray-900">
                                <span>Grand Total</span>
                                <span>₹{total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className={`w-full py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 ${delivery.payment_mode === 'razorpay' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
                        {delivery.payment_mode === 'razorpay' && <Zap size={20} />}
                        {loading ? 'Placing Order...' : delivery.payment_mode === 'razorpay' ? `Pay Now · ₹${total.toLocaleString()}` : `Place Order · ₹${total.toLocaleString()}`}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default Cart;
