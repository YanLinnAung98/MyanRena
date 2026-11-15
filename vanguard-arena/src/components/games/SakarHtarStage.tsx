import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Clock, Crown, Sparkles, Trophy, XCircle } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations.ts';
import type { Language, ProfileFrame, SakarHtarState } from '../../types.ts';
import { soundEngine } from '../../utils/sound.ts';
import { AvatarWithFrame } from '../AvatarWithFrame.tsx';

interface SakarHtarStageProps {
  state: SakarHtarState;
  myUserId: string;
  lang: Language;
  frames: ProfileFrame[];
  disabled?: boolean;
  onMove: (payload: { optionIndex: number }) => void;
}

const SEAT_PALETTES = [
  { tunic: '#F59E0B', trim: '#FEF3C7', mat: '#92400E', aura: '#FBBF24' },
  { tunic: '#38BDF8', trim: '#E0F2FE', mat: '#1E3A8A', aura: '#38BDF8' },
  { tunic: '#34D399', trim: '#D1FAE5', mat: '#065F46', aura: '#34D399' },
  { tunic: '#FB7185', trim: '#FFE4E6', mat: '#881337', aura: '#FB7185' },
  { tunic: '#A78BFA', trim: '#EDE9FE', mat: '#4C1D95', aura: '#A78BFA' },
  { tunic: '#FB923C', trim: '#FFEDD5', mat: '#7C2D12', aura: '#FB923C' },
  { tunic: '#2DD4BF', trim: '#CCFBF1', mat: '#134E4A', aura: '#2DD4BF' },
  { tunic: '#F472B6', trim: '#FCE7F3', mat: '#831843', aura: '#F472B6' },
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

const FIREFLIES = Array.from({ length: 14 }, (_, idx) => ({
  id: idx,
  left: `${6 + ((idx * 17) % 88)}%`,
  top: `${10 + ((idx * 23) % 68)}%`,
  duration: 3.6 + (idx % 5) * 0.85,
  delay: (idx % 4) * 0.7,
  size: idx % 3 === 0 ? 5 : 3.5,
}));

const CONFETTI_PIECES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${5 + ((i * 19) % 90)}%`,
  delay: (i % 6) * 0.08,
  color: ['#F59E0B', '#38BDF8', '#34D399', '#FB7185', '#FDE68A'][i % 5],
}));

export const SakarHtarStage: React.FC<SakarHtarStageProps> = ({
  state,
  myUserId,
  lang,
  frames,
  disabled,
  onMove,
}) => {
  const t = TRANSLATIONS[lang];
  const [now, setNow] = React.useState(Date.now());
  const [blinking, setBlinking] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => {
      setBlinking(true);
      const reset = setTimeout(() => setBlinking(false), 180);
      return () => clearTimeout(reset);
    }, 3600);
    return () => clearInterval(id);
  }, []);

  const currentQuestion = state.questions[state.questionIndex];
  const me = state.players.find((p) => p.id === myUserId) || null;
  const totalSeats = Math.max(state.seatCapacity || 6, state.players.length);

  const deadline = state.phase === 'reveal' && state.revealDeadline ? state.revealDeadline : state.questionDeadline;
  const totalWindow = state.phase === 'reveal' ? 3200 : 15000;
  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progressPct = Math.min(100, Math.max(0, (remainingMs / totalWindow) * 100));

  const sortedStandings = React.useMemo(
    () =>
      [...state.players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.correctCount - a.correctCount;
      }),
    [state.players]
  );

  const handleChoose = (optionIndex: number) => {
    if (disabled || state.phase !== 'question' || !me || me.answeredCurrent) return;
    soundEngine.playMove();
    onMove({ optionIndex });
  };

  // Semicircular seat arrangement facing the Owl
  const seatSlots = Array.from({ length: totalSeats }, (_, idx) => {
    const player = state.players.find((p) => p.seatIndex === idx) || state.players[idx] || null;
    const ratio = totalSeats === 1 ? 0.5 : idx / (totalSeats - 1);
    const arcDrop = Math.sin(ratio * Math.PI) * 26;
    return { idx, player, arcDrop };
  });

  if (state.phase === 'finished') {
    const podium = [sortedStandings[1], sortedStandings[0], sortedStandings[2]];
    const podiumHeights = ['h-24', 'h-32', 'h-20'];
    const podiumLabels = ['2nd', '1st', '3rd'];
    const podiumBorders = ['border-slate-300/40', 'border-amber-400/70', 'border-amber-700/50'];

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 relative select-none">
        {/* Winner Podium Courtyard Card */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-400/35 bg-gradient-to-b from-[#17122B] via-[#1B1630] to-[#111524] p-6 sm:p-8 shadow-2xl">
          {/* Confetti Particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI_PIECES.map((c) => (
              <motion.span
                key={c.id}
                initial={{ y: -20, opacity: 0.9, rotate: 0 }}
                animate={{ y: 260, opacity: [0.95, 0.9, 0], rotate: 320 }}
                transition={{ duration: 2.8, delay: c.delay, repeat: Infinity, repeatDelay: 1.5 }}
                style={{ left: c.left, backgroundColor: c.color }}
                className="absolute top-0 w-2 h-3.5 rounded-sm"
              />
            ))}
          </div>

          <div className="relative z-10 text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>{t.sakar.owlPresenterTitle} · 10 / 10</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.sakar.podiumTitle}</h3>
          </div>

          {/* 3-Step Winner Podium */}
          {sortedStandings.length > 1 ? (
            <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-5 items-end max-w-2xl mx-auto pt-4">
              {podium.map((player, slotIdx) => {
                if (!player) {
                  return <div key={slotIdx} className="opacity-20 h-20 rounded-2xl bg-white/5" />;
                }
                const isFirst = slotIdx === 1;
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: slotIdx * 0.12 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="relative">
                      {isFirst && <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1 drop-shadow" />}
                      <AvatarWithFrame
                        avatarUrl={player.avatarUrl}
                        frameId={player.frameId}
                        frames={frames}
                        displayName={player.displayName}
                        size={isFirst ? 'lg' : 'md'}
                      />
                    </div>
                    <div className="text-center min-w-0 w-full">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {player.displayName} {player.id === myUserId ? t.match.you : ''}
                      </div>
                      <div className="text-xs font-mono text-amber-300 tabular-nums">
                        {player.score} pts · {player.correctCount}/10
                      </div>
                    </div>
                    <div
                      className={`w-full ${podiumHeights[slotIdx]} rounded-t-2xl bg-[#0F1322]/90 border-t-2 border-x ${podiumBorders[slotIdx]} flex flex-col items-center justify-center`}
                    >
                      <span className={`text-lg font-display font-bold ${isFirst ? 'text-amber-300' : 'text-slate-300'}`}>
                        {podiumLabels[slotIdx]}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            sortedStandings[0] && (
              <div className="relative z-10 flex flex-col items-center gap-3 py-2">
                <Trophy className="w-10 h-10 text-amber-400" />
                <div className="text-xl font-display font-bold text-white">
                  {sortedStandings[0].displayName} — {sortedStandings[0].score} pts
                </div>
                <div className="text-sm text-emerald-300 tabular-nums">
                  {sortedStandings[0].correctCount} / {state.totalQuestions} {t.sakar.correctBadge}
                </div>
              </div>
            )
          )}

          {/* Full Standings Strip for 4+ players */}
          {sortedStandings.length > 3 && (
            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 grid sm:grid-cols-2 gap-2">
              {sortedStandings.slice(3).map((p, idx) => (
                <div
                  key={p.id}
                  className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-200 font-medium truncate">
                    #{idx + 4} {p.displayName} {p.id === myUserId ? t.match.you : ''}
                  </span>
                  <span className="font-mono text-amber-300 tabular-nums">
                    {p.score} pts ({p.correctCount}/10)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 10-Question Answer Review Table */}
        <div className="rounded-3xl bg-[#121826] border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-display font-bold text-white">{t.sakar.reviewTableTitle}</h4>
            {me && (
              <span className="text-xs font-mono text-amber-300 tabular-nums">
                {me.correctCount} / {state.totalQuestions} · {me.score} pts
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-3 px-2.5 w-10">#</th>
                  <th className="py-3 px-2.5">{t.sakar.colQuestion}</th>
                  <th className="py-3 px-2.5">{t.sakar.colYourPick}</th>
                  <th className="py-3 px-2.5">{t.sakar.colCorrectAnswer}</th>
                  <th className="py-3 px-2.5 text-right">{t.sakar.colPoints}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {state.questions.map((q, qIdx) => {
                  const ans = me?.answers.find((a) => a.questionIndex === qIdx);
                  const yourPickText =
                    ans && ans.selectedIndex !== null && ans.selectedIndex !== undefined
                      ? q.options[ans.selectedIndex]
                      : t.sakar.noAnswerPicked;
                  const officialText =
                    q.correctIndex !== undefined ? q.options[q.correctIndex] : '—';
                  const isCorrect = Boolean(ans?.isCorrect);

                  return (
                    <tr key={q.id} className="hover:bg-white/[0.02] align-top">
                      <td className="py-3.5 px-2.5 font-mono text-slate-400 tabular-nums">
                        {qIdx + 1}
                      </td>
                      <td className="py-3.5 px-2.5 min-w-[200px]">
                        <div className="font-medium text-white lang-my leading-relaxed">
                          {q.questionMy}
                        </div>
                        {q.explanationMy && (
                          <div className="text-xs text-slate-400 mt-1 lang-my leading-relaxed">
                            {lang === 'my' ? q.explanationMy : q.explanationEn || q.explanationMy}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-2.5 min-w-[140px]">
                        <div
                          className={`inline-flex items-start gap-1.5 font-medium lang-my leading-relaxed ${
                            isCorrect ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                          )}
                          <span>{yourPickText}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 min-w-[140px] text-amber-200 font-semibold lang-my leading-relaxed">
                        {officialText}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono font-bold tabular-nums text-amber-300">
                        +{ans?.points || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 select-none">
      {/* Twilight Myanmar Courtyard Stage */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-400/25 shadow-2xl bg-gradient-to-b from-[#0E1124] via-[#1B1531] to-[#1A1320]">
        {/* Architectural Courtyard SVG Backdrop + Swaying Paper Lanterns */}
        <svg
          viewBox="0 0 1000 420"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="skyTwilight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0C1023" />
              <stop offset="55%" stopColor="#1E1736" />
              <stop offset="100%" stopColor="#281A24" />
            </linearGradient>
            <radialGradient id="moonGlow" cx="50%" cy="30%" r="45%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="420" fill="url(#skyTwilight)" />
          <circle cx="500" cy="120" r="240" fill="url(#moonGlow)" />

          {/* Distant Pyatthat Spire Silhouettes */}
          <path
            d="M40 320 L80 285 L120 320 Z M55 290 L80 265 L105 290 Z M72 268 L80 245 L88 268 Z"
            fill="#110E22"
            opacity="0.7"
          />
          <path
            d="M870 320 L915 280 L960 320 Z M888 286 L915 258 L942 286 Z M906 260 L915 234 L924 260 Z"
            fill="#110E22"
            opacity="0.7"
          />

          {/* Carved Timber Pavilion Eaves */}
          <rect x="0" y="0" width="1000" height="18" fill="#2A1812" />
          <path d="M0 18 Q250 42 500 22 Q750 42 1000 18 L1000 28 Q750 52 500 32 Q250 52 0 28 Z" fill="#3B2117" />
          <rect x="28" y="18" width="22" height="402" fill="#261610" opacity="0.8" />
          <rect x="950" y="18" width="22" height="402" fill="#261610" opacity="0.8" />

          {/* Courtyard Stone Floor */}
          <ellipse cx="500" cy="390" rx="460" ry="85" fill="#17121C" opacity="0.9" />
          <ellipse cx="500" cy="390" rx="410" ry="64" fill="#231927" stroke="#F59E0B" strokeOpacity="0.16" strokeWidth="1.5" />

          {/* Left & Right Glowing Paper Lanterns */}
          <g>
            <circle cx="145" cy="96" r="56" fill="url(#lanternGlow)" />
            <line x1="145" y1="22" x2="145" y2="68" stroke="#D97706" strokeWidth="2" />
            <ellipse cx="145" cy="96" rx="22" ry="28" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
            <line x1="130" y1="84" x2="160" y2="84" stroke="#B45309" strokeWidth="1.5" />
            <line x1="126" y1="96" x2="164" y2="96" stroke="#B45309" strokeWidth="1.5" />
            <line x1="130" y1="108" x2="160" y2="108" stroke="#B45309" strokeWidth="1.5" />
            <line x1="145" y1="124" x2="145" y2="142" stroke="#FDE68A" strokeWidth="2" />
          </g>

          <g>
            <circle cx="855" cy="96" r="56" fill="url(#lanternGlow)" />
            <line x1="855" y1="22" x2="855" y2="68" stroke="#D97706" strokeWidth="2" />
            <ellipse cx="855" cy="96" rx="22" ry="28" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
            <line x1="840" y1="84" x2="870" y2="84" stroke="#B45309" strokeWidth="1.5" />
            <line x1="836" y1="96" x2="874" y2="96" stroke="#B45309" strokeWidth="1.5" />
            <line x1="840" y1="108" x2="870" y2="108" stroke="#B45309" strokeWidth="1.5" />
            <line x1="855" y1="124" x2="855" y2="142" stroke="#FDE68A" strokeWidth="2" />
          </g>
        </svg>

        {/* Drifting Golden Fireflies */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {FIREFLIES.map((f) => (
            <motion.span
              key={f.id}
              animate={{
                y: [0, -14, 4, -10, 0],
                x: [0, 8, -6, 4, 0],
                opacity: [0.25, 0.9, 0.45, 0.95, 0.25],
              }}
              transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
              style={{ left: f.left, top: f.top, width: f.size, height: f.size }}
              className="absolute rounded-full bg-amber-300 shadow-[0_0_10px_#FBBF24]"
            />
          ))}
        </div>

        <div className="relative z-10 p-4 sm:p-6 space-y-5">
          {/* Top-Center Cute Wise Owl Presenter (ချစ်စရာ ဇီးကွက်) */}
          <div className="flex flex-col items-center">
            <motion.div
              key={state.questionIndex}
              animate={{ rotate: [0, -3, 3, 0], y: [0, -3, 0] }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="relative"
            >
              <svg viewBox="0 0 180 140" className="w-32 h-24 sm:w-40 sm:h-30 drop-shadow-[0_10px_22px_rgba(245,158,11,0.28)]">
                {/* Perch Branch */}
                <path d="M22 124 Q90 116 158 124" stroke="#78350F" strokeWidth="9" strokeLinecap="round" fill="none" />
                {/* Owl Wings (subtle flap when revealing) */}
                <motion.ellipse
                  cx="48"
                  cy="82"
                  rx="20"
                  ry="32"
                  fill="#92400E"
                  animate={state.phase === 'reveal' ? { rotate: [-12, 6, -12] } : { rotate: [0, -3, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ originX: '64px', originY: '68px' }}
                />
                <motion.ellipse
                  cx="132"
                  cy="82"
                  rx="20"
                  ry="32"
                  fill="#92400E"
                  animate={state.phase === 'reveal' ? { rotate: [12, -6, 12] } : { rotate: [0, 3, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ originX: '116px', originY: '68px' }}
                />
                {/* Owl Body */}
                <ellipse cx="90" cy="82" rx="44" ry="42" fill="#B45309" />
                <ellipse cx="90" cy="88" rx="30" ry="30" fill="#FEF3C7" />
                {/* Feather Belly Chevrons */}
                <path d="M76 80 Q83 86 90 80 Q97 86 104 80" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M73 92 Q81 98 90 92 Q99 98 107 92" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M78 104 Q84 109 90 104 Q96 109 102 104" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                {/* Owl Ear Tufts */}
                <path d="M52 44 L40 22 L68 35 Z" fill="#92400E" />
                <path d="M128 44 L140 22 L112 35 Z" fill="#92400E" />

                {/* Owl Head & Facial Disc */}
                <circle cx="90" cy="52" r="34" fill="#D97706" />
                <circle cx="74" cy="52" r="16" fill="#FFFBEB" />
                <circle cx="106" cy="52" r="16" fill="#FFFBEB" />

                {/* Cute Blinking Eyes */}
                {blinking ? (
                  <>
                    <path d="M64 52 Q74 58 84 52" stroke="#1E293B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M96 52 Q106 58 116 52" stroke="#1E293B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="74" cy="52" r="8.5" fill="#0F172A" />
                    <circle cx="106" cy="52" r="8.5" fill="#0F172A" />
                    <circle cx="77" cy="49" r="3" fill="#FFFFFF" />
                    <circle cx="109" cy="49" r="3" fill="#FFFFFF" />
                  </>
                )}

                {/* Wise Round Gold Spectacles */}
                <circle cx="74" cy="52" r="14.5" fill="none" stroke="#FBBF24" strokeWidth="3" />
                <circle cx="106" cy="52" r="14.5" fill="none" stroke="#FBBF24" strokeWidth="3" />
                <line x1="88.5" y1="52" x2="91.5" y2="52" stroke="#FBBF24" strokeWidth="3" />

                {/* Golden Beak & Scholarly Cap Accent */}
                <polygon points="84,58 96,58 90,69" fill="#F59E0B" stroke="#78350F" strokeWidth="1" />
                <polygon points="90,14 114,22 90,29 66,22" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" />
                <line x1="112" y1="22" x2="116" y2="36" stroke="#FBBF24" strokeWidth="2" />

                {/* Talons */}
                <path d="M74 119 L70 126 M78 119 L78 126 M82 119 L86 126" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                <path d="M98 119 L94 126 M102 119 L102 126 M106 119 L110 126" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </motion.div>

            {/* Ornate Parabaik Scroll Riddle Card */}
            <div className="w-full max-w-3xl -mt-2 rounded-2xl bg-[#111524]/95 border-2 border-amber-400/50 p-5 sm:p-6 shadow-[0_14px_40px_rgba(0,0,0,0.55)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>{t.sakar.owlPresenterTitle}</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono tabular-nums text-white">
                    {t.sakar.questionProgress} {state.questionIndex + 1} / {state.totalQuestions}
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 font-mono font-bold tabular-nums px-3 py-1 rounded-lg border ${
                    state.phase === 'reveal'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : remainingSec <= 5
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{remainingSec}s</span>
                </div>
              </div>

              {/* Countdown Bar */}
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    state.phase === 'reveal'
                      ? 'bg-emerald-400'
                      : remainingSec <= 5
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <AnimatePresence mode="wait">
                {currentQuestion && (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-center space-y-2 py-1"
                  >
                    <h3 className="text-lg sm:text-2xl font-display font-bold text-amber-50 lang-my leading-relaxed">
                      {currentQuestion.questionMy}
                    </h3>
                    {currentQuestion.hintEn && (
                      <p className="text-xs sm:text-sm text-slate-300/90 italic">
                        “{currentQuestion.hintEn}”
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Semicircular Row of Back-View Seated Children (ထိုင်နေတဲ့ ကလေးငယ် နောက်ကျောပုံ) */}
          <div className="pt-2 pb-1">
            <div
              className="grid gap-2 sm:gap-3 items-end justify-items-center"
              style={{
                gridTemplateColumns: `repeat(${Math.min(totalSeats, 8)}, minmax(0, 1fr))`,
              }}
            >
              {seatSlots.map(({ idx, player, arcDrop }) => {
                const palette = SEAT_PALETTES[idx % SEAT_PALETTES.length];
                const isMe = player?.id === myUserId;
                const hasLocked = Boolean(player?.answeredCurrent);
                const revealCorrect = state.phase === 'reveal' && player?.lastAnswerCorrect === true;
                const revealWrong = state.phase === 'reveal' && player?.lastAnswerCorrect === false;

                return (
                  <div
                    key={idx}
                    style={{ transform: `translateY(${Math.round(arcDrop)}px)` }}
                    className="flex flex-col items-center w-full max-w-[108px] relative"
                  >
                    {/* Reveal Result Mini Indicator above child */}
                    {state.phase === 'reveal' && player && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums ${
                          revealCorrect
                            ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                            : 'bg-rose-500/25 text-rose-200 border border-rose-400/50'
                        }`}
                      >
                        {revealCorrect ? `+${player.lastPointsEarned || 0}` : '0'}
                      </motion.div>
                    )}

                    {/* Back-View Seated Child SVG */}
                    <svg viewBox="0 0 96 86" className="w-16 h-14 sm:w-20 sm:h-18 overflow-visible">
                      {/* Woven Bamboo Mat */}
                      <ellipse cx="48" cy="76" rx="34" ry="8" fill={player ? palette.mat : '#1E293B'} opacity={player ? 0.9 : 0.35} />
                      <ellipse cx="48" cy="75" rx="30" ry="5.5" fill="none" stroke="#FDE68A" strokeOpacity={player ? 0.35 : 0.08} strokeWidth="1" />

                      {player ? (
                        <motion.g
                          animate={
                            hasLocked
                              ? { y: [0, -3, 0] }
                              : { y: [0, -1.5, 0] }
                          }
                          transition={{
                            duration: hasLocked ? 1.4 : 2.6,
                            repeat: Infinity,
                            delay: idx * 0.22,
                          }}
                        >
                          {/* Glowing Aura Halo when player locked an answer */}
                          {hasLocked && (
                            <motion.circle
                              cx="48"
                              cy="42"
                              r="32"
                              fill="none"
                              stroke={
                                revealCorrect
                                  ? '#34D399'
                                  : revealWrong
                                  ? '#FB7185'
                                  : palette.aura
                              }
                              strokeWidth="2.5"
                              initial={{ scale: 0.85, opacity: 0.2 }}
                              animate={{ scale: [0.95, 1.07, 0.95], opacity: [0.45, 0.9, 0.45] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}

                          {/* Cross-legged Lower Longyi Silhouette */}
                          <path d="M22 72 Q48 61 74 72 Q70 78 48 78 Q26 78 22 72 Z" fill="#1E293B" />

                          {/* Raised Hand Animation when Answered */}
                          {hasLocked && (
                            <motion.g
                              initial={{ rotate: 35, opacity: 0 }}
                              animate={{ rotate: [0, -8, 0], opacity: 1 }}
                              transition={{ duration: 0.4 }}
                              style={{ originX: '64px', originY: '48px' }}
                            >
                              <path d="M62 46 L72 18" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" />
                              <circle cx="73" cy="15" r="4.5" fill="#FDE68A" />
                            </motion.g>
                          )}

                          {/* Child Torso Back-View */}
                          <path
                            d="M29 68 L33 42 Q48 36 63 42 L67 68 Q48 72 29 68 Z"
                            fill={palette.tunic}
                            stroke={isMe ? '#FFFFFF' : palette.trim}
                            strokeWidth={isMe ? 2 : 1.2}
                          />
                          {/* Traditional Collar Line */}
                          <path d="M40 41 Q48 46 56 41" fill="none" stroke={palette.trim} strokeWidth="2" />

                          {/* Child Head Back-View (Dark Hair + Cute Top-Knot / Ribbon) */}
                          <circle cx="48" cy="28" r="14" fill="#1F1614" />
                          <circle cx="48" cy="13" r="4.5" fill="#2A1D1A" />
                          <path d="M43 16 Q48 19 53 16" stroke={palette.trim} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        </motion.g>
                      ) : (
                        <text x="48" y="54" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                          {idx + 1}
                        </text>
                      )}
                    </svg>

                    {/* Player Nameplate + Score */}
                    {player ? (
                      <div
                        className={`mt-1 w-full px-2 py-1.5 rounded-xl border text-center ${
                          isMe
                            ? 'bg-amber-500/20 border-amber-400/70'
                            : 'bg-[#0F1322]/90 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <AvatarWithFrame
                            avatarUrl={player.avatarUrl}
                            frameId={player.frameId}
                            frames={frames}
                            displayName={player.displayName}
                            size="sm"
                          />
                        </div>
                        <div className="text-[11px] font-semibold text-white truncate mt-1">
                          {player.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300 tabular-nums">
                          {player.score} pts
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 w-full px-1.5 py-2 rounded-xl border border-dashed border-white/10 text-center text-[10px] text-slate-500">
                        {t.sakar.waitingSeat}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Tactile Multiple-Choice Cards (A / B / C / D) */}
      {currentQuestion && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const isPicked = me?.selectedOptionCurrent === idx;
              const isOfficial = state.phase === 'reveal' && currentQuestion.correctIndex === idx;
              const isWrongPicked =
                state.phase === 'reveal' && isPicked && currentQuestion.correctIndex !== idx;
              const lockedOut = Boolean(disabled || state.phase !== 'question' || !me || me.answeredCurrent);

              return (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={!lockedOut ? { scale: 0.985 } : undefined}
                  disabled={lockedOut}
                  onClick={() => handleChoose(idx)}
                  className={`min-h-[60px] p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                    isOfficial
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
                      : isWrongPicked
                      ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                      : isPicked
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/10'
                      : lockedOut
                      ? 'bg-[#121826]/70 border-white/10 text-slate-400 cursor-default'
                      : 'bg-[#121826] border-white/15 hover:border-amber-400/70 hover:bg-[#192236] text-white cursor-pointer'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl font-mono font-bold text-sm flex items-center justify-center shrink-0 border ${
                      isOfficial
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                        : isWrongPicked
                        ? 'bg-rose-500 text-white border-rose-300'
                        : isPicked
                        ? 'bg-amber-400 text-slate-950 border-amber-200'
                        : 'bg-[#0A0D14] text-amber-300 border-white/15'
                    }`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="text-sm sm:text-base font-semibold lang-my leading-relaxed flex-1">
                    {opt}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Lock-In Status / Reveal Explanation Bar */}
          {state.phase === 'question' && me?.answeredCurrent && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-center text-xs sm:text-sm font-medium text-amber-200">
              {t.sakar.answerLocked}
            </div>
          )}

          {state.phase === 'reveal' && currentQuestion.correctIndex !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  {t.sakar.officialAnswerLabel}:{' '}
                  <span className="text-white lang-my">
                    {currentQuestion.options[currentQuestion.correctIndex]}
                  </span>
                </div>
                {(currentQuestion.explanationMy || currentQuestion.explanationEn) && (
                  <p className="text-xs text-slate-300 mt-1 lang-my leading-relaxed">
                    {lang === 'my'
                      ? currentQuestion.explanationMy || currentQuestion.explanationEn
                      : currentQuestion.explanationEn || currentQuestion.explanationMy}
                  </p>
                )}
              </div>
              {me && (
                <div
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg shrink-0 ${
                    me.lastAnswerCorrect
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {me.lastAnswerCorrect ? `${t.sakar.correctBadge} +${me.lastPointsEarned || 0}` : t.sakar.wrongBadge}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
