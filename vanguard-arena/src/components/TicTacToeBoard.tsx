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

const MA_PU_TU_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="mptBg" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <radialGradient id="mptSkin" cx="42%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffdec2"/>
      <stop offset="100%" stop-color="#d99a6c"/>
    </radialGradient>
    <linearGradient id="mptHair" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b2820"/>
      <stop offset="100%" stop-color="#17110e"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#mptBg)"/>
  <circle cx="88" cy="54" r="16" fill="url(#mptHair)"/>
  <circle cx="88" cy="54" r="5" fill="#f43f5e"/>
  <path d="M20 120 C24 90, 42 82, 60 82 C78 82, 96 90, 100 120 Z" fill="#f59e0b"/>
  <path d="M34 86 L60 112 L86 86" stroke="#e11d48" stroke-width="8" fill="none" stroke-linejoin="round"/>
  <path d="M36 86 L60 110 L84 86" stroke="#fde047" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
  <circle cx="60" cy="57" r="29" fill="url(#mptSkin)"/>
  <path d="M30 56 C30 24, 90 24, 90 56 C82 38, 68 35, 60 40 C52 35, 38 38, 30 56 Z" fill="url(#mptHair)"/>
  <ellipse cx="42" cy="66" rx="8" ry="4.5" fill="#fef3c7" opacity="0.88"/>
  <ellipse cx="78" cy="66" rx="8" ry="4.5" fill="#fef3c7" opacity="0.88"/>
  <ellipse cx="48" cy="57" rx="4.6" ry="5" fill="#231712"/>
  <ellipse cx="72" cy="57" rx="4.6" ry="5" fill="#231712"/>
  <circle cx="46.5" cy="55" r="1.7" fill="#ffffff"/>
  <circle cx="70.5" cy="55" r="1.7" fill="#ffffff"/>
  <path d="M52 70 Q60 77 68 70" stroke="#9f1239" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>
`.trim();

export const TTT_KID_BOT_AVATAR_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  MA_PU_TU_AVATAR_SVG
)}`;

function getLocalAssetUrl(filename: string): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/MyanRena')) {
    return `/MyanRena/assets/${filename}`;
  }
  const base = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return `${base}assets/${filename}`;
}

const BG_URL = getLocalAssetUrl('ttt-village-bg.jpg');

// public/assets/ ရှိ ဇာတ်ကောင်ပုံများ၏ အဖြူနောက်ခံကို အလိုအလျောက် ဖျက်ပေးမည့် Cache
const spriteCache = new Map<string, string | null>();
const spritePromises = new Map<string, Promise<string | null>>();

function loadOptionalSprite(filename: string): Promise<string | null> {
  if (spriteCache.has(filename)) return Promise.resolve(spriteCache.get(filename)!);
  if (spritePromises.has(filename)) return spritePromises.get(filename)!;

  const task = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          spriteCache.set(filename, img.src);
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isNearWhite = (i4: number) => {
          const r = data[i4];
          const g = data[i4 + 1];
          const b = data[i4 + 2];
          return r > 226 && g > 226 && b > 226 && Math.max(r, g, b) - Math.min(r, g, b) < 28;
        };

        const pushIfBg = (x: number, y: number) => {
          const p = y * w + x;
          if (visited[p]) return;
          if (isNearWhite(p * 4)) {
            visited[p] = 1;
            queue[tail++] = p;
          }
        };

        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0);
          pushIfBg(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          pushIfBg(0, y);
          pushIfBg(w - 1, y);
        }

        while (head < tail) {
          const p = queue[head++];
          data[p * 4 + 3] = 0;
          const x = p % w;
          const y = (p - x) / w;
          if (x > 0) pushIfBg(x - 1, y);
          if (x < w - 1) pushIfBg(x + 1, y);
          if (y > 0) pushIfBg(x, y - 1);
          if (y < h - 1) pushIfBg(x, y + 1);
        }

        ctx.putImageData(imgData, 0, 0);
        const uri = canvas.toDataURL('image/png');
        spriteCache.set(filename, uri);
        resolve(uri);
      } catch {
        spriteCache.set(filename, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      spriteCache.set(filename, null);
      resolve(null);
    };
    img.src = getLocalAssetUrl(filename);
  });

  spritePromises.set(filename, task);
  return task;
}

if (typeof window !== 'undefined') {
  const preBg = new Image();
  preBg.src = BG_URL;
}

interface TicTacToeBoardProps {
  lang: Language;
  match: any;
  currentUserId: string;
  onCellClick: (index: number) => void;
  onLeaveFinished: () => void;
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
}) => {
  const board: Array<string | null> = match.tttBoard || Array(9).fill(null);
  const isFinished = match.status === 'finished';
  const isDraw = Boolean(match.isDraw);
  const userWon = isFinished && !isDraw && match.winnerId === currentUserId;
  const botWon = isFinished && !isDraw && match.winnerId !== currentUserId;
  const winLine = getWinningLine(board);

  const [bgReady, setBgReady] = useState(false);
  const [sprites, setSprites] = useState<{
    boy: string | null;
    girlIdle: string | null;
    girlDance: string | null;
    girlCry: string | null;
  }>({
    boy: spriteCache.get('ttt-boy.jpg') ?? null,
    girlIdle: spriteCache.get('ttt-girl-idle.jpg') ?? null,
    girlDance: spriteCache.get('ttt-girl-dance.jpg') ?? null,
    girlCry: spriteCache.get('ttt-girl-cry.jpg') ?? null,
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      loadOptionalSprite('ttt-boy.jpg'),
      loadOptionalSprite('ttt-girl-idle.jpg'),
      loadOptionalSprite('ttt-girl-dance.jpg'),
      loadOptionalSprite('ttt-girl-cry.jpg'),
    ]).then(([boy, girlIdle, girlDance, girlCry]) => {
      if (active) setSprites({ boy, girlIdle, girlDance, girlCry });
    });
    return () => {
      active = false;
    };
  }, []);

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

  const girlSpriteSrc =
    botMood === 'dancing'
      ? sprites.girlDance || sprites.girlIdle
      : botMood === 'rolling_cry'
      ? sprites.girlCry || sprites.girlIdle
      : sprites.girlIdle;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none flex flex-col items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 50%, #c69f6c 0%, #8e6c44 55%, #3d4a26 100%)',
      }}
    >
      {/* FULL-SCREEN VILLAGE BACKGROUND */}
      <img
        src={BG_URL}
        alt="Village Dirt Ground"
        data-repaired="1"
        onLoad={() => setBgReady(true)}
        className={`pointer-events-none absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
          bgReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/45" />

      {/* FLOATING STATUS PILL */}
      <div className="absolute top-[60px] sm:top-[68px] inset-x-3 z-30 flex justify-center pointer-events-none">
        <motion.div
          key={statusText()}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-3.5 py-1 rounded-full border text-[11px] sm:text-sm font-bold shadow-xl backdrop-blur-md text-center ${
            userWon
              ? 'bg-emerald-950/85 border-emerald-400/65 text-emerald-200'
              : botWon
              ? 'bg-rose-950/85 border-rose-400/65 text-rose-200'
              : botMood === 'thinking' || botMood === 'bot_scratching'
              ? 'bg-amber-950/85 border-amber-400/65 text-amber-200'
              : 'bg-stone-950/80 border-amber-300/45 text-amber-100'
          }`}
        >
          {statusText()}
        </motion.div>
      </div>

      {/* CENTER RESPONSIVE PLAY STAGE (PC + Phone ဘယ်အရွယ်အစားမဆို အလယ်တည့်တည့် အပြည့်မြင်ရမည်) */}
      <div className="relative z-20 w-full flex items-center justify-center px-2 sm:px-6 pt-16 pb-12">
        <div className="flex items-center justify-center gap-1 sm:gap-5 lg:gap-8">
          {/* === 1. LEFT CHARACTER: USER BOY === */}
          <div
            style={{ width: 'min(26vw, 34dvh, 230px)' }}
            className="pointer-events-none relative flex flex-col items-center justify-center shrink-0"
          >
            <motion.div
              animate={
                userWon
                  ? { y: [0, -14, 0], rotate: [-4, 4, -4] }
                  : activeScratch?.side === 'user'
                  ? { x: [0, 12, 0] }
                  : botWon
                  ? { y: [0, 3, 0] }
                  : { y: [0, -2.5, 0] }
              }
              transition={{
                repeat: userWon ? Infinity : 0,
                duration: userWon ? 0.55 : 0.38,
              }}
              className="relative w-full aspect-square flex items-center justify-center"
            >
              <div className="absolute bottom-[10%] w-[70%] h-[20%] rounded-full bg-black/35 blur-md" />
              {sprites.boy ? (
                <img
                  src={sprites.boy}
                  alt="Player Boy"
                  data-repaired="1"
                  className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(35,20,8,0.45)]"
                />
              ) : (
                <PaintedBoyCharacter
                  isScratching={activeScratch?.side === 'user'}
                  isHappy={userWon}
                  isSad={botWon}
                />
              )}
            </motion.div>
          </div>

          {/* === 2. CENTER DIRT TIC-TAC-TOE GRID (3x3) === */}
          <div
            style={{ width: 'min(44vw, 48dvh, 340px)' }}
            className="relative aspect-square shrink-0"
          >
            <svg
              viewBox="0 0 300 300"
              className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_1px_2px_rgba(255,235,200,0.48)]"
            >
              <path d="M100 10 Q97 150 102 290" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.92" />
              <path d="M200 12 Q203 150 198 288" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.92" />
              <path d="M10 100 Q150 97 290 102" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.92" />
              <path d="M12 200 Q150 204 288 198" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.92" />

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
                    {cell === 'X' && <DirtScratchedX highlight={isWinningCell} />}
                    {cell === 'O' && <DirtScratchedO highlight={isWinningCell} />}
                    <AnimatePresence>
                      {isBeingScratched && <DirtDustBurst key={`dust-${idx}`} />}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>

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

          {/* === 3. RIGHT CHARACTER: MA PU TU (BOT) === */}
          <div
            style={{ width: 'min(26vw, 34dvh, 230px)' }}
            className="pointer-events-none relative flex flex-col items-center justify-center shrink-0"
          >
            <AnimatePresence>
              {botMood === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="absolute -top-8 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-stone-950/90 border border-amber-300/60 text-[10px] sm:text-xs font-bold text-amber-200 shadow-lg"
                >
                  {lang === 'my' ? 'အင်း... 🤔' : 'Hmm... 🤔'}
                </motion.div>
              )}

              {botMood === 'dancing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="absolute -top-9 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-rose-600/95 border border-yellow-300 text-[10px] sm:text-xs font-extrabold text-white shadow-lg"
                >
                  {lang === 'my' ? 'ဟေး! နိုင်ပြီ 💃🎉' : 'Yay! I Win! 💃'}
                </motion.div>
              )}

              {botMood === 'rolling_cry' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1, rotate: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 0.45 }}
                  className="absolute -top-9 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-sky-950/95 border border-sky-300/70 text-[10px] sm:text-xs font-extrabold text-sky-200 shadow-lg"
                >
                  {lang === 'my' ? 'အီးဟီး... ရှုံးပြီ 😭' : 'Waaah!! 😭'}
                </motion.div>
              )}
            </AnimatePresence>

            {botMood === 'dancing' && (
              <div className="pointer-events-none absolute -inset-3 z-30">
                {[
                  { left: '8%', top: '4%', color: '#facc15' },
                  { left: '84%', top: '8%', color: '#fb7185' },
                  { left: '12%', top: '70%', color: '#38bdf8' },
                  { left: '86%', top: '65%', color: '#4ade80' },
                ].map((sp, i) => (
                  <motion.span
                    key={i}
                    style={{ left: sp.left, top: sp.top, backgroundColor: sp.color }}
                    animate={{ y: [0, -14, 0], scale: [0.7, 1.4, 0.7] }}
                    transition={{ repeat: Infinity, duration: 0.65 + i * 0.15 }}
                    className="absolute w-2.5 h-2.5 rounded-full shadow-md"
                  />
                ))}
              </div>
            )}

            {botMood === 'rolling_cry' && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-5 z-10">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -10, -16], opacity: [0.85, 0.4, 0], scale: [0.6, 1.3, 1.6] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.22 }}
                    className="w-3 h-3 rounded-full bg-amber-100/75"
                  />
                ))}
              </div>
            )}

            <motion.div
              animate={
                botMood === 'dancing'
                  ? {
                      y: [0, -24, 0, -18, 0],
                      rotate: [-10, 10, -12, 12, -10],
                      scale: [1, 1.08, 1, 1.06, 1],
                    }
                  : botMood === 'rolling_cry'
                  ? {
                      x: [-14, 14, -12, 12, -14],
                      y: [8, 14, 6, 14, 8],
                      rotate: [-28, 28, -24, 24, -28],
                    }
                  : botMood === 'thinking'
                  ? { rotate: [-5, 5, -5] }
                  : botMood === 'bot_scratching'
                  ? { x: [0, -12, 0] }
                  : { y: [0, -2.5, 0] }
              }
              transition={{
                repeat:
                  botMood === 'dancing' || botMood === 'rolling_cry' || botMood === 'thinking'
                    ? Infinity
                    : 0,
                duration:
                  botMood === 'dancing'
                    ? 0.72
                    : botMood === 'rolling_cry'
                    ? 0.9
                    : botMood === 'thinking'
                    ? 1.4
                    : 0.36,
                ease: 'easeInOut',
              }}
              className="relative w-full aspect-square flex items-center justify-center"
            >
              <div className="absolute bottom-[10%] w-[70%] h-[20%] rounded-full bg-black/35 blur-md" />
              {girlSpriteSrc ? (
                <img
                  src={girlSpriteSrc}
                  alt="Ma Pu Tu"
                  data-repaired="1"
                  className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(35,20,8,0.45)]"
                />
              ) : (
                <PaintedMaPuTuCharacter mood={botMood} />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* RESULT OVERLAY BAR */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="absolute inset-x-3 bottom-14 z-30 max-w-xl mx-auto rounded-2xl bg-stone-950/90 backdrop-blur-md border border-amber-400/55 px-3.5 py-2 flex items-center justify-between gap-2 shadow-2xl"
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
                <div className="text-[11px] text-amber-200/85 truncate">
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
  );
};

/* ============================================================================
 * Painted 2D Fallback Characters
 * ============================================================================ */
const PaintedBoyCharacter: React.FC<{
  isScratching: boolean;
  isHappy: boolean;
  isSad: boolean;
}> = ({ isScratching, isHappy, isSad }) => (
  <svg viewBox="0 0 200 200" className="relative w-full h-full drop-shadow-[0_12px_14px_rgba(30,18,8,0.48)]">
    <defs>
      <radialGradient id="boySkin" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffdfc2" />
        <stop offset="100%" stopColor="#d99768" />
      </radialGradient>
      <linearGradient id="boyShirt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5b9df0" />
        <stop offset="60%" stopColor="#3574c7" />
        <stop offset="100%" stopColor="#1e4d8f" />
      </linearGradient>
      <linearGradient id="boyHair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#463024" />
        <stop offset="100%" stopColor="#1c120d" />
      </linearGradient>
    </defs>

    <path d="M52 146 C52 126, 128 124, 134 150 C138 166, 98 176, 68 168 C54 164, 52 154, 52 146 Z" fill="#263c5e" stroke="#15233a" strokeWidth="3" />
    <ellipse cx="128" cy="158" rx="14" ry="8" transform="rotate(-12 128 158)" fill="url(#boySkin)" stroke="#6e4429" strokeWidth="2" />
    <ellipse cx="92" cy="172" rx="12" ry="7" transform="rotate(14 92 172)" fill="url(#boySkin)" stroke="#6e4429" strokeWidth="2" />
    <path d="M46 138 C44 98, 72 86, 98 88 C118 90, 126 112, 122 140 C104 148, 66 150, 46 138 Z" fill="url(#boyShirt)" stroke="#193b6b" strokeWidth="3" />
    <path d="M62 104 Q76 118 68 136" stroke="#85bdfc" strokeWidth="3" fill="none" opacity="0.45" strokeLinecap="round" />

    {!isScratching && (
      <g>
        <path d="M92 110 C112 128, 132 132, 148 138" stroke="url(#boySkin)" strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M140 130 L176 156" stroke="#5c3a21" strokeWidth="6" strokeLinecap="round" />
        <path d="M142 131 L174 155" stroke="#8a5a36" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="147" cy="138" r="8" fill="url(#boySkin)" stroke="#6e4429" strokeWidth="2" />
      </g>
    )}

    <circle cx="102" cy="68" r="36" fill="url(#boySkin)" stroke="#6e4429" strokeWidth="2.6" />
    <circle cx="72" cy="76" r="8" fill="url(#boySkin)" stroke="#6e4429" strokeWidth="2.2" />
    <path d="M66 74 C60 40, 86 24, 112 28 C134 31, 144 48, 138 64 C130 50, 118 48, 108 54 C98 48, 86 54, 80 68 C74 72, 68 76, 66 74 Z" fill="url(#boyHair)" stroke="#140c08" strokeWidth="2.5" />
    <ellipse cx="118" cy="81" rx="6" ry="3.5" fill="#f4846c" opacity="0.38" />
    {isHappy ? (
      <path d="M114 70 Q122 62 129 70" stroke="#1e130e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    ) : (
      <>
        <ellipse cx="121" cy="71" rx="4.5" ry="5.5" fill="#1e130e" />
        <circle cx="122.5" cy="69" r="1.8" fill="#ffffff" />
      </>
    )}
    <path d="M114 59 Q122 56 129 60" stroke="#2a1a12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {isSad ? (
      <path d="M118 90 Q124 85 130 89" stroke="#7c3f26" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M117 87 Q124 93 131 87" stroke="#7c3f26" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

const PaintedMaPuTuCharacter: React.FC<{ mood: TTTBotPhase }> = ({ mood }) => {
  const isDancing = mood === 'dancing';
  const isCry = mood === 'rolling_cry';
  const isThinking = mood === 'thinking';
  const isScratching = mood === 'bot_scratching';

  return (
    <svg viewBox="0 0 200 200" className="relative w-full h-full drop-shadow-[0_12px_14px_rgba(30,18,8,0.48)]">
      <defs>
        <radialGradient id="girlSkin" cx="55%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe1c7" />
          <stop offset="100%" stopColor="#d9996a" />
        </radialGradient>
        <linearGradient id="girlBlouse" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="girlSkirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="girlHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3e2a20" />
          <stop offset="100%" stopColor="#140d0a" />
        </linearGradient>
      </defs>

      <circle cx="136" cy="74" r="15" fill="url(#girlHair)" stroke="#120b08" strokeWidth="2.5" />
      <circle cx="133" cy="73" r="4.5" fill="#fb7185" />
      <path d="M54 146 C58 122, 134 122, 144 148 C150 166, 114 176, 82 172 C58 169, 50 158, 54 146 Z" fill="url(#girlSkirt)" stroke="#6b0f26" strokeWidth="3" />
      <path d="M62 146 Q100 162 138 146" stroke="#fde047" strokeWidth="4" fill="none" strokeDasharray="7 4" />
      <ellipse cx="68" cy="158" rx="13" ry="7.5" transform="rotate(14 68 158)" fill="url(#girlSkin)" stroke="#6e4429" strokeWidth="2" />
      <ellipse cx="104" cy="172" rx="12" ry="7" transform="rotate(-10 104 172)" fill="url(#girlSkin)" stroke="#6e4429" strokeWidth="2" />
      <path d="M78 136 C74 106, 86 90, 108 90 C130 90, 142 108, 138 138 C122 146, 94 146, 78 136 Z" fill="url(#girlBlouse)" stroke="#8c2d0c" strokeWidth="2.8" />
      <path d="M88 96 L108 122 L128 96" stroke="#e11d48" strokeWidth="7" fill="none" strokeLinejoin="round" />

      {isDancing ? (
        <>
          <path d="M84 106 Q56 78 44 52" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M132 106 Q156 76 168 50" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
        </>
      ) : isCry ? (
        <>
          <path d="M84 108 Q52 94 42 74" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M132 108 Q160 94 170 76" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
        </>
      ) : isThinking ? (
        <path d="M88 112 Q68 102 74 88" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
      ) : !isScratching ? (
        <g>
          <path d="M88 112 Q68 128 54 138" stroke="url(#girlSkin)" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M60 132 L26 156" stroke="#5c3a21" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="55" cy="138" r="7.5" fill="url(#girlSkin)" stroke="#6e4429" strokeWidth="2" />
        </g>
      ) : null}

      <circle cx="98" cy="66" r="35" fill="url(#girlSkin)" stroke="#6e4429" strokeWidth="2.5" />
      <path d="M64 62 C64 28, 128 24, 134 62 C126 74, 118 54, 102 48 C86 44, 72 52, 64 62 Z" fill="url(#girlHair)" stroke="#140c08" strokeWidth="2.5" />
      <ellipse cx="75" cy="78" rx="8.5" ry="5" fill="#fef3c7" opacity="0.88" />
      <ellipse cx="106" cy="79" rx="8" ry="4.5" fill="#fef3c7" opacity="0.85" />

      {isDancing ? (
        <>
          <path d="M72 68 Q78 60 85 68" stroke="#1e130e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M96 68 Q103 60 110 68" stroke="#1e130e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      ) : isCry ? (
        <>
          <path d="M72 64 L84 70 L72 74" stroke="#1e130e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M110 64 L98 70 L110 74" stroke="#1e130e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <motion.ellipse cx="68" cy="78" rx="5" ry="3.5" fill="#38bdf8" animate={{ x: [-2, -16], y: [0, 12], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
          <motion.ellipse cx="114" cy="78" rx="5" ry="3.5" fill="#7dd3fc" animate={{ x: [2, 16], y: [0, 12], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.25 }} />
        </>
      ) : (
        <>
          <ellipse cx="78" cy="69" rx="4.5" ry="5.5" fill="#1e130e" />
          <circle cx="76.8" cy="67" r="1.7" fill="#ffffff" />
          <ellipse cx="102" cy="69" rx="4.5" ry="5.5" fill="#1e130e" />
          <circle cx="100.8" cy="67" r="1.7" fill="#ffffff" />
        </>
      )}

      {isDancing ? (
        <path d="M80 84 Q90 95 100 84 Z" fill="#be123c" stroke="#7f1d1d" strokeWidth="1.5" />
      ) : isCry ? (
        <ellipse cx="90" cy="87" rx="8" ry="6" fill="#9f1239" stroke="#4c0519" strokeWidth="2" />
      ) : (
        <path d="M82 85 Q90 91 98 85" stroke="#881337" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
};

/* ============================================================================
 * Dirt Scratched X, O, Dust Burst & Stick-Scratching Hand
 * ============================================================================ */
const DirtScratchedX: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <svg viewBox="0 0 80 80" className="w-[74%] h-[74%] overflow-visible">
    <motion.path d="M18 18 Q40 42 62 62" stroke="#4a2e16" strokeWidth="9" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, ease: 'easeOut' }} />
    <motion.path d="M62 18 Q38 40 18 62" stroke="#4a2e16" strokeWidth="9" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.16, ease: 'easeOut' }} />
    <motion.path d="M18 18 Q40 42 62 62" stroke={highlight ? '#fef08a' : '#f5e6cc'} strokeWidth="4.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, ease: 'easeOut' }} />
    <motion.path d="M62 18 Q38 40 18 62" stroke={highlight ? '#fef08a' : '#f5e6cc'} strokeWidth="4.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.16, ease: 'easeOut' }} />
  </svg>
);

const DirtScratchedO: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <svg viewBox="0 0 80 80" className="w-[76%] h-[76%] overflow-visible">
    <motion.path d="M40 15 C58 14, 67 27, 65 42 C63 59, 51 67, 38 66 C22 65, 14 53, 15 39 C16 24, 27 16, 42 15" stroke="#4a2e16" strokeWidth="9" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.36, ease: 'easeInOut' }} />
    <motion.path d="M40 15 C58 14, 67 27, 65 42 C63 59, 51 67, 38 66 C22 65, 14 53, 15 39 C16 24, 27 16, 42 15" stroke={highlight ? '#fda4af' : '#d6b286'} strokeWidth="4.2" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.36, ease: 'easeInOut' }} />
  </svg>
);

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

const StickScratchHandOverlay: React.FC<{
  side: 'user' | 'bot';
  targetIdx: number;
}> = ({ side, targetIdx }) => {
  const center = getCellCenterPercent(targetIdx);
  const isUser = side === 'user';
  const startOffsetX = isUser ? -95 : 95;
  const scratchMotion = isUser
    ? { x: [0, -10, 10, 10, -10, 0], y: [0, -10, 10, -10, 10, 0] }
    : { x: [0, 10, 0, -10, 0], y: [-10, 0, 10, 0, -10] };

  return (
    <motion.div
      initial={{ opacity: 0, x: startOffsetX, y: 18 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: startOffsetX * 0.7, transition: { duration: 0.16 } }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{ left: `${center.x}%`, top: `${center.y}%` }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        animate={scratchMotion}
        transition={{ duration: 0.34, delay: 0.08, ease: 'easeInOut' }}
        className="relative"
      >
        <svg
          viewBox="0 0 130 70"
          className={`w-28 sm:w-36 h-16 drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] ${
            isUser ? '-translate-x-10' : 'translate-x-10 scale-x-[-1]'
          }`}
        >
          <path d="M4 42 Q34 36 58 34" stroke="#ebb288" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M2 42 L20 39" stroke={isUser ? '#2563eb' : '#e11d48'} strokeWidth="16" strokeLinecap="round" />
          <path d="M52 28 L114 36" stroke="#5c381f" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M56 29 L112 36" stroke="#8b5a2b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="115" cy="36" r="3" fill="#fef3c7" opacity="0.85" />
          <circle cx="62" cy="33" r="9" fill="#ebb288" stroke="#c88d62" strokeWidth="1.5" />
          <path d="M58 26 Q66 24 70 30" stroke="#c88d62" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>
    </motion.div>
  );
};
