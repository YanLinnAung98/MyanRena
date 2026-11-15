import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TRANSLATIONS } from '../../i18n/translations.ts';
import type { Language, RPSChoice, RPSState } from '../../types.ts';
import { soundEngine } from '../../utils/sound.ts';

interface RPSBoardProps {
  state: RPSState;
  myPlayerNum: 1 | 2 | 0;
  lang?: Language;
  disabled?: boolean;
  onMove: (payload: { choice: RPSChoice }) => void;
}

const Rock3DSvg: React.FC<{ className?: string; uid: string }> = ({ className = 'w-14 h-14', uid }) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <defs>
      <radialGradient id={`rock-aura-${uid}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`rock-top-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#64748B" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
      <linearGradient id={`rock-left-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#090D16" />
      </linearGradient>
      <linearGradient id={`rock-right-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#05070C" />
      </linearGradient>
      <linearGradient id={`magma-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
    {/* Seismic Shadow & Glow */}
    <ellipse cx="48" cy="79" rx="34" ry="8" fill={`url(#rock-aura-${uid})`} />
    <ellipse cx="48" cy="79" rx="28" ry="5" fill="none" stroke="#F59E0B" strokeOpacity="0.35" strokeWidth="1.2" />
    {/* Faceted 3D Obsidian Boulder */}
    <polygon points="48,12 74,26 82,54 64,76 30,76 14,52 24,24" fill={`url(#rock-right-${uid})`} stroke="#94A3B8" strokeOpacity="0.35" strokeWidth="1.5" />
    <polygon points="48,12 24,24 14,52 38,44 48,28" fill={`url(#rock-left-${uid})`} />
    <polygon points="48,12 74,26 58,42 48,28" fill={`url(#rock-top-${uid})`} />
    <polygon points="38,44 58,42 64,76 30,76" fill="#1E293B" fillOpacity="0.7" />
    {/* Specular Rim Highlight */}
    <polyline points="25,25 48,13 72,26" fill="none" stroke="#F8FAFC" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    {/* Glowing Molten Magma Veins */}
    <path d="M48 28 L38 44 L30 74 M48 28 L58 42 L79 52 M38 44 L58 42 L53 60 L64 74" fill="none" stroke={`url(#magma-${uid})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="48" cy="28" r="3" fill="#FEF3C7" />
    <circle cx="38" cy="44" r="2.2" fill="#FBBF24" />
    <circle cx="58" cy="42" r="2.2" fill="#FBBF24" />
  </svg>
);

const Paper3DSvg: React.FC<{ className?: string; uid: string }> = ({ className = 'w-14 h-14', uid }) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <defs>
      <radialGradient id={`paper-aura-${uid}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`scroll-body-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="55%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id={`gold-trim-${uid}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
    </defs>
    {/* Celestial Wind Aura */}
    <circle cx="48" cy="48" r="40" fill={`url(#paper-aura-${uid})`} />
    <path d="M10 34 Q24 22 40 28" fill="none" stroke="#7DD3FC" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M56 68 Q72 74 86 60" fill="none" stroke="#FDE68A" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    {/* Royal Scroll Backing Shadow */}
    <rect x="24" y="18" width="50" height="62" rx="6" fill="#0F172A" fillOpacity="0.55" transform="translate(2,4)" />
    {/* Scroll Body */}
    <path d="M24 20 C24 15 29 12 34 12 L68 12 C73 12 76 16 74 22 L68 74 C67 79 62 82 56 82 L24 82 C19 82 17 77 18 72 Z" fill={`url(#scroll-body-${uid})`} stroke={`url(#gold-trim-${uid})`} strokeWidth="2.4" />
    {/* Top & Bottom Rolled Cylinders */}
    <rect x="20" y="11" width="56" height="9" rx="4.5" fill={`url(#gold-trim-${uid})`} stroke="#FEF3C7" strokeOpacity="0.65" strokeWidth="1" />
    <rect x="18" y="75" width="54" height="9" rx="4.5" fill={`url(#gold-trim-${uid})`} stroke="#FEF3C7" strokeOpacity="0.65" strokeWidth="1" />
    {/* Golden Seal & Celestial Runes */}
    <circle cx="47" cy="44" r="14" fill="none" stroke="#92400E" strokeOpacity="0.55" strokeWidth="1.8" />
    <polygon points="47,33 56,44 47,55 38,44" fill="#0EA5E9" fillOpacity="0.28" stroke="#0284C7" strokeWidth="1.8" />
    <line x1="34" y1="63" x2="58" y2="63" stroke="#92400E" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="37" y1="27" x2="58" y2="27" stroke="#92400E" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Scissors3DSvg: React.FC<{ className?: string; uid: string }> = ({ className = 'w-14 h-14', uid }) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <defs>
      <radialGradient id={`blade-aura-${uid}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`steel-blade-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="45%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
      <linearGradient id={`neon-edge-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ECFEFF" />
        <stop offset="50%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    {/* Aura & Slash Trail */}
    <circle cx="48" cy="44" r="38" fill={`url(#blade-aura-${uid})`} />
    <path d="M18 22 Q48 8 78 22" fill="none" stroke="#22D3EE" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
    {/* Blade 1 */}
    <path d="M36 56 L22 14 L32 18 L50 50 Z" fill={`url(#steel-blade-${uid})`} stroke={`url(#neon-edge-${uid})`} strokeWidth="1.6" strokeLinejoin="round" />
    {/* Blade 2 */}
    <path d="M60 56 L74 14 L64 18 L46 50 Z" fill={`url(#steel-blade-${uid})`} stroke={`url(#neon-edge-${uid})`} strokeWidth="1.6" strokeLinejoin="round" />
    {/* Specular Edge Glints */}
    <line x1="25" y1="19" x2="40" y2="49" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="71" y1="19" x2="56" y2="49" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.3" strokeLinecap="round" />
    {/* Pivot Medallion */}
    <circle cx="48" cy="51" r="6" fill="#0F172A" stroke="#22D3EE" strokeWidth="2" />
    <circle cx="48" cy="51" r="2.2" fill="#FDE68A" />
    {/* Ergonomic 3D Ring Handles */}
    <circle cx="31" cy="71" r="11" fill="#0F172A" fillOpacity="0.85" stroke="#2DD4BF" strokeWidth="4" />
    <circle cx="31" cy="71" r="7" fill="none" stroke="#99F6E4" strokeOpacity="0.55" strokeWidth="1.2" />
    <circle cx="65" cy="71" r="11" fill="#0F172A" fillOpacity="0.85" stroke="#2DD4BF" strokeWidth="4" />
    <circle cx="65" cy="71" r="7" fill="none" stroke="#99F6E4" strokeOpacity="0.55" strokeWidth="1.2" />
  </svg>
);

function renderChoiceSvg(choice: RPSChoice, className: string, uid: string) {
  if (choice === 'rock') return <Rock3DSvg className={className} uid={uid} />;
  if (choice === 'paper') return <Paper3DSvg className={className} uid={uid} />;
  return <Scissors3DSvg className={className} uid={uid} />;
}

export const RPSBoard: React.FC<RPSBoardProps> = ({
  state,
  myPlayerNum,
  lang = 'en',
  disabled,
  onMove,
}) => {
  const t = TRANSLATIONS[lang];
  const uid = React.useId().replace(/:/g, '');
  const [revealPhase, setRevealPhase] = React.useState<'idle' | 'shake' | 'clash'>('idle');
  const [shakeBeat, setShakeBeat] = React.useState<3 | 2 | 1>(3);
  const lastRoundRef = React.useRef<number>(state.lastReveal?.round ?? 0);

  const mySubmitted = myPlayerNum === 1 ? state.p1Submitted : myPlayerNum === 2 ? state.p2Submitted : false;
  const oppSubmitted = myPlayerNum === 1 ? state.p2Submitted : myPlayerNum === 2 ? state.p1Submitted : false;
  const myChoice = myPlayerNum === 1 ? state.p1Choice : myPlayerNum === 2 ? state.p2Choice : null;

  React.useEffect(() => {
    if (state.lastReveal && state.lastReveal.round !== lastRoundRef.current) {
      lastRoundRef.current = state.lastReveal.round;
      setRevealPhase('shake');
      setShakeBeat(3);
      soundEngine.playTick();

      const t2 = setTimeout(() => {
        setShakeBeat(2);
        soundEngine.playTick();
      }, 300);

      const t1 = setTimeout(() => {
        setShakeBeat(1);
        soundEngine.playTick();
      }, 600);

      const tClash = setTimeout(() => {
        setRevealPhase('clash');
        soundEngine.playDrop();
      }, 920);

      return () => {
        clearTimeout(t2);
        clearTimeout(t1);
        clearTimeout(tClash);
      };
    } else if (state.lastReveal && revealPhase === 'idle') {
      setRevealPhase('clash');
    }
  }, [state.lastReveal, revealPhase]);

  const handleSelect = (choice: RPSChoice) => {
    if (disabled || mySubmitted || state.winner !== 0 || myPlayerNum === 0) return;
    soundEngine.playMove();
    onMove({ choice });
  };

  const getLabel = (choice: RPSChoice) => {
    if (choice === 'rock') return t.match.rpsRock;
    if (choice === 'paper') return t.match.rpsPaper;
    return t.match.rpsScissors;
  };

  const neededWins = Math.ceil(state.bestOf / 2);

  const getClashTitle = () => {
    if (!state.lastReveal) return '';
    if (state.lastReveal.winner === 'draw') return t.match.rpsDrawRound;
    const winChoice = state.lastReveal.winner === 1 ? state.lastReveal.p1Choice : state.lastReveal.p2Choice;
    if (winChoice === 'rock') return t.match.rpsClashRock;
    if (winChoice === 'paper') return t.match.rpsClashPaper;
    return t.match.rpsClashScissors;
  };

  const winningChoiceForEffect: RPSChoice | 'draw' | null = state.lastReveal
    ? state.lastReveal.winner === 'draw'
      ? 'draw'
      : state.lastReveal.winner === 1
      ? state.lastReveal.p1Choice
      : state.lastReveal.p2Choice
    : null;

  return (
    <div className="w-full max-w-[560px] mx-auto space-y-4 sm:space-y-5 touch-game-lock">
      {/* 3D Championship Scoreboard with Win Pips */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 rounded-2xl bg-gradient-to-b from-[#172238] via-[#11192B] to-[#0B1120] border border-white/15 shadow-xl">
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[11px] font-semibold text-amber-300/90 uppercase tracking-wider">P1</span>
          <div className="flex items-center gap-1.5 mt-1">
            {Array.from({ length: neededWins }).map((_, idx) => (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  idx < state.p1Score
                    ? 'bg-amber-400 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.75)]'
                    : 'bg-[#070B14] border-white/20'
                }`}
              />
            ))}
            <span className="ml-1 text-lg font-display font-bold text-amber-400 tabular-nums">
              {state.p1Score}
            </span>
          </div>
        </div>

        <div className="text-center px-2">
          <div className="text-xs font-semibold text-slate-200 tabular-nums">
            {t.match.rpsRoundLabel} {state.currentRound} · {t.match.rpsBestOf} {state.bestOf}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
            {t.match.rpsFirstTo} {neededWins}
          </div>
        </div>

        <div className="flex flex-col items-end min-w-0">
          <span className="text-[11px] font-semibold text-sky-300/90 uppercase tracking-wider">P2</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="mr-1 text-lg font-display font-bold text-sky-400 tabular-nums">
              {state.p2Score}
            </span>
            {Array.from({ length: neededWins }).map((_, idx) => (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  idx < state.p2Score
                    ? 'bg-sky-400 border-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.75)]'
                    : 'bg-[#070B14] border-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3D Elemental Clash Stage */}
      <div className="min-h-[210px] sm:min-h-[228px] rounded-3xl bg-gradient-to-b from-[#162038] via-[#0F172A] to-[#090D18] border border-white/15 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]">
        {/* Subtle Arena Floor Grid */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.35), transparent 70%)',
          }}
        />

        <AnimatePresence mode="wait">
          {revealPhase === 'shake' && state.lastReveal ? (
            <motion.div
              key="shake-countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              className="w-full flex items-center justify-between gap-3 sm:gap-6 relative z-10"
            >
              {/* Left Gauntlet Shaking */}
              <motion.div
                key={`left-beat-${shakeBeat}`}
                initial={{ y: -14, rotate: -6 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-500/15 border border-amber-400/45 flex items-center justify-center shadow-[0_0_28px_rgba(245,158,11,0.22)]"
              >
                <Rock3DSvg className="w-14 h-14 sm:w-16 sm:h-16" uid={`${uid}-shk1`} />
              </motion.div>

              {/* Center 3-2-1 Countdown Beat */}
              <motion.div
                key={`beat-${shakeBeat}`}
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-display font-extrabold text-amber-300 tabular-nums drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]">
                  {shakeBeat}
                </div>
              </motion.div>

              {/* Right Gauntlet Shaking */}
              <motion.div
                key={`right-beat-${shakeBeat}`}
                initial={{ y: -14, rotate: 6 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-sky-500/15 border border-sky-400/45 flex items-center justify-center shadow-[0_0_28px_rgba(56,189,248,0.22)]"
              >
                <div className="-scale-x-100">
                  <Rock3DSvg className="w-14 h-14 sm:w-16 sm:h-16" uid={`${uid}-shk2`} />
                </div>
              </motion.div>
            </motion.div>
          ) : state.lastReveal ? (
            <motion.div
              key={`clash-${state.lastReveal.round}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center gap-3 relative z-10"
            >
              {/* Clash VFX Banner */}
              <div className="text-center">
                <span
                  className={`text-xs sm:text-sm font-display font-bold tracking-wide uppercase ${
                    state.lastReveal.winner === 'draw'
                      ? 'text-slate-300'
                      : state.lastReveal.winner === 1
                      ? 'text-amber-300'
                      : 'text-sky-300'
                  }`}
                >
                  {getClashTitle()}
                </span>
              </div>

              <div className="w-full flex items-center justify-around gap-2 sm:gap-4 relative">
                {/* P1 3D Weapon */}
                <motion.div
                  initial={{ x: -32, scale: 0.8 }}
                  animate={{
                    x: 0,
                    scale: state.lastReveal.winner === 1 ? 1.08 : state.lastReveal.winner === 2 ? 0.88 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center transition-all ${
                      state.lastReveal.winner === 1
                        ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_32px_rgba(245,158,11,0.45)]'
                        : 'bg-[#0B111E] border-white/15 opacity-80'
                    }`}
                  >
                    {renderChoiceSvg(state.lastReveal.p1Choice, 'w-14 h-14 sm:w-16 sm:h-16', `${uid}-rev1`)}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-200">
                    P1 · {getLabel(state.lastReveal.p1Choice)}
                  </span>
                </motion.div>

                {/* Center Elemental Clash SVG Overlay */}
                <div className="flex flex-col items-center justify-center relative shrink-0 w-16 sm:w-24">
                  <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16" aria-hidden="true">
                    {winningChoiceForEffect === 'scissors' && (
                      <g>
                        <motion.line
                          x1="12"
                          y1="66"
                          x2="68"
                          y2="14"
                          stroke="#22D3EE"
                          strokeWidth="4"
                          strokeLinecap="round"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.25 }}
                        />
                        <motion.line
                          x1="22"
                          y1="70"
                          x2="72"
                          y2="24"
                          stroke="#ECFEFF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.85 }}
                          transition={{ duration: 0.28, delay: 0.05 }}
                        />
                      </g>
                    )}
                    {winningChoiceForEffect === 'rock' && (
                      <g>
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="26"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="3"
                          initial={{ scale: 0.4, opacity: 1 }}
                          animate={{ scale: 1.15, opacity: 0.8 }}
                          transition={{ duration: 0.35 }}
                        />
                        <polygon points="40,14 45,32 64,28 49,41 60,58 42,47 26,62 32,42 15,34 34,33" fill="#FBBF24" fillOpacity="0.85" />
                      </g>
                    )}
                    {winningChoiceForEffect === 'paper' && (
                      <g>
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="24"
                          fill="#F59E0B"
                          fillOpacity="0.18"
                          stroke="#FDE68A"
                          strokeWidth="2.5"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.32 }}
                        />
                        <polygon points="40,20 56,40 40,60 24,40" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                      </g>
                    )}
                    {winningChoiceForEffect === 'draw' && (
                      <g>
                        <line x1="20" y1="20" x2="60" y2="60" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
                        <line x1="60" y1="20" x2="20" y2="60" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
                      </g>
                    )}
                  </svg>
                  <div className="text-[11px] font-semibold text-slate-300 text-center whitespace-nowrap">
                    {state.lastReveal.winner === 'draw'
                      ? t.match.rpsDrawRound
                      : `P${state.lastReveal.winner} ${t.match.rpsWinsRound}`}
                  </div>
                </div>

                {/* P2 3D Weapon */}
                <motion.div
                  initial={{ x: 32, scale: 0.8 }}
                  animate={{
                    x: 0,
                    scale: state.lastReveal.winner === 2 ? 1.08 : state.lastReveal.winner === 1 ? 0.88 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center transition-all ${
                      state.lastReveal.winner === 2
                        ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_32px_rgba(56,189,248,0.45)]'
                        : 'bg-[#0B111E] border-white/15 opacity-80'
                    }`}
                  >
                    {renderChoiceSvg(state.lastReveal.p2Choice, 'w-14 h-14 sm:w-16 sm:h-16', `${uid}-rev2`)}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-200">
                    P2 · {getLabel(state.lastReveal.p2Choice)}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="waiting" className="text-center space-y-2.5 relative z-10 px-2">
              <div className="flex items-center justify-center gap-3 opacity-85">
                <Rock3DSvg className="w-11 h-11" uid={`${uid}-idle1`} />
                <Paper3DSvg className="w-11 h-11" uid={`${uid}-idle2`} />
                <Scissors3DSvg className="w-11 h-11" uid={`${uid}-idle3`} />
              </div>
              <div className="text-base font-display font-bold text-slate-100">{t.match.rpsSelectMove}</div>
              <div className="text-xs text-slate-400 max-w-sm mx-auto">{t.match.rpsLockHint}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live Round Lock Status */}
      {state.winner === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
          <span className={mySubmitted ? 'text-amber-300 font-semibold' : ''}>
            {mySubmitted ? `${t.match.rpsLockedPrefix} ${myChoice ? getLabel(myChoice) : ''}` : t.match.rpsWaitingPick}
          </span>
          <span className={oppSubmitted ? 'text-emerald-300 font-semibold' : ''}>
            {oppSubmitted ? t.match.rpsOppLocked : t.match.rpsOppChoosing}
          </span>
        </div>
      )}

      {/* 3D Tactile Weapon Cards (Thumb-Friendly >=44px Hitboxes) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {(['rock', 'paper', 'scissors'] as RPSChoice[]).map((choice) => {
          const isPicked = myChoice === choice;
          const isLockedOut = disabled || mySubmitted || state.winner !== 0 || myPlayerNum === 0;
          const hoverStyle =
            choice === 'rock'
              ? 'hover:border-amber-400/75 hover:bg-amber-500/12'
              : choice === 'paper'
              ? 'hover:border-sky-400/75 hover:bg-sky-500/12'
              : 'hover:border-teal-400/75 hover:bg-teal-500/12';

          return (
            <motion.button
              key={choice}
              type="button"
              whileHover={!isLockedOut ? { y: -3 } : undefined}
              whileTap={!isLockedOut ? { scale: 0.95 } : undefined}
              disabled={isLockedOut}
              onClick={() => handleSelect(choice)}
              className={`min-h-[120px] sm:min-h-[136px] rounded-2xl border p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-lg ${
                isPicked
                  ? 'bg-gradient-to-b from-amber-500/25 to-amber-900/20 border-amber-400 text-amber-200 shadow-[0_0_26px_rgba(245,158,11,0.3)]'
                  : isLockedOut
                  ? 'bg-[#101727]/60 border-white/5 text-slate-500 cursor-not-allowed'
                  : `bg-gradient-to-b from-[#172238] to-[#0E1525] border-white/15 text-slate-100 cursor-pointer ${hoverStyle}`
              }`}
            >
              {renderChoiceSvg(choice, 'w-12 h-12 sm:w-14 sm:h-14', `${uid}-btn-${choice}`)}
              <span className="text-xs sm:text-sm font-display font-bold text-center leading-tight">
                {getLabel(choice)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
