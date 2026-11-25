
import React from 'react';
import { ChevronRight, Lock, Sparkles, Swords } from 'lucide-react';
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
  {
    id: 'connect4',
    titleMy: '၄ လုံးတန်း (Connect 4)',
    titleEn: '4 in a Row',
    taglineMy: '3D ဗျူဟာကျကျ ၄ လုံးတန်းအောင် ချကစားပါ',
    taglineEn: 'Classic 3D tactical disc drop showdown',
    badgeText: '1v1 STRATEGY',
    glow: 'rgba(59, 130, 246, 0.35)',
    borderAccent: 'hover:border-blue-400/70',
  },
  {
    id: 'tictactoe',
    titleMy: 'X / O အကွက်ချ',
    titleEn: 'Tic-Tac-Toe',
    taglineMy: 'မြန်ဆန်တိကျသော X / O ဗျူဟာပြိုင်ပွဲ',
    taglineEn: 'A quick, strategic 3×3 classic duel',
    badgeText: 'FAST DUEL',
    glow: 'rgba(56, 189, 248, 0.35)',
    borderAccent: 'hover:border-sky-400/70',
  },
  {
    id: 'rps',
    titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
    titleEn: 'Rock Paper Scissors',
    taglineMy: 'Best of 3 / 5 စိတ်ဖတ် ယှဉ်ပြိုင်မှု',
    taglineEn: 'Best-of-3 / 5 mind-reading clash',
    badgeText: 'REFLEX CLASH',
    glow: 'rgba(244, 114, 182, 0.35)',
    borderAccent: 'hover:border-pink-400/70',
  },
  {
    id: 'sakarhtar',
    titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်း',
    titleEn: 'Wise Owl Quiz',
    taglineMy: 'မြန်မာ့စကားထာနှင့် ဗဟုသုတ ဉာဏ်စမ်း (1–8 ဦး)',
    taglineEn: 'Myanmar riddles & trivia (Up to 8P)',
    badgeText: '1–8 PLAYERS',
    glow: 'rgba(251, 191, 36, 0.38)',
    borderAccent: 'hover:border-amber-400/70',
  },
] as const;

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang,
  featureLocks,
  queuedGame,
  openRooms,
  onStartBot,
  onJoinQueue,
  onLeaveQueue,
  onStartSakarSolo,
  onCreateSakarRoom,
  onJoinSakarRoom,
}) => {
  const [selectedGame, setSelectedGame] = React.useState<GameType | null>(null);

  if (selectedGame) {
    return (
      <GameArenaSetupView
        lang={lang}
        gameType={selectedGame}
        featureLocks={featureLocks}
        openRooms={Array.isArray(openRooms) ? openRooms : []}
        queuedGame={queuedGame}
        onBack={() => setSelectedGame(null)}
        onJoinQueue={onJoinQueue}
        onLeaveQueue={onLeaveQueue}
        onStartBot={onStartBot}
        onStartSakarSolo={onStartSakarSolo}
        onCreateRoom={onCreateSakarRoom}
        onJoinRoom={onJoinSakarRoom}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>
              {lang === 'my'
                ? 'ကစားလိုသော ဂိမ်းကို ရွေးချယ်ပါ'
                : 'Choose Your Game Arena'}
            </span>
          </h3>

          <span className="text-[11px] text-amber-300/90 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {lang === 'my'
              ? 'နှိပ်ဝင်၍ စိတ်ကြိုက်ပြင်ဆင် ဆော့ပါ'
              : 'Tap card to configure & play'}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FULL_GAME_CARDS.map((game) => {
            const locked = Boolean(featureLocks?.[game.id]);

            return (
              <TiltCard3D
                key={game.id}
                disabled={locked}
                glowColor={game.glow}
                onClick={() => {
                  if (!locked) {
                    setSelectedGame(game.id);
                  }
                }}
                className={`cyber-panel overflow-hidden rounded-2xl border border-white/10 ${game.borderAccent} shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl`}
              >
                <div className="relative flex flex-col h-full">
                  <div className="relative overflow-hidden">
                    <GameStage3D gameType={game.id} compact />

                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                        <GameBadgeIcon gameType={game.id} className="w-4 h-4" />
                        <span>{game.badgeText}</span>
                      </span>

                      {locked && (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-600/90 text-[10px] font-bold text-white flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-gradient-to-b from-[#172338] to-[#101827] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base sm:text-lg font-display font-extrabold text-white truncate">
                        {lang === 'my' ? game.titleMy : game.titleEn}
                      </h4>

                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {lang === 'my' ? game.taglineMy : game.taglineEn}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl cyber-cta-gold text-slate-950 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      </div>
    </div>
  );
};
