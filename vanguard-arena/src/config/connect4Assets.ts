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
} as const;

export const KID_BOT_AVATAR_DATA_URI = CONNECT4_ASSETS.kid.idle[0];

export function getConnect4BotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Maung Pho Thar';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}
