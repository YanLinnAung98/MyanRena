import React from 'react';
import { motion } from 'motion/react';
import { Award, Search, Trophy } from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GiftTrophyIcon, PodiumMedalIcon, RankTierIcon } from './PremiumIcons.tsx';

interface LeaderboardViewProps {
  lang: Language;
  leaderboard: UserProfile[];
  currentUser: UserProfile;
  frames: any[];
  onInspectPlayer?: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  lang,
  leaderboard,
  currentUser,
  frames,
  onInspectPlayer,
}) => {
  const [search, setSearch] = React.useState('');

  const sorted = React.useMemo(() => {
    return [...(leaderboard || [])]
      .filter((u) => u && u.id)
      .sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [leaderboard]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.gameId || '').toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const top3 = sorted.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as UserProfile[];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* Header + Search */}
      <div className="cyber-panel rounded-2xl p-4 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{lang === 'my' ? 'ထိပ်တန်း ကစားသမားများ ဇယား' : 'Global Vanguard Leaderboard'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'my'
              ? 'ကစားသမားတစ်ဦးချင်းစီကို နှိပ်၍ Banner, Bio နှင့် ဆုတံဆိပ်များ ကြည့်ရှုနိုင်ပါသည်။'
              : 'Tap any player to inspect their banner, bio, and trophy showcase.'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'my' ? 'အမည် သို့မဟုတ် Game ID ရှာရန်...' : 'Search player or ID...'}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Top 3 Esports Podium */}
      {!search.trim() && top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end">
          {podiumOrder.map((u) => {
            const actualPlace = (sorted.findIndex((item) => item.id === u.id) + 1) as 1 | 2 | 3;
            const isFirst = actualPlace === 1;
            const giftCount = Array.isArray(u.gifts) ? u.gifts.length : 0;
            return (
              <motion.button
                key={u.id}
                whileHover={{ y: -4 }}
                type="button"
                onClick={() => onInspectPlayer?.(u.id)}
                className={`rounded-2xl p-3 sm:p-4 border flex flex-col items-center text-center cursor-pointer transition-all ${
                  isFirst
                    ? 'bg-gradient-to-b from-amber-500/20 via-[#0e1526] to-[#070b14] border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] sm:py-6'
                    : 'cyber-panel border-white/15 hover:border-amber-400/40'
                }`}
              >
                <PodiumMedalIcon
                  place={actualPlace}
                  className={isFirst ? 'w-10 h-10 mb-2' : 'w-8 h-8 mb-1.5'}
                />
                <AvatarWithFrame
                  avatarUrl={u.avatarUrl}
                  frameId={u.frameId}
                  frames={frames}
                  displayName={u.displayName}
                  size={isFirst ? 'lg' : 'md'}
                  status={u.online ? 'online' : 'offline'}
                />
                <div className="mt-2 flex items-center justify-center gap-1 max-w-full">
                  <span className="text-xs sm:text-sm font-display font-bold text-white truncate">
                    {u.displayName}
                  </span>
                  <RankTierIcon tier={u.rank || 'silver'} className="w-4 h-4 shrink-0" />
                </div>
                <div className="text-[10px] font-mono text-amber-300 mt-0.5">{u.xp || 0} XP</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {u.wins || 0}W / {u.losses || 0}L
                </div>
                {giftCount > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-[10px] font-bold text-amber-200">
                    <GiftTrophyIcon iconId={u.gifts?.[0]?.iconId} className="w-3.5 h-3.5" />
                    <span>{giftCount}</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Full Ranking List */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              {lang === 'my' ? 'ကစားသမား ရှာမတွေ့ပါ။' : 'No players found.'}
            </div>
          ) : (
            filtered.map((u) => {
              const rankNum = sorted.findIndex((item) => item.id === u.id) + 1;
              const isMe = u.id === currentUser.id;
              const total = (u.wins || 0) + (u.losses || 0) + (u.draws || 0);
              const wr = total > 0 ? Math.round(((u.wins || 0) / total) * 100) : 0;
              const giftsCount = Array.isArray(u.gifts) ? u.gifts.length : 0;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onInspectPlayer?.(u.id)}
                  className={`w-full px-3.5 sm:px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    isMe
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {rankNum <= 3 ? (
                        <PodiumMedalIcon place={rankNum as 1 | 2 | 3} className="w-6 h-6" />
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-400">#{rankNum}</span>
                      )}
                    </div>

                    <AvatarWithFrame
                      avatarUrl={u.avatarUrl}
                      frameId={u.frameId}
                      frames={frames}
                      displayName={u.displayName}
                      size="sm"
                      status={u.online ? 'online' : 'offline'}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {u.displayName}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold">
                            YOU
                          </span>
                        )}
                        <RankTierIcon tier={u.rank || 'silver'} className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                        <span className="text-amber-300/90">{u.gameId}</span>
                        <span>· {u.rank || 'Silver'}</span>
                        {giftsCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-300">
                            <Award className="w-3 h-3" /> {giftsCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-mono font-extrabold text-amber-400">
                      {u.xp || 0} XP
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {u.wins || 0}W · {wr}% WR
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
