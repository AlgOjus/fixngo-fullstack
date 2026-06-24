import React, { useState } from 'react';
import { Compass, Sparkles, User, Wrench, ArrowRight, Activity, ClipboardList, Building, AlertTriangle, Send } from 'lucide-react';
import { InfrastructureIssue } from '../types';

interface GuestPortalProps {
  issues: InfrastructureIssue[];
  handleReportIssue: (isGuest: boolean) => void;
  isAnalyzing: boolean;
  newIssueCategory: string;
  setNewIssueCategory: (val: string) => void;
  newIssueLat: string;
  setNewIssueLat: (val: string) => void;
  newIssueLng: string;
  setNewIssueLng: (val: string) => void;
  newIssueDescription: string;
  setNewIssueDescription: (val: string) => void;
  uploadedImage: string;
  setUploadedImage: (val: string) => void;
  handleTabChange: (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin') => void;
  citizenLoggedIn: boolean;
  resolverLoggedIn: boolean;
}

export default function GuestPortal({
  issues,
  handleReportIssue,
  isAnalyzing,
  newIssueCategory,
  setNewIssueCategory,
  newIssueLat,
  setNewIssueLat,
  newIssueLng,
  setNewIssueLng,
  newIssueDescription,
  setNewIssueDescription,
  uploadedImage,
  setUploadedImage,
  handleTabChange,
  citizenLoggedIn,
  resolverLoggedIn
}: GuestPortalProps) {

  // GPS Simulation Trigger
  const handleGPSLocate = () => {
    // Randomize a location in Delhi/Greater Mohalla area
    const lats = ['28.6139', '28.6252', '28.6015', '28.6384', '28.6190'];
    const lngs = ['77.2090', '77.2185', '77.1950', '77.2210', '77.2040'];
    const idx = Math.floor(Math.random() * lats.length);
    setNewIssueLat(lats[idx]);
    setNewIssueLng(lngs[idx]);
  };

  const activeCount = issues.filter(i => i.status !== 'RESOLVED').length;
  const costOfNeglect = (activeCount * 1420.50).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <div className="space-y-12 text-slate-200">
      
      {/* High-converting Hero Section */}
      <div className="relative overflow-hidden pt-6 pb-12 text-center max-w-4xl mx-auto">
        {/* Background glowing effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-bold tracking-wider uppercase mb-8 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Action-Driven Dispatch</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1] mb-6 font-display">
          Civic Infrastructure, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-indigo-400">
            Dispatched & Resolved.
          </span>
        </h2>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          Zero complaints. Zero bureaucracy. FixNGo is a high-speed dispatch engine that parses, deduplicates, and relays infrastructure issues straight to active municipal resolvers in Greater Mohalla.
        </p>

        {/* Quick Entrance CTAs */}
        <div className="flex flex-wrap justify-center gap-4">
          {!citizenLoggedIn && (
            <button
              onClick={() => handleTabChange('login')}
              className="bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.2)] cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Access Citizen Rewards</span>
            </button>
          )}
          {!resolverLoggedIn && (
            <button
              onClick={() => handleTabChange('login')}
              className="border border-slate-800 bg-slate-900 hover:text-white text-slate-300 font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Authorized Resolver Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Operations Cockpit (Map & Ledger vs Express anonymous reporter Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Live Map & Dispatch Ledger */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Live Telemetry Map Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-96 relative overflow-hidden flex flex-col items-center justify-center shadow-xl">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <div className="absolute top-4 left-4 bg-slate-950/90 border border-slate-850 px-3 py-1.5 rounded-full text-[9px] font-mono text-slate-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              <span>HYPERLOCAL OPERATION GRID MONITOR</span>
            </div>

            {/* Map Pins */}
            {issues.map((iss) => {
              const isResolved = iss.status === 'RESOLVED';
              const isAssigned = iss.status === 'ASSIGNED';
              const pinColor = isResolved ? 'bg-emerald-500' : isAssigned ? 'bg-orange-500' : 'bg-rose-500';
              
              const leftPos = `${25 + (iss.lng % 0.010) * 5500}%`;
              const topPos = `${30 + (iss.lat % 0.010) * 4500}%`;

              return (
                <div 
                  key={iss.id} 
                  style={{ left: leftPos, top: topPos }}
                  className="absolute group cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 ${pinColor} rounded-full border border-slate-950 shadow-md transform transition-transform duration-150 hover:scale-130`}></div>
                  
                  {/* Tooltip Hover Overlay */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-2xl w-48 text-[11px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <span className="text-[9px] text-orange-400 font-extrabold uppercase block mb-0.5">AI Severity: {iss.severity}</span>
                    <strong className="text-white block font-semibold">{iss.category}</strong>
                    <span className="text-slate-400 font-mono text-[9px] block">Status: {iss.status}</span>
                    <span className="text-slate-400 font-mono text-[9px] block">Precedence: +{iss.precedence} logs</span>
                  </div>
                </div>
              );
            })}

            {/* Visual landmarks */}
            <div className="absolute bottom-4 right-4 bg-slate-950/95 border border-slate-850 px-3 py-2 rounded-xl text-[9px] font-mono text-slate-400 text-right space-y-1">
              <div className="flex items-center gap-1 justify-end"><Building className="w-3 h-3 text-indigo-400" /> Central Metro Junction</div>
              <div className="flex items-center gap-1 justify-end"><Building className="w-3 h-3 text-emerald-400" /> Kalyan Town Green</div>
            </div>

            <div className="text-center p-5 bg-slate-950/80 border border-slate-850 rounded-2xl max-w-sm pointer-events-none z-10">
              <span className="text-xs text-orange-500 font-extrabold tracking-widest uppercase block mb-1">Live Telemetry Map</span>
              <p className="text-[11px] text-slate-300">Clicking coordinates on smart map activates real-time deduplication to speed up municipal dispatches.</p>
            </div>
          </div>

          {/* Active Infrastructure Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-orange-500" />
                <span>Active Infrastructure Dispatch Ledger</span>
              </h3>
              <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-mono border border-slate-850">
                {issues.length} Active Work Orders
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Coordinates</th>
                    <th className="pb-3 font-medium">AI Severity</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Precedence</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-slate-800/40">
                  {issues.map(issue => (
                    <tr key={issue.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-mono text-slate-400 text-[11px]">{issue.id}</td>
                      <td className="py-3 font-bold text-white">{issue.category}</td>
                      <td className="py-3 font-mono text-slate-400 text-[10px]">{issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${issue.severity >= 8 ? 'bg-red-500/20 text-red-400 border border-red-500/10' : issue.severity >= 5 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/10' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'}`}>
                          {issue.severity}/10
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold">
                          <span className={`w-2 h-2 rounded-full ${issue.status === 'BROADCAST' ? 'bg-rose-500 animate-pulse' : issue.status === 'ASSIGNED' ? 'bg-orange-400' : 'bg-emerald-500'}`}></span>
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">+{issue.precedence} logs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Express Anonymous Reporter Form & economic indicators */}
        <div className="space-y-6">
          
          {/* Guest Reporter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full pointer-events-none" />
            
            <h3 className="text-sm font-bold text-white mb-1">Express Guest Portal</h3>
            <p className="text-xs text-slate-400 mb-6">Anonymous, registration-free express reporting to trigger rapid smart-grid dispatches.</p>
            
            <div className="space-y-4">
              {/* Photo Upload area */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Attach Defect Evidence (Optional)</label>
                <div className="border border-dashed border-slate-800 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer bg-slate-950 hover:border-slate-700 transition-colors relative overflow-hidden">
                  {uploadedImage ? (
                    <img src={uploadedImage} alt="Defect Visual" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <span className="text-[10px] text-slate-500 block">Click to simulate photo upload</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setUploadedImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-[10px] text-slate-500 block mt-1 mx-auto max-w-[180px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Category dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Infrastructure Category</label>
                <select 
                  value={newIssueCategory}
                  onChange={(e) => setNewIssueCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded-xl p-3 outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="Pothole">🕳️ Pothole & Road Damage</option>
                  <option value="Water Leakage">💧 Water Leakage & Waste</option>
                  <option value="Waste Overflow">🗑️ Waste Overflow & Dirt</option>
                  <option value="Dead Streetlight">💡 Dead Streetlight</option>
                </select>
              </div>

              {/* Coordinates & GPS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Grid Coordinates</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={`${newIssueLat}, ${newIssueLng}`}
                    readOnly
                    className="bg-slate-950 border border-slate-850 text-slate-400 text-xs rounded-xl block w-full p-3 font-mono outline-none"
                  />
                  <button 
                    onClick={handleGPSLocate}
                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-orange-500 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Simulate GPS
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quick Description (Optional)</label>
                <input 
                  type="text"
                  value={newIssueDescription}
                  onChange={(e) => setNewIssueDescription(e.target.value)}
                  placeholder="e.g. Hazardous water pipe burst on side street..."
                  className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded-xl p-3 outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Submit CTA */}
              <button 
                onClick={() => handleReportIssue(true)}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)] cursor-pointer"
              >
                {isAnalyzing ? (
                  <span>Analyzing Spatial Duplicates...</span>
                ) : (
                  <>
                    <span>Submit Anonymous Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Daily Economic Drag Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Active Economic Loss</h4>
                <div className="text-2xl font-black text-orange-500 font-mono">{costOfNeglect}</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">Total public drag calculated from delays, pipe damage, and safety risks.</p>
              </div>
              <div className="bg-orange-500/10 text-orange-400 p-2 rounded-xl border border-orange-500/20">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Value chain summary */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 text-[10px] text-slate-500 space-y-1">
            <div className="flex gap-2"><span className="text-emerald-400 font-bold">100% Deduplicated</span> — Coordinates match with 500m thresholds.</div>
            <div className="flex gap-2"><span className="text-indigo-400 font-bold">Direct Relay</span> — Avoid municipal call waitlists entirely.</div>
          </div>

        </div>

      </div>

    </div>
  );
}
