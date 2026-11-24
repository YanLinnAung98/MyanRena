import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CONNECT4_ASSETS,
  getConnect4BotName,
  KID_BOT_AVATAR_DATA_URI,
} from '../config/connect4Assets.ts';

export { getConnect4BotName, KID_BOT_AVATAR_DATA_URI };

export type KidMood = 'idle' | 'thinking' | 'dropping' | 'happy' | 'crying';

export interface Connect4BoardProps {
  lang?: 'my' | 'en' | string;
  match: any;
  currentUserId: string;
  onDropColumn?: (col: number) => void;
  onMove?: (move: { col: number }) => void;
  onLeaveFinished?: () => void;
}

const transparentCache = new Map<string, string>();

function removeExteriorWhiteBg(img: HTMLImageElement): string {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img.src;

  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return img.src;

  ctx.drawImage(img, 0, 0, cw, ch);
  const imgData = ctx.getImageData(0, 0, cw, ch);
  const data = imgData.data;

  const visited = new Uint8Array(cw * ch);
  const queue = new Int32Array(cw * ch);
  let head = 0;
  let tail = 0;

  const isNearWhite = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 226 && max - min <= 28;
  };

  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= cw || y < 0 || y >= ch) return;
    const p = y * cw + x;
    if (visited[p]) return;
    const idx = p * 4;
    if (!isNearWhite(idx)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < cw; x++) {
    enqueue(x, 0);
    enqueue(x, ch - 1);
  }
  for (let y = 0; y < ch; y++) {
    enqueue(0, y);
    enqueue(cw - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    data[p * 4 + 3] = 0;
    const x = p % cw;
    const y = (p - x) / cw;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const p = y * cw + x;
      if (visited[p]) continue;
      if (
        visited[p - 1] ||
        visited[p + 1] ||
        visited[p - cw] ||
        visited[p + cw]
      ) {
        const idx = p * 4;
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (lum > 200) {
          data[idx + 3] = Math.round(((255 - lum) / 55) * 255);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function useTransparentKidSrc(candidates: readonly string[]): string | null {
  const cacheKey = candidates[0];
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(
    () => transparentCache.get(cacheKey) || null
  );

  useEffect(() => {
    const cached = transparentCache.get(cacheKey);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    let cancelled = false;
    let index = 0;

    const tryLoad = () => {
      if (cancelled || index >= candidates.length) return;
      const url = candidates[index];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        try {
          const pngUrl = removeExteriorWhiteBg(img);
          transparentCache.set(cacheKey, pngUrl);
          setResolvedSrc(pngUrl);
        } catch {
          transparentCache.set(cacheKey, url);
          setResolvedSrc(url);
        }
      };
      img.onerror = () => {
        index += 1;
        tryLoad();
      };
      img.src = url;
    };

    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, candidates]);

  return resolvedSrc;
}

const Connect4LoadingOverlay: React.FC<{
  lang: string;
  onDone: () => void;
}> = ({ lang, onDone }) => {
  const [videoIdx, setVideoIdx] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [progress, setProgress] = useState(12);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const start = Date.now();
    const duration = 2200;
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round(12 + (elapsed / duration) * 88));
      setProgress(pct);
      if (elapsed >= duration) {
        window.clearInterval(tick);
        onDone();
      }
    }, 60);

    return () => window.clearInterval(tick);
  }, [onDone]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    v.muted = true;
    v.play().catch(() => {});
  }, [videoIdx, videoFailed]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-[#0b1530] via-[#080f22] to-[#050811]"
    >
      {!videoFailed ? (
        <video
          key={CONNECT4_ASSETS.loadingVideo[videoIdx]}
          ref={videoRef}
          src={CONNECT4_ASSETS.loadingVideo[videoIdx]}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onError={() => {
            if (videoIdx + 1 < CONNECT4_ASSETS.loadingVideo.length) {
              setVideoIdx((i) => i + 1);
            } else {
              setVideoFailed(true);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        imgIdx < CONNECT4_ASSETS.loadingImage.length && (
          <img
            src={CONNECT4_ASSETS.loadingImage[imgIdx]}
            alt=""
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgLoaded(false);
              setImgIdx((i) => i + 1);
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 pb-8 sm:pb-10 flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full text-xs sm:text-sm font-semibold text-amber-200/95 tracking-wide">
          <span>
            {lang === 'my'
              ? '၄ လုံးတန်း 3D အခန်း ပြင်ဆင်နေပါသည်...'
              : 'Preparing Connect 4 3D Arena...'}
          </span>
          <span>{progress}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-900/80 border border-amber-400/40 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.2)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.15 }}
          />
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium text-amber-100/80 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-amber-400/30 transition cursor-pointer"
        >
          {lang === 'my' ? 'ကျော်မည်' : 'Skip'}
        </button>
      </div>
    </motion.div>
  );
};

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  lang = 'my',
  match,
  currentUserId,
  onDropColumn,
  onMove,
  onLeaveFinished,
}) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [bgVideoIdx, setBgVideoIdx] = useState(0);
  const [bgVideoFailed, setBgVideoFailed] = useState(false);
  const [bgImgIdx, setBgImgIdx] = useState(0);
  const [bgImgLoaded, setBgImgLoaded] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setShowIntro(true);
  }, [match?.id]);

  const grid: Array<Array<string | null>> = useMemo(() => {
    if (Array.isArray(match?.c4Board) && match.c4Board.length === 6) {
      return match.c4Board;
    }
    return Array.from({ length: 6 }, () => Array(7).fill(null));
  }, [match?.c4Board]);

  const players = match?.players || [];
  const p1 = players[0];
  const isFinished = match?.status === 'finished';
  const isPvp = Boolean(match?.isRealtimePvp && players.length >= 2);
  const isMyTurn =
    !isFinished &&
    (isPvp
      ? match?.turnUserId === currentUserId
      : match?.botPhase !== 'thinking' && match?.botPhase !== 'dropping');

  const myDisc: 'P1' | 'P2' =
    isPvp && p1?.id && p1.id !== currentUserId ? 'P2' : 'P1';

  const kidMood: KidMood = useMemo(() => {
    if (isFinished) {
      if (match?.isDraw) return 'idle';
      return match?.winnerId === currentUserId ? 'crying' : 'happy';
    }
    const phase = match?.botPhase;
    if (
      phase === 'thinking' ||
      phase === 'dropping' ||
      phase === 'happy' ||
      phase === 'crying'
    ) {
      return phase;
    }
    return 'idle';
  }, [isFinished, match?.isDraw, match?.winnerId, match?.botPhase, currentUserId]);

  const kidIdleSrc = useTransparentKidSrc(CONNECT4_ASSETS.kid.idle);
  const kidThinkingSrc = useTransparentKidSrc(CONNECT4_ASSETS.kid.thinking);
  const kidDroppingSrc = useTransparentKidSrc(CONNECT4_ASSETS.kid.dropping);
  const kidHappySrc = useTransparentKidSrc(CONNECT4_ASSETS.kid.happy);
  const kidCryingSrc = useTransparentKidSrc(CONNECT4_ASSETS.kid.crying);

  const activeKidSrc = useMemo(() => {
    switch (kidMood) {
      case 'thinking':
        return kidThinkingSrc || kidIdleSrc;
      case 'dropping':
        return kidDroppingSrc || kidIdleSrc;
      case 'happy':
        return kidHappySrc || kidIdleSrc;
      case 'crying':
        return kidCryingSrc || kidIdleSrc;
      default:
        return kidIdleSrc;
    }
  }, [kidMood, kidIdleSrc, kidThinkingSrc, kidDroppingSrc, kidHappySrc, kidCryingSrc]);

  const winningSet = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(match?.winningCells)) {
      match.winningCells.forEach(([r, c]: [number, number]) => set.add(`${r}-${c}`));
    }
    return set;
  }, [match?.winningCells]);

  const statusText = useMemo(() => {
    if (isFinished) {
      if (match?.isDraw) {
        return lang === 'my' ? 'သရေကျသွားပါပြီ!' : "It's a Draw!";
      }
      if (match?.winnerId === currentUserId) {
        return lang === 'my' ? 'သင် အနိုင်ရရှိပါပြီ!' : 'You Won!';
      }
      return lang === 'my' ? 'မောင်ဖိုးသား အနိုင်ရသွားပါပြီ!' : 'Maung Pho Thar Won!';
    }
    if (!isMyTurn) {
      if (kidMood === 'dropping') {
        return lang === 'my' ? 'မောင်ဖိုးသား အကွက်ချနေသည်...' : 'Dropping disc...';
      }
      return lang === 'my' ? 'မောင်ဖိုးသား စဥ်းစားနေသည်...' : 'Thinking...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ပါ'
      : 'Your Turn — Tap a column';
  }, [isFinished, match?.isDraw, match?.winnerId, currentUserId, isMyTurn, kidMood, lang]);

  const handleColClick = (col: number) => {
    if (!isMyTurn || grid[0]?.[col] !== null) return;
    if (onDropColumn) onDropColumn(col);
    else if (onMove) onMove({ col });
  };

  const botTargetCol = typeof match?.botTargetCol === 'number' ? match.botTargetCol : null;
  const kidShiftX = kidMood === 'dropping' && botTargetCol !== null ? (botTargetCol - 3) * 20 : 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none bg-[radial-gradient(ellipse_at_top,#1b2b52_0%,#0c1428_55%,#060a14_100%)]">
      {/* 1. 3D ROOM BACKGROUND (Loop Video first, then Image fallback, never shows broken icon) */}
      {!bgVideoFailed ? (
        <video
          key={CONNECT4_ASSETS.roomBgVideo[bgVideoIdx]}
          src={CONNECT4_ASSETS.roomBgVideo[bgVideoIdx]}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onError={() => {
            if (bgVideoIdx + 1 < CONNECT4_ASSETS.roomBgVideo.length) {
              setBgVideoIdx((i) => i + 1);
            } else {
              setBgVideoFailed(true);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      ) : (
        bgImgIdx < CONNECT4_ASSETS.roomBgImage.length && (
          <img
            src={CONNECT4_ASSETS.roomBgImage[bgImgIdx]}
            alt=""
            onLoad={() => setBgImgLoaded(true)}
            onError={() => {
              setBgImgLoaded(false);
              setBgImgIdx((i) => i + 1);
            }}
            className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-300 ${
              bgImgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/40 via-transparent to-[#060913]/50 pointer-events-none" />

      {/* 2. LOADING VIDEO OVERLAY */}
      <AnimatePresence>
        {showIntro && (
          <Connect4LoadingOverlay
            lang={lang}
            onDone={() => setShowIntro(false)}
          />
        )}
      </AnimatePresence>

      {/* 3. RESPONSIVE PLAY STAGE (Fits Speech Bubble + 3D Kid + Upright Board on any screen) */}
      <div className="relative z-10 w-full max-w-[min(94vw,430px)] sm:max-w-[min(92vw,470px)] px-2 sm:px-4 py-2 flex flex-col items-center justify-center">
        {/* Luxury Speech Bubble */}
        <motion.div
          key={statusText}
          initial={{ opacity: 0, y: -5, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-30 mb-1 px-4 py-1.5 rounded-2xl bg-[#10182b]/88 backdrop-blur-md border border-amber-300/60 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
        >
          <span className="text-[11px] sm:text-sm font-semibold text-amber-100 tracking-wide whitespace-nowrap">
            {statusText}
          </span>
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#10182b]/90 border-r border-b border-amber-300/60" />
        </motion.div>

        {/* BOT KID LAYER (z-10, naturally tucked behind the upright board) */}
        <motion.div
          animate={{
            x: kidShiftX,
            y:
              kidMood === 'happy'
                ? [0, -8, 0]
                : kidMood === 'crying'
                ? [0, 2, 0]
                : [0, -2.5, 0],
          }}
          transition={{
            x: { type: 'spring', stiffness: 180, damping: 22 },
            y: {
              repeat: Infinity,
              duration: kidMood === 'happy' ? 0.65 : 2.8,
              ease: 'easeInOut',
            },
          }}
          className="relative z-10 w-[54%] sm:w-[52%] aspect-square -mb-[19%] sm:-mb-[18%] pointer-events-none flex items-end justify-center"
        >
          {activeKidSrc && (
            <img
              src={activeKidSrc}
              alt=""
              className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]"
            />
          )}
        </motion.div>

        {/* FLOATING HOVER / DROP PREVIEW DISC */}
        <div className="relative z-30 w-[88%] h-6 sm:h-7 grid grid-cols-7 gap-1.5 px-3 mb-0.5 pointer-events-none">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => {
            const showUserPreview = isMyTurn && hoverCol === col && grid[0]?.[col] === null;
            const showBotPreview = kidMood === 'dropping' && botTargetCol === col;
            return (
              <div key={col} className="flex items-center justify-center">
                {showUserPreview && (
                  <motion.div
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 ${
                      myDisc === 'P1'
                        ? 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border-yellow-100 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                        : 'bg-gradient-to-br from-rose-300 via-red-500 to-red-700 border-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.9)]'
                    }`}
                  />
                )}
                {showBotPreview && (
                  <motion.div
                    initial={{ y: -10, scale: 0.8 }}
                    animate={{ y: 3, scale: 1 }}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-rose-300 via-red-500 to-red-700 border-2 border-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.95)]"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* LUXURY 3D UPRIGHT CONNECT 4 BOARD (z-20, strictly in front of kid) */}
        <div className="relative z-20 w-full flex items-end justify-center">
          {/* Left Stand Pillar + Cyan LED Strip */}
          <div className="relative w-3 sm:w-3.5 self-stretch rounded-t-lg rounded-bl-xl bg-gradient-to-b from-[#1e3157] via-[#13203b] to-[#0b1326] border border-slate-500/40 shadow-[0_12px_24px_rgba(0,0,0,0.7)] -mr-1 z-20 flex justify-center">
            <div className="w-[2.5px] h-[88%] mt-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
            <div className="absolute -bottom-3.5 left-0 w-4.5 sm:w-5 h-4 rounded-b-xl bg-gradient-to-b from-[#162544] to-[#090f1f] border-x border-b border-cyan-300/40 shadow-lg" />
          </div>

          {/* Main Gold-Trimmed Navy Frame */}
          <div className="relative z-10 flex-1 rounded-2xl p-[4px] sm:p-[5px] bg-gradient-to-b from-[#f3d48c] via-[#c79d4b] to-[#8c6827] shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
            <div className="rounded-[12px] bg-gradient-to-b from-[#172542] via-[#101b33] to-[#0c1428] p-1.5 sm:p-2.5 shadow-[inset_0_4px_14px_rgba(0,0,0,0.65)]">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                  const colFull = grid[0]?.[col] !== null;
                  const isHovered = isMyTurn && hoverCol === col && !colFull;
                  return (
                    <button
                      key={col}
                      type="button"
                      disabled={!isMyTurn || colFull}
                      onMouseEnter={() => setHoverCol(col)}
                      onMouseLeave={() => setHoverCol(null)}
                      onClick={() => handleColClick(col)}
                      className={`group flex flex-col gap-1 sm:gap-1.5 rounded-xl py-0.5 transition-colors ${
                        isHovered
                          ? 'bg-amber-300/12 cursor-pointer'
                          : isMyTurn && !colFull
                          ? 'cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      {[0, 1, 2, 3, 4, 5].map((row) => {
                        const cell = grid[row]?.[col];
                        const isWinning = winningSet.has(`${row}-${col}`);
                        return (
                          <div
                            key={row}
                            className={`relative aspect-square w-full rounded-full p-[2px] bg-gradient-to-b from-[#e5c06e] via-[#9e7830] to-[#f1d388] shadow-[inset_0_3px_8px_rgba(0,0,0,0.85)] ${
                              isWinning
                                ? 'ring-2 ring-white shadow-[0_0_16px_rgba(255,255,255,0.95)]'
                                : ''
                            }`}
                          >
                            <div className="w-full h-full rounded-full bg-[#090e1c]/90 shadow-[inset_0_5px_10px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center">
                              {cell && (
                                <motion.div
                                  initial={{ y: -(row + 1) * 44, opacity: 0.7 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 290,
                                    damping: 20,
                                    mass: 0.85,
                                  }}
                                  className={`w-[92%] h-[92%] rounded-full border ${
                                    cell === 'P1'
                                      ? 'bg-[radial-gradient(circle_at_35%_30%,#fef08a_0%,#facc15_45%,#ca8a04_100%)] border-yellow-100/80 shadow-[0_0_14px_rgba(250,204,21,0.75),inset_0_-3px_6px_rgba(113,63,18,0.6)]'
                                      : 'bg-[radial-gradient(circle_at_35%_30%,#fda4af_0%,#ef4444_48%,#991b1b_100%)] border-rose-100/80 shadow-[0_0_14px_rgba(239,68,68,0.8),inset_0_-3px_6px_rgba(127,29,29,0.65)]'
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Stand Pillar + Cyan LED Strip */}
          <div className="relative w-3 sm:w-3.5 self-stretch rounded-t-lg rounded-br-xl bg-gradient-to-b from-[#1e3157] via-[#13203b] to-[#0b1326] border border-slate-500/40 shadow-[0_12px_24px_rgba(0,0,0,0.7)] -ml-1 z-20 flex justify-center">
            <div className="w-[2.5px] h-[88%] mt-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
            <div className="absolute -bottom-3.5 right-0 w-4.5 sm:w-5 h-4 rounded-b-xl bg-gradient-to-b from-[#162544] to-[#090f1f] border-x border-b border-cyan-300/40 shadow-lg" />
          </div>
        </div>

        {/* Tabletop Contact Shadow */}
        <div className="w-[90%] h-2.5 mt-2.5 rounded-full bg-black/55 blur-md pointer-events-none" />

        {/* Match Finished Action */}
        {isFinished && onLeaveFinished && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            onClick={onLeaveFinished}
            className="mt-3 px-6 py-2 rounded-full font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-110 shadow-[0_8px_24px_rgba(251,191,36,0.45)] transition cursor-pointer"
          >
            {lang === 'my' ? 'Lobby သို့ ပြန်သွားမည်' : 'Back to Lobby'}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Connect4Board;
