import React from 'react';
import { motion } from 'motion/react';

interface WiseOwl3DProps {
  mood: 'asking' | 'happy' | 'thinking';
  questionNumber?: number;
}

export const WiseOwl3D: React.FC<WiseOwl3DProps> = ({ mood, questionNumber = 1 }) => {
  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto select-none shrink-0 flex items-center justify-center">
      {/* Rotating Arcane Magic Ring Behind Owl */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-dashed border-amber-400/35 pointer-events-none"
      />
      <div className="absolute inset-2 rounded-full bg-amber-500/20 blur-xl animate-pulse pointer-events-none" />

      {/* Floating Sparkle Runes */}
      <motion.span
        animate={{ y: [-4, -14, -4], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="absolute -top-1 left-2 text-xs text-amber-300 font-bold pointer-events-none"
      >
        ✦
      </motion.span>
      <motion.span
        animate={{ y: [-2, -12, -2], opacity: [0.3, 0.95, 0.3] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 0.7 }}
        className="absolute top-2 right-1 text-sm text-sky-300 font-bold pointer-events-none"
      >
        ?
      </motion.span>

      {/* Main 3D Perspective Wise Owl */}
      <motion.div
        key={questionNumber}
        initial={{ scale: 0.88, rotateY: -18 }}
        animate={{
          scale: 1,
          y: [0, -5, 0],
          rotateZ: mood === 'asking' ? [0, -3, 2, 0] : mood === 'happy' ? [0, 6, -6, 0] : [0, -5, 0],
          rotateY: mood === 'happy' ? [0, 14, -14, 0] : [0, 5, -5, 0],
        }}
        transition={{
          scale: { type: 'spring', stiffness: 320, damping: 18 },
          y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
          rotateZ: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          rotateY: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ perspective: 950 }}
        className="w-full h-full relative z-10"
      >
        <svg viewBox="0 0 220 210" className="w-full h-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]">
          <defs>
            <radialGradient id="owlPlumage3d" cx="38%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="48%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#291003" />
            </radialGradient>
            <radialGradient id="owlChest3d" cx="50%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>
            <linearGradient id="owlGoldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="scrollParchment" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
          </defs>

          {/* Left Wing (Gesturing / Raising When Asking Question) */}
          <motion.path
            d="M52 102 C16 92, 12 145, 54 166 C60 142, 58 118, 52 102 Z"
            fill="url(#owlPlumage3d)"
            stroke="#fbbf24"
            strokeWidth="2.2"
            animate={{
              rotate: mood === 'asking' ? [-14, 16, -14] : mood === 'happy' ? [-26, 18, -26] : [-4, 4, -4],
            }}
            transition={{ duration: mood === 'asking' ? 1.4 : 0.7, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '54px 108px' }}
          />

          {/* Right Wing Holding Golden Riddle Scroll */}
          <motion.g
            animate={{
              rotate: mood === 'asking' ? [6, -10, 6] : [0, -4, 0],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '164px 112px' }}
          >
            <path
              d="M168 102 C202 108, 198 158, 162 168 C156 144, 160 118, 168 102 Z"
              fill="url(#owlPlumage3d)"
              stroke="#fbbf24"
              strokeWidth="2.2"
            />
            {/* Enchanted Golden Scroll Held by Owl */}
            <rect
              x="166"
              y="112"
              width="34"
              height="44"
              rx="6"
              fill="url(#scrollParchment)"
              stroke="#b45309"
              strokeWidth="2"
            />
            <line x1="173" y1="124" x2="193" y2="124" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="173" y1="133" x2="190" y2="133" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
            <text x="183" y="149" fontSize="13" fontWeight="bold" fill="#b45309" textAnchor="middle">
              ?
            </text>
          </motion.g>

          {/* 3D Layered Body */}
          <ellipse cx="110" cy="128" rx="56" ry="62" fill="url(#owlPlumage3d)" stroke="#d97706" strokeWidth="2.5" />
          <ellipse cx="110" cy="138" rx="38" ry="44" fill="url(#owlChest3d)" />
          {/* Chest Feather Chevrons */}
          <path d="M94 124 Q102 131 110 124 Q118 131 126 124" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M90 138 Q100 146 110 138 Q120 146 130 138" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M95 152 Q102 159 110 152 Q118 159 125 152" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />

          {/* Ear Tufts & 3D Head */}
          <polygon points="62,44 84,58 70,78" fill="url(#owlPlumage3d)" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="158,44 136,58 150,78" fill="url(#owlPlumage3d)" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="110" cy="78" r="46" fill="url(#owlPlumage3d)" stroke="#fbbf24" strokeWidth="2.5" />

          {/* Golden Scholar Mortarboard Hat */}
          <polygon points="110,12 162,29 110,45 58,29" fill="url(#owlGoldMetal)" stroke="#fef08a" strokeWidth="1.5" />
          <rect x="86" y="34" width="48" height="11" rx="4" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
          <motion.line
            x1="156"
            y1="30"
            x2="167"
            y2="56"
            stroke="#fde047"
            strokeWidth="2.5"
            animate={{ rotate: [-6, 8, -6] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ transformOrigin: '156px 30px' }}
          />
          <circle cx="167" cy="58" r="4" fill="#fde047" />

          {/* Golden Spectacles & Expressive Blinking Eyes */}
          <circle cx="89" cy="78" r="20" fill="#070b14" stroke="url(#owlGoldMetal)" strokeWidth="4" />
          <circle cx="131" cy="78" r="20" fill="#070b14" stroke="url(#owlGoldMetal)" strokeWidth="4" />
          <line x1="109" y1="78" x2="111" y2="78" stroke="url(#owlGoldMetal)" strokeWidth="4" />

          <motion.g
            animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
            transition={{ duration: 3.8, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
            style={{ transformOrigin: '110px 78px' }}
          >
            <circle cx="89" cy="78" r="11" fill="#fbbf24" />
            <circle cx="131" cy="78" r="11" fill="#fbbf24" />
            <circle cx="89" cy="78" r="5.5" fill="#070b14" />
            <circle cx="131" cy="78" r="5.5" fill="#070b14" />
            <circle cx="86" cy="74" r="2.8" fill="#ffffff" />
            <circle cx="128" cy="74" r="2.8" fill="#ffffff" />
          </motion.g>

          {/* Animated Speaking Beak (Opens & Closes When Asking Question) */}
          <polygon points="102,91 118,91 110,104" fill="url(#owlGoldMetal)" stroke="#fef08a" strokeWidth="1" />
          <motion.polygon
            points="104,102 116,102 110,111"
            fill="#d97706"
            animate={{
              y: mood === 'asking' ? [0, 3.5, 0, 2.5, 0] : [0, 1, 0],
            }}
            transition={{ duration: mood === 'asking' ? 0.65 : 2, repeat: Infinity }}
          />

          {/* Golden Talons */}
          <ellipse cx="90" cy="190" rx="14" ry="5.5" fill="url(#owlGoldMetal)" />
          <ellipse cx="130" cy="190" rx="14" ry="5.5" fill="url(#owlGoldMetal)" />
        </svg>
      </motion.div>
    </div>
  );
};
