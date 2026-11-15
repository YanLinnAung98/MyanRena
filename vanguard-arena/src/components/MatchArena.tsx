import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Flag,
  MessageSquare,
  Send,
  ShieldAlert,
  Smile,
  Trophy,
  Wifi,
  X,
} from 'lucide-react';
import { GAME_REGISTRY } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  ActiveMatch,
  ChatMessage,
  FeatureLocks,
  Language,
  ProfileFrame,
  ReportCategory,
  UserProfile,
} from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface MatchArenaProps {
  lang: Language;
  token: string;
  match: ActiveMatch;
  currentUser: UserProfile;
  frames: ProfileFrame[];
  featureLocks: FeatureLocks;
  chatMessages: ChatMessage[];
  onMove: (matchId: string, payload: Record<string, unknown>) => void;
  onForfeit: (matchId: string) => void;
  onSendChat: (matchId: string, content: string, kind: 'text' | 'sticker') => void;
  onLeaveFinished: () => void;
  onNotify: (level: 'info' | 'error' | 'success', msg: string) => void;
}

const STICKERS = ['🔥 GG!', '⚡ Fast!', '🎯 Nice!', '😎 EZ', '🤝 Respect', '👑 Crown', '🤯 Clutch!'];

export const MatchArena: React.FC<MatchArenaProps> = ({
  lang,
  token,
  match,
  currentUser,
  frames,
  featureLocks,
  chatMessages,
  onMove,
  onForfeit,
  onSendChat,
  onLeaveFinished,
  onNotify,
}) => {
  const t = TRANSLATIONS[lang];
  const [now, setNow] = React.useState(Date.now());
  const [chatOpen, setChatOpen] = React.useState(false);
  const [stickerOpen, setStickerOpen] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');
  const [floatingSticker, setFloatingSticker] = React.useState<{ id: string; text: string; sender: string } | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportCategory, setReportCategory] = React.useState<ReportCategory>('toxic_chat');
  const [reportTargetId, setReportTargetId] = React.useState<string>('');
  const [reportNotes, setReportNotes] = React.useState('');
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [reportSubmitted, setReportSubmitted] = React.useState(false);
  const lastChatIdRef = React.useRef<string | null>(null);
  const prevStatusRef = React.useRef<string>(match.status);

  React.useEffect(() => {
    setReportOpen(false);
    setReportSubmitted(false);
    setReportNotes('');
    setReportTargetId('');
    setReportCategory('toxic_chat');
  }, [match.id]);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (prevStatusRef.current === 'active' && match.status === 'finished') {
      if (match.winnerId === currentUser.id) soundEngine.playWin();
      else if (!match.isDraw) soundEngine.playLose();
      else soundEngine.playNotify();
    }
    prevStatusRef.current = match.status;
  }, [match.status, match.winnerId, match.isDraw, currentUser.id]);

  React.useEffect(() => {
    if (chatMessages.length === 0) return;
    const latest = chatMessages[chatMessages.length - 1];
    if (latest.id !== lastChatIdRef.current) {
      lastChatIdRef.current = latest.id;
      if (latest.kind === 'sticker') {
        setFloatingSticker({ id: latest.id, text: latest.content, sender: latest.senderName });
        setTimeout(() => setFloatingSticker(null), 2200);
      }
    }
  }, [chatMessages]);

  const plugin = GAME_REGISTRY[match.gameType];
  const isSakar = match.state.gameType === 'sakar_htar';
  const allParticipants = React.useMemo(
    () => (match.participants && match.participants.length > 0 ? match.participants : [match.player1, match.player2]),
    [match.participants, match.player1, match.player2]
  );
  const humanRivals = React.useMemo(
    () => allParticipants.filter((p) => !p.isBot && p.id !== currentUser.id),
    [allParticipants, currentUser.id]
  );
  const isSoloSakar = isSakar && allParticipants.length <= 1;

  const myNum: 1 | 2 | 0 =
    match.player1.id === currentUser.id ? 1 : match.player2.id === currentUser.id ? 2 : 0;

  let isMyTurn = false;
  if (match.status === 'active') {
    if (match.state.gameType === 'sakar_htar') {
      const me = match.state.players.find((p) => p.id === currentUser.id);
      isMyTurn = match.state.phase === 'question' && Boolean(me && !me.answeredCurrent);
    } else if (match.state.gameType === 'rps') {
      isMyTurn = myNum === 1 ? !match.state.p1Submitted : myNum === 2 ? !match.state.p2Submitted : false;
    } else {
      isMyTurn = match.state.turn === myNum;
    }
  }

  const turnRemaining = Math.max(0, Math.ceil((match.turnDeadline - now) / 1000));
  const graceRemaining = match.graceDeadline ? Math.max(0, Math.ceil((match.graceDeadline - now) / 1000)) : 0;

  const p1Rank = getRankInfo(match.player1.xp);
  const p2Rank = getRankInfo(match.player2.xp);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || featureLocks.chat) return;
    onSendChat(match.id, chatInput.trim(), 'text');
    setChatInput('');
  };

  const selectedReportedPlayer =
    humanRivals.find((p) => p.id === reportTargetId) || humanRivals[0] || null;
  const canReportOpponent = match.mode !== 'bot' && humanRivals.length > 0;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReportOpponent || !selectedReportedPlayer || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          matchId: match.id,
          reportedId: selectedReportedPlayer.id,
          category: reportCategory,
          notes: reportNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not submit report.');
      } else {
        setReportSubmitted(true);
        setReportOpen(false);
        onNotify('success', t.report.submittedToast);
      }
    } catch {
      onNotify('error', 'Network error submitting report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const didIWin = match.status === 'finished' && match.winnerId === currentUser.id;
  const myXpGain =
    match.xpAwarded?.byUser?.[currentUser.id] ??
    (myNum === 1 ? match.xpAwarded?.p1 ?? 0 : match.xpAwarded?.p2 ?? 0);
  const signedRpText = `${myXpGain >= 0 ? `+${myXpGain}` : myXpGain} ${t.match.rpChange}`;
  const winnerParticipant = allParticipants.find((p) => p.id === match.winnerId) || null;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-5 relative safe-bottom-bar">
      {/* Top Match Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {match.status === 'finished' ? (
            <button
              type="button"
              onClick={onLeaveFinished}
              className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium text-white flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.match.lobbyBtn}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onForfeit(match.id)}
              className="min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.match.forfeit}</span>
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-display font-bold text-white truncate">
              {lang === 'my' ? plugin.nameMy : plugin.name}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {isSoloSakar
                ? `${t.match.practice} · 10 Riddles`
                : match.mode === 'custom_room'
                ? `Custom Room · ${allParticipants.length} Players`
                : match.mode === 'bot'
                ? `${t.match.practice} · ${match.difficulty?.toUpperCase()}`
                : match.mode === 'tournament'
                ? t.match.tournamentMatch
                : `${t.match.livePvp}${isSakar ? ` · ${allParticipants.length} Players` : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {match.status === 'active' && !isSakar && (
            <div className="px-3.5 py-2 rounded-xl bg-[#121826] border border-white/10 flex items-center gap-2 text-xs font-mono tabular-nums">
              <Clock className={`w-4 h-4 ${turnRemaining <= 5 ? 'text-rose-400' : 'text-amber-400'}`} />
              <span className={turnRemaining <= 5 ? 'text-rose-300 font-bold' : 'text-slate-200'}>
                {turnRemaining}s
              </span>
            </div>
          )}

          {match.mode !== 'bot' && !isSoloSakar && (
            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#121826] hover:bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer relative"
            >
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">{t.match.matchChat}</span>
              {chatMessages.length > 0 && (
                <span className="text-amber-400 font-mono tabular-nums">({chatMessages.length})</span>
              )}
            </button>
          )}

          {canReportOpponent && (
            <button
              type="button"
              disabled={reportSubmitted}
              onClick={() => setReportOpen(true)}
              className="min-h-[44px] px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-45 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 cursor-pointer"
              title={t.match.reportPlayer}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">{t.match.reportPlayer}</span>
            </button>
          )}
        </div>
      </div>

      {/* 30-Second Disconnect Grace Timer Banner */}
      {match.status === 'active' && match.disconnectedPlayerId && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-200">{t.match.graceTitle}</div>
              <div className="text-xs text-amber-300/80">{t.match.graceDesc}</div>
            </div>
          </div>
          <div className="text-xl font-mono font-bold text-amber-300 tabular-nums shrink-0">
            {graceRemaining}s
          </div>
        </div>
      )}

      {/* Player vs Player Match HUD (2-Player titles; Sakar-Htar renders its seated courtyard row directly) */}
      {!isSakar && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { p: match.player1, num: 1 as const, rank: p1Rank, active: match.state.gameType !== 'rps' && match.state.turn === 1 && match.status === 'active' },
            { p: match.player2, num: 2 as const, rank: p2Rank, active: match.state.gameType !== 'rps' && match.state.turn === 2 && match.status === 'active' },
          ].map(({ p, num, rank, active }) => (
            <div
              key={p.id}
              className={`p-3 sm:p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                active
                  ? num === 1
                    ? 'bg-amber-500/10 border-amber-400/50'
                    : 'bg-sky-500/10 border-sky-400/50'
                  : 'bg-[#121826] border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarWithFrame
                  avatarUrl={p.avatarUrl}
                  frameId={p.frameId}
                  frames={frames}
                  displayName={p.displayName}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {p.displayName} {p.id === currentUser.id ? t.match.you : ''}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    <span className={rank.colorClass}>{rank.tier}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono tabular-nums">Lv {rank.level}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-semibold ${num === 1 ? 'text-amber-400' : 'text-sky-400'}`}>
                  {active ? t.match.turn : `P${num}`}
                </div>
                {!p.isBot && p.pingMs !== undefined && (
                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-end gap-1 mt-0.5 tabular-nums">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>{p.pingMs}ms</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Play Stage + Collapsible Chat */}
      <div className="grid lg:grid-cols-12 gap-6 items-start relative">
        <div className={`${chatOpen ? 'lg:col-span-8' : 'lg:col-span-12'} relative`}>
          {/* Floating Sticker Reaction Overlay */}
          <AnimatePresence>
            {floatingSticker && (
              <motion.div
                key={floatingSticker.id}
                initial={{ opacity: 0, y: 18, scale: 0.85 }}
                animate={{ opacity: 1, y: -8, scale: 1 }}
                exit={{ opacity: 0, y: -28 }}
                className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-2xl bg-[#161D2E]/95 border border-amber-400/40 shadow-xl text-sm font-semibold text-white whitespace-nowrap"
              >
                {floatingSticker.sender}: {floatingSticker.text}
              </motion.div>
            )}
          </AnimatePresence>

          {plugin.renderBoard({
            state: match.state,
            myPlayerNum: myNum,
            isMyTurn,
            disabled: match.status !== 'active',
            currentUserId: currentUser.id,
            lang,
            frames,
            onMove: (payload) => onMove(match.id, payload),
          })}

          {/* Quick Sticker Bar for PvP */}
          {match.mode !== 'bot' && !isSoloSakar && !featureLocks.chat && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setStickerOpen((v) => !v)}
                className="min-h-[40px] px-4 rounded-xl bg-[#121826] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <Smile className="w-4 h-4 text-amber-400" />
                <span>{t.match.sendSticker}</span>
              </button>

              <AnimatePresence>
                {stickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex flex-wrap justify-center gap-2 p-2.5 rounded-2xl bg-[#121826] border border-white/10"
                  >
                    {STICKERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onSendChat(match.id, s, 'sticker');
                          setStickerOpen(false);
                        }}
                        className="min-h-[40px] px-3 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Collapsible In-Match Chat Drawer */}
        <AnimatePresence>
          {chatOpen && match.mode !== 'bot' && !isSoloSakar && (
            <motion.aside
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="lg:col-span-4 rounded-2xl bg-[#121826] border border-white/10 p-4 flex flex-col h-[400px]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-sm font-display font-semibold text-white">{t.match.matchChat}</span>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-8">{t.match.noMessagesYet}</p>
                ) : (
                  chatMessages.map((msg) => {
                    const mine = msg.senderId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <span className="text-[11px] text-slate-500 mb-0.5">{msg.senderName}</span>
                        <div
                          className={`px-3 py-2 rounded-xl text-xs max-w-[85%] break-words ${
                            mine
                              ? 'bg-amber-500/20 border border-amber-400/30 text-amber-100'
                              : 'bg-[#0A0D14] border border-white/10 text-slate-200'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {featureLocks.chat ? (
                <div className="pt-2 text-xs text-amber-300 text-center">{t.match.chatLocked}</div>
              ) : (
                <form onSubmit={handleChatSubmit} className="pt-3 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.match.typeMessage}
                    maxLength={200}
                    className="flex-1 h-11 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Victory / End-of-Match Result Modal */}
      {match.status === 'finished' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[#121826] border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Trophy className={`w-6 h-6 ${didIWin ? 'text-amber-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white">
                {match.isDraw ? t.match.matchDrawn : didIWin ? t.match.victorySecured : t.match.matchConcluded}
              </h3>
              <p className="text-sm text-slate-300 mt-0.5 tabular-nums">
                {match.isDraw
                  ? t.match.evenContest
                  : isSoloSakar
                  ? `${currentUser.displayName} completed 10 riddles.`
                  : `${
                      winnerParticipant?.displayName ||
                      (match.winnerId === match.player1.id
                        ? match.player1.displayName
                        : match.player2.displayName)
                    } ${t.match.wonMatch}`}
                {' '}{t.match.earnedXp}{' '}
                <span
                  className={`font-semibold ${
                    myXpGain > 0 ? 'text-emerald-400' : myXpGain < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {signedRpText}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {canReportOpponent && (
              <button
                type="button"
                disabled={reportSubmitted}
                onClick={() => setReportOpen(true)}
                className="min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-45 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{t.match.reportPlayer}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLeaveFinished}
              className="flex-1 sm:flex-none min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer whitespace-nowrap"
            >
              {t.match.returnLobby}
            </button>
          </div>
        </motion.div>
      )}

      {/* Report Player Modal */}
      {reportOpen && canReportOpponent && selectedReportedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>{t.report.modalTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedReportedPlayer.displayName} ({selectedReportedPlayer.gameId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{t.report.modalDesc}</p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              {humanRivals.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Player</label>
                  <select
                    value={selectedReportedPlayer.id}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {humanRivals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName} ({p.gameId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.report.categoryLabel}</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
                  className="w-full h-11 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="toxic_chat">{t.report.catToxic}</option>
                  <option value="cheating">{t.report.catCheating}</option>
                  <option value="afk_stalling">{t.report.catAfk}</option>
                  <option value="inappropriate_profile">{t.report.catProfile}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.report.notesLabel}</label>
                <textarea
                  rows={3}
                  maxLength={450}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder={t.report.notesPlaceholder}
                  className="w-full p-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200">
                {t.report.snapshotNote}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                >
                  {t.report.cancel}
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="min-h-[42px] rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer"
                >
                  {reportSubmitting ? t.report.submitting : t.report.submitBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
