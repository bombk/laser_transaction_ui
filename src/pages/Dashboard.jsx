import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CreditCard, Plus, Activity, ArrowUpRight, ArrowDownRight, Clock, Filter, Send, Loader2, Copy, Check } from 'lucide-react';

export default function Dashboard({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Transfer form state
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMsg, setTransferMsg] = useState({ text: '', type: '' });
  const [transferMode, setTransferMode] = useState('mobile'); // 'account' or 'mobile'

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

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await axios.get(`/api/transactions?startDate=${startDate}&endDate=${endDate}`, { headers });
      setTransactions(res.data.transactions || []);
      if (res.data.balances) setBalances(res.data.balances);
      if (res.data.accounts) setAccounts(res.data.accounts);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setTxLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('/api/accounts', { headers });
        setAccounts(res.data.accounts || []);
        // Fetch balances for each account
        const bals = {};
        for (const acc of res.data.accounts || []) {
          try {
            const balRes = await axios.get(`/api/accounts/balance/${acc._id}`, { headers });
            bals[acc._id] = balRes.data.balance;
          } catch { bals[acc._id] = 0; }
        }
        setBalances(bals);
        if (res.data.accounts?.length > 0) {
          setFromAccount(res.data.accounts[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch accounts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [dateFilter, customStart, customEnd]);


  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!fromAccount || !toAccount || !transferAmount) return;
    setTransferLoading(true);
    setTransferMsg({ text: '', type: '' });
    try {
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      await axios.post('/api/transactions', {
        fromAccount, toAccount, amount: Number(transferAmount), idempotencyKey
      }, { headers });
      setTransferMsg({ text: 'Transfer successful!', type: 'success' });
      setTransferAmount('');
      setToAccount('');
      fetchTransactions();
      // Refresh balances
      const bals = {};
      for (const acc of accounts) {
        try {
          const balRes = await axios.get(`/api/accounts/balance/${acc._id}`, { headers });
          bals[acc._id] = balRes.data.balance;
        } catch { bals[acc._id] = 0; }
      }
      setBalances(bals);
    } catch (err) {
      setTransferMsg({ text: err.response?.data?.message || 'Transfer failed', type: 'error' });
    } finally {
      setTransferLoading(false);
    }
  };

  const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0);

  const getDirection = (tx) => {
    const userAccountIds = accounts.map(a => a._id);
    if (userAccountIds.includes(tx.fromAccount) && userAccountIds.includes(tx.toAccount)) return 'self';
    if (userAccountIds.includes(tx.fromAccount)) return 'debit';
    return 'credit';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Manage your money seamlessly</p>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="mb-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium mb-1">Total Balance</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            {loading ? '...' : `रू ${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </h2>
          <p className="text-indigo-200 text-sm">{accounts.length} account{accounts.length !== 1 ? 's' : ''} • NPR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Accounts + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accounts */}
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <CreditCard className="text-indigo-400" /> Your Accounts
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-slate-800 rounded-xl" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-slate-400 mb-4">You don't have any accounts yet. Please contact support.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map(acc => (
                <div key={acc._id} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="h-20 w-20 text-indigo-500" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-slate-400 text-sm font-medium mb-1">Account Balance</p>
                    <h3 className="text-2xl font-bold text-white mb-3">रू {(balances[acc._id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>ID: {acc._id}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(acc._id)}
                        className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                        title="Copy Account ID"
                      >
                        {copiedId === acc._id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${acc.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {acc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transaction Statement */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="text-indigo-400" /> Transaction Statement
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
                        <th className="px-4 py-3 text-slate-400 font-medium">Date</th>
                        <th className="px-4 py-3 text-slate-400 font-medium">Type</th>
                        <th className="px-4 py-3 text-slate-400 font-medium">From</th>
                        <th className="px-4 py-3 text-slate-400 font-medium">To</th>
                        <th className="px-4 py-3 text-slate-400 font-medium text-right">Amount</th>
                        <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {transactions.map(tx => {
                        const dir = getDirection(tx);
                        return (
                          <tr key={tx._id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              <span className="text-slate-500 ml-1 text-xs">{new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {dir === 'debit' ? (
                                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                                ) : dir === 'credit' ? (
                                  <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Activity className="h-4 w-4 text-indigo-400" />
                                )}
                                <span className={`font-medium ${dir === 'debit' ? 'text-red-400' : dir === 'credit' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                  {dir === 'debit' ? 'Sent' : dir === 'credit' ? 'Received' : 'Self'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.fromAccount?.slice(-6)}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">...{tx.toAccount?.slice(-6)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${dir === 'debit' ? 'text-red-400' : dir === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                              {dir === 'debit' ? '-' : dir === 'credit' ? '+' : ''}रू {tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Transfer */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Send className="text-indigo-400" /> Quick Transfer
          </h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-4">Send funds to another account.</p>
            <form onSubmit={handleTransfer} className="space-y-4">
              {accounts.length > 1 && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">From Account</label>
                  <select 
                    value={fromAccount} 
                    onChange={e => setFromAccount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>...{acc._id.slice(-6)} (रू {(balances[acc._id] || 0).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Send To</label>
                <div className="flex bg-slate-900 rounded-lg p-0.5 mb-3 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setToAccount(''); setTransferMode('account'); }}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${transferMode === 'account' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Account ID
                  </button>
                  <button
                    type="button"
                    onClick={() => { setToAccount(''); setTransferMode('mobile'); }}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${transferMode === 'mobile' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Mobile Number
                  </button>
                </div>
                <input 
                  type={transferMode === 'mobile' ? 'tel' : 'text'}
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value)}
                  placeholder={transferMode === 'mobile' ? 'Enter 10-digit mobile number' : 'Paste account ID'}
                  maxLength={transferMode === 'mobile' ? 10 : undefined}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Amount (रू)</label>
                <input 
                  type="number" 
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="0.00" 
                  min="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>
              <button 
                type="submit"
                disabled={transferLoading || !toAccount || !transferAmount}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {transferLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send Money</>}
              </button>
            </form>
            {transferMsg.text && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${transferMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {transferMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
