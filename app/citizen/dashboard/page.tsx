'use client';

import React from 'react';
import { User, ClipboardList, Send, Award, Star } from 'lucide-react';

export default function CitizenDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <div>
            <h1 className="text-xl font-bold text-white font-display">Citizen Operations Hub</h1>
            <p className="text-xs text-slate-400">Manage your active municipal dispatches and track civic impact rewards.</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>Sadak Sipahi • 130 PTS</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              <span>Your Reported Infrastructure Defects</span>
            </h3>
            
            <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-850">
              <p className="text-xs text-slate-500 font-mono">No active personal tickets. All reported bugs resolved! 🎉</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rewards Leaderboard</h3>
              <p className="text-[11px] text-slate-400 mb-4">Your current score places you in top 15% of Greater Mohalla area contributors.</p>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-950/40 rounded border border-slate-850">
                  <span className="text-slate-300">1. Arjun S.</span>
                  <span className="text-orange-500 font-bold font-mono">130 pts</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950/20 rounded">
                  <span className="text-slate-400">2. Priya V.</span>
                  <span className="text-slate-500 font-mono">90 pts</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950/20 rounded">
                  <span className="text-slate-400">3. Rahul M.</span>
                  <span className="text-slate-500 font-mono">85 pts</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-[10px] text-indigo-300 leading-relaxed">
              ⭐ <strong>Mohalla Mukhiya Status</strong>: Reach 150 points to unlock custom verification voting weights!
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
