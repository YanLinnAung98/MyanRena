import React from 'react';
import { motion } from 'motion/react';
import { Award, Calendar, CheckCircle2, Lock, Shield, Swords, Trophy, Users } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, Tournament, UserProfile } from '../types.ts';
import { GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, GiftTrophyIcon, PodiumMedalIcon } from './PremiumIcons.tsx';
import { TournamentBillboard } from './TournamentBillboard.tsx';

interface TournamentViewProps {
  lang: Language;
  tournaments: Tournament[];
  featureLocks: Record<string, boolean>;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  frames: any[];
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onInspectPlayer?: (userId: string) => void;
  onLaunchBracketMatch: (tournamentId: string, bmId: string) => void;
}

function safeGameLabel(rawType: string | undefined, lang: Language): string {
  const norm = normalizeGameId(rawType);
  if (norm === 'connect4') return lang === 'my' ? '၄ လုံးတန်း (4 in a Row)' : '4 in a Row';
  if (norm === 'tictactoe') return 'Tic-Tac-Toe (X / O)';
  if (norm === 'rps') return lang === 'my' ? 'ကျောက်တုံး စက္ကူ ကတ်ကြေး' : 'Rock Paper Scissors';
  return lang === 'my' ? 'ဉာဏ်စမ်းပဟေဠိ' : 'Wise Owl Quiz';
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  lang,
  tournaments,
  featureLocks,
  currentUser,
  allUsers = [],
  frames,
  onJoin,
  onLeave,
  onInspectPlayer,
}) => {
  const locked = Boolean(featureLocks?.tournaments);
  const safeList = Array.isArray(tournaments) ? tournaments : [];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Premium Live Tournament Billboard */}
      <TournamentBillboard
        lang={lang}
        tournaments={safeList}
        allUsers={allUsers}
        frames={frames}
        onInspectPlayer={onInspectPlayer}
      />

      {/* Arena Header */}
      <div className="cyber-panel rounded-2xl p-4 border border-amber-500/25 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{lang === 'my' ? 'တရားဝင် ပြိုင်ပွဲကြီးများ (Official Tournaments)' : 'Official Knockout Tournaments'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'my'
              ? 'Admin မှ ဖန်တီးထားသော 8 / 16 / 32 Bracket ပြိုင်ပွဲများတွင် ဝင်ရောက်ယှဉ်ပြိုင်ပြီး အထူးဆုလက်ဆောင်များ ရယူပါ။'
              : 'Compete in official 8 / 16 / 32 player brackets to earn exclusive trophies and gifts.'}
          </p>
        </div>
        {locked && (
          <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Locked
          </span>
        )}
      </div>

      {safeList.length === 0 ? (
        <div className="cyber-panel rounded-2xl p-10 text-center space-y-2">
          <Swords className="w-10 h-10 text-amber-400/60 mx-auto" />
          <div className="text-sm font-bold text-white">
            {lang === 'my' ? 'လက်ရှိ ပြိုင်ပွဲအသစ် မရှိသေးပါ' : 'No Active Tournaments Yet'}
          </div>
          <p className="text-xs text-slate-400">
            {lang === 'my'
              ? 'Admin မှ ပြိုင်ပွဲအသစ် ဖန်တီးလိုက်သည်နှင့် ဤနေရာတွင် Real-Time တိုက်ရိုက်ပေါ်လာပါမည်။'
              : 'New tournaments created by the Administrator will appear here live.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {safeList.map((tr) => {
            const normGame = normalizeGameId(tr.gameType);
            const participants: string[] = Array.isArray(tr.participants) ? tr.participants : [];
            const participantProfiles = participants
              .map((pid) => allUsers.find((u) => u.id === pid))
              .filter(Boolean) as UserProfile[];
            const isJoined = participants.includes(currentUser.id);
            const maxSlots = Number(tr.bracketSize) || 8;
            const isFull = participants.length >= maxSlots;
            const minXp = Number(tr.minXpRequired || 0);
            const meetsXp = (currentUser.xp || 0) >= minXp || currentUser.role === 'admin';
            const status = String(tr.status || 'open').toLowerCase();
            const winners = Array.isArray(tr.winners) ? tr.winners : [];

            return (
              <motion.div
                key={tr.id}
                whileHover={{ y: -3 }}
                className="cyber-panel rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between"
              >
                <div className="h-32 w-full relative bg-[#070b14]">
                  <img
                    src={GAME_ARTWORKS[normGame]}
                    alt={tr.title || 'Tournament'}
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-[#0b101d]/45 to-transparent" />
                  <div className="absolute top-2.5 left-3 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        status === 'ongoing'
                          ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
                          : status === 'completed'
                          ? 'bg-slate-800/90 border-white/20 text-slate-300'
                          : 'bg-black/70 border-amber-400/50 text-amber-300'
                      }`}
                    >
                      {status === 'ongoing' ? '● LIVE' : status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-semibold text-sky-300 flex items-center gap-1">
                      <GameBadgeIcon gameType={normGame} className="w-3.5 h-3.5" />
                      {safeGameLabel(tr.gameType, lang)}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                    <h3 className="text-base font-display font-bold text-white truncate">
                      {tr.title || 'Vanguard Cup'}
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 shrink-0">
                      <Award className="w-3.5 h-3.5" /> +{tr.prizeXp || 300} XP
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {(tr.prizeLabel || tr.scheduledAt || minXp > 0) && (
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {tr.prizeLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-200 font-semibold">
                            Prize: {tr.prizeLabel}
                          </span>
                        )}
                        {tr.scheduledAt && (
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-sky-400" /> {tr.scheduledAt}
                          </span>
                        )}
                        {minXp > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-200 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Min {minXp} XP
                          </span>
                        )}
                      </div>
                    )}

                    {tr.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2">{tr.description}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        {participants.length} / {maxSlots} {lang === 'my' ? 'ဦး စာရင်းသွင်းပြီး' : 'Registered'}
                      </span>
                      {isJoined && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Joined
                        </span>
                      )}
                    </div>

                    <div className="h-2 rounded-full bg-[#070b14] overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                        style={{ width: `${Math.min(100, (participants.length / maxSlots) * 100)}%` }}
                      />
                    </div>

                    {/* Mini Avatar Strip of Contenders */}
                    {participantProfiles.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
                        {participantProfiles.slice(0, 8).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onInspectPlayer?.(p.id)}
                            title={`${p.displayName} (${p.gameId})`}
                            className="shrink-0 cursor-pointer hover:scale-105 transition-transform"
                          >
                            <AvatarWithFrame
                              avatarUrl={p.avatarUrl}
                              frameId={p.frameId}
                              frames={frames}
                              displayName={p.displayName}
                              size="xs"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Awarded Winners Display */}
                    {winners.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-[#070b14] border border-amber-400/25 space-y-1.5">
                        <div className="text-[10px] font-bold text-amber-300 uppercase">
                          {lang === 'my' ? 'ဆုရရှိသူများ' : 'Official Winners'}
                        </div>
                        {winners.map((w, i) => (
                          <button
                            key={`${w.userId}_${i}`}
                            type="button"
                            onClick={() => onInspectPlayer?.(w.userId)}
                            className="w-full flex items-center justify-between text-[11px] hover:bg-white/5 px-1.5 py-1 rounded-lg cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 font-bold text-white truncate">
                              <PodiumMedalIcon place={(Math.min(3, i + 1)) as 1 | 2 | 3} className="w-4 h-4 shrink-0" />
                              <span className="truncate">{w.displayName}</span>
                            </span>
                            <span className="text-[10px] text-amber-300 flex items-center gap-1 shrink-0">
                              <GiftTrophyIcon iconId={w.giftIconId} className="w-3.5 h-3.5" />
                              +{w.bonusXp} XP
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {status === 'completed' ? (
                      <div className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 flex items-center justify-center">
                        {lang === 'my' ? 'ပြိုင်ပွဲ ပြီးဆုံးသွားပါပြီ' : 'Tournament Completed'}
                      </div>
                    ) : isJoined ? (
                      <button
                        type="button"
                        disabled={status === 'ongoing'}
                        onClick={() => onLeave(tr.id)}
                        className="w-full h-10 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-45 border border-rose-500/40 text-xs font-bold text-rose-300 cursor-pointer"
                      >
                        {status === 'ongoing'
                          ? lang === 'my' ? 'ပြိုင်ပွဲ စတင်နေပါပြီ' : 'Match In Progress'
                          : lang === 'my' ? 'ပြိုင်ပွဲမှ နုတ်ထွက်မည်' : 'Withdraw'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={locked || isFull || status !== 'open' || !meetsXp}
                        onClick={() => onJoin(tr.id)}
                        className="w-full h-10 rounded-xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        {!meetsXp
                          ? lang === 'my' ? `အနည်းဆုံး ${minXp} XP လိုအပ်သည်` : `Requires ${minXp} XP`
                          : isFull
                          ? lang === 'my' ? 'လူပြည့်သွားပါပြီ' : 'Bracket Full'
                          : status === 'ongoing'
                          ? lang === 'my' ? 'ပြိုင်ပွဲ စတင်နေပါပြီ' : 'Ongoing'
                          : lang === 'my' ? 'ပြိုင်ပွဲ ဝင်ရောက်မည်' : 'Join Tournament'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
