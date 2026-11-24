export type MediaKind = 'video' | 'image' | 'none';
export type KidMood = 'idle' | 'thinking' | 'dropping' | 'happy' | 'crying';

export interface ResolvedAsset {
  kind: MediaKind;
  url: string | null;
}

const RAW_ROOT =
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/public/assets/';
const RAW_SUB =
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/vanguard-arena/public/assets/';

function getAssetBases(): string[] {
  const viteBase = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return Array.from(
    new Set([
      `${viteBase}assets/`,
      '/MyanRena/assets/',
      RAW_ROOT,
      RAW_SUB,
    ])
  );
}

function buildUrls(baseNames: string[], exts: string[]): string[] {
  const bases = getAssetBases();
  const list: string[] = [];
  for (const base of bases) {
    for (const name of baseNames) {
      for (const ext of exts) {
        list.push(`${base}${name}.${ext}`);
      }
    }
  }
  return list;
}

const urlOkCache = new Map<string, boolean>();

async function probeUrl(url: string, kind: 'video' | 'image'): Promise<string | null> {
  if (urlOkCache.has(url)) {
    return urlOkCache.get(url) ? url : null;
  }
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (!res.ok) {
      urlOkCache.set(url, false);
      return null;
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      urlOkCache.set(url, false);
      return null;
    }
    const valid =
      kind === 'video'
        ? ct.startsWith('video/') || ct === 'application/octet-stream' || ct === ''
        : ct.startsWith('image/') || ct === 'application/octet-stream' || ct === '';
    urlOkCache.set(url, valid);
    return valid ? url : null;
  } catch {
    urlOkCache.set(url, false);
    return null;
  }
}

/**
 * Checks all candidate URLs in parallel and returns the first valid match in priority order.
 */
async function resolveFirstMatch(
  baseNames: string[],
  kind: 'video' | 'image'
): Promise<string | null> {
  const exts = kind === 'video' ? ['mp4', 'webm'] : ['png', 'webp', 'jpg', 'jpeg'];
  const urls = buildUrls(baseNames, exts);
  const results = await Promise.all(urls.map((u) => probeUrl(u, kind)));
  return results.find((u): u is string => Boolean(u)) || null;
}

export async function resolveMediaSlot(
  baseNames: string[],
  prefer: 'video' | 'image' = 'video'
): Promise<ResolvedAsset> {
  const [videoUrl, imageUrl] = await Promise.all([
    resolveFirstMatch(baseNames, 'video'),
    resolveFirstMatch(baseNames, 'image'),
  ]);

  if (prefer === 'video') {
    if (videoUrl) return { kind: 'video', url: videoUrl };
    if (imageUrl) return { kind: 'image', url: imageUrl };
  } else {
    if (imageUrl) return { kind: 'image', url: imageUrl };
    if (videoUrl) return { kind: 'video', url: videoUrl };
  }
  return { kind: 'none', url: null };
}

export const CONNECT4_SLOT_NAMES = {
  loading: ['c4-loading'],
  roomBg: ['c4-room-bg'],
  kid: {
    idle: ['c4-kid-idle'],
    thinking: ['c4-kid-thinking'],
    dropping: ['c4-kid-dropping'],
    happy: ['c4-kid-happy'],
    crying: ['c4-kid-cry', 'c4-kid-crying'],
  },
};

export const CONNECT4_LOADING_TIMING = {
  minDisplayMs: 2400, // c4-loading.mp4 ကို သေချာမြင်ရစေရန် အနည်းဆုံး 2.4s ပြမည်
  maxWaitMs: 14000,   // အင်တာနက် အလွန်နှေးနေလျှင် 14s ပြည့်ပါက ဝင်ခွင့်ပေးမည်
};

const PHO_THAR_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="ptBg" cx="50%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#334b85"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <radialGradient id="ptSkin" cx="44%" cy="34%" r="65%">
      <stop offset="0%" stop-color="#ffe1c8"/>
      <stop offset="70%" stop-color="#f2b892"/>
      <stop offset="100%" stop-color="#d48e66"/>
    </radialGradient>
    <linearGradient id="ptHair" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3c281e"/>
      <stop offset="100%" stop-color="#17100c"/>
    </linearGradient>
    <linearGradient id="ptHoodie" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6086b5"/>
      <stop offset="100%" stop-color="#334e73"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="url(#ptBg)"/>
  <path d="M18 122 C22 92, 40 84, 60 84 C80 84, 98 92, 102 122 Z" fill="url(#ptHoodie)"/>
  <path d="M40 86 Q60 100 80 86" stroke="#253b59" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="52" y="76" width="16" height="14" rx="7" fill="#e5a67e"/>
  <circle cx="31" cy="60" r="8" fill="#ebb089"/>
  <circle cx="89" cy="60" r="8" fill="#ebb089"/>
  <ellipse cx="60" cy="58" rx="29" ry="28" fill="url(#ptSkin)"/>
  <path d="M27 56 C25 26, 44 14, 62 15 C82 15, 95 29, 93 56 C86 43, 78 36, 68 40 C62 32, 50 32, 42 42 C35 38, 30 46, 27 56 Z" fill="url(#ptHair)"/>
  <path d="M42 20 Q56 10 70 18 Q82 14 88 26" stroke="#261812" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="47" cy="57" rx="5.5" ry="6" fill="#ffffff"/>
  <ellipse cx="73" cy="57" rx="5.5" ry="6" fill="#ffffff"/>
  <circle cx="48" cy="57.5" r="3.6" fill="#3a2013"/>
  <circle cx="72" cy="57.5" r="3.6" fill="#3a2013"/>
  <circle cx="46.6" cy="55.6" r="1.4" fill="#ffffff"/>
  <circle cx="70.6" cy="55.6" r="1.4" fill="#ffffff"/>
  <path d="M40 47 Q47 44 53 47" stroke="#2a1b14" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M67 47 Q73 44 80 47" stroke="#2a1b14" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="41" cy="66" rx="5.5" ry="3" fill="#f4847a" opacity="0.45"/>
  <ellipse cx="79" cy="66" rx="5.5" ry="3" fill="#f4847a" opacity="0.45"/>
  <ellipse cx="60" cy="64" rx="3.4" ry="2.4" fill="#df9b74"/>
  <path d="M51 72 Q60 79 69 72" stroke="#8f3a2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>
`.trim();

export const KID_BOT_AVATAR_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  PHO_THAR_AVATAR_SVG
)}`;

export function getConnect4BotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Maung Pho Thar';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}
