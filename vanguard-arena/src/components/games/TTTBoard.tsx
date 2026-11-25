import React from 'react';
import { motion } from 'motion/react';
import type { TTTState } from '../../types.ts';
import { soundEngine } from '../../utils/sound.ts';

interface TTTBoardProps {
  state: TTTState;
  myPlayerNum: 1 | 2 | 0;
  isMyTurn: boolean;
  disabled?: boolean;
  onMove: (payload: { index: number }) => void;
}

function getWinLineCoords(winLine: number[] | null): { x1: number; y1: number; x2: number; y2: number } | null {
  if (!winLine || winLine.length !== 3) return null;
  const center = (idx: number) => ({
    x: (idx % 3) * 100 + 50,
    y: Math.floor(idx / 3) * 100 + 50,
  });
  const start = center(winLine[0]);
  const end = center(winLine[2]);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

export const TTTBoard: React.FC<TTTBoardProps> = ({
  state,
  myPlayerNum,
  isMyTurn,
  disabled,
  onMove,
}) => {
  const uid = React.useId().replace(/:/g, '');
  const lineCoords = getWinLineCoords(state.winLine);

  const handleCellClick = (index: number) => {
    if (disabled || !isMyTurn || state.winner !== 0 || state.board[index] !== 0) return;
    soundEngine.playMove();
    onMove({ index });
  };
  return (
    <div className="w-full max-w-[400px] mx-auto touch-game-lock">
      {/* Holographic Obsidian-Glass 3x3 Arena */}
      <div className="relative p-3.5 sm:p-5 rounded-3xl bg-gradient-to-b from-[#131D35] via-[#0B1222] to-[#060913] border border-cyan-400/20 shadow-[0_28px_64px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(103,232,249,0.2)]">
        {/* Corner Holographic Calibration Ticks */}
        <div className="pointer-events-none absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40 rounded-tl" />
        <div className="pointer-events-none absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40 rounded-tr" />
        <div className="pointer-events-none absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-cyan-400/40 rounded-bl" />
        <div className="pointer-events-none absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40 rounded-br" />

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 relative">
          {state.board.map((cell, idx) => {
            const canClick = isMyTurn && !disabled && state.winner === 0 && cell === 0;
            const isWinCell = Boolean(state.winLine?.includes(idx));
            const isLast = state.lastMove === idx;

            return (
              <motion.button
                key={idx}
                type="button"
                disabled={!canClick}
                whileHover={canClick ? { scale: 1.03 } : undefined}
                whileTap={canClick ? { scale: 0.95 } : undefined}
                onClick={() => handleCellClick(idx)}
                aria-label={`Cell ${idx + 1}`}
                className={`aspect-square min-h-[82px] sm:min-h-[96px] rounded-2xl border flex items-center justify-center relative overflow-hidden transition-colors shadow-[inset_0_3px_10px_rgba(0,0,0,0.75)] ${
                  isWinCell
                    ? state.winner === 1
                      ? 'bg-rose-500/15 border-amber-400/75 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
                      : 'bg-cyan-500/15 border-cyan-300/75 shadow-[0_0_24px_rgba(34,211,238,0.3)]'
                    : canClick
                    ? 'bg-[#070C17] border-cyan-400/20 hover:border-cyan-300/55 hover:bg-[#0E172A] cursor-pointer group'
                    : 'bg-[#070C17] border-white/[0.08] cursor-default'
                }`}
              >
                {/* Translucent Plasma Hover Preview */}
                {canClick && (
                  <span
                    className={`pointer-events-none opacity-0 group-hover:opacity-30 text-3xl font-display font-extrabold transition-opacity ${
                      myPlayerNum === 1 ? 'text-amber-300' : 'text-cyan-300'
                    }`}
                  >
                    {myPlayerNum === 1 ? 'X' : 'O'}
                  </span>
                )}

                {cell === 1 && (
                  <motion.svg
                    viewBox="0 0 64 64"
                    className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_14px_rgba(244,63,94,0.65)]"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 390, damping: 20 }}
                  >
                    <defs>
                      <linearGradient id={`x-grad-${uid}-${idx}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="45%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#F43F5E" />
                      </linearGradient>
                    </defs>
                    <motion.line
                      x1="15"
                      y1="15"
                      x2="49"
                      y2="49"
                      stroke={`url(#x-grad-${uid}-${idx})`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.18 }}
                    />
                    <motion.line
                      x1="49"
                      y1="15"
                      x2="15"
                      y2="49"
                      stroke={`url(#x-grad-${uid}-${idx})`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.18, delay: 0.05 }}
                    />
                  </motion.svg>
                )}

                {cell === 2 && (
                  <motion.svg
                    viewBox="0 0 64 64"
                    className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_14px_rgba(34,211,238,0.65)]"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 390, damping: 20 }}
                  >
                    <defs>
                      <linearGradient id={`o-grad-${uid}-${idx}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ECFEFF" />
                        <stop offset="50%" stopColor="#22D3EE" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="18"
                      fill="none"
                      stroke={`url(#o-grad-${uid}-${idx})`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.24 }}
                    />
                  </motion.svg>
                )}

                {isLast && !isWinCell && (
                  <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-300/75" />
                )}
              </motion.button>
            );
          })}

          {/* Electric Arc Glowing Strike-Through Win Line */}
          {lineCoords && (
            <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 w-full h-full z-20">
              <motion.line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                stroke={state.winner === 1 ? '#FB7185' : '#22D3EE'}
                strokeWidth="14"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  filter: `drop-shadow(0 0 12px ${state.winner === 1 ? '#F59E0B' : '#22D3EE'})`,
                }}
              />
              <motion.line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                stroke="#FFFFFF"
                strokeWidth="4.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
