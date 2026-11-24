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

export const TTT_KID_BOT_AVATAR_DATA_URI = `${BASE}assets/ttt-kid-avatar.jpg`;

export function getTicTacToeBotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မပုတု' : 'Ma Pu Tu';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
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
  const board: Array<string | null> = useMemo(() => {
    if (Array.isArray(match?.tttBoard) && match.tttBoard.length === 9) {
      return match.tttBoard;
    }
    return Array(9).fill(null);
  }, [match?.tttBoard]);

  const isFinished = match?.status === 'finished';
  const isPvp = Boolean(match?.isRealtimePvp && (match?.players?.length || 0) >= 2);
  const isMyTurn = !isFinished && (!isPvp || match?.turnUserId === currentUserId);

  const winningIndices = useMemo(() => {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return new Set([a, b, c]);
      }
    }
    return new Set<number>();
  }, [board]);

  const statusText = useMemo(() => {
    if (isFinished) {
      if (match?.isDraw) return lang === 'my' ? 'သရေကျသွားပါပြီ!' : "It's a Draw!";
      if (match?.winnerId === currentUserId) {
        return lang === 'my' ? 'သင် အနိုင်ရရှိပါပြီ!' : 'You Won!';
      }
      return lang === 'my' ? 'ပြိုင်ဘက် အနိုင်ရသွားပါပြီ!' : 'Opponent Won!';
    }
    if (!isMyTurn) {
      return lang === 'my' ? 'ပြိုင်ဘက် အလှည့်...' : "Opponent's Turn...";
    }
    return lang === 'my' ? 'သင့်အလှည့် — အကွက်တစ်ခု နှိပ်ပါ' : 'Your Turn — Pick a cell';
  }, [isFinished, match?.isDraw, match?.winnerId, currentUserId, isMyTurn, lang]);

  const handlePress = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    if (onSelectCell) onSelectCell(index);
    else if (onCellClick) onCellClick(index);
    else if (onMove) onMove({ index });
  };

  return (
    <div className="relative w-full h-full min-h-[480px] flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-[#0a1020] via-[#0d162c] to-[#070b14] select-none">
      <div className="mb-5 px-5 py-2 rounded-2xl bg-[#10182b]/90 border border-amber-300/50 shadow-lg">
        <span className="text-sm font-semibold text-amber-100">{statusText}</span>
      </div>

      <div className="w-full max-w-[360px] p-3.5 rounded-3xl bg-gradient-to-b from-[#f3d48c] via-[#c79d4b] to-[#8c6827] shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-[20px] bg-[#0d1528]">
          {board.map((cell, idx) => {
            const isWin = winningIndices.has(idx);
            return (
              <button
                key={idx}
                type="button"
                disabled={!isMyTurn || cell !== null}
                onClick={() => handlePress(idx)}
                className={`aspect-square rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black transition border ${
                  isWin
                    ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.45)]'
                    : 'bg-[#15223e]/90 border-slate-700/70 hover:border-amber-300/60'
                } ${!isMyTurn || cell !== null ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
              >
                {cell === 'X' && (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.75)]"
                  >
                    X
                  </motion.span>
                )}
                {cell === 'O' && (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.75)]"
                  >
                    O
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isFinished && onLeaveFinished && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={onLeaveFinished}
          className="mt-6 px-7 py-2.5 rounded-full font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-110 shadow-[0_8px_24px_rgba(251,191,36,0.4)] transition"
        >
          {lang === 'my' ? 'Lobby သို့ ပြန်သွားမည်' : 'Back to Lobby'}
        </motion.button>
      )}
    </div>
  );
};

export default TicTacToeBoard;
