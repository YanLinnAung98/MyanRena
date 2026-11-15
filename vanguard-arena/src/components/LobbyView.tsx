import React from 'react';
import { Bot, Clock, DoorOpen, Lock, Plus, Search, Sparkles, Swords, UserPlus, Users, Wifi, X } from 'lucide-react';
import { motion } from 'motion/react';
import { GAME_LIST } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  CustomRoom,
  Difficulty,
  FeatureLocks,
  GameType,
  LandingContent,
  Language,
  MatchmakingSettings,
  OnlinePlayer,
  ProfileFrame,
  TurnTimeLimit,
  UserProfile,
} from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface LobbyViewProps {
  lang: Language;
  landingContent?: LandingContent;
  currentUser: UserProfile;
  onlinePlayers: OnlinePlayer[];
  frames: ProfileFrame[];
  featureLocks: FeatureLocks;
  matchmakingSettings: MatchmakingSettings;
  queuedGame: GameType | null;
  sakarQuickCount: number;
  openRooms: CustomRoom[];
  onStartBot: (gameType: GameType, difficulty: Difficulty, bestOf?: 3 | 5, turnTimeLimit?: TurnTimeLimit) => void;
  onJoinQueue: (gameType: GameType, turnTimeLimit?: TurnTimeLimit, autoBotFill?: boolean) => void;
  onLeaveQueue: () => void;
  onStartSakarSolo: () => void;
  onJoinSakarQuick: (autoBotFill?: boolean) => void;
  onStartSakarQuickNow: () => void;
  onCreateSakarRoom: (title: string, maxPlayers: number) => void;
  onJoinSakarRoom: (codeOrId: string) => void;
  onSendChallenge: (targetUserId: string, gameType: GameType, bestOf?: 3 | 5, turnTimeLimit?: TurnTimeLimit) => void;
  onInspectPlayer: (userId: string) => void;
  onAddFriend: (userId: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  lang,
  landingContent,
  currentUser,
  onlinePlayers,
  frames,
  featureLocks,
  matchmakingSettings,
  queuedGame,
  sakarQuickCount,
  openRooms,
  onStartBot,
  onJoinQueue,
  onLeaveQueue,
  onStartSakarSolo,
  onJoinSakarQuick,
  onStartSakarQuickNow,
  onCreateSakarRoom,
  onJoinSakarRoom,
  onSendChallenge,
  onInspectPlayer,
  onAddFriend,
}) => {
  const t = TRANSLATIONS[lang];
  const [selectedGame, setSelectedGame] = React.useState<GameType>('connect4');
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [turnTimeLimit, setTurnTimeLimit] = React.useState<TurnTimeLimit>(20);
  const [autoBotFill, setAutoBotFill] = React.useState<boolean>(matchmakingSettings.autoBotFillDefault);
  const [search, setSearch] = React.useState('');
  const [roomTitle, setRoomTitle] = React.useState('');
  const [roomMaxSeats, setRoomMaxSeats] = React.useState<number>(6);
  const [roomJoinCode, setRoomJoinCode] = React.useState('');

  React.useEffect(() => {
    setAutoBotFill(matchmakingSettings.autoBotFillDefault);
  }, [matchmakingSettings.autoBotFillDefault]);

  const isSuspended = Boolean(currentUser.suspendedUntil && Date.parse(currentUser.suspendedUntil) > Date.now());

  const activePlugin = GAME_LIST.find((g) => g.id === selectedGame) || GAME_LIST[0];
  const activeTitle =
    lang === 'my'
      ? landingContent?.games[activePlugin.id]?.nameMy || activePlugin.nameMy
      : landingContent?.games[activePlugin.id]?.nameEn || activePlugin.name;
  const isSelectedLocked = featureLocks[selectedGame];

  const rivals = onlinePlayers.filter((p) => {
    if (p.id === currentUser.id) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.displayName.toLowerCase().includes(q) || p.gameId.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Active Matchmaking Queue Banner */}
      {queuedGame && (
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-sky-400 animate-pulse shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">
                {t.lobby.searchingOpponent} ({GAME_LIST.find((g) => g.id === queuedGame)?.shortName}
                {queuedGame === 'sakar_htar' ? ` · ${sakarQuickCount}/6` : ''})
              </div>
              <div className="text-xs text-sky-200/80">{t.lobby.matchingNearTier}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {queuedGame === 'sakar_htar' && sakarQuickCount >= 1 && (
              <button
                type="button"
                onClick={onStartSakarQuickNow}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.sakar.startNowBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLeaveQueue}
              className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{t.lobby.cancelSearch}</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Selector Grid */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.lobby.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{t.lobby.subtitle}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {GAME_LIST.map((game) => {
            const locked = featureLocks[game.id];
            const selected = selectedGame === game.id;
            const cmsGame = landingContent?.games[game.id];
            const gTitle = lang === 'my' ? cmsGame?.nameMy || game.nameMy : cmsGame?.nameEn || game.name;
            const gTagline =
              lang === 'my' ? cmsGame?.taglineMy || game.taglineMy : cmsGame?.taglineEn || game.tagline;
            const gBanner = cmsGame?.bannerUrl || game.artwork;

            return (
              <motion.button
                key={game.id}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedGame(game.id)}
                className={`text-left rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col ${
                  selected
                    ? 'bg-[#161D2E] border-amber-400/70 shadow-lg shadow-amber-500/10'
                    : 'bg-[#121826] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="aspect-[16/10] w-full bg-[#0A0D14] relative overflow-hidden">
                  <img
                    src={gBanner}
                    alt={gTitle}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${locked ? 'opacity-35 grayscale' : ''}`}
                  />
                  {locked && (
                    <div className="absolute inset-0 bg-[#0A0D14]/75 flex flex-col items-center justify-center gap-2">
                      <Lock className="w-6 h-6 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-200">{t.lobby.maintenanceLocked}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-display font-bold text-white">{gTitle}</h3>
                      {selected && <span className="text-xs font-semibold text-amber-400">{t.lobby.selected}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{gTagline}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Launch Console & Online Rivals */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Play Mode Configurator */}
        <section className="lg:col-span-5 p-4 sm:p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-5">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              {activeTitle} — {t.lobby.modesSuffix}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{t.lobby.chooseModeDesc}</p>
          </div>

          {selectedGame === 'sakar_htar' ? (
            <div className="space-y-4">
              {/* Solo & Quick Matchmaking (1–6 Players) */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isSelectedLocked || isSuspended}
                  onClick={onStartSakarSolo}
                  className="w-full min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isSelectedLocked ? t.lobby.gameLocked : t.sakar.playSoloBtn}</span>
                </button>

                {/* Auto-Fill with Burmese Bots Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoBotFill}
                  onClick={() => setAutoBotFill((v) => !v)}
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-[#0A0D14] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{t.lobby.autoFillBotsLabel}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      {t.lobby.autoFillBotsHint} ({matchmakingSettings.botFillDelaySeconds}s / {matchmakingSettings.maxSearchSeconds}s)
                    </div>
                  </div>
                  <span
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                      autoBotFill ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSelectedLocked || featureLocks.matchmaking || Boolean(queuedGame) || isSuspended}
                  onClick={() => onJoinSakarQuick(autoBotFill)}
                  className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {featureLocks.matchmaking
                      ? t.lobby.matchmakingLocked
                      : isSelectedLocked
                      ? t.lobby.gameLocked
                      : t.sakar.quickMatchBtn}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t.sakar.quickMatchSub}</p>
              </div>

              <div className="h-px bg-white/10" />

              {/* Custom Rooms (2–8 Players) */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>{t.sakar.customRoomsTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.sakar.customRoomsSub}</p>
                </div>

                {/* Create Custom Room */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isSelectedLocked || isSuspended) return;
                    onCreateSakarRoom(roomTitle.trim(), roomMaxSeats);
                    setRoomTitle('');
                  }}
                  className="space-y-2 p-3 rounded-xl bg-[#0A0D14] border border-white/10"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      maxLength={48}
                      placeholder={t.sakar.roomTitlePlaceholder}
                      className="flex-1 h-10 px-3 rounded-lg bg-[#121826] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <select
                      value={roomMaxSeats}
                      onChange={(e) => setRoomMaxSeats(Number(e.target.value))}
                      aria-label={t.sakar.maxPlayersLabel}
                      className="h-10 px-2.5 rounded-lg bg-[#121826] border border-white/10 text-xs font-mono text-amber-300"
                    >
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} Seats
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSelectedLocked || isSuspended}
                    className="w-full min-h-[44px] rounded-lg bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/40 text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.sakar.createRoomBtn}</span>
                  </button>
                </form>

                {/* Search / Join by #SKH-XXXX Room ID */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!roomJoinCode.trim() || isSelectedLocked || isSuspended) return;
                    onJoinSakarRoom(roomJoinCode.trim());
                    setRoomJoinCode('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={roomJoinCode}
                    onChange={(e) => setRoomJoinCode(e.target.value)}
                    placeholder={t.sakar.joinByIdPlaceholder}
                    className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!roomJoinCode.trim() || isSelectedLocked || isSuspended}
                    className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span>{t.sakar.joinRoomBtn}</span>
                  </button>
                </form>

                {/* Open Waiting Rooms List */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t.sakar.openRoomsList} ({openRooms.length})
                  </div>
                  {openRooms.length === 0 ? (
                    <div className="p-3 rounded-xl bg-[#0A0D14]/60 border border-white/5 text-xs text-slate-500 text-center">
                      {t.sakar.noOpenRooms}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {openRooms.map((rm) => (
                        <div
                          key={rm.id}
                          className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{rm.title}</div>
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              <span className="text-amber-300">{rm.code}</span> · {rm.participants.length}/{rm.maxPlayers}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isSelectedLocked || isSuspended || rm.participants.length >= rm.maxPlayers}
                            onClick={() => onJoinSakarRoom(rm.id)}
                            className="min-h-[34px] px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
                          >
                            {t.sakar.joinRoomBtn}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Configurable Turn Time Limit (10s / 15s / 20s / 30s) */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.lobby.turnTimer}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {([10, 15, 20, 30] as TurnTimeLimit[]).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTurnTimeLimit(sec)}
                      className={`min-h-[44px] rounded-xl border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        turnTimeLimit === sec
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                          : 'bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {activePlugin.supportsBestOf && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-300">{t.lobby.matchFormat}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {([3, 5] as const).map((bo) => (
                      <button
                        key={bo}
                        type="button"
                        onClick={() => setBestOf(bo)}
                        className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          bestOf === bo
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.lobby.bestOf} {bo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Bot Mode */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-medium text-slate-300">{t.lobby.playVsBot}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        difficulty === d
                          ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                          : 'bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d === 'easy' ? t.lobby.easy : d === 'medium' ? t.lobby.medium : t.lobby.hard}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={isSelectedLocked || isSuspended}
                  onClick={() => onStartBot(selectedGame, difficulty, bestOf, turnTimeLimit)}
                  className="w-full min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>
                    {isSelectedLocked ? t.lobby.gameLocked : `${activePlugin.shortName} ${t.lobby.playVsBotBtn}`}
                  </span>
                </button>
              </div>

              <div className="h-px bg-white/10" />

              {/* Random Ranked Matchmaking */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-300">{t.lobby.randomMatchmaking}</div>

                {/* Auto-Fill with Burmese Bots Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoBotFill}
                  onClick={() => setAutoBotFill((v) => !v)}
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-[#0A0D14] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{t.lobby.autoFillBotsLabel}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      {t.lobby.autoFillBotsHint} ({matchmakingSettings.botFillDelaySeconds}s / {matchmakingSettings.maxSearchSeconds}s)
                    </div>
                  </div>
                  <span
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                      autoBotFill ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSelectedLocked || featureLocks.matchmaking || Boolean(queuedGame) || isSuspended}
                  onClick={() => onJoinQueue(selectedGame, turnTimeLimit, autoBotFill)}
                  className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {featureLocks.matchmaking
                      ? t.lobby.matchmakingLocked
                      : isSelectedLocked
                      ? t.lobby.gameLocked
                      : `${t.lobby.findMatchBtn} (${activePlugin.shortName})`}
                  </span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* Online Players Directory for Direct Challenge */}
        <section className="lg:col-span-7 p-4 sm:p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold text-white">{t.lobby.onlineCompetitors}</h2>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                {rivals.length} {t.lobby.availablePlayers}
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.lobby.filterPlaceholder}
                className="h-11 pl-9 pr-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-56"
              />
            </div>
          </div>

          {rivals.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">{t.lobby.noPlayersOnline}</div>
          ) : (
            <div className="divide-y divide-white/10">
              {rivals.map((player) => {
                const rank = getRankInfo(player.xp);
                const busy = player.status === 'in_game';
                return (
                  <div
                    key={player.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(player.id)}
                      className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
                    >
                      <AvatarWithFrame
                        avatarUrl={player.avatarUrl}
                        frameId={player.frameId}
                        frames={frames}
                        displayName={player.displayName}
                        size="md"
                        status={player.status}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                          {player.displayName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-500">{player.gameId}</span>
                          <span aria-hidden="true">·</span>
                          <span className={rank.colorClass}>{rank.tier}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            {player.pingMs}ms
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAddFriend(player.id)}
                        aria-label={`Add ${player.displayName} as friend`}
                        className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.lobby.add}</span>
                      </button>

                      <button
                        type="button"
                        disabled={busy || isSelectedLocked || isSuspended}
                        onClick={() => onSendChallenge(player.id, selectedGame, bestOf, turnTimeLimit)}
                        className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{busy ? t.lobby.inMatch : t.lobby.challenge}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
