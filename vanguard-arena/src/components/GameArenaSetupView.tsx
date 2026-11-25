import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  Check,
  Clock,
  Crown,
  DoorOpen,
  Flame,
  Info,
  Lock,
  Play,
  Plus,
  Shield,
  Sliders,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { normalizeGameId } from '../lib/serverlessApi.ts';
import type { GameType, Language } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { GameBadgeIcon } from './PremiumIcons.tsx';

type Difficulty = 'easy' | 'medium' | 'hard';
type TurnTimeLimit = 15 | 20 | 30;
type SelectedMode = 'solo' | 'multiplayer' | 'room';

interface GameArenaSetupViewProps {
  lang: Language;
  gameType: GameType;
  featureLocks: Record<string, boolean>;
  openRooms: any[];
  queuedGame: GameType | null;
  onBack: () => void;
  onJoinQueue: (gameType: GameType, bestOf: 3 | 5, turnTimeLimit: TurnTimeLimit) => void;
  onLeaveQueue: () => void;
  onStartBot: (
    gameType: GameType,
    difficulty: Difficulty,
    bestOf: 3 | 5,
    turnTimeLimit: TurnTimeLimit
  ) => void;
  onStartSakarSolo: () => void;
  onCreateRoom: (title: string, maxPlayers: number, gameType: GameType) => void;
  onJoinRoom: (roomIdOrCode: string) => void;
}

const GAME_META: Record<
  GameType,
  {
    titleMy: string;
    titleEn: string;
    rulesMy: string[];
    rulesEn: string[];
    tipMy: string;
    tipEn: string;
    supportsBestOf: boolean;
    maxRoomPlayers: number;
    winXp: number;
    drawXp: number;
  }
> = {
  connect4: {
    titleMy: '၄ လုံးတန်း (Connect 4)',
    titleEn: '4 in a Row',
    rulesMy: [
      'ကစားသမား ၂ ဦး တစ်လှည့်စီ အပြားချ၍ ယှဉ်ပြိုင်ရမည်။',
      'အလျားလိုက်၊ ဒေါင်လိုက် (သို့) ထောင့်ဖြတ် ၄ လုံးတန်းအောင် ဦးစွာချနိုင်သူ နိုင်မည်။',
      'သတ်မှတ်ထားသော တစ်လှည့်အချိန် မကုန်မီ အကွက်ရွေးချယ်ရမည်။',
      'အကွက်အားလုံးပြည့်ပြီး ၄ လုံးမတန်းပါက သရေ (Draw) ဖြစ်မည်။',
    ],
    rulesEn: [
      'Players take turns dropping discs from the top into the 7×6 grid.',
      'Connect 4 discs horizontally, vertically, or diagonally to win.',
      'Complete your move before the turn timer runs out.',
      'Full board with no 4-in-a-row ends in a draw.',
    ],
    tipMy: 'အလယ်တိုင် (Column 4) ကို ဦးစွာယူထားပါက နိုင်ခြေအမြင့်ဆုံးဖြစ်သည်။',
    tipEn: 'Control the center column early to open winning diagonals.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  tictactoe: {
    titleMy: 'X / O အကွက်ချ',
    titleEn: 'Tic-Tac-Toe',
    rulesMy: [
      'X နှင့် O သင်္ကေတကိုယ်စီဖြင့် ၃×၃ ဇယားတွင် တစ်လှည့်စီ ချရမည်။',
      'အလျားလိုက်၊ ဒေါင်လိုက် (သို့) ထောင့်ဖြတ် ၃ လုံးတန်းအောင် ဦးစွာချနိုင်သူ နိုင်မည်။',
      'Best of 3 သို့မဟုတ် Best of 5 အကျော့ စိတ်ကြိုက်ရွေးဆော့နိုင်သည်။',
      '၉ ကွက်လုံးပြည့်ပြီး အနိုင်မပေါ်ပါက သရေ (Draw) သတ်မှတ်မည်။',
    ],
    rulesEn: [
      'Alternate placing X and O marks on a 3×3 grid.',
      'First player to align 3 marks in any line wins the round.',
      'Choose Best of 3 or Best of 5 format in settings.',
      'All 9 squares filled with no line results in a draw.',
    ],
    tipMy: 'အလယ်ကွက်နှင့် ထောင့်ကွက်များကို တွဲဖက်ယူ၍ နှစ်ဖက်ချိန်ကွက် ဖန်တီးပါ။',
    tipEn: 'Pair the center and corner cells to build an unblockable fork.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  rps: {
    titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
    titleEn: 'Rock Paper Scissors',
    rulesMy: [
      'ကျောက်တုံး (Rock) က ကတ်ကြေး (Scissors) ကို နိုင်သည်။',
      'ကတ်ကြေး (Scissors) က စက္ကူ (Paper) ကို နိုင်သည်။',
      'စက္ကူ (Paper) က ကျောက်တုံး (Rock) ကို နိုင်သည်။',
      'ပုံတူကျပါက သရေဖြစ်ပြီး နောက်တစ်ကျော့ ဆက်ယှဉ်ပြိုင်ရမည်။',
    ],
    rulesEn: [
      'Rock crushes Scissors.',
      'Scissors cuts Paper.',
      'Paper covers Rock.',
      'Matching choices tie and move to the next round.',
    ],
    tipMy: 'ပြိုင်ဘက်၏ ယခင်အကျော့ ရွေးချယ်မှုပုံစံကို စောင့်ကြည့်၍ တန်ပြန်ရွေးပါ။',
    tipEn: 'Read your opponent’s previous picks to counter their pattern.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  sakarhtar: {
    titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်း',
    titleEn: 'Wise Owl Quiz',
    rulesMy: [
      'ပေးထားသော အဖြေ ၄ ခုထဲမှ အမှန်ကန်ဆုံးကို အချိန်မီရွေးချယ်ရမည်။',
      'မှန်ကန်စွာဖြေနိုင်တိုင်း +100 မှတ် ရရှိပြီး အမှတ်အများဆုံးသူ နိုင်မည်။',
      'Solo လေ့ကျင့်နိုင်သလို Multiplayer နှင့် 8P Room တွင် အတူပြိုင်နိုင်သည်။',
      'ပွဲစဉ်အနိုင်ရ ချန်ပီယံအား +75 XP ချီးမြှင့်မည်။',
    ],
    rulesEn: [
      'Pick the right answer from 4 choices before time expires.',
      'Each correct answer grants +100 points; highest score wins.',
      'Play Solo, Online Multiplayer, or up to 8-player Rooms.',
      'Match winners earn +75 XP toward global rankings.',
    ],
    tipMy: 'စကားထာဥပမာများကို သေချာဖတ်၍ မြန်မြန်ဆုံးဖြတ်ဖြေဆိုပါ။',
    tipEn: 'Focus on keyword clues and lock in your answer quickly.',
    supportsBestOf: false,
    maxRoomPlayers: 8,
    winXp: 75,
    drawXp: 25,
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
  const normGame = normalizeGameId(gameType);
  const meta = GAME_META[normGame] || GAME_META.connect4;

  // Step 1: null -> Show Solo / Multiplayer / Room + Rules (Zero scroll on mobile)
  // Step 2: mode -> Show Mode-specific Settings + Pinned Play CTA (Zero scroll on mobile)
  const [selectedMode, setSelectedMode] = React.useState<SelectedMode | null>(null);

  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [turnTimeLimit, setTurnTimeLimit] = React.useState<TurnTimeLimit>(20);

  const [roomAction, setRoomAction] = React.useState<'create' | 'join'>('create');
  const [roomTitle, setRoomTitle] = React.useState(
    lang === 'my' ? `${meta.titleMy} အခန်း` : `${meta.titleEn} Room`
  );
  const [maxPlayers, setMaxPlayers] = React.useState<number>(meta.maxRoomPlayers);
  const [joinCode, setJoinCode] = React.useState('');

  React.useEffect(() => {
    setRoomTitle(lang === 'my' ? `${meta.titleMy} အခန်း` : `${meta.titleEn} Room`);
    setMaxPlayers(meta.maxRoomPlayers);
  }, [normGame, lang, meta.titleMy, meta.titleEn, meta.maxRoomPlayers]);

  const gameRooms = React.useMemo(
    () =>
      (Array.isArray(openRooms) ? openRooms : []).filter(
        (r) => normalizeGameId(r.gameType) === normGame && r.status === 'waiting' && !r.isMatchmaking
      ),
    [openRooms, normGame]
  );

  const isGameLocked = Boolean(featureLocks?.[gameType] || featureLocks?.[normGame]);
  const isMatchmakingLocked = Boolean(featureLocks?.matchmaking);
  const isRoomLocked = Boolean(featureLocks?.customRooms);
  const isQueuingThis = queuedGame === gameType || queuedGame === normGame;

  const handleSelectMode = (mode: SelectedMode) => {
    if (isGameLocked) return;
    if (mode === 'multiplayer' && isMatchmakingLocked) return;
    if (mode === 'room' && isRoomLocked) return;
    soundEngine.playClick?.();
    setSelectedMode(mode);
  };

  const handleLaunchGame = () => {
    if (isGameLocked || !selectedMode) return;
    soundEngine.playClick?.();

    if (selectedMode === 'solo') {
      if (normGame === 'sakarhtar') onStartSakarSolo();
      else onStartBot(gameType, difficulty, bestOf, turnTimeLimit);
      return;
    }

    if (selectedMode === 'multiplayer') {
      if (isMatchmakingLocked) return;
      onJoinQueue(gameType, bestOf, turnTimeLimit);
      return;
    }

    if (selectedMode === 'room') {
      if (isRoomLocked) return;
      if (roomAction === 'join') {
        if (!joinCode.trim()) return;
        onJoinRoom(joinCode.trim());
      } else {
        onCreateRoom(roomTitle.trim() || meta.titleEn, maxPlayers, gameType);
      }
    }
  };

  const modeOptions: Array<{
    id: SelectedMode;
    label: string;
    tagMy: string;
    tagEn: string;
    descMy: string;
    descEn: string;
    icon: React.ReactNode;
    accent: string;
    ring: string;
    locked: boolean;
  }> = [
    {
      id: 'solo',
      label: 'Solo',
      tagMy: normGame === 'sakarhtar' ? 'တစ်ဦးတည်း' : 'VS AI Bot',
      tagEn: normGame === 'sakarhtar' ? 'Practice' : 'VS AI Bot',
      descMy: 'AI နှင့် လေ့ကျင့်ကစားမည်',
      descEn: 'Play against AI Bot',
      icon: <Bot className="w-6 h-6 text-emerald-300" />,
      accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      ring: 'hover:border-emerald-400/70',
      locked: isGameLocked,
    },
    {
      id: 'multiplayer',
      label: 'Multiplayer',
      tagMy: 'အွန်လိုင်း PvP',
      tagEn: 'Live Ranked',
      descMy: 'ပြိုင်ဘက်ရှာ ယှဉ်ပြိုင်မည်',
      descEn: 'Match live online rivals',
      icon: <Swords className="w-6 h-6 text-sky-300" />,
      accent: 'from-sky-500/20 via-sky-500/5 to-transparent',
      ring: 'hover:border-sky-400/70',
      locked: isGameLocked || isMatchmakingLocked,
    },
    {
      id: 'room',
      label: 'Room',
      tagMy: gameRooms.length > 0 ? `${gameRooms.length} ခန်းဖွင့်` : `${meta.maxRoomPlayers} ဦးအထိ`,
      tagEn: gameRooms.length > 0 ? `${gameRooms.length} Open` : `Up to ${meta.maxRoomPlayers}P`,
      descMy: 'မိတ်ဆွေ အခန်းဖွင့်/ဝင်မည်',
      descEn: 'Host or join friend room',
      icon: <Users className="w-6 h-6 text-amber-300" />,
      accent: 'from-amber-500/20 via-amber-500/5 to-transparent',
      ring: 'hover:border-amber-400/75',
      locked: isGameLocked || isRoomLocked,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-7 min-h-[calc(100dvh-7.5rem)] flex flex-col gap-3 sm:gap-5 overflow-visible">
      {/* COMPACT GAME TITLE HEADER (No giant image banner) */}
      <div className="cyber-panel rounded-[1.35rem] px-4 py-3.5 sm:px-6 sm:py-5 border border-amber-300/25 flex items-center justify-between gap-3 shrink-0 shadow-[0_18px_45px_rgba(0,0,0,.24)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick?.();
              if (selectedMode) setSelectedMode(null);
              else onBack();
            }}
            aria-label="Back"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-amber-300 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-[#070b14] border border-amber-400/30 flex items-center justify-center shrink-0">
            <GameBadgeIcon gameType={normGame} className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-display font-extrabold text-white truncate leading-tight">
              {lang === 'my' ? meta.titleMy : meta.titleEn}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300/90 mt-0.5">
              <span className="text-emerald-300">WIN +{meta.winXp} XP</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-300">DRAW +{meta.drawXp} XP</span>
            </div>
          </div>
        </div>

        {/* Compact Step Pill */}
        <span className="px-2.5 py-1 rounded-lg bg-[#070b14] border border-white/10 text-[10px] font-mono font-bold text-amber-300 shrink-0">
          {selectedMode ? '2 / 2' : '1 / 2'}
        </span>
      </div>

      {/* BODY: ZERO-SCROLL MOBILE LAYOUT */}
      <AnimatePresence mode="wait">
        {!selectedMode ? (
          /* ==============================================================
             STEP 1: 3 MODE BUTTONS (SOLO / MULTIPLAYER / ROOM) + RULES
          =============================================================== */
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-4"
          >
            {/* 3 Side-by-Side Mode Cards (All 3 visible immediately without scrolling) */}
            <div className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-300">
                  {lang === 'my' ? 'ကစားမည့် Mode ရွေးချယ်ပါ' : 'Select Game Mode'}
                </span>
                <span className="text-[10px] text-amber-300/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{lang === 'my' ? 'နှိပ်၍ Settings ချိန်ညှိပါ' : 'Tap to configure'}</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {modeOptions.map((m) => (
                  <motion.button
                    key={m.id}
                    type="button"
                    disabled={m.locked}
                    whileHover={m.locked ? undefined : { y: -2 }}
                    whileTap={m.locked ? undefined : { scale: 0.96 }}
                    onClick={() => handleSelectMode(m.id)}
                    className={`mr-interactive-card relative rounded-2xl cyber-panel border border-white/15 ${m.ring} bg-gradient-to-b ${m.accent} p-2.5 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg`}
                  >
                    {m.locked && (
                      <span className="absolute top-1.5 right-1.5 text-rose-400">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}

                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#070b14]/90 border border-white/15 flex items-center justify-center shadow-inner">
                      {m.icon}
                    </div>

                    <div className="font-display font-extrabold text-xs sm:text-base text-white leading-tight">
                      {m.label}
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-black/55 border border-white/10 text-[9px] sm:text-[10px] font-bold text-amber-300 truncate max-w-full">
                      {lang === 'my' ? m.tagMy : m.tagEn}
                    </span>

                    <p className="hidden sm:block text-[11px] text-slate-400 leading-snug">
                      {lang === 'my' ? m.descMy : m.descEn}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Game Rules Panel Directly Below the 3 Options */}
            <div className="flex-1 min-h-0 cyber-panel rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                <h2 className="text-xs sm:text-sm font-display font-bold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'my' ? 'ကစားနည်း စည်းမျဉ်းများ' : 'How to Play'}</span>
                </h2>
                <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>{lang === 'my' ? 'စည်းကမ်းချက်' : 'Rules'}</span>
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 sm:space-y-2 pr-0.5">
                {(lang === 'my' ? meta.rulesMy : meta.rulesEn).map((rule, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-2 rounded-xl bg-[#070b14]/85 border border-white/10 flex items-start gap-2 text-[11px] sm:text-xs text-slate-200 leading-snug"
                  >
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              {/* Compact Strategy Tip */}
              <div className="px-2.5 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-2 text-[11px] shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-amber-300">{lang === 'my' ? 'အကြံပြုချက်: ' : 'Tip: '}</strong>
                  {lang === 'my' ? meta.tipMy : meta.tipEn}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ==============================================================
             STEP 2: MODE-SPECIFIC GAME SETTINGS + FIXED BOTTOM PLAY DOCK
          =============================================================== */
          <motion.div
            key={`step-2-${selectedMode}`}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.16 }}
            className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3.5"
          >
            {/* Compact Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#080d18] border border-white/10 shrink-0">
              {(
                [
                  { id: 'solo', label: 'Solo', icon: Bot, locked: isGameLocked },
                  {
                    id: 'multiplayer',
                    label: 'Multiplayer',
                    icon: Swords,
                    locked: isGameLocked || isMatchmakingLocked,
                  },
                  { id: 'room', label: 'Room', icon: Users, locked: isGameLocked || isRoomLocked },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = selectedMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={tab.locked}
                    onClick={() => handleSelectMode(tab.id)}
                    className={`h-9 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                      active
                        ? 'cyber-gold-active text-amber-200'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Panel (Compact, fits cleanly on mobile without scrolling) */}
            <div className="flex-1 min-h-0 cyber-panel rounded-2xl p-3.5 sm:p-5 border border-white/10 overflow-y-auto space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xs sm:text-sm font-display font-bold text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>
                    {selectedMode === 'solo'
                      ? lang === 'my' ? 'Solo ဂိမ်း Settings' : 'Solo Settings'
                      : selectedMode === 'multiplayer'
                      ? lang === 'my' ? 'Multiplayer ဂိမ်း Settings' : 'Multiplayer Settings'
                      : lang === 'my' ? 'Room အခန်း Settings' : 'Room Settings'}
                  </span>
                </h3>
                <span className="text-[10px] font-mono uppercase text-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>

              {/* --- SOLO SETTINGS --- */}
              {selectedMode === 'solo' && (
                <div className="space-y-3.5">
                  {normGame !== 'sakarhtar' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lang === 'my' ? 'AI Bot အခက်အခဲ အဆင့်' : 'AI Difficulty'}</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { id: 'easy', my: 'လွယ်ကူ', en: 'Easy', stars: 1 },
                              { id: 'medium', my: 'အလယ်', en: 'Medium', stars: 2 },
                              { id: 'hard', my: 'ခက်ခဲ', en: 'Hard', stars: 3 },
                            ] as const
                          ).map((lvl) => {
                            const active = difficulty === lvl.id;
                            return (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick?.();
                                  setDifficulty(lvl.id);
                                }}
                                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                  active
                                    ? 'cyber-violet-active text-white'
                                    : 'bg-[#070b14] border-white/10 text-slate-300 hover:border-white/25'
                                }`}
                              >
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {Array.from({ length: lvl.stars }).map((_, idx) => (
                                    <Star key={idx} className="w-3 h-3 fill-current" />
                                  ))}
                                </div>
                                <span className="text-xs font-extrabold">{lang === 'my' ? lvl.my : lvl.en}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {meta.supportsBestOf && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'my' ? 'အကျော့အရေအတွက် (Rounds)' : 'Match Length'}</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {([3, 5] as const).map((bo) => (
                              <button
                                key={bo}
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick?.();
                                  setBestOf(bo);
                                }}
                                className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                                  bestOf === bo
                                    ? 'cyber-gold-active text-amber-200'
                                    : 'bg-[#070b14] border-white/10 text-slate-300'
                                }`}
                              >
                                <span>Best of {bo}</span>
                                <span className="text-[10px] font-mono text-slate-400">({Math.ceil(bo / 2)}W)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#070b14] border border-amber-400/30 text-xs text-slate-200 leading-relaxed">
                      <span className="font-bold text-amber-300 block mb-1">
                        {lang === 'my' ? 'ပညာရှိ ဇီးကွက် Solo ဉာဏ်စမ်း' : 'Wise Owl Solo Mode'}
                      </span>
                      {lang === 'my'
                        ? 'မြန်မာ့စကားထာနှင့် ဗဟုသုတမေးခွန်းများကို ပညာရှိဇီးကွက် AI နှင့် ယှဉ်ပြိုင်ဖြေဆိုပါ။'
                        : 'Answer Myanmar riddles and trivia head-to-head against the Wise Owl.'}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>{lang === 'my' ? 'တစ်လှည့် အချိန်ကန့်သတ်ချက်' : 'Turn Timer'}</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([15, 20, 30] as TurnTimeLimit[]).map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick?.();
                            setTurnTimeLimit(sec);
                          }}
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
                </div>
              )}

              {/* --- MULTIPLAYER SETTINGS --- */}
              {selectedMode === 'multiplayer' && (
                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/35 flex items-center gap-2.5 text-xs text-slate-200">
                    <Shield className="w-5 h-5 text-sky-400 shrink-0" />
                    <span className="leading-snug">
                      {lang === 'my'
                        ? 'အဆင့်တူ အွန်လိုင်းပြိုင်ဘက်ကို အလိုအလျောက် ရှာဖွေချိတ်ဆက်ပေးမည် (+75 XP)။'
                        : 'Auto-matches you with a live online rival near your XP (+75 XP).'}
                    </span>
                  </div>

                  {meta.supportsBestOf && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'my' ? 'အကျော့အရေအတွက် (Rounds)' : 'Match Format'}</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {([3, 5] as const).map((bo) => (
                          <button
                            key={bo}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick?.();
                              setBestOf(bo);
                            }}
                            className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                              bestOf === bo
                                ? 'cyber-gold-active text-amber-200'
                                : 'bg-[#070b14] border-white/10 text-slate-300'
                            }`}
                          >
                            <span>Best of {bo}</span>
                            <span className="text-[10px] font-mono text-slate-400">({Math.ceil(bo / 2)}W)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>{lang === 'my' ? 'တစ်လှည့် အချိန်ကန့်သတ်ချက်' : 'Turn Timer'}</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([15, 20, 30] as TurnTimeLimit[]).map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick?.();
                            setTurnTimeLimit(sec);
                          }}
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
                </div>
              )}

              {/* --- ROOM SETTINGS --- */}
              {selectedMode === 'room' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#070b14] border border-white/10">
                    <button
                      type="button"
                      onClick={() => setRoomAction('create')}
                      className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        roomAction === 'create'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'အခန်းဖွင့်မည်' : 'Create Room'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomAction('join')}
                      className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        roomAction === 'join'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'Code ဖြင့်ဝင်မည်' : 'Join Code'}</span>
                    </button>
                  </div>

                  {roomAction === 'create' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          {lang === 'my' ? 'အခန်းအမည်' : 'Room Name'}
                        </label>
                        <input
                          type="text"
                          value={roomTitle}
                          onChange={(e) => setRoomTitle(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          {lang === 'my' ? 'ကစားသမား ဦးရေ' : 'Max Players'}
                        </label>
                        {meta.maxRoomPlayers > 2 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {[2, 4, 6, 8].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setMaxPlayers(n)}
                                className={`h-9 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                                  maxPlayers === n
                                    ? 'cyber-gold-active text-amber-200'
                                    : 'bg-[#070b14] border-white/10 text-slate-300'
                                }`}
                              >
                                {n}P
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-xs text-amber-300 font-semibold">
                            1 vs 1 Private Duel Room (2 Players)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder={lang === 'my' ? 'Room Code ထည့်ပါ (ဥပမာ MR-1234)' : 'Enter Code (e.g. MR-1234)'}
                        className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-amber-400/40 text-xs font-mono font-bold text-amber-200 tracking-wider focus:outline-none focus:border-amber-400"
                      />

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-sky-300 uppercase">
                          {lang === 'my'
                            ? `ဖွင့်ထားသော အခန်းများ (${gameRooms.length})`
                            : `Open Rooms (${gameRooms.length})`}
                        </div>
                        {gameRooms.length === 0 ? (
                          <div className="text-[11px] text-slate-500 py-3 text-center rounded-xl bg-[#070b14] border border-white/5">
                            {lang === 'my' ? 'လက်ရှိ ဖွင့်ထားသော အခန်းမရှိသေးပါ။' : 'No open rooms yet.'}
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-0.5">
                            {gameRooms.map((rm) => (
                              <div
                                key={rm.id}
                                className="px-2.5 py-2 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0 truncate">
                                  <span className="font-mono font-bold text-amber-300">{rm.code}</span>
                                  <span className="text-slate-400 text-[10px] ml-1.5">
                                    {(rm.players || []).length}/{rm.maxPlayers || 2}P
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onJoinRoom(rm.id)}
                                  className="px-3 h-7 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-[11px] cursor-pointer shrink-0"
                                >
                                  Join
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PINNED BOTTOM LAUNCH DOCK (Always visible on mobile — zero scrolling!) */}
            <div className="cyber-panel rounded-2xl p-2.5 sm:p-3 border border-amber-400/40 shrink-0 space-y-2 bg-gradient-to-r from-[#0e1628] via-[#11192e] to-[#0e1628]">
              {/* Inline Setting Summary Chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-300 font-bold uppercase">
                  {selectedMode}
                </span>
                {selectedMode === 'solo' && normGame !== 'sakarhtar' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase">
                    AI: {difficulty}
                  </span>
                )}
                {selectedMode !== 'room' && meta.supportsBestOf && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold">
                    Best of {bestOf}
                  </span>
                )}
                {selectedMode !== 'room' && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-bold">
                    {turnTimeLimit}s
                  </span>
                )}
                {selectedMode === 'room' && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-bold">
                    {roomAction === 'create' ? `${maxPlayers}P Room` : joinCode.trim() || 'Code Join'}
                  </span>
                )}
              </div>

              {isQueuingThis ? (
                <button
                  type="button"
                  onClick={onLeaveQueue}
                  className="w-full h-11 sm:h-12 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>{lang === 'my' ? 'ပြိုင်ဘက်ရှာနေသည်... (ပယ်ဖျက်မည်)' : 'Searching... (Cancel)'}</span>
                </button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={
                    isGameLocked ||
                    (selectedMode === 'room' && roomAction === 'join' && !joinCode.trim())
                  }
                  onClick={handleLaunchGame}
                  className="w-full h-11 sm:h-12 rounded-xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.45)] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {selectedMode === 'room' && roomAction === 'join'
                      ? lang === 'my'
                        ? 'အခန်းထဲ ဝင်ကစားမည်'
                        : 'Join & Play'
                      : lang === 'my'
                      ? 'ကစားမည်'
                      : 'Play Now'}
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
