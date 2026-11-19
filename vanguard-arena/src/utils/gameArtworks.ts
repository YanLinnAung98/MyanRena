const toSvgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const GAME_ARTWORKS: Record<string, string> = {
  connect4: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg)"/>
      <rect x="75" y="42" width="250" height="216" rx="18" fill="#1d4ed8" stroke="#60a5fa" stroke-width="3"/>
      <circle cx="120" cy="85" r="20" fill="#0f172a"/>
      <circle cx="173" cy="85" r="20" fill="#0f172a"/>
      <circle cx="226" cy="85" r="20" fill="#f59e0b"/>
      <circle cx="279" cy="85" r="20" fill="#0f172a"/>
      <circle cx="120" cy="145" r="20" fill="#0f172a"/>
      <circle cx="173" cy="145" r="20" fill="#f59e0b"/>
      <circle cx="226" cy="145" r="20" fill="#f43f5e"/>
      <circle cx="279" cy="145" r="20" fill="#0f172a"/>
      <circle cx="120" cy="205" r="20" fill="#f59e0b"/>
      <circle cx="173" cy="205" r="20" fill="#f43f5e"/>
      <circle cx="226" cy="205" r="20" fill="#f59e0b"/>
      <circle cx="279" cy="205" r="20" fill="#f43f5e"/>
      <line x1="115" y1="210" x2="232" y2="80" stroke="#fde047" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `),
  tictactoe: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0b1120"/>
      <line x1="165" y1="45" x2="165" y2="255" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
      <line x1="235" y1="45" x2="235" y2="255" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
      <line x1="95" y1="115" x2="305" y2="115" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
      <line x1="95" y1="185" x2="305" y2="185" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
      <path d="M112 62 L148 98 M148 62 L112 98" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M182 132 L218 168 M218 132 L182 168" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M252 202 L288 238 M288 202 L252 238" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <circle cx="270" cy="80" r="19" fill="none" stroke="#f59e0b" stroke-width="8"/>
      <circle cx="130" cy="220" r="19" fill="none" stroke="#f59e0b" stroke-width="8"/>
      <line x1="112" y1="62" x2="288" y2="238" stroke="#7dd3fc" stroke-width="4" stroke-dasharray="8 6"/>
    </svg>
  `),
  rps: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#111827"/>
      <circle cx="110" cy="150" r="48" fill="#1e293b" stroke="#f59e0b" stroke-width="4"/>
      <circle cx="200" cy="150" r="48" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
      <circle cx="290" cy="150" r="48" fill="#1e293b" stroke="#f43f5e" stroke-width="4"/>
      <text x="110" y="164" font-size="40" text-anchor="middle">🪨</text>
      <text x="200" y="164" font-size="40" text-anchor="middle">📄</text>
      <text x="290" y="164" font-size="40" text-anchor="middle">✂️</text>
    </svg>
  `),
  sakarhtar: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#78350f"/>
          <stop offset="100%" stop-color="#090d16"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#glow)"/>
      <rect x="135" y="65" width="130" height="170" rx="36" fill="#f59e0b" stroke="#fef08a" stroke-width="4"/>
      <line x1="200" y1="35" x2="200" y2="65" stroke="#fde047" stroke-width="5"/>
      <line x1="200" y1="235" x2="200" y2="270" stroke="#fde047" stroke-width="5"/>
      <text x="200" y="165" font-size="56" font-weight="bold" fill="#090d16" text-anchor="middle">?</text>
    </svg>
  `),
  heroBanner: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="50%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#451a03"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="500" fill="url(#hero)"/>
      <circle cx="920" cy="240" r="190" fill="none" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="3"/>
      <circle cx="920" cy="240" r="130" fill="none" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="2"/>
      <path d="M0 420 L1200 280 L1200 500 L0 500 Z" fill="#f59e0b" fill-opacity="0.08"/>
    </svg>
  `),
};

export function createAvatarSvg(name: string, bg = '#1e293b', fg = '#f59e0b'): string {
  const initials = (name || 'P').trim().slice(0, 2).toUpperCase();
  return toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="50" fill="${bg}"/>
      <text x="50" y="62" font-family="sans-serif" font-size="40" font-weight="bold" fill="${fg}" text-anchor="middle">${initials}</text>
    </svg>
  `);
}
