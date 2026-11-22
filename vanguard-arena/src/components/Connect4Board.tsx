import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { Language } from '../types.ts';

export type KidMood = 'idle' | 'thinking' | 'dropping' | 'happy' | 'crying';

interface Connect4BoardProps {
  lang: Language;
  match: any;
  currentUserId: string;
  onDropColumn: (col: number) => void;
  onLeaveFinished: () => void;
}

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  lang,
  match,
  currentUserId,
  onDropColumn,
  onLeaveFinished,
}) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const grid: Array<Array<string | null>> =
    match.c4Board || Array.from({ length: 6 }, () => Array(7).fill(null));
  const winningCells: Array<[number, number]> = match.winningCells || [];
  const isFinished = match.status === 'finished';
  const isDraw = Boolean(match.isDraw);
  const userWon = isFinished && !isDraw && match.winnerId === currentUserId;
  const botWon = isFinished && !isDraw && match.winnerId !== currentUserId;

  const kidMood: KidMood = userWon
    ? 'crying'
    : botWon
    ? 'happy'
    : (match.botPhase as KidMood) || 'idle';

  const botTargetCol: number | null =
    typeof match.botTargetCol === 'number' ? match.botTargetCol : null;

  const isUserTurn =
    !isFinished &&
    kidMood === 'idle' &&
    (!match.isRealtimePvp || match.turnUserId === currentUserId);

  const isWinningCell = (r: number, c: number) =>
    winningCells.some(([wr, wc]) => wr === r && wc === c);

  const statusText = () => {
    if (userWon) {
      return lang === 'my'
        ? '🎉 သင် အနိုင်ရရှိပါသည်! ကလေးငယ် ငိုနေပါပြီ'
        : '🎉 You Win! The kid is crying!';
    }
    if (botWon) {
      return lang === 'my'
        ? '😄 ကလေးငယ် အနိုင်ရရှိသွားပါပြီ!'
        : '😄 The Kid Wins & Celebrates!';
    }
    if (isDraw) {
      return lang === 'my' ? '🤝 သရေကျသွားပါပြီ!' : '🤝 It is a Draw!';
    }
    if (kidMood === 'thinking') {
      return lang === 'my'
        ? '🤔 ကလေးငယ် စဥ်းစားနေပါသည်...'
        : '🤔 Kid is thinking...';
    }
    if (kidMood === 'dropping') {
      return lang === 'my'
        ? '🔴 ကလေးငယ် အနီဝိုင်းပြား ချနေပါသည်...'
        : '🔴 Kid is dropping a red disc...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ချပါ'
      : 'Your Turn — Click a column to drop';
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center justify-end pt-4 pb-8 px-3 select-none overflow-hidden">
      {/* Cyber Neon Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full bg-sky-500/15 blur-[90px]" />
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[460px] h-[140px] rounded-full bg-rose-500/15 blur-[80px]" />
      </div>

      {/* Status Pill */}
      <motion.div
        key={statusText()}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-20 mb-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold tracking-wide shadow-lg backdrop-blur-md ${
          userWon
            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
            : botWon
            ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
            : kidMood === 'thinking' || kidMood === 'dropping'
            ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
            : 'bg-[#0d1424]/90 border-sky-400/35 text-amber-300'
        }`}
      >
        {statusText()}
      </motion.div>

      {/* Scene Container: ကလေးငယ် + 4-Row ဘုတ် + စားပွဲခုံ */}
      <div className="relative w-full max-w-[460px] flex flex-col items-center">
        {/* 1. ကလေးငယ် Character */}
        <div className="relative z-10 -mb-10 w-full flex justify-center pointer-events-none">
          <ChildOpponent mood={kidMood} targetCol={botTargetCol} />
        </div>

        {/* 2. Hover Preview (User အလှည့်တွင် အဝါပြား ကြိုပြမည်) */}
        <div className="relative z-20 w-[310px] sm:w-[378px] h-9 grid grid-cols-7 px-2.5 sm:px-3 mb-1">
          {Array.from({ length: 7 }).map((_, c) => {
            const showUserDisc = isUserTurn && hoverCol === c && grid[0][c] === null;
            return (
              <div key={c} className="flex items-center justify-center">
                <AnimatePresence>
                  {showUserDisc && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 shadow-[0_0_16px_rgba(251,191,36,0.85)] border-2 border-yellow-200/80"
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* 3. 4-Row Game Board (ခုံပေါ်တွင် တင်ထားမည်) */}
        <div className="relative z-20">
          <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-900 border-2 border-sky-400/50 shadow-[0_18px_40px_rgba(0,0,0,0.75),0_0_30px_rgba(56,189,248,0.28)]">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 7 }).map((_, colIdx) => {
                const colFull = grid[0][colIdx] !== null;
                const canClick = isUserTurn && !colFull;
                return (
                  <button
                    key={colIdx}
                    type="button"
                    disabled={!canClick}
                    onMouseEnter={() => setHoverCol(colIdx)}
                    onMouseLeave={() => setHoverCol(null)}
                    onClick={() => canClick && onDropColumn(colIdx)}
                    className={`group flex flex-col gap-1.5 sm:gap-2 rounded-xl p-0.5 transition-colors ${
                      canClick
                        ? 'cursor-pointer hover:bg-sky-300/15'
                        : 'cursor-default'
                    } ${botTargetCol === colIdx ? 'bg-rose-400/20' : ''}`}
                    aria-label={`Column ${colIdx + 1}`}
                  >
                    {Array.from({ length: 6 }).map((__, rowIdx) => {
                      const cell = grid[rowIdx][colIdx];
                      const winning = isWinningCell(rowIdx, colIdx);
                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#070c18] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] border border-sky-900/70 flex items-center justify-center overflow-visible"
                        >
                          {cell && (
                            <motion.div
                              key={`${rowIdx}-${colIdx}-${cell}`}
                              initial={{ y: -(rowIdx + 2) * 48, opacity: 0.9 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{
                                type: 'spring',
                                stiffness: 320,
                                damping: 22,
                                mass: 0.85,
                              }}
                              className={`w-[88%] h-[88%] rounded-full border-2 ${
                                cell === 'P1'
                                  ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 border-yellow-100/80 shadow-[0_0_14px_rgba(251,191,36,0.75)]'
                                  : 'bg-gradient-to-br from-rose-400 via-red-500 to-rose-700 border-rose-200/80 shadow-[0_0_14px_rgba(244,63,94,0.85)]'
                              } ${
                                winning
                                  ? 'ring-4 ring-white animate-pulse scale-105'
                                  : ''
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ဘုတ်၏ အောက်ခြေ ထောက်တိုင် */}
          <div className="flex justify-between px-4 -mt-1">
            <div className="w-7 h-5 rounded-b-lg bg-gradient-to-b from-indigo-800 to-slate-900 border-x border-b border-sky-400/40 shadow-md" />
            <div className="w-7 h-5 rounded-b-lg bg-gradient-to-b from-indigo-800 to-slate-900 border-x border-b border-sky-400/40 shadow-md" />
          </div>
        </div>

        {/* 4. စားပွဲခုံ မျက်နှာပြင် (3D Arena Table) */}
        <div className="relative z-10 -mt-3 w-[112%] sm:w-[125%] flex flex-col items-center pointer-events-none">
          <div
            className="w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#131b2e] to-[#0b1120] border-t-2 border-sky-400/40 shadow-[0_-4px_30px_rgba(56,189,248,0.2),0_20px_40px_rgba(0,0,0,0.85)]"
            style={{
              transform: 'perspective(420px) rotateX(48deg)',
            }}
          />
          <div className="w-[94%] h-3.5 -mt-3 rounded-b-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-x border-b border-white/10 shadow-xl" />
        </div>
      </div>

      {/* 5. ကစားပွဲ ပြီးဆုံးသည့်အခါ ပြမည့် Action Bar */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-30 mt-5 w-full max-w-md rounded-2xl cyber-panel border border-amber-400/45 p-4 flex items-center justify-between gap-3 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  userWon
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : botWon
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {userWon ? <Trophy className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {userWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သင်နိုင်ပါသည်!'
                      : 'Match Over — Victory!'
                    : botWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သင်ရှုံးပါသည်'
                      : 'Match Over — Defeat'
                    : lang === 'my'
                    ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သရေ'
                    : 'Match Over — Draw'}
                </div>
                <div className="text-xs text-slate-400">
                  {userWon
                    ? lang === 'my'
                      ? 'ကလေးငယ် ဝမ်းနည်းပြီး ငိုနေပါပြီ'
                      : 'The kid is crying after losing'
                    : botWon
                    ? lang === 'my'
                      ? 'ကလေးငယ် ပျော်ရွှင်အောင်ပွဲခံနေပါသည်'
                      : 'The kid is celebrating happily'
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLeaveFinished}
              className="px-4 h-10 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ပြန်ထွက်မည်' : 'Lobby'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChildOpponent: React.FC<{ mood: KidMood; targetCol: number | null }> = ({
  mood,
  targetCol,
}) => {
  const handOffsetX = targetCol !== null ? (targetCol - 3) * 44 : 0;

  return (
    <div className="relative w-64 h-44 flex items-end justify-center">
      {/* Thinking Bubble */}
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute -top-1 right-4 px-3 py-1.5 rounded-2xl bg-slate-900/95 border border-sky-400/50 text-sky-200 text-xs font-bold shadow-lg flex items-center gap-1"
          >
            <span>hmm</span>
            <motion.span
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            >
              ...
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Happy Celebration Sparkles */}
      <AnimatePresence>
        {mood === 'happy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[
              { x: 24, y: 12, color: '#fbbf24' },
              { x: 215, y: 16, color: '#f43f5e' },
              { x: 46, y: 58, color: '#38bdf8' },
              { x: 198, y: 62, color: '#34d399' },
            ].map((sp, idx) => (
              <motion.div
                key={idx}
                animate={{ y: [0, -14, 0], scale: [0.8, 1.35, 0.8], rotate: [0, 180, 360] }}
                transition={{ repeat: Infinity, duration: 1.2 + idx * 0.2 }}
                style={{ left: sp.x, top: sp.y, backgroundColor: sp.color }}
                className="absolute w-2.5 h-2.5 rounded-full shadow-lg"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Child SVG Body */}
      <motion.svg
        viewBox="0 0 220 180"
        className="w-56 h-44 drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
        animate={
          mood === 'happy'
            ? { y: [0, -14, 0], rotate: [-2, 2, -2] }
            : mood === 'crying'
            ? { y: [0, 2, 0], x: [-2, 2, -2] }
            : mood === 'thinking'
            ? { rotate: [-3, 3, -3] }
            : { y: [0, -3, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: mood === 'happy' ? 0.55 : mood === 'crying' ? 0.35 : 2.4,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id="kidShirt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id="redDiscGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="45%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#9f1239" />
          </radialGradient>
        </defs>

        {/* Torso / T-Shirt */}
        <path
          d="M55 178 C55 128, 75 112, 110 112 C145 112, 165 128, 165 178 Z"
          fill="url(#kidShirt)"
          stroke="#7dd3fc"
          strokeWidth="2"
        />

        {/* Neck */}
        <rect x="98" y="98" width="24" height="20" rx="10" fill="#f6c6a5" />

        {/* Ears */}
        <circle cx="64" cy="70" r="11" fill="#f3be9a" />
        <circle cx="156" cy="70" r="11" fill="#f3be9a" />

        {/* Head */}
        <ellipse cx="110" cy="68" rx="46" ry="44" fill="#fbd3b6" />

        {/* Hair */}
        <path
          d="M62 64 C62 26, 86 16, 112 16 C142 16, 158 32, 158 64 C150 48, 138 42, 125 46 C115 36, 98 36, 86 48 C76 44, 68 52, 62 64 Z"
          fill="#1e293b"
        />

        {/* Blush Cheeks */}
        <ellipse cx="80" cy="80" rx="8" ry="4.5" fill="#fb7185" opacity="0.38" />
        <ellipse cx="140" cy="80" rx="8" ry="4.5" fill="#fb7185" opacity="0.38" />

        {/* Eyes & Eyebrows by Mood */}
        {mood === 'happy' ? (
          <>
            <path d="M82 68 Q92 56 102 68" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M118 68 Q128 56 138 68" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'crying' ? (
          <>
            <path d="M80 54 L100 60" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M140 54 L120 60" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="92" cy="68" rx="6" ry="5" fill="#0f172a" />
            <ellipse cx="128" cy="68" rx="6" ry="5" fill="#0f172a" />
            <circle cx="90" cy="66" r="2" fill="#fff" />
            <circle cx="126" cy="66" r="2" fill="#fff" />

            <motion.path
              d="M88 76 C84 84, 92 88, 92 82 C92 78, 88 76, 88 76 Z"
              fill="#38bdf8"
              animate={{ y: [0, 26], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            />
            <motion.path
              d="M132 76 C128 84, 136 88, 136 82 C136 78, 132 76, 132 76 Z"
              fill="#38bdf8"
              animate={{ y: [0, 26], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: 0.45 }}
            />
          </>
        ) : (
          <motion.g
            animate={mood === 'thinking' ? { x: [-3, 4, -3], y: [-2, -2, -2] } : { x: 0, y: 0 }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            <circle cx="92" cy="67" r="6.5" fill="#0f172a" />
            <circle cx="128" cy="67" r="6.5" fill="#0f172a" />
            <circle cx="90" cy="65" r="2.2" fill="#ffffff" />
            <circle cx="126" cy="65" r="2.2" fill="#ffffff" />
          </motion.g>
        )}

        {/* Mouth by Mood */}
        {mood === 'happy' ? (
          <path d="M92 84 Q110 104 128 84 Z" fill="#be123c" stroke="#881337" strokeWidth="2" />
        ) : mood === 'crying' ? (
          <path d="M94 94 Q110 80 126 94" stroke="#881337" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : mood === 'thinking' ? (
          <circle cx="114" cy="88" r="4" fill="#9f1239" />
        ) : (
          <path d="M96 86 Q110 96 124 86" stroke="#9f1239" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}

        {/* Left Arm */}
        <motion.path
          d={
            mood === 'happy'
              ? 'M62 132 Q36 96 42 74'
              : mood === 'thinking'
              ? 'M62 132 Q66 106 88 94'
              : 'M62 132 Q44 148 54 166'
          }
          stroke="#fbd3b6"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Arm + အနီရောင် အဝိုင်းပြား */}
        <motion.g
          animate={
            mood === 'dropping'
              ? { x: handOffsetX * 0.45, y: 18 }
              : mood === 'happy'
              ? { x: 0, y: -22 }
              : { x: 0, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <circle cx="164" cy="118" r="11" fill="#fbd3b6" stroke="#e2a884" strokeWidth="1.5" />
          {mood !== 'crying' && (
            <motion.circle
              cx="164"
              cy="106"
              r="15"
              fill="url(#redDiscGrad)"
              stroke="#fecdd3"
              strokeWidth="2"
              animate={
                mood === 'dropping'
                  ? { y: [0, 32], opacity: [1, 0] }
                  : { y: [0, -3, 0] }
              }
              transition={
                mood === 'dropping'
                  ? { duration: 0.45, ease: 'easeIn' }
                  : { repeat: Infinity, duration: 1.8 }
              }
            />
          )}
        </motion.g>
      </motion.svg>
    </div>
  );
};
