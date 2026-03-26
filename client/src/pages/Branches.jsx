import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Store, User } from 'lucide-react';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        city: '',
        pincode: '',
        service_areas: '',
        manager_name: '',
        manager_email: '',
        manager_password: ''
    });

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/branches', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/branches', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setFormData({ name: '', location: '', city: '', pincode: '', service_areas: '', manager_name: '', manager_email: '', manager_password: '' });
            fetchBranches();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create branch');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
                    <p className="text-gray-500 mt-1">Manage all your store locations</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
                >
                    <Plus size={20} />
                    Add Branch
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => {
                    const manager = branch.users?.find(u => u.role === 'manager');
                    return (
                        <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">{branch.name}</h3>
                                        <p className="text-sm text-gray-500">{branch.location}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-500">
                                {branch.service_areas?.length > 0 ? (
                                    <p><span className="font-semibold text-gray-700">Serves:</span> {branch.service_areas.join(', ')}</p>
                                ) : (
                                    <p className="italic">No service areas defined</p>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-sm text-gray-600">
                                <User size={16} />
                                <span>{manager ? manager.name : 'No Manager Assigned'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Branch</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Physical Location Address</label>
                                    <input type="text" name="location" required value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. Tiruppur" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                    <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. 641604" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas (Comma separated)</label>
                                    <input type="text" name="service_areas" value={formData.service_areas} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. Tiruppur, Palladam, Uthukkuli" />
                                </div>
                                <div className="col-span-2 mt-4 pt-4 border-t">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Manager Details</h3>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" name="manager_name" value={formData.manager_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" name="manager_email" value={formData.manager_email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input type="password" name="manager_password" value={formData.manager_password} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700">Create Branch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
