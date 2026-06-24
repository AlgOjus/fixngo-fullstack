import React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles, Send, ShieldAlert, Wrench, CheckCircle2, Navigation } from "lucide-react";

export default function Home() {
  return (
    <div className="relative overflow-hidden min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-orange-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-indigo-500/5 blur-[200px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-bold tracking-wider uppercase mb-8 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Civic Dispatch Active</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-display max-w-4xl mx-auto leading-[1.1] mb-6">
          Civic Infrastructure, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-indigo-400">
            Dispatched & Resolved.
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Zero complaints. Zero bureaucracy. FixNGo is an action-driven dispatch engine that parses, deduplicates, and relays infrastructure issues straight to active municipal resolvers.
        </p>

        {/* Portals CTA Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20 text-left">
          {/* Citizen Hub CTA */}
          <div className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-900 hover:border-indigo-500/30 p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Citizen Hub</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Log localized infrastructure issues, coordinate coordinates, track status in real-time, and earn impact points for civic contributions.
            </p>
            <Link
              href="/citizen"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-400 group-hover:text-indigo-300"
            >
              <span>Enter Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Guest Report CTA */}
          <div className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-900 hover:border-pink-500/30 p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Express Guest Report</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              No registration needed. Fast anonymous visual reporting with coordinate telemetry to get immediate eyes on local infrastructure faults.
            </p>
            <Link
              href="/guest"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-pink-400 group-hover:text-pink-300"
            >
              <span>File Express Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Resolver Dispatch CTA */}
          <div className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-900 hover:border-emerald-500/30 p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Resolver Dispatch</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Operational interface for municipal responders and contractors. Claim broadcasted tasks, upload verification photos, and claim rewards.
            </p>
            <Link
              href="/worker"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 group-hover:text-emerald-300"
            >
              <span>Access Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* The Operational Value Proposition Value Loop (Report -> Deduplicate -> Dispatch -> Resolve) */}
        <div className="border border-slate-900 bg-slate-950/40 rounded-3xl p-8 max-w-5xl mx-auto">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase text-center mb-10">
            Value Proposition: The FixNGo Action Loop
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="text-center relative">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm mx-auto mb-3">
                1
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Report</h4>
              <p className="text-[11px] text-slate-400 leading-normal px-2">
                Citizens capture and submit geo-tagged visual evidence of local defects.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-sm mx-auto mb-3">
                2
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Deduplicate</h4>
              <p className="text-[11px] text-slate-400 leading-normal px-2">
                AI spatial analysis merges overlapping coordinates to compile clean, upvoted primary tickets.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm mx-auto mb-3">
                3
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Dispatch</h4>
              <p className="text-[11px] text-slate-400 leading-normal px-2">
                Priority algorithms instantly relay work orders straight to verified regional resolvers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center relative">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm mx-auto mb-3">
                4
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Resolve</h4>
              <p className="text-[11px] text-slate-400 leading-normal px-2">
                Contractors upload closure proof photos, auto-verified via machine learning to release funding.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
