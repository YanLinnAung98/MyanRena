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
    badgeIcon: '🥉',
  },
  {
    id: 'silver',
    name: 'Silver Striker',
    nameMy: 'ငွေရောင် အဆင့်ဘောင်',
    minXp: 1000,
    ringGradient: ['#f8fafc', '#94a3b8', '#475569'],
    glowColor: 'rgba(148, 163, 184, 0.6)',
    badgeIcon: '🥈',
  },
  {
    id: 'gold',
    name: 'Gold Champion',
    nameMy: 'ရွှေရောင် ချန်ပီယံဘောင်',
    minXp: 1300,
    ringGradient: ['#fef08a', '#f59e0b', '#92400e'],
    glowColor: 'rgba(245, 158, 11, 0.75)',
    badgeIcon: '🥇',
  },
  {
    id: 'platinum',
    name: 'Emerald Jade',
    nameMy: 'မြစိမ်းရောင် အဆင့်ဘောင်',
    minXp: 1600,
    ringGradient: ['#a7f3d0', '#10b981', '#065f46'],
    glowColor: 'rgba(16, 185, 129, 0.7)',
    badgeIcon: '❇️',
  },
  {
    id: 'diamond',
    name: 'Diamond Sovereign',
    nameMy: 'စိန်ရောင် အဆင့်ဘောင်',
    minXp: 1900,
    ringGradient: ['#bae6fd', '#38bdf8', '#1d4ed8'],
    glowColor: 'rgba(56, 189, 248, 0.85)',
    badgeIcon: '💎',
  },
  {
    id: 'master',
    name: 'Amethyst Master',
    nameMy: 'ခရမ်းရောင် မာစတာဘောင်',
    minXp: 2200,
    ringGradient: ['#f5d0fe', '#c026d3', '#581c87'],
    glowColor: 'rgba(192, 38, 211, 0.8)',
    badgeIcon: '🔮',
  },
  {
    id: 'legend',
    name: 'Legend Mythic Crown',
    nameMy: 'ဒဏ္ဍာရီ ရွှေသရဖူဘောင်',
    minXp: 2500,
    ringGradient: ['#fef08a', '#f43f5e', '#f59e0b'],
    glowColor: 'rgba(251, 191, 36, 0.95)',
    badgeIcon: '👑',
  },
];

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
    </svg>
  `),
  tictactoe: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <rect width="400" height="320" fill="#070b14"/>
      <rect x="75" y="35" width="250" height="250" rx="22" fill="#0b1222" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="2.5"/>
      <line x1="158" y1="52" x2="158" y2="268" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4"/>
      <line x1="242" y1="52" x2="242" y2="268" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4"/>
      <line x1="92" y1="118" x2="308" y2="118" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4"/>
      <line x1="92" y1="202" x2="308" y2="202" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4"/>
      <path d="M104 64 L138 98 M138 64 L104 98" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M183 143 L217 177 M217 143 L183 177" stroke="#7dd3fc" stroke-width="8" stroke-linecap="round"/>
      <path d="M262 222 L296 256 M296 222 L262 256" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <circle cx="279" cy="81" r="19" fill="none" stroke="#fbbf24" stroke-width="8"/>
      <circle cx="121" cy="239" r="19" fill="none" stroke="#f59e0b" stroke-width="8"/>
    </svg>
  `),
  rps: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <rect width="400" height="320" fill="#0b0f1d"/>
      <circle cx="200" cy="95" r="52" fill="#0284c7" stroke="#7dd3fc" stroke-width="3.5"/>
      <text x="200" y="112" font-size="44" text-anchor="middle">✋</text>
      <circle cx="122" cy="212" r="54" fill="#ea580c" stroke="#fdba74" stroke-width="3.5"/>
      <text x="122" y="229" font-size="44" text-anchor="middle">✊</text>
      <circle cx="278" cy="212" r="54" fill="#db2777" stroke="#f9a8d4" stroke-width="3.5"/>
      <text x="278" y="229" font-size="44" text-anchor="middle">✌️</text>
    </svg>
  `),
  sakarhtar: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="shbg" cx="50%" cy="50%" r="68%">
          <stop offset="0%" stop-color="#451a03"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
      </defs>
      <rect width="400" height="320" fill="url(#shbg)"/>
      <circle cx="200" cy="160" r="88" fill="#0f172a" stroke="#f59e0b" stroke-width="5"/>
      <text x="200" y="178" font-size="68" text-anchor="middle">🦉</text>
      <text x="200" y="275" font-size="16" font-weight="bold" fill="#fde047" text-anchor="middle">ပညာရှိ ဇီးကွက် စကားထာ</text>
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
