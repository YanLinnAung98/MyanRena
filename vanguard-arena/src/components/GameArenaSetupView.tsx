import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Crown,
  DoorOpen,
  Flame,
  Gamepad2,
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
import { GameStage3D, TiltCard3D } from './Game3DVisuals.tsx';
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
    tipMy: string;
    tipEn: string;
    supportsBestOf: boolean;
    maxRoomPlayers: number;
    winXp: number;
    drawXp: number;
  }
> = {
  connect4: {
    titleMy: '၄ လုံးတန်း ဗျူဟာကွင်း (Connect 4)',
    titleEn: '4 in a Row Strategy Arena',
    subtitleMy: 'အလျားလိုက်၊ ဒေါင်လိုက် သို့မဟုတ် ထောင့်ဖြတ် ၄ လုံးတန်းအောင် ဦးစွာချကစားပါ။',
    subtitleEn: 'Connect four glowing discs horizontally, vertically, or diagonally.',
    rulesMy: [
      'ကစားသမား ၂ ဦး တစ်လှည့်စီ အပြားများကို အပေါ်မှချ၍ ယှဉ်ပြိုင်ရမည်။',
      'အလျားလိုက်၊ ဒေါင်လိုက် သို့မဟုတ် ထောင့်ဖြတ် ၄ လုံးတန်းအောင် ဦးစွာချနိုင်သူ အနိုင်ရမည်။',
      'သတ်မှတ်ထားသော တစ်လှည့်အချိန် (Turn Timer) မကုန်မီ အကွက်ရွေးချယ်ရမည်။',
      'အကွက်အားလုံးပြည့်သွားပြီး ၄ လုံးမတန်းပါက သရေ (Draw) အဖြစ် သတ်မှတ်မည်။',
    ],
    rulesEn: [
      'Players take turns dropping colored discs from the top into the 7×6 grid.',
      'First player to connect 4 discs horizontally, vertically, or diagonally wins.',
      'Complete your move before the turn timer expires.',
      'If the grid fills completely with no four-in-a-row, the round ends in a draw.',
    ],
    tipMy: 'အလယ်တိုင် (Column 4) ကို ဦးစွာထိန်းချုပ်နိုင်ပါက ဘက်ပေါင်းစုံမှ ၄ လုံးတန်းနိုင်ခြေ အမြင့်ဆုံးဖြစ်ပါသည်။',
    tipEn: 'Control the center column early to maximize diagonal and horizontal winning lines.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  tictactoe: {
    titleMy: 'X / O အကွက်ချ ဉာဏ်ရည်ပြိုင်ပွဲ',
    titleEn: 'Tic-Tac-Toe Neon Duel',
    subtitleMy: 'မြန်ဆန်တိကျသော ၃×၃ Neon Hologram အကွက်ချ ဗျူဟာပြိုင်ပွဲ။',
    subtitleEn: 'Fast-paced 3×3 tactical hologram showdown.',
    rulesMy: [
      'ကစားသမား ၂ ဦး X နှင့် O သင်္ကေတကိုယ်စီဖြင့် ၃×၃ ဇယားတွင် တစ်လှည့်စီ ချရမည်။',
      'အလျားလိုက်၊ ဒေါင်လိုက် သို့မဟုတ် ထောင့်ဖြတ် ၃ လုံးတန်းအောင် ဦးစွာချနိုင်သူ အနိုင်ရမည်။',
      'Best of 3 သို့မဟုတ် Best of 5 အကျော့အရေအတွက် စိတ်ကြိုက်ရွေးချယ် ယှဉ်ပြိုင်နိုင်သည်။',
      'အကွက် ၉ ကွက်လုံးပြည့်ပြီး အနိုင်အရှုံးမပေါ်ပါက သရေ (Draw) ဖြစ်မည်။',
    ],
    rulesEn: [
      'Two players alternate placing X and O marks on a 3×3 grid.',
      'Align 3 identical marks horizontally, vertically, or diagonally to win.',
      'Configure Best of 3 or Best of 5 rounds before starting.',
      'If all 9 squares fill without a winner, the round ends in a draw.',
    ],
    tipMy: 'အလယ်ကွက်နှင့် ထောင့်ကွက်များကို တွဲဖက်ယူခြင်းဖြင့် ပြိုင်ဘက်မတားဆီးနိုင်သည့် နှစ်ဖက်ချိန်ကွက် ဖန်တီးနိုင်သည်။',
    tipEn: 'Combine the center and corner squares to set up an unblockable fork.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  rps: {
    titleMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး (RPS)',
    titleEn: 'Rock Paper Scissors Arena',
    subtitleMy: 'ပြိုင်ဘက်၏ စိတ်ကို ဖတ်၍ တစ်ပြိုင်နက်တည်း ရွေးချယ်ယှဉ်ပြိုင်ပါ။',
    subtitleEn: 'Outsmart your rival in simultaneous reflex rounds.',
    rulesMy: [
      'ကျောက်တုံး (Rock) က ကတ်ကြေး (Scissors) ကို နိုင်သည်။',
      'ကတ်ကြေး (Scissors) က စက္ကူ (Paper) ကို နိုင်သည်။',
      'စက္ကူ (Paper) က ကျောက်တုံး (Rock) ကို နိုင်သည်။',
      'နှစ်ဦးစလုံး တူညီသောပုံရွေးမိပါက သရေကျပြီး နောက်တစ်ကျော့ ဆက်ယှဉ်ပြိုင်ရမည်။',
    ],
    rulesEn: [
      'Rock crushes Scissors.',
      'Scissors cuts Paper.',
      'Paper covers Rock.',
      'Matching choices result in a draw and proceed to the next round.',
    ],
    tipMy: 'ပြိုင်ဘက်၏ ယခင်အကျော့ ရွေးချယ်မှုပုံစံကို စောင့်ကြည့်ပြီး စိတ်ပညာအရ တန်ပြန်ရွေးချယ်ပါ။',
    tipEn: 'Track your rival’s round patterns to anticipate their next pick.',
    supportsBestOf: true,
    maxRoomPlayers: 2,
    winXp: 75,
    drawXp: 25,
  },
  sakarhtar: {
    titleMy: 'ပညာရှိ ဇီးကွက် ဉာဏ်စမ်းပဟေဠိ',
    titleEn: 'Wise Owl Quiz Showdown',
    subtitleMy: 'မြန်မာ့စကားထာနှင့် အထွေထွေဗဟုသုတ ဉာဏ်စမ်းမေးခွန်းများ ဖြေဆိုပါ။',
    subtitleEn: 'Test your wit across Myanmar riddles and rapid trivia.',
    rulesMy: [
      'မေးခွန်းတစ်ခုစီတွင် အဖြေ ၄ ခု ပေးထားပြီး အမှန်ကန်ဆုံးအဖြေကို အချိန်မီရွေးချယ်ရမည်။',
      'မှန်ကန်စွာဖြေဆိုနိုင်တိုင်း +100 မှတ် ရရှိမည်ဖြစ်ပြီး စုစုပေါင်းအမှတ်အများဆုံးသူ အနိုင်ရမည်။',
      'Solo ဖြင့် တစ်ဦးတည်း လေ့ကျင့်နိုင်သလို Multiplayer နှင့် 8-Player Room များတွင် အတူပြိုင်နိုင်သည်။',
      'ပွဲစဉ်ပြီးဆုံးချိန် အမှတ်အများဆုံး ချန်ပီယံအား +75 XP ချီးမြှင့်မည်။',
    ],
    rulesEn: [
      'Select the correct answer from 4 choices before time runs out.',
      'Each correct answer awards +100 points; highest score wins.',
      'Practice in Solo mode, join Multiplayer, or host up to 8 players in a Room.',
      'Match champions earn +75 XP toward global rankings.',
    ],
    tipMy: 'မေးခွန်းစကားလုံးများ၏ ဥပမာနှင့် အဓိပ္ပာယ်ကို သေချာဖတ်၍ မြန်မြန်ဆုံးဖြတ်ဖြေဆိုပါ။',
    tipEn: 'Read riddle clues carefully and lock in your answer before the timer drops.',
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

  // Step 1: selectedMode === null (Show Solo / Multiplayer / Room + Rules)
  // Step 2: selectedMode !== null (Show Mode-Specific Game Settings + Play Button)
  const [selectedMode, setSelectedMode] = React.useState<SelectedMode | null>(null);

  // Mode-specific settings state
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [bestOf, setBestOf] = React.useState<3 | 5>(3);
  const [turnTimeLimit, setTurnTimeLimit] = React.useState<TurnTimeLimit>(20);

  // Room-specific settings state
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
      if (normGame === 'sakarhtar') {
        onStartSakarSolo();
      } else {
        onStartBot(gameType, difficulty, bestOf, turnTimeLimit);
      }
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

  const modeCards: Array<{
    id: SelectedMode;
    titleMy: string;
    titleEn: string;
    badge: string;
    descMy: string;
    descEn: string;
    icon: React.ReactNode;
    accentBg: string;
    borderHover: string;
    glow: string;
    locked: boolean;
  }> = [
    {
      id: 'solo',
      titleMy: 'Solo',
      titleEn: 'Solo',
      badge: normGame === 'sakarhtar' ? 'PRACTICE' : 'VS AI BOT',
      descMy:
        normGame === 'sakarhtar'
          ? 'ပညာရှိဇီးကွက် ဉာဏ်စမ်းမေးခွန်းများကို တစ်ဦးတည်း လေ့ကျင့်ဖြေဆိုမည်'
          : 'Easy / Medium / Hard AI Bot နှင့် တစ်ဦးတည်း စိတ်ကြိုက်လေ့ကျင့်ကစားမည်',
      descEn:
        normGame === 'sakarhtar'
          ? 'Challenge the Wise Owl solo across Myanmar riddles & trivia.'
          : 'Train and battle against Easy, Medium, or Pro AI Bot.',
      icon: <Bot className="w-6 h-6 text-emerald-300" />,
      accentBg: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderHover: 'hover:border-emerald-400/70',
      glow: 'rgba(16, 185, 129, 0.32)',
      locked: isGameLocked,
    },
    {
      id: 'multiplayer',
      titleMy: 'Multiplayer',
      titleEn: 'Multiplayer',
      badge: 'LIVE RANKED',
      descMy: 'အွန်လိုင်းရှိ အဆင့်တူ ကစားသမားများနှင့် Real-Time တိုက်ရိုက်ယှဉ်ပြိုင်မည်',
      descEn: 'Auto-match with live online rivals in real-time ranked battles.',
      icon: <Swords className="w-6 h-6 text-sky-300" />,
      accentBg: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderHover: 'hover:border-sky-400/70',
      glow: 'rgba(56, 189, 248, 0.35)',
      locked: isGameLocked || isMatchmakingLocked,
    },
    {
      id: 'room',
      titleMy: 'Room',
      titleEn: 'Room',
      badge: gameRooms.length > 0 ? `${gameRooms.length} OPEN` : `UP TO ${meta.maxRoomPlayers}P`,
      descMy: 'သီးသန့်အခန်းဖန်တီး၍ မိတ်ဆွေများကို ဖိတ်ခေါ်မည် သို့မဟုတ် Room Code ဖြင့်ဝင်မည်',
      descEn: 'Host a private arena with invite code or join an open friend room.',
      icon: <Users className="w-6 h-6 text-amber-300" />,
      accentBg: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderHover: 'hover:border-amber-400/75',
      glow: 'rgba(251, 191, 36, 0.35)',
      locked: isGameLocked || isRoomLocked,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* Top Navigation & Step Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick?.();
            if (selectedMode) setSelectedMode(null);
            else onBack();
          }}
          className="px-3.5 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>
            {selectedMode
              ? lang === 'my'
                ? 'Mode ရွေးချယ်မှုသို့ ပြန်သွားမည်'
                : 'Back to Modes'
              : lang === 'my'
              ? 'ကစားကွင်းသို့ ပြန်သွားမည်'
              : 'Back to Lobby'}
          </span>
        </button>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090e1a] border border-white/10 text-[11px] font-bold">
          <span className={!selectedMode ? 'text-amber-300' : 'text-emerald-400 flex items-center gap-1'}>
            {selectedMode ? <Check className="w-3.5 h-3.5" /> : '1.'}{' '}
            {lang === 'my' ? 'Mode ရွေးချယ်ရန်' : 'Select Mode'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className={selectedMode ? 'text-amber-300' : 'text-slate-500'}>
            2. {lang === 'my' ? 'Game Settings' : 'Game Settings'}
          </span>
        </div>
      </div>

      {/* 3D Animated Hero Header */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.12)] relative">
        <div className="relative">
          <GameStage3D gameType={normGame} compact={Boolean(selectedMode)} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d18] via-[#080d18]/45 to-transparent pointer-events-none" />

          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <GameBadgeIcon gameType={normGame} className="w-4 h-4" />
              <span className="uppercase">{normGame}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300">
                WIN +{meta.winXp} XP
              </span>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-xl bg-sky-500/20 backdrop-blur-md border border-sky-400/40 text-[10px] font-mono font-bold text-sky-300">
                DRAW +{meta.drawXp} XP
              </span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h1 className="text-lg sm:text-2xl font-display font-extrabold text-white drop-shadow">
              {lang === 'my' ? meta.titleMy : meta.titleEn}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 line-clamp-2">
              {lang === 'my' ? meta.subtitleMy : meta.subtitleEn}
            </p>
          </div>
        </div>
      </div>

      {/* Animated 2-Step Body */}
      <AnimatePresence mode="wait">
        {/* ================================================================
            STEP 1: 3 MODE CARDS (SOLO / MULTIPLAYER / ROOM) + GAME RULES
        ================================================================= */}
        {!selectedMode ? (
          <motion.div
            key="step-modes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* 3 Primary Mode Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'my' ? 'ကစားမည့် ပုံစံ (Mode) ရွေးချယ်ပါ' : 'Choose Play Mode'}</span>
                </h2>
                <span className="text-[11px] text-amber-300/90 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'နှိပ်၍ Settings ချိန်ညှိပါ' : 'Select to configure'}</span>
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3.5">
                {modeCards.map((card) => (
                  <TiltCard3D
                    key={card.id}
                    disabled={card.locked}
                    glowColor={card.glow}
                    onClick={() => handleSelectMode(card.id)}
                    className={`cyber-panel border border-white/15 ${card.borderHover} overflow-hidden shadow-xl`}
                  >
                    <div className={`p-4 sm:p-5 h-full flex flex-col justify-between gap-4 bg-gradient-to-br ${card.accentBg}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-[#070b14]/90 border border-white/15 flex items-center justify-center shadow-inner">
                            {card.icon}
                          </div>
                          {card.locked ? (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 border border-rose-400/40 text-[10px] font-bold text-rose-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-amber-300">
                              {card.badge}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-display font-extrabold text-white tracking-wide">
                            {lang === 'my' ? card.titleMy : card.titleEn}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {lang === 'my' ? card.descMy : card.descEn}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-300">
                        <span>{lang === 'my' ? 'Settings ပြင်ဆင်မည်' : 'Configure Settings'}</span>
                        <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/35 flex items-center justify-center">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </TiltCard3D>
                ))}
              </div>
            </div>

            {/* Game Rules & Pro Tips Panel (Directly Underneath the 3 Options) */}
            <div className="cyber-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'my' ? 'ကစားနည်း စည်းမျဉ်းများ (Game Rules)' : 'How to Play & Rules'}</span>
                </h3>
                <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  {lang === 'my' ? `အနိုင် +${meta.winXp} XP · သရေ +${meta.drawXp} XP` : `Win +${meta.winXp} XP · Draw +${meta.drawXp} XP`}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {(lang === 'my' ? meta.rulesMy : meta.rulesEn).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#070b14]/90 border border-white/10 flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              {/* Pro Strategy Tip Strip */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent border border-amber-400/30 flex items-start gap-2.5 text-xs">
                <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">
                    {lang === 'my' ? 'အနိုင်ရရန် အကြံပြုချက်: ' : 'Pro Tip: '}
                  </span>
                  <span className="text-slate-200">{lang === 'my' ? meta.tipMy : meta.tipEn}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================================================================
              STEP 2: MODE-SPECIFIC GAME SETTINGS + LAUNCH BUTTON
          ================================================================= */
          <motion.div
            key={`step-settings-${selectedMode}`}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Quick Mode Switcher Pill Bar */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#080d18] border border-white/10">
              {(
                [
                  { id: 'solo', label: 'Solo', icon: Bot, locked: isGameLocked },
                  { id: 'multiplayer', label: 'Multiplayer', icon: Swords, locked: isGameLocked || isMatchmakingLocked },
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
                    className={`h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                      active
                        ? 'cyber-gold-active text-amber-200'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-12 gap-4">
              {/* LEFT: Mode-Specific Interactive Settings (7 cols) */}
              <div className="lg:col-span-7 cyber-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm sm:text-base font-display font-bold text-amber-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>
                      {selectedMode === 'solo'
                        ? lang === 'my' ? 'Solo ဂိမ်း Settings ပြင်ဆင်ရန်' : 'Solo Mode Settings'
                        : selectedMode === 'multiplayer'
                        ? lang === 'my' ? 'Multiplayer ဂိမ်း Settings ပြင်ဆင်ရန်' : 'Multiplayer Settings'
                        : lang === 'my' ? 'Room အခန်း Settings ပြင်ဆင်ရန်' : 'Private Room Settings'}
                    </span>
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-white/5 text-slate-300">
                    {selectedMode}
                  </span>
                </div>

                {/* --- SOLO SETTINGS --- */}
                {selectedMode === 'solo' && (
                  <div className="space-y-4">
                    {normGame !== 'sakarhtar' ? (
                      <>
                        {/* AI Difficulty Selector Cards */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-emerald-400" />
                            <span>{lang === 'my' ? 'AI Bot အခက်အခဲ အဆင့် ရွေးချယ်ပါ' : 'Select AI Difficulty'}</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {(
                              [
                                { id: 'easy', my: 'လွယ်ကူ', en: 'Easy', stars: 1, subMy: 'စတင်လေ့ကျင့်ရန်', subEn: 'Casual' },
                                { id: 'medium', my: 'အလယ်အလတ်', en: 'Medium', stars: 2, subMy: 'မျှတသောစိန်ခေါ်မှု', subEn: 'Balanced' },
                                { id: 'hard', my: 'ခက်ခဲ (Pro)', en: 'Hard', stars: 3, subMy: 'အဆင့်မြင့် AI', subEn: 'Master AI' },
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
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    active
                                      ? 'cyber-violet-active text-white'
                                      : 'bg-[#070b14] border-white/10 text-slate-300 hover:border-white/25'
                                  }`}
                                >
                                  <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                                    {Array.from({ length: lvl.stars }).map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-current" />
                                    ))}
                                  </div>
                                  <div className="text-xs font-extrabold">{lang === 'my' ? lvl.my : lvl.en}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {lang === 'my' ? lvl.subMy : lvl.subEn}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Best Of Selector */}
                        {meta.supportsBestOf && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Crown className="w-4 h-4 text-amber-400" />
                              <span>{lang === 'my' ? 'အကျော့အရေအတွက် (Match Format)' : 'Match Length'}</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                              {([3, 5] as const).map((bo) => (
                                <button
                                  key={bo}
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick?.();
                                    setBestOf(bo);
                                  }}
                                  className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                    bestOf === bo
                                      ? 'cyber-gold-active text-amber-200'
                                      : 'bg-[#070b14] border-white/10 text-slate-300 hover:border-white/25'
                                  }`}
                                >
                                  <span>Best of {bo}</span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({Math.ceil(bo / 2)} Wins)
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#070b14] border border-amber-400/30 space-y-2">
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          <span>{lang === 'my' ? 'ပညာရှိ ဇီးကွက် Solo စိန်ခေါ်မှု' : 'Wise Owl Solo Challenge'}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {lang === 'my'
                            ? 'မြန်မာ့စကားထာနှင့် အထွေထွေဗဟုသုတ မေးခွန်းများကို ပညာရှိဇီးကွက် AI နှင့် ယှဉ်ပြိုင်ဖြေဆိုပြီး အမှတ်နှင့် XP များ စုဆောင်းနိုင်ပါသည်။'
                            : 'Answer Myanmar riddles and trivia head-to-head against the Wise Owl AI to earn XP.'}
                        </p>
                      </div>
                    )}

                    {/* Turn Timer Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'my' ? 'တစ်လှည့် အချိန်ကန့်သတ်ချက် (Turn Timer)' : 'Turn Timer'}</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { sec: 15 as TurnTimeLimit, tagMy: 'အမြန်', tagEn: 'Blitz' },
                            { sec: 20 as TurnTimeLimit, tagMy: 'ပုံမှန်', tagEn: 'Standard' },
                            { sec: 30 as TurnTimeLimit, tagMy: 'အေးဆေး', tagEn: 'Relaxed' },
                          ]
                        ).map((item) => (
                          <button
                            key={item.sec}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick?.();
                              setTurnTimeLimit(item.sec);
                            }}
                            className={`py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center cursor-pointer transition-all ${
                              turnTimeLimit === item.sec
                                ? 'cyber-gold-active text-amber-200'
                                : 'bg-[#070b14] border-white/10 text-slate-300'
                            }`}
                          >
                            <span className="font-mono text-sm">{item.sec}s</span>
                            <span className="text-[10px] text-slate-400">
                              {lang === 'my' ? item.tagMy : item.tagEn}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- MULTIPLAYER SETTINGS --- */}
                {selectedMode === 'multiplayer' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/35 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-200 leading-relaxed">
                        <div className="font-bold text-sky-300 mb-0.5">
                          {lang === 'my' ? 'Ranked Real-Time Matchmaking' : 'Ranked Real-Time Matchmaking'}
                        </div>
                        {lang === 'my'
                          ? 'သင့် XP နှင့် အဆင့်တူ အွန်လိုင်းကစားသမားကို အလိုအလျောက် ရှာဖွေချိတ်ဆက်ပေးမည်ဖြစ်ပြီး အနိုင်ရပါက +75 XP ရရှိပါမည်။'
                          : 'Automatically pairs you with an online competitor near your XP rating. Victory awards +75 XP.'}
                      </div>
                    </div>

                    {meta.supportsBestOf && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'my' ? 'အကျော့အရေအတွက် (Match Format)' : 'Match Format'}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {([3, 5] as const).map((bo) => (
                            <button
                              key={bo}
                              type="button"
                              onClick={() => {
                                soundEngine.playClick?.();
                                setBestOf(bo);
                              }}
                              className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                                bestOf === bo
                                  ? 'cyber-gold-active text-amber-200'
                                  : 'bg-[#070b14] border-white/10 text-slate-300'
                              }`}
                            >
                              <span>Best of {bo}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({Math.ceil(bo / 2)} Wins)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'my' ? 'တစ်လှည့် အချိန်ကန့်သတ်ချက်' : 'Turn Time Limit'}</span>
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
                            className={`h-11 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
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
                  <div className="space-y-4">
                    {/* Create vs Join Toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#070b14] border border-white/10">
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
                        <span>{lang === 'my' ? 'အခန်းအသစ် ဖန်တီးမည်' : 'Create Room'}</span>
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
                        <span>{lang === 'my' ? 'ကုဒ်ဖြင့် ဝင်မည်' : 'Join with Code'}</span>
                      </button>
                    </div>

                    {roomAction === 'create' ? (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            {lang === 'my' ? 'အခန်းအမည် (Room Title)' : 'Room Title'}
                          </label>
                          <input
                            type="text"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            placeholder="Room Name..."
                            className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            {lang === 'my' ? 'ကစားသမား ဦးရေ (Max Players)' : 'Max Players'}
                          </label>
                          {meta.maxRoomPlayers > 2 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {[2, 4, 6, 8].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setMaxPlayers(n)}
                                  className={`h-10 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
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
                            <div className="px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-xs text-amber-300 font-semibold">
                              1 vs 1 Private Duel Room (2 Players)
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            {lang === 'my' ? 'မိတ်ဆွေ၏ Room Code ထည့်သွင်းပါ' : 'Enter Friend Room Code'}
                          </label>
                          <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="MR-1234"
                            className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-amber-400/40 text-sm font-mono font-bold text-amber-200 tracking-widest focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Live Open Rooms Quick Join List */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="text-[11px] font-bold text-sky-300 uppercase">
                            {lang === 'my'
                              ? `လက်ရှိ ဖွင့်ထားသော အခန်းများ (${gameRooms.length})`
                              : `Available Open Rooms (${gameRooms.length})`}
                          </div>
                          {gameRooms.length === 0 ? (
                            <div className="text-xs text-slate-500 py-4 text-center rounded-xl bg-[#070b14] border border-white/5">
                              {lang === 'my' ? 'လက်ရှိ ဖွင့်ထားသော အခန်းမရှိသေးပါ။' : 'No open rooms right now.'}
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {gameRooms.map((rm) => (
                                <div
                                  key={rm.id}
                                  className="p-2.5 rounded-xl bg-[#070b14] border border-white/10 hover:border-amber-400/40 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-mono font-bold text-amber-300 truncate">
                                      {rm.code} <span className="font-sans text-white font-semibold">· {rm.title}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {(rm.players || []).length} / {rm.maxPlayers || 2} Players
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onJoinRoom(rm.id)}
                                    className="px-3 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] cursor-pointer shrink-0"
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

              {/* RIGHT: Match Ready Summary Dock & Play CTA (5 cols) */}
              <div className="lg:col-span-5 cyber-panel rounded-2xl p-4 sm:p-5 border border-amber-400/35 flex flex-col justify-between gap-4 bg-gradient-to-b from-[#10182b] to-[#070b14]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'my' ? 'ပွဲစဉ် အကျဉ်းချုပ်' : 'Match Summary'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold">
                      READY
                    </span>
                  </div>

                  <div className="space-y-2 text-xs bg-[#070b14]/90 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'my' ? 'ဂိမ်းအမျိုးအစား' : 'Game'}</span>
                      <span className="font-bold text-white">{lang === 'my' ? meta.titleMy : meta.titleEn}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'my' ? 'ကစားမည့် Mode' : 'Mode'}</span>
                      <span className="font-bold text-amber-300 uppercase">{selectedMode}</span>
                    </div>

                    {selectedMode === 'solo' && normGame !== 'sakarhtar' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">AI Difficulty</span>
                        <span className="font-bold text-emerald-300 capitalize">{difficulty}</span>
                      </div>
                    )}

                    {selectedMode !== 'room' && meta.supportsBestOf && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'my' ? 'အကျော့' : 'Format'}</span>
                        <span className="font-mono font-bold text-white">Best of {bestOf}</span>
                      </div>
                    )}

                    {selectedMode !== 'room' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'my' ? 'အချိန်ကန့်သတ်ချက်' : 'Turn Timer'}</span>
                        <span className="font-mono font-bold text-sky-300">{turnTimeLimit}s</span>
                      </div>
                    )}

                    {selectedMode === 'room' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'my' ? 'အခန်းပုံစံ' : 'Room Action'}</span>
                        <span className="font-bold text-sky-300">
                          {roomAction === 'create'
                            ? `${lang === 'my' ? 'အသစ်ဖန်တီးမည်' : 'Create'} (${maxPlayers}P)`
                            : joinCode.trim() || (lang === 'my' ? 'Code ထည့်ရန်' : 'Enter Code')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PRIMARY LAUNCH CTA ("ကစားမည်") */}
                <div className="space-y-2">
                  {isQueuingThis ? (
                    <button
                      type="button"
                      onClick={onLeaveQueue}
                      className="w-full h-13 py-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span>{lang === 'my' ? 'ပြိုင်ဘက်ရှာနေသည်... (ပယ်ဖျက်မည်)' : 'Finding Opponent... (Cancel)'}</span>
                    </button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      disabled={
                        isGameLocked ||
                        (selectedMode === 'room' && roomAction === 'join' && !joinCode.trim())
                      }
                      onClick={handleLaunchGame}
                      className="w-full py-3.5 rounded-xl cyber-cta-gold disabled:opacity-45 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(245,158,11,0.45)] cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
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

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick?.();
                      setSelectedMode(null);
                    }}
                    className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    {lang === 'my' ? 'အခြား Mode ပြန်ရွေးမည်' : 'Change Mode'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
