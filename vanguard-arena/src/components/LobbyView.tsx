import React from 'react';
import { ArrowUpRight, ChevronRight, CircleDot, Crown, Lock, Sparkles, Swords, Users, Zap } from 'lucide-react';
import type { GameType, LandingContent, Language, UserProfile } from '../types.ts';
import { GameStage3D, TiltCard3D } from './Game3DVisuals.tsx';
import { GameBadgeIcon } from './PremiumIcons.tsx';
import { GameArenaSetupView } from './GameArenaSetupView.tsx';

type Difficulty = 'easy' | 'medium' | 'hard';
type TurnTimeLimit = 15 | 20 | 30;

interface LobbyViewProps {
  lang: Language;
  landingContent?: LandingContent;
  currentUser?: UserProfile | null;
  onlinePlayers?: UserProfile[];
  frames: any[];
  featureLocks: Record<string, boolean>;
  matchmakingSettings?: any;
  queuedGame: GameType | null;
  sakarQuickCount?: number;
  openRooms: any[];
  onStartBot: (gameType: GameType, difficulty: Difficulty, bestOf: 3 | 5, turnTimeLimit: TurnTimeLimit) => void | Promise<void>;
  onJoinQueue: (gameType: GameType, bestOf: 3 | 5, turnTimeLimit: TurnTimeLimit) => void | Promise<void>;
  onLeaveQueue: () => void | Promise<void>;
  onStartSakarSolo: () => void | Promise<void>;
  onJoinSakarQuick?: () => void;
  onStartSakarQuickNow?: () => void;
  onCreateSakarRoom: (title: string, maxPlayers: number, gameType: GameType) => void | Promise<void>;
  onJoinSakarRoom: (roomIdOrCode: string) => void | Promise<void>;
  onSendChallenge?: (userId: string, gameType: GameType) => void;
  onInspectPlayer: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
}

const FULL_GAME_CARDS = [
  { id: 'connect4', titleMy: '၄ လုံးတန်း (Connect 4)', titleEn: '4 in a Row', taglineMy: 'ဗျူဟာကျကျ အကွက်ချပြီး အနိုင်ယူပါ', taglineEn: 'Own the board. Connect four to win.', badgeText: 'TACTICAL DUEL', accent: 'from-blue-500/25 via-blue-500/5', glow: 'rgba(59, 130, 246, 0.28)', players: '1 VS 1', pace: 'STRATEGY' },
  { id: 'tictactoe', titleMy: 'X / O အကွက်ချ', titleEn: 'Tic-Tac-Toe', taglineMy: 'အချိန်တိုအတွင်း ဉာဏ်စမ်းယှဉ်ပြိုင်ပါ', taglineEn: 'A quick 3×3 battle of sharp decisions.', badgeText: 'QUICK MATCH', accent: 'from-cyan-500/25 via-cyan-500/5', glow: 'rgba(56, 189, 248, 0.28)', players: '1 VS 1', pace: 'QUICK PLAY' },
  { id: 'rps', titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး', titleEn: 'Rock Paper Scissors', taglineMy: 'ပြိုင်ဘက်ရဲ့ စိတ်ကို ဖတ်ပြီး အနိုင်ယူပါ', taglineEn: 'Read the rival. Predict the next move.', badgeText: 'MIND GAME', accent: 'from-fuchsia-500/25 via-fuchsia-500/5', glow: 'rgba(244, 114, 182, 0.28)', players: '1 VS 1', pace: 'REFLEX' },
  { id: 'sakarhtar', titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်း', titleEn: 'Wise Owl Quiz', taglineMy: 'မြန်မာ့စကားထာနှင့် ဗဟုသုတကို စမ်းသပ်ပါ', taglineEn: 'Myanmar riddles and trivia for up to 8.', badgeText: 'MYANMAR QUIZ', accent: 'from-amber-500/25 via-amber-500/5', glow: 'rgba(251, 191, 36, 0.3)', players: '1–8 PLAYERS', pace: 'KNOWLEDGE' },
] as const;

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang, currentUser, onlinePlayers = [], featureLocks, queuedGame, openRooms,
  onStartBot, onJoinQueue, onLeaveQueue, onStartSakarSolo, onCreateSakarRoom, onJoinSakarRoom,
}) => {
  const [selectedGame, setSelectedGame] = React.useState<GameType | null>(null);
  const isMy = lang === 'my';
  const onlineCount = onlinePlayers.filter((player) => player?.online).length;
  const totalRooms = Array.isArray(openRooms) ? openRooms.length : 0;

  if (selectedGame) return (
    <GameArenaSetupView lang={lang} gameType={selectedGame} featureLocks={featureLocks}
      openRooms={Array.isArray(openRooms) ? openRooms : []} queuedGame={queuedGame}
      onBack={() => setSelectedGame(null)} onJoinQueue={onJoinQueue} onLeaveQueue={onLeaveQueue}
      onStartBot={onStartBot} onStartSakarSolo={onStartSakarSolo}
      onCreateRoom={onCreateSakarRoom} onJoinRoom={onJoinSakarRoom} />
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 pb-5 space-y-4 sm:space-y-5">
      <section className="mr-arena-banner flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <div className="text-[10px] font-bold tracking-[.18em] text-amber-300/80 uppercase">MYANRENA • GAME CENTER</div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-white">{isMy ? 'ဂိမ်းခန်းမ' : 'Game Hall'}</h1>
          <p className="mt-1 text-xs text-slate-400">{isMy ? 'ဂိမ်းရွေးပြီး ချက်ချင်းကစားပါ။' : 'Choose a game and jump straight in.'}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400"/>{onlineCount} {isMy ? 'အွန်လိုင်း' : 'online'}</span>
          <span className="h-4 w-px bg-white/10"/>
          <span>{totalRooms} {isMy ? 'အခန်း' : 'rooms'}</span>
        </div>
      </section>
      <section id="game-selection" className="scroll-mt-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-bold tracking-[.2em] text-amber-300/80 uppercase">{isMy ? 'ရွေးချယ်ပြီး စတင်ပါ' : 'PICK YOUR BATTLE'}</div><h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2"><Swords className="h-5 w-5 text-amber-300"/>{isMy ? 'သင့်ရဲ့ Game Arena' : 'Choose your arena'}</h2><p className="mt-1 text-xs sm:text-sm text-slate-400">{isMy ? 'ဂိမ်းတစ်ခုကို ရွေးပြီး ကစားမည့်ပုံစံကို သတ်မှတ်ပါ။' : 'Select a game to configure your match.'}</p></div><div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-slate-400"><Zap className="h-3.5 w-3.5 text-amber-300"/>{isMy ? 'ဂိမ်း ၄ မျိုး ရရှိနိုင်သည်' : '4 ARENAS AVAILABLE'}</div></div>
        <div className="mr-game-grid xl:grid-cols-4">
          {FULL_GAME_CARDS.map((game, index) => {
            const locked = Boolean(featureLocks?.[game.id]);
            return <TiltCard3D key={game.id} disabled={locked} glowColor={game.glow} onClick={() => {if (!locked) setSelectedGame(game.id);}} className="mr-interactive-card mr-game-card group relative block overflow-hidden rounded-2xl sm:rounded-[1.35rem] border border-white/[0.12] bg-[#101a2b] text-left shadow-[0_12px_35px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/50 hover:shadow-[0_24px_56px_rgba(0,0,0,.42)]">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.accent} to-transparent opacity-70`}/>
              <div className="relative overflow-hidden"><div className="mr-game-card-media h-[128px] sm:h-[154px] lg:h-[168px] overflow-hidden bg-[#080e19]"><GameStage3D gameType={game.id} compact/></div><div className="absolute inset-0 bg-gradient-to-t from-[#0c1422] via-[#0c1422]/10 to-transparent"/>
                <div className="absolute left-2 top-2 flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#070b13]/80 px-2.5 py-1.5 text-[9px] font-extrabold tracking-[.12em] text-amber-100 shadow-[0_5px_20px_rgba(0,0,0,.3)] backdrop-blur-md"><GameBadgeIcon gameType={game.id} className="h-6 w-6 drop-shadow-[0_2px_8px_rgba(255,255,255,.18)]"/>{game.badgeText}</span><span className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[9px] font-bold text-white/80 backdrop-blur-md">{game.players}</span></div>
                {locked && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><Lock className="h-3 w-3"/>LOCKED</span>}
                <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-3"><div><div className="mb-1 text-[9px] font-bold tracking-[.2em] text-amber-200/80">{String(index+1).padStart(2,'0')} / ARENA</div><h3 className="mr-game-card-title text-sm sm:text-lg font-black leading-tight text-white drop-shadow">{isMy ? game.titleMy : game.titleEn}</h3></div><div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-300 text-[#18130a] shadow-lg transition group-hover:scale-105 group-hover:bg-yellow-200"><ChevronRight className="h-5 w-5"/></div></div>
              </div>
              <div className="relative flex items-center justify-between gap-3 border-t border-white/[0.07] bg-[#101a2b]/95 px-2.5 py-2 sm:px-3"><div className="min-w-0"><p className="truncate text-[10px] sm:text-xs leading-snug text-slate-300">{isMy ? game.taglineMy : game.taglineEn}</p><p className="mt-0.5 text-[8px] font-bold tracking-wider text-slate-500">{game.pace}</p></div><span className="shrink-0 text-[9px] font-bold text-amber-200/80 transition group-hover:text-amber-100">{locked ? (isMy ? 'ပိတ်ထားသည်' : 'Unavailable') : (isMy ? 'ကစားမည်' : 'PLAY NOW')}</span></div>
            </TiltCard3D>;
          })}
        </div>
      </section>
    </div>
  );
};
