import React from 'react';
import { motion } from 'motion/react';
import { Crown, Search, Trophy } from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface LeaderboardViewProps {
  lang: Language;
  leaderboard: UserProfile[];
  currentUserId: string;
  currentUserRp: number;
  frames: any[];
  onInspectPlayer: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  lang,
  leaderboard,
  currentUserId,
  frames,
  onInspectPlayer,
}) => {
  const [search, setSearch] = React.useState('');

  const sortedAll = React.useMemo(() => {
    return [...(leaderboard || [])].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [leaderboard]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedAll;
    return sortedAll.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.gameId || '').toLowerCase().includes(q)
    );
  }, [sortedAll, search]);

  const myRankIndex = sortedAll.findIndex((u) => u.id === currentUserId);
  const nowMs = Date.now();

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3.5">
      {/* Header & Search */}
      <div className="cyber-panel rounded-2xl p-3.5 sm:p-4 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{lang === 'my' ? 'Real-Time ထိပ်တန်းအဆင့်သတ်မှတ်ချက်' : 'Global Live Leaderboard'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'my'
              ? `စုစုပေါင်း ကစားသမား ${sortedAll.length} ဦး • သင့်အဆင့်: #${myRankIndex >= 0 ? myRankIndex + 1 : '-'}`
              : `${sortedAll.length} Ranked Players • Your Rank: #${myRankIndex >= 0 ? myRankIndex + 1 : '-'}`}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'my' ? 'အမည် သို့မဟုတ် Game ID ရှာရန်...' : 'Search player or ID...'}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {!search && sortedAll.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {sortedAll.slice(0, 3).map((u, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
            const isMe = u.id === currentUserId;
            return (
              <motion.button
                key={u.id}
                whileHover={{ y: -3 }}
                type="button"
                onClick={() => onInspectPlayer(u.id)}
                className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 cursor-pointer ${
                  idx === 0 ? 'cyber-gold-active' : 'cyber-panel border border-white/10'
                }`}
              >
                <span className="text-lg leading-none">{medal}</span>
                <AvatarWithFrame
                  avatarUrl={u.avatarUrl}
                  frameId={u.frameId}
                  frames={frames}
                  displayName={u.displayName}
                  size="md"
                />
                <div className="text-xs font-bold text-white truncate max-w-full">
                  {u.displayName} {isMe ? '(သင်)' : ''}
                </div>
                <div className="text-[11px] font-mono font-bold text-amber-400">{u.xp || 0} XP</div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Full Live Ranked Table (Displays ALL Registered Accounts) */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {lang === 'my' ? 'ကစားသမား ရှာမတွေ့ပါ။' : 'No players found.'}
            </div>
          ) : (
            filtered.map((u) => {
              const rankNum = sortedAll.findIndex((x) => x.id === u.id) + 1;
              const isMe = u.id === currentUserId;
              const isOnline = Boolean((u as any).online && nowMs - Number((u as any).lastSeenMs || 0) < 60000);

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onInspectPlayer(u.id)}
                  className={`w-full px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                    isMe ? 'bg-amber-500/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 text-center font-mono text-xs font-bold text-amber-300 shrink-0">
                      {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`}
                    </span>
                    <AvatarWithFrame
                      avatarUrl={u.avatarUrl}
                      frameId={u.frameId}
                      frames={frames}
                      displayName={u.displayName}
                      size="sm"
                      status={isOnline ? 'online' : 'offline'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">{u.displayName}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                            သင်
                          </span>
                        )}
                        {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {u.gameId} · {u.rank || 'Silver'} · {u.wins || 0}W/{u.losses || 0}L
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-mono font-extrabold text-amber-400">
                      {u.xp || 0} XP
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
