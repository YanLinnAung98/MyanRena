import type { LandingContent } from '../types.ts';

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  heroTitleEn: 'Competitive Tabletop & Cultural Arena Built for Speed',
  heroTitleMy: 'မြန်နှုန်းမြင့် အွန်လိုင်းဗျူဟာနှင့် မြန်မာ့စကားထာ ပြိုင်ပွဲကွင်း',
  heroSubtitleEn:
    'Challenge global rivals in 4 in a Row, Tic-Tac-Toe, Rock Paper Scissors, and စကားထာ (Myanmar Traditional Riddles). Climb 8 Rank Tiers, form 8-player Custom Rooms, and battle in knockout brackets.',
  heroSubtitleMy:
    '4 in a Row၊ Tic-Tac-Toe၊ ကျောက်တုံး စက္ကူ ကတ်ကြေးနှင့် မြန်မာ့ရိုးရာ စကားထာ ဂိမ်းများကို ကမ္ဘာတစ်ဝှမ်းမှ ကစားသမားများနှင့် တိုက်ရိုက်ယှဉ်ပြိုင်ပါ။ Rank ၈ ဆင့်တက်လှမ်းပြီး ၈ ဦးအထိ Custom Room များဖွဲ့ကစားလိုက်ပါ။',
  heroBannerUrl: '/src/assets/images/hero_arena_stage_1794716179112.jpg',
  games: {
    connect4: {
      nameEn: '4 in a Row',
      nameMy: '၄ လုံးတန်း (4 in a Row)',
      taglineEn: 'Vertical gravity tactics on a precision 6x7 grid.',
      taglineMy: '၆x၇ ဇယားကွက်ပေါ်တွင် ဗျူဟာမြောက် ၄ လုံးတန်းအောင် ချကစားရသော ဂိမ်း။',
      bannerUrl: '/src/assets/images/game_connect4_art_1794716178929.jpg',
    },
    ttt: {
      nameEn: 'Tic-Tac-Toe',
      nameMy: 'Tic-Tac-Toe (X / O)',
      taglineEn: 'Rapid 3x3 positional duels with zero room for error.',
      taglineMy: '၃x၃ အကွက်ပေါ်တွင် လျင်မြန်တိကျစွာ နေရာယူယှဉ်ပြိုင်ရသော ဂိမ်း။',
      bannerUrl: '/src/assets/images/game_ttt_art_1794716179615.jpg',
    },
    rps: {
      nameEn: 'Rock, Paper, Scissors',
      nameMy: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး',
      taglineEn: 'Psychological Best-of-3 and Best-of-5 simultaneous showdowns.',
      taglineMy: '၃ ပွဲ ၂ နိုင် / ၅ ပွဲ ၃ နိုင် စိတ်ပညာပြိုင်ဆိုင်မှု တိုက်ရိုက်ပွဲစဉ်။',
      bannerUrl: '/src/assets/images/game_rps_art_1794716179553.jpg',
    },
    sakar_htar: {
      nameEn: 'စကားထာ (Sakar-Htar)',
      nameMy: 'စကားထာ (မြန်မာ့ရိုးရာ စကားထာပြိုင်ပွဲ)',
      taglineEn: '10-question Myanmar traditional riddle showdown for 1 to 8 players.',
      taglineMy: 'ကစားသမား ၁ ဦးမှ ၈ ဦးအထိ ဉာဏ်စမ်းယှဉ်ပြိုင်ရသော မြန်မာ့စကားထာ ၁၀ ပုဒ်ပြိုင်ပွဲ။',
      bannerUrl: '/src/assets/images/game_sakar_htar_art_1794723795339.jpg',
    },
  },
  updatedAt: '',
};
