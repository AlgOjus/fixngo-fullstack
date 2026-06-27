import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InfrastructureIssue } from '../types';
import { AlertCircle, ShieldAlert, Sparkles, Zap, Navigation, Clock } from 'lucide-react';

interface ResolverDashboardProps {
  onIssueDispatched?: (issueId: string) => void;
}

export default function ResolverDashboard({ onIssueDispatched }: ResolverDashboardProps) {
  const [pendingIssues, setPendingIssues] = useState<InfrastructureIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const isSupabaseConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

  // Fetch pending issues from Supabase
  const fetchPendingIssues = async () => {
    if (!isSupabaseConfigured) {
      // Mock Fallback Data if Supabase is not fully configured yet
      setPendingIssues([
        {
          id: '#901-T',
          category: 'Road Damage',
          lat: 28.6139,
          lng: 77.2090,
          severity: 8.5,
          severity_level: 'High',
          status: 'Pending',
          precedence: 1,
          distance: 'Nearby',
          imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
          aiAdvice: 'Major structural fracture detected. Immediate asphalt repaving and traffic redirection advised.'
        },
        {
          id: '#911-W',
          category: 'Water Logging',
          lat: 28.6155,
          lng: 77.2120,
          severity: 5.0,
          severity_level: 'Medium',
          status: 'Pending',
          precedence: 2,
          distance: '1.4km',
          imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600',
          aiAdvice: 'Moderate drainage blockage. Cleansing team should be sent to prevent vehicle skid risk.'
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('status', 'Pending');

      if (error) {
        console.error('Error fetching pending issues:', error.message);
        return;
      }

      if (data) {
        const mapped: InfrastructureIssue[] = data.map(item => ({
          id: item.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'raw-' + Math.random().toString(36).substring(2, 15)),
          category: item.category || 'Road Damage',
          lat: Number(item.lat) || 28.6139,
          lng: Number(item.lng) || 77.2090,
          severity: Number(item.severity) || 5,
          severity_level: item.severity_level || (Number(item.severity) > 7 ? 'High' : Number(item.severity) > 4 ? 'Medium' : 'Low'),
          status: item.status || 'Pending',
          precedence: Number(item.precedence) || 1,
          distance: item.distance || 'Nearby',
          imageUrl: item.image_url || item.imageUrl || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
          beforeImageUrl: item.before_image_url || item.beforeImageUrl,
          aiAdvice: item.ai_advice || item.aiAdvice || 'Smart Dispatch pending analysis.'
        }));
        setPendingIssues(mapped);
      }
    } catch (err) {
      console.error('Exception fetching pending issues:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates using Supabase channels
  useEffect(() => {
    fetchPendingIssues();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:issues')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues'
        },
        (payload) => {
          console.log('Real-time database payload received in Resolver Dashboard:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new;
            if (newItem.status === 'Pending') {
              const mapped: InfrastructureIssue = {
                id: newItem.id,
                category: newItem.category || 'Road Damage',
                lat: Number(newItem.lat) || 28.6139,
                lng: Number(newItem.lng) || 77.2090,
                severity: Number(newItem.severity) || 5,
                severity_level: newItem.severity_level || 'Medium',
                status: newItem.status,
                precedence: Number(newItem.precedence) || 1,
                distance: newItem.distance || 'Nearby',
                imageUrl: newItem.image_url || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
                beforeImageUrl: newItem.before_image_url,
                aiAdvice: newItem.ai_advice || 'Smart Dispatch analysis loaded.'
              };
              setPendingIssues(prev => {
                if (prev.some(x => x.id === mapped.id)) return prev;
                return [mapped, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new;
            
            if (updatedItem.status !== 'Pending') {
              // If status updated away from Pending (e.g. In Progress / Assigned), remove from this screen
              setPendingIssues(prev => prev.filter(x => x.id !== updatedItem.id));
            } else {
              // Update the existing item
              setPendingIssues(prev => prev.map(x => {
                if (x.id === updatedItem.id) {
                  return {
                    ...x,
                    category: updatedItem.category || x.category,
                    severity: Number(updatedItem.severity) || x.severity,
                    severity_level: updatedItem.severity_level || x.severity_level,
                    aiAdvice: updatedItem.ai_advice || x.aiAdvice,
                    imageUrl: updatedItem.image_url || x.imageUrl,
                    beforeImageUrl: updatedItem.before_image_url || x.beforeImageUrl
                  };
                }
                return x;
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldItem = payload.old;
            setPendingIssues(prev => prev.filter(x => x.id !== oldItem.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update status to 'In Progress' for specific ticket
  const handleDispatch = async (issueId: string) => {
    try {
      setDispatchingId(issueId);
      
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('issues')
          .update({ status: 'In Progress' })
          .eq('id', issueId);

        if (error) {
          console.error('Error dispatching issue:', error.message);
          return;
        }
      }

      // Local state cleanup if real-time doesn't sync immediately
      setPendingIssues(prev => prev.filter(x => x.id !== issueId));

      if (onIssueDispatched) {
        onIssueDispatched(issueId);
      }
    } catch (err) {
      console.error('Exception on issue dispatch:', err);
    } finally {
      setDispatchingId(null);
    }
  };

  // Dynamic styling colors based on severity_level
  const getSeverityStyle = (level?: string) => {
    const formatted = level?.trim().toLowerCase();
    if (formatted === 'high') {
      return {
        borderClass: 'border-red-500/40 hover:border-red-500/80',
        bgClass: 'bg-gradient-to-br from-slate-900 to-red-950/20',
        badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
        accentColor: '#ef4444'
      };
    } else if (formatted === 'low') {
      return {
        borderClass: 'border-emerald-500/40 hover:border-emerald-500/80',
        bgClass: 'bg-gradient-to-br from-slate-900 to-emerald-950/20',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        accentColor: '#10b981'
      };
    } else {
      // Default / Medium
      return {
        borderClass: 'border-amber-500/40 hover:border-amber-500/80',
        bgClass: 'bg-gradient-to-br from-slate-900 to-amber-950/20',
        badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        accentColor: '#f59e0b'
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>Smart Dispatch Feed</span>
          </h2>
          <p className="text-xs text-slate-400">Incoming municipal broadcasts analyzed by Gemini AI and waiting for dispatch.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Realtime Stream Active</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-900/50 border border-slate-850 rounded-2xl">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-mono">Synchronizing dispatch ledger...</p>
        </div>
      ) : pendingIssues.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <p className="text-xs text-slate-400 font-mono">No new pending dispatches found.</p>
          <p className="text-[10px] text-slate-500">Gemini AI has categorized all current civic repairs safely.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingIssues.map(issue => {
            const styles = getSeverityStyle(issue.severity_level);
            return (
              <div 
                key={issue.id} 
                id={`issue-card-${issue.id}`}
                className={`border ${styles.borderClass} ${styles.bgClass} rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl space-y-4`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${styles.badgeClass}`}>
                      {issue.severity_level || 'Medium'} Severity
                    </span>
                    <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 font-mono">
                      {issue.id}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-md font-bold text-white font-display leading-tight">{issue.category}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Coordinates: {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</p>
                  </div>

                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                    {issue.imageUrl || issue.beforeImageUrl ? (
                      <img 
                        src={issue.beforeImageUrl || issue.imageUrl} 
                        alt={issue.category} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">No visual evidence attached</div>
                    )}
                  </div>

                  {issue.aiAdvice && (
                    <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850 text-[11px] text-slate-300 leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[10px] uppercase font-mono tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Dispatch Assessment</span>
                      </div>
                      <p className="italic text-slate-400">"{issue.aiAdvice}"</p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    id={`btn-dispatch-${issue.id}`}
                    disabled={dispatchingId === issue.id}
                    onClick={() => handleDispatch(issue.id)}
                    className="w-full bg-emerald-400 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-extrabold rounded-xl text-xs px-4 py-2.5 transition shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{dispatchingId === issue.id ? 'Assigning Unit...' : 'Dispatch / Set In Progress'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
