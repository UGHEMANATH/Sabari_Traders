import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Settings = () => {
    const { user } = useAuth();
    const [brands, setBrands] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', manufacturer: '', price_per_bag: '' });
    const [loading, setLoading] = useState(true);

    if (user.role !== 'owner') return <Navigate to="/dashboard" replace />;

    const fetchBrands = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/brands', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBrands(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/brands', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setFormData({ name: '', manufacturer: '', price_per_bag: '' });
            fetchBrands();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create brand');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings & Brands</h1>
                    <p className="text-gray-500 mt-1">Manage cement brands and pricing</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
                >
                    <Plus size={20} />
                    Add Brand
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {brands.map(brand => (
                    <div key={brand.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
                        <div className="p-3 bg-accent-50 text-accent-600 rounded-lg">
                            <Tag size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{brand.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{brand.manufacturer}</p>
                            <span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold border border-green-100">
                                ₹{brand.price_per_bag} / bag
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Brand</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500" placeholder="UltraTech..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                                <input type="text" name="manufacturer" required value={formData.manufacturer} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500" placeholder="Aditya Birla Grp" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Bag (₹)</label>
                                <input type="number" name="price_per_bag" required min="1" value={formData.price_per_bag} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500" />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700">Add Brand</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
