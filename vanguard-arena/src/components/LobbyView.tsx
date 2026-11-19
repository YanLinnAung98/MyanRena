import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Bot,
  Check,
  Copy,
  Lock,
  Play,
  Plus,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import type { GameType, Language, Tournament, UserProfile } from '../types.ts';
import { GAME_ARTWORKS, resolveBannerImage } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, RankTierIcon } from './PremiumIcons.tsx';
import { TournamentBillboard } from './TournamentBillboard.tsx';

interface LobbyViewProps {
  lang: Language;
  user: UserProfile;
  frames: any[];
  featureLocks: Record<string, boolean>;
  tournaments: Tournament[];
  onlinePlayers: UserProfile[];
  openRooms: any[];
  queuedGame: GameType | null;
  onQuickMatch: (gameType: GameType) => void;
  onCancelQueue: () => void;
  onPlayBot: (gameType: GameType, difficulty: 'easy' | 'medium' | 'hard') => void;
  onCreateRoom: (gameType: GameType) => void;
  onJoinRoom: (roomIdOrCode: string) => void;
  onInspectPlayer: (userId: string) => void;
  onOpenTournaments: () => void;
  onOpenProfile: () => void;
  onNotify: (level: string, message: string) => void;
}

const GAMES: Array<{
  id: GameType;
  titleEn: string;
  titleMy: string;
  descMy: string;
  descEn: string;
  accent: string;
}> = [
  {
    id: 'connect4',
    titleEn: '4 in a Row',
    titleMy: '၄ လုံးတန်း (Connect 4)',
    descMy: 'ဗျူဟာကျကျ ၄ လုံးတန်းအောင် ချကစားပါ',
    descEn: 'Drop discs strategically to connect four.',
    accent: 'from-blue-600/25 to-amber-500/20',
  },
  {
    id: 'tictactoe',
    titleEn: 'Tic-Tac-Toe',
    titleMy: 'X / O အကွက်ချ',
    descMy: 'မြန်ဆန်တိကျသော ၃x၃ ဉာဏ်ရည်ပြိုင်ပွဲ',
    descEn: 'Fast-paced 3x3 tactical duel.',
    accent: 'from-sky-500/25 to-indigo-500/20',
  },
  {
    id: 'rps',
    titleEn: 'Rock Paper Scissors',
    titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
    descMy: 'Best of 3 စိတ်ဖတ် ယှဉ်ပြိုင်မှု',
    descEn: 'Best-of-3 reflex & mind game.',
    accent: 'from-pink-600/25 to-amber-500/20',
  },
  {
    id: 'sakarhtar',
    titleEn: 'Wise Owl Quiz',
    titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်း',
    descMy: 'မြန်မာ့စကားထာနှင့် ဗဟုသုတ ဉာဏ်စမ်း',
    descEn: 'Myanmar riddles & rapid trivia showdown.',
    accent: 'from-amber-600/25 to-orange-500/20',
  },
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang,
  user,
  frames,
  featureLocks,
  tournaments,
  onlinePlayers,
  openRooms,
  queuedGame,
  onQuickMatch,
  onCancelQueue,
  onPlayBot,
  onCreateRoom,
  onJoinRoom,
  onInspectPlayer,
  onOpenTournaments,
  onOpenProfile,
  onNotify,
}) => {
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [copiedId, setCopiedId] = React.useState(false);
  const [botDiff, setBotDiff] = React.useState<'easy' | 'medium' | 'hard'>('medium');

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
        tournaments={tournaments}
        allUsers={onlinePlayers}
        frames={frames}
        onInspectPlayer={onInspectPlayer}
        onOpenTournaments={onOpenTournaments}
      />

      {/* 2. PLAYER BANNER IDENTITY CARD */}
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

          {/* Join Private Room by Code */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (roomCodeInput.trim()) {
                onJoinRoom(roomCodeInput.trim());
                setRoomCodeInput('');
              }
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder={lang === 'my' ? 'Room Code ထည့်ရန်...' : 'Enter Room Code...'}
              className="flex-1 sm:w-44 h-9 px-3 rounded-xl bg-[#070b14]/90 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3.5 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white cursor-pointer"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {/* Matchmaking Banner if Queued */}
      {queuedGame && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-200">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              {lang === 'my'
                ? `ပြိုင်ဘက် ရှာဖွေနေပါသည် (${queuedGame})...`
                : `Searching for opponent (${queuedGame})...`}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelQueue}
            className="px-3 py-1 rounded-lg bg-rose-500/25 text-rose-200 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3. FOUR PREMIUM GAME ARENA CARDS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>{lang === 'my' ? 'ဂိမ်းကစားကွင်းများ ရွေးချယ်ပါ' : 'Select Game Arena'}</span>
          </h3>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Bot AI:</span>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setBotDiff(d)}
                className={`px-2 py-0.5 rounded-md font-bold uppercase cursor-pointer ${
                  botDiff === d
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {GAMES.map((g) => {
            const locked = Boolean(featureLocks?.[g.id]);
            return (
              <motion.div
                key={g.id}
                whileHover={{ y: -3 }}
                className="cyber-panel rounded-2xl overflow-hidden border border-white/10 hover:border-amber-400/45 flex flex-col justify-between transition-all"
              >
                <div className="h-36 relative bg-[#070b14] overflow-hidden">
                  <img
                    src={GAME_ARTWORKS[g.id]}
                    alt={g.titleEn}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${g.accent} via-transparent to-transparent`} />
                  <div className="absolute top-2.5 left-2.5 p-1.5 rounded-xl bg-black/70 border border-white/15">
                    <GameBadgeIcon gameType={g.id} className="w-5 h-5" />
                  </div>
                  {locked && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
                      <Lock className="w-4 h-4" /> Locked
                    </div>
                  )}
                </div>

                <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-display font-bold text-white">
                      {lang === 'my' ? g.titleMy : g.titleEn}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {lang === 'my' ? g.descMy : g.descEn}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onQuickMatch(g.id)}
                      className="w-full h-9 rounded-xl cyber-cta-gold disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{lang === 'my' ? 'အွန်လိုင်း ယှဉ်ပြိုင်မည်' : 'Quick Match'}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onPlayBot(g.id, botDiff)}
                        className="h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5 text-sky-400" /> Solo AI
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onCreateRoom(g.id)}
                        className="h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" /> Room
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. OPEN ROOMS & LIVE PLAYERS DIRECTORY */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Open Rooms */}
        <div className="lg:col-span-5 cyber-panel rounded-2xl p-4 space-y-2.5 border border-white/10">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            {lang === 'my' ? `ဖွင့်ထားသော အခန်းများ (${openRooms.length})` : `Open Rooms (${openRooms.length})`}
          </h3>
          {openRooms.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">
              {lang === 'my' ? 'လက်ရှိ ဖွင့်ထားသော Room မရှိသေးပါ။' : 'No open rooms yet.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {openRooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-2.5 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GameBadgeIcon gameType={rm.gameType} className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-amber-300 truncate">{rm.code}</div>
                      <div className="text-[10px] text-slate-400">
                        {(rm.players || []).length}/{rm.maxPlayers || 2} Players
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJoinRoom(rm.id)}
                    className="px-3 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Players Strip (Click to Inspect Profile) */}
        <div className="lg:col-span-7 cyber-panel rounded-2xl p-4 space-y-2.5 border border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? `ကစားသမားများ (${onlinePlayers.length})` : `Arena Players (${onlinePlayers.length})`}</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              {lang === 'my' ? 'နှိပ်၍ Profile ကြည့်မည်' : 'Tap to inspect'}
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {onlinePlayers.slice(0, 16).map((p) => {
              const isLive = Boolean(p.online && Date.now() - Number(p.lastSeenMs || 0) < 90000);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onInspectPlayer(p.id)}
                  className="min-w-[145px] p-2.5 rounded-xl bg-[#070b14] border border-white/10 hover:border-amber-400/45 flex items-center gap-2 text-left shrink-0 cursor-pointer transition-all"
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
    </div>
  );
};
