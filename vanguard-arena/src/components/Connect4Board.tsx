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
 * Removes solid white exterior background via corner flood-fill + 1px anti-alias feathering.
 */
function keyOutWhiteBuffer(
  data: Uint8ClampedArray,
  w: number,
  h: number
): void {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const isNearWhite = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 20) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 216 && max - min <= 36;
  };

  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    if (!isNearWhite(p * 4)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    data[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Smooth 1px edge feathering to prevent white halo against dark bedroom background
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (visited[p]) continue;
      if (
        visited[p - 1] ||
        visited[p + 1] ||
        visited[p - w] ||
        visited[p + w]
      ) {
        const idx = p * 4;
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (lum > 185) {
          data[idx + 3] = Math.round(((255 - lum) / 70) * 255);
        }
      }
    }
  }
}

function removeExteriorWhiteBgIfNeeded(img: HTMLImageElement): string {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (!nw || !nh) return img.src;

  // Center-square crop if source image is widescreen (e.g. 16:9)
  const isWide = nw > nh * 1.12;
  const sx = isWide ? Math.floor((nw - nh) / 2) : 0;
  const sw = isWide ? nh : nw;
  const sh = nh;

  const maxDim = 560;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const cw = Math.max(1, Math.round(sw * scale));
  const ch = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return img.src;

  ctx.drawImage(img, sx, 0, sw, sh, 0, 0, cw, ch);
  const imgData = ctx.getImageData(0, 0, cw, ch);
  const data = imgData.data;

  // Already transparent PNG/WebP
  if (data[3] < 20) {
    return isWide ? canvas.toDataURL('image/png') : img.src;
  }

  const topRight = (cw - 1) * 4;
  const cornerIsWhite = (i: number) =>
    Math.min(data[i], data[i + 1], data[i + 2]) >= 216 &&
    Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]) <=
      36;

  if (!cornerIsWhite(0) && !cornerIsWhite(topRight)) {
    return isWide ? canvas.toDataURL('image/png') : img.src;
  }

  keyOutWhiteBuffer(data, cw, ch);
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

function preloadVideoElement(url: string, timeoutMs = 5500): Promise<void> {
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
 * Renders 3D Maung Pho Thar video (.mp4 / .webm).
 * Automatically center-crops 16:9 widescreen Flow AI videos into a clean 1:1 character frame
 * and keys out solid white backgrounds cleanly so the character sits naturally behind the board.
 */
const KidVideoRenderer: React.FC<{ src: string; loop: boolean }> = ({
  src,
  loop,
}) => {
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
        // Center-square crop for 16:9 widescreen videos so Maung Pho Thar is full-size, never shrunk
        const isWide = v.videoWidth > v.videoHeight * 1.12;
        const srcW = isWide ? v.videoHeight : v.videoWidth;
        const srcH = v.videoHeight;
        const sx = isWide ? Math.floor((v.videoWidth - srcW) / 2) : 0;

        const targetSize = 384;
        const targetW = targetSize;
        const targetH = Math.round((srcH / srcW) * targetSize);

        if (c.width !== targetW || c.height !== targetH) {
          c.width = targetW;
          c.height = targetH;
        }

        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, sx, 0, srcW, srcH, 0, 0, targetW, targetH);
          try {
            const frame = ctx.getImageData(0, 0, targetW, targetH);
            const d = frame.data;
            if (!decided) {
              decided = true;
              const r = d[0],
                g = d[1],
                b = d[2],
                a = d[3];
              needsKey =
                a > 200 &&
                Math.min(r, g, b) >= 216 &&
                Math.max(r, g, b) - Math.min(r, g, b) <= 36;
              setUseCanvasKey(needsKey);
            }
            if (needsKey) {
              keyOutWhiteBuffer(d, targetW, targetH);
              ctx.putImageData(frame, 0, 0);
            } else {
              return;
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
    <div className="relative w-full h-full flex items-end justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        crossOrigin={isExternalUrl(src) ? 'anonymous' : undefined}
        autoPlay
        loop={loop}
        muted
        playsInline
        className={`w-full h-full object-cover object-top brightness-[0.96] contrast-[1.03] drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)] ${
          useCanvasKey ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain object-bottom brightness-[0.96] contrast-[1.03] drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)] ${
          useCanvasKey ? 'block' : 'hidden'
        }`}
      />
    </div>
  );
};

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
      const remaining = Math.max(
        0,
        CONNECT4_LOADING_TIMING.minDisplayMs - elapsed
      );
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
      const loadingSlot = await resolveMediaSlot(
        CONNECT4_SLOT_NAMES.loading,
        'video'
      );
      if (!mounted) return;
      setLoadingMedia(loadingSlot);
      setLoadProgress(28);

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

      const prepareSingleKid = async (
        slot: ResolvedAsset
      ): Promise<ResolvedAsset> => {
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
      setStageLabel(lang === 'my' ? 'အဆင်သင့်ဖြစ်ပါပြီ!' : 'Ready to Play!');

      finishLoading();

      // Background preload for remaining moods
      const [thinkingRaw, droppingRaw, happyRaw, cryingRaw] = await Promise.all(
        [
          resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.thinking, 'video'),
          resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.dropping, 'video'),
          resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.happy, 'video'),
          resolveMediaSlot(CONNECT4_SLOT_NAMES.kid.crying, 'video'),
        ]
      );
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
  }, [
    isFinished,
    match?.isDraw,
    match?.winnerId,
    match?.botPhase,
    currentUserId,
  ]);

  const activeKidAsset: ResolvedAsset = useMemo(() => {
    const moodAsset = kidAssets[kidMood];
    if (moodAsset.kind !== 'none' && moodAsset.url) return moodAsset;
    return kidAssets.idle;
  }, [kidAssets, kidMood]);

  const winningSet = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(match?.winningCells)) {
      match.winningCells.forEach(([r, c]: [number, number]) =>
        set.add(`${r}-${c}`)
      );
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
      return lang === 'my'
        ? 'မောင်ဖိုးသား အနိုင်ရသွားပါပြီ!'
        : 'Maung Pho Thar Won!';
    }
    if (!isMyTurn) {
      if (kidMood === 'dropping') {
        return lang === 'my'
          ? 'မောင်ဖိုးသား အကွက်ချနေသည်...'
          : 'Dropping disc...';
      }
      return lang === 'my' ? 'မောင်ဖိုးသား စဥ်းစားနေသည်...' : 'Thinking...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ပါ'
      : 'Your Turn — Tap a column';
  }, [
    isFinished,
    match?.isDraw,
    match?.winnerId,
    currentUserId,
    isMyTurn,
    kidMood,
    lang,
  ]);

  const handleColClick = (col: number) => {
    if (!isMyTurn || grid[0]?.[col] !== null) return;
    if (onDropColumn) onDropColumn(col);
    else if (onMove) onMove({ col });
  };

  const botTargetCol =
    typeof match?.botTargetCol === 'number' ? match.botTargetCol : null;
  const kidShiftX =
    kidMood === 'dropping' && botTargetCol !== null
      ? (botTargetCol - 3) * 18
      : 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none bg-[radial-gradient(ellipse_at_top,#1b2b52_0%,#0c1428_55%,#060a14_100%)]">
      {/* 1. 3D ROOM BACKGROUND */}
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/38 via-transparent to-[#060913]/48 pointer-events-none" />

      {/* 2. LOADING VIDEO OVERLAY */}
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

      {/* 3. RESPONSIVE PLAY STAGE */}
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

        {/* BOT KID LAYER (z-10): Full Pixar scale, head/shoulders naturally visible above board, torso hidden behind board */}
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
          className="relative z-10 w-[68%] sm:w-[65%] aspect-square -mb-[27%] sm:-mb-[26%] pointer-events-none flex items-end justify-center"
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
              className="w-full h-full object-contain object-bottom brightness-[0.96] contrast-[1.03] drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)]"
            />
          ) : null}
        </motion.div>

        {/* LUXURY 3D UPRIGHT CONNECT 4 BOARD (z-20, strictly in front of kid's torso) */}
        <div className="relative z-20 w-full flex items-end justify-center">
          {/* Floating Hover / Drop Preview Disc */}
          <div className="absolute -top-7 sm:-top-8 inset-x-0 z-30 flex justify-center pointer-events-none">
            <div className="w-[88%] h-6 sm:h-7 grid grid-cols-7 gap-1.5 px-3">
              {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                const showUserPreview =
                  isMyTurn && hoverCol === col && grid[0]?.[col] === null;
                const showBotPreview =
                  kidMood === 'dropping' && botTargetCol === col;
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
          <div className="relative z-10 flex-1 rounded-2xl p-[4px] sm:p-[5px] bg-gradient-to-b from-[#f3d48c] via-[#c79d4b] to-[#8c6827] shadow-[0_-10px_28px_rgba(0,0,0,0.65),0_18px_40px_rgba(0,0,0,0.75)]">
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
