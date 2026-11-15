import React from 'react';
import { motion } from 'motion/react';
import type { Connect4State } from '../../types.ts';
import { C4_COLS, C4_ROWS, getConnect4DropRow } from '../../games/engine.ts';
import { soundEngine } from '../../utils/sound.ts';

interface Connect4BoardProps {
  state: Connect4State;
  myPlayerNum: 1 | 2 | 0;
  isMyTurn: boolean;
  disabled?: boolean;
  onMove: (payload: { col: number }) => void;
}

const VICTORY_SPARKS = Array.from({ length: 14 }, (_, idx) => ({
  id: idx,
  left: `${8 + ((idx * 17) % 84)}%`,
  delay: (idx % 5) * 0.1,
}));

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  state,
  myPlayerNum,
  isMyTurn,
  disabled,
  onMove,
}) => {
  const [hoverCol, setHoverCol] = React.useState<number | null>(null);

  const isWinningCell = (r: number, c: number) =>
    Boolean(state.winLine?.some(([wr, wc]) => wr === r && wc === c));

  const handleColClick = (col: number) => {
    if (disabled || !isMyTurn || state.winner !== 0) return;
    if (getConnect4DropRow(state.board, col) === -1) return;
    soundEngine.playDrop();
    onMove({ col });
  };

  const previewRow = hoverCol !== null && isMyTurn && !disabled ? getConnect4DropRow(state.board, hoverCol) : -1;

  // Compute SVG laser coordinates across 7x6 grid (viewBox 0 0 700 600)
  const laserCoords = React.useMemo(() => {
    if (!state.winLine || state.winLine.length < 2) return null;
    const first = state.winLine[0];
    const last = state.winLine[state.winLine.length - 1];
    return {
      x1: first[1] * 100 + 50,
      y1: first[0] * 100 + 50,
      x2: last[1] * 100 + 50,
      y2: last[0] * 100 + 50,
    };
  }, [state.winLine]);

  return (
    <div className="w-full max-w-[560px] mx-auto relative touch-game-lock">
      {/* Column Quick-Tap Targets for Mobile (>=44px) & Desktop Hover Preview */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2.5 mb-2.5 px-2.5 sm:px-5">
        {Array.from({ length: C4_COLS }).map((_, col) => {
          const canDrop = isMyTurn && !disabled && state.winner === 0 && getConnect4DropRow(state.board, col) !== -1;
          const hovered = hoverCol === col && canDrop;
          return (
            <button
              key={col}
              type="button"
              disabled={!canDrop}
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol((cur) => (cur === col ? null : cur))}
              onClick={() => handleColClick(col)}
              aria-label={`Drop token in column ${col + 1}`}
              className={`min-h-[44px] rounded-xl flex items-center justify-center transition-all ${
                canDrop
                  ? 'cursor-pointer hover:bg-white/[0.06] active:scale-95'
                  : 'cursor-default opacity-30'
              }`}
            >
              <motion.div
                animate={hovered ? { y: [0, 4, 0], scale: 1.08 } : { y: 0, scale: 0.82 }}
                transition={{ duration: 0.85, repeat: hovered ? Infinity : 0 }}
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border relative ${
                  hovered ? 'opacity-100' : 'opacity-45'
                } ${
                  myPlayerNum === 1
                    ? 'bg-gradient-to-br from-rose-300 via-red-500 to-rose-800 border-rose-200/80 shadow-[0_0_20px_rgba(244,63,94,0.65)]'
                    : 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 border-amber-200/80 shadow-[0_0_20px_rgba(245,158,11,0.65)]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Sapphire-Glass & Brushed Titanium 6x7 Cabinet */}
      <div className="relative p-2.5 sm:p-5 rounded-3xl bg-gradient-to-b from-[#17284A] via-[#0F1B36] to-[#080F20] border border-sky-300/20 shadow-[0_28px_64px_rgba(0,0,0,0.72),inset_0_2px_1px_rgba(186,230,253,0.22),inset_0_-3px_8px_rgba(0,0,0,0.65)]">
        {/* Metallic Brushed Top Rail Trim */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        {/* Ambient Column Beam Highlight */}
        {hoverCol !== null && isMyTurn && !disabled && state.winner === 0 && (
          <div
            className="pointer-events-none absolute top-2.5 bottom-2.5 rounded-2xl bg-gradient-to-b from-sky-300/15 via-white/[0.04] to-transparent transition-all duration-150"
            style={{
              left: `calc(${(hoverCol / C4_COLS) * 100}% + 8px)`,
              width: `calc(${100 / C4_COLS}% - 16px)`,
            }}
          />
        )}

        {/* Victory Celebration Sparks */}
        {state.winner !== 0 && state.winner !== 'draw' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            {VICTORY_SPARKS.map((s) => (
              <motion.span
                key={s.id}
                initial={{ y: 20, opacity: 0.9, scale: 0.8 }}
                animate={{ y: -90, opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.6, delay: s.delay, repeat: Infinity }}
                style={{ left: s.left }}
                className={`absolute bottom-6 w-2 h-2 rounded-full ${
                  state.winner === 1 ? 'bg-rose-400 shadow-[0_0_12px_#F43F5E]' : 'bg-amber-300 shadow-[0_0_12px_#F59E0B]'
                }`}
              />
            ))}
          </div>
        )}

        <div className="relative">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 relative z-10">
            {Array.from({ length: C4_ROWS }).map((_, r) =>
              Array.from({ length: C4_COLS }).map((__, c) => {
                const cell = state.board[r][c];
                const isWin = isWinningCell(r, c);
                const isPreview = previewRow === r && hoverCol === c && cell === 0;
                const isLast = state.lastMove?.row === r && state.lastMove?.col === c;
                const canDropCol = isMyTurn && !disabled && state.winner === 0 && getConnect4DropRow(state.board, c) !== -1;

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={!canDropCol}
                    onMouseEnter={() => setHoverCol(c)}
                    onMouseLeave={() => setHoverCol((cur) => (cur === c ? null : cur))}
                    onClick={() => handleColClick(c)}
                    aria-label={`Row ${r + 1} Column ${c + 1}`}
                    className={`aspect-square w-full rounded-full bg-[#050914] border relative flex items-center justify-center overflow-hidden shadow-[inset_0_5px_12px_rgba(0,0,0,0.9),0_1px_0_rgba(148,163,184,0.12)] transition-colors ${
                      isWin
                        ? 'border-white ring-2 ring-white/80 shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                        : isPreview
                        ? 'border-sky-300/45'
                        : 'border-sky-200/10'
                    } ${canDropCol ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {isPreview && (
                      <div
                        className={`w-[82%] h-[82%] rounded-full opacity-30 ${
                          myPlayerNum === 1 ? 'bg-rose-500' : 'bg-amber-400'
                        }`}
                      />
                    )}
                    {cell !== 0 && (
                      <motion.div
                        initial={{ y: -(r + 1) * 58, opacity: 0.8 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 23, mass: 0.65 }}
                        className={`w-[88%] h-[88%] rounded-full relative ${
                          cell === 1
                            ? 'bg-gradient-to-br from-rose-300 via-red-500 to-rose-900 shadow-[inset_0_3px_7px_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(69,10,10,0.85),0_4px_14px_rgba(244,63,94,0.55)]'
                            : 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-800 shadow-[inset_0_3px_7px_rgba(255,255,255,0.65),inset_0_-3px_6px_rgba(120,53,15,0.85),0_4px_14px_rgba(245,158,11,0.55)]'
                        }`}
                      >
                        {/* 3D Beveled Inner Grooves + Glossy Specular Arc */}
                        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
                          <path d="M11 14 A11 11 0 0 1 25 9" fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" />
                          <circle cx="20" cy="20" r="13" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.3" />
                          <circle cx="20" cy="20" r="8" fill="none" stroke="#000000" strokeOpacity="0.3" strokeWidth="1.6" />
                        </svg>
                        {isLast && !isWin && (
                          <div className="absolute inset-0 rounded-full ring-2 ring-white/75" />
                        )}
                      </motion.div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Glowing Laser-Line Victory Beam */}
          {laserCoords && (
            <svg viewBox="0 0 700 600" className="pointer-events-none absolute inset-0 w-full h-full z-20">
              <motion.line
                x1={laserCoords.x1}
                y1={laserCoords.y1}
                x2={laserCoords.x2}
                y2={laserCoords.y2}
                stroke={state.winner === 1 ? '#FB7185' : '#FBBF24'}
                strokeWidth="18"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.65 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  filter: `drop-shadow(0 0 14px ${state.winner === 1 ? '#F43F5E' : '#F59E0B'})`,
                }}
              />
              <motion.line
                x1={laserCoords.x1}
                y1={laserCoords.y1}
                x2={laserCoords.x2}
                y2={laserCoords.y2}
                stroke="#FFFFFF"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
