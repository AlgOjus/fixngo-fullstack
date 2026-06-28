import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  User, 
  Wrench, 
  CheckCircle2, 
  X, 
  Settings, 
  RefreshCw, 
  UserCheck, 
  LogOut,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserAccount, InfrastructureIssue } from '../types';

interface GuidedSimulatorProps {
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  issues: InfrastructureIssue[];
  setIssues: React.Dispatch<React.SetStateAction<InfrastructureIssue[]>>;
  userPoints: number;
  setUserPoints: React.Dispatch<React.SetStateAction<number>>;
  activeTab: string;
  handleTabChange: (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin' | 'update-password') => void;
  showNotification: (msg: string, type?: string) => void;
  mockUserDatabase: UserAccount[];
  handleReportIssue: (
    isGuest?: boolean,
    overrides?: {
      category?: string;
      lat?: string;
      lng?: string;
      description?: string;
      imageUrl?: string;
    }
  ) => Promise<any>;
}

export const GuidedSimulator: React.FC<GuidedSimulatorProps> = ({
  currentUser,
  setCurrentUser,
  issues,
  setIssues,
  userPoints,
  setUserPoints,
  activeTab,
  handleTabChange,
  showNotification,
  mockUserDatabase,
  handleReportIssue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulatingReport, setIsSimulatingReport] = useState(false);
  const [isSimulatingResolve, setIsSimulatingResolve] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Track simulated issue IDs created in this session
  const [testIssueIds, setTestIssueIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('fix_n_go_test_issue_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isSupabaseConfigured = 
    Boolean(import.meta.env.VITE_SUPABASE_URL) && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

  // Expose handleSimulate and cleanupTestIssues globally for automated demo controllers / test scripts
  useEffect(() => {
    (window as any).handleSimulate = handleSimulate;
    (window as any).cleanupTestIssues = cleanupTestIssues;
    return () => {
      delete (window as any).handleSimulate;
      delete (window as any).cleanupTestIssues;
    };
  }, [issues, currentUser, userPoints, testIssueIds]);

  // Guided Demo Controller State Orchestrator
  const handleSimulate = async (action: 'REPORT' | 'CLAIM' | 'VERIFY') => {
    try {
      if (action === 'REPORT') {
        setIsSimulatingReport(true);
        const randomOffsetLat = (Math.random() - 0.5) * 0.01;
        const randomOffsetLng = (Math.random() - 0.5) * 0.01;
        const lat = (28.6139 + randomOffsetLat).toFixed(4);
        const lng = (77.2090 + randomOffsetLng).toFixed(4);

        showNotification('Simulating high-quality report dispatch...', 'info');

        const newIssue = await handleReportIssue(false, {
          category: 'Roadwork',
          lat,
          lng,
          description: 'Severe Pothole on MG Road. Deep crater causing traffic hazard.',
          imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600'
        });

        if (newIssue && newIssue.id) {
          setTestIssueIds(prev => {
            const next = [...prev, newIssue.id];
            sessionStorage.setItem('fix_n_go_test_issue_ids', JSON.stringify(next));
            return next;
          });
        }

        handleTabChange('landing');
        showNotification(`Simulation Successful: Roadwork reported on MG Road!`, 'success');
        return newIssue;
      }

      if (action === 'CLAIM') {
        showNotification('Locating most recently created issue in Supabase...', 'info');
        
        let latestId = '';
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('issues')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            throw error;
          }
          if (data && data.length > 0) {
            latestId = data[0].id;
          }
        }

        if (!latestId && issues.length > 0) {
          latestId = issues[0].id;
        }

        if (!latestId) {
          throw new Error('No issues found in system database to claim.');
        }

        showNotification(`Claiming issue #${latestId.slice(0, 8)} for ${currentUser?.fullName || 'Resolver'}...`, 'info');

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('issues')
            .update({
              status: 'CLAIMED',
              worker_id: currentUser?.id || 'user-resolver',
              updated_at: new Date().toISOString()
            })
            .eq('id', latestId);

          if (error) {
            throw error;
          }
        }

        setIssues(prevIssues => prevIssues.map(issue => 
          issue.id === latestId ? {
            ...issue,
            status: 'In Progress',
            workerId: currentUser?.id || 'user-resolver'
          } : issue
        ));

        showNotification(`Issue #${latestId.slice(0, 8)} successfully claimed!`, 'success');
      }

      if (action === 'VERIFY') {
        setIsSimulatingResolve(true);
        showNotification('Locating most recently created issue for verification...', 'info');

        let latestId = '';
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('issues')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            throw error;
          }
          if (data && data.length > 0) {
            latestId = data[0].id;
          }
        }

        if (!latestId && issues.length > 0) {
          latestId = issues[0].id;
        }

        if (!latestId) {
          throw new Error('No issues found in system database to verify.');
        }

        showNotification(`Verifying issue #${latestId.slice(0, 8)} with AI QA...`, 'info');

        const mockAfterImg = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600';
        const workerNotes = 'Completed cold-mix repair, swept residual asphalt. AI QA verified.';

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('issues')
            .update({
              status: 'RESOLVED',
              after_image_url: mockAfterImg,
              worker_notes: workerNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', latestId);

          if (error) {
            throw error;
          }
        }

        setIssues(prevIssues => prevIssues.map(issue => 
          issue.id === latestId ? {
            ...issue,
            status: 'Resolved',
            resolvedImageUrl: mockAfterImg,
            workerNotes: workerNotes
          } : issue
        ));

        setUserPoints(prev => {
          const nextPoints = prev + 50;
          localStorage.setItem('fix_n_go_user_points', nextPoints.toString());
          if (isSupabaseConfigured && currentUser?.id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (currentUser.id !== 'user-admin' && uuidRegex.test(currentUser.id)) {
              supabase
                .from('profiles')
                .update({ points: nextPoints })
                .eq('id', currentUser.id)
                .then(({ error }) => {
                  if (error) console.warn("Supabase points sync failed:", error.message);
                });
            }
          }
          return nextPoints;
        });

        showNotification(`Issue #${latestId.slice(0, 8)} marked as RESOLVED (AI QA Verified)!`, 'success');
      }
    } catch (err: any) {
      console.error(`[DEMO ERROR]: Action [${action}] failed.`, err);
      showNotification(`Simulation action [${action}] failed: ${err?.message || err}`, 'warning');
    } finally {
      setIsSimulatingReport(false);
      setIsSimulatingResolve(false);
    }
  };

  // 1. Simulate Citizen Report with pre-defined mock data (using the state orchestrator)
  const handleSimulateReport = async () => {
    await handleSimulate('REPORT');
  };

  // 2. Seamless Identity Role Switch
  const handleSwitchRole = async (role: 'citizen' | 'resolver') => {
    const targetEmail = role === 'citizen' ? 'citizen@example.com' : 'resolver@example.com';
    const mockUser = mockUserDatabase.find(u => u.email.toLowerCase() === targetEmail);

    if (!mockUser) {
      showNotification(`Mock user for ${role} not found`, 'warning');
      return;
    }

    showNotification(`Switching identity to ${mockUser.fullName}...`, 'info');

    // Attempt real Supabase sign-in first if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: 'password123',
        });

        if (!error && data.user) {
          const user = data.user;
          const loggedInUser: UserAccount = {
            id: user.id,
            fullName: mockUser.fullName,
            email: user.email || '',
            password: '',
            role: role,
            createdAt: user.created_at
          };
          setCurrentUser(loggedInUser);
          localStorage.setItem('fix_n_go_current_user', JSON.stringify(loggedInUser));
          handleTabChange(role);
          showNotification(`Authenticated as ${mockUser.fullName} (Supabase Connected!)`, 'success');
          return;
        }
      } catch (err: any) {
        console.warn("Supabase auth failed during simulation, falling back to local simulation:", err.message);
      }
    }

    // Local state fallback (Instant response for local development)
    const loggedInUser: UserAccount = {
      ...mockUser,
      password: ''
    };
    setCurrentUser(loggedInUser);
    localStorage.setItem('fix_n_go_current_user', JSON.stringify(loggedInUser));
    handleTabChange(role);
    showNotification(`Switched role locally: ${mockUser.fullName} (${role.toUpperCase()})`, 'success');
  };

  // 3. Simulate Resolution and QA Verification Loop (using the state orchestrator)
  const handleSimulateVerification = async () => {
    await handleSimulate('VERIFY');
  };

  // State Reset and test issues cleanup
  const cleanupTestIssues = async () => {
    try {
      if (testIssueIds.length > 0) {
        showNotification(`Deleting ${testIssueIds.length} simulated reports from database...`, 'info');

        // Delete tracked reports from Supabase if configured
        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('issues')
            .delete()
            .in('id', testIssueIds);

          if (error) {
            console.error("[DEMO ERROR]: cleanupTestIssues failed in Supabase", error.message);
          } else {
            console.log("Successfully deleted test issues from Supabase.");
          }
        }

        // Clear from local state immediately so dashboard displays updates
        setIssues(prevIssues => prevIssues.filter(issue => !testIssueIds.includes(issue.id)));

        // Reset the tracked IDs
        setTestIssueIds([]);
        sessionStorage.removeItem('fix_n_go_test_issue_ids');
      }
    } catch (err) {
      console.error("[DEMO ERROR]: cleanupTestIssues failed.", err);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    showNotification('Starting session reset & report cleanup...', 'info');

    try {
      await cleanupTestIssues();

      // Also reset current user session if desired
      if (currentUser) {
        setCurrentUser(null);
        localStorage.removeItem('fix_n_go_current_user');
      }

      // Reset user points
      setUserPoints(0);
      localStorage.removeItem('fix_n_go_user_points');

      // Go back to landing page
      handleTabChange('landing');

      showNotification('Demo session reset complete. Cleaned up simulated reports safely!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Error during reset/cleanup process', 'warning');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fix_n_go_current_user');
    handleTabChange('landing');
    showNotification('Logged out successfully.', 'success');
  };

  return (
    <div id="demo-guided-simulator-container" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expand/Collapse Button */}
      <button
        id="demo-simulator-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-orange-500/50 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.25)] hover:bg-slate-850 hover:border-orange-500 hover:scale-105 transition-all text-xs font-bold cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
        <span>{isOpen ? 'Close Simulator' : '🔧 Demo Controller'}</span>
      </button>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="demo-simulator-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-80 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-4 overflow-hidden text-slate-200 mt-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-orange-500/10 border border-orange-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">FixNGo Simulator</h4>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">2-Min Hackathon Mode</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Helper Banner */}
            <div className="bg-orange-950/20 border border-orange-500/20 rounded-lg p-2.5 mb-3 text-[10px] text-orange-200 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                Use this floating widget to instantly simulate role changes, submit reports with custom mock data, and trigger AI verification loops without changing tabs.
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-4">
              
              {/* Step 1: Citizen Report */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Step 1: Citizens Journey
                </span>
                <button
                  id="btn-simulate-report"
                  disabled={isSimulatingReport}
                  onClick={handleSimulateReport}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingReport ? 'animate-spin' : ''}`} />
                  <span>Simulate Citizen Report</span>
                </button>
              </div>

              {/* Step 2: Switch Roles */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Step 2: Instant Identity Switcher
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-login-citizen"
                    onClick={() => handleSwitchRole('citizen')}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>As Citizen</span>
                  </button>
                  <button
                    id="btn-login-resolver"
                    onClick={() => handleSwitchRole('resolver')}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>As Resolver</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Verification */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Step 3: Verification Loop
                </span>
                <button
                  id="btn-simulate-resolve"
                  disabled={isSimulatingResolve}
                  onClick={handleSimulateVerification}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-emerald-500/50 transition-all rounded-xl font-bold text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simulate AI QA Verification</span>
                </button>
              </div>

              {/* Current Status Footer */}
              <div className="pt-2 border-t border-slate-850 text-[10px] text-slate-400 flex items-center justify-between">
                <div>
                  <span className="block font-semibold">Active User:</span>
                  <span className="text-[11px] text-white">
                    {currentUser ? currentUser.fullName : 'Guest'}
                  </span>
                </div>
                <div>
                  <span className="block font-semibold">Impact Points:</span>
                  <span className="text-[11px] text-orange-400 font-bold">
                    {userPoints} pts
                  </span>
                </div>
              </div>

              {/* Reset/Cleanup Button */}
              <div className="pt-2 border-t border-slate-850 space-y-2">
                <button
                  id="btn-simulator-reset"
                  disabled={isResetting}
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-950/10 border border-red-500/30 text-red-400 hover:bg-red-950/20 hover:border-red-500 transition-all rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Reset & Cleanup ({testIssueIds.length})</span>
                </button>

                {currentUser && (
                  <button
                    id="btn-simulator-logout"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-400 rounded-lg transition-colors text-[10px] font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout Only</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
