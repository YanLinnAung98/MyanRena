export type MediaKind = 'video' | 'image' | 'none';
export type KidMood = 'idle' | 'thinking' | 'dropping' | 'happy' | 'crying';

export interface ResolvedMediaAsset {
  kind: MediaKind;
  url: string | null;
}

export interface Connect4AssetBundle {
  background: ResolvedMediaAsset;
  loadingScreen: ResolvedMediaAsset;
  kid: Record<KidMood, ResolvedMediaAsset>;
  discUser: ResolvedMediaAsset;
  discBot: ResolvedMediaAsset;
  boardOverlay: ResolvedMediaAsset;
}

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

export const assetPath = (relativePath: string) =>
  `${BASE_URL}${relativePath.replace(/^\/+/, '')}`;

const buildVideoImageCandidates = (baseName: string) => ({
  video: [
    assetPath(`assets/${baseName}.mp4`),
    assetPath(`assets/${baseName}.webm`),
  ],
  image: [
    assetPath(`assets/${baseName}.webp`),
    assetPath(`assets/${baseName}.png`),
    assetPath(`assets/${baseName}.jpg`),
  ],
});

export const CONNECT4_ASSET_CONFIG = {
  loadingScreen: {
    minDisplayMs: 2000, // Loading စာမျက်နှာ အနည်းဆုံး ၂ စက္ကန့် ပြမည်
    maxWaitMs: 8500,    // အင်တာနက် အရမ်းနှေးလျှင်လည်း 8.5s ပြည့်ပါက ဂိမ်းစပေးမည်
    ...buildVideoImageCandidates('c4-loading'),
  },
  background: {
    crossfadeSec: 1.2, // Video ဆုံးခါနီး Mix Transition ကြာချိန်
    ...buildVideoImageCandidates('c4-room-bg'),
  },
  kid: {
    idle: buildVideoImageCandidates('c4-kid-idle'),
    thinking: buildVideoImageCandidates('c4-kid-thinking'),
    dropping: buildVideoImageCandidates('c4-kid-dropping'),
    happy: buildVideoImageCandidates('c4-kid-happy'),
    crying: buildVideoImageCandidates('c4-kid-crying'),
  },
  extras: {
    discUser: [assetPath('assets/c4-disc-yellow.png'), assetPath('assets/c4-disc-yellow.webp')],
    discBot: [assetPath('assets/c4-disc-red.png'), assetPath('assets/c4-disc-red.webp')],
    boardOverlay: [assetPath('assets/c4-board-frame.png'), assetPath('assets/c4-board-frame.webp')],
  },
};

export const EMPTY_MEDIA: ResolvedMediaAsset = { kind: 'none', url: null };

export const EMPTY_ASSET_BUNDLE: Connect4AssetBundle = {
  background: EMPTY_MEDIA,
  loadingScreen: EMPTY_MEDIA,
  kid: {
    idle: EMPTY_MEDIA,
    thinking: EMPTY_MEDIA,
    dropping: EMPTY_MEDIA,
    happy: EMPTY_MEDIA,
    crying: EMPTY_MEDIA,
  },
  discUser: EMPTY_MEDIA,
  discBot: EMPTY_MEDIA,
  boardOverlay: EMPTY_MEDIA,
};

const probeCache = new Map<string, boolean>();

async function checkAssetExists(
  url: string,
  expectedMimePrefix: 'video/' | 'image/'
): Promise<boolean> {
  if (probeCache.has(url)) return probeCache.get(url)!;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const ok =
      res.ok &&
      (ct.startsWith(expectedMimePrefix) || ct === 'application/octet-stream');
    probeCache.set(url, ok);
    return ok;
  } catch {
    probeCache.set(url, false);
    return false;
  }
}

async function resolveCandidates(
  videoUrls: string[],
  imageUrls: string[]
): Promise<ResolvedMediaAsset> {
  for (const url of videoUrls) {
    if (await checkAssetExists(url, 'video/')) {
      return { kind: 'video', url };
    }
  }
  for (const url of imageUrls) {
    if (await checkAssetExists(url, 'image/')) {
      return { kind: 'image', url };
    }
  }
  return EMPTY_MEDIA;
}

function preloadSingleMedia(asset: ResolvedMediaAsset, timeoutMs = 4500): Promise<void> {
  if (asset.kind === 'none' || !asset.url) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve();
      }
    };
    const timer = window.setTimeout(done, timeoutMs);

    if (asset.kind === 'image') {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = asset.url!;
    } else if (asset.kind === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = done;
      video.oncanplay = done;
      video.onerror = done;
      video.src = asset.url!;
      video.load();
    } else {
      done();
    }
  });
}

/**
 * ဂိမ်းအဝင်တွင် Loading Media ကို အရင်ဆုံး ရှာပြီး
 * ကျန်သည့် နောက်ခံ + မောင်ဖိုးသား Mood ၅ မျိုး + အဝိုင်းပြား/ဘုတ် Asset များအားလုံးကို
 * တစ်ပြိုင်နက် Preload လုပ်ပေးမည်
 */
export async function resolveLoadingScreenMedia(): Promise<ResolvedMediaAsset> {
  return resolveCandidates(
    CONNECT4_ASSET_CONFIG.loadingScreen.video,
    CONNECT4_ASSET_CONFIG.loadingScreen.image
  );
}

export async function preloadAllConnect4Assets(
  onProgress?: (percent: number, stageText: string) => void
): Promise<Connect4AssetBundle> {
  onProgress?.(12, 'loadingScreen');

  const [
    loadingScreen,
    background,
    kidIdle,
    kidThinking,
    kidDropping,
    kidHappy,
    kidCrying,
    discUser,
    discBot,
    boardOverlay,
  ] = await Promise.all([
    resolveCandidates(
      CONNECT4_ASSET_CONFIG.loadingScreen.video,
      CONNECT4_ASSET_CONFIG.loadingScreen.image
    ),
    resolveCandidates(
      CONNECT4_ASSET_CONFIG.background.video,
      CONNECT4_ASSET_CONFIG.background.image
    ),
    resolveCandidates(CONNECT4_ASSET_CONFIG.kid.idle.video, CONNECT4_ASSET_CONFIG.kid.idle.image),
    resolveCandidates(
      CONNECT4_ASSET_CONFIG.kid.thinking.video,
      CONNECT4_ASSET_CONFIG.kid.thinking.image
    ),
    resolveCandidates(
      CONNECT4_ASSET_CONFIG.kid.dropping.video,
      CONNECT4_ASSET_CONFIG.kid.dropping.image
    ),
    resolveCandidates(CONNECT4_ASSET_CONFIG.kid.happy.video, CONNECT4_ASSET_CONFIG.kid.happy.image),
    resolveCandidates(
      CONNECT4_ASSET_CONFIG.kid.crying.video,
      CONNECT4_ASSET_CONFIG.kid.crying.image
    ),
    resolveCandidates([], CONNECT4_ASSET_CONFIG.extras.discUser),
    resolveCandidates([], CONNECT4_ASSET_CONFIG.extras.discBot),
    resolveCandidates([], CONNECT4_ASSET_CONFIG.extras.boardOverlay),
  ]);

  onProgress?.(45, 'preloading');

  const toPreload: ResolvedMediaAsset[] = [
    background,
    kidIdle,
    kidThinking,
    kidDropping,
    kidHappy,
    kidCrying,
    discUser,
    discBot,
    boardOverlay,
  ].filter((a) => a.kind !== 'none' && Boolean(a.url));

  if (toPreload.length > 0) {
    let completed = 0;
    await Promise.all(
      toPreload.map((asset) =>
        preloadSingleMedia(asset).then(() => {
          completed += 1;
          const pct = 45 + Math.round((completed / toPreload.length) * 50);
          onProgress?.(pct, 'preloading');
        })
      )
    );
  }

  onProgress?.(100, 'ready');

  return {
    loadingScreen,
    background,
    kid: {
      idle: kidIdle,
      thinking: kidThinking,
      dropping: kidDropping,
      happy: kidHappy,
      crying: kidCrying,
    },
    discUser,
    discBot,
    boardOverlay,
  };
}
