const GITHUB_RAW_ASSETS_BASE =
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/public/assets/';

export function getAssetCandidates(filename: string): string[] {
  const base = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return [
    `${base}assets/${filename}`,
    `/MyanRena/assets/${filename}`,
    `${GITHUB_RAW_ASSETS_BASE}${filename}`,
  ];
}

export const CONNECT4_ASSETS = {
  roomBg: getAssetCandidates('c4-room-bg.jpg'),
  loadingVideo: getAssetCandidates('c4-loading.mp4'),
  loadingImage: getAssetCandidates('c4-loading.jpg'),
  kid: {
    idle: getAssetCandidates('c4-kid-idle.jpg'),
    thinking: getAssetCandidates('c4-kid-thinking.jpg'),
    dropping: getAssetCandidates('c4-kid-dropping.jpg'),
    happy: getAssetCandidates('c4-kid-happy.jpg'),
    crying: getAssetCandidates('c4-kid-cry.jpg'),
  },
} as const;

export const KID_BOT_AVATAR_DATA_URI = CONNECT4_ASSETS.kid.idle[0];

export function getConnect4BotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Maung Pho Thar';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}
