import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, Zap, RefreshCw, FileDown, Filter, Clock, ArrowUpRight, ArrowDownRight, Loader2, BarChart3, Plus, User } from 'lucide-react';

export default function SystemDashboard({ user }) {
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Create account state
  const [createUserId, setCreateUserId] = useState('');
  const [createAccLoading, setCreateAccLoading] = useState(false);
  const [createAccMessage, setCreateAccMessage] = useState('');

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

  const handleIssueFunds = async () => {
    setLoading(true);
    setMessage('');
    try {
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await axios.post('/api/transactions/system/initial-funds',
        { toAccount, amount, idempotencyKey },
        { headers }
      );
      setMessage(`Successfully issued ₹${amount} to account ${toAccount}.`);
      setToAccount('');
      fetchAllTransactions();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Failed to issue funds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUserAccount = async () => {
    setCreateAccLoading(true);
    setCreateAccMessage('');
    try {
      await axios.post('/api/accounts',
        { userId: createUserId },
        { headers }
      );
      setCreateAccMessage(`Successfully created account for user.`);
      setCreateUserId('');
    } catch (err) {
      console.error(err);
      setCreateAccMessage(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreateAccLoading(false);
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

  const totalVolume = transactions.reduce((s, tx) => s + (tx.amount || 0), 0);
  const completedCount = transactions.filter(tx => tx.status === 'COMPLETED').length;
  const pendingCount = transactions.filter(tx => tx.status === 'PENDING').length;
  const failedCount = transactions.filter(tx => tx.status === 'FAILED' || tx.status === 'REVERSED').length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">System Administration</h1>
          <p className="text-slate-400">Superuser access and system controls</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-medium mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-white">{transactions.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-medium mb-1">Total Volume</p>
          <p className="text-2xl font-bold text-white">₹{totalVolume.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-medium mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-medium mb-1">Pending / Failed</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}<span className="text-red-400 ml-1">/ {failedCount}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Issue Funds Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-white">Issue Funds</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Target Account ID</label>
              <input
                type="text"
                placeholder="Paste account ID here"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <button
              onClick={handleIssueFunds}
              disabled={loading || !toAccount}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Issue Funds</>}
            </button>
            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes('Successfully') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Create User Account Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Plus className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">New Account</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Target User ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Paste User ID here"
                  value={createUserId}
                  onChange={(e) => setCreateUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleCreateUserAccount}
              disabled={createAccLoading || !createUserId}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {createAccLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Create Account</>}
            </button>
            {createAccMessage && (
              <div className={`p-3 rounded-lg text-sm ${createAccMessage.includes('Successfully') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {createAccMessage}
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Shield className="h-32 w-32 text-indigo-400" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" /> System Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-indigo-500/20">
                  <span className="text-slate-400 text-sm">Database</span>
                  <span className="text-emerald-400 font-medium text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-indigo-500/20">
                  <span className="text-slate-400 text-sm">API Status</span>
                  <span className="text-emerald-400 font-medium text-sm">Operational</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-indigo-500/20">
                  <span className="text-slate-400 text-sm">Active Node</span>
                  <span className="text-white font-mono text-sm">v1.0.0</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-indigo-500/20">
                  <span className="text-slate-400 text-sm">Logged in as</span>
                  <span className="text-white text-sm">{user.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Report Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="text-indigo-400" /> All System Transactions
          </h2>
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
              disabled={transactions.length === 0}
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
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm">No transactions found for this period.</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {transactions.map(tx => (
                    <tr key={tx._id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="text-slate-500 ml-1 text-xs">{new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx._id?.slice(-8)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.fromAccount?.slice(-6)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.toAccount?.slice(-6)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.status}
                        </span>
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
