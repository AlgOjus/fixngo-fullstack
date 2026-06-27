import React, { useState } from 'react';
import { Navigation, Wrench, CheckCircle, Navigation2, FileText, Sparkles, Upload } from 'lucide-react';
import { InfrastructureIssue } from '../types';
import ResolverDashboard from './ResolverDashboard';
import OperationalMap from './OperationalMap';

interface ResolversPortalProps {
  issues: InfrastructureIssue[];
  handleAcceptTask: (id: string) => void;
  handleVerifyFix: (id: string) => void;
  resolutionImages: Record<string, string>;
  setResolutionImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  resolutionNotes: Record<string, string>;
  setResolutionNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function ResolversPortal({
  issues,
  handleAcceptTask,
  handleVerifyFix,
  resolutionImages,
  setResolutionImages,
  resolutionNotes,
  setResolutionNotes
}: ResolversPortalProps) {

  const activeDispatches = issues
    .filter(iss => iss.status !== 'Resolved' && (iss.status as any) !== 'RESOLVED')
    .map(iss => {
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
    })
    .sort((a, b) => b.aiScore - a.aiScore);

  const completedDispatches = issues
    .filter(iss => iss.status === 'Resolved' || (iss.status as any) === 'RESOLVED')
    .map(iss => {
      return { ...iss, status: 'Resolved' as const, aiScore: Math.round((iss.severity * 10) + (iss.precedence * 2.5) - 100) };
    });

  const [activeTab, setActiveTab] = useState<'dispatch' | 'active' | 'completed'>('dispatch');

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-white font-display">Authorized Resolver Console</h1>
          <p className="text-xs text-slate-400">Claim broadcasted civic repairs, execute solutions, and upload verification photos.</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <Navigation className="w-4 h-4" />
          <span>Unit #442 Online</span>
        </div>
      </div>

      {/* Sub tabs inside Resolvers Hub */}
      <div className="flex border-b border-slate-900 pb-px text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${activeTab === 'dispatch' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Smart Dispatch Feed (Live)
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${activeTab === 'active' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Active Assignments / Broadcasts ({activeDispatches.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${activeTab === 'completed' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Verified Resolutions Ledger ({completedDispatches.length})
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <div className="space-y-6">
          <ResolverDashboard onIssueDispatched={(id) => {
            setActiveTab('active');
          }} />
          <OperationalMap 
            issues={issues} 
            showNotification={undefined} 
            title="AUTHORIZED RESOLVER DISPATCH MAP" 
          />
        </div>
      ) : activeTab === 'active' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeDispatches.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500 font-mono">No active dispatches on the grid. Enjoy your shift! ☕</p>
            </div>
          ) : (
            activeDispatches.map(issue => {
              const isAssigned = issue.status === 'In Progress';
              return (
                <div key={issue.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase mb-2 inline-block ${
                          issue.status === 'In Progress' && issue.resolution_feedback ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          issue.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {issue.status === 'In Progress' && issue.resolution_feedback ? 'REPAIR REJECTED - REQUIRES REVIEW' :
                           issue.status === 'In Progress' ? 'DISPATCH IN PROGRESS' : 'MUNICIPAL BROADCAST'}
                        </span>
                        <h3 className="text-md font-bold text-white">{issue.category}</h3>
                        <p className="text-xs text-slate-400">AI Severity Score: {issue.severity}/10</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-500 font-mono">
                        {issue.id}
                      </div>
                    </div>

                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-850 bg-slate-950 relative">
                      {issue.imageUrl ? (
                        <img src={issue.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">No issue photo attached</div>
                      )}
                    </div>

                    {issue.resolution_feedback && (
                      <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-[11px] text-rose-400 leading-relaxed">
                        <span className="font-bold block uppercase tracking-wider text-[9px] mb-1">QA Inspector Rejection Reasoning:</span>
                        "{issue.resolution_feedback}"
                      </div>
                    )}

                    {issue.aiAdvice && (
                      <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 text-[11px] text-orange-400 leading-relaxed italic">
                        "AI Advice: {issue.aiAdvice}"
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-850/40">
                    {!isAssigned ? (
                      <button 
                        onClick={() => handleAcceptTask(issue.id)}
                        className="w-full text-slate-950 bg-emerald-400 hover:bg-emerald-500 font-extrabold rounded-xl text-xs px-5 py-3 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                      >
                        CLAIM REPAIR DISPATCH
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="border border-dashed border-emerald-900/40 rounded-xl p-3 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/40 transition">
                          {resolutionImages[issue.id] ? (
                            <img src={resolutionImages[issue.id]} alt="Resolution upload" className="w-full max-h-32 object-cover rounded-lg" />
                          ) : (
                            <div className="text-center p-2 text-slate-500">
                              <Upload className="w-5 h-5 mx-auto text-emerald-400 mb-1.5" />
                              <span className="block text-[10px] mb-1">Upload Work Resolution Photo</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setResolutionImages(prev => ({ ...prev, [issue.id]: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="text-[10px] text-slate-500"
                              />
                            </div>
                          )}
                        </div>

                        <input 
                          type="text"
                          placeholder="Provide work resolution notes..."
                          value={resolutionNotes[issue.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResolutionNotes(prev => ({ ...prev, [issue.id]: val }));
                          }}
                          className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-colors"
                        />

                        <button 
                          onClick={() => handleVerifyFix(issue.id)}
                          className="w-full text-slate-950 bg-emerald-400 hover:bg-emerald-500 font-extrabold rounded-xl text-xs px-5 py-3 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                          SUBMIT WORK CLOSED FOR AI VERIFICATION
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {completedDispatches.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500 font-mono">No verified resolutions on record yet.</p>
            </div>
          ) : (
            completedDispatches.map(issue => (
              <div key={issue.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                    {issue.imageUrl && (
                      <img src={issue.imageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{issue.category}</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-bold">✓ AI VERIFIED</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Ticket ID: {issue.id} • Assigned contractor: Unit #442</p>
                    {issue.workerNotes && (
                      <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-950/40 p-1.5 rounded border border-slate-850">
                        Fix notes: {issue.workerNotes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 font-mono">
                  Coordinates: {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
