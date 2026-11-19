import React from 'react';
import { Award, Flag, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
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

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] max-w-3xl mx-auto px-3 py-2 flex flex-col justify-between overflow-hidden relative">
      {/* Compact Scoreboard */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-[#121826] border border-white/10 shrink-0">
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

        <div className="text-center shrink-0">
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase text-slate-300">
            {match.gameType === 'connect4'
              ? 'Connect 4'
              : match.gameType === 'tictactoe'
              ? 'Tic-Tac-Toe'
              : match.gameType === 'rps'
              ? `RPS (Bo${match.bestOf || 3})`
              : `စကားထာ (${players.length}P)`}
          </span>
        </div>

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

      {/* Centered Game Stage (Zero Scroll) */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        {/* 1. TIC-TAC-TOE */}
        {match.gameType === 'tictactoe' && (
          <div className="w-full max-w-[290px] sm:max-w-[340px] space-y-2">
            <div className="text-center text-xs font-semibold text-amber-300">
              {isFinished
                ? lang === 'my' ? 'ပွဲပြီးဆုံးပါပြီ' : 'Match Finished'
                : isMyTurn
                ? lang === 'my' ? 'သင့်အလှည့် — အကွက်တစ်ခု နှိပ်ပါ' : 'Your Turn — Tap a cell'
                : lang === 'my' ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...' : "Opponent's Turn..."}
            </div>
            <div className="grid grid-cols-3 gap-2 aspect-square p-2.5 rounded-2xl bg-[#121826] border border-white/10">
              {(match.tttBoard || Array(9).fill(null)).map((cell: string | null, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isFinished || !isMyTurn || cell !== null}
                  onClick={() => onMove({ index: idx })}
                  className="rounded-xl bg-[#0A0D14] hover:bg-white/5 border border-white/10 flex items-center justify-center text-4xl font-display font-bold cursor-pointer active:scale-95"
                >
                  {cell === 'X' && <span className="text-sky-400">X</span>}
                  {cell === 'O' && <span className="text-amber-400">O</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. CONNECT 4 */}
        {match.gameType === 'connect4' && (
          <div className="w-full max-w-[340px] sm:max-w-[390px] space-y-2">
            <div className="text-center text-xs font-semibold text-amber-300">
              {isFinished
                ? lang === 'my' ? 'ပွဲပြီးဆုံးပါပြီ' : 'Match Finished'
                : isMyTurn
                ? lang === 'my' ? 'သင့်အလှည့် — ကော်လံတစ်ခု နှိပ်ပါ' : 'Your Turn — Tap any column'
                : lang === 'my' ? 'ပြိုင်ဘက် အလှည့်စောင့်နေပါသည်...' : "Opponent's Turn..."}
            </div>
            <div className="p-2 rounded-2xl bg-blue-950/70 border border-blue-400/30 grid grid-cols-7 gap-1.5">
              {(match.c4Board || Array.from({ length: 6 }, () => Array(7).fill(null))).map(
                (row: Array<string | null>, rIdx: number) =>
                  row.map((cell, cIdx) => (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      disabled={isFinished || !isMyTurn}
                      onClick={() => onMove({ col: cIdx })}
                      className={`aspect-square rounded-full border transition-all cursor-pointer active:scale-90 ${
                        cell === 'P1'
                          ? 'bg-amber-400 border-amber-200'
                          : cell === 'P2'
                          ? 'bg-rose-500 border-rose-300'
                          : 'bg-[#090D16] border-white/10'
                      }`}
                    />
                  ))
              )}
            </div>
          </div>
        )}

        {/* 3. ROCK, PAPER, SCISSORS */}
        {match.gameType === 'rps' && (() => {
          const myPicked = Boolean(isPvp && match.rpsPicks?.[currentUser.id]);
          return (
            <div className="w-full max-w-sm space-y-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#121826] border border-white/10 space-y-1.5">
                <div className="text-xs text-slate-400">Round {match.round || 1}</div>
                {match.rpsLastRound ? (
                  <div className="flex items-center justify-center gap-6 py-1">
                    <div>
                      <div className="text-3xl">
                        {match.rpsLastRound.p1Choice === 'rock' ? '🪨' : match.rpsLastRound.p1Choice === 'paper' ? '📄' : '✂️'}
                      </div>
                      <div className="text-[11px] text-slate-400">{p1.displayName}</div>
                    </div>
                    <div className="text-xs font-bold text-amber-400">VS</div>
                    <div>
                      <div className="text-3xl">
                        {match.rpsLastRound.p2Choice === 'rock' ? '🪨' : match.rpsLastRound.p2Choice === 'paper' ? '📄' : '✂️'}
                      </div>
                      <div className="text-[11px] text-slate-400">{p2.displayName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-xs font-semibold text-slate-300">
                    {myPicked
                      ? lang === 'my' ? 'ပြိုင်ဘက် ရွေးချယ်မှု စောင့်နေသည်...' : 'Waiting for opponent choice...'
                      : lang === 'my' ? 'လက်သင်္ကေတ တစ်ခု ရွေးချယ်ပါ' : 'Choose your move'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rock', icon: '🪨', label: lang === 'my' ? 'ကျောက်တုံး' : 'Rock' },
                  { id: 'paper', icon: '📄', label: lang === 'my' ? 'စက္ကူ' : 'Paper' },
                  { id: 'scissors', icon: '✂️', label: lang === 'my' ? 'ကတ်ကြေး' : 'Scissors' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isFinished || myPicked}
                    onClick={() => onMove({ choice: item.id })}
                    className="p-3.5 rounded-2xl bg-[#121826] hover:bg-amber-500/20 disabled:opacity-50 border border-white/10 hover:border-amber-400 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-xs font-bold text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 4. SAKAR-HTAR (1 to 8 Players Live Scoreboard + Riddles) */}
        {match.gameType === 'sakarhtar' && (() => {
          const riddles = match.riddles || [];
          const idx = Math.min(match.riddleIndex || 0, Math.max(0, riddles.length - 1));
          const current = riddles[idx];
          if (!current) return null;
          const questionText = lang === 'my' ? current.questionMy || current.question : current.questionEn || current.question;
          const opts: string[] = lang === 'my' ? current.optionsMy || current.options : current.optionsEn || current.options;
          const alreadyAnswered = Boolean(isPvp && typeof match.roundAnswers?.[currentUser.id] === 'number');

          return (
            <div className="w-full max-w-md space-y-2.5">
              {/* Live Multi-Player Score Pills */}
              {players.length > 2 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {players.map((pl) => (
                    <span
                      key={pl.id}
                      className="px-2 py-0.5 rounded-lg bg-[#121826] border border-white/10 text-[11px] text-white shrink-0"
                    >
                      {pl.displayName}: <b className="text-amber-400">{match.scores?.[pl.id] || 0}</b>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  {lang === 'my' ? 'မေးခွန်း' : 'Riddle'} {idx + 1} / {riddles.length}
                </span>
                <span className="text-amber-400 font-bold">
                  {match.scores?.[currentUser.id] ?? 0} {lang === 'my' ? 'မှတ်' : 'PTS'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121826] border border-amber-500/30 text-sm font-bold text-white leading-relaxed">
                {questionText}
              </div>

              {alreadyAnswered ? (
                <div className="p-4 rounded-2xl bg-[#121826] border border-white/10 text-center text-xs text-amber-300 font-semibold">
                  {lang === 'my' ? 'အခြားကစားသမားများ ဖြေဆိုသည်ကို စောင့်နေပါသည်...' : 'Waiting for other players to answer...'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {opts.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={isFinished}
                      onClick={() => onMove({ answerIndex: oIdx })}
                      className="p-3 rounded-xl bg-[#121826] hover:bg-amber-500/20 border border-white/10 hover:border-amber-400 text-left text-xs font-semibold text-white cursor-pointer active:scale-95"
                    >
                      <span className="text-amber-400 font-mono mr-1.5">{oIdx + 1}.</span>
                      {opt}
                    </button>
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
          className="min-h-[40px] px-3.5 rounded-xl bg-[#121826] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Chat ({chatMessages.length})</span>
        </button>

        {isFinished ? (
          <button
            type="button"
            onClick={onLeaveFinished}
            className="min-h-[40px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'my' ? 'Lobby သို့ ပြန်မည်' : 'Back to Lobby'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onForfeit}
            className="min-h-[40px] px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'အရှုံးပေးထွက်မည်' : 'Forfeit'}</span>
          </button>
        )}
      </div>

      {/* In-Match Chat Drawer */}
      {chatOpen && (
        <div className="absolute inset-x-3 bottom-14 z-30 rounded-2xl bg-[#121826]/98 border border-white/15 p-3 shadow-2xl space-y-2">
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
              className="flex-1 h-9 px-3 rounded-lg bg-[#0A0D14] border border-white/10 text-xs text-white"
            />
            <button type="submit" className="px-3 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Match Result Overlay */}
      {isFinished && (
        <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-[#121826] border border-amber-400/50 p-6 text-center space-y-4 shadow-2xl">
            <Award className="w-12 h-12 mx-auto text-amber-400" />
            <div>
              <h3 className="text-xl font-display font-bold text-white">
                {match.isDraw
                  ? lang === 'my' ? 'သရေပွဲ!' : 'Draw Match!'
                  : didWin
                  ? lang === 'my' ? 'အနိုင်ရရှိပါသည်!' : 'Victory!'
                  : lang === 'my' ? 'ရှုံးနိမ့်သွားပါသည်' : 'Defeat'}
              </h3>
              <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                {match.isDraw ? '+25 XP' : didWin ? '+75 XP' : '-20 XP'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLeaveFinished}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              {lang === 'my' ? 'ဆက်လက်ကစားမည်' : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
