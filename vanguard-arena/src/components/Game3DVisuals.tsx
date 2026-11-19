import React from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { GameType } from '../types.ts';

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  glowColor?: string;
}

/**
 * Interactive 3D perspective tilt card with live holographic light sheen
 */
export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  className = '',
  onClick,
  disabled = false,
  glowColor = 'rgba(251, 191, 36, 0.28)',
}) => {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 260, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 260, damping: 24 });

  const rotateX = useTransform(smoothY, [0, 1], [10, -10]);
  const rotateY = useTransform(smoothX, [0, 1], [-10, 10]);
  const sheenX = useTransform(smoothX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(smoothY, [0, 1], ['0%', '100%']);

  const sheenBackground = useMotionTemplate`radial-gradient(280px circle at ${sheenX} ${sheenY}, ${glowColor}, transparent 70%)`;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div style={{ perspective: 1100 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={disabled ? undefined : onClick}
        whileHover={disabled ? undefined : { scale: 1.025 }}
        whileTap={disabled ? undefined : { scale: 0.985 }}
        style={{
          rotateX: disabled ? 0 : rotateX,
          rotateY: disabled ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative w-full h-full rounded-2xl transition-shadow duration-300 ${
          disabled ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        {/* Dynamic 3D Specular Sheen Layer */}
        <motion.div
          style={{ background: sheenBackground }}
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        />
        {children}
      </motion.div>
    </div>
  );
};

/**
 * Custom 3D Animated Showcase Stage for each of the 4 Games
 */
export const GameStage3D: React.FC<{ gameType: GameType; compact?: boolean }> = ({
  gameType,
  compact = false,
}) => {
  const heightCls = compact ? 'h-44' : 'h-56 sm:h-64';

  // 1. CONNECT 4 — 3D Floating Acrylic Rack with Dropping Metallic Discs
  if (gameType === 'connect4') {
    const discs = [
      { col: 0, row: 3, color: 'from-rose-400 to-rose-600', delay: 0.1 },
      { col: 1, row: 3, color: 'from-amber-300 to-amber-500', delay: 0.25 },
      { col: 1, row: 2, color: 'from-amber-300 to-amber-500', delay: 0.4 },
      { col: 2, row: 3, color: 'from-rose-400 to-rose-600', delay: 0.2 },
      { col: 2, row: 2, color: 'from-amber-300 to-amber-500', delay: 0.55 },
      { col: 2, row: 1, color: 'from-amber-300 to-amber-500', delay: 0.7 },
      { col: 3, row: 3, color: 'from-amber-300 to-amber-500', delay: 0.3 },
      { col: 3, row: 2, color: 'from-rose-400 to-rose-600', delay: 0.45 },
      { col: 3, row: 1, color: 'from-rose-400 to-rose-600', delay: 0.6 },
      { col: 3, row: 0, color: 'from-amber-300 to-amber-500', delay: 0.85 },
      { col: 4, row: 3, color: 'from-rose-400 to-rose-600', delay: 0.35 },
    ];

    return (
      <div
        style={{ perspective: 950 }}
        className={`relative ${heightCls} w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#081226] via-[#0c1d3d] to-[#070b14]`}
      >
        <div className="absolute w-64 h-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <motion.div
          animate={{ rotateY: [-14, 14, -14], rotateX: [10, 4, 10], y: [-4, 4, -4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-900/95 border-2 border-blue-300/50 shadow-[0_24px_45px_rgba(0,0,0,0.65),0_0_30px_rgba(59,130,246,0.4)]"
        >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }).map((_, idx) => {
              const r = Math.floor(idx / 5);
              const c = idx % 5;
              const disc = discs.find((d) => d.row === r && d.col === c);
              return (
                <div
                  key={idx}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#060b16] shadow-inner border border-blue-300/20 flex items-center justify-center overflow-hidden"
                >
                  {disc && (
                    <motion.div
                      initial={{ y: -110, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: disc.delay,
                        type: 'spring',
                        stiffness: 220,
                        damping: 14,
                        repeat: Infinity,
                        repeatDelay: 4.5,
                      }}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br ${disc.color} shadow-[inset_0_2px_4px_rgba(255,255,255,0.65),0_0_12px_rgba(251,191,36,0.5)]`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* 3D Base Stand */}
          <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-blue-400 via-sky-200 to-blue-400 opacity-75" />
        </motion.div>
      </div>
    );
  }

  // 2. TIC-TAC-TOE — 3D Tilted Cyber Neon Hologram Grid
  if (gameType === 'tictactoe') {
    const cells = ['X', 'O', null, null, 'X', 'O', null, null, 'X'];
    return (
      <div
        style={{ perspective: 950 }}
        className={`relative ${heightCls} w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#05162b] via-[#0a2342] to-[#070b14]`}
      >
        <div className="absolute w-64 h-64 rounded-full bg-sky-500/20 blur-3xl animate-pulse" />
        <motion.div
          animate={{ rotateX: [26, 18, 26], rotateZ: [-10, 10, -10], y: [-5, 5, -5] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#091224]/90 border-2 border-sky-400/50 shadow-[0_25px_45px_rgba(0,0,0,0.7),0_0_32px_rgba(56,189,248,0.35)]"
        >
          {cells.map((v, i) => (
            <motion.div
              key={i}
              animate={v === 'X' ? { scale: [1, 1.08, 1] } : undefined}
              transition={{ duration: 2.2, delay: i * 0.12, repeat: Infinity }}
              style={{ transform: v ? 'translateZ(18px)' : 'translateZ(2px)' }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center font-display font-black text-xl sm:text-2xl ${
                v === 'X'
                  ? 'bg-sky-500/20 border-sky-300/70 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.6)]'
                  : v === 'O'
                  ? 'bg-amber-500/20 border-amber-300/70 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                  : 'bg-[#070b14]/80 border-white/10'
              }`}
            >
              {v || ''}
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  // 3. ROCK PAPER SCISSORS — 3D Orbiting Prism Triad
  if (gameType === 'rps') {
    const orbs = [
      { label: 'ROCK', color: 'from-orange-400 to-rose-600', border: 'border-orange-300', x: -64, y: 26 },
      { label: 'PAPER', color: 'from-sky-400 to-blue-600', border: 'border-sky-300', x: 0, y: -42 },
      { label: 'SCISSORS', color: 'from-fuchsia-400 to-pink-600', border: 'border-pink-300', x: 64, y: 26 },
    ];
    return (
      <div
        style={{ perspective: 950 }}
        className={`relative ${heightCls} w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1f0a28] via-[#2b1037] to-[#070b14]`}
      >
        <div className="absolute w-64 h-64 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" />
        {/* Rotating 3D Energy Ring */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ transform: 'rotateX(62deg)' }}
          className="absolute w-44 h-44 rounded-full border-2 border-dashed border-amber-400/50 shadow-[0_0_24px_rgba(244,114,182,0.35)]"
        />
        <div className="relative flex items-center justify-center">
          {orbs.map((o, idx) => (
            <motion.div
              key={o.label}
              animate={{
                y: [o.y - 7, o.y + 7, o.y - 7],
                rotateY: [-18, 18, -18],
              }}
              transition={{ duration: 3.4, delay: idx * 0.45, repeat: Infinity, ease: 'easeInOut' }}
              style={{ x: o.x }}
              className={`absolute w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl bg-gradient-to-br ${o.color} border-2 ${o.border} shadow-[0_14px_28px_rgba(0,0,0,0.55)] flex flex-col items-center justify-center`}
            >
              <span className="text-[10px] font-display font-black tracking-wider text-white drop-shadow">
                {o.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // 4. SAKAR-HTAR (WISE OWL QUIZ) — 3D Floating Holographic Wise Owl + Celestial Halo
  return (
    <div
      style={{ perspective: 950 }}
      className={`relative ${heightCls} w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2b1304] via-[#1c0f08] to-[#070b14]`}
    >
      <div className="absolute w-64 h-64 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />

      {/* Rotating Golden Halo Ring */}
      <motion.div
        animate={{ rotateZ: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute w-40 h-40 sm:w-44 sm:h-44 rounded-full border border-dashed border-amber-300/45"
      />
      <motion.div
        animate={{ rotateZ: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        className="absolute w-48 h-48 sm:w-52 sm:h-52 rounded-full border border-amber-500/25"
      />

      {/* Floating 3D Wise Owl Crest */}
      <motion.div
        animate={{ y: [-7, 7, -7], rotateY: [-14, 14, -14] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative z-10 flex flex-col items-center"
      >
        <svg viewBox="0 0 180 180" className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-[0_18px_28px_rgba(245,158,11,0.45)]">
          <defs>
            <linearGradient id="owl3dGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="owlBody3d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
          </defs>
          {/* Outer Medallion */}
          <circle cx="90" cy="90" r="74" fill="url(#owlBody3d)" stroke="url(#owl3dGold)" strokeWidth="4.5" />
          {/* Owl Silhouette */}
          <path
            d="M46 58 L64 73 L116 73 L134 58 L130 112 C128 138 111 152 90 152 C69 152 52 138 50 112 Z"
            fill="#111827"
            stroke="#fbbf24"
            strokeWidth="3"
          />
          {/* Eyes */}
          <circle cx="70" cy="96" r="16" fill="#070b14" stroke="#fde047" strokeWidth="3" />
          <circle cx="110" cy="96" r="16" fill="#070b14" stroke="#fde047" strokeWidth="3" />
          <motion.circle
            cx="70"
            cy="96"
            r="6.5"
            fill="#fbbf24"
            animate={{ scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
          />
          <motion.circle
            cx="110"
            cy="96"
            r="6.5"
            fill="#fbbf24"
            animate={{ scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
          />
          {/* Beak */}
          <polygon points="90,106 82,122 98,122" fill="url(#owl3dGold)" />
          {/* Crown Jewel */}
          <polygon points="90,46 96,58 90,66 84,58" fill="#fef08a" />
        </svg>
        {/* Soft 3D Ground Shadow */}
        <motion.div
          animate={{ scaleX: [0.85, 1.05, 0.85], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-3 rounded-full bg-amber-500/35 blur-md -mt-2"
        />
      </motion.div>
    </div>
  );
};
