import React from 'react';
import {
  Award,
  Check,
  ChevronRight,
  Copy,
  Lock,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import type { GameType, LandingContent, Language, Tournament, UserProfile } from '../types.ts';
import { resolveBannerImage } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameStage3D, TiltCard3D } from './Game3DVisuals.tsx';
import { GameBadgeIcon, RankTierIcon } from './PremiumIcons.tsx';
import { TournamentBillboard } from './TournamentBillboard.tsx';

interface LobbyViewProps {
  lang: Language;
  landingContent?: LandingContent;
  user: UserProfile;
  frames: any[];
  featureLocks: Record<string, boolean>;
  tournaments: Tournament[];
  onlinePlayers: UserProfile[];
  onSelectGame: (gameType: GameType) => void;
  onInspectPlayer: (userId: string) => void;
  onOpenTournaments: () => void;
  onOpenProfile: () => void;
  onNotify: (level: string, message: string) => void;
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
  user,
  frames,
  featureLocks,
  tournaments,
  onlinePlayers,
  onSelectGame,
  onInspectPlayer,
  onOpenTournaments,
  onOpenProfile,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = React.useState(false);

  const safePlayers = Array.isArray(onlinePlayers) ? onlinePlayers : [];
  const safeTourneys = Array.isArray(tournaments) ? tournaments : [];
  const bannerSrc = resolveBannerImage(user.bannerUrl, user.bannerId);
  const giftsCount = Array.isArray(user.gifts) ? user.gifts.length : 0;

  const handleCopyMyId = () => {
    navigator.clipboard?.writeText(user.gameId);
    setCopiedId(true);
    onNotify('success', `Copied Game ID: ${user.gameId}`);
    setTimeout(() => setCopiedId(false), 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* 1. LIVE PREMIUM TOURNAMENT BILLBOARD */}
      <TournamentBillboard
        lang={lang}
        tournaments={safeTourneys}
        allUsers={safePlayers}
        frames={frames}
        onInspectPlayer={onInspectPlayer}
        onOpenTournaments={onOpenTournaments}
      />

      {/* 2. PLAYER BANNER IDENTITY CARD (Real-Time Display Name & Bio) */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-amber-500/25 relative">
        <img
          src={bannerSrc}
          alt="Player Banner"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#0b101d]/85 to-[#070b14]/70 pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button type="button" onClick={onOpenProfile} className="cursor-pointer shrink-0">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                frameId={user.frameId}
                frames={frames}
                displayName={user.displayName}
                size="md"
                status="online"
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-display font-bold text-white truncate">
                  {user.displayName}
                </h2>
                <RankTierIcon tier={user.rank || 'silver'} className="w-5 h-5 shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-[11px] font-mono font-bold text-amber-300 cursor-pointer"
                >
                  <span>{user.gameId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="text-xs font-mono text-slate-300">
                  {user.xp || 0} XP · {user.rank || 'Silver'}
                </span>
                {giftsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-[10px] font-bold text-amber-200">
                    <Award className="w-3 h-3 text-amber-400" /> {giftsCount} Trophies
                  </span>
                )}
              </div>
              {user.bio && (
                <p className="text-[11px] text-slate-300 truncate max-w-md mt-1">{user.bio}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="px-3.5 h-9 rounded-xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/40 text-xs font-bold text-white cursor-pointer"
          >
            {lang === 'my' ? 'Profile ပြင်မည်' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* 3. FULL-SIZE 3D INTERACTIVE GAME CARDS (Click -> Opens Next-Page Setup) */}
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
                  {/* Full 3D Animated Game Stage */}
                  <div className="relative overflow-hidden">
                    <GameStage3D gameType={g.id} compact />

                    {/* Top Floating Badges */}
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

                  {/* Clean Full-Card Footer */}
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

      {/* 4. LIVE PLAYERS DIRECTORY (Click any player -> Inspect Banner, Bio & Gifts) */}
      <div className="cyber-panel rounded-2xl p-4 space-y-2.5 border border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>
              {lang === 'my'
                ? `အွန်လိုင်း ကစားသမားများ (${safePlayers.length})`
                : `Arena Players (${safePlayers.length})`}
            </span>
          </h3>
          <span className="text-[10px] text-slate-400">
            {lang === 'my' ? 'နှိပ်၍ Profile & Bio ကြည့်မည်' : 'Tap to inspect profile'}
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {safePlayers.slice(0, 20).map((p) => {
            const isLive = Boolean(p.online && Date.now() - Number(p.lastSeenMs || 0) < 90000);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onInspectPlayer(p.id)}
                className="min-w-[156px] p-2.5 rounded-xl bg-[#070b14] border border-white/10 hover:border-amber-400/50 flex items-center gap-2.5 text-left shrink-0 cursor-pointer transition-all"
              >
                <AvatarWithFrame
                  avatarUrl={p.avatarUrl}
                  frameId={p.frameId}
                  frames={frames}
                  displayName={p.displayName}
                  size="xs"
                  status={isLive ? 'online' : 'offline'}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{p.displayName}</div>
                  <div className="text-[10px] font-mono text-amber-300">{p.xp || 0} XP</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
