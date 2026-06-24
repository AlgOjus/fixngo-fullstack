'use client';

import React from 'react';
import { Wrench, MapPin, CheckCircle2, Navigation } from 'lucide-react';

export default function WorkerDispatchPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div>
            <h1 className="text-xl font-bold text-white font-display">Authorized Resolver Console</h1>
            <p className="text-xs text-slate-400">Claim broadcasted civic repairs, execute solutions, and upload verification photos.</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>Unit #442 Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-400 mb-2 inline-block">
                  BROADCAST
                </span>
                <h3 className="text-md font-bold text-white">Water Leakage</h3>
                <p className="text-xs text-slate-400">Nearby • AI Severity Score: 9.8</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-500 font-mono">
                #902-A
              </div>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-850 bg-slate-950">
              <img src="https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600" alt="Leakage visual" className="w-full h-full object-cover" />
            </div>
            <button className="w-full text-slate-950 bg-emerald-400 hover:bg-emerald-500 font-extrabold rounded-xl text-xs px-5 py-3 transition shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              CLAIM REPAIR DISPATCH
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 mb-2 inline-block">
                  ASSIGNED TO YOU
                </span>
                <h3 className="text-md font-bold text-white">Deep Road Pothole</h3>
                <p className="text-xs text-slate-400">0.8km away • AI Severity Score: 7.2</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-500 font-mono">
                #881-F
              </div>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-850 bg-slate-950">
              <img src="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600" alt="Pothole visual" className="w-full h-full object-cover" />
            </div>
            <button className="w-full text-slate-950 bg-amber-400 hover:bg-amber-500 font-extrabold rounded-xl text-xs px-5 py-3 transition shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              SUBMIT CLOSURE PROOF PHOTO
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
