import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, User, ShoppingBag, AlertTriangle, Plus, Minus, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationBell from '../components/NotificationBell';

const Shop = () => {
    const { user, logout } = useAuth();
    const { cart, addToCart, updateQty, itemCount, total } = useCart();
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState({});
    const [addedIds, setAddedIds] = useState({});

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/public/brands');
                setBrands(res.data.data);
                const initQty = {};
                res.data.data.forEach(b => initQty[b.id] = 1);
                setQuantities(initQty);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBrands();
    }, []);

    const handleAdd = (brand) => {
        addToCart(brand, quantities[brand.id] || 1);
        setAddedIds(prev => ({ ...prev, [brand.id]: true }));
        setTimeout(() => setAddedIds(prev => ({ ...prev, [brand.id]: false })), 1500);
    };

    const stockBadge = (status) => {
        if (status === 'in_stock') return <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">✓ In Stock</span>;
        if (status === 'low_stock') return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">⚠ Low Stock</span>;
        return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">✕ Out of Stock</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                            <Package size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-extrabold text-gray-900">Sabari Traders</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <Link to="/orders" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition hidden sm:block">
                            My Orders
                        </Link>
                        <Link to="/profile" className="p-2 hover:bg-gray-100 rounded-full transition">
                            <User size={22} className="text-gray-600" />
                        </Link>
                        <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition hidden sm:block">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6 pb-32">
                {/* Welcome */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-gray-500 mt-1">Order premium cement delivered to your doorstep</p>
                </div>

                {/* Outstanding Balance Banner */}
                {user?.outstanding_balance > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-orange-800">Outstanding Balance: ₹{user.outstanding_balance.toLocaleString()}</p>
                            <p className="text-sm text-orange-600 mt-0.5">You have a pending balance. Pay now or it will be added to your next order.</p>
                        </div>
                    </div>
                )}

                {/* Product Grid */}
                <h2 className="text-lg font-bold text-gray-900 mb-4">Available Cement Brands</h2>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                                <div className="h-8 bg-gray-200 rounded mt-4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {brands.map(brand => (
                            <div key={brand.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition p-5 flex flex-col">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base">{brand.name}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{brand.manufacturer}</p>
                                    </div>
                                    {stockBadge(brand.stock_status)}
                                </div>

                                <div className="text-2xl font-extrabold text-primary-600 my-3">
                                    ₹{brand.price_per_bag.toLocaleString()}
                                    <span className="text-sm font-normal text-gray-500"> / bag</span>
                                </div>

                                {brand.stock_status !== 'out_of_stock' && (
                                    <>
                                        <div className="flex items-center gap-3 mt-auto mb-3">
                                            <button onClick={() => setQuantities(p => ({ ...p, [brand.id]: Math.max(1, (p[brand.id] || 1) - 1) }))}
                                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition font-bold">
                                                <Minus size={16} />
                                            </button>
                                            <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantities[brand.id] || 1}</span>
                                            <button onClick={() => setQuantities(p => ({ ...p, [brand.id]: (p[brand.id] || 1) + 1 }))}
                                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition font-bold">
                                                <Plus size={16} />
                                            </button>
                                            <span className="text-sm text-gray-500">bags = <span className="font-semibold text-gray-800">₹{((quantities[brand.id] || 1) * brand.price_per_bag).toLocaleString()}</span></span>
                                        </div>
                                        <button onClick={() => handleAdd(brand)}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition ${addedIds[brand.id] ? 'bg-emerald-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
                                            {addedIds[brand.id] ? '✓ Added to Cart!' : 'Add to Cart'}
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* WhatsApp Help Button */}
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                className="fixed bottom-24 right-4 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition">
                <MessageCircle size={24} />
            </a>

            {/* Floating Cart */}
            {itemCount > 0 && (
                <Link to="/cart" className="fixed bottom-4 left-4 right-4 z-40 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl transition max-w-lg mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-xl p-2">
                            <ShoppingCart size={20} />
                        </div>
                        <span className="font-semibold">{itemCount} {itemCount === 1 ? 'bag' : 'bags'} in cart</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        ₹{total.toLocaleString()} <span className="text-sm font-normal">→</span>
                    </div>
                </Link>
            )}
        </div>
    );
};

export default Shop;
