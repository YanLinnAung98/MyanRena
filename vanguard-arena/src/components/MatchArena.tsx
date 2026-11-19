import React from 'react';
import { motion } from 'motion/react';
import { Award, Flag, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import {
  VillageRpsScene,
  VillageTicTacToeScene,
  WiseOwlTreeQuizScene,
} from './VillageScenes3D.tsx';

interface MatchArenaProps {
  lang: Language;
  token: string;
  match: any;
  currentUser: UserProfile;
  frames: any[];
  featureLocks: Record<string, boolean>;
  chatMessages: any[];
  botThinking?: boolean;
  onMove: (move: any) => void;
  onForfeit: () => void;
  onSendChat: (text: string) => void;
  onLeaveFinished: () => void;
  onNotify: (level: string, message: string) => void;
}

export const MatchArena: React.FC<MatchArenaProps> = ({
  lang,
  match,
  currentUser,
  frames,
  chatMessages,
  botThinking = false,
  onMove,
  onForfeit,
  onSendChat,
  onLeaveFinished,
}) => {
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatText, setChatText] = React.useState('');
  const [hoverCol, setHoverCol] = React.useState<number>(3);

  const gType = normalizeGameId(match.gameType);
  const players: any[] = match.players || [currentUser];
  const p1 = players[0] || currentUser;
  const p2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot', avatarUrl: '' };
  const p1Score = match.scores?.[p1.id] ?? 0;
  const p2Score = match.scores?.[p2.id] ?? 0;
  const isFinished = match.status === 'finished';
  const didWin = match.winnerId === currentUser.id;
  const isPvp = Boolean(match.isRealtimePvp && players.length >= 2);
  const isMyTurn = (!isPvp && !botThinking) || (isPvp && match.turnUserId === currentUser.id);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
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
            <motion.div
              key={p1Score}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              className="text-xs font-mono font-bold text-amber-400"
            >
              {p1Score}
            </motion.div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[11px] font-bold uppercase text-amber-300 shrink-0">
          {gType === 'connect4'
            ? '၄ လုံးတန်း 3D'
            : gType === 'tictactoe'
            ? 'ကွပ်ပျစ် Tic-Tac-Toe'
            : gType === 'rps'
            ? `ကျေးလက် RPS (Bo${match.bestOf || 3})`
            : 'ဉာဏ်စမ်းပဟေဠိ'}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[140px]">
              {p2.displayName}
            </div>
            <motion.div
              key={p2Score}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              className="text-xs font-mono font-bold text-sky-400"
            >
              {p2Score}
            </motion.div>
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

      {/* Centered 3D Game Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        {/* 1. VILLAGE KUT-PYIT TIC-TAC-TOE */}
        {gType === 'tictactoe' && (
          <VillageTicTacToeScene
            lang={lang}
            match={match}
            currentUser={currentUser}
            isMyTurn={isMyTurn}
            botThinking={botThinking}
            onCellClick={(idx) => onMove({ index: idx })}
          />
        )}

        {/* 2. 3D CONNECT 4 WITH 1.5s BOT THINKING */}
        {gType === 'connect4' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ perspective: 1000 }}
            className="w-full max-w-[345px] sm:max-w-[400px] space-y-1.5"
          >
            <div className="text-center text-xs font-bold text-amber-300">
              {isFinished
                ? lang === 'my' ? 'ပွဲပြီးဆုံးပါပြီ' : 'Match Finished'
                : botThinking
                ? lang === 'my' ? '💭 Aegis Bot စဉ်းစားနေပါသည် (1.5s)...' : '💭 Bot is thinking...'
                : isMyTurn
                ? lang === 'my' ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ချပါ' : 'Your Turn — Drop disc'
                : lang === 'my' ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...' : "Opponent's Turn..."}
            </div>

            <div className="grid grid-cols-7 gap-1.5 px-2.5 h-6">
              {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => (
                <div key={colIdx} className="flex items-center justify-center">
                  {hoverCol === colIdx && isMyTurn && !isFinished && !botThinking && (
                    <motion.span
                      layoutId="c4HoverDisc"
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_12px_#fbbf24]"
                    />
                  )}
                </div>
              ))}
            </div>

            <motion.div
              animate={{ rotateX: 5 }}
              className="p-2.5 rounded-2xl bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 border-2 border-blue-400/50 shadow-[0_20px_40px_rgba(30,64,175,0.45)] grid grid-cols-7 gap-1.5"
            >
              {(match.c4Board || Array.from({ length: 6 }, () => Array(7).fill(null))).map(
                (row: Array<string | null>, rIdx: number) =>
                  row.map((cell, cIdx) => (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      disabled={isFinished || !isMyTurn || botThinking}
                      onMouseEnter={() => setHoverCol(cIdx)}
                      onClick={() => {
                        setHoverCol(cIdx);
                        onMove({ col: cIdx });
                      }}
                      className="aspect-square rounded-full bg-[#070b13] border border-blue-300/25 p-0.5 flex items-center justify-center cursor-pointer overflow-hidden shadow-inner"
                    >
                      {cell && (
                        <motion.span
                          initial={{ y: -(rIdx + 1) * 44 }}
                          animate={{ y: 0 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
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
            </motion.div>
          </motion.div>
        )}

        {/* 3. VILLAGE RPS 3D WITH HEAD BONK */}
        {gType === 'rps' && (
          <VillageRpsScene
            lang={lang}
            match={match}
            currentUser={currentUser}
            isPvp={isPvp}
            onPick={(choice) => {
              soundEngine.playClash();
              onMove({ choice });
            }}
          />
        )}

        {/* 4. WISE OWL TREE QUIZ WITH SEATED KIDS & HEAD BONK */}
        {gType === 'sakarhtar' && (
          <WiseOwlTreeQuizScene
            lang={lang}
            match={match}
            currentUser={currentUser}
            isPvp={isPvp}
            onAnswer={(answerIndex) => onMove({ answerIndex })}
          />
        )}
      </div>

      {/* Bottom Bar */}
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

      {/* In-Match Chat */}
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
              className="flex-1 h-9 px-3 rounded-lg bg-[#070b13] border border-white/10 text-xs text-white"
            />
            <button type="submit" className="px-3 h-9 rounded-lg cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Match Result Banner (Bottom Floating Bar so Users can Watch the Kids Dance & Cry!) */}
      {isFinished && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute inset-x-4 bottom-16 z-20 rounded-2xl cyber-panel border border-amber-400/60 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-display font-bold text-white">
                {match.isDraw
                  ? lang === 'my' ? 'သရေပွဲ!' : 'Draw Match!'
                  : didWin
                  ? lang === 'my' ? 'အနိုင်ရရှိပါသည်! 🎉' : 'Victory! 🎉'
                  : lang === 'my' ? 'ရှုံးနိမ့်သွားပါသည် 😢' : 'Defeat 😢'}
              </h3>
              <p className="text-xs font-mono font-bold text-amber-400">
                {match.isDraw ? '+25 XP' : didWin ? '+75 XP' : '-20 XP'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLeaveFinished}
            className="px-4 h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
          >
            {lang === 'my' ? 'ဆက်လက်ကစားမည်' : 'Continue'}
          </button>
        </motion.div>
      )}
    </div>
  );
};
