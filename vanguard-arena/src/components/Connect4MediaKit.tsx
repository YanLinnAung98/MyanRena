import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import {
  CONNECT4_ASSET_CONFIG,
  type KidMood,
  type ResolvedMediaAsset,
} from '../config/connect4Assets.ts';
import type { Language } from '../types.ts';

/* ============================================================================
 * 1. SeamlessMediaBackdrop (Mix Transition Video Loop / Replaceable Image)
 * ============================================================================ */
interface SeamlessMediaBackdropProps {
  media: ResolvedMediaAsset;
  crossfadeSec?: number;
  onFallback?: () => void;
}

export const SeamlessMediaBackdrop: React.FC<SeamlessMediaBackdropProps> = ({
  media,
  crossfadeSec = CONNECT4_ASSET_CONFIG.background.crossfadeSec,
  onFallback,
}) => {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const activeSlotRef = useRef<0 | 1>(0);
  const isFadingRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeSlotRef.current = 0;
    setActiveSlot(0);
    isFadingRef.current = false;
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, [media.kind, media.url]);

  useEffect(() => {
    if (media.kind !== 'video' || !media.url) return;

    const vA = videoARef.current;
    const vB = videoBRef.current;
    if (!vA || !vB) return;

    vA.currentTime = 0;
    vB.currentTime = 0;
    vB.pause();
    vA.play().catch(() => {});

    const triggerCrossfade = () => {
      if (isFadingRef.current) return;
      isFadingRef.current = true;

      const currentSlot = activeSlotRef.current;
      const nextSlot: 0 | 1 = currentSlot === 0 ? 1 : 0;
      const outgoing = currentSlot === 0 ? vA : vB;
      const incoming = nextSlot === 0 ? vA : vB;

      incoming.currentTime = 0;
      incoming.play().catch(() => {});

      activeSlotRef.current = nextSlot;
      setActiveSlot(nextSlot);

      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
        isFadingRef.current = false;
      }, Math.round(crossfadeSec * 1000) + 120);
    };

    const intervalId = window.setInterval(() => {
      const activeVideo = activeSlotRef.current === 0 ? vA : vB;
      const dur = activeVideo.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;

      const effectiveFade = Math.min(crossfadeSec, Math.max(0.35, dur * 0.25));
      if (dur - activeVideo.currentTime <= effectiveFade && !isFadingRef.current) {
        triggerCrossfade();
      }
    }, 80);

    const handleEnded = () => triggerCrossfade();
    vA.addEventListener('ended', handleEnded);
    vB.addEventListener('ended', handleEnded);

    return () => {
      window.clearInterval(intervalId);
      vA.removeEventListener('ended', handleEnded);
      vB.removeEventListener('ended', handleEnded);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, [media.kind, media.url, crossfadeSec]);

  if (media.kind === 'video' && media.url) {
    const fadeStyle = { transition: `opacity ${crossfadeSec}s ease-in-out` };
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a1022]">
        <video
          ref={videoARef}
          src={media.url}
          muted
          playsInline
          preload="auto"
          onError={() => onFallback?.()}
          style={{
            ...fadeStyle,
            opacity: activeSlot === 0 ? 1 : 0,
            zIndex: activeSlot === 0 ? 2 : 1,
          }}
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />
        <video
          ref={videoBRef}
          src={media.url}
          muted
          playsInline
          preload="auto"
          style={{
            ...fadeStyle,
            opacity: activeSlot === 1 ? 1 : 0,
            zIndex: activeSlot === 1 ? 2 : 1,
          }}
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-[#070b18]/45 via-transparent to-[#070b18]/30" />
      </div>
    );
  }

  if (media.kind === 'image' && media.url) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a1022]">
        <motion.img
          src={media.url}
          alt="4-Row Room Backdrop"
          onError={() => onFallback?.()}
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b18]/45 via-transparent to-[#070b18]/30" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a1022]">
      <div
        className="absolute -left-16 top-0 w-80 h-80 rounded-full opacity-55 blur-[55px]"
        style={{
          background:
            'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(56,189,248,0.28) 45%, transparent 72%)',
        }}
      />
      <div
        className="absolute -right-12 -top-8 w-80 h-96 rounded-full opacity-50 blur-[65px]"
        style={{
          background:
            'radial-gradient(circle, rgba(254,240,138,0.5) 0%, rgba(251,191,36,0.2) 50%, transparent 75%)',
        }}
      />
    </div>
  );
};

/* ============================================================================
 * 2. Connect4LoadingScreen (အနည်းဆုံး ၂ စက္ကန့်ပြမည့် ဂိမ်းအဝင် Loading စာမျက်နှာ)
 * ============================================================================ */
interface Connect4LoadingScreenProps {
  lang: Language;
  progress: number;
  media: ResolvedMediaAsset;
}

export const Connect4LoadingScreen: React.FC<Connect4LoadingScreenProps> = ({
  lang,
  progress,
  media,
}) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070b18] px-5"
    >
      {media.kind === 'video' && media.url && (
        <video
          src={media.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-65"
        />
      )}
      {media.kind === 'image' && media.url && (
        <motion.img
          src={media.url}
          alt="Loading 4-Row Arena"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full object-cover opacity-65"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-[#070b18]/70 via-[#0b132b]/65 to-[#070b18]/90 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center space-y-4">
        <div className="relative w-28 h-24 rounded-2xl bg-gradient-to-b from-[#1e2946] to-[#0f172a] border-2 border-amber-300/75 shadow-[0_12px_32px_rgba(251,191,36,0.28)] p-2.5 flex flex-col justify-between">
          <div className="grid grid-cols-4 gap-1.5 h-full">
            {[
              null, 'P1', null, 'P2',
              'P2', 'P1', 'P2', 'P1',
              'P1', 'P2', 'P1', 'P2',
            ].map((cell, i) => (
              <div
                key={i}
                className="rounded-full bg-[#070c18] border border-amber-300/35 flex items-center justify-center overflow-hidden"
              >
                {cell && (
                  <motion.span
                    animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.75, 1, 0.75] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.4,
                      delay: (i % 4) * 0.16,
                    }}
                    className={`w-[82%] h-[82%] rounded-full ${
                      cell === 'P1'
                        ? 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-gradient-to-br from-rose-300 via-red-500 to-rose-700 shadow-[0_0_8px_#f43f5e]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Sparkles className="w-4 h-4 text-amber-300 absolute -top-2 -right-2 animate-pulse" />
        </div>

        <div className="space-y-1">
          <div className="text-sm sm:text-base font-display font-extrabold tracking-wide text-white">
            {lang === 'my'
              ? '၄ လုံးတန်း 3D အခန်း ပြင်ဆင်နေပါသည်...'
              : 'Preparing 4-in-a-Row 3D Room...'}
          </div>
          <div className="text-[11px] text-amber-200/90">
            {lang === 'my'
              ? 'မောင်ဖိုးသားနှင့် ကစားရန် ခေတ္တစောင့်ဆိုင်းပါ'
              : 'Loading assets & Mg Pho Thar...'}
          </div>
        </div>

        <div className="w-full space-y-1.5">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-amber-300/25">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              initial={{ width: '8%' }}
              animate={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
              transition={{ ease: 'easeOut', duration: 0.25 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
            <span>{progress >= 100 ? (lang === 'my' ? 'အဆင်သင့်ဖြစ်ပါပြီ!' : 'Ready!') : 'Loading Assets'}</span>
            <span className="text-amber-300 font-bold">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ============================================================================
 * 3. White-Background Remover for Kid Video / Image (Canvas Chroma-Key)
 * - အဖြူရောင်နောက်ခံပါလာသည့် Video / Image များကို အလိုအလျောက် ဖျောက်ပေးမည်
 * ============================================================================ */
function stripWhiteFromImageData(imgData: ImageData, w: number, h: number) {
  const data = imgData.data;
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
    return r > 224 && g > 224 && b > 224 && maxC - minC < 30;
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

  // Soft 1px edge feathering
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const idx4 = p * 4;
      if (data[idx4 + 3] === 0) continue;
      if (
        data[(p - 1) * 4 + 3] === 0 ||
        data[(p + 1) * 4 + 3] === 0 ||
        data[(p - w) * 4 + 3] === 0 ||
        data[(p + w) * 4 + 3] === 0
      ) {
        const avg = (data[idx4] + data[idx4 + 1] + data[idx4 + 2]) / 3;
        if (avg > 200) {
          data[idx4 + 3] = Math.round(data[idx4 + 3] * 0.35);
        }
      }
    }
  }
}

const WhiteKeyedVideoLayer: React.FC<{
  url: string;
  isActive: boolean;
  loop: boolean;
}> = ({ url, isActive, loop }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      if (!loop) video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      // Crossfade ပြီးမှ pause လုပ်မည်
      const t = window.setTimeout(() => {
        video.pause();
      }, 340);
      return () => window.clearTimeout(t);
    }
  }, [isActive, loop]);

  useEffect(() => {
    if (canvasFailed) return;
    let rafId = 0;
    let lastDraw = 0;

    const renderFrame = (ts: number) => {
      rafId = window.requestAnimationFrame(renderFrame);
      if (!isActive || ts - lastDraw < 32) return; // ~30fps smooth & battery friendly
      lastDraw = ts;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 240;
      const maxW = 360;
      const scale = Math.min(1, maxW / vw);
      const cw = Math.max(1, Math.round(vw * scale));
      const ch = Math.max(1, Math.round(vh * scale));

      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      try {
        ctx.drawImage(video, 0, 0, cw, ch);
        const imgData = ctx.getImageData(0, 0, cw, ch);
        stripWhiteFromImageData(imgData, cw, ch);
        ctx.putImageData(imgData, 0, 0);
      } catch {
        setCanvasFailed(true);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [isActive, canvasFailed]);

  return (
    <div
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 320ms ease-in-out',
        zIndex: isActive ? 2 : 1,
      }}
      className="pointer-events-none absolute inset-0 flex items-end justify-center"
    >
      <video
        ref={videoRef}
        src={url}
        crossOrigin="anonymous"
        loop={loop}
        muted
        playsInline
        preload="auto"
        className={
          canvasFailed
            ? 'w-full h-full object-contain object-bottom drop-shadow-[0_14px_24px_rgba(0,0,0,0.65)]'
            : 'hidden'
        }
      />
      {!canvasFailed && (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain object-bottom drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)]"
        />
      )}
    </div>
  );
};

const WhiteKeyedImageLayer: React.FC<{
  url: string;
  isActive: boolean;
}> = ({ url, isActive }) => {
  const [processedSrc, setProcessedSrc] = useState<string>(url);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        stripWhiteFromImageData(imgData, w, h);
        ctx.putImageData(imgData, 0, 0);
        setProcessedSrc(canvas.toDataURL('image/png'));
      } catch {
        setProcessedSrc(url);
      }
    };
    img.src = url;
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 320ms ease-in-out',
        zIndex: isActive ? 2 : 1,
      }}
      className="pointer-events-none absolute inset-0 flex items-end justify-center"
    >
      <img
        src={processedSrc}
        alt="Mg Pho Thar"
        className="w-full h-full object-contain object-bottom drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)]"
      />
    </div>
  );
};

/* ============================================================================
 * 4. PhoTharMediaCharacter (Pre-mounted Smooth Crossfade Stack + Large Scale)
 * ============================================================================ */
interface PhoTharMediaCharacterProps {
  mood: KidMood;
  targetCol: number | null;
  kidMedia: Record<KidMood, ResolvedMediaAsset>;
}

const ALL_MOODS: KidMood[] = ['idle', 'thinking', 'dropping', 'happy', 'crying'];

export const PhoTharMediaCharacter: React.FC<PhoTharMediaCharacterProps> = ({
  mood,
  targetCol,
  kidMedia,
}) => {
  const hasAnyCustomKid = ALL_MOODS.some((m) => kidMedia[m]?.kind !== 'none');

  // လက်ရှိ mood အတွက် custom ဖိုင်မရှိသေးလျှင် idle ကို active ထားမည်
  const resolvedActiveMood: KidMood =
    kidMedia[mood]?.kind !== 'none' ? mood : 'idle';

  const shiftX =
    mood === 'dropping' && targetCol !== null ? (targetCol - 3) * 26 : 0;

  return (
    <div className="relative w-full h-full flex items-end justify-center">
      {/* Thinking Bubble */}
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute top-1 right-4 z-30 px-3 py-1 rounded-2xl bg-slate-900/95 border border-amber-300/55 text-amber-200 text-xs font-bold shadow-lg flex items-center gap-1"
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

      {/* Happy Celebration Sparkles */}
      <AnimatePresence>
        {mood === 'happy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 pointer-events-none"
          >
            {[
              { x: '12%', y: '10%', color: '#fbbf24' },
              { x: '84%', y: '12%', color: '#f43f5e' },
              { x: '20%', y: '45%', color: '#38bdf8' },
              { x: '78%', y: '48%', color: '#34d399' },
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

      {hasAnyCustomKid ? (
        <motion.div
          animate={{
            x: shiftX,
            y: mood === 'happy' ? [0, -10, 0] : [0, -2.5, 0],
          }}
          transition={{
            x: { type: 'spring', stiffness: 190, damping: 20 },
            y: {
              repeat: Infinity,
              duration: mood === 'happy' ? 0.6 : 2.6,
              ease: 'easeInOut',
            },
          }}
          className="relative w-full h-full"
        >
          {ALL_MOODS.map((m) => {
            const media = kidMedia[m];
            if (!media || media.kind === 'none' || !media.url) return null;
            const isActive = m === resolvedActiveMood;

            if (media.kind === 'video') {
              return (
                <WhiteKeyedVideoLayer
                  key={`${m}-${media.url}`}
                  url={media.url}
                  isActive={isActive}
                  loop={m !== 'dropping'}
                />
              );
            }
            return (
              <WhiteKeyedImageLayer
                key={`${m}-${media.url}`}
                url={media.url}
                isActive={isActive}
              />
            );
          })}
        </motion.div>
      ) : (
        <PhoTharSvgFallback mood={mood} targetCol={targetCol} />
      )}
    </div>
  );
};

const PhoTharSvgFallback: React.FC<{ mood: KidMood; targetCol: number | null }> = ({
  mood,
  targetCol,
}) => {
  const handOffsetX = targetCol !== null ? (targetCol - 3) * 42 : 0;

  return (
    <motion.svg
      viewBox="0 0 220 175"
      className="w-full h-full drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]"
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
  );
};
