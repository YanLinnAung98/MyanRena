import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import {
  CONNECT4_ASSET_CONFIG,
  resolveMediaSlot,
  type ResolvedMediaAsset,
} from '../config/connect4Assets.ts';
import type { Language } from '../types.ts';
import {
  Connect4LoadingScreen,
  SeamlessMediaBackdrop,
} from './Connect4MediaKit.tsx';

export type KidMood = 'idle' | 'thinking' | 'dropping' | 'happy' | 'crying';

const toSvgUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

// Bot Profile တွင် သုံးမည့် မောင်ဖိုးသား Avatar
export const KID_BOT_AVATAR_DATA_URI = toSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="avBg" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0b1224"/>
    </radialGradient>
    <linearGradient id="hoodieG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="skinG" cx="45%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#ffe1c9"/>
      <stop offset="100%" stop-color="#eab38f"/>
    </radialGradient>
  </defs>
  <rect width="120" height="120" rx="24" fill="url(#avBg)"/>
  <circle cx="24" cy="24" r="1.5" fill="#93c5fd" opacity="0.8"/>
  <circle cx="96" cy="28" r="2" fill="#fde047" opacity="0.7"/>
  <circle cx="102" cy="54" r="1.2" fill="#38bdf8" opacity="0.8"/>
  <path d="M22 120 C24 90, 38 82, 60 82 C82 82, 96 90, 98 120 Z" fill="url(#hoodieG)" stroke="#94a3b8" stroke-width="1.5"/>
  <path d="M44 86 Q60 100 76 86" fill="none" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="30" cy="60" r="7.5" fill="#e8ae88"/>
  <circle cx="90" cy="60" r="7.5" fill="#e8ae88"/>
  <ellipse cx="60" cy="58" rx="28" ry="27" fill="url(#skinG)"/>
  <path d="M30 55 C28 28, 44 16, 62 16 C82 16, 92 30, 90 55 C84 42, 75 38, 68 41 C62 32, 48 33, 41 42 C36 39, 32 46, 30 55 Z" fill="#1e1b18"/>
  <path d="M40 46 Q48 42 54 45" stroke="#292524" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M66 45 Q72 42 80 46" stroke="#292524" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="58" rx="4.8" ry="5.2" fill="#ffffff"/>
  <ellipse cx="72" cy="58" rx="4.8" ry="5.2" fill="#ffffff"/>
  <circle cx="48.5" cy="58.5" r="3" fill="#2b1810"/>
  <circle cx="71.5" cy="58.5" r="3" fill="#2b1810"/>
  <circle cx="47.2" cy="57" r="1.2" fill="#ffffff"/>
  <circle cx="70.2" cy="57" r="1.2" fill="#ffffff"/>
  <ellipse cx="40" cy="66" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.35"/>
  <ellipse cx="80" cy="66" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.35"/>
  <path d="M51 71 Q60 79 69 71" stroke="#9f1239" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>
`);

export function getConnect4BotName(lang: Language, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Mg Pho Thar';
  if (!difficulty) return base;
  return `${base} (${String(difficulty).toUpperCase()})`;
}

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
  const [bgMedia, setBgMedia] = useState<ResolvedMediaAsset>({ kind: 'none', url: null });
  const [isLoadingScene, setIsLoadingScene] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);

  // နောက်ခံ Video / Image ကို အလိုအလျောက် ရှာဖွေပြီး Loading Progress ထိန်းချုပ်မည်
  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();
    let mediaReady = false;

    const finishLoading = () => {
      if (!mounted) return;
      const elapsed = Date.now() - startedAt;
      const waitMore = Math.max(0, CONNECT4_ASSET_CONFIG.loadingScreen.minDisplayMs - elapsed);
      setLoadProgress(100);
      window.setTimeout(() => {
        if (mounted) setIsLoadingScene(false);
      }, waitMore);
    };

    const progressTicker = window.setInterval(() => {
      setLoadProgress((prev) => (prev < 88 ? prev + 7 : prev));
    }, 180);

    // Safety Timeout: အင်တာနက် အရမ်းနှေးလျှင်လည်း ဂိမ်းထဲ ဝင်ခွင့်ပေးမည်
    const safetyTimer = window.setTimeout(() => {
      if (!mediaReady) {
        mediaReady = true;
        finishLoading();
      }
    }, CONNECT4_ASSET_CONFIG.loadingScreen.maxWaitMs);

    resolveMediaSlot('background').then((resolved) => {
      if (!mounted) return;
      setBgMedia(resolved);
      setLoadProgress((p) => Math.max(p, 55));
      if (resolved.kind === 'none') {
        mediaReady = true;
        finishLoading();
      }
    });

    return () => {
      mounted = false;
      window.clearInterval(progressTicker);
      window.clearTimeout(safetyTimer);
    };
  }, []);

  const handleBackdropReady = () => {
    setLoadProgress(100);
    window.setTimeout(() => setIsLoadingScene(false), 260);
  };

  const hasCustomRoomBackdrop = bgMedia.kind === 'video' || bgMedia.kind === 'image';

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
    !isLoadingScene &&
    !isFinished &&
    kidMood === 'idle' &&
    (!match.isRealtimePvp || match.turnUserId === currentUserId);

  const isWinningCell = (r: number, c: number) =>
    winningCells.some(([wr, wc]) => wr === r && wc === c);

  const statusText = () => {
    if (userWon) {
      return lang === 'my'
        ? '🎉 သင် အနိုင်ရရှိပါသည်! မောင်ဖိုးသား ငိုနေပါပြီ'
        : '🎉 You Win! Mg Pho Thar is crying!';
    }
    if (botWon) {
      return lang === 'my'
        ? '😄 မောင်ဖိုးသား အနိုင်ရရှိသွားပါပြီ!'
        : '😄 Mg Pho Thar Wins & Celebrates!';
    }
    if (isDraw) {
      return lang === 'my' ? '🤝 သရေကျသွားပါပြီ!' : '🤝 It is a Draw!';
    }
    if (kidMood === 'thinking') {
      return lang === 'my'
        ? '🤔 မောင်ဖိုးသား ခဏစဥ်းစားနေပါသည်...'
        : '🤔 Mg Pho Thar is thinking...';
    }
    if (kidMood === 'dropping') {
      return lang === 'my'
        ? '🔴 မောင်ဖိုးသား အနီဝိုင်းပြား ချနေပါသည်...'
        : '🔴 Mg Pho Thar is dropping a red disc...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် - ကော်လံတစ်ခု နှိပ်ပါ'
      : 'Your Turn - Click a column';
  };

  return (
    <div className="relative w-full h-full max-w-3xl mx-auto rounded-3xl overflow-hidden border border-amber-300/25 shadow-[0_24px_60px_rgba(0,0,0,0.7)] flex flex-col items-center justify-end pt-3 pb-4 px-3 select-none bg-[#0a1022]">
      {/* 0. Game Entry Loading Screen (Assets များ Load နေချိန် ပြသမည်) */}
      <AnimatePresence>
        {isLoadingScene && (
          <Connect4LoadingScreen lang={lang} progress={loadProgress} />
        )}
      </AnimatePresence>

      {/* 1. Auto-Detecting Seamless Video (Mix Transition Loop) / Image Backdrop */}
      <SeamlessMediaBackdrop
        media={bgMedia}
        onReady={handleBackdropReady}
        onFallback={() => setBgMedia({ kind: 'none', url: null })}
      />

      {/* 2. Top Speech-Bubble Status Pill */}
      <div className="relative z-30 flex flex-col items-center mb-1">
        <motion.div
          key={statusText()}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`relative px-5 py-2 rounded-2xl border text-xs sm:text-sm font-bold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md ${
            userWon
              ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-200'
              : botWon
              ? 'bg-rose-950/85 border-rose-400/60 text-rose-200'
              : kidMood === 'thinking' || kidMood === 'dropping'
              ? 'bg-slate-900/90 border-amber-400/65 text-amber-200'
              : 'bg-[#161c33]/90 border-amber-300/55 text-amber-100'
          }`}
        >
          {statusText()}
          <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-[#161c33] border-r border-b border-amber-300/55" />
        </motion.div>

        <div className="mt-2 w-6 h-6 rounded-full border-2 border-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.7)] bg-amber-300/10" />
      </div>

      {/* 3. Scene Stage: မောင်ဖိုးသား + Gold-Trimmed 4-Row Board */}
      <div className="relative z-20 w-full max-w-[440px] flex flex-col items-center">
        {/* Kid Character Peeking Behind Board */}
        <div className="relative z-10 -mb-9 w-full flex justify-center pointer-events-none">
          <PhoTharKidCharacter mood={kidMood} targetCol={botTargetCol} />
        </div>

        {/* Hover Preview Row */}
        <div className="relative z-20 w-[308px] sm:w-[368px] h-7 grid grid-cols-7 px-3 mb-0.5">
          {Array.from({ length: 7 }).map((_, c) => {
            const showUserDisc = isUserTurn && hoverCol === c && grid[0][c] === null;
            return (
              <div key={c} className="flex items-center justify-center">
                <AnimatePresence>
                  {showUserDisc && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.75 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border-2 border-yellow-100/90 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Sleek Dark Navy & Brushed Gold 4-Row Board + Side LED Stand Legs */}
        <div className="relative z-20 flex items-end justify-center">
          {/* Left LED Stand Leg */}
          <div className="relative w-3 sm:w-3.5 h-[228px] sm:h-[268px] -mr-1.5 rounded-t-md rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-sky-300/40 shadow-[0_12px_20px_rgba(0,0,0,0.75)] flex flex-col items-center justify-between py-2">
            <span className="w-1 h-16 rounded-full bg-sky-200 shadow-[0_0_10px_#7dd3fc]" />
            <span className="w-1 h-10 rounded-full bg-amber-200/90 shadow-[0_0_8px_#fde68a]" />
          </div>

          {/* Main Board Frame */}
          <div className="relative p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-[#1e2946] via-[#151e36] to-[#0f172a] border-[3px] border-amber-300/75 shadow-[0_18px_36px_rgba(0,0,0,0.8),inset_0_1px_8px_rgba(254,240,138,0.25)] mb-4">
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
                    className={`flex flex-col gap-1.5 sm:gap-2 rounded-xl p-0.5 transition-colors ${
                      canClick
                        ? 'cursor-pointer hover:bg-amber-300/12'
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
                          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#090e1c]/90 shadow-[inset_0_3px_7px_rgba(0,0,0,0.92)] border-[1.5px] border-amber-300/45 flex items-center justify-center overflow-visible"
                        >
                          {cell && (
                            <motion.div
                              key={`${rowIdx}-${colIdx}-${cell}`}
                              initial={{ y: -(rowIdx + 2) * 44, opacity: 0.9 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{
                                type: 'spring',
                                stiffness: 330,
                                damping: 21,
                                mass: 0.85,
                              }}
                              className={`w-[88%] h-[88%] rounded-full border-2 flex items-center justify-center ${
                                cell === 'P1'
                                  ? 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border-yellow-100/85 shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                                  : 'bg-gradient-to-br from-rose-300 via-red-500 to-rose-700 border-rose-200/85 shadow-[0_0_12px_rgba(244,63,94,0.85)]'
                              } ${winning ? 'ring-4 ring-white animate-pulse scale-105' : ''}`}
                            >
                              <span
                                className={`w-[62%] h-[62%] rounded-full border ${
                                  cell === 'P1'
                                    ? 'border-yellow-100/60 bg-amber-300/30'
                                    : 'border-rose-100/60 bg-rose-400/30'
                                }`}
                              />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right LED Stand Leg */}
          <div className="relative w-3 sm:w-3.5 h-[228px] sm:h-[268px] -ml-1.5 rounded-t-md rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-sky-300/40 shadow-[0_12px_20px_rgba(0,0,0,0.75)] flex flex-col items-center justify-between py-2">
            <span className="w-1 h-16 rounded-full bg-sky-200 shadow-[0_0_10px_#7dd3fc]" />
            <span className="w-1 h-10 rounded-full bg-amber-200/90 shadow-[0_0_8px_#fde68a]" />
          </div>
        </div>

        {/* Contact Shadow (Video/Image စားပွဲခုံပေါ် ဘုတ်တင်ထားသကဲ့သို့ သဘာဝကျစေမည်) */}
        <div className="pointer-events-none relative z-10 -mt-2 w-[310px] sm:w-[375px] h-5 rounded-full bg-black/65 blur-md" />

        {/* Fallback CSS Table Surface (Custom Video/Image မရှိမှသာ ပြမည်) */}
        {!hasCustomRoomBackdrop && (
          <div className="relative z-0 -mt-6 w-[130%] flex flex-col items-center pointer-events-none">
            <div
              className="w-full h-16 sm:h-20 rounded-t-3xl bg-gradient-to-b from-[#3b4b75] via-[#263252] to-[#161e36] border-t-2 border-sky-200/30 shadow-[0_-6px_30px_rgba(15,23,42,0.8)]"
              style={{ transform: 'perspective(380px) rotateX(42deg)' }}
            />
          </div>
        )}
      </div>

      {/* 4. Match Finished Action Bar */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-3 bottom-3 z-40 rounded-2xl bg-[#0d1426]/95 backdrop-blur-md border border-amber-400/55 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
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
                <div className="text-xs sm:text-sm font-bold text-white">
                  {userWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သင်နိုင်ပါသည်!'
                      : 'Match Over — Victory!'
                    : botWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — မောင်ဖိုးသား နိုင်ပါသည်'
                      : 'Match Over — Mg Pho Thar Wins'
                    : lang === 'my'
                    ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သရေ'
                    : 'Match Over — Draw'}
                </div>
                <div className="text-[11px] text-amber-300 font-mono font-semibold">
                  {isDraw ? '+25 XP' : userWon ? '+75 XP' : '-20 XP'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLeaveFinished}
              className="px-4 h-9 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
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

/* ============================================================================
 * မောင်ဖိုးသား (Blue-Hoodie Kid Character)
 * ============================================================================ */
const PhoTharKidCharacter: React.FC<{ mood: KidMood; targetCol: number | null }> = ({
  mood,
  targetCol,
}) => {
  const handOffsetX = targetCol !== null ? (targetCol - 3) * 42 : 0;

  return (
    <div className="relative w-60 h-36 sm:h-40 flex items-end justify-center">
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute top-0 right-2 px-3 py-1 rounded-2xl bg-slate-900/95 border border-amber-300/50 text-amber-200 text-xs font-bold shadow-lg flex items-center gap-1"
          >
            <span>အင်း</span>
            <motion.span
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 0.85 }}
            >
              ...
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mood === 'happy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[
              { x: 20, y: 8, color: '#fbbf24' },
              { x: 205, y: 12, color: '#f43f5e' },
              { x: 42, y: 52, color: '#38bdf8' },
              { x: 188, y: 56, color: '#34d399' },
            ].map((sp, idx) => (
              <motion.div
                key={idx}
                animate={{ y: [0, -14, 0], scale: [0.8, 1.35, 0.8], rotate: [0, 180, 360] }}
                transition={{ repeat: Infinity, duration: 1.1 + idx * 0.2 }}
                style={{ left: sp.x, top: sp.y, backgroundColor: sp.color }}
                className="absolute w-2.5 h-2.5 rounded-full shadow-lg"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 220 175"
        className="w-52 h-36 sm:w-56 sm:h-40 drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]"
        animate={
          mood === 'happy'
            ? { y: [0, -12, 0], rotate: [-2.5, 2.5, -2.5] }
            : mood === 'crying'
            ? { y: [0, 2, 0], x: [-2, 2, -2] }
            : mood === 'thinking'
            ? { rotate: [-3, 3, -3] }
            : { y: [0, -2.5, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: mood === 'happy' ? 0.55 : mood === 'crying' ? 0.35 : 2.3,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id="phoHoodie" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="phoSkin" cx="45%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#ffe1c9" />
            <stop offset="100%" stopColor="#eab38f" />
          </radialGradient>
          <radialGradient id="phoRedDisc" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="45%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#9f1239" />
          </radialGradient>
        </defs>

        <path
          d="M52 175 C54 128, 76 112, 110 112 C144 112, 166 128, 168 175 Z"
          fill="url(#phoHoodie)"
          stroke="#94a3b8"
          strokeWidth="2"
        />
        <path d="M84 118 Q110 138 136 118" fill="none" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />

        <circle cx="64" cy="70" r="10.5" fill="#e8ae88" />
        <circle cx="156" cy="70" r="10.5" fill="#e8ae88" />

        <ellipse cx="110" cy="68" rx="45" ry="43" fill="url(#phoSkin)" />

        <path
          d="M62 64 C59 26, 84 14, 112 14 C144 14, 161 31, 158 64 C150 48, 138 42, 126 46 C116 34, 96 35, 84 48 C75 43, 67 52, 62 64 Z"
          fill="#1e1b18"
        />

        <ellipse cx="80" cy="80" rx="8" ry="4.5" fill="#fb7185" opacity="0.35" />
        <ellipse cx="140" cy="80" rx="8" ry="4.5" fill="#fb7185" opacity="0.35" />
        <circle cx="78" cy="79" r="1" fill="#b45309" opacity="0.45" />
        <circle cx="83" cy="81" r="1" fill="#b45309" opacity="0.45" />
        <circle cx="137" cy="81" r="1" fill="#b45309" opacity="0.45" />
        <circle cx="142" cy="79" r="1" fill="#b45309" opacity="0.45" />

        {mood === 'happy' ? (
          <>
            <path d="M82 68 Q92 56 102 68" stroke="#1c1917" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M118 68 Q128 56 138 68" stroke="#1c1917" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'crying' ? (
          <>
            <path d="M80 54 L100 60" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M140 54 L120 60" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="92" cy="68" rx="6.5" ry="5.5" fill="#1c1917" />
            <ellipse cx="128" cy="68" rx="6.5" ry="5.5" fill="#1c1917" />
            <circle cx="90" cy="66" r="2.2" fill="#fff" />
            <circle cx="126" cy="66" r="2.2" fill="#fff" />

            <motion.path
              d="M88 76 C84 84, 92 88, 92 82 C92 78, 88 76, 88 76 Z"
              fill="#38bdf8"
              animate={{ y: [0, 26], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.85 }}
            />
            <motion.path
              d="M132 76 C128 84, 136 88, 136 82 C136 78, 132 76, 132 76 Z"
              fill="#38bdf8"
              animate={{ y: [0, 26], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.85, delay: 0.4 }}
            />
          </>
        ) : (
          <>
            <path d="M80 54 Q92 49 102 53" stroke="#292524" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d="M118 53 Q128 49 140 54" stroke="#292524" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <ellipse cx="92" cy="68" rx="8" ry="8.5" fill="#ffffff" />
            <ellipse cx="128" cy="68" rx="8" ry="8.5" fill="#ffffff" />
            <motion.g
              animate={mood === 'thinking' ? { x: [-3, 4, -3], y: [-2, -2, -2] } : { x: 0, y: 0 }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              <circle cx="92" cy="68" r="5" fill="#2b1810" />
              <circle cx="128" cy="68" r="5" fill="#2b1810" />
              <circle cx="90" cy="66" r="2" fill="#ffffff" />
              <circle cx="126" cy="66" r="2" fill="#ffffff" />
            </motion.g>
          </>
        )}

        {mood === 'happy' ? (
          <path d="M92 85 Q110 105 128 85 Z" fill="#be123c" stroke="#881337" strokeWidth="2" />
        ) : mood === 'crying' ? (
          <path d="M94 95 Q110 81 126 95" stroke="#881337" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : mood === 'thinking' ? (
          <circle cx="114" cy="89" r="4" fill="#9f1239" />
        ) : (
          <path d="M95 86 Q110 98 125 86" stroke="#9f1239" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}

        <motion.g
          animate={
            mood === 'dropping'
              ? { x: handOffsetX * 0.45, y: 18 }
              : mood === 'happy'
              ? { x: 0, y: -18 }
              : { x: 0, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <circle cx="62" cy="118" r="11" fill="#fbd3b6" stroke="#d99b72" strokeWidth="1.5" />
          {mood !== 'crying' && (
            <motion.g
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
            >
              <circle
                cx="68"
                cy="106"
                r="16"
                fill="url(#phoRedDisc)"
                stroke="#fecdd3"
                strokeWidth="2.2"
              />
              <circle cx="68" cy="106" r="10" fill="none" stroke="#ffe4e6" strokeWidth="1.5" opacity="0.7" />
            </motion.g>
          )}
        </motion.g>
      </motion.svg>
    </div>
  );
};
