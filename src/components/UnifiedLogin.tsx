import React, { useState } from 'react';
import { User, Wrench, ArrowRight, ShieldAlert, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { UserAccount } from '../types';

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

  const handleGoogleLogin = async () => {
    // TODO: Inject Supabase OAuth signInWithOAuth() method here during database connection phase.
    showNotification('Google OAuth authentication selected.', 'info');
  };

  const handleGithubLogin = async () => {
    // TODO: Inject Supabase OAuth signInWithOAuth() method here during database connection phase.
    showNotification('GitHub OAuth authentication selected.', 'info');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      showNotification('Please fill in all login fields.', 'warning');
      return;
    }

    // SUPABASE INTEGRATION BLOCK (FUTURE PHASE):
    // In the future, this mock database lookup will be replaced with:
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email: loginEmail,
    //   password: loginPassword,
    // });
    // if (error) throw error;
    // const user = data.user;

    const matchedUser = mockUserDatabase.find(
      u => u.email.toLowerCase() === loginEmail.toLowerCase().trim() && u.password === loginPassword
    );

    if (matchedUser) {
      setCurrentUser(matchedUser);
      showNotification(`Welcome back, ${matchedUser.fullName}! Session initialized.`, 'success');
      
      // Role-Based Navigation & Dashboard Splitting
      if (matchedUser.role === 'admin') {
        handleTabChange('admin');
      } else if (matchedUser.role === 'resolver') {
        handleTabChange('resolver');
      } else {
        handleTabChange('citizen');
      }
    } else {
      setError('Access Denied: Invalid email or password.');
      showNotification('Authentication failed.', 'warning');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
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

    // Check if user already exists
    const userExists = mockUserDatabase.some(
      u => u.email.toLowerCase() === signUpEmail.toLowerCase().trim()
    );

    if (userExists) {
      setError('An account with this email already exists.');
      showNotification('Registration failed.', 'warning');
      return;
    }

    // SUPABASE INTEGRATION BLOCK (FUTURE PHASE):
    // In the future, this user registration will be replaced with:
    // const { data, error } = await supabase.auth.signUp({
    //   email: signUpEmail,
    //   password: signUpPassword,
    //   options: {
    //     data: {
    //       full_name: signUpName,
    //       role: signUpRole,
    //     }
    //   }
    // });
    // if (error) throw error;

    const newUser: UserAccount = {
      id: `user-${Math.floor(Math.random() * 900000) + 100000}`,
      fullName: signUpName,
      email: signUpEmail.trim(),
      password: signUpPassword,
      role: signUpRole,
      createdAt: new Date().toISOString()
    };

    setMockUserDatabase(prev => [...prev, newUser]);
    
    // Auto-login after sign-up
    setCurrentUser(newUser);
    showNotification(`Account created successfully! Welcome, ${newUser.fullName}.`, 'success');

    // Route dynamically based on registered role
    if (newUser.role === 'resolver') {
      handleTabChange('resolver');
    } else {
      handleTabChange('citizen');
    }

    // Reset fields
    setSignUpName('');
    setSignUpEmail('');
    setSignUpPassword('');
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

          <button
            type="button"
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-950 hover:bg-slate-850 text-slate-200 text-xs font-bold rounded-xl border border-slate-850 hover:border-slate-800 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>Continue with GitHub</span>
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
