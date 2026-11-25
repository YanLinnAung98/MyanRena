
import React, { useMemo } from 'react';
import { motion } from 'motion/react';

export interface TicTacToeBoardProps {
  lang?: 'my' | 'en' | string;
  match: any;
  currentUserId: string;
  onSelectCell?: (index: number) => void;
  onCellClick?: (index: number) => void;
  onMove?: (move: { index: number }) => void;
  onLeaveFinished?: () => void;
}

const BASE = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');

const TTT_ASSETS = {
  background: `${BASE}assets/ttt-village-bg.jpg`,
  boy: `${BASE}assets/ttt-boy.png`,
  girlIdle: `${BASE}assets/ttt-girl-idle.png`,
  girlDance: `${BASE}assets/ttt-girl-dance.jpg`,
  girlCry: `${BASE}assets/ttt-girl-cry.jpg`,
};

export const TTT_KID_BOT_AVATAR_DATA_URI = TTT_ASSETS.boy;

export function getTicTacToeBotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မပုတု' : 'Ma Pu Tu';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  lang = 'my',
  match,
  currentUserId,
  onSelectCell,
  onCellClick,
  onMove,
  onLeaveFinished,
}) => {
  const board: Array<string | null> = useMemo(() =>
    Array.isArray(match?.tttBoard) && match.tttBoard.length === 9
      ? match.tttBoard
      : Array(9).fill(null),
  [match?.tttBoard]);

  const players = Array.isArray(match?.players) ? match.players : [];
  const opponent = players.find((player: any) => player?.id !== currentUserId);
  const opponentName = opponent?.displayName || getTicTacToeBotName(lang, match?.difficulty);
  const currentPlayer = players.find((player: any) => player?.id === currentUserId);
  const currentPlayerName = currentPlayer?.displayName || (lang === 'my' ? 'သင်' : 'You');

  const isFinished = match?.status === 'finished';
  const isPvp = Boolean(match?.isRealtimePvp && players.length >= 2);
  const isMyTurn = !isFinished && (!isPvp || match?.turnUserId === currentUserId);
  const isDraw = Boolean(match?.isDraw);
  const didWin = match?.winnerId === currentUserId;

  const winningIndices = useMemo(() => {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return new Set([a, b, c]);
      }
    }
    return new Set<number>();
  }, [board]);

  const statusText = isFinished
    ? isDraw
      ? (lang === 'my' ? 'သရေကျသွားပါပြီ!' : "It's a Draw!")
      : didWin
        ? (lang === 'my' ? 'သင် အနိုင်ရရှိပါပြီ!' : 'You Won!')
        : (lang === 'my' ? 'ပြိုင်ဘက် အနိုင်ရသွားပါပြီ!' : 'Opponent Won!')
    : isMyTurn
      ? (lang === 'my' ? 'သင့်အလှည့် — အကွက်တစ်ခု ရွေးပါ' : 'Your Turn — Pick a cell')
      : (lang === 'my' ? 'ပြိုင်ဘက် အလှည့်...' : "Opponent's Turn...");

  const handlePress = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    if (onSelectCell) onSelectCell(index);
    else if (onCellClick) onCellClick(index);
    else onMove?.({ index });
  };

  const girlImage = isFinished && !isDraw
    ? (didWin ? TTT_ASSETS.girlDance : TTT_ASSETS.girlCry)
    : TTT_ASSETS.girlIdle;

  return (
    <div
      className="relative w-full h-full min-h-0 flex flex-col items-center justify-between overflow-y-auto px-3 pt-3 pb-4 sm:px-5 select-none"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,12,20,.34), rgba(8,12,20,.58)), url("${TTT_ASSETS.background}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[520px] flex items-center justify-between gap-2 rounded-2xl border border-amber-200/40 bg-black/65 backdrop-blur-md px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌿</span>
          <span className="text-xs sm:text-sm font-bold text-white truncate">{opponentName}</span>
        </div>
        <span className="text-[10px] sm:text-xs font-black tracking-wider text-amber-200">TIC-TAC-TOE</span>
        <span className="text-xs sm:text-sm font-bold text-white truncate">{currentPlayerName}</span>
      </div>

      <div className="relative z-10 w-full max-w-[520px] flex-1 min-h-0 flex flex-col items-center justify-center gap-1">
        <motion.img
          src={TTT_ASSETS.boy}
          alt="Ma Pu Tu game character"
          draggable={false}
          className="w-[clamp(76px,18vh,142px)] h-[clamp(76px,18vh,142px)] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.65)]"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        />

        <div className="w-full max-w-[min(78vw,390px)] aspect-square p-2 sm:p-3 rounded-[26px] border-[5px] border-amber-800/90 bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 shadow-[0_18px_45px_rgba(0,0,0,.75)]">
          <div className="grid grid-cols-3 gap-2 w-full h-full rounded-2xl p-2 bg-[#3b281b]/95 border border-amber-100/25">
            {board.map((cell, idx) => {
              const isWin = winningIndices.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isMyTurn || cell !== null}
                  onClick={() => handlePress(idx)}
                  aria-label={`Tic tac toe cell ${idx + 1}${cell ? `: ${cell}` : ''}`}
                  className={`aspect-square min-w-0 rounded-xl flex items-center justify-center border transition-all ${
                    isWin
                      ? 'bg-amber-300/30 border-yellow-200 shadow-[0_0_18px_rgba(253,224,71,.65)]'
                      : 'bg-[#634329]/85 border-amber-100/25 hover:bg-[#805a35]/90 hover:border-amber-200/70'
                  } ${!isMyTurn || cell !== null ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                >
                  {cell === 'X' && (
                    <motion.span
                      initial={{ scale: 0.35, opacity: 0, rotate: -25 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      className="text-4xl sm:text-6xl font-black text-amber-200 drop-shadow-[0_0_12px_rgba(254,240,138,.9)]"
                    >X</motion.span>
                  )}
                  {cell === 'O' && (
                    <motion.span
                      initial={{ scale: 0.35, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl sm:text-6xl font-black text-sky-300 drop-shadow-[0_0_12px_rgba(125,211,252,.9)]"
                    >O</motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <motion.img
          key={girlImage}
          src={girlImage}
          alt="Myanmar village girl game character"
          draggable={false}
          className="w-[clamp(90px,20vh,158px)] h-[clamp(90px,20vh,158px)] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.7)]"
          initial={{ y: 10, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[520px] flex flex-col items-center gap-3">
        <div className="px-5 py-2 rounded-2xl bg-black/75 border border-amber-300/55 shadow-lg text-center">
          <span className="text-sm font-bold text-amber-100">{statusText}</span>
        </div>

        {isFinished && onLeaveFinished && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            onClick={onLeaveFinished}
            className="px-7 py-2.5 rounded-full font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-110 shadow-[0_8px_24px_rgba(251,191,36,.4)] transition"
          >
            {lang === 'my' ? 'Lobby သို့ ပြန်သွားမည်' : 'Back to Lobby'}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default TicTacToeBoard;
