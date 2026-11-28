import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
const QuizContestantAvatar: React.FC<{
  name: string;
  variant: number;
  state: 'idle' | 'dancing' | 'bonked';
}> = ({ name, variant, state }) => {
  const palettes = [
    { coat: '#2589C7', coatDark: '#123B70', trim: '#76E2FF', hair: '#17223D', scarf: '#F5B94E', skin: '#E9B58D' },
    { coat: '#B84F9C', coatDark: '#642B69', trim: '#FFB7E9', hair: '#2A1831', scarf: '#78D9D1', skin: '#F0C09C' },
    { coat: '#329B78', coatDark: '#155544', trim: '#A2F2C9', hair: '#24243A', scarf: '#F6CB72', skin: '#DFA47F' },
    { coat: '#9B77D6', coatDark: '#493477', trim: '#D8C0FF', hair: '#251C38', scarf: '#8BE0F1', skin: '#E8B18C' },
  ];
  const p = palettes[variant % palettes.length];
  return (
    <div className="quiz-contestant">
      <motion.div
        className="quiz-contestant-art"
        animate={state === 'dancing' ? { y: [0, -9, 0, -6, 0], rotate: [-5, 5, -5, 5, 0] } : state === 'bonked' ? { y: [0, 5, -2, 0], rotate: [0, -8, 8, 0], scaleY: [1, .82, 1] } : { y: [0, -3, 0] }}
        transition={{ duration: state === 'dancing' ? .65 : state === 'bonked' ? .5 : 2.8, repeat: state === 'idle' || state === 'dancing' ? Infinity : 0, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 180 206" role="img" aria-label={name} className="w-full h-full">
          <defs>
            <linearGradient id={`quizCoat${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={p.trim}/><stop offset=".3" stopColor={p.coat}/><stop offset="1" stopColor={p.coatDark}/></linearGradient>
            <radialGradient id={`quizFace${variant}`} cx=".35" cy=".25" r=".8"><stop stopColor="#FFE0BD"/><stop offset=".7" stopColor={p.skin}/><stop offset="1" stopColor="#B97861"/></radialGradient>
            <linearGradient id={`quizHair${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#56617D"/><stop offset=".28" stopColor={p.hair}/><stop offset="1" stopColor="#090F22"/></linearGradient>
            <linearGradient id={`quizScarf${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFF0B1"/><stop offset=".4" stopColor={p.scarf}/><stop offset="1" stopColor="#A66C36"/></linearGradient>
          </defs>
          <ellipse cx="90" cy="194" rx="49" ry="8" fill="#020914" opacity=".45"/>
          <path d="M45 122Q26 128 23 155L35 163 55 143M135 122Q154 128 157 155L145 163 125 143" fill={`url(#quizCoat${variant})`} stroke={p.trim} strokeOpacity=".65" strokeWidth="3"/>
          <path d="M48 116Q90 96 132 116L144 169Q90 187 36 169Z" fill={`url(#quizCoat${variant})`} stroke={p.trim} strokeWidth="3"/>
          <path d="M76 112L90 132 104 112 112 171 90 182 68 171Z" fill={`url(#quizScarf${variant})`} stroke="#FFF1BF" strokeOpacity=".55" strokeWidth="2"/>
          <path d="M54 167L80 174 74 194 47 192ZM126 167L100 174 106 194 133 192Z" fill="#111B32" stroke="#667C9C" strokeWidth="3"/>
          <path d="M42 189Q60 184 79 193L76 201H39Q34 196 42 189ZM138 189Q120 184 101 193L104 201H141Q146 196 138 189Z" fill="#E7B76D" stroke="#FFF0B2" strokeWidth="2"/>
          <path d="M55 48Q52 18 90 16Q129 18 126 58L119 103Q90 121 61 103Z" fill={`url(#quizHair${variant})`} stroke="#7888A8" strokeOpacity=".7" strokeWidth="3"/>
          <ellipse cx="90" cy="72" rx="39" ry="43" fill={`url(#quizFace${variant})`} stroke="#FFE0B9" strokeOpacity=".75" strokeWidth="2"/>
          <path d="M51 67Q44 32 78 22Q110 9 132 45L123 59Q110 43 93 42Q70 40 51 67Z" fill={`url(#quizHair${variant})`} stroke="#7585A8" strokeOpacity=".55" strokeWidth="3"/>
          <path d="M58 42Q79 16 104 29" fill="none" stroke="#B9C9E8" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round"/>
          <path d="M69 72Q77 65 84 72M97 72Q104 65 112 72" fill="none" stroke="#4A2D35" strokeWidth="3.2" strokeLinecap="round"/>
          <ellipse cx="77" cy="78" rx="4.2" ry="5.2" fill="#18243B"/><ellipse cx="104" cy="78" rx="4.2" ry="5.2" fill="#18243B"/>
          <circle cx="78" cy="76" r="1.5" fill="#fff"/><circle cx="105" cy="76" r="1.5" fill="#fff"/>
          <ellipse cx="64" cy="88" rx="7" ry="3.5" fill="#F58E91" opacity=".42"/><ellipse cx="116" cy="88" rx="7" ry="3.5" fill="#F58E91" opacity=".42"/>
          <path d="M81 96Q90 104 100 96" fill="none" stroke="#A34C54" strokeWidth="2.8" strokeLinecap="round"/>
          <path d="M64 110L90 127 116 110" fill="none" stroke="#FFF2C5" strokeOpacity=".8" strokeWidth="3"/>
          <path d="M39 129L20 154M141 129L160 154" stroke={p.skin} strokeWidth="12" strokeLinecap="round"/>
          <path d="M17 154L29 163M163 154L151 163" stroke="#F5D2B1" strokeWidth="11" strokeLinecap="round"/>
          <circle cx="90" cy="14" r="5" fill="#FFD77B" stroke="#FFF0B0" strokeWidth="2"/>
          <path d="M83 12L90 3 97 12" fill="none" stroke="#FFD77B" strokeWidth="2.5"/>
        </svg>
      </motion.div>
      <span className="quiz-contestant-name">{name}</span>
    </div>
  );
};

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
  const [owlDiving, setOwlDiving] = React.useState(false);
  const [flashedOpt, setFlashedOpt] = React.useState<{ idx: number; correct: boolean | null } | null>(null);

  if (!current) return null;
  const questionText = lang === 'my' ? current.questionMy || current.question : current.questionEn || current.question;
  const opts: string[] = lang === 'my' ? current.optionsMy || current.options : current.optionsEn || current.options;
  const alreadyAnswered = Boolean(isPvp && typeof match.roundAnswers?.[currentUser.id] === 'number');
  const isFinished = match.status === 'finished';
  const score = match.scores?.[currentUser.id] ?? 0;

  const handleSelectOption = (oIdx: number) => {
    if (flashedOpt || isFinished || alreadyAnswered) return;
    if (typeof current.answerIndex !== 'number') {
      setFlashedOpt({ idx: oIdx, correct: null });
      window.setTimeout(() => { setFlashedOpt(null); onAnswer(oIdx); }, 450);
      return;
    }
    const isCorrect = oIdx === current.answerIndex;
    setFlashedOpt({ idx: oIdx, correct: isCorrect });
    if (isCorrect) {
      setCheeringKidId(currentUser.id);
      window.setTimeout(() => { setCheeringKidId(null); setFlashedOpt(null); onAnswer(oIdx); }, 650);
    } else {
      setOwlDiving(true);
      window.setTimeout(() => setBonkingKidId(currentUser.id), 220);
      window.setTimeout(() => {
        setOwlDiving(false); setBonkingKidId(null); setFlashedOpt(null); onAnswer(oIdx);
      }, 1050);
    }
  };

  return (
    <div className="quiz-arena">
      <div className="quiz-topline">
        <div className="quiz-brandmark"><span>✦</span><div><small>MYANRENA · KNOWLEDGE ARENA</small><strong>{lang === 'my' ? 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်း' : 'WISE OWL CHALLENGE'}</strong></div></div>
        <div className="quiz-round-chip"><span>{lang === 'my' ? 'အဆင့်' : 'QUESTION'}</span><b>{idx + 1}<i>/{riddles.length}</i></b></div>
      </div>

      <section className="quiz-forest-stage" aria-label={lang === 'my' ? 'ပညာရှိဇီးကွက် ဉာဏ်စမ်းကွင်း' : 'Wise Owl knowledge arena'}>
        <img className="quiz-forest-art" src={`${import.meta.env.BASE_URL}assets/wise-owl-forest-arena.svg`} alt="" aria-hidden="true" />
        <div className="quiz-forest-vignette" aria-hidden="true" />
        <div className="quiz-forest-stars" aria-hidden="true"><i>✦</i><i>✧</i><i>·</i><i>✦</i><i>·</i><i>✧</i></div>
        <div className="quiz-owl-halo" aria-hidden="true" />
        <motion.div
          animate={owlDiving ? { y: 74, x: 0, scale: 1.08, rotate: [0, -14, 14, 0] } : { y: 0, x: 0, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="quiz-owl-character"
        >
          <WiseOwl3D mood={cheeringKidId ? 'happy' : owlDiving ? 'thinking' : 'asking'} questionNumber={idx + 1} />
        </motion.div>
        <div className="quiz-player-row">
          {players.slice(0, 8).map((pl, sIdx) => (
            <div key={pl.id} className={`quiz-player-seat ${pl.id === currentUser.id ? 'is-you' : ''}`}>
              <QuizContestantAvatar
                name={pl.displayName}
                variant={sIdx}
                state={bonkingKidId === pl.id ? 'bonked' : cheeringKidId === pl.id ? 'dancing' : 'idle'}
              />
              {pl.id === currentUser.id && <span className="quiz-you-tag">{lang === 'my' ? 'သင်' : 'YOU'}</span>}
            </div>
          ))}
        </div>
        <div className="quiz-stage-caption"><span>✧</span>{lang === 'my' ? 'ပညာရှိ ဇီးကွက်၏ စိန်ခေါ်မှု' : 'THE WISE OWL’S CHALLENGE'}<span>✧</span></div>
      </section>

      <AnimatePresence mode="wait">
        <motion.section key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="quiz-question-panel">
          <div className="quiz-question-top">
            <span className="quiz-question-label"><span>✦</span>{lang === 'my' ? 'ဉာဏ်စမ်းမေးခွန်း' : 'BRAIN TEASER'}</span>
            <span className="quiz-score-pill">{score.toLocaleString()} <i>PTS</i></span>
          </div>
          <p>{questionText}</p>
          <div className="quiz-progress-track"><span style={{ width: `${riddles.length ? ((idx + 1) / riddles.length) * 100 : 0}%` }} /></div>
        </motion.section>
      </AnimatePresence>

      <section className="quiz-answer-section">
        <div className="quiz-answer-heading"><span>{lang === 'my' ? 'အဖြေမှန်ကို ရွေးချယ်ပါ' : 'CHOOSE YOUR ANSWER'}</span><small>{lang === 'my' ? 'တစ်ခုသာ ရွေးပါ' : 'SELECT ONE OPTION'}</small></div>
        {alreadyAnswered ? (
          <div className="quiz-waiting-card"><span className="quiz-waiting-pulse" />{lang === 'my' ? 'အခြားကစားသမားများ ဖြေဆိုသည်ကို စောင့်နေပါသည်...' : 'Waiting for other players...'}</div>
        ) : (
          <div className="quiz-answer-grid">
            {opts.map((opt, oIdx) => {
              const flash = flashedOpt?.idx === oIdx;
              const cls = flash ? flashedOpt.correct === true ? 'is-correct' : flashedOpt.correct === false ? 'is-wrong' : 'is-selected' : '';
              return <motion.button key={`${idx}_${oIdx}`} whileTap={{ scale: 0.975 }} type="button" disabled={isFinished || Boolean(flashedOpt)} onClick={() => handleSelectOption(oIdx)} className={`quiz-answer-card ${cls}`}>
                <span className="quiz-answer-index">{String(oIdx + 1).padStart(2, '0')}</span><span className="quiz-answer-text">{opt}</span><span className="quiz-answer-arrow">↗</span>
              </motion.button>;
            })}
          </div>
        )}
      </section>
      <div className="quiz-arena-footer"><span>✦</span>{lang === 'my' ? 'ဗဟုသုတက သင့်ရဲ့ အင်အားပါ' : 'KNOWLEDGE IS YOUR POWER'}<span>✦</span></div>
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
  const rawP2 = players[1] || { id: 'aegis_bot', displayName: 'မပုတု' };
  const p2 = isPvp ? rawP2 : { ...rawP2, displayName: lang === 'my' ? 'မပုတု' : 'Ma Pu Tu' };
  const isFinished = match.status === 'finished';
  const myPicked = Boolean(isPvp && match.rpsPicks?.[currentUser.id]);
  const [shaking, setShaking] = React.useState(false);

  const handleChoose = (choice: string) => {
    if (shaking || isFinished || myPicked) return;
    setShaking(true);
    window.setTimeout(() => {
      setShaking(false);
      onPick(choice);
    }, 450);
  };

  const iconOf = (choice?: string) =>
    choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : choice === 'scissors' ? '✌️' : '？';
  const labelOf = (choice: string) =>
    choice === 'rock' ? (lang === 'my' ? 'ကျောက်တုံး' : 'Rock')
      : choice === 'paper' ? (lang === 'my' ? 'စက္ကူ' : 'Paper')
      : (lang === 'my' ? 'ကတ်ကြေး' : 'Scissors');
  const p1Wins = match.rpsLastRound?.winnerId === p1.id;
  const p2Wins = match.rpsLastRound?.winnerId === p2.id;
  const round = match.round || 1;
  const bestOf = match.bestOf || 3;
  const p1Avatar = p1.avatarUrl || currentUser.avatarUrl || '';
  const p2Avatar = isPvp ? (p2.avatarUrl || '') : `${import.meta.env.BASE_URL}assets/ttt-girl-idle.png`;

  const PlayerCard = ({ player, avatar, side, winner, loser }: {
    player: any; avatar: string; side: 'blue' | 'pink'; winner: boolean; loser: boolean;
  }) => (
    <motion.div
      className={`rps-competitor rps-competitor-${side} ${winner ? 'is-winner' : ''} ${loser ? 'is-loser' : ''}`}
      animate={winner ? { y: [0, -7, 0] } : loser ? { x: [0, -3, 3, 0] } : { y: [0, -3, 0] }}
      transition={{ duration: winner ? .65 : 3, repeat: winner ? 1 : Infinity }}
    >
      <div className="rps-competitor-art">
        {avatar ? <img src={avatar} alt="" /> : <span>{(player.displayName || 'P').slice(0,1).toUpperCase()}</span>}
        {winner && <i>♛</i>}
      </div>
      <div className="rps-competitor-meta">
        <b>{player.displayName || (side === 'pink' ? 'မပုတု' : 'Player')}</b>
        <small>{side === 'pink' && !isPvp ? 'BOT • MEDIUM' : side === 'blue' ? 'CHALLENGER' : 'PLAYER 02'}</small>
        {winner && <em>{lang === 'my' ? 'အနိုင်ရသူ' : 'ROUND WINNER'}</em>}
      </div>
    </motion.div>
  );

  return (
    <div className="rps-arena w-full" aria-label="Rock Paper Scissors arena">
      <div className="rps-roundbar">
        <span className="rps-round-kicker">MATCH PROGRESS</span>
        <strong>{lang === 'my' ? `အချီ ${round}` : `ROUND ${round}`} <i>·</i> BEST OF {bestOf}</strong>
        <div className="rps-round-dots">
          {Array.from({ length: bestOf }, (_, index) => (
            <span key={index} className={index < (match.round || 1) - 1 ? 'complete' : index === (match.round || 1) - 1 ? 'current' : ''} />
          ))}
        </div>
      </div>

      <section className="rps-battle-stage">
        <div className="rps-stage-grid" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <div className="rps-competitors">
          <PlayerCard player={p1} avatar={p1Avatar} side="blue" winner={Boolean(p1Wins)} loser={Boolean(p2Wins)} />
          <div className={`rps-versus ${shaking ? 'is-shaking' : ''}`}>
            <span>VS</span>
            <i />
          </div>
          <PlayerCard player={p2} avatar={p2Avatar} side="pink" winner={Boolean(p2Wins)} loser={Boolean(p1Wins)} />
        </div>
        <div className="rps-result-panel" aria-live="polite">
          {shaking ? (
            <motion.div animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }} transition={{ duration: .45 }}>
              <span className="rps-result-icon">✊</span><b>READY…</b><span className="rps-result-icon">✊</span>
            </motion.div>
          ) : match.rpsLastRound ? (
            <>
              <span className="rps-result-icon">{iconOf(match.rpsLastRound.p1Choice)}</span>
              <div>
                <b>{match.rpsLastRound.winnerId === 'draw' || match.rpsLastRound.isDraw
                  ? (lang === 'my' ? 'သရေကျသည်' : 'DRAW ROUND')
                  : (lang === 'my' ? 'အချီရလဒ်' : 'ROUND RESULT')}</b>
                <small>{labelOf(match.rpsLastRound.p1Choice)} <i>VS</i> {labelOf(match.rpsLastRound.p2Choice)}</small>
              </div>
              <span className="rps-result-icon">{iconOf(match.rpsLastRound.p2Choice)}</span>
            </>
          ) : (
            <div className="rps-prompt">
              <span>✦</span>
              <b>{myPicked ? (lang === 'my' ? 'ပြိုင်ဘက်ကို စောင့်နေသည်…' : 'WAITING FOR OPPONENT…') : (lang === 'my' ? 'သင့်လှည့် — တစ်ခုရွေးပါ' : 'YOUR TURN — MAKE YOUR MOVE')}</b>
              <span>✦</span>
            </div>
          )}
        </div>
      </section>

      <section className="rps-choice-section">
        <div className="rps-choice-heading">
          <span>{lang === 'my' ? 'သင်၏ လက်နက်ကို ရွေးချယ်ပါ' : 'CHOOSE YOUR WEAPON'}</span>
          <small>{myPicked ? (lang === 'my' ? 'ရွေးချယ်ပြီးပါပြီ' : 'CHOICE LOCKED') : 'SELECT ONE'}</small>
        </div>
        <div className="rps-choice-grid">
          {[
            { id: 'rock', icon: '✊', label: lang === 'my' ? 'ကျောက်တုံး' : 'ROCK', sub: lang === 'my' ? 'ခိုင်မာသောအား' : 'POWER' },
            { id: 'paper', icon: '✋', label: lang === 'my' ? 'စက္ကူ' : 'PAPER', sub: lang === 'my' ? 'ကာကွယ်မှု' : 'DEFENSE' },
            { id: 'scissors', icon: '✌️', label: lang === 'my' ? 'ကတ်ကြေး' : 'SCISSORS', sub: lang === 'my' ? 'တိကျသောဖြတ်ချက်' : 'PRECISION' },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileHover={!isFinished && !myPicked ? { y: -5, scale: 1.025 } : undefined}
              whileTap={!isFinished && !myPicked ? { scale: .96 } : undefined}
              type="button"
              disabled={isFinished || myPicked || shaking}
              onClick={() => handleChoose(item.id)}
              className={`rps-choice-card rps-choice-${item.id}`}
              aria-label={item.label}
            >
              <span className="rps-choice-number">{item.id === 'rock' ? '01' : item.id === 'paper' ? '02' : '03'}</span>
              <span className="rps-choice-symbol">{item.icon}</span>
              <b>{item.label}</b>
              <small>{item.sub}</small>
              <i className="rps-choice-glint" />
            </motion.button>
          ))}
        </div>
      </section>
      <div className="rps-arena-footnote">
        <span>✦</span>
        {lang === 'my' ? 'အနိုင်ရရန် အချီ ၂ ချီ အရင်ရယူပါ' : 'WIN 2 ROUNDS TO CLAIM THE MATCH'}
        <span>✦</span>
      </div>
    </div>
  );
};
