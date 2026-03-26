import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AddBill = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [brands, setBrands] = useState([]);
    const [branches, setBranches] = useState([]);
    const [formData, setFormData] = useState({
        branch_id: user?.branch_id || '',
        customer_name: '',
        customer_phone: '',
    });

    const [items, setItems] = useState([{ brand_id: '', quantity: 1, price: 0 }]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [brandRes, branchRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/brands', { headers: { Authorization: `Bearer ${token}` } }),
                    user.role === 'owner' ? axios.get('http://localhost:5001/api/branches', { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ data: { data: [] } })
                ]);
                setBrands(brandRes.data.data);
                if (user.role === 'owner') setBranches(branchRes.data.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchInitialData();
    }, [user.role]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'brand_id') {
            const brand = brands.find(b => b.id === value);
            newItems[index] = { ...newItems[index], brand_id: value, price: brand ? brand.price_per_bag : 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: parseInt(value) || 0 };
        }
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { brand_id: '', quantity: 1, price: 0 }]);

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.branch_id && user.role === 'owner') return alert("Select a branch");
        if (items.some(i => !i.brand_id || i.quantity <= 0)) return alert("Complete all item details");

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                items: items.map(i => ({ brand_id: i.brand_id, quantity: i.quantity })) // The backend will recalculate using DB price
            };

            await axios.post('http://localhost:5001/api/bills', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            navigate('/billing');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to generate bill');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/billing')} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Bill</h1>
                    <p className="text-gray-500 mt-1">Generate an invoice and deduct stock automatically</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {user.role === 'owner' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                            <select
                                required
                                value={formData.branch_id}
                                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300"
                            >
                                <option value="">Select Branch</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                        <input
                            type="text"
                            required
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone (Optional)</label>
                        <input
                            type="tel"
                            value={formData.customer_phone}
                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                            placeholder="+91 9876543210"
                        />
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Items */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>

                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                                <select
                                    required
                                    value={item.brand_id}
                                    onChange={(e) => handleItemChange(index, 'brand_id', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300 bg-white"
                                >
                                    <option value="">Select Brand</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} (₹{b.price_per_bag})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300 text-center"
                                />
                            </div>
                            <div className="w-full md:w-32">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal</label>
                                <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                    ₹{item.price * item.quantity}
                                </div>
                            </div>
                            <div className="pb-2">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition"
                                >
                                    <Trash size={20} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium py-2 px-1"
                    >
                        <Plus size={20} /> Add Another Item
                    </button>
                </div>

                <hr className="border-gray-100" />

                {/* Footer / Totals */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-2xl font-bold text-gray-900 bg-green-50 px-6 py-4 rounded-xl border border-green-100 w-full md:w-auto text-center md:text-left">
                        <span className="text-green-800 text-sm block uppercase tracking-wide font-semibold mb-1">Total Amount</span>
                        ₹{totalAmount.toLocaleString()}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-50 shadow-md hover:shadow-lg"
                    >
                        <Save size={20} />
                        {loading ? 'Processing...' : 'Generate Bill & Save'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddBill;
