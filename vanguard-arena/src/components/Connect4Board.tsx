import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CONNECT4_LOADING_TIMING,
  CONNECT4_SLOT_NAMES,
  getConnect4BotName,
  KID_BOT_AVATAR_DATA_URI,
  resolveMediaSlot,
  type KidMood,
  type ResolvedAsset,
} from '../config/connect4Assets.ts';

export { getConnect4BotName, KID_BOT_AVATAR_DATA_URI };
export type { KidMood };

export interface Connect4BoardProps {
  lang?: 'my' | 'en' | string;
  match: any;
  currentUserId: string;
  onDropColumn?: (col: number) => void;
  onMove?: (move: { col: number }) => void;
  onLeaveFinished?: () => void;
}

const processedKidImageCache = new Map<string, string>();

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Checks if image corners are solid near-white. If already transparent PNG/WebP, skips processing.
 */
function removeExteriorWhiteBgIfNeeded(img: HTMLImageElement): string {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img.src;

  const maxDim = 560;
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

  // If corners are already transparent, return original src untouched
  const cornerIdx = 0;
  if (data[cornerIdx + 3] < 20) {
    return img.src;
  }

  const isNearWhite = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 20) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 220 && max - min <= 34;
  };

  // If top-left and top-right corners aren't white, skip background removal
  const topRightIdx = (cw - 1) * 4;
  if (!isNearWhite(0) && !isNearWhite(topRightIdx)) {
    return img.src;
  }

  const visited = new Uint8Array(cw * ch);
  const queue = new Int32Array(cw * ch);
  let head = 0;
  let tail = 0;

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

  // Smooth 1px edge feathering
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
        if (lum > 195) {
          data[idx + 3] = Math.round(((255 - lum) / 60) * 255);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function prepareKidImage(url: string): Promise<string> {
  const cached = processedKidImageCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    if (isExternalUrl(url)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const processed = removeExteriorWhiteBgIfNeeded(img);
        processedKidImageCache.set(url, processed);
        resolve(processed);
      } catch {
        processedKidImageCache.set(url, url);
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

function preloadVideoElement(url: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    v.onloadeddata = finish;
    v.oncanplay = finish;
    v.onerror = finish;
    v.src = url;
    v.load();
  });
}

/**
 * Renders a kid video (.mp4 or .webm). If the video has a solid white background (e.g. Flow AI MP4),
 * automatically keys out the white background onto a transparent canvas in real time.
 */
const KidVideoRenderer: React.FC<{ src: string; loop: boolean }> = ({ src, loop }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [useCanvasKey, setUseCanvasKey] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});

    let rafId = 0;
    let active = true;
    let decided = false;
    let needsKey = false;

    const renderFrame = () => {
      if (!active || !videoRef.current || !canvasRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
        const targetW = Math.min(360, v.videoWidth);
        const targetH = Math.round((targetW / v.videoWidth) * v.videoHeight);
        if (c.width !== targetW || c.height !== targetH) {
          c.width = targetW;
          c.height = targetH;
        }
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, targetW, targetH);
          try {
            const frame = ctx.getImageData(0, 0, targetW, targetH);
            const d = frame.data;
            if (!decided) {
              decided = true;
              const r = d[0], g = d[1], b = d[2], a = d[3];
              needsKey = a > 200 && Math.min(r, g, b) >= 225 && Math.max(r, g, b) - Math.min(r, g, b) <= 28;
              setUseCanvasKey(needsKey);
            }
            if (needsKey) {
              const w = targetW;
              const h = targetH;
              const visited = new Uint8Array(w * h);
              const queue = new Int32Array(w * h);
              let head = 0;
              let tail = 0;
              const isWhite = (idx: number) => {
                const r = d[idx], g = d[idx + 1], b = d[idx + 2];
                const min = Math.min(r, g, b);
                const max = Math.max(r, g, b);
                return min >= 222 && max - min <= 30;
              };
              const enq = (x: number, y: number) => {
                if (x < 0 || x >= w || y < 0 || y >= h) return;
                const p = y * w + x;
                if (visited[p] || !isWhite(p * 4)) return;
                visited[p] = 1;
                queue[tail++] = p;
              };
              for (let x = 0; x < w; x++) { enq(x, 0); enq(x, h - 1); }
              for (let y = 0; y < h; y++) { enq(0, y); enq(w - 1, y); }
              while (head < tail) {
                const p = queue[head++];
                d[p * 4 + 3] = 0;
                const x = p % w;
                const y = (p - x) / w;
                enq(x + 1, y); enq(x - 1, y); enq(x, y + 1); enq(x, y - 1);
              }
              ctx.putImageData(frame, 0, 0);
            } else {
              return; // Transparent webm or non-white bg: stop canvas loop & show raw video
            }
          } catch {
            setUseCanvasKey(false);
            return;
          }
        }
      }
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      active = false;
      window.cancelAnimationFrame(rafId);
    };
  }, [src]);

  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <video
        ref={videoRef}
        src={src}
        crossOrigin={isExternalUrl(src) ? 'anonymous' : undefined}
        autoPlay
        loop={loop}
        muted
        playsInline
        className={`w-full h-full object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)] ${
          useCanvasKey ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)] ${
          useCanvasKey ? 'block' : 'hidden'
        }`}
      />
    </div>
  );
};

const PhoTharFallbackCharacter: React.FC<{ mood: KidMood }> = ({ mood }) => (
  <svg
    viewBox="0 0 220 220"
    className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
  >
    <defs>
      <radialGradient id="c4Skin" cx="44%" cy="32%" r="65%">
        <stop offset="0%" stopColor="#ffe4cc" />
        <stop offset="68%" stopColor="#f2b892" />
        <stop offset="100%" stopColor="#d18b62" />
      </radialGradient>
      <linearGradient id="c4Hair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3d281e" />
        <stop offset="100%" stopColor="#140d0a" />
      </linearGradient>
      <linearGradient id="c4Hoodie" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#658bb8" />
        <stop offset="100%" stopColor="#314c70" />
      </linearGradient>
    </defs>
    <path d="M44 220 C48 158, 76 142, 110 142 C144 142, 172 158, 176 220 Z" fill="url(#c4Hoodie)" />
    <rect x="96" y="124" width="28" height="24" rx="12" fill="#e5a67e" />
    <circle cx="58" cy="96" r="13" fill="#ebb089" />
    <circle cx="162" cy="96" r="13" fill="#ebb089" />
    <ellipse cx="110" cy="92" rx="52" ry="50" fill="url(#c4Skin)" />
    <path d="M52 90 C48 36, 80 18, 112 18 C146 18, 172 38, 168 90 C156 68, 142 56, 124 62 C114 48, 94 48, 80 64 C68 58, 58 72, 52 90 Z" fill="url(#c4Hair)" />
    <ellipse cx="86" cy="92" rx="9.5" ry="10.5" fill="#ffffff" />
    <ellipse cx="134" cy="92" rx="9.5" ry="10.5" fill="#ffffff" />
    <circle cx="87" cy="93" r="6.2" fill="#3a2013" />
    <circle cx="133" cy="93" r="6.2" fill="#3a2013" />
    <circle cx="85" cy="90" r="2.5" fill="#ffffff" />
    <circle cx="131" cy="90" r="2.5" fill="#ffffff" />
    <path d="M74 74 Q86 68 98 74" stroke="#2a1b14" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M122 74 Q134 68 146 74" stroke="#2a1b14" strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="110" cy="103" rx="6" ry="4" fill="#df9b74" />
    <path
      d={mood === 'crying' ? 'M95 125 Q110 112 125 125' : 'M94 116 Q110 128 126 116'}
      stroke="#8f3a2e"
      strokeWidth="3.8"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

const Connect4LoadingOverlay: React.FC<{
  lang: string;
  progress: number;
  media: ResolvedAsset;
  stageLabel: string;
  onSkip: () => void;
}> = ({ lang, progress, media, stageLabel, onSkip }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || media.kind !== 'video') return;
    v.muted = true;
    v.play().catch(() => {});
  }, [media.kind, media.url]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-[#0b1530] via-[#080f22] to-[#050811]"
    >
      {media.kind === 'video' && media.url && (
        <video
          key={media.url}
          ref={videoRef}
          src={media.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={(e) => e.currentTarget.play().catch(() => {})}
          onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {media.kind === 'image' && media.url && (
        <img
          src={media.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 pb-8 sm:pb-10 flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full text-xs sm:text-sm font-semibold text-amber-200/95 tracking-wide">
          <span>{stageLabel}</span>
          <span>{progress}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-900/80 border border-amber-400/40 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.2)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          />
        </div>

        {progress >= 90 && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium text-amber-100/80 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-amber-400/30 transition cursor-pointer"
          >
            {lang === 'my' ? 'ကျော်မည်' : 'Skip'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

interface LoadedKidBundle {
  idle: ResolvedAsset;
  thinking: ResolvedAsset;
  dropping: ResolvedAsset;
  happy: ResolvedAsset;
  crying: ResolvedAsset;
}

const EMPTY_ASSET: ResolvedAsset = { kind: 'none', url: null };
const EMPTY_KID_BUNDLE: LoadedKidBundle = {
  idle: EMPTY_ASSET,
  thinking: EMPTY_ASSET,
  dropping: EMPTY_ASSET,
  happy: EMPTY_ASSET,
  crying: EMPTY_ASSET,
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
  const [loadingMedia, setLoadingMedia] = useState<ResolvedAsset>(EMPTY_ASSET);
  const [roomBg, setRoomBg] = useState<ResolvedAsset>(EMPTY_ASSET);
  const [kidAssets, setKidAssets] = useState<LoadedKidBundle>(EMPTY_KID_BUNDLE);
  const [isLoadingScene, setIsLoadingScene] = useState(true);
  const [loadProgress, setLoadProgress] = useState(10);
  const [stageLabel, setStageLabel] = useState(
    lang === 'my'
      ? '၄ လုံးတန်း 3D အခန်း ပြင်ဆင်နေပါသည်...'
      : 'Preparing Connect 4 3D Arena...'
  );

  // Strict Preload Gate: Loading View only closes AFTER c4-loading.mp4 shows AND Maung Pho Thar is 100% loaded
  useEffect(() => {
    let mounted = true;
    let closed = false;
    const startedAt = Date.now();
    setIsLoadingScene(true);
    setLoadProgress(12);

    const finishLoading = () => {
      if (!mounted || closed) return;
      closed = true;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, CONNECT4_LOADING_TIMING.minDisplayMs - elapsed);
      setLoadProgress(100);
      window.setTimeout(() => {
        if (mounted) setIsLoadingScene(false);
      }, remaining);
    };

    const safetyTimer = window.setTimeout(
      finishLoading,
      CONNECT4_LOADING_TIMING.maxWaitMs
    );

    const runPreload = async () => {
      // 1. Immediately resolve c4-loading.mp4 (video priority) so Loading View displays it right away
      const loadingSlot = await resolveMediaSlot(CONNECT4_SLOT_NAMES.loading, 'video');
      if (!mounted) return;
      setLoadingMedia(loadingSlot);
      setLoadProgress(28);

      // 2. Resolve Room Background & Maung Pho Thar (idle) in parallel
      setStageLabel(
        lang === 'my'
          ? 'မောင်ဖိုးသား 3D ဇာတ်ကောင် ဖွင့်နေပါသည်...'
          : 'Loading Maung Pho Thar 3D...'
      );
      const [bgSlot, kidIdleRaw] = await Promise.all([
        resolveMediaSlot(CONNECT4_SLOT_NAMES.roomBg, 'video'),
        resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.idle, 'video'),
      ]);
      if (!mounted) return;
      setRoomBg(bgSlot);
      setLoadProgress(55);

      // 3. Fully decode/process Maung Pho Thar (idle) + Room Background BEFORE closing Loading View
      const prepareSingleKid = async (slot: ResolvedAsset): Promise<ResolvedAsset> => {
        if (slot.kind === 'image' && slot.url) {
          const processedUrl = await prepareKidImage(slot.url);
          return { kind: 'image', url: processedUrl };
        }
        if (slot.kind === 'video' && slot.url) {
          await preloadVideoElement(slot.url, 6000);
          return slot;
        }
        return EMPTY_ASSET;
      };

      const preloadBgPromise =
        bgSlot.kind === 'video' && bgSlot.url
          ? preloadVideoElement(bgSlot.url, 4000)
          : bgSlot.kind === 'image' && bgSlot.url
          ? new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => res();
              img.onerror = () => res();
              img.src = bgSlot.url!;
            })
          : Promise.resolve();

      const [kidIdleReady] = await Promise.all([
        prepareSingleKid(kidIdleRaw),
        preloadBgPromise,
      ]);
      if (!mounted) return;

      setKidAssets((prev) => ({ ...prev, idle: kidIdleReady }));
      setLoadProgress(92);
      setStageLabel(
        lang === 'my' ? 'အဆင်သင့်ဖြစ်ပါပြီ!' : 'Ready to Play!'
      );

      // Loading screen can now finish (after minDisplayMs) because Maung Pho Thar is 100% ready!
      finishLoading();

      // 4. Preload remaining moods in background seamlessly
      const [thinkingRaw, droppingRaw, happyRaw, cryingRaw] = await Promise.all([
        resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.thinking, 'video'),
        resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.dropping, 'video'),
        resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.happy, 'video'),
        resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.crying, 'video'),
      ]);
      const [thinking, dropping, happy, crying] = await Promise.all([
        prepareSingleKid(thinkingRaw),
        prepareSingleKid(droppingRaw),
        prepareSingleKid(happyRaw),
        prepareSingleKid(cryingRaw),
      ]);
      if (!mounted) return;
      setKidAssets((prev) => ({
        ...prev,
        thinking,
        dropping,
        happy,
        crying,
      }));
    };

    runPreload();

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
    };
  }, [match?.id, lang]);

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
    !isLoadingScene &&
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

  const activeKidAsset: ResolvedAsset = useMemo(() => {
    const moodAsset = kidAssets[kidMood];
    if (moodAsset.kind !== 'none' && moodAsset.url) return moodAsset;
    return kidAssets.idle;
  }, [kidAssets, kidMood]);

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
  const kidShiftX = kidMood === 'dropping' && botTargetCol !== null ? (botTargetCol - 3) * 18 : 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none bg-[radial-gradient(ellipse_at_top,#1b2b52_0%,#0c1428_55%,#060a14_100%)]">
      {/* 1. 3D ROOM BACKGROUND (Unchanged) */}
      {roomBg.kind === 'video' && roomBg.url && (
        <video
          key={roomBg.url}
          src={roomBg.url}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      )}
      {roomBg.kind === 'image' && roomBg.url && (
        <img
          src={roomBg.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/40 via-transparent to-[#060913]/50 pointer-events-none" />

      {/* 2. LOADING VIDEO OVERLAY (Stays open until Maung Pho Thar is 100% ready) */}
      <AnimatePresence>
        {isLoadingScene && (
          <Connect4LoadingOverlay
            lang={lang}
            progress={loadProgress}
            media={loadingMedia}
            stageLabel={stageLabel}
            onSkip={() => setIsLoadingScene(false)}
          />
        )}
      </AnimatePresence>

      {/* 3. RESPONSIVE PLAY STAGE (Board size unchanged; Maung Pho Thar head peeks naturally above board) */}
      <div className="relative z-10 w-full max-w-[min(94vw,430px)] sm:max-w-[min(92vw,470px)] px-2 sm:px-4 py-2 flex flex-col items-center justify-center">
        {/* Luxury Speech Bubble */}
        <motion.div
          key={statusText}
          initial={{ opacity: 0, y: -5, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-30 mb-1.5 px-4 py-1.5 rounded-2xl bg-[#10182b]/88 backdrop-blur-md border border-amber-300/60 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
        >
          <span className="text-[11px] sm:text-sm font-semibold text-amber-100 tracking-wide whitespace-nowrap">
            {statusText}
          </span>
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#10182b]/90 border-r border-b border-amber-300/60" />
        </motion.div>

        {/* BOT KID LAYER (z-10): Head & face peek naturally over board; torso stays hidden behind board */}
        <motion.div
          animate={{
            x: kidShiftX,
            y:
              kidMood === 'happy'
                ? [0, -7, 0]
                : kidMood === 'crying'
                ? [0, 2, 0]
                : [0, -2, 0],
          }}
          transition={{
            x: { type: 'spring', stiffness: 180, damping: 22 },
            y: {
              repeat: Infinity,
              duration: kidMood === 'happy' ? 0.65 : 2.8,
              ease: 'easeInOut',
            },
          }}
          className="relative z-10 w-[56%] sm:w-[54%] aspect-square -mb-[22%] sm:-mb-[21%] pointer-events-none flex items-end justify-center"
        >
          {activeKidAsset.kind === 'video' && activeKidAsset.url ? (
            <KidVideoRenderer
              key={activeKidAsset.url}
              src={activeKidAsset.url}
              loop={kidMood !== 'dropping'}
            />
          ) : activeKidAsset.kind === 'image' && activeKidAsset.url ? (
            <img
              src={activeKidAsset.url}
              alt="Maung Pho Thar"
              className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)]"
            />
          ) : (
            <PhoTharFallbackCharacter mood={kidMood} />
          )}
        </motion.div>

        {/* LUXURY 3D UPRIGHT CONNECT 4 BOARD (z-20, hides kid's torso behind it) */}
        <div className="relative z-20 w-full flex items-end justify-center">
          {/* Floating Hover / Drop Preview Disc */}
          <div className="absolute -top-7 sm:-top-8 inset-x-0 z-30 flex justify-center pointer-events-none">
            <div className="w-[88%] h-6 sm:h-7 grid grid-cols-7 gap-1.5 px-3">
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
          </div>

          {/* Left Stand Pillar + Cyan LED Strip */}
          <div className="relative w-3 sm:w-3.5 self-stretch rounded-t-lg rounded-bl-xl bg-gradient-to-b from-[#1e3157] via-[#13203b] to-[#0b1326] border border-slate-500/40 shadow-[0_12px_24px_rgba(0,0,0,0.7)] -mr-1 z-20 flex justify-center">
            <div className="w-[2.5px] h-[88%] mt-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
            <div className="absolute -bottom-3.5 left-0 w-4.5 sm:w-5 h-4 rounded-b-xl bg-gradient-to-b from-[#162544] to-[#090f1f] border-x border-b border-cyan-300/40 shadow-lg" />
          </div>

          {/* Main Gold-Trimmed Navy Frame */}
          <div className="relative z-10 flex-1 rounded-2xl p-[4px] sm:p-[5px] bg-gradient-to-b from-[#f3d48c] via-[#c79d4b] to-[#8c6827] shadow-[0_-6px_22px_rgba(0,0,0,0.6),0_18px_40px_rgba(0,0,0,0.75)]">
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
