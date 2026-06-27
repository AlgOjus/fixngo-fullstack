import React, { useState } from 'react';
import { Compass, Sparkles, User, Wrench, ArrowRight, Activity, ClipboardList, Building, AlertTriangle, Send } from 'lucide-react';
import { InfrastructureIssue } from '../types';
import LocationInputResilient from './LocationInputResilient';
import OperationalMap from './OperationalMap';
import MediaCapture from './MediaCapture';

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
  customCategoryNote: string;
  setCustomCategoryNote: (val: string) => void;
  uploadedImage: string;
  setUploadedImage: (val: string) => void;
  uploadedFile: File | null;
  setUploadedFile: (val: File | null) => void;
  handleTabChange: (tab: 'landing' | 'login' | 'citizen' | 'resolver' | 'admin') => void;
  citizenLoggedIn: boolean;
  resolverLoggedIn: boolean;
  showNotification?: (msg: string, type?: string) => void;
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
  customCategoryNote,
  setCustomCategoryNote,
  uploadedImage,
  setUploadedImage,
  uploadedFile,
  setUploadedFile,
  handleTabChange,
  citizenLoggedIn,
  resolverLoggedIn,
  showNotification
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

  const activeCount = issues.filter(i => i.status !== 'Resolved' && (i.status as any) !== 'RESOLVED').length;
  const costOfNeglect = (activeCount * 1420.50).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const mapCenter: [number, number] = issues.length > 0 
    ? [issues[0].lat, issues[0].lng]
    : [28.6139, 77.2090];

  const sortedIssues = [...issues].map(iss => {
    let status: 'Pending' | 'In Progress' | 'Resolved' = 'Pending';
    if (iss.status === 'Resolved' || (iss.status as any) === 'RESOLVED') {
      status = 'Resolved';
    } else if (iss.status === 'In Progress' || (iss.status as any) === 'ASSIGNED' || (iss.status as any) === 'Requires Review') {
      status = 'In Progress';
    }

    let aiScore = (iss.severity * 10) + (iss.precedence * 2.5);
    if (status === 'Resolved') {
      aiScore -= 100;
    } else if (status === 'In Progress') {
      if (iss.resolution_feedback) {
        aiScore += 25;
      } else {
        aiScore += 10;
      }
    }
    return { ...iss, status, aiScore: Math.round(aiScore) };
  }).sort((a, b) => b.aiScore - a.aiScore);

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
          <OperationalMap issues={issues} showNotification={showNotification} />

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
                  {sortedIssues.map(issue => (
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
                          <span className={`w-2 h-2 rounded-full ${
                            issue.status === 'Resolved' ? 'bg-emerald-500' : 
                            issue.status === 'In Progress' ? 'bg-amber-500' : 
                            'bg-rose-500 animate-pulse'
                          }`}></span>
                          {issue.status === 'In Progress' && issue.resolution_feedback ? 'Rejected' : issue.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">
                        +{issue.precedence} logs <span className="text-[10px] text-indigo-400">({issue.aiScore} pts)</span>
                      </td>
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
                <MediaCapture
                  uploadedImage={uploadedImage}
                  setUploadedImage={setUploadedImage}
                  setUploadedFile={setUploadedFile}
                  onLocationExtracted={(lat, lng) => {
                    setNewIssueLat(lat);
                    setNewIssueLng(lng);
                  }}
                  showNotification={showNotification}
                />
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
                  <option value="Other">❓ Other (Specify Below)</option>
                </select>

                {newIssueCategory === 'Other' && (
                  <div className="mt-2.5 animate-fade-in">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Specify Custom Category Note</label>
                    <input 
                      type="text"
                      value={customCategoryNote}
                      onChange={(e) => setCustomCategoryNote(e.target.value)}
                      placeholder="e.g. Broken park bench, low-hanging electric wire..."
                      className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded-xl p-3 outline-none focus:border-orange-500 transition-colors"
                      id="custom-category-note-input-guest"
                    />
                  </div>
                )}
              </div>

              {/* Coordinates & GPS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2">Issue Location Pin & Resilient Capture</label>
                <LocationInputResilient 
                  lat={newIssueLat}
                  lng={newIssueLng}
                  onCoordinatesChange={(latVal, lngVal) => {
                    setNewIssueLat(latVal);
                    setNewIssueLng(lngVal);
                  }}
                  showNotification={showNotification}
                />
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
