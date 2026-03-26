import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackagePlus, ArrowDownToLine, PackageMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Stock = () => {
    const { user } = useAuth();
    const [stock, setStock] = useState([]);
    const [branches, setBranches] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('in'); // 'in' or 'out'
    const [formData, setFormData] = useState({
        branch_id: user?.branch_id || '',
        brand_id: '',
        quantity: '',
        note: ''
    });

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [stockRes, brandRes, branchRes] = await Promise.all([
                axios.get(`http://localhost:5001/api/stock`, config),
                axios.get('http://localhost:5001/api/brands', config),
                user.role === 'owner' ? axios.get('http://localhost:5001/api/branches', config) : Promise.resolve({ data: { data: [] } })
            ]);

            setStock(stockRes.data.data);
            setBrands(brandRes.data.data);
            if (user.role === 'owner') setBranches(branchRes.data.data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5001/api/stock/${modalType}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setFormData({ ...formData, brand_id: '', quantity: '', note: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update stock');
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setShowModal(true);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Inventory</h1>
                    <p className="text-gray-500 mt-1">Manage and track your cement inventory</p>
                </div>
                {user.role !== 'staff' && (
                    <div className="flex gap-3">
                        <button onClick={() => openModal('out')} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition border border-red-200">
                            <PackageMinus size={20} />
                            Manual Stock Out
                        </button>
                        <button onClick={() => openModal('in')} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                            <PackagePlus size={20} />
                            Add Stock In
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {user.role === 'owner' && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity (Bags)</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stock.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50 ${item.quantity < 50 ? 'bg-red-50' : ''}`}>
                                    {user.role === 'owner' && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.branch.name}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${item.quantity < 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        {new Date(item.updated_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            {modalType === 'in' ? <><ArrowDownToLine className="text-green-600" /> Add Stock In</> : <><PackageMinus className="text-red-600" /> Stock Out</>}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {user.role === 'owner' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                    <select
                                        required
                                        value={formData.branch_id}
                                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                <select
                                    required
                                    value={formData.brand_id}
                                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Select Brand</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} (₹{b.price_per_bag})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Bags)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.note}
                                    placeholder={modalType === 'in' ? 'Received from supplier XYZ' : 'Damaged bags'}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className={`px-4 py-2 text-white font-medium rounded-lg ${modalType === 'in' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {modalType === 'in' ? 'Add Stock' : 'Confirm Out'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stock;
