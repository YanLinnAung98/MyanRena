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
  className = 'w-5 h-5',
}) => {
  const g = (gameType || '').toLowerCase();
  if (g === 'tictactoe') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect x="4" y="4" width="40" height="40" rx="10" fill="#0b1222" stroke="#38bdf8" strokeWidth="2.5" />
        <path d="M13 13L21 21M21 13L13 21" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="32" cy="32" r="5.5" stroke="#fbbf24" strokeWidth="3.2" />
      </svg>
    );
  }
  if (g === 'rps') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect x="4" y="4" width="40" height="40" rx="10" fill="#170d1e" stroke="#f472b6" strokeWidth="2.5" />
        <polygon points="24,11 36,34 12,34" stroke="#fbbf24" strokeWidth="2.6" fill="#db2777" fillOpacity="0.35" />
        <circle cx="24" cy="26" r="4" fill="#38bdf8" />
      </svg>
    );
  }
  if (g === 'sakarhtar') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect x="4" y="4" width="40" height="40" rx="10" fill="#1e1207" stroke="#f59e0b" strokeWidth="2.5" />
        <circle cx="18" cy="23" r="5" fill="#0f172a" stroke="#fde047" strokeWidth="2.2" />
        <circle cx="30" cy="23" r="5" fill="#0f172a" stroke="#fde047" strokeWidth="2.2" />
        <circle cx="18" cy="23" r="2" fill="#fbbf24" />
        <circle cx="30" cy="23" r="2" fill="#fbbf24" />
        <polygon points="24,27 21,32 27,32" fill="#f59e0b" />
      </svg>
    );
  }
  // connect4
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#172554" stroke="#60a5fa" strokeWidth="2.5" />
      <circle cx="15" cy="17" r="4.2" fill="#fbbf24" />
      <circle cx="24" cy="24" r="4.2" fill="#fbbf24" />
      <circle cx="33" cy="31" r="4.2" fill="#fbbf24" />
      <circle cx="33" cy="17" r="4.2" fill="#f43f5e" />
      <circle cx="15" cy="31" r="4.2" fill="#f43f5e" />
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
