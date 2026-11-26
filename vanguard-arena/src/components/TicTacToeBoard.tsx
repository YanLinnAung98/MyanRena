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

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const ArenaMascot: React.FC<{ side: 'azure' | 'coral'; mood: 'idle' | 'win' | 'lose' | 'draw'; compact?: boolean }> = ({ side, mood, compact = false }) => {
  const azure = side === 'azure';
  const c = azure
    ? { main: '#36d8ee', deep: '#126b9a', light: '#b8f7ff', skin: '#e7ad83', hair: '#17283b', eye: '#173047' }
    : { main: '#ff718d', deep: '#9c315d', light: '#ffd2df', skin: '#f0bd98', hair: '#30213b', eye: '#38243b' };
  return (
    <motion.div
      className={'ttt-mascot ttt-mascot-' + side + (compact ? ' ttt-mascot-compact' : '')}
      animate={mood === 'win' ? { y: [0, -13, 0], rotate: [0, -4, 4, 0] } : mood === 'lose' ? { y: [0, 3, 0], rotate: [0, 2, -2, 0] } : { y: [0, -5, 0] }}
      transition={{ duration: mood === 'win' ? .72 : 3.4, repeat: mood === 'idle' ? Infinity : 0, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 180 220" className="ttt-mascot-art" role="presentation">
        <defs>
          <linearGradient id={'mascotSuit-' + side} x1="0" y1="0" x2="1" y2="1"><stop stopColor={c.light}/><stop offset=".48" stopColor={c.main}/><stop offset="1" stopColor={c.deep}/></linearGradient>
          <linearGradient id={'mascotSkin-' + side} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe0bd"/><stop offset="1" stopColor={c.skin}/></linearGradient>
          <filter id={'mascotGlow-' + side}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="90" cy="207" rx="53" ry="8" fill={c.main} opacity=".22"/>
        <path d="M42 203 Q42 155 61 143 L119 143 Q139 159 140 203Z" fill={'url(#mascotSuit-' + side + ')'} stroke={c.light} strokeOpacity=".75" strokeWidth="2"/>
        <path d="M61 151 L90 177 L119 151 L110 142 L70 142Z" fill="#f8fbff" opacity=".92"/>
        <path d="M82 169 L90 180 L98 169 L94 202 L86 202Z" fill={c.deep}/>
        <path d="M42 163 Q26 174 30 192 Q33 201 46 194 L61 177Z" fill={c.main} stroke={c.light} strokeWidth="2"/>
        <path d="M138 163 Q154 174 150 192 Q147 201 134 194 L119 177Z" fill={c.main} stroke={c.light} strokeWidth="2"/>
        <circle cx="31" cy="192" r="9" fill={'url(#mascotSkin-' + side + ')'} />
        <circle cx="149" cy="192" r="9" fill={'url(#mascotSkin-' + side + ')'} />
        <path d="M58 76 Q48 32 89 27 Q133 26 124 80 L117 112 L62 111Z" fill={c.hair}/>
        <path d="M53 84 Q43 48 66 34 Q80 16 111 29 Q137 42 128 81 Q117 64 107 54 Q91 69 61 67Z" fill={c.hair}/>
        <path d="M57 78 Q55 53 72 43 Q83 35 99 41 Q119 37 126 61 L123 100 Q118 132 90 135 Q63 132 57 101Z" fill={'url(#mascotSkin-' + side + ')'} stroke="#8d5b4b" strokeOpacity=".24" strokeWidth="1.5"/>
        <path d="M55 79 Q48 54 69 35 Q85 17 111 30 Q131 41 129 72 Q115 57 106 49 Q87 65 58 65Z" fill={c.hair}/>
        <path d="M70 86 Q78 80 84 86" fill="none" stroke={c.eye} strokeWidth="3" strokeLinecap="round"/>
        <path d="M98 86 Q106 80 112 86" fill="none" stroke={c.eye} strokeWidth="3" strokeLinecap="round"/>
        <ellipse cx="77" cy="96" rx="4" ry="5" fill={c.eye}/><ellipse cx="105" cy="96" rx="4" ry="5" fill={c.eye}/>
        <circle cx="78" cy="94" r="1.3" fill="white"/><circle cx="106" cy="94" r="1.3" fill="white"/>
        <path d="M84 111 Q91 118 99 110" fill="none" stroke="#a64d58" strokeWidth="2.6" strokeLinecap="round"/>
        <ellipse cx="67" cy="105" rx="8" ry="4" fill="#f28e91" opacity=".38"/><ellipse cx="114" cy="105" rx="8" ry="4" fill="#f28e91" opacity=".38"/>
        {azure ? <path d="M54 59 L44 32 L70 43 L87 20 L104 42 L133 29 L124 66 Q92 57 54 66Z" fill={c.hair}/> : <g><path d="M53 64 Q40 29 75 21 Q111 7 130 40 Q143 67 124 104 Q130 53 98 42 Q80 64 53 64Z" fill={c.hair}/><path d="M49 54 Q29 37 45 21 Q59 29 59 45Z M131 57 Q151 39 137 20 Q123 28 123 46Z" fill={c.main} stroke={c.light} strokeWidth="2"/><path d="M128 36 L142 27 L139 45 L125 50Z" fill={c.light}/></g>}
        <path d="M72 151 L90 164 L108 151" fill="none" stroke="white" strokeOpacity=".7" strokeWidth="2"/>
        <circle cx="90" cy="155" r="8" fill={c.deep} stroke={c.light} strokeWidth="2"/>
        <path d="M86 155 H94 M90 151 V159" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        {mood === 'win' && <g filter={'url(#mascotGlow-' + side + ')'}><path d="M30 35 L34 24 L38 35 L49 39 L38 43 L34 54 L30 43 L19 39Z" fill="#ffe58b"/><path d="M143 76 L146 68 L149 76 L157 79 L149 82 L146 90 L143 82 L135 79Z" fill="#ffe58b"/></g>}
      </svg>
      <span className="ttt-mascot-label">{azure ? 'NOVA' : 'PU TU'} <i>{azure ? 'X' : 'O'}</i></span>
    </motion.div>
  );
};

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  lang = 'my', match, currentUserId, onSelectCell, onCellClick, onMove, onLeaveFinished,
}) => {
  const board: Array<string | null> = useMemo(() =>
    Array.isArray(match?.tttBoard) && match.tttBoard.length === 9 ? match.tttBoard : Array(9).fill(null),
  [match?.tttBoard]);

  const players = Array.isArray(match?.players) ? match.players : [];
  const opponent = players.find((player: any) => player?.id !== currentUserId);
  const opponentName = opponent?.displayName || (lang === 'my' ? 'မပုတု' : 'Ma Pu Tu');
  const currentPlayer = players.find((player: any) => player?.id === currentUserId);
  const currentPlayerName = currentPlayer?.displayName || (lang === 'my' ? 'သင်' : 'You');
  const isFinished = match?.status === 'finished';
  const isPvp = Boolean(match?.isRealtimePvp && players.length >= 2);
  const isMyTurn = !isFinished && (!isPvp || match?.turnUserId === currentUserId);
  const isDraw = Boolean(match?.isDraw);
  const didWin = match?.winnerId === currentUserId;

  const winningIndices = useMemo(() => {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return new Set([a, b, c]);
    }
    return new Set<number>();
  }, [board]);

  const statusText = isFinished
    ? isDraw ? (lang === 'my' ? 'သရေကျသွားပါပြီ!' : "It's a Draw!")
      : didWin ? (lang === 'my' ? 'သင် အနိုင်ရရှိပါပြီ!' : 'You Won!')
      : (lang === 'my' ? 'ပြိုင်ဘက် အနိုင်ရသွားပါပြီ!' : 'Opponent Won!')
    : isMyTurn ? (lang === 'my' ? 'သင့်အလှည့် — အကွက်တစ်ခု ရွေးပါ' : 'Your Turn — Pick a cell')
    : (lang === 'my' ? 'ပြိုင်ဘက် အလှည့်...' : "Opponent's Turn...");

  const handlePress = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    if (onSelectCell) onSelectCell(index);
    else if (onCellClick) onCellClick(index);
    else onMove?.({ index });
  };

  const mascotMood = isFinished ? isDraw ? 'draw' : didWin ? 'win' : 'lose' : 'idle';
  const turnLabel = isFinished ? (isDraw ? 'DRAW' : didWin ? 'VICTORY' : 'DEFEAT') : isMyTurn ? 'YOUR MOVE' : 'RIVAL MOVE';

  return (
    <section className="ttt-arena relative w-full h-full min-h-0 flex flex-col overflow-hidden select-none" aria-label="Tic-Tac-Toe arena">
      <div className="ttt-arena-grid" aria-hidden="true" />
      <div className="ttt-ambient ttt-ambient-a" aria-hidden="true" />
      <div className="ttt-ambient ttt-ambient-b" aria-hidden="true" />
      <div className="ttt-scanline" aria-hidden="true" />

      <header className="ttt-arena-top relative z-10 flex items-center justify-between gap-3">
        <div className="ttt-brand-lockup"><span className="ttt-brand-mark">✦</span><span><b>TACTICAL GRID</b><small>MYANRENA · DUEL PROTOCOL</small></span></div>
        <div className={'ttt-turn-pill ' + (isFinished ? 'is-finished' : isMyTurn ? 'is-live' : 'is-rival')}>
          <span className="ttt-live-dot" />{turnLabel}
        </div>
      </header>

      <div className="ttt-matchup relative z-10">
        <div className={'ttt-player-chip ttt-player-x ' + (isMyTurn && !isFinished ? 'is-active' : '')}>
          <span className="ttt-player-symbol">X</span><span className="ttt-player-copy"><b>{opponentName}</b><small>{lang === 'my' ? 'အပြာရောင် ကစားသမား' : 'CYAN PLAYER'}</small></span>
        </div>
        <div className="ttt-score-divider"><span>VS</span><i /></div>
        <div className={'ttt-player-chip ttt-player-o ' + (!isMyTurn && !isFinished ? 'is-active' : '')}>
          <span className="ttt-player-symbol">O</span><span className="ttt-player-copy"><b>{currentPlayerName}</b><small>{lang === 'my' ? 'ပန်းရောင် ကစားသမား' : 'CORAL PLAYER'}</small></span>
        </div>
      </div>

      <main className="ttt-stage-layout relative z-10 flex-1 min-h-0">
        <div className="ttt-character-side ttt-character-left"><ArenaMascot side="azure" mood={mascotMood} /></div>
        <div className="ttt-board-column">
          <div className="ttt-board-heading"><span>NEON ARENA</span><span>ROUND 01 <i>•</i> 3 × 3</span></div>
          <div className="ttt-board-shell">
            <div className="ttt-board-bezel">
              <div className="ttt-board-grid">
                {board.map((cell, idx) => {
                  const isWin = winningIndices.has(idx);
                  return (
                    <motion.button
                      key={idx} type="button" disabled={!isMyTurn || cell !== null}
                      onClick={() => handlePress(idx)}
                      aria-label={'Tic tac toe cell ' + (idx + 1) + (cell ? ': ' + cell : '')}
                      whileTap={isMyTurn && cell === null ? { scale: .92 } : undefined}
                      className={'ttt-cell ' + (isWin ? 'is-winning' : '') + (cell ? ' is-filled' : '') + (!isMyTurn || cell !== null ? ' is-disabled' : '')}
                    >
                      <span className="ttt-cell-index">{String(idx + 1).padStart(2, '0')}</span>
                      {cell === 'X' && <motion.svg viewBox="0 0 64 64" className="ttt-mark ttt-mark-x" initial={{ scale: .25, opacity: 0, rotate: -35 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 19 }}><path d="M15 15 L49 49 M49 15 L15 49" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /></motion.svg>}
                      {cell === 'O' && <motion.svg viewBox="0 0 64 64" className="ttt-mark ttt-mark-o" initial={{ scale: .25, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 330, damping: 18 }}><circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="8" /></motion.svg>}
                      {!cell && <span className="ttt-cell-crosshair" aria-hidden="true">＋</span>}
                      {isWin && <motion.span className="ttt-win-spark" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }}>✦</motion.span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div className="ttt-board-base"><span /><span /><span /></div>
          </div>
          <div className={'ttt-status-bar ' + (isFinished ? 'is-finished' : isMyTurn ? 'is-your-turn' : 'is-rival-turn')}>
            <span className="ttt-status-icon">{isFinished ? (isDraw ? '＝' : didWin ? '✦' : '◇') : '◈'}</span>
            <span>{statusText}</span><i />
          </div>
        </div>
        <div className="ttt-character-side ttt-character-right"><ArenaMascot side="coral" mood={mascotMood} /></div>
      </main>

      <footer className="ttt-arena-footer relative z-10">
        <span><i /> {lang === 'my' ? 'ကစားကွက်ကို ဗျူဟာကျကျ ရွေးချယ်ပါ' : 'THINK AHEAD. OWN THE GRID.'}</span>
        {isFinished && onLeaveFinished && <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} type="button" onClick={onLeaveFinished} className="ttt-rematch-button">{lang === 'my' ? 'Lobby သို့ ပြန်သွားမည်' : 'BACK TO LOBBY'} <b>↗</b></motion.button>}
      </footer>
    </section>
  );
};

export default TicTacToeBoard;
