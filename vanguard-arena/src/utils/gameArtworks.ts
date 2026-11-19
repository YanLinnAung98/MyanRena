const toSvgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const GAME_ARTWORKS: Record<string, string> = {
  // 3D Angled Connect-4 Board with Glowing Red & Gold Tokens
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
        <radialGradient id="redCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fda4af"/>
          <stop offset="45%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#881337"/>
        </radialGradient>
        <radialGradient id="goldCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="45%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#92400e"/>
        </radialGradient>
      </defs>
      <rect width="400" height="320" fill="url(#c4bg)"/>
      <ellipse cx="205" cy="272" rx="135" ry="22" fill="#38bdf8" fill-opacity="0.14"/>
      <polygon points="92,48 292,32 304,244 102,262" fill="#0f172a" stroke="#60a5fa" stroke-width="2"/>
      <polygon points="84,42 284,26 296,238 94,256" fill="url(#rack)" stroke="#93c5fd" stroke-width="2.5"/>
      <!-- Grid Holes & Coins -->
      <circle cx="122" cy="72" r="17" fill="#090d16"/>
      <circle cx="168" cy="68" r="17" fill="url(#goldCoin)"/>
      <circle cx="214" cy="64" r="17" fill="#090d16"/>
      <circle cx="258" cy="60" r="17" fill="url(#redCoin)"/>

      <circle cx="124" cy="118" r="17" fill="#090d16"/>
      <circle cx="170" cy="114" r="17" fill="url(#redCoin)"/>
      <circle cx="216" cy="110" r="17" fill="url(#goldCoin)"/>
      <circle cx="260" cy="106" r="17" fill="url(#redCoin)"/>

      <circle cx="126" cy="164" r="17" fill="url(#goldCoin)"/>
      <circle cx="172" cy="160" r="17" fill="url(#goldCoin)"/>
      <circle cx="218" cy="156" r="17" fill="url(#redCoin)"/>
      <circle cx="262" cy="152" r="17" fill="url(#goldCoin)"/>

      <circle cx="128" cy="210" r="17" fill="url(#redCoin)"/>
      <circle cx="174" cy="206" r="17" fill="url(#goldCoin)"/>
      <circle cx="220" cy="202" r="17" fill="url(#redCoin)"/>
      <circle cx="264" cy="198" r="17" fill="url(#goldCoin)"/>

      <!-- 3D Foreground Token Stacks -->
      <ellipse cx="78" cy="264" rx="26" ry="10" fill="#881337"/>
      <ellipse cx="78" cy="256" rx="26" ry="10" fill="#f43f5e" stroke="#fecdd3" stroke-width="1.5"/>
      <ellipse cx="78" cy="248" rx="26" ry="10" fill="#fb7185" stroke="#ffe4e6" stroke-width="1.5"/>

      <ellipse cx="145" cy="276" rx="26" ry="10" fill="#92400e"/>
      <ellipse cx="145" cy="268" rx="26" ry="10" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5"/>
      <ellipse cx="292" cy="264" rx="26" ry="10" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5"/>
    </svg>
  `),

  // Neon Cyan X & Gold O Cyber Grid
  tictactoe: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="tttbg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#132238"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
        <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="400" height="320" fill="url(#tttbg)"/>
      <rect x="75" y="35" width="250" height="250" rx="22" fill="#0b1222" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="2.5"/>
      <line x1="158" y1="52" x2="158" y2="268" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
      <line x1="242" y1="52" x2="242" y2="268" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
      <line x1="92" y1="118" x2="308" y2="118" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
      <line x1="92" y1="202" x2="308" y2="202" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>

      <g filter="url(#neonGlow)">
        <!-- Cyan X Pieces -->
        <path d="M104 64 L138 98 M138 64 L104 98" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
        <path d="M183 143 L217 177 M217 143 L183 177" stroke="#7dd3fc" stroke-width="8" stroke-linecap="round"/>
        <path d="M262 222 L296 256 M296 222 L262 256" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
        <!-- Gold O Pieces -->
        <circle cx="279" cy="81" r="19" fill="none" stroke="#fbbf24" stroke-width="8"/>
        <circle cx="121" cy="239" r="19" fill="none" stroke="#f59e0b" stroke-width="8"/>
        <line x1="100" y1="60" x2="300" y2="260" stroke="#e0f2fe" stroke-width="3.5" stroke-dasharray="10 6"/>
      </g>
    </svg>
  `),

  // Glowing Elemental Orbs: Fiery Rock, Electric Cyan Paper, Neon Violet-Rose Scissors
  rps: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="rpsbg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
        <radialGradient id="fireOrb" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="45%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </radialGradient>
        <radialGradient id="iceOrb" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#e0f2fe"/>
          <stop offset="45%" stop-color="#0ea5e9"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </radialGradient>
        <radialGradient id="roseOrb" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fce7f3"/>
          <stop offset="45%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#701a75"/>
        </radialGradient>
      </defs>
      <rect width="400" height="320" fill="url(#rpsbg)"/>
      <!-- Top Cyan Paper Orb -->
      <circle cx="200" cy="95" r="52" fill="url(#iceOrb)" stroke="#7dd3fc" stroke-width="3.5"/>
      <text x="200" y="112" font-size="44" text-anchor="middle">✋</text>
      <!-- Bottom-Left Fiery Rock Orb -->
      <circle cx="122" cy="212" r="54" fill="url(#fireOrb)" stroke="#fdba74" stroke-width="3.5"/>
      <text x="122" y="229" font-size="44" text-anchor="middle">✊</text>
      <!-- Bottom-Right Neon Scissors Orb -->
      <circle cx="278" cy="212" r="54" fill="url(#roseOrb)" stroke="#f9a8d4" stroke-width="3.5"/>
      <text x="278" y="229" font-size="44" text-anchor="middle">✌️</text>
    </svg>
  `),

  // Mystical Golden Burmese Sakar-Htar Medallion & Arcane Glyphs
  sakarhtar: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <defs>
        <radialGradient id="shbg" cx="50%" cy="50%" r="68%">
          <stop offset="0%" stop-color="#451a03"/>
          <stop offset="55%" stop-color="#141824"/>
          <stop offset="100%" stop-color="#070b14"/>
        </radialGradient>
        <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#shbg)"/>
      <circle cx="200" cy="160" r="115" fill="none" stroke="#f59e0b" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="8 6"/>
      <circle cx="200" cy="160" r="82" fill="#0f172a" stroke="url(#goldRing)" stroke-width="6"/>
      <circle cx="200" cy="160" r="66" fill="none" stroke="#fde047" stroke-opacity="0.5" stroke-width="1.5"/>
      <text x="200" y="176" font-family="sans-serif" font-size="46" font-weight="bold" fill="#fbbf24" text-anchor="middle">စက</text>
      <!-- Orbiting Question & Riddle Badges -->
      <circle cx="95" cy="95" r="24" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5"/>
      <text x="95" y="104" font-size="24" font-weight="bold" fill="#fde047" text-anchor="middle">?</text>
      <circle cx="305" cy="95" r="24" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5"/>
      <text x="305" y="103" font-size="18" font-weight="bold" fill="#fbbf24" text-anchor="middle">ထာ</text>
      <circle cx="305" cy="228" r="24" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5"/>
      <text x="305" y="236" font-size="22" font-weight="bold" fill="#fde047" text-anchor="middle">🏮</text>
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
      <circle cx="920" cy="240" r="190" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="3"/>
      <circle cx="920" cy="240" r="130" fill="none" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="2"/>
    </svg>
  `),
};

export function createAvatarSvg(name: string, bg = '#1e293b', fg = '#fbbf24'): string {
  const initials = (name || 'YL').trim().slice(0, 2).toUpperCase();
  return toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="shieldRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#92400e"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="${bg}" stroke="url(#shieldRim)" stroke-width="6"/>
      <text x="50" y="63" font-family="sans-serif" font-size="38" font-weight="bold" fill="${fg}" text-anchor="middle">${initials}</text>
    </svg>
  `);
}
