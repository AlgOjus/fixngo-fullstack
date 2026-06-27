import React, { useState } from 'react';
import { Award, ClipboardList, User, Sparkles, Send, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { InfrastructureIssue } from '../types';
import InteractiveMap from './InteractiveMap';
import OperationalMap from './OperationalMap';

interface CitizenHubProps {
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
  uploadedFile: File | null;
  setUploadedFile: (val: File | null) => void;
  userPoints: number;
  setUserPoints: React.Dispatch<React.SetStateAction<number>>;
  showNotification: (msg: string, type?: string) => void;
}

export default function CitizenHub({
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
  uploadedFile,
  setUploadedFile,
  userPoints,
  setUserPoints,
  showNotification
}: CitizenHubProps) {

  const [activeTab, setActiveTab] = useState<'status' | 'report'>('status');

  const handleGPSLocate = () => {
    const lats = ['28.6139', '28.6252', '28.6015', '28.6384', '28.6190'];
    const lngs = ['77.2090', '77.2185', '77.1950', '77.2210', '77.2040'];
    const idx = Math.floor(Math.random() * lats.length);
    setNewIssueLat(lats[idx]);
    setNewIssueLng(lngs[idx]);
  };

  // Filter and sort personal tickets by AI precedence score descending
  const personalTickets = issues
    .filter(iss => iss.id.endsWith('-X'))
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

  const getRank = (pts: number) => {
    if (pts >= 180) return 'Mohalla Mukhiya 👑';
    if (pts >= 140) return 'Ward Warden 🛡️';
    return 'Sadak Sipahi 🏅';
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-white font-display">Citizen Operations Hub</h1>
          <p className="text-xs text-slate-400">Manage your active municipal dispatches and track civic impact rewards.</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
          <Award className="w-4 h-4 text-orange-400" />
          <span>{getRank(userPoints)} • {userPoints} PTS</span>
        </div>
      </div>

      {/* Sub tabs inside Citizen Hub */}
      <div className="flex border-b border-slate-900 pb-px text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${activeTab === 'status' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Track Active Personal Reports ({personalTickets.length})
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${activeTab === 'report' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Submit Personalized Report (+50 Points)
        </button>
      </div>

      {activeTab === 'status' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              <span>Your Reported Infrastructure Defects</span>
            </h3>

            {personalTickets.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-850">
                <p className="text-xs text-slate-500 font-mono">No personalized reports found. Click "Submit Personalized Report" to add one! 🚀</p>
              </div>
            ) : (
              <div className="space-y-4">
                {personalTickets.map(ticket => (
                  <div key={ticket.id} className="bg-slate-950 rounded-2xl border border-slate-850 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                        {ticket.imageUrl ? (
                          <img src={ticket.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-slate-600">FG</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-indigo-400 font-mono">{ticket.id}</span>
                          <span className="text-xs font-bold text-white">{ticket.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Coordinates: {ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        ticket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        ticket.status === 'In Progress' && ticket.resolution_feedback ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        ticket.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {ticket.status === 'In Progress' && ticket.resolution_feedback ? 'Rejected' : ticket.status}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">Precedence: +{ticket.precedence} logs ({ticket.aiScore} pts)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rewards Leaderboard</h3>
              <p className="text-[11px] text-slate-400 mb-4">Coordinate with active dispatches to claim higher ranks inside Greater Mohalla.</p>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-950/40 rounded border border-slate-850">
                  <span className="text-slate-300">1. Arjun S. (You)</span>
                  <span className="text-indigo-400 font-bold font-mono">{userPoints} pts</span>
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

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 text-[10px] text-indigo-300 leading-relaxed">
              ⭐ <strong>Mohalla Mukhiya Clearances</strong>: Reach 180 points to unlock custom verification voting weights! Currently you are at {userPoints} points.
            </div>
          </div>

          {/* Citizen Grid Operations Map Section */}
          <div className="md:col-span-3 mt-4">
            <OperationalMap 
              issues={issues} 
              showNotification={showNotification} 
              title="CITIZEN OPERATIONS REALTIME GRID" 
            />
          </div>

        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Submit Personalized Report</h3>
            <p className="text-xs text-slate-400">Identified reports with citizen credentials earn +50 points upon successful verification.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Attach Photo Evidence</label>
              <div className="border border-dashed border-slate-800 rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer bg-slate-950 hover:border-slate-700 transition-colors relative overflow-hidden">
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
                          setUploadedFile(file);
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

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Infrastructure Category</label>
              <select 
                value={newIssueCategory}
                onChange={(e) => setNewIssueCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Pothole">🕳️ Pothole & Road Damage</option>
                <option value="Water Leakage">💧 Water Leakage & Waste</option>
                <option value="Waste Overflow">🗑️ Waste Overflow & Dirt</option>
                <option value="Dead Streetlight">💡 Dead Streetlight</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2">Issue Location Pin</label>
              <InteractiveMap 
                lat={newIssueLat}
                lng={newIssueLng}
                onCoordinatesChange={(latVal, lngVal, wkt) => {
                  setNewIssueLat(latVal);
                  setNewIssueLng(lngVal);
                }}
                showNotification={showNotification}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Detailed Description (Optional)</label>
              <input 
                type="text"
                value={newIssueDescription}
                onChange={(e) => setNewIssueDescription(e.target.value)}
                placeholder="e.g. Broken streetlight causing visibility problems near lane 4..."
                className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button 
              onClick={() => {
                handleReportIssue(false);
                setUserPoints(prev => prev + 50);
                setActiveTab('status');
              }}
              disabled={isAnalyzing}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition flex justify-center items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.25)] cursor-pointer"
            >
              {isAnalyzing ? (
                <span>Analyzing Coordinates...</span>
              ) : (
                <>
                  <span>Submit Personalized Report (+50 Points)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
