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

// GitHub Repository ရှိ public/assets/ မှ တိုက်ရိုက်ယူမည် (404 လုံးဝမတက်စေရန်)
const RAW_BASE = 'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/public/assets';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/YanLinnAung98/MyanRena@main/public/assets';

export const TTT_BG_DIRECT_URL = `${RAW_BASE}/ttt-village-bg.jpg`;
export const TTT_KID_BOT_AVATAR_DATA_URI = `${RAW_BASE}/ttt-girl-idle.jpg`;

function getDirectCandidates(baseName: string): string[] {
  return [
    `${RAW_BASE}/${baseName}.jpg`,
    `${RAW_BASE}/${baseName}.jpeg`,
    `${CDN_BASE}/${baseName}.jpg`,
    `${CDN_BASE}/${baseName}.jpeg`,
  ];
}

// Transparent Sprite Cache + Duplicate Request Guard
const transparentCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string | null>>();

function loadImage(url: string, withCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (withCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function loadTransparentSprite(baseName: string): Promise<string | null> {
  if (transparentCache.has(baseName)) {
    return Promise.resolve(transparentCache.get(baseName)!);
  }
  if (inFlightCache.has(baseName)) {
    return inFlightCache.get(baseName)!;
  }

  const task = (async () => {
    const candidates = getDirectCandidates(baseName);
    for (const url of candidates) {
      try {
        const img = await loadImage(url, true);
        const maxDim = 512;
        const scale = Math.min(
          1,
          maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
        );
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          transparentCache.set(baseName, url);
          return url;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // အပြင်ဘက် အဖြူရောင်နောက်ခံတစ်ခုတည်းကိုသာ Flood-Fill ဖျက်မည်
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isNearWhite = (idx4: number) => {
          const r = data[idx4];
          const g = data[idx4 + 1];
          const b = data[idx4 + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          return r > 228 && g > 228 && b > 228 && maxC - minC < 26;
        };

        const pushIfBg = (x: number, y: number) => {
          const p = y * w + x;
          if (visited[p]) return;
          const idx4 = p * 4;
          if (isNearWhite(idx4)) {
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
          const idx4 = p * 4;
          data[idx4 + 3] = 0;

          const x = p % w;
          const y = (p - x) / w;

          if (x > 0) pushIfBg(x - 1, y);
          if (x < w - 1) pushIfBg(x + 1, y);
          if (y > 0) pushIfBg(x, y - 1);
          if (y < h - 1) pushIfBg(x, y + 1);
        }

        // 1px Soft Feather
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            const idx4 = p * 4;
            if (data[idx4 + 3] === 0) continue;
            const hasTransparentNeighbor =
              data[(p - 1) * 4 + 3] === 0 ||
              data[(p + 1) * 4 + 3] === 0 ||
              data[(p - w) * 4 + 3] === 0 ||
              data[(p + w) * 4 + 3] === 0;
            if (hasTransparentNeighbor) {
              const avg = (data[idx4] + data[idx4 + 1] + data[idx4 + 2]) / 3;
              if (avg > 205) {
                data[idx4 + 3] = Math.round(data[idx4 + 3] * 0.35);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUri = canvas.toDataURL('image/png');
        transparentCache.set(baseName, resultUri);
        return resultUri;
      } catch {
        // try next candidate
      }
    }
    return null;
  })();

  inFlightCache.set(baseName, task);
  return task;
}

// App စဖွင့်ကတည်းက တစ်ကြိမ်သာ Preload လုပ်ထားမည်
if (typeof window !== 'undefined') {
  const preloadBg = new Image();
  preloadBg.src = TTT_BG_DIRECT_URL;
  void loadTransparentSprite('ttt-boy');
  void loadTransparentSprite('ttt-girl-idle');
  void loadTransparentSprite('ttt-girl-dance');
  void loadTransparentSprite('ttt-girl-cry');
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

  const bgCandidates = getDirectCandidates('ttt-village-bg');
  const [bgIdx, setBgIdx] = useState(0);

  const [sprites, setSprites] = useState<{
    boy: string | null;
    girlIdle: string | null;
    girlDance: string | null;
    girlCry: string | null;
  }>({
    boy: transparentCache.get('ttt-boy') || null,
    girlIdle: transparentCache.get('ttt-girl-idle') || null,
    girlDance: transparentCache.get('ttt-girl-dance') || null,
    girlCry: transparentCache.get('ttt-girl-cry') || null,
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      loadTransparentSprite('ttt-boy'),
      loadTransparentSprite('ttt-girl-idle'),
      loadTransparentSprite('ttt-girl-dance'),
      loadTransparentSprite('ttt-girl-cry'),
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

  const girlActiveSrc =
    botMood === 'dancing'
      ? sprites.girlDance || sprites.girlIdle
      : botMood === 'rolling_cry'
      ? sprites.girlCry || sprites.girlIdle
      : sprites.girlIdle;

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#2a1e12]">
      {/* FULL-SCREEN VILLAGE BACKGROUND */}
      <img
        src={bgCandidates[Math.min(bgIdx, bgCandidates.length - 1)]}
        alt="Village Dirt Ground"
        data-repaired="1"
        onError={() => {
          if (bgIdx + 1 < bgCandidates.length) {
            setBgIdx((i) => i + 1);
          }
        }}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Subtle Vignette for Top/Bottom UI Readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/50" />

      {/* FLOATING STATUS PILL */}
      <div className="absolute top-16 sm:top-20 inset-x-3 z-30 flex justify-center pointer-events-none">
        <motion.div
          key={statusText()}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-xl backdrop-blur-md text-center ${
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

      {/* CENTER RESPONSIVE PLAY STAGE (PC + Phone အပြည့်) */}
      <div className="relative z-20 w-full h-full flex items-center justify-center px-1 sm:px-6 pt-12 pb-14">
        <div className="w-full max-w-[980px] flex items-center justify-center gap-0.5 sm:gap-4 lg:gap-8">
          {/* === 1. LEFT CHARACTER: USER BOY === */}
          <div className="pointer-events-none relative w-[25%] sm:w-[24%] max-w-[230px] flex flex-col items-center justify-center shrink-0">
            <motion.div
              animate={
                userWon
                  ? { y: [0, -14, 0], rotate: [-4, 4, -4] }
                  : activeScratch?.side === 'user'
                  ? { x: [0, 12, 0] }
                  : botWon
                  ? { y: [0, 3, 0] }
                  : { y: [0, -3, 0] }
              }
              transition={{
                repeat: userWon ? Infinity : 0,
                duration: userWon ? 0.55 : 0.38,
              }}
              className="relative w-full aspect-square flex items-center justify-center"
            >
              <div className="absolute bottom-[10%] w-[72%] h-[22%] rounded-full bg-black/35 blur-md" />
              {sprites.boy && (
                <img
                  src={sprites.boy}
                  alt="Player Boy"
                  data-repaired="1"
                  className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(35,20,8,0.45)]"
                />
              )}
            </motion.div>
          </div>

          {/* === 2. CENTER DIRT TIC-TAC-TOE GRID (3x3) === */}
          <div className="relative w-[48%] sm:w-[44%] max-w-[360px] aspect-square shrink-0">
            <svg
              viewBox="0 0 300 300"
              className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_1px_2px_rgba(255,235,200,0.45)]"
            >
              <path d="M100 10 Q97 150 102 290" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />
              <path d="M200 12 Q203 150 198 288" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />
              <path d="M10 100 Q150 97 290 102" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />
              <path d="M12 200 Q150 204 288 198" stroke="#4f331b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />

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
          <div className="pointer-events-none relative w-[25%] sm:w-[24%] max-w-[230px] flex flex-col items-center justify-center shrink-0">
            <AnimatePresence>
              {botMood === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="absolute -top-8 sm:-top-10 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-stone-950/90 border border-amber-300/60 text-[10px] sm:text-xs font-bold text-amber-200 shadow-lg"
                >
                  {lang === 'my' ? 'အင်း... 🤔' : 'Hmm... 🤔'}
                </motion.div>
              )}

              {botMood === 'dancing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="absolute -top-9 sm:-top-11 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-rose-600/95 border border-yellow-300 text-[10px] sm:text-xs font-extrabold text-white shadow-lg"
                >
                  {lang === 'my' ? 'ဟေး! နိုင်ပြီ 💃🎉' : 'Yay! I Win! 💃'}
                </motion.div>
              )}

              {botMood === 'rolling_cry' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1, rotate: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 0.45 }}
                  className="absolute -top-9 sm:-top-11 z-30 whitespace-nowrap px-2.5 py-1 rounded-2xl bg-sky-950/95 border border-sky-300/70 text-[10px] sm:text-xs font-extrabold text-sky-200 shadow-lg"
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
                      y: [0, -28, 0, -22, 0],
                      rotate: [-10, 10, -12, 12, -10],
                      scale: [1, 1.08, 1, 1.06, 1],
                    }
                  : botMood === 'rolling_cry'
                  ? {
                      x: [-14, 14, -12, 12, -14],
                      y: [8, 14, 6, 14, 8],
                      rotate: [-26, 26, -22, 22, -26],
                    }
                  : botMood === 'thinking'
                  ? { rotate: [-5, 5, -5] }
                  : botMood === 'bot_scratching'
                  ? { x: [0, -12, 0] }
                  : { y: [0, -3, 0] }
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
              <div className="absolute bottom-[10%] w-[72%] h-[22%] rounded-full bg-black/35 blur-md" />
              {girlActiveSrc && (
                <img
                  src={girlActiveSrc}
                  alt="Ma Pu Tu"
                  data-repaired="1"
                  className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(35,20,8,0.45)]"
                />
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
            className="absolute inset-x-3 bottom-16 z-30 max-w-xl mx-auto rounded-2xl bg-stone-950/90 backdrop-blur-md border border-amber-400/55 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xl"
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

const DirtScratchedX: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <svg viewBox="0 0 80 80" className="w-[74%] h-[74%] overflow-visible">
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
