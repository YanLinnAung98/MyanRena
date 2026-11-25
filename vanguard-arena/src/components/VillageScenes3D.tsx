import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { WiseOwl3D } from './WiseOwl3D.tsx';

/* ============================================================================
   HELPER: Cute 3D-Styled Myanmar Village Kid Character (Dance / Cry / Bonked)
============================================================================ */
const VillageKidSprite: React.FC<{
  name: string;
  shirtColor: string;
  longyiColor: string;
  state: 'idle' | 'thinking' | 'dancing' | 'crying' | 'bonked' | 'bonking';
  flip?: boolean;
  compact?: boolean;
}> = ({ name, shirtColor, longyiColor, state, flip = false, compact = false }) => {
  const isDancing = state === 'dancing';
  const isCrying = state === 'crying';
  const isBonked = state === 'bonked';
  const isBonking = state === 'bonking';

  return (
    <div className="flex flex-col items-center relative select-none">
      {/* Status Bubble Above Kid */}
      {state === 'thinking' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="absolute -top-6 z-20 px-2 py-0.5 rounded-full bg-slate-900/95 border border-amber-400/50 text-[10px] font-bold text-amber-300 whitespace-nowrap shadow-lg"
        >
          💭 စဉ်းစားနေ...
        </motion.div>
      )}
      {isDancing && (
        <motion.div
          animate={{ y: [-2, -10, -2], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="absolute -top-6 z-20 text-xs font-extrabold text-amber-300 whitespace-nowrap"
        >
          🎵 ✨ ဟေး! ✨
        </motion.div>
      )}
      {isBonked && (
        <motion.div
          initial={{ scale: 0.4, opacity: 1 }}
          animate={{ scale: [1.3, 1, 1.15], rotate: [0, 20, -20, 0] }}
          transition={{ duration: 0.55, repeat: 1 }}
          className="absolute -top-7 z-30 flex items-center gap-0.5 text-sm font-extrabold text-amber-300 drop-shadow-[0_0_8px_#f59e0b]"
        >
          <span>💥</span>
          <span className="text-[11px] bg-rose-600 text-white px-1.5 py-0.2 rounded-md">ခေါက်!</span>
          <span>💫</span>
        </motion.div>
      )}

      {/* Kid SVG Sprite */}
      <motion.div
        animate={
          isDancing
            ? { y: [0, -10, 0, -8, 0], rotate: [-8, 8, -8, 8, 0] }
            : isCrying
            ? { x: [-1.5, 1.5, -1.5, 1.5, 0], y: [0, 1.5, 0] }
            : isBonked
            ? { scaleY: [1, 0.78, 1.05, 1], y: [0, 6, 0] }
            : isBonking
            ? { x: flip ? [0, -34, 0] : [0, 34, 0], rotate: flip ? [0, -14, 0] : [0, 14, 0] }
            : { y: [0, -2, 0] }
        }
        transition={{
          duration: isDancing ? 0.55 : isBonked || isBonking ? 0.42 : isCrying ? 0.35 : 2.4,
          repeat: isDancing || isCrying || state === 'idle' ? Infinity : 0,
        }}
        className={`${compact ? 'w-14 h-16 sm:w-16 sm:h-18' : 'w-20 h-24 sm:w-24 sm:h-28'} relative`}
      >
        <svg
          viewBox="0 0 110 125"
          className={`w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.65)] ${flip ? 'scale-x-[-1]' : ''}`}
        >
          {/* Body / Shirt & Longyi */}
          <rect x="33" y="64" width="44" height="32" rx="14" fill={shirtColor} stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M35 92 L75 92 L72 118 L38 118 Z" fill={longyiColor} stroke="#000" strokeOpacity="0.3" strokeWidth="1.5" />
          {/* Left & Right Arms */}
          <motion.path
            d={isDancing ? 'M35 72 L12 46' : isBonked ? 'M35 74 L28 42' : 'M35 74 L18 90'}
            stroke="#f5cba7"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <motion.path
            d={
              isDancing
                ? 'M75 72 L98 46'
                : isBonking
                ? 'M75 70 L104 42'
                : isBonked
                ? 'M75 74 L82 42'
                : 'M75 74 L92 90'
            }
            stroke="#f5cba7"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Head */}
          <circle cx="55" cy="40" r="24" fill="#f5cba7" stroke="#d4a373" strokeWidth="2" />
          {/* Traditional Myanmar Hair & Topknot */}
          <path d="M31 36 C31 16, 79 16, 79 36 C70 25, 40 25, 31 36 Z" fill="#1e1b2e" />
          <circle cx="55" cy="14" r="7" fill="#1e1b2e" />
          <circle cx="55" cy="14" r="2.5" fill="#fbbf24" />

          {/* Thanaka Cheeks */}
          <ellipse cx="42" cy="46" rx="5.5" ry="3.8" fill="#fef08a" fillOpacity="0.82" />
          <ellipse cx="68" cy="46" rx="5.5" ry="3.8" fill="#fef08a" fillOpacity="0.82" />

          {/* Eyes */}
          {isCrying ? (
            <>
              <path d="M41 39 Q46 35 51 39" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M59 39 Q64 35 69 39" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {/* Animated Teardrops */}
              <motion.circle
                cx="45"
                cy="44"
                r="3"
                fill="#38bdf8"
                animate={{ y: [0, 16], opacity: [1, 0] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              />
              <motion.circle
                cx="65"
                cy="44"
                r="3"
                fill="#38bdf8"
                animate={{ y: [0, 16], opacity: [1, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: 0.35 }}
              />
            </>
          ) : isBonked ? (
            <>
              <text x="45" y="42" fontSize="11" fontWeight="bold" fill="#1e293b" textAnchor="middle">X</text>
              <text x="65" y="42" fontSize="11" fontWeight="bold" fill="#1e293b" textAnchor="middle">X</text>
            </>
          ) : (
            <>
              <circle cx="46" cy="38" r="3.4" fill="#1e293b" />
              <circle cx="64" cy="38" r="3.4" fill="#1e293b" />
              <circle cx="45" cy="37" r="1.2" fill="#fff" />
              <circle cx="63" cy="37" r="1.2" fill="#fff" />
            </>
          )}

          {/* Mouth */}
          {isDancing ? (
            <path d="M47 50 Q55 60 63 50 Z" fill="#e11d48" />
          ) : isCrying || isBonked ? (
            <path d="M48 55 Q55 48 62 55" fill="none" stroke="#9f1239" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M48 51 Q55 56 62 51" fill="none" stroke="#7c2d12" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </svg>
      </motion.div>

      <span className="mt-0.5 px-2 py-0.5 rounded-full bg-black/65 border border-white/10 text-[10px] font-bold text-white max-w-[80px] truncate">
        {name}
      </span>
    </div>
  );
};

/* ============================================================================
   1. VILLAGE KUT-PYIT TIC-TAC-TOE (Top-Down Bamboo Platform + Hand Scratching)
============================================================================ */
export const VillageTicTacToeScene: React.FC<{
  lang: Language;
  match: any;
  currentUser: UserProfile;
  isMyTurn: boolean;
  botThinking?: boolean;
  onCellClick: (idx: number) => void;
}> = ({ lang, match, currentUser, isMyTurn, botThinking, onCellClick }) => {
  const players = match.players || [currentUser];
  const p1 = players[0] || currentUser;
  const p2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot' };
  const board: Array<string | null> = match.tttBoard || Array(9).fill(null);
  const isFinished = match.status === 'finished';

  const [scratchHand, setScratchHand] = React.useState<{ actor: 'p1' | 'p2'; idx: number } | null>(null);
  const lastMoveTsRef = React.useRef<number>(0);

  // Animate hand reaching & scratching whenever a move lands
  React.useEffect(() => {
    const lm = match.lastMove;
    if (lm && typeof lm.index === 'number' && lm.ts !== lastMoveTsRef.current) {
      lastMoveTsRef.current = lm.ts;
      setScratchHand({ actor: lm.actor === 'p2' ? 'p2' : 'p1', idx: lm.index });
      const t = window.setTimeout(() => setScratchHand(null), 520);
      return () => window.clearTimeout(t);
    }
  }, [match.lastMove]);

  const p1State = isFinished
    ? match.isDraw
      ? 'idle'
      : match.winnerId === p1.id
      ? 'dancing'
      : 'crying'
    : 'idle';

  const p2State = isFinished
    ? match.isDraw
      ? 'idle'
      : match.winnerId === p2.id
      ? 'dancing'
      : 'crying'
    : botThinking
    ? 'thinking'
    : 'idle';

  const getCellCoords = (idx: number) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return { left: `${col * 33.3 + 16.6}%`, top: `${row * 33.3 + 16.6}%` };
  };

  return (
    <div className="w-full max-w-[360px] sm:max-w-[420px] flex flex-col items-center gap-1.5 relative">
      {/* Top-Down Myanmar Village Kut-Pyit (ကွပ်ပျစ်) Stage */}
      <div
        className="w-full rounded-3xl p-3 sm:p-4 relative overflow-hidden border-2 border-amber-700/70 shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
        style={{
          background:
            'repeating-linear-gradient(90deg, #5c3a21 0px, #6e472b 16px, #472b16 17px, #5c3a21 19px)',
        }}
      >
        {/* Village Lantern Ambient Warm Glow & Corner Leaves */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.16),rgba(10,14,23,0.45))] pointer-events-none" />
        <span className="absolute top-1.5 left-2 text-lg opacity-70 pointer-events-none">🌿</span>
        <span className="absolute bottom-1.5 right-2 text-lg opacity-70 pointer-events-none">🏮</span>

        <div className="relative z-10 flex flex-col items-center gap-2">
          {/* Top Child (Opponent / Bot — Top-Down View) */}
          <VillageKidSprite
            name={p2.displayName}
            shirtColor="#0ea5e9"
            longyiColor="#1e3a8a"
            state={p2State}
            compact
          />

          {/* Center Chalkboard Drawn Directly on Bamboo Kut-Pyit */}
          <div className="relative w-[210px] sm:w-[240px] aspect-square p-2 rounded-2xl bg-[#2c1a0e]/85 border-2 border-amber-300/40 shadow-inner">
            <div className="grid grid-cols-3 gap-1.5 w-full h-full">
              {board.map((cell, idx) => (
                <motion.button
                  key={idx}
                  whileHover={!cell && !isFinished && isMyTurn && !botThinking ? { scale: 1.05 } : {}}
                  whileTap={!cell && !isFinished && isMyTurn && !botThinking ? { scale: 0.92 } : {}}
                  type="button"
                  disabled={isFinished || !isMyTurn || Boolean(botThinking) || cell !== null}
                  onClick={() => onCellClick(idx)}
                  className="rounded-xl bg-[#3d2514]/90 hover:bg-[#4e301a] border border-amber-200/25 flex items-center justify-center p-2 cursor-pointer"
                >
                  {cell === 'X' && (
                    <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-[0_0_8px_rgba(254,240,138,0.85)]">
                      <motion.path
                        d="M12 12 L48 48"
                        stroke="#fef08a"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.25 }}
                      />
                      <motion.path
                        d="M48 12 L12 48"
                        stroke="#fbbf24"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.25, delay: 0.1 }}
                      />
                    </svg>
                  )}
                  {cell === 'O' && (
                    <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]">
                      <motion.circle
                        cx="30"
                        cy="30"
                        r="19"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.32 }}
                      />
                    </svg>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Animated Reaching Hand Scratching the Board */}
            <AnimatePresence>
              {scratchHand && (() => {
                const pos = getCellCoords(scratchHand.idx);
                const fromBottom = scratchHand.actor === 'p1';
                return (
                  <motion.div
                    key={`${scratchHand.actor}_${scratchHand.idx}`}
                    initial={{
                      left: pos.left,
                      top: fromBottom ? '115%' : '-15%',
                      scale: 0.7,
                      opacity: 0,
                    }}
                    animate={{
                      left: pos.left,
                      top: pos.top,
                      scale: 1.15,
                      opacity: 1,
                      rotate: fromBottom ? [-12, 12, -8] : [168, 192, 175],
                    }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.35 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                  >
                    ✍️
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Bottom Child (User — Top-Down View) */}
          <VillageKidSprite
            name={p1.displayName}
            shirtColor="#f59e0b"
            longyiColor="#991b1b"
            state={p1State}
            compact
          />
        </div>
      </div>

      <div className="text-center text-xs font-bold text-amber-300">
        {isFinished
          ? lang === 'my' ? 'ပွဲပြီးဆုံးပါပြီ' : 'Match Finished'
          : botThinking
          ? lang === 'my' ? '💭 ပြိုင်ဘက် စဉ်းစားနေပါသည် (1.5s)...' : '💭 Bot is thinking...'
          : isMyTurn
          ? lang === 'my' ? 'သင့်အလှည့် (X) — ကွပ်ပျစ်အကွက်ပေါ် နှိပ်ခြစ်ပါ' : 'Your Turn (X) — Tap to scratch'
          : lang === 'my' ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...' : "Opponent's Turn..."}
      </div>
    </div>
  );
};

/* ============================================================================
   2. WISE OWL TREE QUIZ (Tree Owl + Seated Kids + Dive-Down Head Bonk!)
============================================================================ */
export const WiseOwlTreeQuizScene: React.FC<{
  lang: Language;
  match: any;
  currentUser: UserProfile;
  isPvp: boolean;
  onAnswer: (oIdx: number) => void;
}> = ({ lang, match, currentUser, isPvp, onAnswer }) => {
  const players: any[] = match.players || [currentUser];
  const riddles = match.riddles || [];
  const idx = Math.min(match.riddleIndex || 0, Math.max(0, riddles.length - 1));
  const current = riddles[idx];

  const [bonkingKidId, setBonkingKidId] = React.useState<string | null>(null);
  const [cheeringKidId, setCheeringKidId] = React.useState<string | null>(null);
  const [owlDiving, setOwlDiving] = React.useState<boolean>(false);
  const [flashedOpt, setFlashedOpt] = React.useState<{ idx: number; correct: boolean | null } | null>(null);

  if (!current) return null;
  const questionText = lang === 'my' ? current.questionMy || current.question : current.questionEn || current.question;
  const opts: string[] = lang === 'my' ? current.optionsMy || current.options : current.optionsEn || current.options;
  const alreadyAnswered = Boolean(isPvp && typeof match.roundAnswers?.[currentUser.id] === 'number');
  const isFinished = match.status === 'finished';

  const handleSelectOption = (oIdx: number) => {
    if (flashedOpt || isFinished || alreadyAnswered) return;
    // The authoritative server deliberately hides the answer key until reveal.
    // In that mode, show a neutral selection animation and let the server score it.
    if (typeof current.answerIndex !== 'number') {
      setFlashedOpt({ idx: oIdx, correct: null });
      setTimeout(() => {
        setFlashedOpt(null);
        onAnswer(oIdx);
      }, 450);
      return;
    }

    const isCorrect = oIdx === current.answerIndex;
    setFlashedOpt({ idx: oIdx, correct: isCorrect });

    if (isCorrect) {
      setCheeringKidId(currentUser.id);
      setTimeout(() => {
        setCheeringKidId(null);
        setFlashedOpt(null);
        onAnswer(oIdx);
      }, 650);
    } else {
      // Wise Owl dives down from the tree branch to BONK the wrong kid's head!
      setOwlDiving(true);
      setTimeout(() => setBonkingKidId(currentUser.id), 220);
      setTimeout(() => {
        setOwlDiving(false);
        setBonkingKidId(null);
        setFlashedOpt(null);
        onAnswer(oIdx);
      }, 1050);
    }
  };

  const kidColors = [
    ['#f59e0b', '#991b1b'],
    ['#38bdf8', '#1e3a8a'],
    ['#10b981', '#065f46'],
    ['#c084fc', '#581c87'],
    ['#fb7185', '#881337'],
    ['#fb923c', '#7c2d12'],
    ['#2dd4bf', '#115e59'],
    ['#a3e635', '#3f6212'],
  ];

  // Calculate horizontal target offset for Owl diving down toward the wrong kid
  const mySeatIdx = Math.max(0, players.findIndex((p) => p.id === currentUser.id));
  const seatCount = Math.max(1, players.length);
  const diveOffsetX = seatCount > 1 ? ((mySeatIdx / (seatCount - 1)) - 0.5) * 160 : 0;

  return (
    <div className="w-full max-w-lg flex flex-col justify-between gap-2 h-full max-h-[540px]">
      {/* 3D Village Banyan Tree Stage with Perched Owl & Seated Kids */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-[#0b1528] via-[#102033] to-[#1a2e1a] p-2.5 shrink-0">
        {/* Stylized Tree Canopy & Branch */}
        <svg viewBox="0 0 400 130" className="absolute inset-x-0 top-0 w-full h-28 pointer-events-none opacity-85">
          <circle cx="65" cy="18" r="55" fill="#14532d" />
          <circle cx="200" cy="8" r="68" fill="#166534" />
          <circle cx="335" cy="20" r="55" fill="#14532d" />
          {/* Sturdy Tree Branch Where Owl Perches */}
          <path d="M0 95 Q130 78, 220 88 T400 72" fill="none" stroke="#5c3a21" strokeWidth="14" strokeLinecap="round" />
          <path d="M0 95 Q130 78, 220 88 T400 72" fill="none" stroke="#7c4d2b" strokeWidth="5" strokeLinecap="round" />
        </svg>

        {/* Wise Owl Perched on Branch — Swoops Down to Bonk Wrong Kid! */}
        <motion.div
          animate={
            owlDiving
              ? { y: 78, x: diveOffsetX, scale: 1.08, rotate: [0, -14, 14, 0] }
              : { y: 0, x: 0, scale: 0.85, rotate: 0 }
          }
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative z-30 -my-3"
        >
          <WiseOwl3D
            mood={cheeringKidId ? 'happy' : owlDiving ? 'thinking' : 'asking'}
            questionNumber={idx + 1}
          />
        </motion.div>

        {/* Seated Village Children Facing the Owl (1 to 8 Players) */}
        <div className="relative z-20 flex items-end justify-center gap-2 sm:gap-3 pt-2 overflow-x-auto no-scrollbar">
          {players.slice(0, 8).map((pl, sIdx) => {
            const [shirt, longyi] = kidColors[sIdx % kidColors.length];
            const kState =
              bonkingKidId === pl.id
                ? 'bonked'
                : cheeringKidId === pl.id
                ? 'dancing'
                : 'idle';
            return (
              <div key={pl.id} className="flex flex-col items-center shrink-0">
                <VillageKidSprite
                  name={`${pl.displayName} (${match.scores?.[pl.id] || 0})`}
                  shirtColor={shirt}
                  longyiColor={longyi}
                  state={kState}
                  compact
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Scroll Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="p-3 rounded-2xl cyber-gold-active shrink-0"
        >
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold mb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'my'
                ? `ပညာရှိ ဇီးကွက် မေးခွန်း (${idx + 1}/${riddles.length})`
                : `Wise Owl Quiz (${idx + 1}/${riddles.length})`}
            </span>
            <span>{match.scores?.[currentUser.id] ?? 0} PTS</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{questionText}</p>
        </motion.div>
      </AnimatePresence>

      {/* Answer Buttons */}
      {alreadyAnswered ? (
        <div className="p-3 rounded-2xl cyber-panel text-center text-xs text-amber-300 font-semibold">
          {lang === 'my' ? 'အခြားကစားသမားများ ဖြေဆိုသည်ကို စောင့်နေပါသည်...' : 'Waiting for other players...'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {opts.map((opt, oIdx) => {
            const flash = flashedOpt?.idx === oIdx;
            const cls = flash
              ? flashedOpt.correct === true
                ? '!bg-emerald-500/35 !border-emerald-400'
                : flashedOpt.correct === false
                ? '!bg-rose-500/35 !border-rose-400'
                : '!bg-amber-500/30 !border-amber-300'
              : '';
            return (
              <motion.button
                key={`${idx}_${oIdx}`}
                whileTap={{ scale: 0.94 }}
                type="button"
                disabled={isFinished || Boolean(flashedOpt)}
                onClick={() => handleSelectOption(oIdx)}
                className={`p-2.5 sm:p-3 rounded-xl cyber-panel hover:border-amber-400 text-left text-xs font-bold text-white cursor-pointer ${cls}`}
              >
                <span className="text-amber-400 font-mono mr-1.5">{oIdx + 1}.</span>
                {opt}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   3. VILLAGE RPS 3D SCENE (Two Myanmar Kids + Winner Bonks Loser's Head!)
============================================================================ */
export const VillageRpsScene: React.FC<{
  lang: Language;
  match: any;
  currentUser: UserProfile;
  isPvp: boolean;
  onPick: (choice: string) => void;
}> = ({ lang, match, currentUser, isPvp, onPick }) => {
  const players = match.players || [currentUser];
  const p1 = players[0] || currentUser;
  const p2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot' };
  const isFinished = match.status === 'finished';
  const myPicked = Boolean(isPvp && match.rpsPicks?.[currentUser.id]);

  const [shaking, setShaking] = React.useState(false);
  const [bonkAnim, setBonkAnim] = React.useState<'p1_bonks_p2' | 'p2_bonks_p1' | null>(null);
  const lastRoundSeenRef = React.useRef<number>(match.round || 1);

  // Trigger head-bonk animation whenever a new round winner is determined
  React.useEffect(() => {
    const r = match.round || 1;
    if (r > lastRoundSeenRef.current && match.rpsLastRound) {
      lastRoundSeenRef.current = r;
      const w = match.rpsLastRound.winnerId;
      if (w === p1.id) {
        setBonkAnim('p1_bonks_p2');
      } else if (w === p2.id) {
        setBonkAnim('p2_bonks_p1');
      }
      const t = window.setTimeout(() => setBonkAnim(null), 950);
      return () => window.clearTimeout(t);
    }
  }, [match.round, match.rpsLastRound, p1.id, p2.id]);

  const handleChoose = (choice: string) => {
    if (shaking || isFinished || myPicked) return;
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      onPick(choice);
    }, 450);
  };

  const p1State = isFinished
    ? match.winnerId === p1.id
      ? 'dancing'
      : 'crying'
    : bonkAnim === 'p1_bonks_p2'
    ? 'bonking'
    : bonkAnim === 'p2_bonks_p1'
    ? 'bonked'
    : 'idle';

  const p2State = isFinished
    ? match.winnerId === p2.id
      ? 'dancing'
      : 'crying'
    : bonkAnim === 'p2_bonks_p1'
    ? 'bonking'
    : bonkAnim === 'p1_bonks_p2'
    ? 'bonked'
    : 'idle';

  const iconOf = (c?: string) => (c === 'rock' ? '✊' : c === 'paper' ? '✋' : c === 'scissors' ? '✌️' : '❔');

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Scenic Myanmar Village Backdrop with Two Animated Kids */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 p-4 bg-gradient-to-b from-[#1a183b] via-[#3c2432] to-[#2e3a20] shadow-2xl">
        {/* Sunset Moon, Pagoda Silhouette & Toddy Palms */}
        <svg viewBox="0 0 400 180" className="absolute inset-0 w-full h-full pointer-events-none opacity-65">
          <circle cx="200" cy="48" r="28" fill="#fbbf24" fillOpacity="0.45" />
          {/* Distant Village Pagoda */}
          <path d="M196 35 L204 35 L202 52 L212 70 L218 110 L182 110 L188 70 L198 52 Z" fill="#1e1b2e" />
          {/* Village Bamboo Fence */}
          <rect x="0" y="128" width="400" height="52" fill="#2c3e1e" />
          <line x1="0" y1="128" x2="400" y2="128" stroke="#92400e" strokeWidth="4" />
        </svg>

        <div className="relative z-10 text-center mb-2">
          <span className="px-3 py-0.5 rounded-full bg-black/55 border border-amber-400/40 text-[11px] font-bold text-amber-300">
            Round {match.round || 1} · Best of {match.bestOf || 3}
          </span>
        </div>

        {/* Two Kids Facing Each Other + Clash Display */}
        <div className="relative z-10 flex items-end justify-between px-2 sm:px-4 pt-3">
          <VillageKidSprite
            name={p1.displayName}
            shirtColor="#f59e0b"
            longyiColor="#991b1b"
            state={p1State}
          />

          <div className="pb-6 text-center">
            {shaking ? (
              <motion.div
                animate={{ y: [0, -18, 0, -18, 0] }}
                transition={{ duration: 0.45 }}
                className="flex items-center gap-4 text-4xl"
              >
                <span>✊</span>
                <span className="scale-x-[-1]">✊</span>
              </motion.div>
            ) : match.rpsLastRound ? (
              <motion.div
                key={match.round}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3"
              >
                <span className="text-3xl sm:text-4xl drop-shadow">{iconOf(match.rpsLastRound.p1Choice)}</span>
                <span className="text-xs font-extrabold text-amber-300">VS</span>
                <span className="text-3xl sm:text-4xl drop-shadow">{iconOf(match.rpsLastRound.p2Choice)}</span>
              </motion.div>
            ) : (
              <span className="text-xs font-bold text-amber-200">
                {myPicked ? '⏳ Waiting...' : 'VS'}
              </span>
            )}
          </div>

          <VillageKidSprite
            name={p2.displayName}
            shirtColor="#38bdf8"
            longyiColor="#1e3a8a"
            state={p2State}
            flip
          />
        </div>
      </div>

      {/* Choice Controls */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { id: 'rock', icon: '✊', label: lang === 'my' ? 'ကျောက်တုံး' : 'Rock' },
          { id: 'paper', icon: '✋', label: lang === 'my' ? 'စက္ကူ' : 'Paper' },
          { id: 'scissors', icon: '✌️', label: lang === 'my' ? 'ကတ်ကြေး' : 'Scissors' },
        ].map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={isFinished || myPicked || shaking}
            onClick={() => handleChoose(item.id)}
            className="p-3.5 rounded-2xl cyber-panel hover:border-amber-400 disabled:opacity-45 flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-xs font-bold text-white">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
