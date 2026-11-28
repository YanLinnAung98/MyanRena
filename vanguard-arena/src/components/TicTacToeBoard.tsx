import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getPrimaryAssetBase, type ResolvedAsset } from '../config/connect4Assets.ts';

export interface TicTacToeBoardProps {
  lang?: 'my' | 'en' | string;
  match: any;
  currentUserId: string;
  onSelectCell?: (index: number) => void;
  onCellClick?: (index: number) => void;
  onMove?: (move: { index: number }) => void;
  onLeaveFinished?: () => void;
}

const TTT_ASSET_BASE = getPrimaryAssetBase();
export const TTT_KID_BOT_AVATAR_DATA_URI = `${TTT_ASSET_BASE}ttt-girl-idle.png`;
export function getTicTacToeBotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မပုတု' : 'Ma Pu Tu';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const EMPTY: ResolvedAsset = { kind: 'none', url: null };

const CharacterMedia: React.FC<{ asset: ResolvedAsset; fallback?: string; mood: 'idle'|'win'|'lose' }> = ({ asset, fallback, mood }) => (
  <motion.div className={`ttt-character-art mood-${mood}`} animate={mood === 'win' ? { y:[0,-10,0], rotate:[0,-2,2,0] } : mood === 'lose' ? { y:[0,3,0] } : { y:[0,-4,0] }} transition={{ duration:mood === 'idle'?3.8:.8, repeat:mood === 'idle'?Infinity:0, ease:'easeInOut' }}>
    {mood !== 'idle' ? <img src={mood === 'win' ? `${TTT_ASSET_BASE}ttt-girl-dance.jpg` : `${TTT_ASSET_BASE}ttt-girl-cry.jpg`} alt="" /> :
      asset.kind === 'video' && asset.url ? <video src={asset.url} autoPlay muted loop playsInline /> :
      asset.kind === 'image' && asset.url ? <img src={asset.url} alt="" /> :
      fallback ? <img src={fallback} alt="" /> : <div className="ttt-character-placeholder">✦</div>}
  </motion.div>
);

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({ lang='my', match, currentUserId, onSelectCell, onCellClick, onMove, onLeaveFinished }) => {
  const [scene, setScene] = useState<ResolvedAsset>(EMPTY);
  const [kid, setKid] = useState<ResolvedAsset>(EMPTY);

  useEffect(() => {
    // Tic-Tac-Toe owns its own art direction and never borrows Connect 4 media.
    setScene({ kind: 'image', url: `${TTT_ASSET_BASE}ttt-village-bg.jpg` });
    setKid({ kind: 'image', url: TTT_KID_BOT_AVATAR_DATA_URI });
  }, []);

  const board: Array<string|null> = useMemo(() => Array.isArray(match?.tttBoard) && match.tttBoard.length === 9 ? match.tttBoard : Array(9).fill(null), [match?.tttBoard]);
  const players = Array.isArray(match?.players) ? match.players : [];
  const opponent = players.find((p:any) => p?.id !== currentUserId);
  const currentPlayer = players.find((p:any) => p?.id === currentUserId);
  const opponentName = opponent?.displayName || getTicTacToeBotName(lang, match?.difficulty);
  const currentName = currentPlayer?.displayName || (lang === 'my' ? 'သင်' : 'You');
  const isFinished = match?.status === 'finished';
  const isPvp = Boolean(match?.isRealtimePvp && players.length >= 2);
  const isMyTurn = !isFinished && (!isPvp || match?.turnUserId === currentUserId);
  const isDraw = Boolean(match?.isDraw);
  const didWin = match?.winnerId === currentUserId;
  const winning = useMemo(() => {
    for (const [a,b,c] of WIN_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return new Set([a,b,c]);
    return new Set<number>();
  }, [board]);
  const status = isFinished
    ? isDraw ? (lang === 'my' ? 'သရေကျသွားပါပြီ' : "It's a draw!")
      : didWin ? (lang === 'my' ? 'သင် အနိုင်ရရှိပါပြီ' : 'You won!')
      : (lang === 'my' ? 'ပြိုင်ဘက် အနိုင်ရသွားပါပြီ' : 'Opponent won!')
    : isMyTurn ? (lang === 'my' ? 'သင့်အလှည့် — အကွက်တစ်ခု ရွေးပါ' : 'Your turn — choose a tile')
    : (lang === 'my' ? 'ပြိုင်ဘက် ကစားနေပါသည်' : "Opponent's turn");
  const mood = isFinished ? isDraw ? 'idle' : didWin ? 'win' : 'lose' : 'idle';
  const handlePress = (index:number) => {
    if (!isMyTurn || board[index] !== null) return;
    if (onSelectCell) onSelectCell(index);
    else if (onCellClick) onCellClick(index);
    else onMove?.({ index });
  };

  return (
    <section className="ttt-world" aria-label="Tic-Tac-Toe game">
      <div className="ttt-world-backdrop" style={scene.url ? { backgroundImage:`linear-gradient(180deg,rgba(12,20,25,.16),rgba(15,22,24,.56)),url("${scene.url}")` } : undefined} />
      <div className="ttt-world-vignette" />
      <header className="ttt-world-header">
        <div className="ttt-world-brand"><span>✦</span><div><b>TIC TAC TOE</b><small>{lang === 'my' ? 'မပုတုနှင့် ကစားမည်' : 'VILLAGE DUEL'}</small></div></div>
        <div className={`ttt-turn-tag ${isFinished?'finished':isMyTurn?'active':'waiting'}`}><i />{isFinished ? (isDraw?'DRAW':didWin?'VICTORY':'FINISHED') : isMyTurn?'YOUR TURN':'RIVAL TURN'}</div>
      </header>

      {/* Player identities are shown once in the persistent match scoreboard. */}
      <main className="ttt-play-area">
        <div className="ttt-scene-character ttt-scene-player" aria-label={currentName}>
          <motion.div className="ttt-player-portrait" animate={{ y:[0,-4,0] }} transition={{ duration:4.2, repeat:Infinity, ease:'easeInOut' }}>
            {currentPlayer?.avatarUrl
              ? <img src={currentPlayer.avatarUrl} alt="" />
              : <span>{currentName.slice(0,1).toUpperCase()}</span>}
          </motion.div>
          <span>{currentName}</span>
        </div>
        <div className="ttt-game-pedestal">
          <div className="ttt-game-title"><span>{lang === 'my' ? 'ကစားကွက်' : 'GAME BOARD'}</span><small>3 × 3</small></div>
          <div className="ttt-wood-board">
            <div className="ttt-board-inner">
              {board.map((cell,idx) => {
                const won = winning.has(idx);
                return <motion.button key={idx} type="button" disabled={!isMyTurn || cell !== null} onClick={() => handlePress(idx)} whileTap={isMyTurn && !cell ? { scale:.94 } : undefined} className={`ttt-wood-cell ${cell?'occupied':''} ${won?'winning':''}`} aria-label={`Cell ${idx+1}`}>
                  <span className="ttt-cell-number">{idx+1}</span>
                  <AnimatePresence mode="wait">
                    {cell === 'X' && <motion.span key="x" className="ttt-piece piece-x" initial={{scale:.3,opacity:0,rotate:-30}} animate={{scale:1,opacity:1,rotate:0}} exit={{scale:.7,opacity:0}}>✕</motion.span>}
                    {cell === 'O' && <motion.span key="o" className="ttt-piece piece-o" initial={{scale:.3,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.7,opacity:0}}>●</motion.span>}
                    {!cell && <motion.span key="empty" className="ttt-empty-mark" initial={{opacity:0}} whileHover={{opacity:1}}>＋</motion.span>}
                  </AnimatePresence>
                  {won && <span className="ttt-win-star">✦</span>}
                </motion.button>;
              })}
            </div>
          </div>
          <div className={`ttt-game-status ${isFinished?'done':isMyTurn?'my-turn':'their-turn'}`}><span className="ttt-status-medal">{isFinished ? (isDraw?'＝':didWin?'★':'◇') : '✦'}</span><b>{status}</b><i /></div>
        </div>
        <div className="ttt-scene-character"><CharacterMedia asset={kid} fallback={TTT_KID_BOT_AVATAR_DATA_URI} mood={mood as any} /><span>{opponentName}</span></div>
      </main>

      <footer className="ttt-world-footer">
        <span>{lang === 'my' ? 'စဉ်းစားပြီးမှ ရွှေ့ပါ — ပျော်ရွှင်စွာ ကစားပါ' : 'Think ahead. Have fun!'}</span>
        {isFinished && onLeaveFinished && <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} type="button" onClick={onLeaveFinished}>{lang === 'my' ? 'Lobby သို့ ပြန်သွားမည်' : 'BACK TO LOBBY'} <b>↗</b></motion.button>}
      </footer>
    </section>
  );
};

export default TicTacToeBoard;
