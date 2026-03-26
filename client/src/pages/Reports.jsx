import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/stock/transactions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const downloadCsv = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/reports/transactions/export', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'stock_transactions_report.csv');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            alert('Export failed');
        }
    };

    if (loading) return <div>Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Audit Logs</h1>
                    <p className="text-gray-500 mt-1">Export transaction history and view stock logs</p>
                </div>
                <button
                    onClick={downloadCsv}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition shadow-sm"
                >
                    <Download size={20} />
                    Export CSV
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
                </div>
                <div className="overflow-x-auto h-[600px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                {user.role === 'owner' && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>}
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Note (Bill Ref)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(tx.created_at).toLocaleString()}
                                    </td>
                                    {user.role === 'owner' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.stock.branch.name}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.stock.brand.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 min-w-[200px]">
                                        {tx.note || (tx.bill_id ? `Bill ID: ${tx.bill_id.substring(0, 8)}...` : '-')}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">No transactions logged yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
