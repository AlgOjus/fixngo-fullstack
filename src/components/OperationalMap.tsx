import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Maximize2, Minimize2, Search, Filter, AlertTriangle, CheckCircle2, Clock, Activity, ListFilter, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InfrastructureIssue } from '../types';

// Custom modern DivIcon generator to avoid relative path resolution bugs
const createMarkerIcon = (status: string, severity: number, hasFeedback?: boolean) => {
  let colorClass = 'bg-rose-500';
  let pingClass = 'bg-rose-500/30';
  
  if (status === 'Resolved' || status === 'RESOLVED') {
    colorClass = 'bg-emerald-500';
    pingClass = 'bg-emerald-500/30';
  } else if (status === 'In Progress' || status === 'ASSIGNED') {
    if (hasFeedback) {
      colorClass = 'bg-purple-500';
      pingClass = 'bg-purple-500/30';
    } else {
      colorClass = 'bg-amber-500';
      pingClass = 'bg-amber-500/30';
    }
  }

  const pulseSize = severity > 7 ? 'w-10 h-10' : severity > 4 ? 'w-8 h-8' : 'w-6 h-6';

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute ${pulseSize} ${pingClass} rounded-full animate-ping"></div>
        <div class="relative w-5 h-5 ${colorClass} border-2 border-white rounded-full flex items-center justify-center shadow-lg">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    className: 'custom-issue-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Helper component to update view when selecting an issue
function MapController({ center, zoom = 14 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface OperationalMapProps {
  issues: InfrastructureIssue[];
  showNotification?: (msg: string, type?: string) => void;
  title?: string;
}

export default function OperationalMap({
  issues,
  showNotification,
  title = "HYPERLOCAL REALTIME OPERATIONS MAP"
}: OperationalMapProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Set default map center based on first issue, or fallback to New Delhi coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Compute "AI Importance Precedence Score"
  // Severity counts 60%, reported/deduped logs count 40%, unresolved issues get a substantial priority boost
  const processedIssues = useMemo(() => {
    return issues.map(iss => {
      // Safe runtime status normalizer
      let status: 'Pending' | 'In Progress' | 'Resolved' = 'Pending';
      if (iss.status === 'Resolved' || (iss.status as any) === 'RESOLVED') {
        status = 'Resolved';
      } else if (iss.status === 'In Progress' || (iss.status as any) === 'ASSIGNED' || (iss.status as any) === 'Requires Review') {
        status = 'In Progress';
      }

      let aiScore = (iss.severity * 10) + (iss.precedence * 2.5);
      
      // Status modifiers
      if (status === 'Resolved') {
        aiScore -= 100; // Resolved goes to bottom
      } else if (status === 'In Progress') {
        if (iss.resolution_feedback) {
          aiScore += 25; // Urgent attention needed for rejected repair reviews
        } else {
          aiScore += 10; // Already dispatched gets moderate elevation
        }
      }

      return {
        ...iss,
        status,
        aiScore: Math.round(aiScore)
      };
    }).sort((a, b) => b.aiScore - a.aiScore); // High priority first
  }, [issues]);

  // Filter based on search and status tabs
  const filteredIssues = useMemo(() => {
    return processedIssues.filter(iss => {
      const matchesSearch = 
        iss.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (iss.description && iss.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        iss.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (statusFilter === 'ALL') return matchesSearch;
      if (statusFilter === 'ACTIVE') return matchesSearch && iss.status !== 'Resolved';
      if (statusFilter === 'RESOLVED') return matchesSearch && iss.status === 'Resolved';
      if (statusFilter === 'REVIEW') return matchesSearch && iss.status === 'In Progress' && !!iss.resolution_feedback;
      return matchesSearch;
    });
  }, [processedIssues, searchQuery, statusFilter]);

  // If issue is clicked in list, pan map to it
  const handleSelectIssueInList = (issue: InfrastructureIssue) => {
    setMapCenter([issue.lat, issue.lng]);
    setMapZoom(16);
    setSelectedIssueId(issue.id);
    if (showNotification) {
      showNotification(`Centering on ${issue.category} (#${issue.id.slice(0, 5)})`, 'success');
    }
  };

  const activeCount = issues.filter(i => i.status !== 'Resolved' && (i.status as any) !== 'RESOLVED').length;

  // The actual map markup
  const mapElement = (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="h-full w-full"
      style={{ background: '#020617' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapController center={mapCenter} zoom={mapZoom} />

      {filteredIssues.map((iss) => {
        const markerIcon = createMarkerIcon(iss.status, iss.severity, !!iss.resolution_feedback);
        return (
          <Marker 
            key={iss.id} 
            position={[iss.lat, iss.lng]} 
            icon={markerIcon}
            eventHandlers={{
              click: () => {
                setSelectedIssueId(iss.id);
                setMapCenter([iss.lat, iss.lng]);
              }
            }}
          >
            <Popup minWidth={280} maxWidth={320}>
              <div className="text-slate-200 p-4 font-sans space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight font-sans">{iss.category}</h4>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{iss.id}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                    iss.status === 'Resolved' || iss.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    iss.status === 'In Progress' && iss.resolution_feedback ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    iss.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {iss.status === 'In Progress' && iss.resolution_feedback ? 'Rejected' : iss.status}
                  </span>
                </div>

                {/* AI Score pill */}
                <div className="flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg p-1.5 px-2.5 text-[10px] text-indigo-300 font-mono">
                  <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>AI Precedence Score: <strong className="text-white">{iss.aiScore} pts</strong></span>
                </div>

                {/* Image preview */}
                {(iss.resolvedImageUrl || iss.imageUrl || iss.beforeImageUrl) && (
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-850 bg-slate-950 relative">
                    <img 
                      src={iss.status === 'Resolved' || iss.status === 'RESOLVED' ? (iss.resolvedImageUrl || iss.imageUrl) : (iss.beforeImageUrl || iss.imageUrl)} 
                      alt={iss.category} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex justify-between text-[10px] bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg font-mono">
                    <span className="text-slate-400">Severity: {iss.severity}/10</span>
                    <span className={iss.severity > 7 ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                      {iss.severity_level || (iss.severity > 7 ? 'High' : 'Medium')}
                    </span>
                  </div>

                  {iss.description && (
                    <div className="bg-slate-900 border border-slate-850 rounded-lg p-2">
                      <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Description:</span>
                      <p className="text-slate-300 text-[10px] leading-normal">{iss.description}</p>
                    </div>
                  )}

                  {iss.aiAdvice && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 text-amber-400 italic">
                      <span className="font-bold text-amber-400 not-italic block text-[9px] uppercase tracking-wider mb-0.5">AI Dispatch Advice:</span>
                      "{iss.aiAdvice}"
                    </div>
                  )}

                  {iss.resolution_feedback && (
                    <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-2 text-rose-400">
                      <span className="font-bold block uppercase tracking-wider text-[9px] mb-0.5">Rejection Reason:</span>
                      "{iss.resolution_feedback}"
                    </div>
                  )}

                  {(iss.status === 'Resolved' || iss.status === 'RESOLVED') && iss.workerNotes && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2 text-emerald-400">
                      <span className="font-bold block uppercase tracking-wider text-[9px] mb-0.5">Resolution Notes:</span>
                      "{iss.workerNotes}"
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );

  return (
    <>
      {/* CARD VIEW MODE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 h-[440px] relative overflow-hidden flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="bg-slate-950/90 border border-slate-850 px-3 py-1.5 rounded-full text-[9px] font-mono text-slate-400 tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-400 hidden sm:inline">
              {activeCount} Active on Grid
            </span>
            <button
              id="expand-map-btn"
              onClick={() => setIsFullscreen(true)}
              className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fullscreen Map</span>
            </button>
          </div>
        </div>

        {/* Standard card map box */}
        <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 shadow-inner relative group min-h-[300px] z-0">
          {mapElement}
          
          {/* Quick HUD overlay in card */}
          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-850/80 px-2.5 py-1.5 rounded-xl text-[9px] font-mono text-slate-400 z-[1000] pointer-events-none shadow-xl">
            <div className="font-bold text-white mb-0.5">GRID TELEMETRY</div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>Pending</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>In Progress</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN OVERLAY MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col font-sans" id="fullscreen-map-modal">
          
          {/* Top Fullscreen Header */}
          <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h2 className="text-base font-bold text-white tracking-tight font-display flex items-center gap-2">
                  <span>Hyperlocal Operational Command Cockpit</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono uppercase tracking-widest font-normal">AI Grid v2.1</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Real-time spatial verification showing problems ordered by AI Precedence score calculated via density, severity, and logs weight.
              </p>
            </div>
            
            <button
              id="exit-fullscreen-btn"
              onClick={() => setIsFullscreen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white hover:text-rose-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 shadow-lg ml-auto cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Minimize Command</span>
            </button>
          </header>

          {/* Fullscreen Body: Split Screen Map & AI Precedence List */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Map Area (70% standard) */}
            <div className="flex-1 min-h-[350px] lg:h-full relative overflow-hidden bg-slate-950 z-10">
              {mapElement}
              
              {/* Bottom HUD bar on map */}
              <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-800 p-3 rounded-2xl text-[10px] font-mono text-slate-400 z-[1000] shadow-2xl flex flex-wrap gap-4 items-center max-w-lg">
                <div className="text-white font-bold border-r border-slate-800 pr-3 mr-1">MAP PROTOCOL</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Pending</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> In Progress</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Rejected</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Resolved</div>
              </div>
            </div>

            {/* AI Importance Precedence List Sidebar (30%) */}
            <aside className="w-full lg:w-[400px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-850 flex flex-col h-[40%] lg:h-full shrink-0 shadow-2xl z-20">
              
              {/* Sidebar Header with Filter Controls */}
              <div className="p-4 border-b border-slate-850 space-y-3 bg-slate-950/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-sans">
                    <ListFilter className="w-4 h-4 text-indigo-400" />
                    <span>AI Precedence Sorting</span>
                  </h3>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                    {filteredIssues.length} matches
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search category, ID or desc..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                  />
                </div>

                {/* Status Tab buttons */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-indigo-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'ACTIVE' ? 'bg-indigo-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter('REVIEW')}
                    className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'REVIEW' ? 'bg-indigo-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                  >
                    Rejected
                  </button>
                  <button
                    onClick={() => setStatusFilter('RESOLVED')}
                    className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'RESOLVED' ? 'bg-indigo-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Scrollable Ranked Issue List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-850/60 p-2 space-y-2">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-mono">
                    No infrastructure issues matched.
                  </div>
                ) : (
                  filteredIssues.map((iss, idx) => {
                    const isSelected = selectedIssueId === iss.id;
                    const statusColor = 
                      iss.status === 'Resolved' || iss.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10' :
                      iss.status === 'In Progress' && iss.resolution_feedback ? 'text-purple-400 bg-purple-500/10' :
                      iss.status === 'In Progress' ? 'text-amber-400 bg-amber-500/10' :
                      'text-rose-400 bg-rose-500/10';

                    return (
                      <div
                        key={iss.id}
                        onClick={() => handleSelectIssueInList(iss)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${isSelected ? 'bg-indigo-950/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-slate-950/30 border-slate-850 hover:bg-slate-850/40 hover:border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-indigo-400 font-extrabold">#{idx + 1}</span>
                              <h4 className="text-xs font-bold text-white font-display line-clamp-1">{iss.category}</h4>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 block">ID: {iss.id.slice(0, 8)}...</span>
                          </div>

                          {/* AI Priority badge */}
                          <div className="text-right">
                            <span className="text-[10px] font-mono font-extrabold text-indigo-300 bg-indigo-950/60 border border-indigo-900/30 px-1.5 py-0.5 rounded-md block">
                              {iss.aiScore} pts
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5 block">AI Rank</span>
                          </div>
                        </div>

                        {/* Description / metadata */}
                        {iss.description && (
                          <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                            {iss.description}
                          </p>
                        )}

                        {/* Status, Logs & coordinates row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-850/40 text-[9px] font-mono">
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded font-extrabold ${statusColor}`}>
                              {iss.status === 'In Progress' && iss.resolution_feedback ? 'Rejected' : iss.status}
                            </span>
                            <span className="text-slate-500">
                              +{iss.precedence} logs
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                            <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{iss.lat.toFixed(3)}, {iss.lng.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer details */}
              <div className="p-3 bg-slate-950 border-t border-slate-850/80 text-[10px] text-slate-500 font-mono text-center flex items-center justify-center gap-1 shrink-0">
                <span>Select a repair ticket to lock coordinate telemetry.</span>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
