import type { PlayerGift } from '../types.ts';

const toSvgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const SVG_FRAME_TEMPLATES: Array<{
  id: string;
  name: string;
  nameMy: string;
  minXp: number;
  ringGradient: [string, string, string];
  glowColor: string;
  badgeIcon: string;
}> = [
  {
    id: 'bronze',
    name: 'Bronze Vanguard',
    nameMy: 'ကြေးနီ အဆင့်ဘောင်',
    minXp: 0,
    ringGradient: ['#fdba74', '#b45309', '#78350f'],
    glowColor: 'rgba(180, 83, 9, 0.55)',
    badgeIcon: 'BRZ',
  },
  {
    id: 'silver',
    name: 'Silver Striker',
    nameMy: 'ငွေရောင် အဆင့်ဘောင်',
    minXp: 1000,
    ringGradient: ['#f8fafc', '#94a3b8', '#475569'],
    glowColor: 'rgba(148, 163, 184, 0.6)',
    badgeIcon: 'SLV',
  },
  {
    id: 'gold',
    name: 'Gold Champion',
    nameMy: 'ရွှေရောင် ချန်ပီယံဘောင်',
    minXp: 1300,
    ringGradient: ['#fef08a', '#f59e0b', '#92400e'],
    glowColor: 'rgba(245, 158, 11, 0.75)',
    badgeIcon: 'GLD',
  },
  {
    id: 'platinum',
    name: 'Emerald Jade',
    nameMy: 'မြစိမ်းရောင် အဆင့်ဘောင်',
    minXp: 1600,
    ringGradient: ['#a7f3d0', '#10b981', '#065f46'],
    glowColor: 'rgba(16, 185, 129, 0.7)',
    badgeIcon: 'EMR',
  },
  {
    id: 'diamond',
    name: 'Diamond Sovereign',
    nameMy: 'စိန်ရောင် အဆင့်ဘောင်',
    minXp: 1900,
    ringGradient: ['#bae6fd', '#38bdf8', '#1d4ed8'],
    glowColor: 'rgba(56, 189, 248, 0.85)',
    badgeIcon: 'DMD',
  },
  {
    id: 'master',
    name: 'Amethyst Master',
    nameMy: 'ခရမ်းရောင် မာစတာဘောင်',
    minXp: 2200,
    ringGradient: ['#f5d0fe', '#c026d3', '#581c87'],
    glowColor: 'rgba(192, 38, 211, 0.8)',
    badgeIcon: 'MST',
  },
  {
    id: 'legend',
    name: 'Legend Mythic Crown',
    nameMy: 'ဒဏ္ဍာရီ ရွှေသရဖူဘောင်',
    minXp: 2500,
    ringGradient: ['#fef08a', '#f43f5e', '#f59e0b'],
    glowColor: 'rgba(251, 191, 36, 0.95)',
    badgeIcon: 'LGD',
  },
];

export interface ProfileBannerTemplate {
  id: string;
  name: string;
  nameMy: string;
  minXp: number;
  imageUrl: string;
  accent: string;
}

export const PREMIUM_BANNER_TEMPLATES: ProfileBannerTemplate[] = [
  {
    id: 'cyber_gold',
    name: 'Golden Vanguard',
    nameMy: 'ရွှေရောင် ဆိုက်ဘာတံခွန်',
    minXp: 0,
    accent: '#f59e0b',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#070b14"/>
            <stop offset="50%" stop-color="#1e1b2e"/>
            <stop offset="100%" stop-color="#451a03"/>
          </linearGradient>
          <linearGradient id="ln1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/>
            <stop offset="50%" stop-color="#fef08a" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg1)"/>
        <polygon points="560,0 900,0 900,280 420,280" fill="#f59e0b" fill-opacity="0.09"/>
        <polygon points="680,0 900,0 900,280 590,280" fill="#fbbf24" fill-opacity="0.12"/>
        <path d="M0 220 H900" stroke="url(#ln1)" stroke-width="2"/>
        <circle cx="760" cy="120" r="88" fill="none" stroke="#fbbf24" stroke-opacity="0.22" stroke-width="2"/>
        <circle cx="760" cy="120" r="56" fill="none" stroke="#fef08a" stroke-opacity="0.3" stroke-width="1.5"/>
      </svg>
    `),
  },
  {
    id: 'neon_sapphire',
    name: 'Sapphire Matrix',
    nameMy: 'နီလာ အလင်းတန်း',
    minXp: 0,
    accent: '#38bdf8',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#040814"/>
            <stop offset="55%" stop-color="#0c2444"/>
            <stop offset="100%" stop-color="#082f49"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg2)"/>
        <g stroke="#38bdf8" stroke-opacity="0.16" stroke-width="1.2">
          <path d="M0 70 H900 M0 140 H900 M0 210 H900"/>
          <path d="M150 0 V280 M300 0 V280 M450 0 V280 M600 0 V280 M750 0 V280"/>
        </g>
        <polygon points="620,30 820,30 760,250 560,250" fill="#38bdf8" fill-opacity="0.14"/>
      </svg>
    `),
  },
  {
    id: 'emerald_dragon',
    name: 'Emerald Jade Arena',
    nameMy: 'မြစိမ်းရောင် နဂါးကွင်း',
    minXp: 1200,
    accent: '#10b981',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#04120e"/>
            <stop offset="60%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg3)"/>
        <path d="M-20 260 Q250 110 520 190 T920 60" fill="none" stroke="#34d399" stroke-width="3" stroke-opacity="0.45"/>
        <path d="M-20 220 Q280 80 560 160 T920 30" fill="none" stroke="#a7f3d0" stroke-width="1.5" stroke-opacity="0.35"/>
      </svg>
    `),
  },
  {
    id: 'crimson_esports',
    name: 'Crimson Champion',
    nameMy: 'ကြက်သွေးရောင် ချန်ပီယံ',
    minXp: 1500,
    accent: '#f43f5e',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#14060d"/>
            <stop offset="55%" stop-color="#4c0519"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg4)"/>
        <polygon points="0,280 280,0 360,0 80,280" fill="#fb7185" fill-opacity="0.14"/>
        <polygon points="620,0 900,0 640,280 540,280" fill="#f43f5e" fill-opacity="0.18"/>
      </svg>
    `),
  },
  {
    id: 'amethyst_royal',
    name: 'Amethyst Sovereign',
    nameMy: 'ခရမ်းရောင် ဧကရာဇ်',
    minXp: 1900,
    accent: '#c026d3',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg5" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0d0618"/>
            <stop offset="55%" stop-color="#3b0764"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg5)"/>
        <circle cx="720" cy="140" r="140" fill="#d946ef" fill-opacity="0.15"/>
        <polygon points="720,45 810,140 720,235 630,140" fill="none" stroke="#f5d0fe" stroke-opacity="0.4" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: 'mythic_throne',
    name: 'Mythic Hall of Fame',
    nameMy: 'ဒဏ္ဍာရီ ရွှေနန်းတော်',
    minXp: 2400,
    accent: '#fbbf24',
    imageUrl: toSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
        <defs>
          <linearGradient id="bg6" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a0b04"/>
            <stop offset="45%" stop-color="#78350f"/>
            <stop offset="100%" stop-color="#31102f"/>
          </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#bg6)"/>
        <polygon points="450,18 475,86 548,86 488,128 510,198 450,156 390,198 412,128 352,86 425,86" fill="#fef08a" fill-opacity="0.18"/>
        <path d="M0 245 H900" stroke="#fef08a" stroke-opacity="0.55" stroke-width="2"/>
      </svg>
    `),
  },
];

export const GIFT_CATALOG: Array<{
  giftId: string;
  name: string;
  nameMy: string;
  iconId: PlayerGift['iconId'];
  rarity: PlayerGift['rarity'];
  defaultXp: number;
  unlockFrameId?: string;
  unlockBannerId?: string;
}> = [
  {
    giftId: 'gift_dragon_cup',
    name: 'Golden Vanguard Champion Cup',
    nameMy: 'ရွှေရောင် ချန်ပီယံ ဖလားကြီး',
    iconId: 'dragon_cup',
    rarity: 'mythic',
    defaultXp: 500,
    unlockFrameId: 'legend',
    unlockBannerId: 'mythic_throne',
  },
  {
    giftId: 'gift_mythic_crown',
    name: 'Sovereign Mythic Crown',
    nameMy: 'ဒဏ္ဍာရီ ရွှေသရဖူ လက်ဆောင်',
    iconId: 'mythic_crown',
    rarity: 'legendary',
    defaultXp: 350,
    unlockFrameId: 'gold',
    unlockBannerId: 'crimson_esports',
  },
  {
    giftId: 'gift_diamond_relic',
    name: 'Diamond Sovereign Relic',
    nameMy: 'စိန်ရောင် ဂုဏ်ထူးဆောင်ဆု',
    iconId: 'diamond_relic',
    rarity: 'epic',
    defaultXp: 250,
    unlockFrameId: 'diamond',
    unlockBannerId: 'amethyst_royal',
  },
  {
    giftId: 'gift_cyber_medal',
    name: 'Emerald Honor Medal',
    nameMy: 'မြစိမ်းရောင် ထူးချွန်တံဆိပ်',
    iconId: 'cyber_medal',
    rarity: 'rare',
    defaultXp: 150,
    unlockFrameId: 'platinum',
    unlockBannerId: 'emerald_dragon',
  },
  {
    giftId: 'gift_vip_voucher',
    name: 'VIP Tournament Grand Reward',
    nameMy: 'VIP အထူးဆုလက်ဆောင် Voucher',
    iconId: 'vip_voucher',
    rarity: 'mythic',
    defaultXp: 400,
    unlockBannerId: 'mythic_throne',
  },
];

export function resolveBannerImage(bannerUrl?: string, bannerId?: string): string {
  if (bannerUrl && bannerUrl.trim()) return bannerUrl;
  const tpl = PREMIUM_BANNER_TEMPLATES.find((b) => b.id === bannerId) || PREMIUM_BANNER_TEMPLATES[0];
  return tpl.imageUrl;
}

export const GAME_ARTWORKS: Record<string, string> = {
  connect4: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="c4bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
        <linearGradient id="rack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="55%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#c4bg)"/>
      <polygon points="84,42 284,26 296,238 94,256" fill="url(#rack)" stroke="#93c5fd" stroke-width="2.5"/>
      <circle cx="122" cy="72" r="17" fill="#090d16"/>
      <circle cx="168" cy="68" r="17" fill="#fbbf24"/>
      <circle cx="214" cy="64" r="17" fill="#090d16"/>
      <circle cx="258" cy="60" r="17" fill="#f43f5e"/>
      <circle cx="124" cy="118" r="17" fill="#090d16"/>
      <circle cx="170" cy="114" r="17" fill="#f43f5e"/>
      <circle cx="216" cy="110" r="17" fill="#fbbf24"/>
      <circle cx="260" cy="106" r="17" fill="#f43f5e"/>
      <circle cx="126" cy="164" r="17" fill="#fbbf24"/>
      <circle cx="172" cy="160" r="17" fill="#fbbf24"/>
      <circle cx="218" cy="156" r="17" fill="#f43f5e"/>
      <circle cx="262" cy="152" r="17" fill="#fbbf24"/>
      <circle cx="128" cy="210" r="17" fill="#f43f5e"/>
      <circle cx="174" cy="206" r="17" fill="#fbbf24"/>
      <circle cx="220" cy="202" r="17" fill="#f43f5e"/>
      <circle cx="264" cy="198" r="17" fill="#fbbf24"/>
      <line x1="126" y1="164" x2="264" y2="198" stroke="#fef08a" stroke-width="4" stroke-dasharray="6 4" stroke-opacity="0.8"/>
    </svg>
  `),
  tictactoe: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="tttbg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#0c2240"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
      </defs>
      <rect width="400" height="320" fill="url(#tttbg)"/>
      <rect x="75" y="35" width="250" height="250" rx="22" fill="#0b1222" stroke="#38bdf8" stroke-opacity="0.65" stroke-width="2.5"/>
      <line x1="158" y1="52" x2="158" y2="268" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="4"/>
      <line x1="242" y1="52" x2="242" y2="268" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="4"/>
      <line x1="92" y1="118" x2="308" y2="118" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="4"/>
      <line x1="92" y1="202" x2="308" y2="202" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="4"/>
      <path d="M104 64 L138 98 M138 64 L104 98" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M183 143 L217 177 M217 143 L183 177" stroke="#7dd3fc" stroke-width="8" stroke-linecap="round"/>
      <path d="M262 222 L296 256 M296 222 L262 256" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <circle cx="279" cy="81" r="19" fill="none" stroke="#fbbf24" stroke-width="8"/>
      <circle cx="121" cy="239" r="19" fill="none" stroke="#f59e0b" stroke-width="8"/>
    </svg>
  `),
  rps: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="rpsbg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#251030"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
      </defs>
      <rect width="400" height="320" fill="url(#rpsbg)"/>
      <polygon points="200,88 122,212 278,212" fill="none" stroke="#fbbf24" stroke-opacity="0.45" stroke-width="2.5" stroke-dasharray="6 4"/>
      <circle cx="200" cy="92" r="48" fill="#0369a1" stroke="#7dd3fc" stroke-width="3.5"/>
      <rect x="180" y="72" width="40" height="40" rx="6" fill="none" stroke="#e0f2fe" stroke-width="4"/>
      <line x1="188" y1="84" x2="212" y2="84" stroke="#e0f2fe" stroke-width="3"/>
      <line x1="188" y1="95" x2="212" y2="95" stroke="#e0f2fe" stroke-width="3"/>
      <circle cx="122" cy="212" r="48" fill="#c2410c" stroke="#fdba74" stroke-width="3.5"/>
      <polygon points="122,184 146,198 140,230 104,230 98,198" fill="none" stroke="#ffedd5" stroke-width="4"/>
      <circle cx="278" cy="212" r="48" fill="#be185d" stroke="#f9a8d4" stroke-width="3.5"/>
      <path d="M262 194 L294 228 M294 194 L262 228" stroke="#fce7f3" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="264" cy="228" r="6" fill="none" stroke="#fce7f3" stroke-width="3"/>
      <circle cx="292" cy="228" r="6" fill="none" stroke="#fce7f3" stroke-width="3"/>
    </svg>
  `),
  sakarhtar: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="shbg" cx="50%" cy="48%" r="68%">
          <stop offset="0%" stop-color="#451a03"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
        <linearGradient id="owlG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#shbg)"/>
      <circle cx="200" cy="148" r="88" fill="#0f172a" stroke="url(#owlG)" stroke-width="4.5"/>
      <path d="M148 112 L166 128 L234 128 L252 112 L248 166 C246 196 226 214 200 214 C174 214 154 196 152 166 Z" fill="#1e293b" stroke="#fbbf24" stroke-width="3"/>
      <circle cx="177" cy="152" r="18" fill="#090d16" stroke="#fde047" stroke-width="3"/>
      <circle cx="223" cy="152" r="18" fill="#090d16" stroke="#fde047" stroke-width="3"/>
      <circle cx="177" cy="152" r="7" fill="#fbbf24"/>
      <circle cx="223" cy="152" r="7" fill="#fbbf24"/>
      <polygon points="200,164 191,182 209,182" fill="#f59e0b"/>
      <text x="200" y="275" font-size="16" font-weight="bold" fill="#fde047" text-anchor="middle" font-family="sans-serif">ပညာရှိ ဇီးကွက် ဉာဏ်စမ်းပဟေဠိ</text>
    </svg>
  `),
  heroBanner: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#070b14"/>
          <stop offset="50%" stop-color="#172038"/>
          <stop offset="100%" stop-color="#3b1706"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="500" fill="url(#hero)"/>
    </svg>
  `),
};

export function createAvatarSvg(name: string, bg = '#1e293b', fg = '#fbbf24'): string {
  const initials = (name || 'YL').trim().slice(0, 2).toUpperCase();
  return toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="${bg}"/>
      <text x="50" y="63" font-family="sans-serif" font-size="38" font-weight="bold" fill="${fg}" text-anchor="middle">${initials}</text>
    </svg>
  `);
}
