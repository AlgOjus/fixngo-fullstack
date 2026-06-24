'use client';

import React, { useState } from 'react';
import { ShieldAlert, Terminal, Eye, EyeOff, AlertTriangle, TrendingUp, CheckCircle, Database } from 'lucide-react';

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin_fixngo' && password === 'super_secure_password_2026') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Access Denied: Invalid Security Credentials.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">FixNGo Admin Console</h1>
            <p className="text-xs text-slate-400 mt-1">This console is isolated and requires high-security clearances</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Secure Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin_fixngo"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-red-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Secure Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl p-3 pr-10 outline-none focus:border-red-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 items-center text-xs text-red-400 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-3 rounded-xl transition shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              INITIALIZE CRYPTO SESSION
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-900 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] text-red-500 font-bold tracking-wider uppercase font-mono">MASTER SECURE SESSION ONLINE</span>
            </div>
            <h1 className="text-2xl font-black text-white font-display">FixNGo Control Panel</h1>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="border border-slate-800 bg-slate-900 text-xs px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
          >
            TERMINATE SESSION
          </button>
        </div>

        {/* Master KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">System Health</h4>
            <div className="text-2xl font-bold text-white flex items-center gap-1.5 font-mono">
              <span>99.98%</span>
              <span className="text-emerald-400 text-xs font-semibold">100% Core</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Docker Containers active</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Deduplication Ratio</h4>
            <div className="text-2xl font-bold text-orange-500 font-mono">4.1 : 1</div>
            <p className="text-[10px] text-slate-400 mt-1">Saves ₹2.4L in duplicate dispatches</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Dispatches</h4>
            <div className="text-2xl font-bold text-indigo-400 font-mono">412 Operations</div>
            <p className="text-[10px] text-slate-400 mt-1">Within Greater Mohalla Grid</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">AI Automated Pipeline</h4>
            <div className="text-2xl font-bold text-emerald-400 font-mono">100% Active</div>
            <p className="text-[10px] text-slate-400 mt-1">Gemini 3.5 Flash online</p>
          </div>
        </div>

        {/* Override panel and terminal logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-red-500" />
              <span>Global Dispatch Ticket Override Ledger</span>
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="pb-2">Ticket ID</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">AI Severity</th>
                    <th className="pb-2">Precedence Override</th>
                    <th className="pb-2 text-right">Emergency Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 font-mono text-slate-400">#902-A</td>
                    <td className="py-3 font-bold">Water Leakage</td>
                    <td className="py-3">9.8/10</td>
                    <td className="py-3">42 Citizens</td>
                    <td className="py-3 text-right space-x-1.5">
                      <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/20 transition">Resolve</button>
                      <button className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-500/20 transition">Drop</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 font-mono text-slate-400">#881-F</td>
                    <td className="py-3 font-bold">Pothole</td>
                    <td className="py-3">7.2/10</td>
                    <td className="py-3">18 Citizens</td>
                    <td className="py-3 text-right space-x-1.5">
                      <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/20 transition">Resolve</button>
                      <button className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-500/20 transition">Drop</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Real-Time System Log Feed</span>
            </h3>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 font-mono text-[10px] text-slate-400 space-y-2 h-64 overflow-y-auto leading-normal">
              <div>[09:51:20] LOG: Init system pipeline...</div>
              <div>[09:51:24] MON: Redis cache active, 2 active locks</div>
              <div>[09:52:05] GEO: Spatial cluster detected at Grid index (28.6139, 77.2090)</div>
              <div>[09:52:05] AI: Merged report of class 'Pothole', upvoted severity payload</div>
              <div>[09:53:11] API: Response sent to Express Guest Portal</div>
              <div className="text-emerald-400">[09:54:02] SEC: Root token verification OK</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
