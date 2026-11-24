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

export function getPrimaryAssetBase(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/MyanRena')
  ) {
    return '/MyanRena/assets/';
  }
  const viteBase = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return `${viteBase}assets/`;
}

function getAssetBases(): string[] {
  const viteBase = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return Array.from(
    new Set([
      getPrimaryAssetBase(),
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

async function probeUrl(
  url: string,
  kind: 'video' | 'image'
): Promise<string | null> {
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
        ? ct.startsWith('video/') ||
          ct === 'application/octet-stream' ||
          ct === ''
        : ct.startsWith('image/') ||
          ct === 'application/octet-stream' ||
          ct === '';
    urlOkCache.set(url, valid);
    return valid ? url : null;
  } catch {
    urlOkCache.set(url, false);
    return null;
  }
}

async function resolveFirstMatch(
  baseNames: string[],
  kind: 'video' | 'image'
): Promise<string | null> {
  const exts =
    kind === 'video' ? ['mp4', 'mov', 'webm'] : ['png', 'webp', 'jpg', 'jpeg'];
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
  minDisplayMs: 2400,
  maxWaitMs: 14000,
};

/**
 * Maung Pho Thar 3D Profile Avatar (save generated avatar to public/assets/c4-kid-avatar.jpg)
 */
export const KID_BOT_AVATAR_DATA_URI = `${getPrimaryAssetBase()}c4-kid-avatar.jpg`;

export function getConnect4BotName(lang: string, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Maung Pho Thar';
  return difficulty ? `${base} (${difficulty.toUpperCase()})` : base;
}
