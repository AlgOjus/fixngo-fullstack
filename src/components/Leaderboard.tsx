import React, { useEffect, useState } from 'react';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabase';
import { Trophy, Award } from 'lucide-react';

interface LeaderboardProps {
  currentUser?: UserAccount | null;
  allProfiles?: UserAccount[];
}

export default function Leaderboard({ currentUser, allProfiles }: LeaderboardProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allProfiles && allProfiles.length > 0) {
      const list = allProfiles
        .filter(p => p.role === 'citizen')
        .map(p => ({
          ...p,
          points: p.points || 0
        }))
        .sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(list);
      setLoading(false);
      // Still fetch from DB to update if needed? Maybe not.
      return;
    }

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, points')
          .order('points', { ascending: false });

        if (error) throw error;
        
        const leaderboardUsers = (data || []).map(u => ({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          points: u.points || 0
        }));
        setUsers(leaderboardUsers);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [allProfiles]);

  const currentUserRank = users.findIndex(u => u.id === currentUser?.id) + 1;

  if (loading) return <div className="text-center p-4 text-slate-400">Loading leaderboard...</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-black text-white font-display">Leaderboard</h2>
      </div>

      {currentUser && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-orange-400 font-bold text-sm">Your Position</span>
          <span className="text-white font-black text-lg">#{currentUserRank > 0 ? currentUserRank : '-'}</span>
        </div>
      )}

      <div className="space-y-3">
        {users.map((user, index) => (
          <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg ${user.id === currentUser?.id ? 'bg-slate-800' : 'bg-slate-950/50'}`}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-500 w-6">#{index + 1}</span>
              <span className={`font-semibold ${user.id === currentUser?.id ? 'text-white' : 'text-slate-300'}`}>{user.fullName}</span>
            </div>
            <div className="flex items-center gap-1.5 font-black text-orange-400">
              {user.points || 0}
              <Award className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
