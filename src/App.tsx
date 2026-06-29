import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, User, Wrench, Sparkles, Activity, ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { InfrastructureIssue, UserAccount } from './types';
import { supabase } from './lib/supabase';

// Import sub-components
import GuestPortal from './components/GuestPortal';
import { GuidedSimulator } from './components/GuidedSimulator';
import UnifiedLogin from './components/UnifiedLogin';
import CitizenHub from './components/CitizenHub';
import ResolversPortal from './components/ResolversPortal';
import AdminConsole from './components/AdminConsole';
import UpdatePassword from './components/UpdatePassword';

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

// Helper RFC4122 compliant UUID v4 generator
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn("crypto.randomUUID failed, falling back:", e);
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function App() {
  // Client-side router synchronized with the browser address bar
  const getInitialTab = () => {
    try {
      const rawPath = window.location.pathname;
      const path = rawPath.replace(/\/$/, '') || '/';
      const urlParams = new URLSearchParams(window.location.search);
      let hashParams = new URLSearchParams();
      if (window.location.hash) {
        const hashStr = window.location.hash.startsWith('#') 
          ? window.location.hash.slice(1) 
          : window.location.hash;
        hashParams = new URLSearchParams(hashStr);
      }

      const isRecovery = urlParams.get('type') === 'recovery' || 
                         hashParams.get('type') === 'recovery' || 
                         window.location.hash.includes('type=recovery') || 
                         window.location.hash.includes('recovery') ||
                         path === '/update-password';

      if (isRecovery) {
        try {
          window.history.replaceState({}, '', '/update-password' + window.location.hash);
        } catch (e) {
          console.warn("Failed to update history path during recovery routing:", e);
        }
        return 'update-password';
      }

      if (path === '/admin') return 'admin';
      if (path === '/login') return 'login';
      if (path === '/update-password') return 'update-password';
      if (path === '/citizen' || path === '/citizen/dashboard') return 'citizen';
      if (path === '/worker' || path === '/worker/dispatch' || path === '/resolver') return 'resolver';
    } catch (e) {
      console.warn("Failed to read window.location.pathname:", e);
    }
    return 'landing'; // Default landing view (Guest Portal)
  };

  const [activeTab, setActiveTab] = useState<'landing' | 'login' | 'citizen' | 'resolver' | 'admin' | 'update-password'>(getInitialTab);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [userPoints, setUserPoints] = useState<number>(() => {
    const saved = safeGetItem('fix_n_go_user_points');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    safeSetItem('fix_n_go_user_points', userPoints.toString());
  }, [userPoints]);
  
  // Mock User Database for transition to PostgreSQL/Supabase Auth
  const [mockUserDatabase, setMockUserDatabase] = useState<UserAccount[]>(() => {
    const saved = safeGetItem('fix_n_go_users');
    let db: UserAccount[] = [];
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse user database", e);
      }
    }
    
    if (!Array.isArray(db) || db.length === 0) {
      db = [
        {
          id: 'user-admin',
          fullName: 'System Administrator',
          email: 'admin_fixngo',
          password: 'super_secured_password_2026',
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
    }

    // Force system administrator credentials to ensure they are never stale
    const adminIdx = db.findIndex(u => u.id === 'user-admin');
    if (adminIdx !== -1) {
      db[adminIdx] = {
        ...db[adminIdx],
        email: 'admin_fixngo',
        password: 'super_secured_password_2026',
        role: 'admin'
      };
    } else {
      db.unshift({
        id: 'user-admin',
        fullName: 'System Administrator',
        email: 'admin_fixngo',
        password: 'super_secured_password_2026',
        role: 'admin'
      });
    }

    return db;
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

  const currentUserRef = useRef<UserAccount | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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

  // Sync user points to Supabase profiles table when they change
  useEffect(() => {
    const syncPoints = async () => {
      if (currentUser && currentUser.id) {
        // Hard Guard against admin or non-UUID updates
        if (currentUser.id === 'user-admin') {
          return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(currentUser.id)) {
          return;
        }

        const isSupabaseConfigured = 
          import.meta.env.VITE_SUPABASE_URL && 
          import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
          import.meta.env.VITE_SUPABASE_ANON_KEY &&
          import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ points: userPoints })
              .eq('id', currentUser.id);
            if (error) {
              console.warn("Could not save user points to database (points column might not exist):", error.message);
            } else {
              console.log("User points updated in database profiles table:", userPoints);
            }
          } catch (err) {
            console.warn("Error updating user points in database profiles table:", err);
          }
        }
      }
    };
    syncPoints();
  }, [userPoints, currentUser]);

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
      if (userId === 'user-admin') return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) return;

      try {
        // Try direct insert first
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: fullName,
            email: email,
            role: role,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.warn("syncUserProfile insert failed, falling back to update:", insertError.message);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              email: email,
              role: role,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (updateError) {
            console.warn("syncUserProfile fallback update failed:", updateError.message);
          } else {
            console.log("syncUserProfile sync completed via update fallback!");
          }
        } else {
          console.log("syncUserProfile sync completed via direct insert!");
        }
      } catch (err) {
        console.warn("Error running auto-sync profile fallback:", err);
      }
    };

    // Helper to fetch and restore user points from Supabase
    const fetchAndSetUserPoints = async (userId: string) => {
      if (userId === 'user-admin') return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.warn("Could not fetch user points from database:", error.message);
        } else if (data && data.points !== undefined && data.points !== null) {
          const pts = typeof data.points === 'number' ? data.points : parseInt(data.points, 10);
          if (!isNaN(pts)) {
            setUserPoints(pts);
            safeSetItem('fix_n_go_user_points', pts.toString());
          }
        }
      } catch (err) {
        console.warn("Error fetching points from profiles table:", err);
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

          // Restore user points from Supabase profile
          await fetchAndSetUserPoints(user.id);
        }
      } catch (err) {
        console.warn("Error restoring Supabase session on mount:", err);
      }
    };

    checkSession();

    // Listen to real-time auth state updates (e.g. successful Google redirect or sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Supabase Auth Event received:", event, !!session);

        const urlParams = new URLSearchParams(window.location.search);
        let hashParams = new URLSearchParams();
        if (window.location.hash) {
          const hashStr = window.location.hash.startsWith('#') 
            ? window.location.hash.slice(1) 
            : window.location.hash;
          hashParams = new URLSearchParams(hashStr);
        }
        
        const pathNormalized = window.location.pathname.replace(/\/$/, '') || '/';
        const isRecovery = event === 'PASSWORD_RECOVERY' ||
                           urlParams.get('type') === 'recovery' || 
                           hashParams.get('type') === 'recovery' || 
                           window.location.hash.includes('type=recovery') || 
                           window.location.hash.includes('recovery') ||
                           pathNormalized === '/update-password';

        if (isRecovery && session?.user) {
          console.log("Force update-password tab due to active recovery session.");
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
          setActiveTab('update-password');
          try {
            window.history.replaceState({}, '', '/update-password' + window.location.hash);
          } catch (e) {
            console.warn("Failed to replace state in recovery:", e);
          }
          
          await syncUserProfile(user.id, user.email || '', fullName, checkedRole);
          return;
        }

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
          
          // Switch tab only if we are still on public views and not on recovery
          setActiveTab(prev => {
            if (prev === 'update-password' || pathNormalized === '/update-password') {
              return 'update-password';
            }

            if ((prev === 'landing' || prev === 'login') && pathNormalized !== '/update-password') {
              return checkedRole;
            }
            return prev;
          });

          // Trigger client-side self-healing profile sync
          await syncUserProfile(user.id, user.email || '', fullName, checkedRole);

          // Restore user points from Supabase profile
          await fetchAndSetUserPoints(user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserPoints(0);
          safeRemoveItem('fix_n_go_user_points');
          setActiveTab('landing');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch real issues from Supabase if configured, with polling and real-time sync to catch external deletes
  useEffect(() => {
    const isSupabaseConfigured = 
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

    if (!isSupabaseConfigured) return;

    const fetchIssues = async () => {
      try {
        const { data, error } = await supabase
          .from('issues')
          .select('*');

        if (error) {
          console.warn("Could not retrieve issues from Supabase table:", error.message);
          return;
        }

        if (data) {
          const mapped: InfrastructureIssue[] = data.map(item => {
            // Clean up legacy ID format if present
            let cleanId = item.id;
            if (cleanId && (cleanId.startsWith('#') || cleanId.includes('-X') || cleanId.includes('-G'))) {
              if (cleanId === '#902-A' || cleanId === '902a2026-8310-4d32-896b-9c6cc0ff2d34-X') {
                cleanId = '902a2026-8310-4d32-896b-9c6cc0ff2d34';
              } else if (cleanId === '#881-F' || cleanId === '881f2026-8310-4d32-896b-9c6cc0ff2d34-X') {
                cleanId = '881f2026-8310-4d32-896b-9c6cc0ff2d34';
              } else if (cleanId === '#872-C' || cleanId === '872c2026-8310-4d32-896b-9c6cc0ff2d34-X') {
                cleanId = '872c2026-8310-4d32-896b-9c6cc0ff2d34';
              } else {
                cleanId = cleanId.replace(/^[#]/, '').replace(/-[XG]$/, '');
                if (cleanId.length < 10) {
                  cleanId = generateUUID();
                }
              }
            }

            return {
              id: cleanId || generateUUID(),
              category: item.category || 'Pothole',
              lat: Number(item.lat) || 28.6139,
              lng: Number(item.lng) || 77.2090,
              severity: Number(item.severity) || 5,
              status: item.status || 'Pending',
              precedence: Number(item.precedence) || 1,
              distance: item.distance || 'Nearby',
              imageUrl: item.image_url || item.imageUrl || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
              resolvedImageUrl: item.resolved_image_url || item.resolvedImageUrl,
              workerNotes: item.worker_notes || item.workerNotes,
              aiAdvice: item.ai_advice || item.aiAdvice || 'Standard civic caution is recommended around the affected block.',
              reporterId: item.reporter_id
            };
          });

          // Correct the bug where local/prev issues was merging and adding back deleted database rows
          setIssues(mapped);
        }
      } catch (err) {
        console.warn("Error loading issues from database:", err);
      }
    };

    fetchIssues();

    // Poll the database every 5 seconds so that external deletions are picked up seamlessly
    const pollInterval = setInterval(fetchIssues, 5000);

    // Subscribe to real-time events on the issues table
    const issuesChannel = supabase
      .channel('issues_app_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        (payload) => {
          console.log('Real-time database payload received in App:', payload);
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new;
            setIssues(prev => {
              if (prev.some(x => x.id === newItem.id)) return prev;
              const mapped: InfrastructureIssue = {
                id: newItem.id,
                category: newItem.category || 'Pothole',
                lat: Number(newItem.lat) || 28.6139,
                lng: Number(newItem.lng) || 77.2090,
                severity: Number(newItem.severity) || 5,
                status: newItem.status || 'Pending',
                precedence: Number(newItem.precedence) || 1,
                distance: newItem.distance || 'Nearby',
                imageUrl: newItem.image_url || newItem.imageUrl || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
                resolvedImageUrl: newItem.resolved_image_url || newItem.resolvedImageUrl,
                workerNotes: newItem.worker_notes || newItem.workerNotes,
                aiAdvice: newItem.ai_advice || newItem.aiAdvice || 'Standard civic caution is recommended around the affected block.'
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new;
            setIssues(prev => prev.map(x => {
              if (x.id === updatedItem.id) {
                return {
                  ...x,
                  category: updatedItem.category || x.category,
                  lat: Number(updatedItem.lat) || x.lat,
                  lng: Number(updatedItem.lng) || x.lng,
                  severity: Number(updatedItem.severity) || x.severity,
                  status: updatedItem.status || x.status,
                  precedence: Number(updatedItem.precedence) || x.precedence,
                  imageUrl: updatedItem.image_url || updatedItem.imageUrl || x.imageUrl,
                  resolvedImageUrl: updatedItem.resolved_image_url || updatedItem.resolvedImageUrl || x.resolvedImageUrl,
                  workerNotes: updatedItem.worker_notes || updatedItem.workerNotes || x.workerNotes,
                  aiAdvice: updatedItem.ai_advice || updatedItem.aiAdvice || x.aiAdvice
                };
              }
              return x;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldItem = payload.old;
            setIssues(prev => prev.filter(x => x.id !== oldItem.id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(issuesChannel);
    };
  }, []);

  // Fetch real profiles from Supabase if configured, with polling and real-time sync to catch external deletes
  useEffect(() => {
    const isSupabaseConfigured = 
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

    if (!isSupabaseConfigured) return;

    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (error) {
          console.warn("Could not retrieve profiles from Supabase table:", error.message);
          return;
        }

        if (data) {
          const mapped: UserAccount[] = data.map(item => ({
            id: item.id,
            fullName: item.full_name || 'User',
            email: item.email || '',
            password: '',
            role: item.role || 'citizen',
            points: item.points || 0,
            createdAt: item.created_at || new Date().toISOString()
          }));

          setMockUserDatabase(prev => {
            const result = [...mapped];
            const localAdmin: UserAccount = {
              id: 'user-admin',
              fullName: 'Municipal Chief (Admin)',
              email: 'admin_fixngo',
              password: 'super_secured_password_2026',
              role: 'admin',
              createdAt: prev.find(u => u.id === 'user-admin')?.createdAt || new Date().toISOString()
            };
            result.unshift(localAdmin);
            return result;
          });

          // Profile existence check is safely managed via real-time DELETE event subscription
        }
      } catch (err) {
        console.warn("Error loading profiles from database:", err);
      }
    };

    fetchProfiles();

    // Poll database every 5 seconds for user profile deletions
    const pollInterval = setInterval(fetchProfiles, 5000);

    // Subscribe to real-time events on the profiles table
    const profilesChannel = supabase
      .channel('profiles_app_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Real-time database payload received for profiles:', payload);
          if (payload.eventType === 'INSERT') {
            const newUser = payload.new;
            setMockUserDatabase(prev => {
              if (prev.some(x => x.id === newUser.id)) return prev;
              const mapped: UserAccount = {
                id: newUser.id,
                fullName: newUser.full_name || 'User',
                email: newUser.email || '',
                password: '',
                role: newUser.role || 'citizen',
                points: newUser.points || 0,
                createdAt: newUser.created_at || new Date().toISOString()
              };
              return [...prev, mapped];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedUser = payload.new;
            setMockUserDatabase(prev => prev.map(x => {
              if (x.id === updatedUser.id) {
                return {
                  ...x,
                  fullName: updatedUser.full_name || x.fullName,
                  email: updatedUser.email || x.email,
                  role: updatedUser.role || x.role,
                  points: updatedUser.points !== undefined ? updatedUser.points : x.points
                };
              }
              return x;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldUser = payload.old;
            setMockUserDatabase(prev => prev.filter(x => x.id !== oldUser.id));
            
            const curr = currentUserRef.current;
            if (curr && curr.id === oldUser.id) {
              console.warn("Logged in user profile was deleted in real-time. Revoking session.");
              setCurrentUser(null);
              safeRemoveItem('fix_n_go_current_user');
              setActiveTab('landing');
              showNotification('Your profile has been removed from the central grid registry.', 'warning');
              supabase.auth.signOut().catch(e => console.warn(e));
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(profilesChannel);
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
  const [customCategoryNote, setCustomCategoryNote] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resolutionImages, setResolutionImages] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Synchronize path changes with pushState
  const handleTabChange = (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin' | 'update-password') => {
    setActiveTab(tab);
    try {
      let path = '/';
      if (tab === 'login') path = '/login';
      else if (tab === 'citizen') path = '/citizen/dashboard';
      else if (tab === 'resolver') path = '/worker/dispatch';
      else if (tab === 'admin') path = '/admin';
      else if (tab === 'update-password') path = '/update-password';
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
          return parsed.map(issue => {
            const legacyStatus = issue.status || 'Pending';
            let status: 'Pending' | 'In Progress' | 'Resolved' = 'Pending';
            if (legacyStatus === 'Resolved' || legacyStatus === 'RESOLVED') {
              status = 'Resolved';
            } else if (legacyStatus === 'In Progress' || legacyStatus === 'ASSIGNED' || legacyStatus === 'Requires Review') {
              status = 'In Progress';
            }

            // Migrating old/legacy short or suffixed IDs to clean UUIDs
            let cleanId = issue.id;
            if (issue.id === '#902-A' || issue.id === '902a2026-8310-4d32-896b-9c6cc0ff2d34-X') {
              cleanId = '902a2026-8310-4d32-896b-9c6cc0ff2d34';
            } else if (issue.id === '#881-F' || issue.id === '881f2026-8310-4d32-896b-9c6cc0ff2d34-X') {
              cleanId = '881f2026-8310-4d32-896b-9c6cc0ff2d34';
            } else if (issue.id === '#872-C' || issue.id === '872c2026-8310-4d32-896b-9c6cc0ff2d34-X') {
              cleanId = '872c2026-8310-4d32-896b-9c6cc0ff2d34';
            } else if (issue.id && (issue.id.startsWith('#') || issue.id.includes('-X') || issue.id.includes('-G'))) {
              cleanId = issue.id.replace(/^[#]/, '').replace(/-[XG]$/, '');
              if (cleanId.length < 10) {
                cleanId = generateUUID();
              }
            }

            return {
              ...issue,
              id: cleanId || generateUUID(),
              lat: Number(issue.lat) || 28.6139,
              lng: Number(issue.lng) || 77.2090,
              severity: Number(issue.severity) || 5,
              precedence: Number(issue.precedence) || 1,
              status,
              category: issue.category || 'Pothole',
              distance: issue.distance || 'Nearby'
            };
          });
        }
      } catch (e) {
        console.error("Failed to parse issues from localStorage", e);
      }
    }
    return [
      { 
        id: '902a2026-8310-4d32-896b-9c6cc0ff2d34', 
        category: 'Water Leakage', 
        lat: 28.6120, 
        lng: 77.2090, 
        severity: 9.8, 
        status: 'Pending', 
        precedence: 42, 
        distance: '400m',
        imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600',
        aiAdvice: 'Clean water pipeline rupture. High flooding risk. Pedestrians should avoid path near central sector.'
      },
      { 
        id: '881f2026-8310-4d32-896b-9c6cc0ff2d34', 
        category: 'Pothole', 
        lat: 28.6150, 
        lng: 77.2110, 
        severity: 7.2, 
        status: 'In Progress', 
        precedence: 18, 
        distance: '1.2km',
        imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
        aiAdvice: 'Deep road crater. Heavy risk of structural vehicle damage. Limit speed under 10km/h.'
      },
      { 
        id: '872c2026-8310-4d32-896b-9c6cc0ff2d34', 
        category: 'Waste Overflow', 
        lat: 28.6100, 
        lng: 77.2050, 
        severity: 4.5, 
        status: 'Resolved', 
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
  const handleReportIssue = async (
    isGuest = false,
    overrides?: {
      category?: string;
      lat?: string;
      lng?: string;
      description?: string;
      imageUrl?: string;
    }
  ) => {
    setIsAnalyzing(true);

    const activeCategory = overrides?.category || newIssueCategory;
    const activeDescription = overrides?.description || newIssueDescription;

    let lat = parseFloat(overrides?.lat || newIssueLat);
    let lng = parseFloat(overrides?.lng || newIssueLng);
    const isDefaultCoords = (isNaN(lat) || isNaN(lng) || (lat === 28.6139 && lng === 77.2090));

    // Only capture geolocation via navigator if coordinates are default and we need a fallback
    if (isDefaultCoords && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setNewIssueLat(lat.toString());
        setNewIssueLng(lng.toString());
      } catch (err) {
        console.warn("Navigator geolocation failed, using default/simulated coordinates:", err);
      }
    }

    if (isNaN(lat)) lat = 28.6139;
    if (isNaN(lng)) lng = 77.2090;

    const description = activeDescription.trim() || `Accumulated issue of type ${activeCategory} causing local municipal inconvenience. Please resolve at the earliest.`;
    
    // MOCK AI SPATIAL DEDUPLICATION: Check if an issue exists within a tiny radius
    const duplicateIndex = issues.findIndex(issue => 
      Math.abs(issue.lat - lat) < 0.005 && Math.abs(issue.lng - lng) < 0.005 && issue.category === activeCategory
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
      setUploadedFile(null);
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
        body: JSON.stringify({ category: activeCategory, description })
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
    let finalImg = overrides?.imageUrl || uploadedImage;
    if (!finalImg) {
      if (activeCategory.toLowerCase().includes('water')) {
        finalImg = 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600';
      } else if (activeCategory.toLowerCase().includes('waste')) {
        finalImg = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600';
      } else if (activeCategory.toLowerCase().includes('light')) {
        finalImg = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=600';
      } else {
        finalImg = 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600';
      }
    }

    let beforeImageUrl = '';

    const isSupabaseConfigured = 
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

    let uploadPath = '';

    // Step 1: Upload the image to the storage bucket first
    if (isSupabaseConfigured && uploadedFile) {
      try {
        const fileExt = uploadedFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 100000)}.${fileExt}`;
        
        // Upload strictly to 'issue-images' public bucket as configured
        let uploadData = null;
        let chosenBucket = 'issue-images';

        const { data: upData1, error: err1 } = await supabase.storage
          .from('issue-images')
          .upload(fileName, uploadedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (upData1) {
          uploadData = upData1;
          uploadPath = upData1.path;
        } else {
          console.error("Storage upload to 'issue-images' failed:", err1?.message);
          showNotification("Storage Upload Failed: Please ensure you have created a public bucket named 'issue-images' in Supabase.", "warning");
        }

        if (uploadData) {
          // Take the path of the uploaded file and call .getPublicUrl(...)
          const { data: urlData } = supabase.storage
            .from(chosenBucket)
            .getPublicUrl(uploadData.path);
          
          if (urlData && urlData.publicUrl) {
            beforeImageUrl = urlData.publicUrl;
            finalImg = urlData.publicUrl;
          }
        }
      } catch (err) {
        console.error("Exception during storage upload:", err);
      }
    }

    // Step 2: Call the AI audit endpoint and wait for the JSON response
    showNotification('Performing Gemini Multimodal Visual Audit...', 'info');
    let isAuditValid = true;
    let auditReason = '';

    try {
      const auditRes = await fetch('/api/audit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: finalImg, description: description })
      });

      if (!auditRes.ok) {
        throw new Error('Visual audit API endpoint returned an error.');
      }

      const auditData = await auditRes.json();
      console.log("[Visual Audit Result]", auditData);

      isAuditValid = auditData.isValid;
      auditReason = auditData.reason || 'Image is unrelated or invalid.';

      if (isAuditValid) {
        // Overwrite severity/priority and advice if valid
        if (auditData.riskScore) {
          parsedSeverity = auditData.riskScore;
        }
        if (auditData.repairInstructions) {
          advice = `[Visual Audit Action Plan] ${auditData.repairInstructions}. ${advice}`;
        }
        showNotification('Gemini Visual Audit verified successfully!', 'success');
      }
    } catch (auditErr: any) {
      console.warn("Visual Audit connection failed, using local/fallback validation:", auditErr);
      isAuditValid = true; // Fallback in case of server offline to keep sandbox usable
    }

    // Step 3: Check the isValid property from the audit response (The Gate)
    if (!isAuditValid) {
      // If false: Stop execution immediately, show an alert with the reason, and delete the uploaded image from the bucket
      alert(`AI Visual Audit Rejected:\n\nReason: ${auditReason || 'The uploaded image was flagged as SPAM, selfie, or unrelated to civic infrastructure.'}`);
      showNotification(`Visual Audit Flagged Spam: ${auditReason || 'Image is unrelated or invalid.'}`, 'warning');

      if (isSupabaseConfigured && uploadPath) {
        try {
          await supabase.storage.from('issue-images').remove([uploadPath]);
          console.log("Successfully cleaned up invalid uploaded image from storage:", uploadPath);
        } catch (delErr) {
          console.warn("Failed to delete invalid uploaded image:", delErr);
        }
      }

      setIsAnalyzing(false);
      return null; // Stop execution immediately and return null
    }

    // Proceed to insert the issue into the issues table only if audit is valid
    const newId = generateUUID();
    // Register ID as personal in local registry
    try {
      const currentReported = JSON.parse(localStorage.getItem('my_reported_issue_ids') || '[]');
      currentReported.push(newId);
      localStorage.setItem('my_reported_issue_ids', JSON.stringify(currentReported));
    } catch (e) {
      console.warn("Could not save new ID to reported list:", e);
    }

    // Create new ticket
    const newIssue: InfrastructureIssue = {
      id: newId,
      category: activeCategory,
      lat: lat,
      lng: lng,
      severity: parseFloat(parsedSeverity.toFixed(1)),
      status: 'Pending',
      precedence: 1,
      distance: 'Nearby',
      imageUrl: finalImg,
      beforeImageUrl: beforeImageUrl || finalImg,
      aiAdvice: advice,
      reporterId: currentUser?.id || null
    };

    if (isSupabaseConfigured) {
      try {
        const parseDistanceToNumber = (distanceStr: string | number | undefined): number => {
          if (distanceStr === undefined || distanceStr === null) return 100;
          if (typeof distanceStr === 'number') return distanceStr;
          
          const cleanStr = distanceStr.toString().toLowerCase().trim();
          if (cleanStr === 'nearby') return 50;
          
          const matches = cleanStr.match(/^([\d.]+)\s*(m|km)?$/);
          if (matches) {
            const val = parseFloat(matches[1]);
            const unit = matches[2];
            if (unit === 'km') {
              return val * 1000;
            }
            return val;
          }
          
          const parsed = parseFloat(cleanStr);
          return isNaN(parsed) ? 100 : parsed;
        };

        // Nested inside the if (isAuditValid) path of the function
        const { error: dbError } = await supabase
          .from('issues')
          .insert({
            id: newIssue.id,
            title: `${newIssue.category} Reported`,
            description: description,
            status: 'Pending', // matches database status
            location: `SRID=4326;POINT(${lng} ${lat})`,
            before_image_url: beforeImageUrl || finalImg,
            after_image_url: null,
            reporter_id: currentUser?.id || null,
            worker_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ai_advice: newIssue.aiAdvice,
            category: newIssue.category,
            custom_category_note: activeCategory === 'Other' ? customCategoryNote : null,
            severity: newIssue.severity,
            distance: parseDistanceToNumber(newIssue.distance),
            image_url: finalImg
          });

        if (dbError) {
          console.warn("Client-side direct issue sync notice:", dbError.message);
        } else {
          console.log("Issue successfully saved to Supabase issues table!");
        }
      } catch (dbErr: any) {
        console.warn("Error running direct client-side issue sync:", dbErr);
      }
    }

    setIssues([newIssue, ...issues]);
    showNotification(`New infrastructure dispatch initiated. Severity: ${newIssue.severity}/10.`);
    
    // Reset Form
    setIsAnalyzing(false);
    setNewIssueDescription('');
    setCustomCategoryNote('');
    setUploadedImage('');
    setUploadedFile(null);

    if (!isGuest) {
      setUserPoints(prev => prev + 10);
    }

    // Navigate to landing automatically
    handleTabChange('landing');
    return newIssue;
  };

  const handleAcceptTask = (id: string) => {
    setIssues(issues.map(issue => 
      issue.id === id ? { ...issue, status: 'In Progress' } : issue
    ));
    showNotification(`Active Task ${id} Accepted. Status updated to In Progress.`);
  };

  const handleVerifyFix = (id: string) => {
    const notes = resolutionNotes[id] || 'Verified structural cold-mix patching completed. Disinfected block.';
    const img = resolutionImages[id] || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600';

    // Simulate Gemini QA inspection logic
    const lowerNotes = notes.toLowerCase();
    const isRejected = lowerNotes.includes('fail') || 
                       lowerNotes.includes('incomplete') || 
                       lowerNotes.includes('bad') || 
                       lowerNotes.includes('temporary') || 
                       lowerNotes.includes('partially');

    if (isRejected) {
      setIssues(issues.map(issue => 
        issue.id === id ? { 
          ...issue, 
          status: 'In Progress',
          resolvedImageUrl: img,
          workerNotes: notes,
          resolution_feedback: "AI QA Inspector: The submitted repair image show incomplete filling of cracks and residual debris on site. The site has not been fully cleared of hazards."
        } : issue
      ));
      showNotification(`AI Verification Rejected: Issue remains In Progress with review notes.`, 'warning');
    } else {
      setIssues(issues.map(issue => 
        issue.id === id ? { 
          ...issue, 
          status: 'Resolved',
          resolvedImageUrl: img,
          workerNotes: notes,
          resolution_feedback: undefined
        } : issue
      ));
      // Reward validation bonus to reporter points
      setUserPoints(prev => prev + 10);
      showNotification(`AI Verification Complete. Task ${id} marked as Resolved.`);
    }
    
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
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all group-hover:scale-105 group-hover:border-orange-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-7 h-7">
                <path d="M50 15 C38 15 30 23 30 35 C30 47 50 72 50 72 C50 72 70 47 70 35 C70 23 62 15 50 15 Z" fill="#f97316" />
                <circle cx="50" cy="35" r="12" fill="#090d16" />
                <rect x="46" y="35" width="8" height="22" rx="2" fill="#090d16" />
                <circle cx="50" cy="35" r="5" fill="#f97316" />
              </svg>
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
            customCategoryNote={customCategoryNote}
            setCustomCategoryNote={setCustomCategoryNote}
            uploadedImage={uploadedImage}
            setUploadedImage={setUploadedImage}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            handleTabChange={handleTabChange}
            citizenLoggedIn={citizenLoggedIn}
            resolverLoggedIn={resolverLoggedIn}
            showNotification={showNotification}
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

         {activeTab === 'update-password' && (
          <UpdatePassword 
            showNotification={showNotification}
            onRedirectToLogin={() => handleTabChange('login')}
            onSuccessLogin={(user) => {
              setCurrentUser(user);
              safeSetItem('fix_n_go_current_user', JSON.stringify(user));
            }}
          />
         )}

         {activeTab === 'citizen' && (
           currentUser && currentUser.role === 'citizen' ? (
             <CitizenHub currentUser={currentUser} allProfiles={mockUserDatabase} 
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
               customCategoryNote={customCategoryNote}
               setCustomCategoryNote={setCustomCategoryNote}
               uploadedImage={uploadedImage}
               setUploadedImage={setUploadedImage}
               uploadedFile={uploadedFile}
               setUploadedFile={setUploadedFile}
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
               bypassAuth={true} setMockUserDatabase={setMockUserDatabase}
               mockUserDatabase={mockUserDatabase}
               currentUser={currentUser}
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
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500 space-y-2">
        <p>© {new Date().getFullYear()} FixNGo. Action-Driven Civic Infrastructure Dispatch. All rights reserved.</p>
      </footer>

      {/* Guided Simulator floating widget */}
      <GuidedSimulator
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        issues={issues}
        setIssues={setIssues}
        userPoints={userPoints}
        setUserPoints={setUserPoints}
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        showNotification={showNotification}
        mockUserDatabase={mockUserDatabase}
        handleReportIssue={handleReportIssue}
      />

    </div>
  );
}
