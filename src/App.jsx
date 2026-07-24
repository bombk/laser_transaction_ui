import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Mark that we have checked authentication state
    setAuthChecked(true);
  }, []);

  // While we are checking authentication, show a loading screen to avoid premature redirects
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        {/* Navigation Bar */}
        <nav className="w-full px-6 py-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
              L
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              LedgerBank
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Welcome, {user.name}</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  setUser(null);
                  window.location.href = '/login';
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to={user ? (user.systemUser ? "/admin" : "/dashboard") : "/login"} />} />
            <Route path="/login" element={user ? <Navigate to={user.systemUser ? "/admin" : "/dashboard"} /> : <Login setUser={setUser} />} />
            <Route path="/register" element={user ? <Navigate to={user.systemUser ? "/admin" : "/dashboard"} /> : <Register setUser={setUser} />} />
            <Route 
              path="/dashboard" 
              element={user && !user.systemUser ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin" 
              element={user && user.systemUser ? <AdminDashboard user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
