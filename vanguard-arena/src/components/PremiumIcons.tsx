import React from 'react';

/* ============================================================================
   SHARED PROFILE THEMES, TITLES & ADMIN GIFT CATALOG
============================================================================ */
export const BANNER_THEMES = [
  { id: 'imperial', name: 'Imperial Gold', bg: 'from-amber-900/80 via-slate-900 to-[#080d18]' },
  { id: 'cyber', name: 'Cyber Sapphire', bg: 'from-sky-900/80 via-indigo-950 to-[#080d18]' },
  { id: 'crimson', name: 'Crimson Flame', bg: 'from-rose-900/80 via-slate-900 to-[#080d18]' },
  { id: 'emerald', name: 'Jade Forest', bg: 'from-emerald-900/80 via-teal-950 to-[#080d18]' },
  { id: 'amethyst', name: 'Mythic Violet', bg: 'from-purple-900/80 via-fuchsia-950 to-[#080d18]' },
] as const;

export const PLAYER_TITLES = [
  { id: 'rookie', labelMy: 'အာရီနာ ကစားသမား', labelEn: 'Arena Challenger', minXp: 0 },
  { id: 'tactician', labelMy: 'ဗျူဟာပညာရှင်', labelEn: 'Grand Tactician', minXp: 1100 },
  { id: 'owl_sage', labelMy: 'ပညာရှိ ဇီးကွက်တပည့်', labelEn: 'Wise Owl Scholar', minXp: 1300 },
  { id: 'champion', labelMy: 'ရွှေတံဆိပ် ချန်ပီယံ', labelEn: 'Golden Champion', minXp: 1800 },
  { id: 'mythic', labelMy: 'ဒဏ္ဍာရီ သူရဲကောင်း', labelEn: 'Mythic Sovereign', minXp: 2400 },
] as const;

export const GIFT_CATALOG = [
  {
    id: 'champion_crown',
    nameMy: 'ရွှေသရဖူ ချန်ပီယံဆု',
    nameEn: 'Imperial Champion Crown',
    rarity: 'MYTHIC',
    accent: 'from-amber-400/25 to-yellow-600/15 border-amber-400/50 text-amber-300',
  },
  {
    id: 'diamond_chest',
    nameMy: 'စိန်ရတနာ သေတ္တာလက်ဆောင်',
    nameEn: 'Royal Diamond Chest',
    rarity: 'LEGENDARY',
    accent: 'from-sky-400/25 to-blue-600/15 border-sky-400/50 text-sky-300',
  },
  {
    id: 'vip_gift_box',
    nameMy: 'VIP အထူးလက်ဆောင်ဘူး',
    nameEn: 'VIP Prestige Gift Box',
    rarity: 'EPIC',
    accent: 'from-fuchsia-400/25 to-purple-600/15 border-fuchsia-400/50 text-fuchsia-300',
  },
  {
    id: 'mvp_star',
    nameMy: 'အကောင်းဆုံးကစားသမား MVP ဆု',
    nameEn: 'Golden MVP Star Medal',
    rarity: 'RARE',
    accent: 'from-emerald-400/25 to-teal-600/15 border-emerald-400/50 text-emerald-300',
  },
  {
    id: 'mythic_flame',
    nameMy: 'မီးလျှံသူရဲကောင်း တံဆိပ်',
    nameEn: 'Eternal Flame Crest',
    rarity: 'EPIC',
    accent: 'from-rose-400/25 to-orange-600/15 border-rose-400/50 text-rose-300',
  },
] as const;

export function getBannerTheme(id?: string) {
  return BANNER_THEMES.find((b) => b.id === id) || BANNER_THEMES[0];
}

export function getPlayerTitle(id?: string) {
  return PLAYER_TITLES.find((t) => t.id === id) || PLAYER_TITLES[0];
}

export function getGiftMeta(id?: string) {
  return GIFT_CATALOG.find((g) => g.id === id) || GIFT_CATALOG[0];
}

/* ============================================================================
   PREMIUM MULTI-TONE METALLIC / NEON SVG ESPORTS ICONS
============================================================================ */
interface IconProps {
  className?: string;
  active?: boolean;
}

export const ArenaNavIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', active }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <defs>
      <linearGradient id="icoArena" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#fef08a' : '#cbd5e1'} />
        <stop offset="55%" stopColor={active ? '#f59e0b' : '#94a3b8'} />
        <stop offset="100%" stopColor={active ? '#b45309' : '#475569'} />
      </linearGradient>
    </defs>
    <rect x="2.5" y="6.5" width="23" height="15" rx="7.5" fill="url(#icoArena)" fillOpacity={active ? '0.22' : '0.1'} stroke="url(#icoArena)" strokeWidth="1.8" />
    <path d="M9.5 11.5V16.5M7 14H12" stroke="url(#icoArena)" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="17.8" cy="12.5" r="1.4" fill={active ? '#38bdf8' : '#94a3b8'} />
    <circle cx="20.4" cy="15.2" r="1.4" fill={active ? '#fbbf24' : '#94a3b8'} />
  </svg>
);

export const TournamentNavIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', active }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <defs>
      <linearGradient id="icoTourney" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#fef08a' : '#cbd5e1'} />
        <stop offset="60%" stopColor={active ? '#f59e0b' : '#94a3b8'} />
        <stop offset="100%" stopColor={active ? '#ea580c' : '#475569'} />
      </linearGradient>
    </defs>
    <path d="M8 5H20V11C20 14.5 17.3 17.2 14 17.2C10.7 17.2 8 14.5 8 11V5Z" fill="url(#icoTourney)" fillOpacity={active ? '0.28' : '0.1'} stroke="url(#icoTourney)" strokeWidth="1.8" />
    <path d="M8 7H4.5C4.5 10.5 6 12.5 8.5 13M20 7H23.5C23.5 10.5 22 12.5 19.5 13" stroke="url(#icoTourney)" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M14 17.2V22M9.5 22.5H18.5" stroke="url(#icoTourney)" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 8L15 10.1L17.3 10.4L15.6 12L16 14.2L14 13.1L12 14.2L12.4 12L10.7 10.4L13 10.1L14 8Z" fill={active ? '#fef08a' : '#94a3b8'} />
  </svg>
);

export const RankCrownNavIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', active }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <defs>
      <linearGradient id="icoRank" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#fde047' : '#cbd5e1'} />
        <stop offset="100%" stopColor={active ? '#d97706' : '#64748b'} />
      </linearGradient>
    </defs>
    <path d="M4 20L6.5 9L11.5 13.5L14 6.5L16.5 13.5L21.5 9L24 20H4Z" fill="url(#icoRank)" fillOpacity={active ? '0.3' : '0.12'} stroke="url(#icoRank)" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="4.5" y="21.5" width="19" height="2.4" rx="1.2" fill="url(#icoRank)" />
  </svg>
);

export const SocialNavIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', active }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <defs>
      <linearGradient id="icoSocial" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#7dd3fc' : '#cbd5e1'} />
        <stop offset="100%" stopColor={active ? '#f59e0b' : '#64748b'} />
      </linearGradient>
    </defs>
    <circle cx="10.5" cy="10" r="3.6" fill="url(#icoSocial)" fillOpacity={active ? '0.3' : '0.12'} stroke="url(#icoSocial)" strokeWidth="1.7" />
    <path d="M4.2 21.5C4.8 17.8 7.3 16 10.5 16C13.7 16 16.2 17.8 16.8 21.5" stroke="url(#icoSocial)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="19" cy="11" r="2.8" stroke="url(#icoSocial)" strokeWidth="1.6" />
    <path d="M18 16.4C20.8 16.7 23 18.2 23.8 21" stroke="url(#icoSocial)" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const ProfileCrestNavIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', active }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <defs>
      <linearGradient id="icoProf" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#fef08a' : '#cbd5e1'} />
        <stop offset="100%" stopColor={active ? '#f59e0b' : '#64748b'} />
      </linearGradient>
    </defs>
    <path d="M14 3L23 6.8V13.8C23 19.2 19.2 23.2 14 25C8.8 23.2 5 19.2 5 13.8V6.8L14 3Z" fill="url(#icoProf)" fillOpacity={active ? '0.24' : '0.1'} stroke="url(#icoProf)" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="14" cy="11.2" r="2.8" fill="url(#icoProf)" />
    <path d="M9.6 18.8C10.5 16.6 12 15.6 14 15.6C16 15.6 17.5 16.6 18.4 18.8" stroke="url(#icoProf)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const SettingsGearIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <linearGradient id="icoGear" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <path
      d="M12 15.2A3.2 3.2 0 1 0 12 8.8A3.2 3.2 0 0 0 12 15.2Z"
      fill="url(#icoGear)"
      fillOpacity="0.25"
      stroke="url(#icoGear)"
      strokeWidth="1.8"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="url(#icoGear)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PremiumBellIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <linearGradient id="icoBell" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <path
      d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      fill="url(#icoBell)"
      fillOpacity="0.25"
      stroke="url(#icoBell)"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="url(#icoBell)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PremiumGiftSvg: React.FC<{ giftId?: string; className?: string }> = ({
  giftId = 'champion_crown',
  className = 'w-8 h-8',
}) => {
  if (giftId === 'diamond_chest') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <defs>
          <linearGradient id="gDia" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <polygon points="20,4 34,15 20,36 6,15" fill="url(#gDia)" stroke="#bae6fd" strokeWidth="1.8" strokeLinejoin="round" />
        <polyline points="6,15 20,18 34,15" stroke="#e0f2fe" strokeWidth="1.4" />
        <line x1="20" y1="4" x2="20" y2="36" stroke="#e0f2fe" strokeOpacity="0.6" strokeWidth="1.3" />
      </svg>
    );
  }
  if (giftId === 'vip_gift_box') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <defs>
          <linearGradient id="gVip" x1="4" y1="6" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="50%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
        </defs>
        <rect x="6" y="15" width="28" height="20" rx="4" fill="url(#gVip)" stroke="#f0abfc" strokeWidth="1.6" />
        <rect x="4" y="11" width="32" height="6" rx="2.5" fill="#d946ef" stroke="#fae8ff" strokeWidth="1.5" />
        <rect x="17.5" y="11" width="5" height="24" fill="#fbbf24" />
        <path d="M20 11C16 4 10 6 13 11M20 11C24 4 30 6 27 11" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (giftId === 'mvp_star') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <defs>
          <linearGradient id="gMvp" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="15" fill="url(#gMvp)" stroke="#6ee7b7" strokeWidth="2" />
        <path d="M20 9L23 15.5L30 16.4L24.8 21.2L26.2 28.2L20 24.8L13.8 28.2L15.2 21.2L10 16.4L17 15.5L20 9Z" fill="#fef08a" />
      </svg>
    );
  }
  if (giftId === 'mythic_flame') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <defs>
          <linearGradient id="gFlame" x1="20" y1="4" x2="20" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
        </defs>
        <path
          d="M20 4C20 4 31 13 31 23C31 30 26 35 20 35C14 35 9 30 9 23C9 17 13 12 15 10C15 14 17 16 17 16C17 12 20 4 20 4Z"
          fill="url(#gFlame)"
          stroke="#fed7aa"
          strokeWidth="1.6"
        />
        <path d="M20 20C20 20 24.5 23.5 24.5 28C24.5 30.8 22.5 32.5 20 32.5C17.5 32.5 15.5 30.8 15.5 28C15.5 23.5 20 20 20 20Z" fill="#fef08a" />
      </svg>
    );
  }
  // Default: Champion Crown
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <defs>
        <linearGradient id="gCrown" x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M5 29L8 12L15.5 19L20 8L24.5 19L32 12L35 29H5Z" fill="url(#gCrown)" stroke="#fef08a" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="6" y="30.5" width="28" height="4" rx="2" fill="#f59e0b" />
      <circle cx="20" cy="7" r="2.2" fill="#fef08a" />
      <circle cx="7.5" cy="11" r="2" fill="#38bdf8" />
      <circle cx="32.5" cy="11" r="2" fill="#38bdf8" />
    </svg>
  );
};
