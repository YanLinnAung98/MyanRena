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
      {/* Replaceable Loading Video or Image Backdrop */}
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

      {/* Dark Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b18]/70 via-[#0b132b]/65 to-[#070b18]/90 backdrop-blur-[2px]" />

      {/* Center Content */}
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
 * 3. PhoTharMediaCharacter
 * - public/assets/c4-kid-(idle|thinking|dropping|happy|crying).(mp4|webm|webp|png|jpg)
 *   ထည့်ထားလျှင် ထို Video/ပုံကို အလိုအလျောက် ပြသပေးမည်
 * - မထည့်ရသေးလျှင် Built-in SVG မောင်ဖိုးသားကို ပြသမည်
 * ============================================================================ */
interface PhoTharMediaCharacterProps {
  mood: KidMood;
  targetCol: number | null;
  kidMedia: Record<KidMood, ResolvedMediaAsset>;
}

export const PhoTharMediaCharacter: React.FC<PhoTharMediaCharacterProps> = ({
  mood,
  targetCol,
  kidMedia,
}) => {
  // လက်ရှိ mood ဖိုင်မရှိသေးလျှင် idle ဖိုင်ကို fallback သုံးမည်
  const activeMedia =
    kidMedia[mood]?.kind !== 'none' ? kidMedia[mood] : kidMedia.idle;

  const shiftX =
    mood === 'dropping' && targetCol !== null ? (targetCol - 3) * 28 : 0;

  return (
    <div className="relative w-60 h-36 sm:h-40 flex items-end justify-center">
      {/* Thinking Bubble */}
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute top-0 right-2 z-20 px-3 py-1 rounded-2xl bg-slate-900/95 border border-amber-300/50 text-amber-200 text-xs font-bold shadow-lg flex items-center gap-1"
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
            className="absolute inset-0 z-20 pointer-events-none"
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

      {/* Custom MP4/WebM Video Character */}
      {activeMedia.kind === 'video' && activeMedia.url ? (
        <motion.div
          animate={{
            x: shiftX,
            y: mood === 'happy' ? [0, -10, 0] : 0,
          }}
          transition={{
            x: { type: 'spring', stiffness: 210, damping: 20 },
            y: { repeat: mood === 'happy' ? Infinity : 0, duration: 0.6 },
          }}
          className="relative w-56 h-40 flex items-end justify-center"
        >
          <video
            key={activeMedia.url}
            src={activeMedia.url}
            autoPlay
            loop={mood !== 'dropping'}
            muted
            playsInline
            className="w-full h-full object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]"
          />
        </motion.div>
      ) : activeMedia.kind === 'image' && activeMedia.url ? (
        /* Custom Image Character (PNG/WebP/JPG) */
        <motion.img
          key={activeMedia.url}
          src={activeMedia.url}
          alt="Mg Pho Thar"
          animate={
            mood === 'happy'
              ? { y: [0, -12, 0], rotate: [-3, 3, -3], x: 0 }
              : mood === 'crying'
              ? { y: [0, 2, 0], x: [-2, 2, -2] }
              : mood === 'thinking'
              ? { rotate: [-3, 3, -3], x: 0 }
              : mood === 'dropping'
              ? { x: shiftX, y: 4 }
              : { y: [0, -3, 0], x: 0 }
          }
          transition={{
            repeat: mood === 'dropping' ? 0 : Infinity,
            duration: mood === 'happy' ? 0.55 : mood === 'crying' ? 0.35 : 2.3,
            ease: 'easeInOut',
          }}
          className="w-56 h-40 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]"
        />
      ) : (
        /* Built-in SVG Fallback Character */
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
