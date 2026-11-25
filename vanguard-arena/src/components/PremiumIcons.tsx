import React from 'react';

interface IconProps {
  className?: string;
}

export const RankTierIcon: React.FC<{ tier?: string; className?: string }> = ({
  tier = 'bronze',
  className = 'w-5 h-5',
}) => {
  const key = tier.toLowerCase();
  const palettes: Record<string, [string, string, string]> = {
    bronze: ['#fdba74', '#b45309', '#451a03'],
    silver: ['#f8fafc', '#94a3b8', '#334155'],
    gold: ['#fef08a', '#f59e0b', '#78350f'],
    platinum: ['#a7f3d0', '#10b981', '#064e3b'],
    emerald: ['#a7f3d0', '#10b981', '#064e3b'],
    diamond: ['#e0f2fe', '#38bdf8', '#1e3a8a'],
    master: ['#f5d0fe', '#c026d3', '#4a044e'],
    legend: ['#fef08a', '#f43f5e', '#f59e0b'],
  };
  const [c1, c2, c3] = palettes[key] || palettes.silver;
  const uid = `rank_${key}_${React.useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={uid} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c1} />
          <stop offset="55%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
      </defs>
      <path
        d="M32 4L54 14V31C54 45.2 44.5 55.6 32 60C19.5 55.6 10 45.2 10 31V14L32 4Z"
        fill={`url(#${uid})`}
        stroke={c1}
        strokeWidth="2.5"
      />
      <path
        d="M32 11L47 18V30.5C47 41.2 40.3 49 32 52.6C23.7 49 17 41.2 17 30.5V18L32 11Z"
        fill="#070b14"
        fillOpacity="0.65"
        stroke={c1}
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      {key === 'legend' ? (
        <path
          d="M21 37L24 23L32 29L40 23L43 37H21ZM23 41H41V44H23V41Z"
          fill={c1}
        />
      ) : key === 'diamond' || key === 'master' ? (
        <polygon points="32,18 43,31 32,45 21,31" fill={c1} fillOpacity="0.95" />
      ) : (
        <path
          d="M32 19L35.4 26.8L44 27.6L37.5 33.2L39.4 41.5L32 37.1L24.6 41.5L26.5 33.2L20 27.6L28.6 26.8L32 19Z"
          fill={c1}
        />
      )}
    </svg>
  );
};

export const PodiumMedalIcon: React.FC<{ place: 1 | 2 | 3; className?: string }> = ({
  place,
  className = 'w-6 h-6',
}) => {
  const colors =
    place === 1
      ? { top: '#fef08a', mid: '#f59e0b', dark: '#92400e', ribbon: '#e11d48' }
      : place === 2
      ? { top: '#f8fafc', mid: '#94a3b8', dark: '#334155', ribbon: '#2563eb' }
      : { top: '#fed7aa', mid: '#ea580c', dark: '#7c2d12', ribbon: '#059669' };
  const uid = `medal_${place}_${React.useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={uid} x1="16" y1="20" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.top} />
          <stop offset="55%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <path d="M19 6H30L34 26H25L19 6Z" fill={colors.ribbon} />
      <path d="M45 6H34L30 26H39L45 6Z" fill={colors.ribbon} fillOpacity="0.82" />
      <circle cx="32" cy="39" r="19" fill={`url(#${uid})`} stroke={colors.top} strokeWidth="2.5" />
      <circle cx="32" cy="39" r="13.5" fill="#070b14" fillOpacity="0.4" stroke={colors.top} strokeOpacity="0.5" />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fontSize="18"
        fontWeight="900"
        fill={colors.top}
        fontFamily="system-ui, sans-serif"
      >
        {place}
      </text>
    </svg>
  );
};

export const GiftTrophyIcon: React.FC<{
  iconId?: 'dragon_cup' | 'mythic_crown' | 'diamond_relic' | 'cyber_medal' | 'vip_voucher';
  className?: string;
}> = ({ iconId = 'dragon_cup', className = 'w-6 h-6' }) => {
  const uid = `gift_${iconId}_${React.useId().replace(/:/g, '')}`;

  if (iconId === 'mythic_crown') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none">
        <defs>
          <linearGradient id={uid} x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <path
          d="M10 46L14 18L25 29L32 13L39 29L50 18L54 46H10Z"
          fill={`url(#${uid})`}
          stroke="#fef08a"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <rect x="12" y="49" width="40" height="6" rx="3" fill="#fbbf24" />
        <circle cx="32" cy="34" r="4" fill="#fff" />
      </svg>
    );
  }

  if (iconId === 'diamond_relic') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none">
        <defs>
          <linearGradient id={uid} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <polygon points="18,12 46,12 56,26 32,56 8,26" fill={`url(#${uid})`} stroke="#bae6fd" strokeWidth="2.2" />
        <polyline points="8,26 56,26" stroke="#e0f2fe" strokeWidth="1.8" strokeOpacity="0.8" />
        <polyline points="18,12 24,26 32,56 40,26 46,12" stroke="#e0f2fe" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>
    );
  }

  if (iconId === 'vip_voucher') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none">
        <defs>
          <linearGradient id={uid} x1="6" y1="16" x2="58" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="50%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect x="6" y="16" width="52" height="32" rx="7" fill={`url(#${uid})`} stroke="#f5d0fe" strokeWidth="2" />
        <line x1="22" y1="17" x2="22" y2="47" stroke="#fff" strokeDasharray="3 3" strokeOpacity="0.6" />
        <text x="40" y="37" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fef08a" fontFamily="sans-serif">
          VIP
        </text>
      </svg>
    );
  }

  if (iconId === 'cyber_medal') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none">
        <defs>
          <linearGradient id={uid} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <polygon points="32,6 54,19 54,45 32,58 10,45 10,19" fill={`url(#${uid})`} stroke="#a7f3d0" strokeWidth="2.2" />
        <path d="M32 18L36 27L46 28L38.5 34.5L40.5 44L32 39L23.5 44L25.5 34.5L18 28L28 27L32 18Z" fill="#ecfdf5" />
      </svg>
    );
  }

  // Default: dragon_cup (Golden Champion Trophy)
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id={uid} x1="14" y1="8" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M18 14H10C10 26 15 32 22 32" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M46 14H54C54 26 49 32 42 32" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18 10H46V26C46 34.8 39.7 41 32 41C24.3 41 18 34.8 18 26V10Z" fill={`url(#${uid})`} stroke="#fef08a" strokeWidth="2" />
      <rect x="28" y="41" width="8" height="9" fill="#d97706" />
      <rect x="20" y="50" width="24" height="6" rx="3" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.5" />
      <path d="M32 17L34.2 22L39.5 22.5L35.4 26L36.6 31L32 28.3L27.4 31L28.6 26L24.5 22.5L29.8 22L32 17Z" fill="#fffbeb" />
    </svg>
  );
};

export const GameBadgeIcon: React.FC<{ gameType?: string; className?: string }> = ({
  gameType = 'connect4',
  className = 'w-7 h-7',
}) => {
  const g = (gameType || '').toLowerCase();
  const uid = `game_${g}_${React.useId().replace(/:/g, '')}`;
  const palette = g === 'tictactoe'
    ? { deep: '#082f49', mid: '#0891b2', bright: '#67e8f9', accent: '#fbbf24' }
    : g === 'rps'
    ? { deep: '#4a044e', mid: '#c026d3', bright: '#f0abfc', accent: '#67e8f9' }
    : g === 'sakarhtar'
    ? { deep: '#451a03', mid: '#d97706', bright: '#fde68a', accent: '#a7f3d0' }
    : { deep: '#172554', mid: '#2563eb', bright: '#93c5fd', accent: '#fbbf24' };

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" role="img" aria-label={g === 'tictactoe' ? 'Tic Tac Toe' : g === 'rps' ? 'Rock Paper Scissors' : g === 'sakarhtar' ? 'Myanmar Quiz' : 'Connect Four'}>
      <defs>
        <linearGradient id={uid + '_shell'} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor={palette.bright} />
          <stop offset=".48" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.deep} />
        </linearGradient>
        <linearGradient id={uid + '_shine'} x1="14" y1="9" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={uid + '_shadow'} x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <path d="M32 3.5 55 16v31.5L32 61 9 47.5V16L32 3.5Z" fill={palette.mid} opacity=".38" filter={`url(#${uid}_shadow)`} />
      <path d="M32 3.5 55 16v31.5L32 61 9 47.5V16L32 3.5Z" fill={`url(#${uid}_shell)`} stroke={palette.bright} strokeWidth="1.8" />
      <path d="M32 9 49.5 18.5v25L32 54 14.5 43.5v-25L32 9Z" fill="#07101f" fillOpacity=".82" stroke="#fff" strokeOpacity=".2" />
      <path d="M32 3.5 55 16v8L32 11 9 24v-8L32 3.5Z" fill={`url(#${uid}_shine)`} />
      {g === 'tictactoe' ? (
        <>
          <path d="m19 19 10 10m0-10L19 29" stroke={palette.bright} strokeWidth="5" strokeLinecap="round" />
          <circle cx="41" cy="40" r="7" stroke={palette.accent} strokeWidth="4.5" />
          <path d="M17 43h10m20-25-4 5" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : g === 'rps' ? (
        <>
          <path d="m32 14 17 30H15L32 14Z" fill={palette.mid} fillOpacity=".5" stroke={palette.bright} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="m32 20 11 20H21l11-20Z" fill="#fff" fillOpacity=".12" />
          <circle cx="32" cy="33" r="5.5" fill={palette.accent} stroke="#fff" strokeWidth="1.5" />
          <path d="m18 18 4 4m24 18 3 3" stroke="#fff" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : g === 'sakarhtar' ? (
        <>
          <path d="M16 26c0-9 7-15 16-15s16 6 16 15v9c0 7-7 12-16 12s-16-5-16-12v-9Z" fill={palette.mid} fillOpacity=".45" stroke={palette.bright} strokeWidth="2.5" />
          <path d="M20 27c3-5 7-7 12-7s9 2 12 7" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="25" cy="31" rx="4.5" ry="6" fill={palette.accent} />
          <ellipse cx="39" cy="31" rx="4.5" ry="6" fill={palette.accent} />
          <circle cx="25" cy="31" r="1.7" fill="#172033" /><circle cx="39" cy="31" r="1.7" fill="#172033" />
          <path d="m32 34-5 7h10l-5-7Z" fill="#fb923c" />
          <path d="M25 47 20 54m19-7 5 7" stroke={palette.bright} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="17" y="15" width="30" height="34" rx="5" fill={palette.mid} fillOpacity=".35" stroke={palette.bright} strokeWidth="2.5" />
          <circle cx="24" cy="23" r="4.2" fill={palette.accent} stroke="#fff" strokeOpacity=".6" />
          <circle cx="40" cy="23" r="4.2" fill="#fb7185" stroke="#fff" strokeOpacity=".6" />
          <circle cx="32" cy="32" r="4.2" fill={palette.accent} stroke="#fff" strokeOpacity=".6" />
          <circle cx="24" cy="41" r="4.2" fill="#fb7185" stroke="#fff" strokeOpacity=".6" />
          <circle cx="40" cy="41" r="4.2" fill={palette.accent} stroke="#fff" strokeOpacity=".6" />
          <path d="M20 17h24" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      <path d="m13 13 3 2m32 34 3 2" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const VanguardCrestIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none">
    <defs>
      <linearGradient id="vgCrest" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <path d="M32 4L56 14V32C56 47 45 56 32 61C19 56 8 47 8 32V14L32 4Z" fill="#090e1a" stroke="url(#vgCrest)" strokeWidth="3.5" />
    <path d="M20 20L32 45L44 20H37L32 32L27 20H20Z" fill="url(#vgCrest)" />
  </svg>
);
