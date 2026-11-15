import type { Difficulty, MatchParticipant } from '../types.ts';

export interface BurmeseBotIdentity {
  slug: string;
  name: string;
  tierXp: number;
  frameId: string;
  palette: [string, string, string];
  initial: string;
}

export const BURMESE_BOT_POOL: BurmeseBotIdentity[] = [
  { slug: 'mgmg', name: 'မောင်မောင်', tierXp: 1240, frameId: 'frame_gold', palette: ['#F59E0B', '#B45309', '#FEF3C7'], initial: 'မ' },
  { slug: 'thiri', name: 'သီရိ', tierXp: 1680, frameId: 'frame_sapphire', palette: ['#38BDF8', '#1D4ED8', '#E0F2FE'], initial: 'သ' },
  { slug: 'kyawkyaw', name: 'ကျော်ကျော်', tierXp: 890, frameId: 'frame_platinum', palette: ['#10B981', '#047857', '#D1FAE5'], initial: 'က' },
  { slug: 'hninwutyee', name: 'နှင်းဝတ်ရည်', tierXp: 2450, frameId: 'frame_sovereign', palette: ['#F43F5E', '#9F1239', '#FFE4E6'], initial: 'န' },
  { slug: 'aungthu', name: 'အောင်သူ', tierXp: 1520, frameId: 'frame_sapphire', palette: ['#6366F1', '#3730A3', '#E0E7FF'], initial: 'အ' },
  { slug: 'maymyatnoe', name: 'မေမြတ်နိုး', tierXp: 2110, frameId: 'frame_platinum', palette: ['#EC4899', '#9D174D', '#FCE7F3'], initial: 'မ' },
  { slug: 'zayar', name: 'ဇေယျာ', tierXp: 3120, frameId: 'frame_sovereign', palette: ['#F59E0B', '#92400E', '#FEF3C7'], initial: 'ဇ' },
  { slug: 'sumyat', name: 'စုမြတ်', tierXp: 980, frameId: 'frame_gold', palette: ['#14B8A6', '#115E59', '#CCFBF1'], initial: 'စ' },
  { slug: 'htetaung', name: 'ထက်အောင်', tierXp: 1940, frameId: 'frame_platinum', palette: ['#0EA5E9', '#0369A1', '#E0F2FE'], initial: 'ထ' },
  { slug: 'khinthandar', name: 'ခင်သန္တာ', tierXp: 1360, frameId: 'frame_sapphire', palette: ['#A855F7', '#6B21A8', '#F3E8FF'], initial: 'ခ' },
  { slug: 'thetpine', name: 'သက်ပိုင်', tierXp: 640, frameId: 'frame_none', palette: ['#F97316', '#9A3412', '#FFEDD5'], initial: 'သ' },
  { slug: 'shweyee', name: 'ရွှေရည်', tierXp: 2780, frameId: 'frame_sovereign', palette: ['#EAB308', '#854D0E', '#FEF9C3'], initial: 'ရ' },
  { slug: 'phyowai', name: 'ဖြိုးဝေ', tierXp: 1120, frameId: 'frame_gold', palette: ['#22C55E', '#15803D', '#DCFCE7'], initial: 'ဖ' },
  { slug: 'yamin', name: 'ယမင်း', tierXp: 1750, frameId: 'frame_sapphire', palette: ['#FB7185', '#BE123C', '#FFE4E6'], initial: 'ယ' },
  { slug: 'nainglin', name: 'နိုင်လင်း', tierXp: 2290, frameId: 'frame_platinum', palette: ['#3B82F6', '#1E40AF', '#DBEAFE'], initial: 'န' },
  { slug: 'chanmyae', name: 'ချမ်းမြေ့', tierXp: 1410, frameId: 'frame_gold', palette: ['#2DD4BF', '#0F766E', '#CCFBF1'], initial: 'ခ' },
  { slug: 'minkhant', name: 'မင်းခန့်', tierXp: 3650, frameId: 'frame_sovereign', palette: ['#F59E0B', '#78350F', '#FEF3C7'], initial: 'မ' },
  { slug: 'hsumyatnoe', name: 'ဆုမြတ်နိုး', tierXp: 1830, frameId: 'frame_sapphire', palette: ['#C084FC', '#7E22CE', '#F3E8FF'], initial: 'ဆ' },
  { slug: 'waiyan', name: 'ဝေယံ', tierXp: 760, frameId: 'frame_none', palette: ['#38BDF8', '#075985', '#E0F2FE'], initial: 'ဝ' },
  { slug: 'nwelni', name: 'နွယ်နီ', tierXp: 1590, frameId: 'frame_gold', palette: ['#F43F5E', '#881337', '#FFE4E6'], initial: 'န' },
  { slug: 'kaungmyat', name: 'ကောင်းမြတ်', tierXp: 2640, frameId: 'frame_platinum', palette: ['#10B981', '#065F46', '#D1FAE5'], initial: 'က' },
  { slug: 'ekaree', name: 'ဧကရီ', tierXp: 3890, frameId: 'frame_sovereign', palette: ['#FBBF24', '#92400E', '#FEF3C7'], initial: 'ဧ' },
  { slug: 'htunhtun', name: 'ထွန်းထွန်း', tierXp: 510, frameId: 'frame_none', palette: ['#64748B', '#334155', '#F1F5F9'], initial: 'ထ' },
  { slug: 'moemyint', name: 'မိုးမြင့်', tierXp: 2050, frameId: 'frame_sapphire', palette: ['#06B6D4', '#155E75', '#CFFAFE'], initial: 'မ' },
  { slug: 'thurein', name: 'သူရိန်', tierXp: 2910, frameId: 'frame_sovereign', palette: ['#FB923C', '#9A3412', '#FFEDD5'], initial: 'သ' },
  { slug: 'thazin', name: 'သဇင်', tierXp: 1320, frameId: 'frame_gold', palette: ['#E879F9', '#86198F', '#FAE8FF'], initial: 'သ' },
  { slug: 'yeyint', name: 'ရဲရင့်', tierXp: 2340, frameId: 'frame_platinum', palette: ['#EF4444', '#991B1B', '#FEE2E2'], initial: 'ရ' },
  { slug: 'myatnoe', name: 'မြတ်နိုး', tierXp: 1180, frameId: 'frame_sapphire', palette: ['#34D399', '#065F46', '#D1FAE5'], initial: 'မ' },
  { slug: 'pyaephyo', name: 'ပြည့်ဖြိုး', tierXp: 1870, frameId: 'frame_gold', palette: ['#818CF8', '#3730A3', '#E0E7FF'], initial: 'ပ' },
  { slug: 'thandar', name: 'သန္တာ', tierXp: 940, frameId: 'frame_none', palette: ['#FB7185', '#9F1239', '#FFE4E6'], initial: 'သ' },
  { slug: 'sithu', name: 'စည်သူ', tierXp: 3320, frameId: 'frame_sovereign', palette: ['#F59E0B', '#B45309', '#FEF3C7'], initial: 'စ' },
  { slug: 'naylin', name: 'နေလင်း', tierXp: 1470, frameId: 'frame_sapphire', palette: ['#0EA5E9', '#075985', '#E0F2FE'], initial: 'န' },
];

function createBotAvatarSvg(bot: BurmeseBotIdentity): string {
  const [c1, c2, c3] = bot.palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="bg" cx="35%" cy="25%" r="85%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient></defs><rect width="128" height="128" fill="url(#bg)"/><circle cx="64" cy="48" r="22" fill="${c3}" fill-opacity="0.22"/><path d="M24 128 C28 92 44 82 64 82 C84 82 100 92 104 128 Z" fill="${c3}" fill-opacity="0.25"/><circle cx="64" cy="64" r="54" fill="none" stroke="${c3}" stroke-opacity="0.35" stroke-width="3"/><text x="64" y="76" font-family="Noto Sans Myanmar, sans-serif" font-size="44" font-weight="700" text-anchor="middle" fill="#FFFFFF">${bot.initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function pickBotDifficultyFromXp(xp: number): Difficulty {
  if (xp >= 2400) return 'hard';
  if (xp >= 1100) return 'medium';
  return 'easy';
}

export function createBurmeseBotParticipant(usedIds?: Set<string>, targetXp?: number): MatchParticipant {
  let pool = BURMESE_BOT_POOL.filter((b) => !usedIds?.has(`bot_mm_${b.slug}`));
  if (pool.length === 0) pool = BURMESE_BOT_POOL;

  // Prefer bots roughly near the player's RP band when possible
  if (typeof targetXp === 'number') {
    const near = pool.filter((b) => Math.abs(b.tierXp - targetXp) <= 1200);
    if (near.length > 0) pool = near;
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  const botId = `bot_mm_${picked.slug}`;
  usedIds?.add(botId);

  const hashNum = picked.slug.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const gameCode = 10000 + (Math.abs(hashNum) % 89999);

  return {
    id: botId,
    gameId: `#PLY-${gameCode}`,
    displayName: picked.name,
    avatarUrl: createBotAvatarSvg(picked),
    frameId: picked.frameId,
    xp: picked.tierXp,
    isBot: true,
    pingMs: 12 + (Math.abs(hashNum) % 26),
  };
}

export function pickBurmeseBotBatch(count: number, usedIds?: Set<string>, targetXp?: number): MatchParticipant[] {
  const used = usedIds || new Set<string>();
  const result: MatchParticipant[] = [];
  for (let i = 0; i < count; i++) {
    result.push(createBurmeseBotParticipant(used, targetXp));
  }
  return result;
}
