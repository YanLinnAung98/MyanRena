import React from 'react';
import type { GameState, GameType, Language, ProfileFrame } from '../types.ts';
import { Connect4Board } from '../components/games/Connect4Board.tsx';
import { TTTBoard } from '../components/games/TTTBoard.tsx';
import { RPSBoard } from '../components/games/RPSBoard.tsx';
import { SakarHtarStage } from '../components/games/SakarHtarStage.tsx';

export interface GamePlugin {
  id: GameType;
  name: string;
  nameMy: string;
  shortName: string;
  tagline: string;
  taglineMy: string;
  rules: string[];
  rulesMy: string[];
  artwork: string;
  supportsBestOf?: boolean;
  renderBoard: (props: {
    state: GameState;
    myPlayerNum: 1 | 2 | 0;
    isMyTurn: boolean;
    disabled?: boolean;
    currentUserId?: string;
    lang?: Language;
    frames?: ProfileFrame[];
    onMove: (payload: Record<string, unknown>) => void;
  }) => React.ReactNode;
}

export const GAME_REGISTRY: Record<GameType, GamePlugin> = {
  connect4: {
    id: 'connect4',
    name: '4 in a Row',
    nameMy: '၄ လုံးတန်း (4 in a Row)',
    shortName: '4 in a Row',
    tagline: 'Vertical gravity tactics on a precision 6x7 grid.',
    taglineMy: '၆x၇ ဇယားကွက်ပေါ်တွင် ဗျူဟာမြောက် ၄ လုံးတန်းအောင် ချကစားရသော ဂိမ်း။',
    rules: [
      'Drop one disc per turn into any open column.',
      'Connect 4 discs horizontally, vertically, or diagonally to win.',
      'Configurable 10s–30s turn clock with live server validation.',
    ],
    rulesMy: [
      'တစ်လှည့်လျှင် လွတ်နေသောကော်လံထဲသို့ အဝိုင်းပြား ၁ ခုချပါ။',
      'အလျားလိုက်၊ ဒေါင်လိုက် သို့မဟုတ် ထောင့်ဖြတ် ၄ လုံးတန်းအောင် ဆက်နိုင်သူ အနိုင်ရမည်။',
      '၁၀-၃၀ စက္ကန့် အချိန်ကန့်သတ်ချက်ဖြင့် ဆာဗာမှ စစ်ဆေးပေးပါသည်။',
    ],
    artwork: '/src/assets/images/game_connect4_art_1794716178929.jpg',
    renderBoard: ({ state, myPlayerNum, isMyTurn, disabled, onMove }) => {
      if (state.gameType !== 'connect4') return null;
      return React.createElement(Connect4Board, {
        state,
        myPlayerNum,
        isMyTurn,
        disabled,
        onMove,
      });
    },
  },
  ttt: {
    id: 'ttt',
    name: 'Tic-Tac-Toe',
    nameMy: 'Tic-Tac-Toe (X / O)',
    shortName: 'Tic-Tac-Toe',
    tagline: 'Rapid 3x3 positional duels with zero room for error.',
    taglineMy: '၃x၃ အကွက်ပေါ်တွင် လျင်မြန်တိကျစွာ နေရာယူယှဉ်ပြိုင်ရသော ဂိမ်း။',
    rules: [
      'Alternate placing X and O across 9 tactical cells.',
      'Complete any row, column, or diagonal line to claim victory.',
      'Configurable turn clock and unbeatable Hard Minimax AI.',
    ],
    rulesMy: [
      'အကွက် ၉ ကွက်ပေါ်တွင် X နှင့် O ကို တစ်လှည့်စီ နေရာချပါ။',
      'အတန်း၊ ကော်လံ သို့မဟုတ် ထောင့်ဖြတ် ၃ ခုတန်းအောင် ဆက်နိုင်သူ အနိုင်ရမည်။',
      'အလှည့်အချိန်ကန့်သတ်ချက်နှင့် Minimax AI ပါဝင်သည်။',
    ],
    artwork: '/src/assets/images/game_ttt_art_1794716179615.jpg',
    renderBoard: ({ state, myPlayerNum, isMyTurn, disabled, onMove }) => {
      if (state.gameType !== 'ttt') return null;
      return React.createElement(TTTBoard, {
        state,
        myPlayerNum,
        isMyTurn,
        disabled,
        onMove,
      });
    },
  },
  rps: {
    id: 'rps',
    name: 'Rock, Paper, Scissors',
    nameMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
    shortName: 'RPS',
    tagline: 'Psychological Best-of-3 and Best-of-5 simultaneous showdowns.',
    taglineMy: '၃ ပွဲ ၂ နိုင် / ၅ ပွဲ ၃ နိုင် စိတ်ပညာပြိုင်ဆိုင်မှု တိုက်ရိုက်ပွဲစဉ်။',
    rules: [
      'Both players lock choices privately each round.',
      'Server reveals both picks simultaneously after lock-in.',
      'First competitor to 2 (Bo3) or 3 (Bo5) round wins takes the match.',
    ],
    rulesMy: [
      'တစ်ချီချင်းစီတွင် ကစားသမားနှစ်ဦးစလုံး မိမိရွေးချယ်မှုကို သီးသန့်လော့ခ်ချပါ။',
      'နှစ်ဦးစလုံး ရွေးချယ်ပြီးပါက ဆာဗာမှ တပြိုင်နက် ဖွင့်ပြပေးမည်။',
      'Bo3 တွင် ၂ ပွဲ သို့မဟုတ် Bo5 တွင် ၃ ပွဲ အရင်နိုင်သူ အနိုင်ရမည်။',
    ],
    artwork: '/src/assets/images/game_rps_art_1794716179553.jpg',
    supportsBestOf: true,
    renderBoard: ({ state, myPlayerNum, disabled, lang, onMove }) => {
      if (state.gameType !== 'rps') return null;
      return React.createElement(RPSBoard, {
        state,
        myPlayerNum,
        lang,
        disabled,
        onMove,
      });
    },
  },
  sakar_htar: {
    id: 'sakar_htar',
    name: 'Sakar-Htar (Myanmar Riddles)',
    nameMy: 'စကားထာ (မြန်မာ့ရိုးရာ စကားထာဂိမ်း)',
    shortName: 'စကားထာ',
    tagline: '10-question cultural riddle duel hosted by the Wise Courtyard Owl for 1–8 players.',
    taglineMy: 'ချစ်စရာ ဇီးကွက်ပညာရှိက မေးခွန်း ၁၀ ခု မေးမြန်းမည့် ၁-၈ ဦး စကားထာပြိုင်ပွဲ။',
    rules: [
      'Answer 10 traditional Myanmar riddles (A/B/C/D) within 15 seconds per question.',
      'Faster correct answers and answer streaks award higher bonus points.',
      'Play Solo, Quick Match (1–6 players), or Custom Rooms (up to 8 players).',
    ],
    rulesMy: [
      'မြန်မာ့ရိုးရာ စကားထာ မေးခွန်း ၁၀ ခုကို ၁ ခုလျှင် ၁၅ စက္ကန့်အတွင်း A/B/C/D ရွေးချယ်ဖြေဆိုပါ။',
      'မြန်မြန်မှန်ကန်စွာ ဖြေနိုင်လေ နှင့် ဆက်တိုက်မှန်လေ ရမှတ်ပိုမိုရရှိမည်။',
      'တစ်ဦးတည်း (Solo)၊ Quick Match (၁–၆ ဦး) သို့မဟုတ် Custom Room (၈ ဦးအထိ) ကစားနိုင်သည်။',
    ],
    artwork: '/src/assets/images/game_sakar_htar_art_1794723795339.jpg',
    renderBoard: ({ state, currentUserId, lang, frames, disabled, onMove }) => {
      if (state.gameType !== 'sakar_htar') return null;
      return React.createElement(SakarHtarStage, {
        state,
        myUserId: currentUserId || '',
        lang: lang || 'en',
        frames: frames || [],
        disabled,
        onMove,
      });
    },
  },
};

export const GAME_LIST: GamePlugin[] = Object.values(GAME_REGISTRY);
