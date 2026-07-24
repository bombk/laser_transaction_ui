import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SystemDashboard from './pages/SystemDashboard';
import Register from './pages/Register';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser.role) {
        // Clear old format user data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } else {
        setUser(parsedUser);
      }
    }
    // Mark that we have checked authentication state
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    setLoggingOut(true);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setTimeout(() => {
      setUser(null);
      setLoggingOut(false);
    }, 800);
  };

  // While we are checking authentication or logging out, show a loading screen
  if (!authChecked || loggingOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">
          {loggingOut ? 'Logging out...' : 'Loading...'}
        </p>
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
              B
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              BitBank
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Welcome, {user.name}</span>
              <button 
                onClick={handleLogout}
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
            <Route path="/" element={<Navigate to={user ? (user.role === 'SYSTEM_USER' ? "/system" : user.role === 'ADMIN' ? "/admin" : "/dashboard") : "/login"} />} />
            <Route path="/login" element={user ? <Navigate to={user.role === 'SYSTEM_USER' ? "/system" : user.role === 'ADMIN' ? "/admin" : "/dashboard"} /> : <Login setUser={setUser} />} />
            <Route path="/register" element={user ? <Navigate to={user.role === 'SYSTEM_USER' ? "/system" : user.role === 'ADMIN' ? "/admin" : "/dashboard"} /> : <Register setUser={setUser} />} />
            <Route 
              path="/dashboard" 
              element={user && user.role === 'CUSTOMER' ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin" 
              element={user && user.role === 'ADMIN' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/system" 
              element={user && user.role === 'SYSTEM_USER' ? <SystemDashboard user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
