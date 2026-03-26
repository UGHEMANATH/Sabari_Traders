import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, ArrowLeft, Save, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AddBill = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [brands, setBrands] = useState([]);
    const [branches, setBranches] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [availableStocks, setAvailableStocks] = useState([]);
    const [selectedCustomerBalance, setSelectedCustomerBalance] = useState(0);

    const [formData, setFormData] = useState({
        branch_id: user?.branch_id || '',
        customer_name: '',
        customer_phone: '',
        paid_cash: 0,
        paid_gpay: 0,
        paid_bank: 0
    });

    const [items, setItems] = useState([{ brand_id: '', quantity: 1, price: 0, max_stock: 0 }]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [brandRes, branchRes, custRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/brands', { headers: { Authorization: `Bearer ${token}` } }),
                    user.role === 'owner' ? axios.get('http://localhost:5001/api/branches', { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ data: { data: [] } }),
                    axios.get('http://localhost:5001/api/customers', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setBrands(brandRes.data.data);
                if (user.role === 'owner') setBranches(branchRes.data.data);
                setCustomers(custRes.data.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchInitialData();
    }, [user.role]);

    useEffect(() => {
        // Fetch branch specific stock to show quantity and sort
        const fetchStock = async () => {
            if (!formData.branch_id) return;
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5001/api/stock?branch_id=${formData.branch_id}`, { headers: { Authorization: `Bearer ${token}` } });

                // Sort stocks descending so highest stock is first
                const sortedStocks = res.data.data.sort((a, b) => b.quantity - a.quantity);
                setAvailableStocks(sortedStocks);
            } catch (error) {
                console.error(error);
            }
        };
        fetchStock();
    }, [formData.branch_id]);

    const handlePhoneChange = (e) => {
        const phone = e.target.value;
        const existing = customers.find(c => c.phone === phone);
        if (existing) {
            setFormData(prev => ({ ...prev, customer_phone: phone, customer_name: existing.name }));
            setSelectedCustomerBalance(existing.balance);
        } else {
            setFormData(prev => ({ ...prev, customer_phone: phone }));
            setSelectedCustomerBalance(0);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'brand_id') {
            const stockItem = availableStocks.find(st => st.brand.id === value);
            newItems[index] = {
                ...newItems[index],
                brand_id: value,
                price: stockItem ? stockItem.brand.price_per_bag : 0,
                max_stock: stockItem ? stockItem.quantity : 0,
                quantity: 1 // reset quantity when brand changes
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: parseInt(value) || 0 };
        }
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { brand_id: '', quantity: 1, price: 0, max_stock: 0 }]);

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalPaid = (parseFloat(formData.paid_cash) || 0) + (parseFloat(formData.paid_gpay) || 0) + (parseFloat(formData.paid_bank) || 0);
    const currentBillBalance = totalAmount - totalPaid;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.branch_id && user.role === 'owner') return alert("Select a branch");
        if (items.some(i => !i.brand_id || i.quantity <= 0)) return alert("Complete all item details");
        if (items.some(i => i.quantity > i.max_stock)) return alert("Not enough stock for one or more items selected!");

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                items: items.map(i => ({ brand_id: i.brand_id, quantity: i.quantity }))
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
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/billing')} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Bill</h1>
                    <p className="text-gray-500 mt-1">Smart billing with integrated payment splits and customer tracking</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">

                {/* Customer Info */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h3>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                required
                                value={formData.customer_phone}
                                onChange={handlePhoneChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                                placeholder="+91 9876543210"
                            />
                            {selectedCustomerBalance > 0 && (
                                <p className="text-xs text-orange-600 mt-2 font-medium flex items-center gap-1">
                                    <Info size={14} /> Regular Customer: Owe ₹{selectedCustomerBalance}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                            <input
                                type="text"
                                required
                                value={formData.customer_name}
                                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 border-gray-300 bg-white"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Cement Products</h3>

                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-4 items-end border border-gray-200 p-4 rounded-lg bg-white shadow-sm">
                            <div className="flex-1 w-full relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brand (Sorted by highest stock)</label>
                                <select
                                    required
                                    value={item.brand_id}
                                    onChange={(e) => handleItemChange(index, 'brand_id', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300 focus:z-10 bg-white"
                                >
                                    <option value="">Select Product...</option>
                                    {availableStocks.map(st => (
                                        <option key={st.brand.id} value={st.brand.id}>
                                            {st.brand.name} (Stock: {st.quantity} bags) • ₹{st.brand.price_per_bag}/bag
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max={item.max_stock > 0 ? item.max_stock : undefined}
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg text-center ${item.quantity > item.max_stock ? 'border-red-500 text-red-600 bg-red-50' : 'border-gray-300 focus:ring-primary-500'}`}
                                    title={item.max_stock > 0 ? `Max available: ${item.max_stock}` : ''}
                                />
                            </div>
                            <div className="w-full md:w-32">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal</label>
                                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                    ₹{item.price * item.quantity}
                                </div>
                            </div>
                            <div className="pb-2">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition"
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
                        <Plus size={20} /> Add Another Product
                    </button>
                </div>

                <hr className="border-gray-100" />

                {/* Payments Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Split Payments */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Split Payment</h3>
                        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cash Payment</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                                    <input type="number" min="0" value={formData.paid_cash} onChange={(e) => setFormData({ ...formData, paid_cash: e.target.value })} className="pl-8 w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Google Pay / UPI</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                                    <input type="number" min="0" value={formData.paid_gpay} onChange={(e) => setFormData({ ...formData, paid_gpay: e.target.value })} className="pl-8 w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Transfer Amount</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                                    <input type="number" min="0" value={formData.paid_bank} onChange={(e) => setFormData({ ...formData, paid_bank: e.target.value })} className="pl-8 w-full px-4 py-2 border rounded-lg focus:ring-primary-500 border-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grand Totals */}
                    <div className="flex flex-col justify-end space-y-4">
                        <div className="bg-white p-6 rounded-xl border-2 border-primary-100 space-y-3">
                            <div className="flex justify-between text-gray-500">
                                <span>Total Bill Amount</span>
                                <span className="font-semibold text-gray-900">₹{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 border-b pb-3">
                                <span>Total Paid Now</span>
                                <span className="font-semibold text-green-600">₹{(totalPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg items-center pt-1">
                                <span className="font-bold text-gray-900">Current Balance Remaining</span>
                                <span className={`font-bold ${currentBillBalance > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
                                    ₹{(currentBillBalance > 0 ? currentBillBalance : 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || totalAmount === 0}
                            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition disabled:opacity-50 shadow-md hover:shadow-lg"
                        >
                            <Save size={24} />
                            {loading ? 'Processing Transaction...' : 'Generate Bill & Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddBill;
