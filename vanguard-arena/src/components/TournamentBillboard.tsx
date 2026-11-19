import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Radio, Sparkles, Swords, Trophy, Users } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, Tournament, UserProfile } from '../types.ts';
import { GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, GiftTrophyIcon, PodiumMedalIcon, RankTierIcon } from './PremiumIcons.tsx';

interface TournamentBillboardProps {
  lang: Language;
  tournaments: Tournament[];
  allUsers: UserProfile[];
  frames?: any[];
  onInspectPlayer?: (userId: string) => void;
  onOpenTournaments?: () => void;
}

export const TournamentBillboard: React.FC<TournamentBillboardProps> = ({
  lang,
  tournaments,
  allUsers,
  frames = [],
  onInspectPlayer,
  onOpenTournaments,
}) => {
  // Prioritize Ongoing (LIVE) tournaments, then Featured Open tournaments
  const featuredList = React.useMemo(() => {
    const safe = Array.isArray(tournaments) ? tournaments : [];
    const live = safe.filter((t) => t.status === 'ongoing');
    const featuredOpen = safe.filter(
      (t) => t.status === 'open' && (t.featuredOnBillboard || (t.participants || []).length > 0)
    );
    const recentCompleted = safe.filter((t) => t.status === 'completed' && (t.winners || []).length > 0);
    return [...live, ...featuredOpen, ...recentCompleted];
  }, [tournaments]);

  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (activeIdx >= featuredList.length) setActiveIdx(0);
  }, [featuredList.length, activeIdx]);

  if (featuredList.length === 0) return null;

  const active = featuredList[activeIdx] || featuredList[0];
  const normGame = normalizeGameId(active.gameType);
  const participantIds = Array.isArray(active.participants) ? active.participants : [];
  const participants = participantIds
    .map((pid) => allUsers.find((u) => u.id === pid))
    .filter(Boolean) as UserProfile[];
  const matchups = Array.isArray(active.matchups) ? active.matchups : [];
  const winners = Array.isArray(active.winners) ? active.winners : [];
  const isLive = active.status === 'ongoing';
  const isCompleted = active.status === 'completed';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-amber-400/50 bg-[#080d18] shadow-[0_0_40px_rgba(245,158,11,0.16)]"
    >
      {/* Top Neon Gold Esports Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-yellow-300 to-rose-500" />

      {/* Background Artwork Overlay */}
      <div className="relative">
        <img
          src={GAME_ARTWORKS[normGame]}
          alt={active.title}
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#0b1224]/90 to-[#140a05]/85 pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-5 space-y-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/25 to-rose-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                <GameBadgeIcon gameType={normGame} className="w-7 h-7" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/60 text-[10px] font-extrabold text-rose-200 tracking-wider animate-pulse">
                      <Radio className="w-3 h-3 text-rose-400" />
                      {lang === 'my' ? 'ပြိုင်ပွဲ စတင်ယှဉ်ပြိုင်နေပြီ (LIVE)' : 'LIVE TOURNAMENT ARENA'}
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-extrabold text-amber-200">
                      <Trophy className="w-3 h-3" /> HALL OF FAME
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-extrabold text-emerald-200">
                      <Sparkles className="w-3 h-3" /> REGISTRATION OPEN
                    </span>
                  )}

                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    +{active.prizeXp || 500} XP {active.prizeLabel ? `• ${active.prizeLabel}` : ''}
                  </span>
                </div>

                <h3 className="text-base sm:text-xl font-display font-extrabold text-white truncate mt-0.5">
                  {active.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {featuredList.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i - 1 + featuredList.length) % featuredList.length)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-1">
                    {activeIdx + 1}/{featuredList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i + 1) % featuredList.length)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {onOpenTournaments && (
                <button
                  type="button"
                  onClick={onOpenTournaments}
                  className="px-3.5 h-8 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-[11px] cursor-pointer"
                >
                  {lang === 'my' ? 'ပြိုင်ပွဲကြည့်မည်' : 'View Arena'}
                </button>
              )}
            </div>
          </div>

          {/* Hall of Fame Winners Strip (if completed) */}
          {isCompleted && winners.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-2.5">
              {winners.slice(0, 3).map((w, idx) => (
                <button
                  key={`${w.userId}_${idx}`}
                  type="button"
                  onClick={() => onInspectPlayer?.(w.userId)}
                  className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-[#0d1425] to-[#080c16] border border-amber-400/40 flex items-center gap-3 text-left hover:border-amber-300 transition-all cursor-pointer"
                >
                  <PodiumMedalIcon place={(idx + 1) as 1 | 2 | 3} className="w-8 h-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-white truncate">{w.displayName}</div>
                    <div className="text-[10px] text-amber-300 truncate flex items-center gap-1">
                      <GiftTrophyIcon iconId={w.giftIconId} className="w-3.5 h-3.5 shrink-0" />
                      <span>{w.giftName} (+{w.bonusXp} XP)</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Live Matchups Ticker (if generated by Admin) */}
          {!isCompleted && matchups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ယှဉ်ပြိုင်နေသော ပွဲစဉ်များ (Live Matchups)' : 'Active Bracket Matchups'}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {matchups.map((m) => {
                  const p1 = allUsers.find((u) => u.id === m.player1Id);
                  const p2 = m.player2Id ? allUsers.find((u) => u.id === m.player2Id) : null;
                  return (
                    <div
                      key={m.id}
                      className="px-3 py-2 rounded-xl bg-[#070b14]/90 border border-amber-400/25 flex items-center justify-between gap-2 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => p1 && onInspectPlayer?.(p1.id)}
                        className="font-bold text-white truncate hover:text-amber-300 cursor-pointer"
                      >
                        {p1?.displayName || 'TBD'}
                      </button>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono font-extrabold text-amber-300 shrink-0">
                        VS
                      </span>
                      <button
                        type="button"
                        onClick={() => p2 && onInspectPlayer?.(p2.id)}
                        className="font-bold text-white truncate hover:text-amber-300 cursor-pointer text-right"
                      >
                        {p2?.displayName || 'BYE'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium Contenders Roster Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'my'
                  ? `ပါဝင်ယှဉ်ပြိုင်သူများ စာရင်း (${participants.length}/${active.bracketSize} ဦး)`
                  : `Official Contenders Roster (${participants.length}/${active.bracketSize})`}
              </span>
              <span className="text-[10px] text-slate-400">
                {lang === 'my' ? 'ကစားသမားပုံနှိပ်၍ Profile ကြည့်နိုင်သည်' : 'Tap any player to inspect profile'}
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 rounded-xl bg-black/30 border border-white/5">
                {lang === 'my'
                  ? 'ပထမဆုံး စာရင်းသွင်းမည့် ချန်ပီယံ ဖြစ်လိုက်ပါ!'
                  : 'Be the first contender to enter the arena!'}
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                {participants.map((p, idx) => {
                  const online = Boolean(p.online && Date.now() - Number(p.lastSeenMs || 0) < 60000);
                  return (
                    <motion.button
                      key={p.id}
                      whileHover={{ y: -2 }}
                      type="button"
                      onClick={() => onInspectPlayer?.(p.id)}
                      className="min-w-[168px] p-2.5 rounded-xl bg-gradient-to-b from-[#11192d]/95 to-[#070b14]/95 border border-amber-400/30 hover:border-amber-300 flex items-center gap-2.5 text-left shrink-0 cursor-pointer transition-all"
                    >
                      <div className="relative shrink-0">
                        <AvatarWithFrame
                          avatarUrl={p.avatarUrl}
                          frameId={p.frameId}
                          frames={frames}
                          displayName={p.displayName}
                          size="sm"
                          status={online ? 'online' : 'offline'}
                        />
                        <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[9px] font-mono font-extrabold">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white truncate">{p.displayName}</span>
                          <RankTierIcon tier={p.rank || 'silver'} className="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <div className="text-[10px] font-mono text-amber-300 truncate">{p.gameId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.xp || 0} XP · {p.wins || 0}W
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
