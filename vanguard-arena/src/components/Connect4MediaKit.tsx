import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import {
  CONNECT4_ASSET_CONFIG,
  resolveMediaSlot,
  type ResolvedMediaAsset,
} from '../config/connect4Assets.ts';
import type { Language } from '../types.ts';

/* ============================================================================
 * 1. SeamlessMediaBackdrop
 * - Video ဖြစ်လျှင် <video> ၂ ထပ် (Slot A / Slot B) ဖြင့် ဆုံးခါနီးတွင်
 *   Opacity Mix Transition (Crossfade) လုပ်၍ Smooth Loop ပြန်စပေးမည်
 * - Image ဖြစ်လျှင် Ken-Burns Subtle Breathing Animation ဖြင့် ပြသမည်
 * ============================================================================ */
interface SeamlessMediaBackdropProps {
  media: ResolvedMediaAsset;
  crossfadeSec?: number;
  onReady?: () => void;
  onFallback?: () => void;
}

export const SeamlessMediaBackdrop: React.FC<SeamlessMediaBackdropProps> = ({
  media,
  crossfadeSec = CONNECT4_ASSET_CONFIG.background.crossfadeSec,
  onReady,
  onFallback,
}) => {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const activeSlotRef = useRef<0 | 1>(0);
  const isFadingRef = useRef(false);
  const readyFiredRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  const notifyReady = () => {
    if (!readyFiredRef.current) {
      readyFiredRef.current = true;
      onReady?.();
    }
  };

  useEffect(() => {
    readyFiredRef.current = false;
    activeSlotRef.current = 0;
    setActiveSlot(0);
    isFadingRef.current = false;
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);

    if (media.kind === 'none') {
      notifyReady();
    }
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, [media.kind, media.url]);

  // Dual-Video Mix Transition Loop Controller
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
      const remaining = dur - activeVideo.currentTime;

      if (remaining <= effectiveFade && !isFadingRef.current) {
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
        {/* Video Layer A */}
        <video
          ref={videoARef}
          src={media.url}
          muted
          playsInline
          preload="auto"
          onLoadedData={notifyReady}
          onCanPlay={notifyReady}
          onError={() => {
            notifyReady();
            onFallback?.();
          }}
          style={{
            ...fadeStyle,
            opacity: activeSlot === 0 ? 1 : 0,
            zIndex: activeSlot === 0 ? 2 : 1,
          }}
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />

        {/* Video Layer B (Mix Transition Clone) */}
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

        {/* Subtle Vignette for UI Contrast */}
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
          onLoad={notifyReady}
          onError={() => {
            notifyReady();
            onFallback?.();
          }}
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b18]/45 via-transparent to-[#070b18]/30" />
      </div>
    );
  }

  // Fallback CSS Galaxy Backdrop (ဖိုင်မတင်ရသေးလျှင်)
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
 * 2. Connect4LoadingScreen
 * - ဂိမ်းအဝင်တွင် နောက်ခံ Video / Image များ Load နေချိန် ပြသမည့် Loading စာမျက်နှာ
 * - public/assets/c4-loading.(mp4|webm|webp|jpg|png) ထည့်ထားလျှင် အလိုအလျောက် ပြမည်
 * - မထည့်ထားလျှင် 4-Row 3D Animated Graphic ကို ပြသပေးမည်
 * ============================================================================ */
interface Connect4LoadingScreenProps {
  lang: Language;
  progress: number;
}

export const Connect4LoadingScreen: React.FC<Connect4LoadingScreenProps> = ({
  lang,
  progress,
}) => {
  const [loadingMedia, setLoadingMedia] = useState<ResolvedMediaAsset>({
    kind: 'none',
    url: null,
  });

  useEffect(() => {
    let active = true;
    resolveMediaSlot('loadingScreen').then((res) => {
      if (active) setLoadingMedia(res);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070b18] px-5"
    >
      {/* Custom Loading Media (Replaceable Video or Graphic Image) */}
      {loadingMedia.kind === 'video' && loadingMedia.url && (
        <video
          src={loadingMedia.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
      )}
      {loadingMedia.kind === 'image' && loadingMedia.url && (
        <img
          src={loadingMedia.url}
          alt="Loading 4-Row Arena"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
      )}

      {/* Dark Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b18]/75 via-[#0b132b]/70 to-[#070b18]/92 backdrop-blur-[2px]" />

      {/* Center Content */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center space-y-4">
        {/* Built-in 4-Row Animated Graphic (Custom Media မရှိလျှင် ပိုထင်ရှားစွာ ပြမည်) */}
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
            {lang === 'my' ? '၄ လုံးတန်း 3D အခန်း ပြင်ဆင်နေပါသည်...' : 'Preparing 4-in-a-Row 3D Room...'}
          </div>
          <div className="text-[11px] text-amber-200/85">
            {lang === 'my'
              ? 'မောင်ဖိုးသားနှင့် ကစားရန် ခေတ္တစောင့်ဆိုင်းပါ'
              : 'Setting up the board with Mg Pho Thar'}
          </div>
        </div>

        {/* Smooth Progress Bar */}
        <div className="w-full space-y-1.5">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-amber-300/25">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              initial={{ width: '8%' }}
              animate={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
              transition={{ ease: 'easeOut', duration: 0.25 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{lang === 'my' ? 'Loading Assets' : 'Loading Assets'}</span>
            <span className="text-amber-300 font-bold">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
