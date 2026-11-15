import type { RankTier } from '../types.ts';

export interface RankTierDefinition {
  tier: RankTier;
  minRp: number;
  maxRp: number | null;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  accentHex: string;
}

export const RANK_TIERS: RankTierDefinition[] = [
  {
    tier: 'Bronze',
    minRp: 0,
    maxRp: 499,
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/40',
    accentHex: '#FB923C',
  },
  {
    tier: 'Silver',
    minRp: 500,
    maxRp: 999,
    colorClass: 'text-slate-300',
    bgClass: 'bg-slate-400/10',
    borderClass: 'border-slate-400/40',
    accentHex: '#CBD5E1',
  },
  {
    tier: 'Gold',
    minRp: 1000,
    maxRp: 1599,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/40',
    accentHex: '#F59E0B',
  },
  {
    tier: 'Platinum',
    minRp: 1600,
    maxRp: 2299,
    colorClass: 'text-teal-300',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-400/40',
    accentHex: '#5EEAD4',
  },
  {
    tier: 'Diamond',
    minRp: 2300,
    maxRp: 3099,
    colorClass: 'text-sky-300',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-400/40',
    accentHex: '#7DD3FC',
  },
  {
    tier: 'Master',
    minRp: 3100,
    maxRp: 3999,
    colorClass: 'text-indigo-300',
    bgClass: 'bg-indigo-500/15',
    borderClass: 'border-indigo-400/45',
    accentHex: '#A5B4FC',
  },
  {
    tier: 'Grandmaster',
    minRp: 4000,
    maxRp: 4999,
    colorClass: 'text-rose-300',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-400/45',
    accentHex: '#FDA4AF',
  },
  {
    tier: 'Mythic',
    minRp: 5000,
    maxRp: null,
    colorClass: 'text-amber-200',
    bgClass: 'bg-gradient-to-r from-amber-500/20 to-rose-500/20',
    borderClass: 'border-amber-300/60',
    accentHex: '#FDE68A',
  },
];

export interface RankInfo {
  tier: RankTier;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  nextTier: RankTier | null;
  rpToNextTier: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  accentHex: string;
}

export function getRankInfo(rp: number): RankInfo {
  const safeRp = Math.max(0, Math.floor(rp || 0));
  const level = Math.floor(safeRp / 150) + 1;
  const xpInLevel = safeRp % 150;
  const xpForNextLevel = 150;
  const progressPct = Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100));

  let tierIdx = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (safeRp >= RANK_TIERS[i].minRp) {
      tierIdx = i;
      break;
    }
  }
  const found = RANK_TIERS[tierIdx];
  const nextDef = tierIdx < RANK_TIERS.length - 1 ? RANK_TIERS[tierIdx + 1] : null;
  const rpToNextTier = nextDef ? Math.max(0, nextDef.minRp - safeRp) : 0;

  return {
    tier: found.tier,
    level,
    xpInLevel,
    xpForNextLevel,
    progressPct,
    nextTier: nextDef ? nextDef.tier : null,
    rpToNextTier,
    colorClass: found.colorClass,
    bgClass: found.bgClass,
    borderClass: found.borderClass,
    accentHex: found.accentHex,
  };
}

export function canEquipFrame(userRp: number, unlockTier: string): boolean {
  if (!unlockTier || unlockTier === 'All') return true;
  const order = RANK_TIERS.map((t) => t.tier);
  const userIdx = order.indexOf(getRankInfo(userRp).tier);
  const reqIdx = order.indexOf(unlockTier as RankTier);
  if (reqIdx === -1) return true;
  return userIdx >= reqIdx;
}
