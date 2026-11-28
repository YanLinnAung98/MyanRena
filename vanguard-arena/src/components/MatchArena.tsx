import React from 'react';
import { motion } from 'motion/react';
import { Award, Flag, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import {
  Connect4Board,
  getConnect4BotName,
  KID_BOT_AVATAR_DATA_URI,
} from './Connect4Board.tsx';
import {
  TicTacToeBoard,
  getTicTacToeBotName,
  TTT_KID_BOT_AVATAR_DATA_URI,
} from './TicTacToeBoard.tsx';
import {
  VillageRpsScene,
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
  onMove,
  onForfeit,
  onSendChat,
  onLeaveFinished,
}) => {
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatText, setChatText] = React.useState('');

  const gType = normalizeGameId(match.gameType);
  const isFullBleed = gType === 'tictactoe' || gType === 'rps';
  const players: any[] = match.players || [currentUser];
  const p1 = players[0] || currentUser;
  const rawP2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot', avatarUrl: '' };
  const isPvp = Boolean(match.isRealtimePvp && players.length >= 2);

  // 4-Row တွင် မောင်ဖိုးသား၊ Tic-Tac-Toe တွင် မပုတု၏ Profile ပုံနှင့် နာမည်ကို သုံးမည်
  const p2 =
    gType === 'connect4' && !isPvp
      ? {
          ...rawP2,
          displayName: getConnect4BotName(lang, match.difficulty || 'medium'),
          avatarUrl: KID_BOT_AVATAR_DATA_URI,
        }
      : (gType === 'tictactoe' || gType === 'rps') && !isPvp
      ? {
          ...rawP2,
          displayName: getTicTacToeBotName(lang, match.difficulty || 'medium'),
          avatarUrl: gType === 'rps' ? `${import.meta.env.BASE_URL}assets/ttt-girl-idle.png` : TTT_KID_BOT_AVATAR_DATA_URI,
        }
      : rawP2;

  const p1Score = match.scores?.[p1.id] ?? 0;
  const p2Score = match.scores?.[p2.id] ?? 0;
  const isFinished = match.status === 'finished';
  const didWin = match.winnerId === currentUser.id;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
  };

  return (
    <div
      className={
        isFullBleed
          ? 'fixed inset-x-0 top-14 lg:top-[4.25rem] bottom-0 z-20 w-screen flex flex-col justify-between overflow-hidden overscroll-none bg-[radial-gradient(ellipse_at_50%_38%,rgba(29,78,216,.13),transparent_58%),linear-gradient(180deg,#0b1322,#070b13)]'
          : 'fixed inset-x-0 top-14 lg:top-[4.25rem] bottom-0 max-w-5xl mx-auto px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-between gap-3 overflow-hidden overscroll-none bg-[radial-gradient(ellipse_at_50%_38%,rgba(29,78,216,.13),transparent_58%),linear-gradient(180deg,#0b1322,#070b13)]'
      }
    >
      {/* Cyber Scoreboard Header */}
      <div
        className={
          isFullBleed
            ? 'relative z-10 w-full max-w-6xl mx-auto cyber-panel mr-match-scoreboard bg-slate-950/75 backdrop-blur-md flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl border border-amber-500/35 shadow-xl shrink-0'
            : 'cyber-panel mr-match-scoreboard flex items-center justify-between gap-3 px-3 sm:px-5 py-3 rounded-2xl border border-amber-300/20 shrink-0 shadow-[0_12px_36px_rgba(0,0,0,.24)]'
        }
      >
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
              className="mr-player-score text-xs font-mono font-bold text-amber-300"
            >
              {p1Score}
            </motion.div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[11px] font-bold uppercase text-amber-300 shrink-0">
          {gType === 'connect4'
            ? '၄ လုံးတန်း 3D'
            : gType === 'tictactoe'
            ? 'ကျေးလက် Tic-Tac-Toe'
            : gType === 'rps'
            ? `ကျေးလက် RPS (Bo${match.bestOf || 3})`
            : 'ဉာဏ်စမ်းပဟေဠိ'}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[95px] sm:max-w-[160px]">
              {p2.displayName}
            </div>
            <motion.div
              key={p2Score}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              className="mr-player-score text-xs font-mono font-bold text-sky-300"
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

      {/* Game Stage */}
      <div
        className={
          isFullBleed
            ? 'relative flex-1 min-h-0 w-full'
            : 'relative flex-1 min-h-0 flex items-center justify-center py-2 sm:py-3 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_15%,rgba(232,185,92,.08),transparent_52%),linear-gradient(145deg,rgba(18,30,49,.72),rgba(7,12,21,.92))] shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_45px_rgba(0,0,0,.2)]'
        }
      >
        {/* 1. FULL-SCREEN VILLAGE DIRT TIC-TAC-TOE WITH MA PU TU */}
        {gType === 'tictactoe' && (
          <TicTacToeBoard
            lang={lang}
            match={match}
            currentUserId={currentUser.id}
            onCellClick={(idx) => onMove({ index: idx })}
            onLeaveFinished={onLeaveFinished}
          />
        )}

        {/* 2. 3D CONNECT 4 WITH MG PHO THAR */}
        {gType === 'connect4' && (
          <Connect4Board
            lang={lang}
            match={match}
            currentUserId={currentUser.id}
            onDropColumn={(col) => onMove({ col })}
            onLeaveFinished={onLeaveFinished}
          />
        )}

        {/* 3. VILLAGE RPS 3D WITH HEAD BONK */}
        {gType === 'rps' && (
          <VillageRpsScene
            lang={lang}
            match={match}
            currentUser={currentUser}
            isPvp={isPvp}
            onPick={(choice) => {
              (soundEngine as any).playClash?.();
              onMove({ choice });
            }}
          />
        )}

        {/* 4. WISE OWL TREE QUIZ */}
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
      <div
        className={
          isFullBleed
            ? 'relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-2 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]'
            : 'flex items-center justify-between gap-3 shrink-0 rounded-2xl border border-white/[0.08] bg-[#111b2b]/90 p-2 shadow-[0_12px_30px_rgba(0,0,0,.22)]'
        }
      >
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="min-h-[40px] px-3.5 rounded-xl cyber-panel bg-slate-950/80 backdrop-blur-md text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
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
            className="min-h-[40px] px-3.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/85 backdrop-blur-md border border-rose-500/45 text-xs font-semibold text-rose-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'အရှုံးပေးထွက်မည်' : 'Forfeit'}</span>
          </button>
        )}
      </div>

      {/* In-Match Chat */}
      {chatOpen && (
        <div className="absolute inset-x-3 bottom-14 z-50 max-w-3xl mx-auto rounded-2xl cyber-panel border border-amber-400/30 p-3 shadow-2xl space-y-2">
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

      {/* Match Result Banner (Non-Connect4 & Non-TicTacToe Games) */}
      {isFinished && gType !== 'connect4' && gType !== 'tictactoe' && (
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
