'use client';

import React, { useState } from 'react';
import { User, Wrench, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState<'citizen' | 'worker'>('citizen');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white font-display">Access FixNGo Portals</h1>
          <p className="text-xs text-slate-400">Select your authorization channel to connect to the smart city grid</p>
        </div>

        {/* Custom split-card toggler */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRole('citizen')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              role === 'citizen'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
            }`}
          >
            <User className="w-6 h-6 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Citizen Portal</h3>
            <p className="text-[11px] leading-snug">Verify, track rewards, and coordinate with active dispatches.</p>
          </button>

          <button
            onClick={() => setRole('worker')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              role === 'worker'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
            }`}
          >
            <Wrench className="w-6 h-6 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Contractor Dispatch</h3>
            <p className="text-[11px] leading-snug">Claim localized dispatches, upload fixes, and log work hours.</p>
          </button>
        </div>

        <form className="space-y-4 pt-4 border-t border-slate-900">
          {role === 'citizen' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                type="button"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
              >
                <span>Authenticate with OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Resolver Contractor ID</label>
                <input
                  type="text"
                  placeholder="e.g. FG-MUNICIPAL-442"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Operational Dispatch PIN</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <button
                type="button"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                <span>Verify Dispatch ID</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
