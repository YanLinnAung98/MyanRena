import React from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Crown,
  Lock,
  MessageSquare,
  Play,
  Send,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import { GAME_LIST } from '../games/registry.ts';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { Difficulty, GameType, LandingContent, Language, TurnTimeLimit, UserProfile } from '../types.ts';
import { GAME_ARTWORKS } from '../utils/gameArtworks.ts';
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
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [selectedMode, setSelectedMode] = React.useState<'bot' | 'matchmaking' | 'custom'>('bot');
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [lobbyChatInput, setLobbyChatInput] = React.useState('');
  const [lobbyMessages, setLobbyMessages] = React.useState<Array<{ id: number; sender: string; text: string }>>([
    { id: 1, sender: 'Vanguard System', text: 'Vanguard Cyber Arena မှ ကြိုဆိုပါတယ်!' },
  ]);

  const getGameDisplayTitle = (game: any) => {
    const norm = normalizeGameId(game.id);
    if (norm === 'sakarhtar') return lang === 'my' ? 'ဉာဏ်စမ်းပဟေဠိ' : 'Wise Owl Quiz';
    return lang === 'my' ? game.nameMy : game.name;
  };

  const activeGameMeta = GAME_LIST[selectedIndex] || GAME_LIST[0];
  const selectedGame = activeGameMeta.id;
  const normSelected = normalizeGameId(selectedGame);
  const nextGameMeta = GAME_LIST[(selectedIndex + 1) % GAME_LIST.length];
  const isLocked = Boolean(featureLocks?.[selectedGame] || featureLocks?.[normSelected]);

  const stepGame = (dir: -1 | 1) => {
    setSelectedIndex((prev) => (prev + dir + GAME_LIST.length) % GAME_LIST.length);
  };

  const handleLaunch = () => {
    if (isLocked) return;
    if (selectedMode === 'bot') {
      if (normSelected === 'sakarhtar') {
        onStartSakarSolo();
      } else {
        onStartBot(selectedGame, difficulty, bestOf, 20);
      }
    } else if (selectedMode === 'matchmaking') {
      onJoinQueue(selectedGame, bestOf, 20);
    } else {
      if (roomCodeInput.trim()) {
        onJoinSakarRoom(roomCodeInput.trim());
      } else {
        const maxP = normSelected === 'sakarhtar' ? 8 : 2;
        onCreateSakarRoom(`${currentUser.displayName}'s Room`, maxP, selectedGame);
      }
    }
  };

  const handleSendLobbyChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyChatInput.trim()) return;
    setLobbyMessages((prev) => [
      ...prev.slice(-15),
      { id: Date.now(), sender: currentUser.displayName, text: lobbyChatInput.trim() },
    ]);
    setLobbyChatInput('');
  };

  const displayPlayers = onlinePlayers.length > 0 ? onlinePlayers : [currentUser];

  return (
    <div className="h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-4.5rem)] max-w-[1360px] mx-auto px-3 sm:px-6 py-2 lg:py-4 overflow-hidden">
      {/* 1. MOBILE GAME UI (1-Column Thumb Carousel, Zero Scroll) */}
      <div className="lg:hidden h-full flex flex-col justify-between gap-2 overflow-hidden">
        <div className="relative flex items-center gap-2.5 pt-0.5 shrink-0">
          <motion.div
            key={activeGameMeta.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -45) stepGame(1);
              else if (info.offset.x > 45) stepGame(-1);
            }}
            initial={{ opacity: 0.7, scale: 0.96, x: 18 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="w-[78%] shrink-0 rounded-2xl cyber-panel cyber-gold-active p-2.5 cursor-grab active:cursor-grabbing"
          >
            <div className="h-32 sm:h-40 w-full rounded-xl overflow-hidden bg-[#070b14] relative">
              <img
                src={GAME_ARTWORKS[normSelected] || activeGameMeta.artwork}
                alt={getGameDisplayTitle(activeGameMeta)}
                className="w-full h-full object-cover"
              />
              {isLocked && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-400" />
                </div>
              )}
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 border border-amber-400/50 text-[10px] font-bold text-amber-300">
                +75 XP
              </span>
            </div>
            <div className="mt-2 text-center text-xs font-bold text-white truncate">
              {getGameDisplayTitle(activeGameMeta)}
            </div>
          </motion.div>

          <button
            type="button"
            onClick={() => stepGame(1)}
            className="w-[22%] shrink-0 rounded-2xl cyber-panel p-2 opacity-65 hover:opacity-95 transition-opacity text-left cursor-pointer"
          >
            <div className="h-32 sm:h-40 w-full rounded-xl overflow-hidden bg-[#070b14]">
              <img
                src={GAME_ARTWORKS[normalizeGameId(nextGameMeta.id)] || nextGameMeta.artwork}
                alt={getGameDisplayTitle(nextGameMeta)}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-300 truncate">
              {getGameDisplayTitle(nextGameMeta)}
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 shrink-0">
          <button type="button" onClick={() => stepGame(-1)} className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {GAME_LIST.map((g, idx) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === selectedIndex ? 'w-5 bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'w-2 bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button type="button" onClick={() => stepGame(1)} className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-1 shrink-0">
          <h2 className="text-base font-display font-bold text-white truncate">
            {getGameDisplayTitle(activeGameMeta)}
          </h2>
          <span className="text-[11px] font-mono text-amber-400">{currentUser.xp} XP</span>
        </div>

        <div className="space-y-1.5 shrink-0">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setSelectedMode('bot')}
            className={`w-full h-10 rounded-xl px-4 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              selectedMode === 'bot' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>Bot / Solo</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setSelectedMode('matchmaking')}
            className={`w-full h-10 rounded-xl px-4 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              selectedMode === 'matchmaking' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
            }`}
          >
            <Swords className="w-4 h-4 text-sky-400" />
            <span>{lang === 'my' ? 'အဆင့်တူရှာ' : 'Ranked Matchmaking'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setSelectedMode('custom')}
            className={`w-full h-10 rounded-xl px-4 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              selectedMode === 'custom' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'my' ? 'Room ဖွဲ့မည်' : 'Custom Room'}</span>
          </motion.button>
        </div>

        <div className="shrink-0">
          {selectedMode === 'bot' ? (
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`h-9 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    difficulty === lvl ? 'cyber-violet-active text-white' : 'cyber-panel text-slate-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          ) : selectedMode === 'custom' ? (
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder={lang === 'my' ? 'Room Code ထည့်ပါ (သို့) အလွတ်ထားပါ' : 'Enter Room Code or leave blank'}
              className="w-full h-9 px-3 rounded-xl bg-[#090d16] border border-amber-400/40 text-xs text-white focus:outline-none"
            />
          ) : (
            <div className="h-9 rounded-xl cyber-panel px-3 flex items-center justify-center text-[11px] text-sky-300 font-semibold">
              {lang === 'my' ? '⚡ အွန်လိုင်းပြိုင်ဘက်နှင့် တိုက်ရိုက်ချိတ်ဆက်မည်' : '⚡ Instant Real-Time PvP Match'}
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={isLocked}
          onClick={handleLaunch}
          className="w-full h-12 rounded-2xl cyber-cta-gold text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {selectedMode === 'custom'
              ? roomCodeInput.trim()
                ? lang === 'my' ? 'အခန်းထဲ ဝင်မည်' : 'Join Room'
                : lang === 'my' ? 'Room အသစ်ဖွင့်မည်' : 'Create Room'
              : lang === 'my' ? 'ဂိမ်းစတင်ကစားမည်' : 'Start Match'}
          </span>
          <ChevronsRight className="w-5 h-5 opacity-80" />
        </motion.button>
      </div>

      {/* 2. PC WEB UI */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 h-full overflow-hidden">
        <div className="lg:col-span-9 flex flex-col justify-between gap-3 h-full overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-panel rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 border border-amber-500/25 shrink-0"
          >
            <div className="flex items-center gap-4">
              <AvatarWithFrame
                avatarUrl={currentUser.avatarUrl}
                frameId={currentUser.frameId}
                frames={frames}
                displayName={currentUser.displayName}
                size="lg"
                status="online"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-white">{currentUser.displayName}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Customized Shield
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono mt-0.5">
                  <span className="text-slate-400">{currentUser.gameId}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-bold">
                    {currentUser.xp} XP ({currentUser.rank || 'Legend'})
                  </span>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{displayPlayers.length} Online</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-4 gap-3.5 flex-1 min-h-0">
            {GAME_LIST.map((game, idx) => {
              const active = idx === selectedIndex;
              const normId = normalizeGameId(game.id);
              const locked = Boolean(featureLocks?.[game.id] || featureLocks?.[normId]);
              const title = getGameDisplayTitle(game);
              return (
                <motion.button
                  key={game.id}
                  type="button"
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedIndex(idx)}
                  className={`rounded-2xl p-3 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden ${
                    active ? 'cyber-gold-active' : 'cyber-panel hover:border-slate-500/50'
                  }`}
                >
                  <div className="flex-1 min-h-0 w-full rounded-xl overflow-hidden bg-[#070b14] relative">
                    <img
                      src={GAME_ARTWORKS[normId] || game.artwork}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                    {locked && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-rose-400" />
                      </div>
                    )}
                  </div>
                  <div className="pt-2.5 text-center">
                    <div className={`text-sm font-bold truncate ${active ? 'text-amber-200' : 'text-white'}`}>
                      {title}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-amber-500/20 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">
                {getGameDisplayTitle(activeGameMeta)}
              </h3>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-xs font-bold text-amber-300">
                {lang === 'my' ? 'နိုင် +75 XP' : 'Win +75 XP'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMode('bot')}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  selectedMode === 'bot' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
                }`}
              >
                <Bot className="w-4 h-4 text-amber-400" />
                <span>Bot / Solo</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('matchmaking')}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  selectedMode === 'matchmaking' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
                }`}
              >
                <Swords className="w-4 h-4 text-sky-400" />
                <span>{lang === 'my' ? 'အဆင့်တူရှာ' : 'Ranked Matchmaking'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('custom')}
                className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  selectedMode === 'custom' ? 'cyber-gold-active text-amber-200' : 'cyber-panel text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'my' ? 'Room ဖွဲ့မည်' : 'Custom Room'}</span>
              </button>
            </div>

            {selectedMode === 'bot' ? (
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`h-10 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                      difficulty === lvl ? 'cyber-violet-active text-white' : 'cyber-panel text-slate-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            ) : selectedMode === 'custom' ? (
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder={
                  lang === 'my'
                    ? 'သူငယ်ချင်း Room Code (ဥပမာ MR-1234) ထည့်ပါ — အခန်းအသစ်ဖွင့်လိုပါက အလွတ်ထားပါ'
                    : 'Enter Room Code to join — or leave blank to create'
                }
                className="w-full h-10 px-4 rounded-xl bg-[#070b14] border border-amber-400/40 text-xs text-white focus:outline-none"
              />
            ) : (
              <div className="h-10 rounded-xl cyber-panel px-4 flex items-center justify-between text-xs text-sky-300">
                <span>
                  {lang === 'my'
                    ? 'မိမိ XP နှင့် အဆင့်တူ အွန်လိုင်းပြိုင်ဘက်ကို အလိုအလျောက် ရှာဖွေချိတ်ဆက်ပေးပါမည်။'
                    : 'Automatically matches you with a live player in your XP bracket.'}
                </span>
                {normSelected === 'rps' && (
                  <div className="flex gap-1.5">
                    {([3, 5] as const).map((bo) => (
                      <button
                        key={bo}
                        type="button"
                        onClick={() => setBestOf(bo)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          bestOf === bo ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        Bo{bo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              disabled={isLocked}
              onClick={handleLaunch}
              className="w-full h-12 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {selectedMode === 'custom'
                  ? roomCodeInput.trim()
                    ? lang === 'my' ? 'အခန်းထဲ ဝင်ရောက်မည်' : 'Join Custom Room'
                    : lang === 'my' ? 'Room အသစ်ဖွင့်မည်' : 'Create Custom Room'
                  : lang === 'my' ? 'ဂိမ်းစတင်ကစားမည်' : 'Launch Match'}
              </span>
              <ChevronsRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Right Sidebar: Online Friends & Live Arena Chat */}
        <aside className="lg:col-span-3 cyber-panel rounded-2xl p-3.5 flex flex-col justify-between gap-3 h-full overflow-hidden border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              Online Friends & Chat
            </span>
            <span className="text-[11px] font-mono text-emerald-400">{displayPlayers.length}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {displayPlayers.map((pl) => (
              <div
                key={pl.id}
                className="p-2 rounded-xl bg-[#090d16]/90 border border-white/5 hover:border-amber-400/35 flex items-center justify-between gap-2 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onInspectPlayer(pl.id)}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                >
                  <AvatarWithFrame
                    avatarUrl={pl.avatarUrl}
                    frameId={pl.frameId}
                    frames={frames}
                    displayName={pl.displayName}
                    size="sm"
                    status="online"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-200 truncate">{pl.displayName}</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {(pl as any).deviceType || 'Online'} · {pl.xp} XP
                    </div>
                  </div>
                </button>

                {pl.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => onSendChallenge(pl.id, selectedGame)}
                    title="Challenge Player"
                    className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition-colors cursor-pointer shrink-0"
                  >
                    <Swords className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-2.5 space-y-2 shrink-0">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-amber-400" />
              <span>Arena Lounge Chat</span>
            </div>
            <div className="h-24 overflow-y-auto space-y-1 text-[11px] bg-[#070b14] p-2 rounded-xl border border-white/5">
              {lobbyMessages.map((m) => (
                <div key={m.id}>
                  <span className="font-bold text-amber-400">{m.sender}: </span>
                  <span className="text-slate-300">{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendLobbyChat} className="flex gap-1.5">
              <input
                type="text"
                value={lobbyChatInput}
                onChange={(e) => setLobbyChatInput(e.target.value)}
                placeholder={lang === 'my' ? 'စာပို့မည်...' : 'Chat...'}
                className="flex-1 h-8 px-2.5 rounded-lg bg-[#070b14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-2.5 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
};
