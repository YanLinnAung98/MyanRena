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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 sm:space-y-8">
      <section className="relative isolate overflow-hidden rounded-[1.6rem] border border-amber-300/20 bg-[#101a2b] shadow-[0_22px_70px_rgba(0,0,0,.28)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_20%,rgba(201,153,65,.2),transparent_38%),radial-gradient(ellipse_at_10%_100%,rgba(29,78,216,.18),transparent_42%),linear-gradient(115deg,#111b2d_0%,#0c1422_58%,#171b28_100%)]" />
        <div className="absolute right-[-4rem] top-[-7rem] -z-10 h-64 w-64 rounded-full border border-amber-200/10 shadow-[0_0_0_28px_rgba(255,255,255,.015),0_0_0_60px_rgba(255,255,255,.012)]" />
        <div className="grid lg:grid-cols-[1.25fr_.75fr] items-center gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-[10px] font-bold tracking-[.18em] text-amber-200"><Sparkles className="h-3.5 w-3.5"/>MYANRENA • GAME CENTER</div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[3.25rem] leading-[1.12] font-black tracking-tight text-white">
              {isMy ? <>အနိုင်ရဖို့<br/><span className="text-amber-300">အသင့်ဖြစ်ပြီလား?</span></> : <>Your next<br/><span className="text-amber-300">victory starts here.</span></>}
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-7 text-slate-300">{isMy ? 'ကိုယ်ကြိုက်တဲ့ဂိမ်းကို ရွေးချယ်ပြီး AI၊ သူငယ်ချင်းများ၊ အွန်လိုင်းပြိုင်ဘက်များနဲ့ ယှဉ်ပြိုင်လိုက်ပါ။' : 'Choose your arena, sharpen your strategy and challenge friends or players across the community.'}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#game-selection" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 text-sm font-extrabold text-[#17130b] shadow-[0_8px_24px_rgba(234,179,8,.18)] transition hover:-translate-y-0.5 hover:brightness-105">{isMy ? 'ဂိမ်းရွေးချယ်မည်' : 'Explore games'}<ArrowUpRight className="h-4 w-4"/></a>
              <div className="flex items-center gap-2 text-xs text-slate-400"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"/><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"/></span>{isMy ? 'ကစားသမားများ အဆင်သင့်ရှိနေသည်' : 'Community is ready to play'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm"><div className="flex items-center gap-2 text-slate-400"><Users className="h-4 w-4 text-emerald-300"/><span className="text-[10px] font-bold uppercase tracking-wider">{isMy ? 'အွန်လိုင်း' : 'Players online'}</span></div><div className="mt-3 text-3xl font-black tabular-nums text-white">{onlineCount.toLocaleString()}</div><div className="mt-1 text-[10px] text-emerald-300">{isMy ? 'အသိုင်းအဝိုင်း' : 'Community'}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm"><div className="flex items-center gap-2 text-slate-400"><CircleDot className="h-4 w-4 text-amber-300"/><span className="text-[10px] font-bold uppercase tracking-wider">{isMy ? 'ဖွင့်ထားသောအခန်း' : 'Open rooms'}</span></div><div className="mt-3 text-3xl font-black tabular-nums text-white">{totalRooms.toLocaleString()}</div><div className="mt-1 text-[10px] text-amber-300">{isMy ? 'ပါဝင်ကစားနိုင်သည်' : 'Ready to join'}</div></div>
            <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-amber-200/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 min-w-0"><Crown className="h-5 w-5 shrink-0 text-amber-300"/><div className="min-w-0"><div className="text-xs font-bold text-white truncate">{currentUser?.displayName || (isMy ? 'ကစားသမား' : 'Player')}</div><div className="text-[10px] text-slate-400">{isMy ? 'သင့်ရဲ့ Arena ခရီးစဉ်' : 'Your arena journey'}</div></div></div>
              <div className="text-right shrink-0"><div className="text-sm font-black text-amber-200">{(currentUser?.xp || 0).toLocaleString()} XP</div><div className="text-[10px] uppercase tracking-wider text-slate-500">{currentUser?.rank || 'Rookie'} rank</div></div>
            </div>
          </div>
        </div>
      </section>
      <section id="game-selection" className="scroll-mt-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-bold tracking-[.2em] text-amber-300/80 uppercase">{isMy ? 'ရွေးချယ်ပြီး စတင်ပါ' : 'PICK YOUR BATTLE'}</div><h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2"><Swords className="h-5 w-5 text-amber-300"/>{isMy ? 'သင့်ရဲ့ Game Arena' : 'Choose your arena'}</h2><p className="mt-1 text-xs sm:text-sm text-slate-400">{isMy ? 'ဂိမ်းတစ်ခုကို ရွေးပြီး ကစားမည့်ပုံစံကို သတ်မှတ်ပါ။' : 'Select a game to configure your match.'}</p></div><div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-slate-400"><Zap className="h-3.5 w-3.5 text-amber-300"/>{isMy ? 'ဂိမ်း ၄ မျိုး ရရှိနိုင်သည်' : '4 ARENAS AVAILABLE'}</div></div>
        <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
          {FULL_GAME_CARDS.map((game, index) => {
            const locked = Boolean(featureLocks?.[game.id]);
            return <TiltCard3D key={game.id} disabled={locked} glowColor={game.glow} onClick={() => {if (!locked) setSelectedGame(game.id);}} className="group relative block overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-[#101a2b] text-left shadow-[0_12px_35px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_20px_48px_rgba(0,0,0,.34)]">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.accent} to-transparent opacity-70`}/>
              <div className="relative overflow-hidden"><div className="h-[190px] sm:h-[210px] lg:h-[225px] overflow-hidden bg-[#080e19]"><GameStage3D gameType={game.id} compact/></div><div className="absolute inset-0 bg-gradient-to-t from-[#0c1422] via-[#0c1422]/10 to-transparent"/>
                <div className="absolute left-4 top-4 flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#070b13]/80 px-2.5 py-1.5 text-[9px] font-extrabold tracking-[.12em] text-amber-200 backdrop-blur-md"><GameBadgeIcon gameType={game.id} className="h-4 w-4"/>{game.badgeText}</span><span className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[9px] font-bold text-white/80 backdrop-blur-md">{game.players}</span></div>
                {locked && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><Lock className="h-3 w-3"/>LOCKED</span>}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3"><div><div className="mb-1 text-[9px] font-bold tracking-[.2em] text-amber-200/80">{String(index+1).padStart(2,'0')} / ARENA</div><h3 className="text-xl sm:text-2xl font-black leading-tight text-white drop-shadow">{isMy ? game.titleMy : game.titleEn}</h3></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-300 text-[#18130a] shadow-lg transition group-hover:scale-105 group-hover:bg-yellow-200"><ChevronRight className="h-5 w-5"/></div></div>
              </div>
              <div className="relative flex items-center justify-between gap-3 border-t border-white/[0.07] bg-[#101a2b]/95 px-4 py-3.5 sm:px-5"><div className="min-w-0"><p className="truncate text-xs sm:text-sm text-slate-300">{isMy ? game.taglineMy : game.taglineEn}</p><p className="mt-1 text-[9px] font-bold tracking-[.16em] text-slate-500">{game.pace}</p></div><span className="shrink-0 text-[10px] font-bold text-amber-200/80 transition group-hover:text-amber-100">{locked ? (isMy ? 'ပိတ်ထားသည်' : 'Unavailable') : (isMy ? 'ကစားမည်' : 'PLAY NOW')}</span></div>
            </TiltCard3D>;
          })}
        </div>
      </section>
    </div>
  );
};
