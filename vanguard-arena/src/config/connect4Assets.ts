const RAW_ROOT =
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/public/assets/';
const RAW_SUB =
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/vanguard-arena/public/assets/';
const CDN_ROOT =
  'https://cdn.jsdelivr.net/gh/YanLinnAung98/MyanRena@main/public/assets/';
const CDN_SUB =
  'https://cdn.jsdelivr.net/gh/YanLinnAung98/MyanRena@main/vanguard-arena/public/assets/';

function getBases(): string[] {
  const viteBase = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return Array.from(
    new Set([
      `${viteBase}assets/`,
      '/MyanRena/assets/',
      RAW_ROOT,
      RAW_SUB,
      CDN_ROOT,
      CDN_SUB,
    ])
  );
}

export function getImageCandidates(baseNames: string[]): string[] {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  const bases = getBases();
  const urls: string[] = [];
  for (const base of bases) {
    for (const name of baseNames) {
      for (const ext of exts) {
        urls.push(`${base}${name}.${ext}`);
      }
    }
  }
  return urls;
}

export function getVideoCandidates(baseNames: string[]): string[] {
  const exts = ['mp4', 'webm'];
  const bases = getBases();
  const urls: string[] = [];
  for (const base of bases) {
    for (const name of baseNames) {
      for (const ext of exts) {
        urls.push(`${base}${name}.${ext}`);
      }
    }
  }
  return urls;
}

export const CONNECT4_ASSETS = {
  roomBgVideo: getVideoCandidates(['c4-room-bg']),
  roomBgImage: getImageCandidates(['c4-room-bg']),
  loadingVideo: getVideoCandidates(['c4-loading']),
  loadingImage: getImageCandidates(['c4-loading', 'c4-room-bg']),
  kid: {
    idle: getImageCandidates(['c4-kid-idle']),
    thinking: getImageCandidates(['c4-kid-thinking']),
    dropping: getImageCandidates(['c4-kid-dropping']),
    happy: getImageCandidates(['c4-kid-happy']),
    crying: getImageCandidates(['c4-kid-cry', 'c4-kid-crying']),
  },
  kidVideo: {
    idle: getVideoCandidates(['c4-kid-idle']),
    thinking: getVideoCandidates(['c4-kid-thinking']),
    dropping: getVideoCandidates(['c4-kid-dropping']),
    happy: getVideoCandidates(['c4-kid-happy']),
    crying: getVideoCandidates(['c4-kid-cry', 'c4-kid-crying']),
  },
} as const;

/**
 * Built-in Maung Pho Thar Avatar (Data URI) — ဘယ်အခြေအနေမှာမဆို 404 မဖြစ်ဘဲ ချက်ချင်းပေါ်မည်
 */
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
  <circle cx="44" cy="64" r="0.9" fill="#b86b4b"/>
  <circle cx="48" cy="65.5" r="0.8" fill="#b86b4b"/>
  <circle cx="72" cy="65.5" r="0.8" fill="#b86b4b"/>
  <circle cx="76" cy="64" r="0.9" fill="#b86b4b"/>
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
