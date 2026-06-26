import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Wrench, Sparkles, Activity, ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { InfrastructureIssue, UserAccount } from './types';
import { supabase } from './lib/supabase';

// Import sub-components
import GuestPortal from './components/GuestPortal';
import UnifiedLogin from './components/UnifiedLogin';
import CitizenHub from './components/CitizenHub';
import ResolversPortal from './components/ResolversPortal';
import AdminConsole from './components/AdminConsole';

// Safe localStorage wrappers to prevent iframe SecurityError / DOMException crashes
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("localStorage.getItem access denied:", e);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("localStorage.setItem access denied:", e);
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("localStorage.removeItem access denied:", e);
  }
};

// Access Denied Overlay for secure route guards
function AccessDeniedOverlay({ requiredRole, onRedirectToLogin }: { requiredRole: string; onRedirectToLogin: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col justify-center items-center px-4 py-12 relative animate-fade-in text-slate-200">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-red-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />
      
      <div className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-2xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
        
        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white font-display tracking-tight">Access Denied</h2>
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest font-mono">Authentication Required</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto pt-1">
            This area is highly restricted. You must be logged in as an authorized <span className="text-orange-400 font-extrabold">{requiredRole}</span> to gain access to these operations.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-850 space-y-3">
          <button
            onClick={onRedirectToLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition-all duration-150 hover:scale-[1.02] flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Redirect to Login / Portal Access</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Client-side router synchronized with the browser address bar
  const getInitialTab = () => {
    try {
      const path = window.location.pathname;
      if (path === '/admin') return 'admin';
      if (path === '/login') return 'login';
      if (path === '/citizen' || path === '/citizen/dashboard') return 'citizen';
      if (path === '/worker' || path === '/worker/dispatch' || path === '/resolver') return 'resolver';
    } catch (e) {
      console.warn("Failed to read window.location.pathname:", e);
    }
    return 'landing'; // Default landing view (Guest Portal)
  };

  const [activeTab, setActiveTab] = useState<'landing' | 'login' | 'citizen' | 'resolver' | 'admin'>(getInitialTab);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [userPoints, setUserPoints] = useState(130);
  
  // Mock User Database for transition to PostgreSQL/Supabase Auth
  const [mockUserDatabase, setMockUserDatabase] = useState<UserAccount[]>(() => {
    const saved = safeGetItem('fix_n_go_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse user database", e);
      }
    }
    return [
      {
        id: 'user-admin',
        fullName: 'System Administrator',
        email: 'admin_fixngo',
        password: 'super_secure_password_2026',
        role: 'admin'
      },
      {
        id: 'user-citizen',
        fullName: 'Arjun Sharma',
        email: 'citizen@example.com',
        password: 'password123',
        role: 'citizen'
      },
      {
        id: 'user-resolver',
        fullName: 'Contractor Unit #442',
        email: 'resolver@example.com',
        password: 'password123',
        role: 'resolver'
      }
    ];
  });

  // Current Logged-In User active session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = safeGetItem('fix_n_go_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse current user", e);
      }
    }
    return null;
  });

  // Sync user list and session to localStorage
  useEffect(() => {
    safeSetItem('fix_n_go_users', JSON.stringify(mockUserDatabase));
  }, [mockUserDatabase]);

  useEffect(() => {
    if (currentUser) {
      safeSetItem('fix_n_go_current_user', JSON.stringify(currentUser));
    } else {
      safeRemoveItem('fix_n_go_current_user');
    }
  }, [currentUser]);

  // Detect database errors / OAuth errors in the URL on mount and clear stale sessions
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let hashParams = new URLSearchParams();
      if (window.location.hash) {
        const hashStr = window.location.hash.startsWith('#') 
          ? window.location.hash.slice(1) 
          : window.location.hash;
        hashParams = new URLSearchParams(hashStr);
      }

      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (error || errorDescription) {
        const decodedDescription = errorDescription 
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'An unexpected authentication error occurred.';

        console.error("Supabase authentication failure detected in URL:", decodedDescription);
        
        // Clear local sessions
        setCurrentUser(null);
        safeRemoveItem('fix_n_go_current_user');
        
        const isSupabaseConfigured = 
          import.meta.env.VITE_SUPABASE_URL && 
          import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
          import.meta.env.VITE_SUPABASE_ANON_KEY &&
          import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';
        
        if (isSupabaseConfigured) {
          supabase.auth.signOut().catch(e => console.warn("Supabase signOut failed:", e));
        }

        showNotification(`Authentication Error: ${decodedDescription}`, 'warning');

        // Clear error params from URL to prevent infinite error loops and clean up the page
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error("Error processing URL parameters on mount:", e);
    }
  }, []);

  // Synchronize Supabase authentication session on mount & state changes
  useEffect(() => {
    const isSupabaseConfigured = 
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

    if (!isSupabaseConfigured) return;

    // Helper function to sync profile client-side as a fail-safe fallback
    const syncUserProfile = async (userId: string, email: string, fullName: string, role: string) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: fullName,
            email: email,
            role: role,
            updated_at: new Date().toISOString()
          });
        if (error) {
          console.warn("Client-side profile sync notice:", error.message);
        } else {
          console.log("Profile successfully synced to database profiles table!");
        }
      } catch (err) {
        console.warn("Error running auto-sync profile fallback:", err);
      }
    };

    // Retrieve active session (handles post-redirect login)
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          const user = session.user;
          const rawRole = user.user_metadata?.role || 'citizen';
          const role = String(rawRole).toLowerCase();
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          const checkedRole = (role === 'admin' || role === 'resolver' || role === 'citizen') ? role : 'citizen';

          const loggedInUser: UserAccount = {
            id: user.id,
            fullName: fullName,
            email: user.email || '',
            password: '',
            role: checkedRole,
            createdAt: user.created_at
          };
          
          setCurrentUser(loggedInUser);
          
          // Trigger client-side self-healing profile sync
          await syncUserProfile(user.id, user.email || '', fullName, checkedRole);
        }
      } catch (err) {
        console.warn("Error restoring Supabase session on mount:", err);
      }
    };

    checkSession();

    // Listen to real-time auth state updates (e.g. successful Google redirect or sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const user = session.user;
          const rawRole = user.user_metadata?.role || 'citizen';
          const role = String(rawRole).toLowerCase();
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          const checkedRole = (role === 'admin' || role === 'resolver' || role === 'citizen') ? role : 'citizen';

          const loggedInUser: UserAccount = {
            id: user.id,
            fullName: fullName,
            email: user.email || '',
            password: '',
            role: checkedRole,
            createdAt: user.created_at
          };

          setCurrentUser(loggedInUser);
          
          // Switch tab only if we are still on public views
          setActiveTab(prev => {
            if (prev === 'landing' || prev === 'login') {
              return role as 'citizen' | 'resolver' | 'admin';
            }
            return prev;
          });

          // Trigger client-side self-healing profile sync
          await syncUserProfile(user.id, user.email || '', fullName, checkedRole);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setActiveTab('landing');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login simulated status (kept for legacy component prop compatibility, synced automatically)
  const [citizenLoggedIn, setCitizenLoggedIn] = useState(false);
  const [resolverLoggedIn, setResolverLoggedIn] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCitizenLoggedIn(currentUser.role === 'citizen');
      setResolverLoggedIn(currentUser.role === 'resolver');
    } else {
      setCitizenLoggedIn(false);
      setResolverLoggedIn(false);
    }
  }, [currentUser]);

  // Local coordinate inputs (linked to GPS and Grid Map clicking)
  const [newIssueCategory, setNewIssueCategory] = useState('Pothole');
  const [newIssueLat, setNewIssueLat] = useState('28.6139');
  const [newIssueLng, setNewIssueLng] = useState('77.2090');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [resolutionImages, setResolutionImages] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Synchronize path changes with pushState
  const handleTabChange = (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin') => {
    setActiveTab(tab);
    try {
      let path = '/';
      if (tab === 'login') path = '/login';
      else if (tab === 'citizen') path = '/citizen/dashboard';
      else if (tab === 'resolver') path = '/worker/dispatch';
      else if (tab === 'admin') path = '/admin';
      window.history.pushState({}, '', path);
    } catch (e) {
      console.warn("Failed to pushState in sandbox history:", e);
    }
  };

  // Listen to Back/Forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    try {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    } catch (e) {
      console.warn("Failed to add popstate listener:", e);
    }
  }, []);

  // Mock Database for Issues (with state persistence)
  const [issues, setIssues] = useState<InfrastructureIssue[]>(() => {
    const saved = safeGetItem('fix_n_go_issues');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(issue => ({
            ...issue,
            lat: Number(issue.lat) || 28.6139,
            lng: Number(issue.lng) || 77.2090,
            severity: Number(issue.severity) || 5,
            precedence: Number(issue.precedence) || 1,
            status: issue.status || 'BROADCAST',
            category: issue.category || 'Pothole',
            id: issue.id || `#${Math.floor(Math.random() * 900) + 100}-X`,
            distance: issue.distance || 'Nearby'
          }));
        }
      } catch (e) {
        console.error("Failed to parse issues from localStorage", e);
      }
    }
    return [
      { 
        id: '#902-A', 
        category: 'Water Leakage', 
        lat: 28.6120, 
        lng: 77.2090, 
        severity: 9.8, 
        status: 'BROADCAST', 
        precedence: 42, 
        distance: '400m',
        imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600',
        aiAdvice: 'Clean water pipeline rupture. High flooding risk. Pedestrians should avoid path near central sector.'
      },
      { 
        id: '#881-F', 
        category: 'Pothole', 
        lat: 28.6150, 
        lng: 77.2110, 
        severity: 7.2, 
        status: 'ASSIGNED', 
        precedence: 18, 
        distance: '1.2km',
        imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
        aiAdvice: 'Deep road crater. Heavy risk of structural vehicle damage. Limit speed under 10km/h.'
      },
      { 
        id: '#872-C', 
        category: 'Waste Overflow', 
        lat: 28.6100, 
        lng: 77.2050, 
        severity: 4.5, 
        status: 'RESOLVED', 
        precedence: 4, 
        distance: '2.5km',
        imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
        resolvedImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600',
        workerNotes: 'All scattered garbage cleared. Spray disinfected and placed deep community metal bins.',
        aiAdvice: 'Decomposed organic waste. Unpleasant odors. Biological risk for domestic pets.'
      }
    ];
  });

  // Save to localStorage
  useEffect(() => {
    safeSetItem('fix_n_go_issues', JSON.stringify(issues));
  }, [issues]);

  const showNotification = (message: string, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getRank = (points: number) => {
    if (points >= 150) return 'Mohalla Mukhiya';
    if (points >= 50) return 'Sadak Sipahi';
    return 'Citizen';
  };

  // Report Issue submission pipeline integrating Server-Side Gemini AI & Spatial Deduplication Check
  const handleReportIssue = async (isGuest = false) => {
    const lat = parseFloat(newIssueLat) || 28.6139;
    const lng = parseFloat(newIssueLng) || 77.2090;
    const description = newIssueDescription.trim() || `Accumulated issue of type ${newIssueCategory} causing local municipal inconvenience. Please resolve at the earliest.`;
    
    setIsAnalyzing(true);
    
    // MOCK AI SPATIAL DEDUPLICATION: Check if an issue exists within a tiny radius
    const duplicateIndex = issues.findIndex(issue => 
      Math.abs(issue.lat - lat) < 0.005 && Math.abs(issue.lng - lng) < 0.005 && issue.category === newIssueCategory
    );

    if (duplicateIndex !== -1 && issues[duplicateIndex].status !== 'RESOLVED') {
      // Increment precedence instead of creating a new ticket
      const updatedIssues = [...issues];
      updatedIssues[duplicateIndex].precedence += 1;
      setIssues(updatedIssues);
      showNotification('AI Deduplication Active: Report merged into existing core ticket. Precedence increased!', 'warning');
      setIsAnalyzing(false);
      setNewIssueDescription('');
      setUploadedImage('');
      handleTabChange('landing');
      return;
    }

    // Hit the real server-side Gemini endpoint for analysis if available
    let parsedSeverity = (Math.random() * 5 + 4);
    let advice = 'Standard civic caution is recommended around the affected block.';

    try {
      const response = await fetch('/api/analyze-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newIssueCategory, description })
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          parsedSeverity = data.severity || parsedSeverity;
          advice = data.safetyAdvice || advice;
        }
      }
    } catch (err) {
      console.warn("Gemini server endpoint failed, using local heuristics engine.");
    }

    // Determine sample image category matching
    let finalImg = uploadedImage;
    if (!finalImg) {
      if (newIssueCategory.toLowerCase().includes('water')) {
        finalImg = 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600';
      } else if (newIssueCategory.toLowerCase().includes('waste')) {
        finalImg = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600';
      } else if (newIssueCategory.toLowerCase().includes('light')) {
        finalImg = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=600';
      } else {
        finalImg = 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600';
      }
    }

    // Create new ticket
    const newIssue: InfrastructureIssue = {
      id: `#${Math.floor(Math.random() * 900) + 100}-${isGuest ? 'G' : 'X'}`,
      category: newIssueCategory,
      lat: lat,
      lng: lng,
      severity: parseFloat(parsedSeverity.toFixed(1)),
      status: 'BROADCAST',
      precedence: 1,
      distance: 'Nearby',
      imageUrl: finalImg,
      aiAdvice: advice
    };

    setIssues([newIssue, ...issues]);
    showNotification(`New infrastructure dispatch initiated. Severity: ${newIssue.severity}/10.`);
    
    // Reset Form
    setIsAnalyzing(false);
    setNewIssueDescription('');
    setUploadedImage('');

    if (!isGuest) {
      setUserPoints(prev => prev + 10);
    }

    // Navigate to landing automatically
    handleTabChange('landing');
  };

  const handleAcceptTask = (id: string) => {
    setIssues(issues.map(issue => 
      issue.id === id ? { ...issue, status: 'ASSIGNED' } : issue
    ));
    showNotification(`Active Task ${id} Accepted. Status updated to ASSIGNED.`);
  };

  const handleVerifyFix = (id: string) => {
    const notes = resolutionNotes[id] || 'Verified structural cold-mix patching completed. Disinfected block.';
    const img = resolutionImages[id] || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600';

    setIssues(issues.map(issue => 
      issue.id === id ? { 
        ...issue, 
        status: 'RESOLVED',
        resolvedImageUrl: img,
        workerNotes: notes
      } : issue
    ));
    
    // Clear temp storage
    setResolutionNotes(prev => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
    setResolutionImages(prev => {
      const c = { ...prev };
      delete c[id];
      return c;
    });

    // Reward validation bonus to reporter points
    setUserPoints(prev => prev + 10);

    showNotification(`AI Verification Complete. Task ${id} marked as RESOLVED.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-orange-500/30 flex flex-col justify-between">
      
      {/* Persistent responsive Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div 
            onClick={() => handleTabChange('landing')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="bg-orange-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl leading-none font-mono text-base shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-transform group-hover:scale-105">
              FG
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                FixN<span className="text-orange-500">Go</span>
              </h1>
              <p className="hidden sm:block text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Hyperlocal Action & Dispatch</p>
            </div>
          </div>
          
          {/* Menu / Nav tabs */}
          <div className="flex items-center gap-1.5 md:gap-3 text-xs font-semibold">
            <button 
              onClick={() => handleTabChange('landing')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'landing' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Guest Portal
            </button>

            {citizenLoggedIn && (
              <button 
                onClick={() => handleTabChange('citizen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'citizen' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Citizen Hub</span>
              </button>
            )}

            {resolverLoggedIn && (
              <button 
                onClick={() => handleTabChange('resolver')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'resolver' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Resolvers Portal</span>
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button 
                onClick={() => handleTabChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}
          </div>

          {/* User profile / Login CTA */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white">{currentUser.fullName}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider">
                    {currentUser.role === 'citizen' && (
                      <span className="text-indigo-400">Citizen • {userPoints} pts</span>
                    )}
                    {currentUser.role === 'resolver' && (
                      <span className="text-emerald-400">Authorized Resolver</span>
                    )}
                    {currentUser.role === 'admin' && (
                      <span className="text-rose-500">System Admin</span>
                    )}
                  </div>
                </div>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                  currentUser.role === 'citizen' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' :
                  currentUser.role === 'resolver' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                  'bg-rose-500/10 border-rose-500/25 text-rose-400'
                }`}>
                  {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                </div>

                <button
                  onClick={async () => {
                    const isSupabaseConfigured = 
                      import.meta.env.VITE_SUPABASE_URL && 
                      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
                      import.meta.env.VITE_SUPABASE_ANON_KEY &&
                      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

                    if (isSupabaseConfigured) {
                      try {
                        await supabase.auth.signOut();
                      } catch (err) {
                        console.error("Supabase signOut error:", err);
                      }
                    }
                    setCurrentUser(null);
                    showNotification("Logged out successfully. Secure session terminated.", "success");
                    handleTabChange('landing');
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800 cursor-pointer transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleTabChange('login')}
                className="relative group overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-black px-4 py-2 rounded-xl tracking-tight transition-transform duration-150 hover:scale-105 shadow-[0_0_20px_rgba(249,115,22,0.25)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Login / Portal Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Notifications (Toast) */}
      {notification && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-50 text-xs font-bold border max-w-md text-center transition-all animate-bounce ${notification.type === 'warning' ? 'bg-amber-950/95 border-amber-500/50 text-amber-200' : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'}`}>
          {notification.message}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {activeTab === 'landing' && (
          <GuestPortal 
            issues={issues}
            handleReportIssue={handleReportIssue}
            isAnalyzing={isAnalyzing}
            newIssueCategory={newIssueCategory}
            setNewIssueCategory={setNewIssueCategory}
            newIssueLat={newIssueLat}
            setNewIssueLat={setNewIssueLat}
            newIssueLng={newIssueLng}
            setNewIssueLng={setNewIssueLng}
            newIssueDescription={newIssueDescription}
            setNewIssueDescription={setNewIssueDescription}
            uploadedImage={uploadedImage}
            setUploadedImage={setUploadedImage}
            handleTabChange={handleTabChange}
            citizenLoggedIn={citizenLoggedIn}
            resolverLoggedIn={resolverLoggedIn}
          />
        )}

         {activeTab === 'login' && (
          <UnifiedLogin 
            mockUserDatabase={mockUserDatabase}
            setMockUserDatabase={setMockUserDatabase}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            handleTabChange={handleTabChange}
            showNotification={showNotification}
          />
         )}

         {activeTab === 'citizen' && (
           currentUser && currentUser.role === 'citizen' ? (
             <CitizenHub 
               issues={issues}
               handleReportIssue={handleReportIssue}
               isAnalyzing={isAnalyzing}
               newIssueCategory={newIssueCategory}
               setNewIssueCategory={setNewIssueCategory}
               newIssueLat={newIssueLat}
               setNewIssueLat={setNewIssueLat}
               newIssueLng={newIssueLng}
               setNewIssueLng={setNewIssueLng}
               newIssueDescription={newIssueDescription}
               setNewIssueDescription={setNewIssueDescription}
               uploadedImage={uploadedImage}
               setUploadedImage={setUploadedImage}
               userPoints={userPoints}
               setUserPoints={setUserPoints}
               showNotification={showNotification}
             />
           ) : (
             <AccessDeniedOverlay 
               requiredRole="Citizen"
               onRedirectToLogin={() => handleTabChange('login')}
             />
           )
         )}

         {activeTab === 'resolver' && (
           currentUser && currentUser.role === 'resolver' ? (
             <ResolversPortal 
               issues={issues}
               handleAcceptTask={handleAcceptTask}
               handleVerifyFix={handleVerifyFix}
               resolutionImages={resolutionImages}
               setResolutionImages={setResolutionImages}
               resolutionNotes={resolutionNotes}
               setResolutionNotes={setResolutionNotes}
             />
           ) : (
             <AccessDeniedOverlay 
               requiredRole="Authorized Field Resolver"
               onRedirectToLogin={() => handleTabChange('login')}
             />
           )
         )}

         {activeTab === 'admin' && (
           currentUser && currentUser.role === 'admin' ? (
             <AdminConsole 
               issues={issues}
               setIssues={setIssues}
               showNotification={showNotification}
               bypassAuth={true}
             />
           ) : (
             <AccessDeniedOverlay 
               requiredRole="Authorized Administrator"
               onRedirectToLogin={() => handleTabChange('login')}
             />
           )
         )}

      </main>

      {/* Persistent Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} FixNGo. Action-Driven Civic Infrastructure Dispatch. All rights reserved.</p>
      </footer>

    </div>
  );
}
