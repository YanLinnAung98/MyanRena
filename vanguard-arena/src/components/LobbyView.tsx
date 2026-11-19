import React from 'react';
import { Bot, DoorOpen, Lock, Play, Plus, Sparkles, Swords, Users } from 'lucide-react';
import { GAME_LIST } from '../games/registry.ts';
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
}) => {
  const [selectedGame, setSelectedGame] = React.useState<GameType>('sakarhtar');
  const [selectedMode, setSelectedMode] = React.useState<'bot' | 'matchmaking' | 'custom'>('bot');
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [roomCodeInput, setRoomCodeInput] = React.useState('');

  const activeGameMeta = GAME_LIST.find((g) => g.id === selectedGame) || GAME_LIST[0];
  const isLocked = Boolean(featureLocks?.[selectedGame]);

  const handleLaunch = () => {
    if (isLocked) return;
    if (selectedMode === 'bot') {
      if (selectedGame === 'sakarhtar') {
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
        const maxP = selectedGame === 'sakarhtar' ? 8 : 2;
        onCreateSakarRoom(`${currentUser.displayName}'s Room`, maxP, selectedGame);
      }
    }
  };

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-auto max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-6 flex flex-col justify-between gap-2 overflow-hidden">
      {/* Compact Player Status Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-[#121826] border border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarWithFrame
            avatarUrl={currentUser.avatarUrl}
            frameId={currentUser.frameId}
            frames={frames}
            displayName={currentUser.displayName}
            size="sm"
            status="online"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{currentUser.displayName}</div>
            <div className="text-[11px] font-mono text-amber-400">
              {currentUser.gameId} · {currentUser.xp} XP ({currentUser.rank || 'Silver'})
            </div>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 shrink-0">
          ● {Math.max(1, onlinePlayers.length)} Online
        </div>
      </div>

      {/* 2x2 Compact Game Selector Grid (Zero Scroll on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {GAME_LIST.map((game) => {
          const active = selectedGame === game.id;
          const locked = Boolean(featureLocks?.[game.id]);
          const title = lang === 'my' ? game.nameMy : game.name;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => setSelectedGame(game.id)}
              className={`relative rounded-2xl p-2 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                active
                  ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-[#121826] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="h-12 sm:h-20 w-full rounded-xl overflow-hidden bg-[#0A0D14] mb-1 relative">
                <img
                  src={GAME_ARTWORKS[game.id] || game.artwork}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                {locked && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-rose-400" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white truncate">{title}</span>
                {active && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Compact Mode & Action Panel */}
      <div className="flex-1 min-h-0 rounded-2xl bg-[#121826] border border-white/10 p-3 sm:p-5 flex flex-col justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-display font-bold text-white truncate">
              {lang === 'my' ? activeGameMeta.nameMy : activeGameMeta.name}
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold shrink-0">
              {lang === 'my' ? 'နိုင် +75 XP' : 'Win +75 XP'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0A0D14] border border-white/10">
            <button
              type="button"
              onClick={() => setSelectedMode('bot')}
              className={`py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                selectedMode === 'bot' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Bot / Solo' : 'Solo / Bot'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('matchmaking')}
              className={`py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                selectedMode === 'matchmaking' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'အဆင့်တူရှာ' : 'Live PvP'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('custom')}
              className={`py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                selectedMode === 'custom' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Room ဖွဲ့မည်' : 'Custom Room'}</span>
            </button>
          </div>

          {selectedMode === 'bot' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-1.5 rounded-xl border text-xs font-semibold capitalize cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-[#0A0D14] border-white/10 text-slate-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {selectedGame === 'rps' && (
                <div className="grid grid-cols-2 gap-1.5">
                  {([3, 5] as const).map((bo) => (
                    <button
                      key={bo}
                      type="button"
                      onClick={() => setBestOf(bo)}
                      className={`py-1 rounded-xl border text-xs font-semibold cursor-pointer ${
                        bestOf === bo
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-[#0A0D14] border-white/10 text-slate-400'
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
            <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-slate-300 flex items-center justify-between">
              <span>
                {lang === 'my'
                  ? 'အွန်လိုင်းကစားသမားနှင့် Real-Time ချိတ်ဆက်ကစားပါမည်။'
                  : 'Real-time PvP matchmaking with live players.'}
              </span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
            </div>
          )}

          {selectedMode === 'custom' && (
            <div className="space-y-1">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder={
                  lang === 'my'
                    ? 'သူငယ်ချင်း Room Code ထည့်ပါ (အသစ်ဖွင့်မည်ဆိုပါက အလွတ်ထားပါ)'
                    : 'Enter Room Code to join (or leave blank to create)'
                }
                className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={isLocked}
          onClick={handleLaunch}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
        >
          {selectedMode === 'custom' ? (
            roomCodeInput.trim() ? (
              <>
                <DoorOpen className="w-4 h-4" />
                <span>{lang === 'my' ? 'အခန်းထဲ ဝင်ရောက်မည်' : 'Join Room'}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  {selectedGame === 'sakarhtar'
                    ? lang === 'my'
                      ? 'စကားထာ Room အသစ်ဖွင့်မည် (၁-၈ ယောက်)'
                      : 'Create Sakar-Htar Room (1-8P)'
                    : lang === 'my'
                    ? '1v1 Room အသစ်ဖွင့်မည်'
                    : 'Create 1v1 Room'}
                </span>
              </>
            )
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{lang === 'my' ? 'ဂိမ်းစတင်ကစားမည်' : 'Start Match Now'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
