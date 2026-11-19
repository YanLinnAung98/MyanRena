import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  ChevronsRight,
  Lock,
  Play,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { GAME_LIST } from '../games/registry.ts';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Difficulty, GameType, LandingContent, Language, TurnTimeLimit, UserProfile } from '../types.ts';
import { GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface LobbyViewProps {
  lang: Language;
  landingContent: LandingContent;
  currentUser: UserProfile;
  onlinePlayers: UserProfile[];
  frames: any[];
  featureLocks: Record<string, boolean>;
  matchmakingSettings: any;
  queuedGame: GameType | null;
  sakarQuickCount: number;
  openRooms: any[];
  onStartBot: (gameType: GameType, difficulty: Difficulty, bestOf?: 3 | 5, turnTimeLimit?: TurnTimeLimit) => void;
  onJoinQueue: (gameType: GameType, bestOf?: 3 | 5, turnTimeLimit?: TurnTimeLimit) => void;
  onLeaveQueue: () => void;
  onStartSakarSolo: () => void;
  onJoinSakarQuick: () => void;
  onStartSakarQuickNow: () => void;
  onCreateSakarRoom: (title: string, maxPlayers: number, gameType?: GameType) => void;
  onJoinSakarRoom: (codeOrId: string) => void;
  onSendChallenge: (targetUserId: string, gameType: GameType) => void;
  onInspectPlayer: (userId: string) => void;
  onAddFriend: (targetUserId: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang,
  currentUser,
  onlinePlayers,
  frames,
  featureLocks,
  onStartBot,
  onJoinQueue,
  onStartSakarSolo,
  onCreateSakarRoom,
  onJoinSakarRoom,
  onSendChallenge,
  onInspectPlayer,
}) => {
  // null = Page 1 (Full Game Cards Only), GameType = Page 2 (Selected Game Launch Page)
  const [openedGameId, setOpenedGameId] = React.useState<GameType | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<'bot' | 'matchmaking' | 'custom'>('bot');
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [roomCodeInput, setRoomCodeInput] = React.useState('');

  const getGameDisplayTitle = (game: any) => {
    const norm = normalizeGameId(game.id);
    if (norm === 'sakarhtar') return lang === 'my' ? 'ဉာဏ်စမ်းပဟေဠိ' : 'Wise Owl Quiz';
    return lang === 'my' ? game.nameMy || game.name : game.name || game.nameMy;
  };

  const getGameBadge = (gameId: string) => {
    const norm = normalizeGameId(gameId);
    if (norm === 'connect4') return lang === 'my' ? '3D Gravity ဗျူဟာ' : '3D Strategy';
    if (norm === 'tictactoe') return lang === 'my' ? 'ကျေးလက် ကွပ်ပျစ် 3D' : 'Village 3D';
    if (norm === 'rps') return lang === 'my' ? 'ခေါင်းခေါက် 3D' : 'Head-Bonk 3D';
    return lang === 'my' ? 'ပညာရှိ ဇီးကွက် • ၁၀၀ ပုဒ်' : 'Wise Owl • 100 Qs';
  };

  const openedMeta = GAME_LIST.find((g) => g.id === openedGameId) || null;
  const normOpened = openedMeta ? normalizeGameId(openedMeta.id) : null;
  const isOpenedLocked = Boolean(
    openedMeta && (featureLocks?.[openedMeta.id] || (normOpened && featureLocks?.[normOpened]))
  );

  const handleOpenGame = (gameId: GameType) => {
    soundEngine.playCardSelect();
    setOpenedGameId(gameId);
    setSelectedMode('bot');
    setRoomCodeInput('');
  };

  const handleLaunch = () => {
    if (!openedMeta || isOpenedLocked) return;
    soundEngine.playClick();
    if (selectedMode === 'bot') {
      if (normOpened === 'sakarhtar') {
        onStartSakarSolo();
      } else {
        onStartBot(openedMeta.id, difficulty, bestOf, 20);
      }
    } else if (selectedMode === 'matchmaking') {
      onJoinQueue(openedMeta.id, bestOf, 20);
    } else {
      if (roomCodeInput.trim()) {
        onJoinSakarRoom(roomCodeInput.trim());
      } else {
        const maxP = normOpened === 'sakarhtar' ? 8 : 2;
        onCreateSakarRoom(`${currentUser.displayName}'s Room`, maxP, openedMeta.id);
      }
    }
  };

  const blockedIds: string[] = Array.isArray(currentUser.blocked) ? currentUser.blocked : [];
  const visibleOnline = onlinePlayers.filter(
    (u) => u.id !== currentUser.id && !blockedIds.includes(u.id)
  );

  return (
    <div className="h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-4.5rem)] max-w-6xl mx-auto px-3 sm:px-6 py-3 lg:py-5 overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ==============================================================
            PAGE 1: PURE FULL-VIEWPORT GAME SELECTION SCREEN (ONLY GAMES)
        ============================================================== */}
        {!openedMeta ? (
          <motion.div
            key="game-grid-home"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="h-full flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <div>
                <h1 className="text-lg sm:text-2xl font-display font-extrabold text-white tracking-tight">
                  {lang === 'my' ? 'ကစားနည်း ရွေးချယ်ပါ' : 'Select Your Game'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {lang === 'my'
                    ? 'နှစ်သက်ရာ ဂိမ်းတစ်ခုကို နှိပ်၍ ဝင်ရောက်ကစားပါ'
                    : 'Tap any competitive arena title to enter'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[11px] font-mono font-bold text-amber-300 shrink-0">
                4 TITLES
              </span>
            </div>

            {/* Full-Height 2x2 (Mobile) / 4-Column (Desktop) Premium Game Cards */}
            <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {GAME_LIST.map((game, idx) => {
                const normId = normalizeGameId(game.id);
                const locked = Boolean(featureLocks?.[game.id] || featureLocks?.[normId]);
                const title = getGameDisplayTitle(game);

                return (
                  <motion.button
                    key={game.id}
                    type="button"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, type: 'spring', stiffness: 320, damping: 24 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleOpenGame(game.id)}
                    className="group relative rounded-3xl cyber-panel border border-white/10 hover:border-amber-400/70 overflow-hidden flex flex-col text-left cursor-pointer shadow-xl transition-colors"
                  >
                    {/* Artwork Full Area */}
                    <div className="relative flex-1 min-h-0 w-full bg-[#070b13] overflow-hidden">
                      <img
                        src={GAME_ARTWORKS[normId] || game.artwork}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/30 to-transparent" />

                      {/* Top Pill Badge */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-amber-300 truncate">
                          {getGameBadge(game.id)}
                        </span>
                        {locked && (
                          <span className="p-1.5 rounded-full bg-rose-500/80 text-white">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Card Title Strip */}
                    <div className="p-3 sm:p-4 bg-[#0b101d]/95 border-t border-white/5 flex items-center justify-between gap-2 shrink-0">
                      <div className="min-w-0">
                        <div className="text-xs sm:text-base font-display font-extrabold text-white group-hover:text-amber-300 transition-colors truncate">
                          {title}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                          {lang === 'my' ? 'Bot • PvP • Room' : 'Bot • Ranked • Room'}
                        </div>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-amber-500/15 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 flex items-center justify-center transition-colors shrink-0">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* ==============================================================
             PAGE 2: SELECTED GAME DETAIL & LAUNCH PAGE
          ============================================================== */
          <motion.div
            key={`game-detail-${openedMeta.id}`}
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="h-full flex flex-col justify-between gap-3 overflow-hidden"
          >
            {/* Top Back Header */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOpenedGameId(null);
                }}
                className="px-3.5 h-10 rounded-xl cyber-panel hover:border-amber-400/50 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>{lang === 'my' ? 'ဂိမ်းများသို့ ပြန်သွားမည်' : 'Back to Games'}</span>
              </button>

              <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-xs font-bold text-amber-300">
                {lang === 'my' ? 'နိုင် +75 XP' : 'Win +75 XP'}
              </span>
            </div>

            {/* Game Detail Content Grid */}
            <div className="flex-1 min-h-0 grid lg:grid-cols-12 gap-3.5 overflow-hidden">
              {/* Left Hero Preview Card */}
              <div className="lg:col-span-5 cyber-panel rounded-3xl overflow-hidden flex flex-col border border-amber-400/25">
                <div className="h-32 sm:h-48 lg:flex-1 min-h-0 relative bg-[#070b13]">
                  <img
                    src={GAME_ARTWORKS[normOpened || 'connect4'] || openedMeta.artwork}
                    alt={getGameDisplayTitle(openedMeta)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-200">
                      {getGameBadge(openedMeta.id)}
                    </span>
                    <h2 className="text-lg sm:text-2xl font-display font-extrabold text-white mt-1">
                      {getGameDisplayTitle(openedMeta)}
                    </h2>
                  </div>
                </div>
                <div className="hidden lg:block p-4 space-y-1.5 text-xs text-slate-300 border-t border-white/10">
                  {(lang === 'my' ? openedMeta.rulesMy : openedMeta.rules).map((rule, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 font-mono font-bold">0{i + 1}.</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Mode Configuration & Launch Console */}
              <div className="lg:col-span-7 cyber-panel rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 overflow-y-auto">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {lang === 'my' ? 'ကစားမည့် ပုံစံ ရွေးချယ်ပါ' : 'Choose Play Mode'}
                  </div>

                  {/* Mode Selector Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedMode('bot');
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                        selectedMode === 'bot' ? 'cyber-gold-active text-amber-200' : 'bg-[#070b13] border border-white/10 text-slate-300'
                      }`}
                    >
                      <Bot className="w-4 h-4 text-amber-400" />
                      <span>Bot / Solo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedMode('matchmaking');
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                        selectedMode === 'matchmaking'
                          ? 'cyber-gold-active text-amber-200'
                          : 'bg-[#070b13] border border-white/10 text-slate-300'
                      }`}
                    >
                      <Swords className="w-4 h-4 text-sky-400" />
                      <span>{lang === 'my' ? 'အဆင့်တူရှာ' : 'Live PvP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedMode('custom');
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                        selectedMode === 'custom'
                          ? 'cyber-gold-active text-amber-200'
                          : 'bg-[#070b13] border border-white/10 text-slate-300'
                      }`}
                    >
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'my' ? 'Room ဖွဲ့မည်' : 'Room'}</span>
                    </button>
                  </div>

                  {/* Mode-Specific Controls */}
                  {selectedMode === 'bot' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setDifficulty(lvl);
                            }}
                            className={`h-10 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                              difficulty === lvl
                                ? 'cyber-violet-active text-white'
                                : 'bg-[#070b13] border border-white/10 text-slate-400'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>

                      {normOpened === 'rps' && (
                        <div className="grid grid-cols-2 gap-2">
                          {([3, 5] as const).map((bo) => (
                            <button
                              key={bo}
                              type="button"
                              onClick={() => setBestOf(bo)}
                              className={`h-9 rounded-xl border text-xs font-bold cursor-pointer ${
                                bestOf === bo
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                  : 'bg-[#070b13] border-white/10 text-slate-400'
                              }`}
                            >
                              Best of {bo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedMode === 'matchmaking' && (
                    <div className="p-3.5 rounded-2xl bg-[#070b13] border border-sky-400/25 flex items-center gap-3 text-xs text-sky-200">
                      <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>
                        {lang === 'my'
                          ? 'မိမိ XP နှင့် အဆင့်တူ အွန်လိုင်းကစားသမားကို Real-Time ရှာဖွေချိတ်ဆက်ပေးပါမည်။'
                          : 'Real-time matchmaking pairs you with a live opponent in your rank tier.'}
                      </span>
                    </div>
                  )}

                  {selectedMode === 'custom' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value)}
                        placeholder={
                          lang === 'my'
                            ? 'သူငယ်ချင်း Room Code (MR-XXXX) ထည့်ပါ — အသစ်ဖွင့်လိုပါက အလွတ်ထားပါ'
                            : 'Enter Room Code to join — or leave blank to create'
                        }
                        className="w-full h-11 px-3.5 rounded-xl bg-[#070b13] border border-amber-400/40 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Quick Challenge Online Players Strip */}
                  {visibleOnline.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400">
                        {lang === 'my' ? 'အွန်လိုင်းကစားသမားများ (နှိပ်၍ Profile ကြည့် / စိန်ခေါ်)' : 'Online Players'}
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {visibleOnline.slice(0, 8).map((pl) => (
                          <div
                            key={pl.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#070b13] border border-white/10 shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() => onInspectPlayer(pl.id)}
                              className="flex items-center gap-1.5 cursor-pointer"
                            >
                              <AvatarWithFrame
                                avatarUrl={pl.avatarUrl}
                                frameId={pl.frameId}
                                frames={frames}
                                displayName={pl.displayName}
                                size="xs"
                                status="online"
                              />
                              <span className="text-[11px] font-bold text-white max-w-[72px] truncate">
                                {pl.displayName}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendChallenge(pl.id, openedMeta.id)}
                              className="p-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 cursor-pointer"
                              title="Duel"
                            >
                              <Swords className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Launch Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={isOpenedLocked}
                  onClick={handleLaunch}
                  className="w-full h-12 sm:h-14 rounded-2xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {isOpenedLocked
                      ? lang === 'my' ? 'ယာယီပိတ်ထားပါသည်' : 'Temporarily Locked'
                      : selectedMode === 'custom'
                      ? roomCodeInput.trim()
                        ? lang === 'my' ? 'အခန်းထဲ ဝင်ရောက်မည်' : 'Join Room'
                        : lang === 'my' ? 'Room အသစ်ဖွင့်မည်' : 'Create Room'
                      : lang === 'my'
                      ? 'ဂိမ်းစတင်ကစားမည်'
                      : 'Start Match Now'}
                  </span>
                  <ChevronsRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
