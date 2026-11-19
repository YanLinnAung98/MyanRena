import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  Clock,
  Info,
  Play,
  Plus,
  Sparkles,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import type { GameType, Language } from '../types.ts';
import { GameStage3D } from './Game3DVisuals.tsx';
import { GameBadgeIcon } from './PremiumIcons.tsx';

type Difficulty = 'easy' | 'medium' | 'hard';
type TurnTimeLimit = 15 | 20 | 30;
type PlayMode = 'pvp' | 'bot' | 'room';

interface GameArenaSetupViewProps {
  lang: Language;
  gameType: GameType;
  featureLocks: Record<string, boolean>;
  openRooms: any[];
  queuedGame: GameType | null;
  onBack: () => void;
  onJoinQueue: (gameType: GameType, bestOf: 3 | 5, turnTimeLimit: TurnTimeLimit) => void;
  onLeaveQueue: () => void;
  onStartBot: (gameType: GameType, difficulty: Difficulty, bestOf: 3 | 5, turnTimeLimit: TurnTimeLimit) => void;
  onStartSakarSolo: () => void;
  onCreateRoom: (title: string, maxPlayers: number, gameType: GameType) => void;
  onJoinRoom: (roomIdOrCode: string) => void;
}

const GAME_META: Record<
  GameType,
  {
    titleMy: string;
    titleEn: string;
    subtitleMy: string;
    subtitleEn: string;
    rulesMy: string[];
    rulesEn: string[];
    supportsBestOf: boolean;
    maxRoomPlayers: number;
  }
> = {
  connect4: {
    titleMy: '၄ လုံးတန်း ဗျူဟာကွင်း (4 in a Row)',
    titleEn: '4 in a Row Strategy Arena',
    subtitleMy: 'အလျားလိုက်၊ ဒေါင်လိုက် သို့မဟုတ် ထောင့်ဖြတ် ၄ လုံးတန်းအောင် ချကစားပါ။',
    subtitleEn: 'Connect four glowing discs horizontally, vertically, or diagonally.',
    rulesMy: [
      'တစ်လှည့်စီ အပြားချ၍ ၄ လုံးတန်းအောင် ဦးစွာချနိုင်သူ အနိုင်ရမည်။',
      'အနိုင်ရပါက +75 XP၊ သရေကျပါက +25 XP ရရှိမည်။',
    ],
    rulesEn: [
      'Take turns dropping discs; first to connect 4 wins.',
      'Earn +75 XP for Victory and +25 XP for a Draw.',
    ],
    supportsBestOf: true,
    maxRoomPlayers: 2,
  },
  tictactoe: {
    titleMy: 'X / O အကွက်ချ ဉာဏ်ရည်ပြိုင်ပွဲ',
    titleEn: 'Tic-Tac-Toe Neon Duel',
    subtitleMy: 'မြန်ဆန်တိကျသော ၃×၃ အကွက်ချ ဗျူဟာပြိုင်ပွဲ။',
    subtitleEn: 'Fast-paced 3×3 tactical hologram showdown.',
    rulesMy: [
      'X သို့မဟုတ် O ကို ၃ လုံးတန်းအောင် ဦးစွာချနိုင်သူ အနိုင်ရမည်။',
      'Best of 3 သို့မဟုတ် Best of 5 စိတ်ကြိုက်ရွေးချယ် ယှဉ်ပြိုင်နိုင်သည်။',
    ],
    rulesEn: [
      'First player to align 3 marks wins the round.',
      'Choose Best of 3 or Best of 5 rounds.',
    ],
    supportsBestOf: true,
    maxRoomPlayers: 2,
  },
  rps: {
    titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး (RPS)',
    titleEn: 'Rock Paper Scissors Arena',
    subtitleMy: 'ပြိုင်ဘက်၏ စိတ်ကို ဖတ်၍ တစ်ပြိုင်နက်တည်း ရွေးချယ်ယှဉ်ပြိုင်ပါ။',
    subtitleEn: 'Outsmart your rival in simultaneous reflex rounds.',
    rulesMy: [
      'ကျောက်တုံးက ကတ်ကြေးကိုနိုင်၊ ကတ်ကြေးက စက္ကူကိုနိုင်၊ စက္ကူက ကျောက်တုံးကိုနိုင်သည်။',
      'Best of 3 သို့မဟုတ် Best of 5 စိတ်ကြိုက်ချိန်ညှိ၍ ဆော့နိုင်သည်။',
    ],
    rulesEn: [
      'Rock beats Scissors, Scissors beats Paper, Paper beats Rock.',
      'Configure Best of 3 or Best of 5 before launching.',
    ],
    supportsBestOf: true,
    maxRoomPlayers: 2,
  },
  sakarhtar: {
    titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်းပဟေဠိ',
    titleEn: 'Wise Owl Quiz Showdown',
    subtitleMy: 'မြန်မာ့စကားထာနှင့် အထွေထွေဗဟုသုတ ဉာဏ်စမ်းမေးခွန်းများ ဖြေဆိုပါ။',
    subtitleEn: 'Test your wit across Myanmar riddles and trivia.',
    rulesMy: [
      'မေးခွန်းတစ်ခု မှန်ကန်စွာဖြေနိုင်တိုင်း +100 မှတ် ရရှိမည်။',
      'Solo လေ့ကျင့်နိုင်သလို အခန်းဖွင့်၍ လူ ၈ ဦးအထိ အတူပြိုင်ဆော့နိုင်သည်။',
    ],
    rulesEn: [
      'Score +100 points for every correct answer.',
      'Play Solo, Quick Match, or host a Room for up to 8 players.',
    ],
    supportsBestOf: false,
    maxRoomPlayers: 8,
  },
};

export const GameArenaSetupView: React.FC<GameArenaSetupViewProps> = ({
  lang,
  gameType,
  featureLocks,
  openRooms,
  queuedGame,
  onBack,
  onJoinQueue,
  onLeaveQueue,
  onStartBot,
  onStartSakarSolo,
  onCreateRoom,
  onJoinRoom,
}) => {
  const meta = GAME_META[gameType];
  const [mode, setMode] = React.useState<PlayMode>('pvp');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [turnTimeLimit, setTurnTimeLimit] = React.useState<TurnTimeLimit>(20);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [roomTitle, setRoomTitle] = React.useState(
    lang === 'my' ? `${meta.titleMy} အခန်း` : `${meta.titleEn} Room`
  );
  const [maxPlayers, setMaxPlayers] = React.useState<number>(meta.maxRoomPlayers);
  const [joinCode, setJoinCode] = React.useState('');

  const gameRooms = (openRooms || []).filter((r) => r.gameType === gameType);
  const isLocked = Boolean(featureLocks?.[gameType]);
  const isCustomRoomLocked = Boolean(featureLocks?.customRooms);
  const isQueuingThis = queuedGame === gameType;

  const handleLaunch = () => {
    if (isLocked) return;
    if (mode === 'pvp') {
      onJoinQueue(gameType, bestOf, turnTimeLimit);
    } else if (mode === 'bot') {
      if (gameType === 'sakarhtar') {
        onStartSakarSolo();
      } else {
        onStartBot(gameType, difficulty, bestOf, turnTimeLimit);
      }
    } else if (mode === 'room') {
      if (isCustomRoomLocked) return;
      onCreateRoom(roomTitle.trim() || meta.titleEn, maxPlayers, gameType);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-5"
    >
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>{lang === 'my' ? 'ကစားကွင်းသို့ ပြန်သွားမည်' : 'Back to Arena Lobby'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
          <GameBadgeIcon gameType={gameType} className="w-5 h-5" />
          <span className="uppercase">{gameType}</span>
        </div>
      </div>

      {/* 3D Animated Hero Showcase Banner */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.12)]">
        <div className="relative">
          <GameStage3D gameType={gameType} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/75 to-transparent p-4 sm:p-5">
            <h1 className="text-lg sm:text-2xl font-display font-extrabold text-white">
              {lang === 'my' ? meta.titleMy : meta.titleEn}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {lang === 'my' ? meta.subtitleMy : meta.subtitleEn}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            {
              id: 'pvp',
              icon: Swords,
              labelMy: 'အွန်လိုင်း PvP',
              labelEn: 'Online Match',
              subMy: 'ပြိုင်ဘက်ရှာမည်',
              subEn: 'Ranked Quick Play',
            },
            {
              id: 'bot',
              icon: Bot,
              labelMy: gameType === 'sakarhtar' ? 'Solo ဉာဏ်စမ်း' : 'Bot AI နှင့်ဆော့မည်',
              labelEn: gameType === 'sakarhtar' ? 'Solo Practice' : 'Play vs AI Bot',
              subMy: 'ချက်ချင်းစတင်မည်',
              subEn: 'Instant Start',
            },
            {
              id: 'room',
              icon: Users,
              labelMy: 'မိတ်ဆွေ အခန်း',
              labelEn: 'Friend Room',
              subMy: 'အခန်းဖွင့်/ဝင်မည်',
              subEn: 'Create or Join',
            },
          ] as Array<{ id: PlayMode; icon: any; labelMy: string; labelEn: string; subMy: string; subEn: string }>
        ).map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                active
                  ? 'cyber-gold-active shadow-[0_0_24px_rgba(245,158,11,0.2)]'
                  : 'bg-[#0b101d] border-white/10 hover:border-amber-400/40'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1.5 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
              <div className="text-xs sm:text-sm font-bold text-white">
                {lang === 'my' ? m.labelMy : m.labelEn}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {lang === 'my' ? m.subMy : m.subEn}
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuration Card */}
      <div className="grid md:grid-cols-12 gap-4">
        <div className="md:col-span-7 cyber-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'my' ? 'ပွဲစဉ် စိတ်ကြိုက်ပြင်ဆင်မှု (Match Settings)' : 'Configure Match Settings'}</span>
          </h3>

          {/* Best of 3 / 5 */}
          {meta.supportsBestOf && mode !== 'room' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">
                {lang === 'my' ? 'အနိုင်အရှုံး အကျော့အရေအတွက် (Rounds)' : 'Match Length (Best Of)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([3, 5] as const).map((bo) => (
                  <button
                    key={bo}
                    type="button"
                    onClick={() => setBestOf(bo)}
                    className={`h-10 rounded-xl border text-xs font-bold cursor-pointer ${
                      bestOf === bo
                        ? 'cyber-gold-active text-amber-200'
                        : 'bg-[#070b14] border-white/10 text-slate-300'
                    }`}
                  >
                    Best of {bo} ({Math.ceil(bo / 2)} Wins)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Turn Timer */}
          {mode !== 'room' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'my' ? 'တစ်လှည့် အချိန်ကန့်သတ်ချက်' : 'Turn Time Limit'}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([15, 20, 30] as TurnTimeLimit[]).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTurnTimeLimit(sec)}
                    className={`h-10 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                      turnTimeLimit === sec
                        ? 'cyber-gold-active text-amber-200'
                        : 'bg-[#070b14] border-white/10 text-slate-300'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bot Difficulty Selector */}
          {mode === 'bot' && gameType !== 'sakarhtar' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">
                {lang === 'my' ? 'AI Bot အခက်အခဲ အဆင့်' : 'AI Bot Difficulty'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'easy', my: 'လွယ်ကူ (Easy)', en: 'Easy' },
                    { id: 'medium', my: 'အလယ်အလတ်', en: 'Medium' },
                    { id: 'hard', my: 'ခက်ခဲ (Pro)', en: 'Hard' },
                  ] as Array<{ id: Difficulty; my: string; en: string }>
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`h-10 rounded-xl border text-xs font-bold cursor-pointer ${
                      difficulty === d.id
                        ? 'cyber-gold-active text-amber-200'
                        : 'bg-[#070b14] border-white/10 text-slate-300'
                    }`}
                  >
                    {lang === 'my' ? d.my : d.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Room Setup */}
          {mode === 'room' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {lang === 'my' ? 'အခန်းအမည်' : 'Room Name'}
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {meta.maxRoomPlayers > 2 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {lang === 'my' ? 'ကစားသမား ဦးရေ' : 'Max Players'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 6, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`h-9 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                          maxPlayers === n ? 'cyber-gold-active text-amber-200' : 'bg-[#070b14] border-white/10 text-slate-300'
                        }`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Join by Code inside Room tab */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <label className="block text-xs text-slate-400">
                  {lang === 'my' ? 'မိတ်ဆွေ၏ Room Code ဖြင့် တိုက်ရိုက်ဝင်ရန်' : 'Or Join Friend Room Code'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="VG-1234"
                    className="flex-1 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (joinCode.trim()) onJoinRoom(joinCode.trim());
                    }}
                    className="px-4 h-10 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-bold text-sky-200 cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Primary Launch Button */}
          {isQueuingThis ? (
            <button
              type="button"
              onClick={onLeaveQueue}
              className="w-full h-12 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/45 text-rose-200 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 animate-pulse" />
              <span>{lang === 'my' ? 'ပြိုင်ဘက်ရှာနေသည်... (ပယ်ဖျက်ရန်)' : 'Searching Opponent... (Cancel)'}</span>
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              disabled={isLocked || (mode === 'room' && isCustomRoomLocked)}
              onClick={handleLaunch}
              className="w-full h-12 rounded-xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              {mode === 'room' ? <Plus className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>
                {mode === 'pvp'
                  ? lang === 'my' ? 'အွန်လိုင်း ပြိုင်ပွဲ စတင်မည်' : 'Start Online Match'
                  : mode === 'bot'
                  ? lang === 'my' ? 'ဂိမ်းစတင် ဆော့ကစားမည်' : 'Launch Solo Match'
                  : lang === 'my' ? 'အခန်းအသစ် ဖန်တီးမည်' : 'Create Friend Room'}
              </span>
            </motion.button>
          )}
        </div>

        {/* Right Side: Rules & Active Rooms for this Game */}
        <div className="md:col-span-5 space-y-4">
          <div className="cyber-panel rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-400" />
              <span>{lang === 'my' ? 'ကစားနည်း စည်းမျဉ်း' : 'How to Play'}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {(lang === 'my' ? meta.rulesMy : meta.rulesEn).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="cyber-panel rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              {lang === 'my'
                ? `ဖွင့်ထားသော အခန်းများ (${gameRooms.length})`
                : `Open Rooms (${gameRooms.length})`}
            </h4>
            {gameRooms.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                {lang === 'my' ? 'လက်ရှိ ဖွင့်ထားသော အခန်းမရှိသေးပါ။' : 'No open rooms for this game yet.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {gameRooms.map((rm) => (
                  <div
                    key={rm.id}
                    className="p-2.5 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-amber-300 truncate">{rm.code}</div>
                      <div className="text-[10px] text-slate-400">
                        {(rm.players || []).length}/{rm.maxPlayers || 2} Players
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
        </div>
      </div>
    </motion.div>
  );
};
