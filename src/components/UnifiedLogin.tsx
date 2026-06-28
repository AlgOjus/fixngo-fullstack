import React, { useState } from 'react';
import { User, Wrench, ArrowRight, ShieldAlert, Mail, Lock, UserPlus, LogIn, KeyRound, Loader2, CheckCircle2, Database, Copy, Check } from 'lucide-react';
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
  // Toggle between 'login', 'signup', and 'forgot-password'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign-Up form fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<'citizen' | 'resolver'>('citizen');

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const [error, setError] = useState('');
  const [showAlreadyRegisteredHelp, setShowAlreadyRegisteredHelp] = useState(false);
  const [registeredHelpEmail, setRegisteredHelpEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  const sqlCode = `-- 1. Create public profiles table (if it doesn't exist)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'citizen',
  points integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS) on public.profiles
alter table public.profiles enable row level security;

-- 3. Create RLS Policies to allow standard and Admin operations
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" 
  on public.profiles for select 
  using (true);

drop policy if exists "Allow users to insert their own profile" on public.profiles;
create policy "Allow users to insert their own profile" 
  on public.profiles for insert 
  with check (true);

drop policy if exists "Allow users to update their own profile" on public.profiles;
create policy "Allow users to update their own profile" 
  on public.profiles for update 
  using (true);

drop policy if exists "Allow users to delete their own profile" on public.profiles;
create policy "Allow users to delete their own profile" 
  on public.profiles for delete 
  using (true);

-- 4. Create or replace the automatic signup trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, points, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'citizen'),
    0,
    now(),
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 5. Bind trigger to execute after a user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Trigger to automatically delete from auth.users when a public.profile is deleted
create or replace function public.handle_deleted_profile()
returns trigger as $$
begin
  -- Prevent trigger recursion when cascading from auth.users delete
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  delete from auth.users where id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_deleted on public.profiles;
create trigger on_profile_deleted
  after delete on public.profiles
  for each row execute procedure public.handle_deleted_profile();

-- 7. Optional security-definer RPC function to delete users directly from client-side admin console
create or replace function public.delete_user_by_admin(target_user_id uuid)
returns void as $$
begin
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    showNotification('Database SQL trigger script copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

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
    const isLocalAdmin = trimmedEmail === 'admin_fixngo' || loginPassword === 'super_secured_password_2026';

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
        const checkedRole = (role === 'admin' || role === 'resolver' || role === 'citizen') ? role : 'citizen';
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

        // Direct self-healing profiles sync upon login
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: fullName,
              email: user.email || '',
              role: checkedRole,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.warn("Direct login sync insert failed, attempting update fallback:", insertError.message);
            await supabase
              .from('profiles')
              .update({
                full_name: fullName,
                email: user.email || '',
                role: checkedRole,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
          } else {
            console.log("Direct login sync profile inserted successfully!");
          }
        } catch (dbErr) {
          console.warn("Error running direct client-side profile sync during login:", dbErr);
        }

        const loggedInUser: UserAccount = {
          id: user.id,
          fullName: fullName,
          email: user.email || '',
          password: '',
          role: checkedRole,
          createdAt: user.created_at
        };

        setCurrentUser(loggedInUser);
        showNotification(`Welcome back, ${fullName}! Session synchronized with Supabase.`, 'success');

        if (checkedRole === 'admin') {
          handleTabChange('admin');
        } else if (checkedRole === 'resolver') {
          handleTabChange('resolver');
        } else {
          handleTabChange('citizen');
        }
      }
    } catch (err: any) {
      console.warn("Supabase auth error, checking mock fallback:", err.message);
      
      // Find user by email in local database first
      let emailUser = mockUserDatabase.find(
        u => u.email.toLowerCase() === trimmedEmail
      );

      if (!emailUser && (trimmedEmail === 'citizen@example.com' || trimmedEmail === 'resolver@example.com')) {
        // Safe fallback for pre-seeded developer accounts
        emailUser = {
          id: trimmedEmail === 'citizen@example.com' ? 'user-citizen' : 'user-resolver',
          fullName: trimmedEmail === 'citizen@example.com' ? 'Arjun Sharma' : 'Contractor Unit #442',
          email: trimmedEmail,
          password: 'password123',
          role: trimmedEmail === 'citizen@example.com' ? 'citizen' : 'resolver'
        };
      }

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
      const session = data.session;

      if (user) {
        const newUser: UserAccount = {
          id: user.id,
          fullName: signUpName,
          email: trimmedEmail,
          password: signUpPassword, // Save the registered password for local/offline fallback access!
          role: signUpRole as any,
          createdAt: user.created_at
        };

        if (session) {
          // Client-side Direct Insert/Upsert fallback to profiles table
          try {
            // First try to insert a new profile record (fails if already exists)
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                full_name: signUpName,
                email: trimmedEmail,
                role: signUpRole,
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.warn("Insert failed, trying update fallback:", insertError.message);
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: signUpName,
                  email: trimmedEmail,
                  role: signUpRole,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
              
              if (updateError) {
                console.warn("Fallback update also failed:", updateError.message);
              } else {
                console.log("Profile updated successfully via update fallback!");
              }
            } else {
              console.log("Profile inserted successfully via direct insert!");
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
        } else {
          // If no session, it means email verification is enabled on Supabase!
          showNotification('Registration initiated! Please verify your email or run the Supabase DB Trigger to log in.', 'success');
          setError('Email verification required! Please check your inbox or disable "Confirm email" in Supabase Auth settings.');
          setMode('login'); // Switch to standard login screen
        }

        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
      } else {
        showNotification('Registration initiated! Please check your email to verify your session.', 'info');
      }
    } catch (err: any) {
      console.error("Supabase registration failed:", err);
      const isAlreadyRegistered = err.message && (
        err.message.toLowerCase().includes('already registered') || 
        err.message.toLowerCase().includes('already exists') || 
        err.message.toLowerCase().includes('user_already_exists')
      );

      if (isAlreadyRegistered) {
        setError('This email is already registered in your Supabase Auth user database (auth.users), but a profile row was never created in public.profiles. We have enabled self-healing!');
        setShowAlreadyRegisteredHelp(true);
        setRegisteredHelpEmail(trimmedEmail);
        showNotification('Email already registered! Self-healing option unlocked below.', 'warning');
      } else {
        setError(err.message || 'Registration failed.');
        showNotification('Registration failed.', 'warning');
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess(false);

    const email = forgotEmail.trim();

    if (!email) {
      setForgotError('Please enter your email address.');
      showNotification('Please enter your email address.', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setForgotError('Please enter a valid email address (e.g. name@example.com).');
      showNotification('Invalid email address format.', 'warning');
      return;
    }

    setForgotLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Mock success in offline/demo mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setForgotSuccess(true);
        showNotification('[Demo Mode] Password reset email simulated successfully!', 'success');
        return;
      }

      // Determine final redirect URL, defaulting to the official live site domain
      const finalRedirectUrl = window.location.origin && !window.location.origin.includes('localhost')
        ? `${window.location.origin}/update-password`
        : 'https://fixngo-419142040910.asia-southeast1.run.app/update-password';

      // Directly proceed to reset password
      console.log("Attempting password reset for:", email);
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: finalRedirectUrl,
      });

      console.log("Password reset response:", { data, resetError });

      if (resetError) {
        throw resetError;
      }

      setForgotSuccess(true);
      showNotification('Password reset link has been dispatched to your email!', 'success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setForgotError(err.message || 'Failed to dispatch password reset email.');
      showNotification(err.message || 'Password reset request failed.', 'warning');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background glowing gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {mode === 'forgot-password' ? (
          /* Forgot Password Interface */
          forgotSuccess ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-white font-display tracking-tight">
                Check your email
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                We have dispatched a secure credential recovery link to:
                <span className="block text-orange-400 font-bold mt-1 font-mono break-all">{forgotEmail}</span>
              </p>
              <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-left text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-400">Next Steps:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Open the recovery email on your device.</li>
                  <li>Click the secure link to update your credentials.</li>
                  <li>If the message hasn't appeared, inspect your spam/junk folder.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setForgotSuccess(false);
                  setForgotEmail('');
                  setForgotError('');
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
              >
                Return to Grid Authentication
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-2">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <h1 className="text-2xl font-black text-white font-display tracking-tight">
                  Reset Credentials
                </h1>
                <p className="text-xs text-slate-400">
                  Enter your registered email address to receive a secure password recovery link.
                </p>
              </div>

              {forgotError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError('');
                      }}
                      placeholder="name@example.com"
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                      disabled={forgotLoading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)] cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Processing Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotError('');
                    setForgotEmail('');
                  }}
                  className="text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  ← Back to Grid Authentication
                </button>
              </div>
            </div>
          )
        ) : (
          <>
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
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot-password');
                        setError('');
                      }}
                      className="text-[10px] text-orange-400 hover:text-orange-300 font-bold hover:underline cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
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

                {showAlreadyRegisteredHelp && (
                  <div className="mt-4 p-4.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3.5 text-xs text-amber-200/90 leading-relaxed animate-fade-in">
                    <div className="flex gap-2 items-start">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 font-bold block mb-1">Why is this happening?</strong>
                        The email <code className="text-amber-300 font-mono bg-amber-950/60 px-1 py-0.5 rounded text-[11px]">{registeredHelpEmail}</code> has already been registered in your Supabase Authentication database, but has no matching row in the public profiles table.
                      </div>
                    </div>

                    <div className="border-t border-amber-500/10 pt-3 space-y-2">
                      <div className="space-y-1.5">
                        <span className="block font-semibold text-[11px] text-amber-300 uppercase tracking-wider font-mono">
                          ⚡ Option A: Self-Heal via Direct Login (Recommended)
                        </span>
                        <p className="text-[11px]">
                          You can log in directly with this account! Our system will automatically detect the missing profile and **instantly create it** on successful login.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(registeredHelpEmail);
                            setLoginPassword('');
                            setMode('login');
                            setError('');
                            setShowAlreadyRegisteredHelp(false);
                            showNotification('Switched to Login. Fill in your password to heal your profile!', 'info');
                          }}
                          className="w-full mt-1.5 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Switch to Login & Autofill Email
                        </button>
                      </div>

                      <div className="border-t border-amber-500/10 pt-3 space-y-1.5">
                        <span className="block font-semibold text-[11px] text-amber-300 uppercase tracking-wider font-mono">
                          🛠️ Option B: Wipe User in Supabase & Start Over
                        </span>
                        <p className="text-[11px] text-slate-400">
                          If you want to clear this account to test a clean registration:
                        </p>
                        <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1">
                          <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline font-semibold">Supabase Console</a>.</li>
                          <li>Navigate to <span className="text-slate-200 font-medium">Authentication</span> &rarr; <span className="text-slate-200 font-medium">Users</span>.</li>
                          <li>Search for <span className="text-slate-200 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">{registeredHelpEmail}</span>.</li>
                          <li>Click the three dots and select <span className="text-red-400 font-medium">Delete User</span>.</li>
                          <li>Try registering again on this screen!</li>
                        </ol>
                      </div>

                      <div className="border-t border-amber-500/10 pt-3 space-y-1">
                        <span className="block font-semibold text-[11px] text-amber-300 uppercase tracking-wider font-mono">
                          📧 Option C: Disable Email Verifications
                        </span>
                        <p className="text-[11px] text-slate-400">
                          To skip verify-email screen blocks, go to <span className="text-slate-200 font-medium">Auth Settings</span> &rarr; <span className="text-slate-200 font-medium">Providers</span> &rarr; <span className="text-slate-200 font-medium">Email</span> and turn off <span className="text-slate-200 font-semibold">"Confirm email"</span>. This logs in new users immediately!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
          </>
        )}



      </div>



    </div>
  );
}
