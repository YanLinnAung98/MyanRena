import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Flag, MessageSquare, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface MatchArenaProps {
  lang: Language;
  token: string;
  match: any;
  currentUser: UserProfile;
  frames: any[];
  featureLocks: Record<string, boolean>;
  chatMessages: any[];
  onMove: (move: any) => void;
  onForfeit: () => void;
  onSendChat: (text: string) => void;
  onLeaveFinished: () => void;
  onNotify: (level: string, message: string) => void;
}

// 3D Animated Wise Owl (ပညာရှိ ဇီးကွက်) Component for Sakar-Htar
const WiseOwl3D: React.FC<{ mood: 'asking' | 'happy' | 'thinking' }> = ({ mood }) => {
  return (
    <motion.div
      animate={{
        y: [0, -6, 0],
        rotateY: mood === 'happy' ? [0, 12, -12, 0] : [0, 4, -4, 0],
      }}
      transition={{ duration: mood === 'happy' ? 1.2 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ perspective: 900 }}
      className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto select-none shrink-0"
    >
      {/* Golden Ambient Aura */}
      <div className="absolute inset-1 rounded-full bg-amber-500/20 blur-xl animate-pulse" />

      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)]">
        <defs>
          <radialGradient id="owlBody3d" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="55%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#1c0a00" />
          </radialGradient>
          <radialGradient id="owlBelly3d" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="65%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
          <linearGradient id="owlGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>

        {/* Left & Right 3D Flapping Wings */}
        <motion.path
          d="M44 95 C15 110, 18 155, 50 165 C55 140, 52 115, 44 95 Z"
          fill="url(#owlBody3d)"
          stroke="#f59e0b"
          strokeWidth="2"
          animate={{ rotate: mood === 'happy' ? [-18, 12, -18] : [-5, 4, -5] }}
          transition={{ duration: mood === 'happy' ? 0.5 : 2.4, repeat: Infinity }}
          style={{ transformOrigin: '48px 102px' }}
        />
        <motion.path
          d="M156 95 C185 110, 182 155, 150 165 C145 140, 148 115, 156 95 Z"
          fill="url(#owlBody3d)"
          stroke="#f59e0b"
          strokeWidth="2"
          animate={{ rotate: mood === 'happy' ? [18, -12, 18] : [5, -4, 5] }}
          transition={{ duration: mood === 'happy' ? 0.5 : 2.4, repeat: Infinity }}
          style={{ transformOrigin: '152px 102px' }}
        />

        {/* Main 3D Torso */}
        <ellipse cx="100" cy="122" rx="54" ry="60" fill="url(#owlBody3d)" stroke="#d97706" strokeWidth="2.5" />
        <ellipse cx="100" cy="132" rx="36" ry="42" fill="url(#owlBelly3d)" />

        {/* Wise Owl Ear Tufts & Head */}
        <polygon points="54,42 74,56 62,74" fill="url(#owlBody3d)" stroke="#f59e0b" strokeWidth="2" />
        <polygon points="146,42 126,56 138,74" fill="url(#owlBody3d)" stroke="#f59e0b" strokeWidth="2" />
        <circle cx="100" cy="76" r="44" fill="url(#owlBody3d)" stroke="#f59e0b" strokeWidth="2.5" />

        {/* Scholarly Golden Crown / Mortarboard */}
        <polygon points="100,14 146,30 100,44 54,30" fill="url(#owlGold)" stroke="#fef08a" strokeWidth="1.5" />
        <rect x="78" y="34" width="44" height="10" rx="4" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
        <line x1="142" y1="31" x2="152" y2="54" stroke="#fde047" strokeWidth="2.5" />
        <circle cx="152" cy="56" r="3.5" fill="#fde047" />

        {/* Glowing Wise Eyes */}
        <circle cx="80" cy="76" r="19" fill="#090d16" stroke="url(#owlGold)" strokeWidth="3.5" />
        <circle cx="120" cy="76" r="19" fill="#090d16" stroke="url(#owlGold)" strokeWidth="3.5" />
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
          style={{ transformOrigin: '100px 76px' }}
        >
          <circle cx="80" cy="76" r="10" fill="#fbbf24" />
          <circle cx="120" cy="76" r="10" fill="#fbbf24" />
          <circle cx="80" cy="76" r="5" fill="#090d16" />
          <circle cx="120" cy="76" r="5" fill="#090d16" />
          <circle cx="77" cy="73" r="2.5" fill="#ffffff" />
          <circle cx="117" cy="73" r="2.5" fill="#ffffff" />
        </motion.g>

        {/* Golden Beak */}
        <polygon points="92,88 108,88 100,104" fill="url(#owlGold)" stroke="#fef08a" strokeWidth="1" />

        {/* Golden Talons */}
        <ellipse cx="82" cy="182" rx="12" ry="5" fill="url(#owlGold)" />
        <ellipse cx="118" cy="182" rx="12" ry="5" fill="url(#owlGold)" />
      </svg>
    </motion.div>
  );
};

export const MatchArena: React.FC<MatchArenaProps> = ({
  lang,
  match,
  currentUser,
  frames,
  chatMessages,
  onMove,
  onForfeit,
  onSendChat,
  onLeaveFinished,
}) => {
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatText, setChatText] = React.useState('');
  const [owlMood, setOwlMood] = React.useState<'asking' | 'happy' | 'thinking'>('asking');
  const [rpsShaking, setRpsShaking] = React.useState(false);

  const gType = normalizeGameId(match.gameType);
  const players: any[] = match.players || [currentUser];
  const p1 = players[0] || currentUser;
  const p2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot', avatarUrl: '' };
  const p1Score = match.scores?.[p1.id] ?? 0;
  const p2Score = match.scores?.[p2.id] ?? 0;
  const isFinished = match.status === 'finished';
  const didWin = match.winnerId === currentUser.id;
  const isPvp = Boolean(match.isRealtimePvp && players.length >= 2);
  const isMyTurn = !isPvp || match.turnUserId === currentUser.id;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
  };

  const handleSakarAnswer = (oIdx: number, correctIdx: number) => {
    setOwlMood(oIdx === correctIdx ? 'happy' : 'thinking');
    setTimeout(() => setOwlMood('asking'), 900);
    onMove({ answerIndex: oIdx });
  };

  const handleRpsPick = (choice: string) => {
    setRpsShaking(true);
    setTimeout(() => {
      setRpsShaking(false);
      onMove({ choice });
    }, 380);
  };

  return (
    <div className="h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto px-3 py-2 flex flex-col justify-between overflow-hidden relative">
      {/* Cyber Scoreboard Header */}
      <div className="cyber-panel flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl border border-amber-500/25 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarWithFrame
            avatarUrl={p1.avatarUrl}
            frameId={p1.frameId}
            frames={frames}
            displayName={p1.displayName}
            size="sm"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[140px]">
              {p1.displayName}
            </div>
            <div className="text-xs font-mono font-bold text-amber-400">{p1Score}</div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[11px] font-bold uppercase text-amber-300 shrink-0">
          {gType === 'connect4'
            ? '၄ လုံးတန်း'
            : gType === 'tictactoe'
            ? 'Tic-Tac-Toe'
            : gType === 'rps'
            ? `RPS (Bo${match.bestOf || 3})`
            : `ပညာရှိ ဇီးကွက် စကားထာ`}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[140px]">
              {p2.displayName}
            </div>
            <div className="text-xs font-mono font-bold text-sky-400">{p2Score}</div>
          </div>
          <AvatarWithFrame
            avatarUrl={p2.avatarUrl}
            frameId={p2.frameId}
            frames={frames}
            displayName={p2.displayName}
            size="sm"
          />
        </div>
      </div>

      {/* Centered Zero-Scroll Game Board */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        {/* 1. TIC-TAC-TOE (3D Tilt Neon Board) */}
        {gType === 'tictactoe' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ perspective: 1000 }}
            className="w-full max-w-[295px] sm:max-w-[340px] space-y-2.5"
          >
            <div className="text-center text-xs font-bold text-amber-300">
              {isFinished
                ? lang === 'my'
                  ? 'ပွဲပြီးဆုံးပါပြီ'
                  : 'Match Finished'
                : isMyTurn
                ? lang === 'my'
                  ? 'သင့်အလှည့် (X) — အကွက်တစ်ခု နှိပ်ပါ'
                  : 'Your Turn (X) — Tap a cell'
                : lang === 'my'
                ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...'
                : "Opponent's Turn..."}
            </div>
            <motion.div
              animate={{ rotateX: 6 }}
              className="grid grid-cols-3 gap-2.5 aspect-square p-3 rounded-2xl cyber-panel border-2 border-sky-400/40 shadow-[0_14px_34px_rgba(56,189,248,0.2)]"
            >
              {(match.tttBoard || Array(9).fill(null)).map((cell: string | null, idx: number) => (
                <motion.button
                  key={idx}
                  whileHover={!cell && !isFinished ? { scale: 1.04 } : {}}
                  whileTap={!cell && !isFinished ? { scale: 0.9 } : {}}
                  type="button"
                  disabled={isFinished || !isMyTurn || cell !== null}
                  onClick={() => onMove({ index: idx })}
                  className="rounded-xl bg-[#070b14] hover:bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-4xl sm:text-5xl font-display font-extrabold cursor-pointer"
                >
                  {cell === 'X' && (
                    <motion.span
                      initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                      className="text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]"
                    >
                      X
                    </motion.span>
                  )}
                  {cell === 'O' && (
                    <motion.span
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                      className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    >
                      O
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* 2. CONNECT 4 (Gravity Bounce Discs) */}
        {gType === 'connect4' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[340px] sm:max-w-[390px] space-y-2"
          >
            <div className="text-center text-xs font-bold text-amber-300">
              {isFinished
                ? lang === 'my'
                  ? 'ပွဲပြီးဆုံးပါပြီ'
                  : 'Match Finished'
                : isMyTurn
                ? lang === 'my'
                  ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ပါ'
                  : 'Your Turn — Tap any column'
                : lang === 'my'
                ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...'
                : "Opponent's Turn..."}
            </div>
            <div className="p-2.5 rounded-2xl bg-gradient-to-b from-blue-900/85 to-blue-950/95 border-2 border-blue-400/45 shadow-[0_0_28px_rgba(37,99,235,0.35)] grid grid-cols-7 gap-1.5">
              {(match.c4Board || Array.from({ length: 6 }, () => Array(7).fill(null))).map(
                (row: Array<string | null>, rIdx: number) =>
                  row.map((cell, cIdx) => (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      disabled={isFinished || !isMyTurn}
                      onClick={() => onMove({ col: cIdx })}
                      className="aspect-square rounded-full bg-[#070b14] border border-blue-300/20 p-0.5 flex items-center justify-center cursor-pointer overflow-hidden"
                    >
                      {cell && (
                        <motion.span
                          initial={{ y: -140, scale: 0.85 }}
                          animate={{ y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                          className={`w-full h-full rounded-full ${
                            cell === 'P1'
                              ? 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_#f59e0b]'
                              : 'bg-gradient-to-br from-rose-300 via-rose-500 to-rose-700 shadow-[0_0_12px_#f43f5e]'
                          }`}
                        />
                      )}
                    </button>
                  ))
              )}
            </div>
          </motion.div>
        )}

        {/* 3. ROCK, PAPER, SCISSORS (3D Clash Shake Animation) */}
        {gType === 'rps' && (() => {
          const myPicked = Boolean(isPvp && match.rpsPicks?.[currentUser.id]);
          return (
            <div className="w-full max-w-sm space-y-3.5 text-center">
              <div className="p-4 rounded-2xl cyber-panel border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-300">Round {match.round || 1}</div>
                {rpsShaking ? (
                  <motion.div
                    animate={{ y: [0, -18, 0, -18, 0] }}
                    transition={{ duration: 0.38 }}
                    className="flex items-center justify-center gap-10 py-2 text-4xl"
                  >
                    <span>✊</span>
                    <span>✊</span>
                  </motion.div>
                ) : match.rpsLastRound ? (
                  <motion.div
                    key={match.round}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="flex items-center justify-center gap-6 py-1"
                  >
                    <div>
                      <div className="text-4xl">
                        {match.rpsLastRound.p1Choice === 'rock'
                          ? '✊'
                          : match.rpsLastRound.p1Choice === 'paper'
                          ? '✋'
                          : '✌️'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{p1.displayName}</div>
                    </div>
                    <div className="text-xs font-extrabold text-amber-400">VS</div>
                    <div>
                      <div className="text-4xl">
                        {match.rpsLastRound.p2Choice === 'rock'
                          ? '✊'
                          : match.rpsLastRound.p2Choice === 'paper'
                          ? '✋'
                          : '✌️'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{p2.displayName}</div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-3 text-xs font-semibold text-slate-300">
                    {myPicked
                      ? lang === 'my'
                        ? 'ပြိုင်ဘက် ရွေးချယ်မှု စောင့်နေသည်...'
                        : 'Waiting for opponent choice...'
                      : lang === 'my'
                      ? 'လက်သင်္ကေတ တစ်ခု ရွေးချယ်ပါ'
                      : 'Choose your move'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'rock', icon: '✊', label: lang === 'my' ? 'ကျောက်တုံး' : 'Rock' },
                  { id: 'paper', icon: '✋', label: lang === 'my' ? 'စက္ကူ' : 'Paper' },
                  { id: 'scissors', icon: '✌️', label: lang === 'my' ? 'ကတ်ကြေး' : 'Scissors' },
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -4, scale: 1.03 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    disabled={isFinished || myPicked || rpsShaking}
                    onClick={() => handleRpsPick(item.id)}
                    className="p-3.5 rounded-2xl cyber-panel hover:border-amber-400 disabled:opacity-50 flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-xs font-bold text-white">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 4. SAKAR-HTAR WITH 3D WISE OWL (ပညာရှိ ဇီးကွက် မေးခွန်းမေးသည့်ပုံစံ) */}
        {gType === 'sakarhtar' && (() => {
          const riddles = match.riddles || [];
          const idx = Math.min(match.riddleIndex || 0, Math.max(0, riddles.length - 1));
          const current = riddles[idx];
          if (!current) return null;
          const questionText =
            lang === 'my' ? current.questionMy || current.question : current.questionEn || current.question;
          const opts: string[] =
            lang === 'my' ? current.optionsMy || current.options : current.optionsEn || current.options;
          const alreadyAnswered = Boolean(isPvp && typeof match.roundAnswers?.[currentUser.id] === 'number');

          return (
            <div className="w-full max-w-md space-y-2">
              {players.length > 2 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {players.map((pl) => (
                    <span
                      key={pl.id}
                      className="px-2.5 py-0.5 rounded-lg cyber-panel text-[11px] text-white shrink-0"
                    >
                      {pl.displayName}: <b className="text-amber-400">{match.scores?.[pl.id] || 0}</b>
                    </span>
                  ))}
                </div>
              )}

              {/* 3D Animated Wise Owl Mascot */}
              <WiseOwl3D mood={owlMood} />

              {/* Wise Owl Speech Scroll */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, rotateX: -20, y: 12 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{ perspective: 900 }}
                  className="p-3.5 rounded-2xl cyber-gold-active relative"
                >
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'my' ? `ပညာရှိ ဇီးကွက် မေးခွန်း (${idx + 1}/${riddles.length})` : `Wise Owl Riddle (${idx + 1}/${riddles.length})`}
                    </span>
                    <span>{match.scores?.[currentUser.id] ?? 0} PTS</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{questionText}</p>
                </motion.div>
              </AnimatePresence>

              {alreadyAnswered ? (
                <div className="p-3.5 rounded-2xl cyber-panel text-center text-xs text-amber-300 font-semibold">
                  {lang === 'my'
                    ? 'အခြားကစားသမားများ ဖြေဆိုသည်ကို စောင့်နေပါသည်...'
                    : 'Waiting for other players to answer...'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {opts.map((opt, oIdx) => (
                    <motion.button
                      key={`${idx}_${oIdx}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      disabled={isFinished}
                      onClick={() => handleSakarAnswer(oIdx, current.answerIndex)}
                      className="p-2.5 sm:p-3 rounded-xl cyber-panel hover:border-amber-400 text-left text-xs font-bold text-white cursor-pointer"
                    >
                      <span className="text-amber-400 font-mono mr-1.5">{oIdx + 1}.</span>
                      {opt}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="min-h-[40px] px-3.5 rounded-xl cyber-panel text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Chat ({chatMessages.length})</span>
        </button>

        {isFinished ? (
          <button
            type="button"
            onClick={onLeaveFinished}
            className="min-h-[40px] px-5 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'my' ? 'Lobby သို့ ပြန်မည်' : 'Back to Lobby'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onForfeit}
            className="min-h-[40px] px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-xs font-semibold text-rose-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'အရှုံးပေးထွက်မည်' : 'Forfeit'}</span>
          </button>
        )}
      </div>

      {/* In-Match Chat Drawer */}
      {chatOpen && (
        <div className="absolute inset-x-3 bottom-14 z-30 rounded-2xl cyber-panel border border-amber-400/30 p-3 shadow-2xl space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-xs font-bold text-white">In-Match Chat</span>
            <button type="button" onClick={() => setChatOpen(false)} className="text-slate-400 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-24 overflow-y-auto space-y-1 text-xs">
            {chatMessages.map((m, idx) => (
              <div key={m.id || idx}>
                <span className="font-bold text-amber-400">{m.sender}: </span>
                <span className="text-slate-200">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Say GG..."
              className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/10 text-xs text-white"
            />
            <button type="submit" className="px-3 h-9 rounded-lg cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Match Result Overlay */}
      {isFinished && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="w-full max-w-xs rounded-2xl cyber-panel border border-amber-400/60 p-6 text-center space-y-4 shadow-2xl"
          >
            <Award className="w-12 h-12 mx-auto text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
            <div>
              <h3 className="text-xl font-display font-bold text-white">
                {match.isDraw
                  ? lang === 'my'
                    ? 'သရေပွဲ!'
                    : 'Draw Match!'
                  : didWin
                  ? lang === 'my'
                    ? 'အနိုင်ရရှိပါသည်!'
                    : 'Victory!'
                  : lang === 'my'
                  ? 'ရှုံးနိမ့်သွားပါသည်'
                  : 'Defeat'}
              </h3>
              <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                {match.isDraw ? '+25 XP' : didWin ? '+75 XP' : '-20 XP'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLeaveFinished}
              className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-sm cursor-pointer"
            >
              {lang === 'my' ? 'ဆက်လက်ကစားမည်' : 'Continue'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
