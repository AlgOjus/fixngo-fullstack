import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Eye, EyeOff, AlertTriangle, Database, Trash2, CheckCircle, Users, UserX } from 'lucide-react';
import { InfrastructureIssue, UserAccount } from '../types';
import { supabase } from '../lib/supabase';

interface AdminConsoleProps {
  issues: InfrastructureIssue[];
  setIssues: React.Dispatch<React.SetStateAction<InfrastructureIssue[]>>;
  showNotification: (msg: string, type?: string) => void;
  bypassAuth?: boolean;
  mockUserDatabase?: UserAccount[];
  setMockUserDatabase?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser?: UserAccount | null;
}

const isSupabaseConfigured = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

export default function AdminConsole({ 
  issues, 
  setIssues, 
  showNotification, 
  bypassAuth = false,
  mockUserDatabase = [],
  setMockUserDatabase,
  currentUser = null
}: AdminConsoleProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(bypassAuth);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<UserAccount[]>(mockUserDatabase);

  useEffect(() => {
    setUsers(mockUserDatabase);
  }, [mockUserDatabase]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin_fixngo' && password === 'super_secured_password_2026') {
      setIsAuthenticated(true);
      setError('');
      showNotification('High-clearance security session initialized.', 'success');
    } else {
      setError('Access Denied: Invalid Security Credentials.');
    }
  };

  const handleOverrideStatus = async (id: string, newStatus: 'Pending' | 'In Progress' | 'Resolved') => {
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, status: newStatus, workerNotes: newStatus === 'Resolved' ? 'Administrative Overridden Resolution' : undefined } : issue
    ));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('issues')
          .update({ 
            status: newStatus, 
            worker_notes: newStatus === 'Resolved' ? 'Administrative Overridden Resolution' : null 
          })
          .eq('id', id);
        if (error) {
          const errorMsg = error.message?.toLowerCase() || '';
          const isMissingColumn = errorMsg.includes('worker_notes') || errorMsg.includes('schema cache');
          if (isMissingColumn) {
            console.warn("worker_notes column missing or cached incorrectly. Retrying update without worker_notes...");
            const { error: retryError } = await supabase
              .from('issues')
              .update({ status: newStatus })
              .eq('id', id);
            if (retryError) {
              console.error("Failed to update status in Supabase after retry:", retryError.message);
            }
          } else {
            console.error("Failed to update status in Supabase:", error.message);
          }
        }
      } catch (err) {
        console.error("Exception updating issue status:", err);
      }
    }

    showNotification(`Administrative Override triggered for ticket ${id}: Status set to ${newStatus}`, 'success');
  };

  const handleDropTicket = async (id: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== id));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('issues')
          .delete()
          .eq('id', id);
        if (error) {
          console.error("Failed to delete issue from Supabase:", error.message);
        }
      } catch (err) {
        console.error("Exception deleting issue:", err);
      }
    }

    showNotification(`Ticket ${id} permanently purged from system database ledger`, 'warning');
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'user-admin') {
      console.error('Delete blocked');
      return;
    }

    if (userId === currentUser?.id) {
      showNotification("Cannot delete active system administrator session.", "warning");
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user && (user.role === 'admin' || (user.role as string) === 'ADMIN')) {
      return;
    }

    if (isSupabaseConfigured) {
      try {
        // 1. Try safe, recursion-proof database RPC delete first
        const { error: rpcError } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
        
        if (!rpcError) {
          // Instant State Sync on success
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
          if (setMockUserDatabase) {
            setMockUserDatabase(prev => prev.filter(u => u.id !== userId));
          }
          showNotification(`User account ${userId} successfully removed from central directory (via RPC)`, 'success');
          return;
        }

        console.warn("RPC delete failed or function not found, falling back to direct profiles table deletion:", rpcError.message);

        // 2. Fallback to direct profiles table deletion
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        if (error) {
          console.error("Failed to delete user profile from Supabase:", error.message);
          showNotification(`Failed to delete profile: ${error.message}. Make sure to copy & execute the latest SQL trigger scripts in your Supabase SQL Editor to make the trigger recursion-proof.`, 'warning');
          return;
        } else {
          // Instant State Sync on success
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
          if (setMockUserDatabase) {
            setMockUserDatabase(prev => prev.filter(u => u.id !== userId));
          }
          showNotification(`User account ${userId} successfully removed from central directory`, 'success');
        }
      } catch (err: any) {
        console.error("Exception deleting user profile:", err);
        showNotification(`Failed to delete profile: ${err.message || err}`, 'warning');
        return;
      }
    } else {
      // Offline fallback
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      if (setMockUserDatabase) {
        setMockUserDatabase(prev => prev.filter(u => u.id !== userId));
      }
      showNotification(`User account ${userId} successfully removed from local directory (Offline Fallback)`, 'warning');
    }
  };

  const deleteUser = handleDeleteUser;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-12">
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
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-red-500 transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl p-3 pr-10 outline-none focus:border-red-500 transition-colors"
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
              className="w-full bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(239,68,68,0.2)] cursor-pointer"
            >
              INITIALIZE CRYPTO SESSION
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sortedIssues = [...issues].map(iss => {
    let status: 'Pending' | 'In Progress' | 'Resolved' = 'Pending';
    if (iss.status === 'Resolved' || (iss.status as any) === 'RESOLVED') {
      status = 'Resolved';
    } else if (iss.status === 'In Progress' || (iss.status as any) === 'ASSIGNED' || (iss.status as any) === 'Requires Review') {
      status = 'In Progress';
    }

    let aiScore = (iss.severity * 10) + (iss.precedence * 2.5);
    if (status === 'Resolved') {
      aiScore -= 100;
    } else if (status === 'In Progress') {
      if (iss.resolution_feedback) {
        aiScore += 25;
      } else {
        aiScore += 10;
      }
    }
    return { ...iss, status, aiScore: Math.round(aiScore) };
  }).sort((a, b) => b.aiScore - a.aiScore);

  const activeCount = issues.filter(i => i.status !== 'Resolved' && (i.status as any) !== 'RESOLVED').length;
  const costOfNeglect = (activeCount * 1420.50).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      
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
          className="border border-slate-800 bg-slate-900 text-xs px-4 py-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
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
          <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Daily Economic Drag</h4>
          <div className="text-2xl font-bold text-orange-500 font-mono">{costOfNeglect}</div>
          <p className="text-[10px] text-slate-400 mt-1">Estimated municipal waste</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Dispatches</h4>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{issues.length} Operations</div>
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
                <tr className="text-slate-500 border-b border-slate-800 pb-2">
                  <th className="pb-2">Ticket ID</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">AI Severity</th>
                  <th className="pb-2 text-right">Emergency Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {sortedIssues.map(issue => (
                  <tr key={issue.id} className="hover:bg-slate-800/20">
                    <td className="py-3 font-mono text-slate-400">
                      <div className="font-bold text-slate-200">{issue.id}</div>
                      <div className="text-[10px] text-indigo-400 font-mono mt-0.5 select-all" title="PostGIS WKT String">
                        SRID=4326;POINT({Number(issue.lng || 77.2090).toFixed(6)} {Number(issue.lat || 28.6139).toFixed(6)})
                      </div>
                    </td>
                    <td className="py-3 font-bold">{issue.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        issue.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        issue.status === 'In Progress' && issue.resolution_feedback ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        issue.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {issue.status === 'In Progress' && issue.resolution_feedback ? 'Rejected' : issue.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      {issue.severity}/10 <span className="text-[10px] text-indigo-400 font-bold">({issue.aiScore} pts)</span>
                    </td>
                    <td className="py-3 text-right space-x-1.5">
                      {issue.status !== 'Resolved' ? (
                        <button 
                          onClick={() => handleOverrideStatus(issue.id, 'Resolved')}
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOverrideStatus(issue.id, 'Pending')}
                          className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}
                      <button 
                        onClick={() => handleDropTicket(issue.id)}
                        className="bg-red-500/10 text-red-400 border border-red-500/20 p-1 rounded hover:bg-red-500/20 transition cursor-pointer inline-flex items-center justify-center"
                        title="Purge Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Real-Time System Log Feed</span>
          </h3>
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 font-mono text-[10px] text-slate-400 space-y-2 h-72 overflow-y-auto leading-normal">
            <div>[09:51:20] LOG: Init system pipeline...</div>
            <div>[09:51:24] MON: Redis cache active, 2 active locks</div>
            <div>[09:52:05] GEO: Spatial cluster detected at Grid index (28.6139, 77.2090)</div>
            <div>[09:52:05] AI: Merged report of class 'Pothole', upvoted severity payload</div>
            <div>[09:53:11] API: Response sent to Express Guest Portal</div>
            <div className="text-emerald-400">[09:54:02] SEC: Root token verification OK</div>
            <div>[09:55:18] MON: Core microservices report 100% throughput</div>
            <div>[09:56:44] DB: Safe synced cached state to cloud local backup</div>
          </div>
        </div>
      </div>

      {/* Registered & Active User Session Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <span>Registered Accounts & Session Directory</span>
        </h3>
        
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 pb-2">
                <th className="pb-2">User ID</th>
                <th className="pb-2">Full Name</th>
                <th className="pb-2">Email Address</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Session Status</th>
                <th className="pb-2">Created Date</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No registered user accounts found in the central directory.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const isUserActive = currentUser?.id === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/20">
                      <td className="py-3 font-mono text-slate-400 text-[10px]">{user.id}</td>
                      <td className="py-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border shrink-0 ${
                            user.role === 'citizen' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' :
                            user.role === 'resolver' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                            'bg-rose-500/10 border-rose-500/25 text-rose-400'
                          }`}>
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                          </div>
                          <span>{user.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[11px]">{user.email}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                          user.role === 'resolver' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                          'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3">
                        {isUserActive ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            Logged In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-950 text-slate-500 border border-slate-850/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Registered
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 font-mono">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 text-right">
                        {user.id !== 'user-admin' && user.id !== currentUser?.id && user.role !== 'admin' && (user.role as string) !== 'ADMIN' ? (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500/10 text-red-400 border border-red-500/20 p-1.5 rounded hover:bg-red-500/20 transition cursor-pointer inline-flex items-center justify-center"
                            title="Delete User Profile"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
