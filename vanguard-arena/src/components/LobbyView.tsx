import React from 'react';
import { ChevronRight, Lock, Sparkles, Swords } from 'lucide-react';
import type { GameType, LandingContent, Language, Tournament, UserProfile } from '../types.ts';
import { GameStage3D, TiltCard3D } from './Game3DVisuals.tsx';
import { GameBadgeIcon } from './PremiumIcons.tsx';
import { TournamentBillboard } from './TournamentBillboard.tsx';

interface LobbyViewProps {
  lang: Language;
  landingContent?: LandingContent;
  currentUserId?: string;
  frames: any[];
  featureLocks: Record<string, boolean>;
  tournaments: Tournament[];
  allUsers: UserProfile[];
  onSelectGame: (gameType: GameType) => void;
  onInspectPlayer: (userId: string) => void;
  onOpenTournaments: () => void;
  onEnterTournamentMatch?: (tournament: Tournament, matchupId?: string) => void;
}

const FULL_GAME_CARDS: Array<{
  id: GameType;
  titleMy: string;
  titleEn: string;
  taglineMy: string;
  taglineEn: string;
  badgeText: string;
  glow: string;
  borderAccent: string;
}> = [
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
    titleEn: 'Tic-Tac-Toe Neon',
    taglineMy: 'မြန်ဆန်တိကျသော 3D Neon ဉာဏ်ရည်ပြိုင်ပွဲ',
    taglineEn: 'Fast-paced 3D hologram 3×3 duel',
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
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang,
  currentUserId,
  frames,
  featureLocks,
  tournaments,
  allUsers,
  onSelectGame,
  onInspectPlayer,
  onOpenTournaments,
  onEnterTournamentMatch,
}) => {
  const safeTourneys = Array.isArray(tournaments) ? tournaments : [];
  const safeUsers = Array.isArray(allUsers) ? allUsers : [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* 1. LIVE PREMIUM TOURNAMENT BILLBOARD (Only renders when an active/featured tournament exists) */}
      <TournamentBillboard
        lang={lang}
        tournaments={safeTourneys}
        allUsers={safeUsers}
        currentUserId={currentUserId}
        frames={frames}
        onInspectPlayer={onInspectPlayer}
        onOpenTournaments={onOpenTournaments}
        onEnterTournamentMatch={onEnterTournamentMatch}
      />

      {/* 2. CLEAN FULL-SIZE 3D INTERACTIVE GAME CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>{lang === 'my' ? 'ကစားလိုသော ဂိမ်းကို ရွေးချယ်ပါ' : 'Choose Your Game Arena'}</span>
          </h3>
          <span className="text-[11px] text-amber-300/90 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {lang === 'my' ? 'နှိပ်ဝင်၍ စိတ်ကြိုက်ပြင်ဆင် ဆော့ပါ' : 'Tap card to configure & play'}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FULL_GAME_CARDS.map((g) => {
            const locked = Boolean(featureLocks?.[g.id]);
            return (
              <TiltCard3D
                key={g.id}
                disabled={locked}
                glowColor={g.glow}
                onClick={() => onSelectGame(g.id)}
                className={`cyber-panel overflow-hidden border border-white/15 ${g.borderAccent} shadow-xl`}
              >
                <div className="relative flex flex-col h-full">
                  <div className="relative overflow-hidden">
                    <GameStage3D gameType={g.id} compact />

                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                        <GameBadgeIcon gameType={g.id} className="w-4 h-4" />
                        <span>{g.badgeText}</span>
                      </span>

                      {locked && (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-600/90 text-[10px] font-bold text-white flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-[#0c1324] to-[#070b14] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base sm:text-lg font-display font-extrabold text-white truncate">
                        {lang === 'my' ? g.titleMy : g.titleEn}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {lang === 'my' ? g.taglineMy : g.taglineEn}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl cyber-cta-gold text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
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
