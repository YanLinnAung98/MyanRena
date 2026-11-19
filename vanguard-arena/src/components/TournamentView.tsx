import React from 'react';
import { motion } from 'motion/react';
import { Award, CheckCircle2, Lock, Swords, Trophy, Users } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, UserProfile } from '../types.ts';
import { GAME_ARTWORKS } from '../utils/gameArtworks.ts';

interface TournamentViewProps {
  lang: Language;
  tournaments: any[];
  featureLocks: Record<string, boolean>;
  currentUser: UserProfile;
  frames: any[];
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
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
  onJoin,
  onLeave,
}) => {
  const locked = Boolean(featureLocks?.tournaments);
  const safeList = Array.isArray(tournaments) ? tournaments : [];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <div className="cyber-panel rounded-2xl p-4 border border-amber-500/25 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{lang === 'my' ? 'တရားဝင် ပြိုင်ပွဲကြီးများ (Tournaments)' : 'Official Knockout Tournaments'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'my'
              ? 'Admin မှ ဖန်တီးထားသော 8 / 16 / 32 Bracket ပြိုင်ပွဲများတွင် စာရင်းသွင်း ယှဉ်ပြိုင်ပါ။'
              : 'Register and compete in official 8 / 16 / 32 player knockout brackets.'}
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
            const isJoined = participants.includes(currentUser.id);
            const maxSlots = Number(tr.bracketSize) || 8;
            const isFull = participants.length >= maxSlots;
            const status = String(tr.status || 'open').toLowerCase();

            return (
              <motion.div
                key={tr.id}
                whileHover={{ y: -3 }}
                className="cyber-panel rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between"
              >
                <div className="h-28 w-full relative bg-[#070b14]">
                  <img
                    src={GAME_ARTWORKS[normGame]}
                    alt={tr.title || 'Tournament'}
                    className="w-full h-full object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-[#0b101d]/40 to-transparent" />
                  <div className="absolute top-2.5 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 border border-amber-400/50 text-[10px] font-bold uppercase text-amber-300">
                      {status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 text-[10px] font-semibold text-sky-300">
                      {safeGameLabel(tr.gameType, lang)}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                    <h3 className="text-base font-display font-bold text-white truncate">
                      {tr.title || 'Vanguard Cup'}
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 shrink-0">
                      <Award className="w-3.5 h-3.5" /> +{tr.prizeXp || 300} XP
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
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

                  {isJoined ? (
                    <button
                      type="button"
                      onClick={() => onLeave(tr.id)}
                      className="w-full h-10 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 cursor-pointer"
                    >
                      {lang === 'my' ? 'ပြိုင်ပွဲမှ နုတ်ထွက်မည်' : 'Withdraw'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={locked || isFull || status !== 'open'}
                      onClick={() => onJoin(tr.id)}
                      className="w-full h-10 rounded-xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-xs cursor-pointer"
                    >
                      {isFull
                        ? lang === 'my' ? 'လူပြည့်သွားပါပြီ' : 'Bracket Full'
                        : lang === 'my' ? 'ပြိုင်ပွဲ ဝင်ရောက်မည်' : 'Join Tournament'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
