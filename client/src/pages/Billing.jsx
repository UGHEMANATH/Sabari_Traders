import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Billing = () => {
    const { user } = useAuth();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBills = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/bills', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBills(res.data.data);
        } catch (error) {
            console.error('Failed to fetch bills', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const handleDownloadPdf = async (e, billId) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5001/api/bills/${billId}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bill-${billId}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            alert('Failed to download PDF');
        }
    };

    if (loading) return <div>Loading bills...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                    <p className="text-gray-500 mt-1">Manage and generate invoices</p>
                </div>
                <Link
                    to="/billing/new"
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
                >
                    <Plus size={20} />
                    New Bill
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Bill ID</th>
                                {user.role === 'owner' && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bills.map((bill) => (
                                <tr key={bill.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                                        <FileText size={16} className="text-gray-400" />
                                        {bill.id.substring(0, 8).toUpperCase()}
                                    </td>
                                    {user.role === 'owner' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bill.branch?.name}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>{bill.customer_name}</div>
                                        <div className="text-xs text-gray-500">{bill.customer_phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                        ₹{bill.total_amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(bill.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <button
                                            onClick={(e) => handleDownloadPdf(e, bill.id)}
                                            className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1 font-medium bg-primary-50 px-3 py-1.5 rounded disabled:opacity-50"
                                        >
                                            <Download size={16} /> PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">No bills generated yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Billing;
