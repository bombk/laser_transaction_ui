import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, Zap, RefreshCw, FileDown, Filter, Clock, ArrowUpRight, ArrowDownRight, Loader2, BarChart3 } from 'lucide-react';

export default function AdminDashboard({ user }) {
  // Transaction report state
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const getDateRange = useCallback(() => {
    const end = new Date();
    let start = new Date();
    switch (dateFilter) {
      case '7d': start.setDate(end.getDate() - 7); break;
      case '30d': start.setDate(end.getDate() - 30); break;
      case '90d': start.setDate(end.getDate() - 90); break;
      case 'all': start = new Date('2020-01-01'); break;
      case 'custom':
        return {
          startDate: customStart || new Date('2020-01-01').toISOString().split('T')[0],
          endDate: customEnd || new Date().toISOString().split('T')[0]
        };
      default: start.setDate(end.getDate() - 7);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [dateFilter, customStart, customEnd]);

  const fetchAllTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await axios.get(`/api/transactions/all?startDate=${startDate}&endDate=${endDate}`, { headers });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setTxLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchAllTransactions();
  }, [dateFilter, customStart, customEnd]);


  const handleRefund = async (txId) => {
    if (!window.confirm("Are you sure you want to refund this transaction?")) return;
    try {
      await axios.post(`/api/transactions/${txId}/refund`, {}, { headers });
      fetchAllTransactions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to refund transaction");
    }
  };

  const handleRepush = async (txId) => {
    if (!window.confirm("Are you sure you want to repush this transaction?")) return;
    try {
      await axios.post(`/api/transactions/${txId}/repush`, {}, { headers });
      fetchAllTransactions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to repush transaction");
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const csvRows = [
      ['Date', 'Time', 'Transaction ID', 'From Account', 'To Account', 'Amount', 'Status', 'Idempotency Key'].join(',')
    ];
    for (const tx of transactions) {
      const d = new Date(tx.createdAt);
      csvRows.push([
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN'),
        tx._id,
        tx.fromAccount,
        tx.toAccount,
        tx.amount,
        tx.status,
        tx.idempotencyKey || ''
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTransactions = transactions.filter(tx => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'COMPLETED') return tx.status === 'COMPLETED';
    if (statusFilter === 'PENDING') return tx.status === 'PENDING';
    if (statusFilter === 'FAILED') return tx.status === 'FAILED';
    if (statusFilter === 'REVERSED') return tx.status === 'REVERSED';
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Transaction Reports</h1>
          <p className="text-slate-400">View and resolve system transactions</p>
        </div>
      </div>

      {/* Transaction Report Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
            {['all', 'COMPLETED', 'PENDING', 'FAILED', 'REVERSED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {s === 'all' ? 'All' : s === 'COMPLETED' ? 'Completed' : s === 'PENDING' ? 'Pending' : s === 'FAILED' ? 'Failed' : 'Reversed'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-400" />
            {['7d', '30d', '90d', 'all', 'custom'].map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${dateFilter === f ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                {f === '7d' ? '7 Days' : f === '30d' ? '30 Days' : f === '90d' ? '90 Days' : f === 'all' ? 'All Time' : 'Custom'}
              </button>
            ))}
            <button
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="ml-2 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <FileDown className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex gap-3 mb-4">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-indigo-500 transition-colors" />
            <span className="text-slate-500 self-center">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-indigo-500 transition-colors" />
          </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          {txLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm">No transactions found for this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="px-4 py-3 text-slate-400 font-medium">Date & Time</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Transaction ID</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">From</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">To</th>
                    <th className="px-4 py-3 text-slate-400 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-slate-400 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredTransactions.map(tx => (
                    <tr key={tx._id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="text-slate-500 ml-1 text-xs">{new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx._id?.slice(-8)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.fromAccount?.slice(-6)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.toAccount?.slice(-6)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">रू {tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : tx.status === 'REVERSED' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tx.status === 'COMPLETED' && (
                          <button 
                            onClick={() => handleRefund(tx._id)}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          >
                            Refund
                          </button>
                        )}
                        {(tx.status === 'FAILED' || tx.status === 'PENDING') && (
                          <button 
                            onClick={() => handleRepush(tx._id)}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          >
                            Repush
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
