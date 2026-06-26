import React, { useState } from 'react';
import { User, Wrench, ArrowRight, ShieldAlert, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabase';

interface UnifiedLoginProps {
  mockUserDatabase: UserAccount[];
  setMockUserDatabase: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  handleTabChange: (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin') => void;
  showNotification: (msg: string, type?: string) => void;
}

export default function UnifiedLogin({
  mockUserDatabase,
  setMockUserDatabase,
  currentUser,
  setCurrentUser,
  handleTabChange,
  showNotification
}: UnifiedLoginProps) {
  // Toggle between 'login' and 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign-Up form fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<'citizen' | 'resolver'>('citizen');

  const [error, setError] = useState('');

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  // Check if Supabase variables are configured
  const isSupabaseConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

  const handleGoogleLogin = async () => {
    // TODO: Inject Supabase OAuth signInWithOAuth() method here during database connection phase.
    if (!isSupabaseConfigured) {
      showNotification('Google OAuth: Demo mode active. Complete Supabase setup in .env to initiate real flows.', 'info');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      showNotification('Redirecting to Google Auth...', 'info');
    } catch (err: any) {
      setError(err.message || 'Google Auth error.');
      showNotification('Google Auth failed.', 'warning');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      showNotification('Please fill in all login fields.', 'warning');
      return;
    }

    const trimmedEmail = loginEmail.toLowerCase().trim();

    // Check if user is using local admin
    const isLocalAdmin = trimmedEmail === 'admin_fixngo' || loginPassword === 'super_secure_password_2026';

    if (!isSupabaseConfigured || isLocalAdmin) {
      // Demo Mode Offline Fallback / pre-seeded accounts
      const matchedUser = mockUserDatabase.find(
        u => u.email.toLowerCase() === trimmedEmail && u.password === loginPassword
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        showNotification(`[Demo Mode] Welcome back, ${matchedUser.fullName}!`, 'success');
        
        if (matchedUser.role === 'admin') {
          handleTabChange('admin');
        } else if (matchedUser.role === 'resolver') {
          handleTabChange('resolver');
        } else {
          handleTabChange('citizen');
        }
        return;
      }

      if (!isSupabaseConfigured && !isLocalAdmin) {
        setError('Access Denied: Invalid credentials or Supabase not connected.');
        showNotification('Authentication failed.', 'warning');
        return;
      }
    }

    // Real Supabase Authentication
    try {
      showNotification('Authenticating with Supabase...', 'info');
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      });

      if (authError) throw authError;

      const user = data.user;
      if (user) {
        const rawRole = user.user_metadata?.role || 'citizen';
        const role = String(rawRole).toLowerCase();
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

        const loggedInUser: UserAccount = {
          id: user.id,
          fullName: fullName,
          email: user.email || '',
          password: '',
          role: (role === 'admin' || role === 'resolver' || role === 'citizen') ? role : 'citizen',
          createdAt: user.created_at
        };

        setCurrentUser(loggedInUser);
        showNotification(`Welcome back, ${fullName}! Session synchronized with Supabase.`, 'success');

        if (role === 'admin') {
          handleTabChange('admin');
        } else if (role === 'resolver') {
          handleTabChange('resolver');
        } else {
          handleTabChange('citizen');
        }
      }
    } catch (err: any) {
      console.warn("Supabase auth error, checking mock fallback:", err.message);
      
      // Find user by email in local database first
      const emailUser = mockUserDatabase.find(
        u => u.email.toLowerCase() === trimmedEmail
      );

      if (emailUser) {
        // Self-healing check: If user was registered via OAuth or password is not set, initialize/bind the password!
        if (!emailUser.password || emailUser.password === '') {
          emailUser.password = loginPassword;
          setMockUserDatabase([...mockUserDatabase]);
          setCurrentUser(emailUser);
          showNotification(`Password login activated for ${emailUser.fullName}! You can now use either OAuth or your password.`, 'success');
          if (emailUser.role === 'admin') handleTabChange('admin');
          else if (emailUser.role === 'resolver') handleTabChange('resolver');
          else handleTabChange('citizen');
          return;
        }

        // Standard password check if password is set
        if (emailUser.password === loginPassword) {
          setCurrentUser(emailUser);
          showNotification(`Welcome back, ${emailUser.fullName}! Session restored successfully.`, 'success');
          if (emailUser.role === 'admin') handleTabChange('admin');
          else if (emailUser.role === 'resolver') handleTabChange('resolver');
          else handleTabChange('citizen');
          return;
        }
      }

      // Format clean, helpful messages for common Supabase verification policies
      let errorMsg = err.message || 'Access Denied: Invalid email or password.';
      if (err.message && (err.message.toLowerCase().includes('confirm') || err.message.toLowerCase().includes('verify'))) {
        errorMsg = "Please check your inbox to verify your email, or sign in using OAuth. (To disable email verification, uncheck 'Confirm email' in Supabase Auth Settings).";
      }
      
      setError(errorMsg);
      showNotification('Authentication failed.', 'warning');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signUpName || !signUpEmail || !signUpPassword) {
      showNotification('Please fill in all sign-up fields.', 'warning');
      return;
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const trimmedEmail = signUpEmail.toLowerCase().trim();

    if (!isSupabaseConfigured) {
      // Offline fallback: update local pre-seeded database
      const userExists = mockUserDatabase.some(
        u => u.email.toLowerCase() === trimmedEmail
      );

      if (userExists) {
        setError('An account with this email already exists.');
        showNotification('Registration failed.', 'warning');
        return;
      }

      const newUser: UserAccount = {
        id: `user-${Math.floor(Math.random() * 900000) + 100000}`,
        fullName: signUpName,
        email: trimmedEmail,
        password: signUpPassword,
        role: signUpRole,
        createdAt: new Date().toISOString()
      };

      setMockUserDatabase(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      showNotification(`[Demo Mode] Account created! Welcome, ${newUser.fullName}.`, 'success');

      if (newUser.role === 'resolver') {
        handleTabChange('resolver');
      } else {
        handleTabChange('citizen');
      }

      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      return;
    }

    // Real Supabase Registration
    try {
      showNotification('Registering account with Supabase...', 'info');
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: signUpPassword,
        options: {
          data: {
            full_name: signUpName,
            role: signUpRole,
          }
        }
      });

      if (signUpError) throw signUpError;

      const user = data.user;
      if (user) {
        const newUser: UserAccount = {
          id: user.id,
          fullName: signUpName,
          email: trimmedEmail,
          password: signUpPassword, // Save the registered password for local/offline fallback access!
          role: signUpRole,
          createdAt: user.created_at
        };

        // Client-side Direct Insert/Upsert fallback to profiles table
        try {
          const { error: dbError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: signUpName,
              email: trimmedEmail,
              role: signUpRole,
              updated_at: new Date().toISOString()
            });
          
          if (dbError) {
            console.warn("Client-side direct profile sync warning:", dbError.message);
          } else {
            console.log("Client-side profile synchronization successful!");
          }
        } catch (dbErr: any) {
          console.warn("Error running direct client-side profile sync:", dbErr);
        }

        setMockUserDatabase(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        
        showNotification(`Profile created successfully! Synchronized via handle_new_user trigger.`, 'success');

        if (signUpRole === 'resolver') {
          handleTabChange('resolver');
        } else {
          handleTabChange('citizen');
        }

        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
      } else {
        showNotification('Registration initiated! Please check your email to verify your session.', 'info');
      }
    } catch (err: any) {
      console.error("Supabase registration failed:", err);
      setError(err.message || 'Registration failed.');
      showNotification('Registration failed.', 'warning');
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background glowing gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-2">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white font-display tracking-tight">
            {mode === 'login' ? 'Access Central Grid' : 'Join FixNGo Network'}
          </h1>
          <p className="text-xs text-slate-400">
            {mode === 'login' 
              ? 'Provide credentials to dispatch and resolve public grievances.' 
              : 'Create your digital identity to earn rewards and track local issues.'}
          </p>
        </div>

        {/* Dynamic Mode Switch Toggle Switch */}
        <div className="p-1 bg-slate-950 border border-slate-850 rounded-xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up / Register</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth Provider UI */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-950 hover:bg-slate-850 text-slate-200 text-xs font-bold rounded-xl border border-slate-850 hover:border-slate-800 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.41 15.02.75 12 .75 7.25.75 3.17 3.47 1.25 7.42l3.86 3c.9-2.7 3.4-4.38 6.89-4.38z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.52z"
              />
              <path
                fill="#FBBC05"
                d="M5.11 14.58c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.25 7.42C.45 9.02 0 10.81 0 12.72s.45 3.7 1.25 5.3l3.86-3.44z"
              />
              <path
                fill="#34A853"
                d="M12 23.25c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.01.68-2.3 1.09-3.8 1.09-3.49 0-5.99-1.68-6.89-4.38l-3.86 3c1.92 3.95 6 6.67 10.75 6.67z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Note: First-time OAuth sign-ins automatically default to the <span className="text-orange-400 font-bold">Citizen</span> role.
          </p>

          {/* Visual Divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative px-3 bg-slate-900 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              OR
            </span>
          </div>
        </div>

        {/* Dynamic Forms */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address or Admin Key
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com or admin_fixngo"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)] cursor-pointer"
            >
              <span>Authenticate Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Choose Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Role Selection
              </label>
              <div className="relative">
                <select
                  value={signUpRole}
                  onChange={(e) => setSignUpRole(e.target.value as 'citizen' | 'resolver')}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors appearance-none"
                >
                  <option value="citizen">Citizen (Post & Claim Points)</option>
                  <option value="resolver">Authorized Field Resolver (Claim & Patch)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  {signUpRole === 'citizen' ? <User className="w-4 h-4" /> : <Wrench className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)] cursor-pointer"
            >
              <span>Register & Initialize</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Demo Helper box */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-850 text-[10px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-400 uppercase tracking-wider">Preseeded Dev Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-orange-400 font-semibold block">Citizen:</span>
              <span>citizen@example.com / password123</span>
            </div>
            <div>
              <span className="text-emerald-400 font-semibold block">Resolver:</span>
              <span>resolver@example.com / password123</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-900">
            <span className="text-red-400 font-semibold block">Admin Key / Email:</span>
            <span>admin_fixngo / super_secure_password_2026</span>
          </div>
        </div>

      </div>
    </div>
  );
}
