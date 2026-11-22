import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { Language } from '../types.ts';

export type TTTBotPhase =
  | 'idle'
  | 'user_scratching'
  | 'thinking'
  | 'bot_scratching'
  | 'dancing'
  | 'rolling_cry';

export function getTicTacToeBotName(lang: Language, difficulty = 'medium'): string {
  if (lang === 'my') {
    if (difficulty === 'easy') return 'မပုတု (လွယ်)';
    if (difficulty === 'hard') return 'မပုတု (ဆရာမလေး)';
    return 'မပုတု';
  }
  if (difficulty === 'easy') return 'Ma Pu Tu (Easy)';
  if (difficulty === 'hard') return 'Ma Pu Tu (Pro)';
  return 'Ma Pu Tu';
}

// Bot Profile ပုံ (မြန်မာကလေးမလေး မပုတု SVG Data URI)
const TTT_KID_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#bg)"/>
  <!-- Traditional Dress Shoulders -->
  <path d="M22 120 C24 90, 42 82, 60 82 C78 82, 96 90, 98 120 Z" fill="#e11d48"/>
  <path d="M36 94 Q60 108 84 94" stroke="#facc15" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Hair Buns -->
  <circle cx="28" cy="48" r="14" fill="#1e1b18"/>
  <circle cx="92" cy="48" r="14" fill="#1e1b18"/>
  <circle cx="28" cy="48" r="5" fill="#fb7185"/>
  <circle cx="92" cy="48" r="5" fill="#fb7185"/>
  <!-- Head -->
  <circle cx="60" cy="58" r="28" fill="#f7c8a2"/>
  <!-- Hair Bangs -->
  <path d="M32 54 C34 26, 86 26, 88 54 C78 40, 42 40, 32 54 Z" fill="#1e1b18"/>
  <!-- Thanaka Cheeks -->
  <ellipse cx="42" cy="66" rx="7" ry="4.5" fill="#fef3c7" opacity="0.9"/>
  <ellipse cx="78" cy="66" rx="7" ry="4.5" fill="#fef3c7" opacity="0.9"/>
  <!-- Cute Red Dot -->
  <circle cx="60" cy="48" r="2.2" fill="#e11d48"/>
  <!-- Eyes -->
  <circle cx="48" cy="58" r="4" fill="#1e1b18"/>
  <circle cx="72" cy="58" r="4" fill="#1e1b18"/>
  <circle cx="46.8" cy="56.5" r="1.4" fill="#ffffff"/>
  <circle cx="70.8" cy="56.5" r="1.4" fill="#ffffff"/>
  <!-- Smile -->
  <path d="M51 69 Q60 77 69 69" stroke="#9f1239" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`.trim();

export const TTT_KID_BOT_AVATAR_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  TTT_KID_AVATAR_SVG
)}`;

interface TicTacToeBoardProps {
  lang: Language;
  match: any;
  currentUserId: string;
  onCellClick: (index: number) => void;
  onLeaveFinished: () => void;
  backgroundUrl?: string;
}

const WIN_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinningLine(board: Array<string | null>): [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

// 3x3 ဇယားကွက်ထဲရှိ အကွက်အလိုက် ဗဟို Coordinate (%)
function getCellCenterPercent(index: number): { x: number; y: number } {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return {
    x: 16.67 + col * 33.33,
    y: 16.67 + row * 33.33,
  };
}

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  lang,
  match,
  currentUserId,
  onCellClick,
  onLeaveFinished,
  backgroundUrl = '/assets/ttt-village-bg.jpg',
}) => {
  const board: Array<string | null> = match.tttBoard || Array(9).fill(null);
  const isFinished = match.status === 'finished';
  const isDraw = Boolean(match.isDraw);
  const userWon = isFinished && !isDraw && match.winnerId === currentUserId;
  const botWon = isFinished && !isDraw && match.winnerId !== currentUserId;
  const winLine = getWinningLine(board);

  // User နှိပ်လိုက်သည့်အခါ ခေတ္တတုတ်ချောင်းဖြင့် ခြစ်ပြမည့် Local State
  const [localUserScratchIdx, setLocalUserScratchIdx] = useState<number | null>(null);

  useEffect(() => {
    if (localUserScratchIdx === null) return;
    const t = window.setTimeout(() => setLocalUserScratchIdx(null), 460);
    return () => window.clearTimeout(t);
  }, [localUserScratchIdx]);

  const rawPhase: TTTBotPhase = (match.tttBotPhase as TTTBotPhase) || 'idle';
  const botMood: TTTBotPhase = botWon
    ? 'dancing'
    : userWon
    ? 'rolling_cry'
    : rawPhase;

  const botTargetIdx: number | null =
    typeof match.tttBotTargetIdx === 'number' ? match.tttBotTargetIdx : null;

  const isLocked =
    isFinished ||
    localUserScratchIdx !== null ||
    botMood === 'thinking' ||
    botMood === 'bot_scratching' ||
    (match.isRealtimePvp && match.turnUserId !== currentUserId);

  const handleCellPress = (idx: number) => {
    if (isLocked || board[idx] !== null) return;
    setLocalUserScratchIdx(idx);
    onCellClick(idx);
  };

  // လက်ရှိ တုတ်ချောင်းဖြင့် ခြစ်နေသည့် အကွက်နှင့် ကစားသမား
  const activeScratch: { side: 'user' | 'bot'; idx: number } | null =
    localUserScratchIdx !== null
      ? { side: 'user', idx: localUserScratchIdx }
      : botMood === 'bot_scratching' && botTargetIdx !== null
      ? { side: 'bot', idx: botTargetIdx }
      : null;

  const statusText = () => {
    if (userWon) {
      return lang === 'my'
        ? '🎉 သင်နိုင်သွားပြီ! မပုတု မြေကြီးပေါ်လူးလှိမ့်ငိုနေပြီ'
        : '🎉 You Win! Ma Pu Tu is rolling & crying!';
    }
    if (botWon) {
      return lang === 'my'
        ? '💃 မပုတု နိုင်သွားပြီ! ထခုန်ပြီး ကနေပါပြီ'
        : '💃 Ma Pu Tu Wins & Dances!';
    }
    if (isDraw) {
      return lang === 'my' ? '🤝 သရေကျသွားပါပြီ!' : '🤝 Draw Match!';
    }
    if (botMood === 'thinking') {
      return lang === 'my'
        ? '🤔 မပုတု ခဏစဥ်းစားနေပါသည်...'
        : '🤔 Ma Pu Tu is thinking...';
    }
    if (botMood === 'bot_scratching') {
      return lang === 'my'
        ? '🪵 မပုတု တုတ်ချောင်းနဲ့ မြေကြီးခြစ်နေပါသည်...'
        : '🪵 Ma Pu Tu is scratching her move...';
    }
    if (localUserScratchIdx !== null) {
      return lang === 'my'
        ? '🪵 တုတ်ချောင်းနဲ့ ခြစ်ဆွဲနေပါသည်...'
        : '🪵 Scratching mark into the dirt...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် (X) — မြေကြီးအကွက်တစ်ခုကို နှိပ်ခြစ်ပါ'
      : 'Your Turn (X) — Tap a dirt square to scratch';
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center justify-center select-none px-2">
      {/* Status Banner */}
      <motion.div
        key={statusText()}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-30 mb-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-lg backdrop-blur-md ${
          userWon
            ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-200'
            : botWon
            ? 'bg-rose-950/85 border-rose-400/60 text-rose-200'
            : botMood === 'thinking' || botMood === 'bot_scratching'
            ? 'bg-amber-950/85 border-amber-400/60 text-amber-200'
            : 'bg-stone-950/80 border-amber-300/40 text-amber-200'
        }`}
      >
        {statusText()}
      </motion.div>

      {/* Main Village Top-Down Scene Container */}
      <div
        className="relative w-full max-w-[680px] aspect-[4/3] rounded-3xl overflow-hidden border-2 border-amber-700/60 shadow-[0_22px_50px_rgba(0,0,0,0.75)]"
        style={{
          backgroundColor: '#8f6e49',
          backgroundImage: `url('${backgroundUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* ပုံထဲရှိ မူလကလေးနှင့် ဇယားကွက်နေရာကို သဘာဝမြေသားအလွှာဖြင့် ညက်ညောစွာ ဖုံးအုပ်ခြင်း */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 56% 48% at 50% 51%, rgba(196, 157, 108, 0.96) 0%, rgba(182, 142, 95, 0.92) 55%, rgba(164, 125, 81, 0.45) 78%, rgba(140, 104, 65, 0) 100%)',
          }}
        />

        {/* မြေကြီးပေါ်ရှိ သစ်ရွက်အရိပ် အနည်းငယ် */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-950/20 via-transparent to-emerald-950/25" />

        {/* === 1. LEFT CHARACTER: USER (အင်္ကျီအပြာ ကောင်လေး) === */}
        <div className="pointer-events-none absolute left-[6%] sm:left-[9%] top-[33%] w-[22%] sm:w-[21%] z-20">
          <UserBoyCharacter
            isScratching={activeScratch?.side === 'user'}
            isHappy={userWon}
            isSad={botWon}
          />
        </div>

        {/* === 2. RIGHT CHARACTER: BOT (မပုတု - မြန်မာကလေးမလေး) === */}
        <div className="pointer-events-none absolute right-[6%] sm:right-[9%] top-[32%] w-[23%] sm:w-[22%] z-20">
          <BotGirlMaPuTu
            mood={botMood}
            lang={lang}
          />
        </div>

        {/* === 3. CENTER DIRT TIC-TAC-TOE GRID (3x3) === */}
        <div className="absolute left-1/2 top-[51%] -translate-x-1/2 -translate-y-1/2 w-[38%] sm:w-[36%] aspect-square z-10">
          {/* မြေကြီးပေါ် တုတ်ချောင်းဖြင့် ခြစ်ထားသည့် ဇယားမျဉ်း (SVG Dirt Grooves) */}
          <svg
            viewBox="0 0 300 300"
            className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_1px_1px_rgba(255,235,200,0.45)]"
          >
            {/* Vertical Dirt Lines */}
            <path
              d="M100 10 Q97 150 102 290"
              stroke="#5c3d22"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.88"
            />
            <path
              d="M200 12 Q203 150 198 288"
              stroke="#5c3d22"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.88"
            />
            {/* Horizontal Dirt Lines */}
            <path
              d="M10 100 Q150 97 290 102"
              stroke="#5c3d22"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.88"
            />
            <path
              d="M12 200 Q150 204 288 198"
              stroke="#5c3d22"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.88"
            />

            {/* အနိုင်ရသည့် ၃ ကွက်တန်း မျဉ်း */}
            {winLine && (
              <motion.line
                x1={getCellCenterPercent(winLine[0]).x * 3}
                y1={getCellCenterPercent(winLine[0]).y * 3}
                x2={getCellCenterPercent(winLine[2]).x * 3}
                y2={getCellCenterPercent(winLine[2]).y * 3}
                stroke={userWon ? '#fde047' : '#fb7185'}
                strokeWidth="10"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            )}
          </svg>

          {/* Interactive 9 Dirt Cells */}
          <div className="relative z-10 grid grid-cols-3 grid-rows-3 w-full h-full">
            {board.map((cell, idx) => {
              const canClick = !isLocked && cell === null;
              const isWinningCell = winLine?.includes(idx) ?? false;
              const isBeingScratched = activeScratch?.idx === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canClick}
                  onClick={() => handleCellPress(idx)}
                  aria-label={`Cell ${idx + 1}`}
                  className={`relative flex items-center justify-center rounded-xl transition-colors ${
                    canClick
                      ? 'cursor-pointer hover:bg-amber-950/15 active:bg-amber-950/25'
                      : 'cursor-default'
                  }`}
                >
                  {/* Scratched X or O Mark */}
                  {cell === 'X' && (
                    <DirtScratchedX highlight={isWinningCell} />
                  )}
                  {cell === 'O' && (
                    <DirtScratchedO highlight={isWinningCell} />
                  )}

                  {/* တုတ်ချောင်းခြစ်နေချိန် မြေမှုန့်လွင့်သည့် Dust Burst */}
                  <AnimatePresence>
                    {isBeingScratched && <DirtDustBurst key={`dust-${idx}`} />}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          {/* === 4. STICK-SCRATCHING HAND OVERLAY (တုတ်ချောင်းဖြင့် မြေကြီးခြစ်သည့် လက်) === */}
          <AnimatePresence>
            {activeScratch && (
              <StickScratchHandOverlay
                key={`${activeScratch.side}-${activeScratch.idx}`}
                side={activeScratch.side}
                targetIdx={activeScratch.idx}
              />
            )}
          </AnimatePresence>
        </div>

        {/* === 5. RESULT OVERLAY BAR (ပွဲပြီးလျှင် အောက်ခြေတွင် ပြမည် - ကလေးကနေ/ငိုနေတာကို မဖုံးအောင်) === */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="absolute inset-x-3 bottom-3 z-30 rounded-2xl bg-stone-950/88 backdrop-blur-md border border-amber-400/55 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    userWon
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : botWon
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {userWon ? <Trophy className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {userWon
                      ? lang === 'my'
                        ? 'သင် အနိုင်ရရှိပါသည်! (+75 XP)'
                        : 'Victory! (+75 XP)'
                      : botWon
                      ? lang === 'my'
                        ? 'မပုတု အနိုင်ရသွားပါပြီ (-20 XP)'
                        : 'Ma Pu Tu Wins! (-20 XP)'
                      : lang === 'my'
                      ? 'သရေပွဲ! (+25 XP)'
                      : 'Draw! (+25 XP)'}
                  </div>
                  <div className="text-[11px] text-amber-200/80 truncate">
                    {userWon
                      ? lang === 'my'
                        ? 'မပုတု မြေကြီးပေါ်လူးလှိမ့်ပြီး ငိုနေပါပြီ 😭'
                        : 'Ma Pu Tu is rolling on the dirt crying 😭'
                      : botWon
                      ? lang === 'my'
                        ? 'မပုတု ဝမ်းသာအားရ ထခုန်ကနေပါပြီ 💃'
                        : 'Ma Pu Tu is jumping & dancing 💃'
                      : lang === 'my'
                      ? 'နောက်တစ်ပွဲ ထပ်ကစားကြမယ်!'
                      : 'Play again!'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLeaveFinished}
                className="px-3.5 h-9 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ပြန်ထွက်မည်' : 'Lobby'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ============================================================================
 * မြေကြီးပေါ် တုတ်ချောင်းဖြင့် ခြစ်ထားသည့် X နှင့် O
 * ============================================================================ */
const DirtScratchedX: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <svg viewBox="0 0 80 80" className="w-[74%] h-[74%] overflow-visible">
    {/* ခြစ်ရာအရိပ် */}
    <motion.path
      d="M18 18 Q40 42 62 62"
      stroke="#4a2e16"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    />
    <motion.path
      d="M62 18 Q38 40 18 62"
      stroke="#4a2e16"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, delay: 0.16, ease: 'easeOut' }}
    />
    {/* အတွင်း မြေဖြူခြစ်ကြောင်း */}
    <motion.path
      d="M18 18 Q40 42 62 62"
      stroke={highlight ? '#fef08a' : '#f5e6cc'}
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    />
    <motion.path
      d="M62 18 Q38 40 18 62"
      stroke={highlight ? '#fef08a' : '#f5e6cc'}
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, delay: 0.16, ease: 'easeOut' }}
    />
  </svg>
);

const DirtScratchedO: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <svg viewBox="0 0 80 80" className="w-[76%] h-[76%] overflow-visible">
    <motion.path
      d="M40 15 C58 14, 67 27, 65 42 C63 59, 51 67, 38 66 C22 65, 14 53, 15 39 C16 24, 27 16, 42 15"
      stroke="#4a2e16"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.36, ease: 'easeInOut' }}
    />
    <motion.path
      d="M40 15 C58 14, 67 27, 65 42 C63 59, 51 67, 38 66 C22 65, 14 53, 15 39 C16 24, 27 16, 42 15"
      stroke={highlight ? '#fda4af' : '#d6b286'}
      strokeWidth="4.2"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.36, ease: 'easeInOut' }}
    />
  </svg>
);

/* ============================================================================
 * တုတ်ချောင်းဖြင့် ခြစ်ချိန် လွင့်ထွက်သည့် မြေမှုန့်များ
 * ============================================================================ */
const DirtDustBurst: React.FC = () => {
  const particles = [
    { x: -18, y: -14, s: 5 },
    { x: 16, y: -16, s: 4 },
    { x: -14, y: 15, s: 4.5 },
    { x: 18, y: 12, s: 5 },
    { x: 0, y: -20, s: 3.5 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 0.95, scale: 0.6 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          style={{ width: p.s, height: p.s }}
          className="absolute rounded-full bg-amber-100/80 shadow-sm"
        />
      ))}
    </div>
  );
};

/* ============================================================================
 * တုတ်ချောင်းကိုင်ထားသည့် ကလေးလက် (အကွက်ပေါ်သို့ လှမ်းထွက်ပြီး ခြစ်ဆွဲမည်)
 * ============================================================================ */
const StickScratchHandOverlay: React.FC<{
  side: 'user' | 'bot';
  targetIdx: number;
}> = ({ side, targetIdx }) => {
  const center = getCellCenterPercent(targetIdx);
  const isUser = side === 'user';

  // User ဆိုလျှင် ဘယ်ဘက်မှ၊ Bot ဆိုလျှင် ညာဘက်မှ လှမ်းထွက်လာမည်
  const startOffsetX = isUser ? -95 : 95;

  // X ခြစ်လျှင် ကြက်ခြေခတ်လှုပ်ရှားမှု၊ O ခြစ်လျှင် စက်ဝိုင်းပတ်လှုပ်ရှားမှု
  const scratchMotion = isUser
    ? { x: [0, -10, 10, 10, -10, 0], y: [0, -10, 10, -10, 10, 0] }
    : { x: [0, 10, 0, -10, 0], y: [-10, 0, 10, 0, -10] };

  return (
    <motion.div
      initial={{ opacity: 0, x: startOffsetX, y: 18 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: startOffsetX * 0.7, transition: { duration: 0.16 } }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        left: `${center.x}%`,
        top: `${center.y}%`,
      }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        animate={scratchMotion}
        transition={{ duration: 0.34, delay: 0.08, ease: 'easeInOut' }}
        className="relative"
      >
        <svg
          viewBox="0 0 130 70"
          className={`w-28 sm:w-32 h-16 drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] ${
            isUser ? '-translate-x-10' : 'translate-x-10 scale-x-[-1]'
          }`}
        >
          {/* ကလေးလက်မောင်း */}
          <path
            d="M4 42 Q34 36 58 34"
            stroke="#f4be95"
            strokeWidth="15"
            strokeLinecap="round"
            fill="none"
          />
          {/* အင်္ကျီလက်စ (User: အပြာ / Bot: အနီရွှေ) */}
          <path
            d="M2 42 L20 39"
            stroke={isUser ? '#2563eb' : '#e11d48'}
            strokeWidth="17"
            strokeLinecap="round"
          />
          {/* တုတ်ချောင်း (Wooden Stick) */}
          <path
            d="M52 28 L114 36"
            stroke="#6b4226"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M56 29 L112 36"
            stroke="#8b5a2b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* တုတ်ချောင်းထိပ် မြေကြီးထိသည့်နေရာ */}
          <circle cx="115" cy="36" r="3" fill="#fef3c7" opacity="0.85" />
          {/* တုတ်ချောင်းကို ဆုပ်ကိုင်ထားသည့် လက်ချောင်းများ */}
          <circle cx="62" cy="33" r="9.5" fill="#f4be95" stroke="#d99a70" strokeWidth="1.5" />
          <path
            d="M58 26 Q66 24 70 30"
            stroke="#d99a70"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

/* ============================================================================
 * ဘယ်ဘက်ကလေး: User (အင်္ကျီအပြာ ကောင်လေး - Top-Down 2D)
 * ============================================================================ */
const UserBoyCharacter: React.FC<{
  isScratching: boolean;
  isHappy: boolean;
  isSad: boolean;
}> = ({ isScratching, isHappy, isSad }) => (
  <motion.div
    animate={
      isHappy
        ? { y: [0, -10, 0], rotate: [-4, 4, -4] }
        : isScratching
        ? { x: [0, 8, 0] }
        : isSad
        ? { y: [0, 2, 0] }
        : { y: [0, -2, 0] }
    }
    transition={{
      repeat: isHappy ? Infinity : 0,
      duration: isHappy ? 0.55 : 0.38,
    }}
    className="relative flex flex-col items-center"
  >
    <svg viewBox="0 0 120 120" className="w-full h-auto drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]">
      {/* Ground Shadow */}
      <ellipse cx="56" cy="96" rx="34" ry="15" fill="rgba(45,28,12,0.35)" />
      {/* Seated Legs / Shorts */}
      <ellipse cx="66" cy="84" rx="22" ry="16" fill="#1e3a8a" />
      <circle cx="80" cy="92" r="7" fill="#f4be95" />
      <circle cx="84" cy="76" r="7" fill="#f4be95" />
      {/* Blue T-Shirt Body */}
      <ellipse cx="48" cy="70" rx="24" ry="26" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2.5" />
      {/* Right Arm resting with Stick when idle */}
      {!isScratching && (
        <g>
          <path d="M62 72 Q82 74 92 66" stroke="#f4be95" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M88 68 L108 58" stroke="#6b4226" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}
      {/* Head (Top-Down) */}
      <circle cx="56" cy="46" r="24" fill="#f4be95" stroke="#d99a70" strokeWidth="1.5" />
      {/* Hair */}
      <path
        d="M32 48 C30 22, 74 16, 79 40 C70 30, 56 32, 48 44 C42 46, 36 52, 32 48 Z"
        fill="#271c15"
      />
      {/* Cute Side Eye looking at board */}
      <circle cx="71" cy="49" r="3" fill="#1e1b18" />
      <circle cx="72" cy="48" r="1" fill="#ffffff" />
      {/* Smile / Sad */}
      {isSad ? (
        <path d="M67 59 Q72 55 76 58" stroke="#9a3412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M67 56 Q72 61 77 56" stroke="#9a3412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  </motion.div>
);

/* ============================================================================
 * ညာဘက်ကလေး: Bot (မပုတု - နိုင်ရင် ထခုန်ကမယ် / ရှုံးရင် မြေကြီးပေါ် လူးလှိမ့်ငိုမယ်)
 * ============================================================================ */
const BotGirlMaPuTu: React.FC<{ mood: TTTBotPhase; lang: Language }> = ({ mood, lang }) => {
  const isDancing = mood === 'dancing';
  const isRollingCry = mood === 'rolling_cry';
  const isThinking = mood === 'thinking';
  const isScratching = mood === 'bot_scratching';

  return (
    <div className="relative flex flex-col items-center">
      {/* Speech / Thought Bubble */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="absolute -top-9 right-0 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-stone-950/90 border border-amber-300/60 text-[10px] sm:text-xs font-bold text-amber-200 shadow-lg"
          >
            {lang === 'my' ? 'အင်း... 🤔' : 'Hmm... 🤔'}
          </motion.div>
        )}

        {isDancing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute -top-10 right-0 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-rose-600/95 border border-yellow-300 text-[10px] sm:text-xs font-extrabold text-white shadow-lg"
          >
            {lang === 'my' ? 'ဟေး! နိုင်ပြီ 💃🎉' : 'Yay! I Win! 💃'}
          </motion.div>
        )}

        {isRollingCry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1, rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 0.45 }}
            className="absolute -top-10 right-0 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-sky-950/95 border border-sky-300/70 text-[10px] sm:text-xs font-extrabold text-sky-200 shadow-lg"
          >
            {lang === 'my' ? 'အီးဟီး... ရှုံးပြီ 😭' : 'Waaah!! 😭'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dancing Sparkles */}
      {isDancing && (
        <div className="pointer-events-none absolute -inset-4 z-30">
          {[
            { left: '8%', top: '0%', color: '#facc15' },
            { left: '82%', top: '6%', color: '#fb7185' },
            { left: '14%', top: '62%', color: '#38bdf8' },
            { left: '86%', top: '58%', color: '#4ade80' },
          ].map((sp, i) => (
            <motion.span
              key={i}
              style={{ left: sp.left, top: sp.top, backgroundColor: sp.color }}
              animate={{ y: [0, -12, 0], scale: [0.7, 1.4, 0.7] }}
              transition={{ repeat: Infinity, duration: 0.7 + i * 0.15 }}
              className="absolute w-2.5 h-2.5 rounded-full shadow-md"
            />
          ))}
        </div>
      )}

      {/* Rolling Cry Dirt Dust Puffs */}
      {isRollingCry && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-6">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -10, -16], opacity: [0.85, 0.4, 0], scale: [0.6, 1.3, 1.6] }}
              transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.22 }}
              className="w-3 h-3 rounded-full bg-amber-100/70"
            />
          ))}
        </div>
      )}

      {/* Main Character Motion Wrapper */}
      <motion.div
        animate={
          isDancing
            ? {
                // နိုင်ရင် ထခုန်ပြီး ကနေမယ်
                y: [0, -26, 0, -22, 0],
                rotate: [-10, 10, -12, 12, -10],
                scale: [1, 1.08, 1, 1.06, 1],
              }
            : isRollingCry
            ? {
                // ရှုံးရင် မြေကြီးပေါ် လူးလှိမ့်ပြီး ငိုနေမယ်
                x: [-16, 16, -14, 14, -16],
                y: [10, 16, 8, 16, 10],
                rotate: [-32, 32, -28, 28, -32],
              }
            : isThinking
            ? { rotate: [-5, 5, -5] }
            : isScratching
            ? { x: [0, -8, 0] }
            : { y: [0, -2, 0] }
        }
        transition={{
          repeat: isDancing || isRollingCry || isThinking ? Infinity : 0,
          duration: isDancing ? 0.75 : isRollingCry ? 0.95 : isThinking ? 1.4 : 0.35,
          ease: 'easeInOut',
        }}
        className="w-full"
      >
        <svg viewBox="0 0 124 124" className="w-full h-auto drop-shadow-[0_10px_10px_rgba(0,0,0,0.42)]">
          {/* Ground Shadow */}
          <ellipse cx="64" cy="98" rx="34" ry="15" fill="rgba(45,28,12,0.35)" />

          {/* Traditional Colorful Skirt (ထဘီ) */}
          <ellipse cx="58" cy="82" rx="28" ry="20" fill="#e11d48" stroke="#be123c" strokeWidth="2" />
          <path d="M36 78 Q58 92 80 78" stroke="#facc15" strokeWidth="4" fill="none" />
          <path d="M40 86 Q58 98 76 86" stroke="#38bdf8" strokeWidth="3" fill="none" />

          {/* Yellow/Red Blouse Body */}
          <ellipse cx="70" cy="68" rx="22" ry="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />

          {/* Arms by Mood */}
          {isDancing ? (
            // ထခုန်ကနေချိန် လက်နှစ်ဖက် မြှောက်ထားမည်
            <>
              <path d="M52 62 Q30 38 24 22" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
              <path d="M84 62 Q104 38 110 22" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
            </>
          ) : isRollingCry ? (
            // လူးလှိမ့်ငိုနေချိန် လက်နှင့်ခြေထောက် ယက်ကန်နေမည်
            <>
              <path d="M48 64 Q26 56 20 72" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
              <path d="M84 64 Q102 52 108 68" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
              <circle cx="34" cy="94" r="7" fill="#f7c8a2" />
              <circle cx="82" cy="96" r="7" fill="#f7c8a2" />
            </>
          ) : isThinking ? (
            // စဥ်းစားနေချိန် မေးစေ့ကို လက်ထောက်ထားမည်
            <path d="M56 70 Q44 62 48 54" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
          ) : !isScratching ? (
            // ပုံမှန်အချိန် တုတ်ချောင်းကိုင်ထားမည်
            <g>
              <path d="M56 72 Q38 74 30 66" stroke="#f7c8a2" strokeWidth="9.5" strokeLinecap="round" fill="none" />
              <path d="M34 68 L14 58" stroke="#6b4226" strokeWidth="4.5" strokeLinecap="round" />
            </g>
          ) : null}

          {/* Head */}
          <circle cx="66" cy="46" r="24" fill="#f7c8a2" stroke="#d99a70" strokeWidth="1.5" />
          {/* Hair + Hair Bun */}
          <circle cx="88" cy="42" r="10" fill="#1e1b18" />
          <circle cx="88" cy="42" r="3.5" fill="#fb7185" />
          <path
            d="M44 40 C48 16, 92 20, 90 48 C82 52, 74 44, 68 38 C60 32, 50 32, 44 40 Z"
            fill="#1e1b18"
          />

          {/* Thanaka Cheek */}
          <ellipse cx="52" cy="52" rx="5.5" ry="3.5" fill="#fef3c7" opacity="0.9" />
          {/* Cute Forehead Dot */}
          <circle cx="48" cy="43" r="1.8" fill="#e11d48" />

          {/* Eyes & Tears */}
          {isDancing ? (
            <path d="M46 47 Q51 41 56 47" stroke="#1e1b18" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          ) : isRollingCry ? (
            <>
              {/* ငိုနေသည့် မျက်လုံး > < */}
              <path d="M46 44 L54 48 L46 52" stroke="#1e1b18" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              {/* မျက်ရည်စက်များ */}
              <motion.circle
                cx="45"
                cy="54"
                r="3.2"
                fill="#38bdf8"
                animate={{ y: [0, 18], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.55 }}
              />
              <motion.circle
                cx="53"
                cy="55"
                r="2.8"
                fill="#7dd3fc"
                animate={{ y: [0, 20], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.55, delay: 0.25 }}
              />
            </>
          ) : (
            <>
              <circle cx="51" cy="48" r="3" fill="#1e1b18" />
              <circle cx="50" cy="47" r="1" fill="#ffffff" />
            </>
          )}

          {/* Mouth */}
          {isDancing ? (
            <path d="M46 56 Q52 64 58 56 Z" fill="#be123c" />
          ) : isRollingCry ? (
            <ellipse cx="52" cy="59" rx="5" ry="4" fill="#9f1239" />
          ) : (
            <path d="M47 56 Q52 60 57 56" stroke="#9f1239" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          )}
        </svg>
      </motion.div>
    </div>
  );
};
