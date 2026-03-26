import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirm_password: '',
        phone: '', address: '', city: '', pincode: ''
    });

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5001/api/auth/signup', formData);
            localStorage.setItem('token', res.data.token);
            navigate('/shop');
            window.location.reload();
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-emerald-900 flex items-center justify-center py-12 px-4">
            <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur mb-4">
                        <Package size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Sabari Traders</h1>
                    <p className="text-primary-200 mt-2">Create your customer account to order cement online</p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input name="name" required value={formData.name} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="Kumaran Raju" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input name="phone" required value={formData.phone} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="+91 9876543210" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                <input name="email" type="email" required value={formData.email} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="kumaran@email.com" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                                <input name="address" value={formData.address} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="123 Main Street, Near Bus Stand" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City / Area</label>
                                <input name="city" value={formData.city} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="Tiruppur" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                <input name="pincode" value={formData.pincode} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="641604" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <div className="relative">
                                    <input name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-12"
                                        placeholder="Minimum 6 characters" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                                <input name="confirm_password" type="password" required value={formData.confirm_password} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="Re-enter your password" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition disabled:opacity-50 shadow-lg shadow-primary-200">
                            {loading ? 'Creating Account...' : 'Create Account & Shop'}
                        </button>

                        <p className="text-center text-gray-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:underline font-semibold">Sign In</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
