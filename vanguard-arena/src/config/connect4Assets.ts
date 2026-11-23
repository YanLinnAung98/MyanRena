export type MediaKind = 'video' | 'image' | 'none';

export interface ResolvedMediaAsset {
  kind: MediaKind;
  url: string | null;
}

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

export const assetPath = (relativePath: string) =>
  `${BASE_URL}${relativePath.replace(/^\/+/, '')}`;

/**
 * ဖိုင် Replace လုပ်ရုံဖြင့် Code ပြန်ပြင်စရာမလိုစေရန် Auto-Detect Priority List
 * - mode: 'auto' ထားထားလျှင် ရှိနေသည့် ဖိုင်ကို အလိုအလျောက် ရှာသုံးမည်
 * - Video ဖျက်ပြီး ပုံတင်လိုက်လျှင် ပုံအဖြစ် အလိုအလျောက် ပြောင်းမည်
 */
export const CONNECT4_ASSET_CONFIG = {
  background: {
    mode: 'auto' as 'auto' | 'video' | 'image',
    crossfadeSec: 1.2, // Video ဆုံးခါနီး Mix Transition ကြာချိန် (စက္ကန့်)
    videoCandidates: [
      assetPath('assets/c4-room-bg.mp4'),
      assetPath('assets/c4-room-bg.webm'),
    ],
    imageCandidates: [
      assetPath('assets/c4-room-bg.webp'),
      assetPath('assets/c4-room-bg.jpg'),
      assetPath('assets/c4-room-bg.png'),
    ],
  },
  loadingScreen: {
    mode: 'auto' as 'auto' | 'video' | 'image',
    minDisplayMs: 450, // Loading screen မြန်လွန်းပြီး မဖျပ်စေရန်
    maxWaitMs: 6000,   // အင်တာနက် အရမ်းနှေးနေလျှင်လည်း 6s ပြည့်ပါက ဂိမ်းထဲ ဝင်ပေးမည်
    videoCandidates: [
      assetPath('assets/c4-loading.mp4'),
      assetPath('assets/c4-loading.webm'),
    ],
    imageCandidates: [
      assetPath('assets/c4-loading.webp'),
      assetPath('assets/c4-loading.jpg'),
      assetPath('assets/c4-loading.png'),
    ],
  },
};

const probeCache = new Map<string, boolean>();

async function checkAssetExists(url: string, expectedMimePrefix: 'video/' | 'image/'): Promise<boolean> {
  if (probeCache.has(url)) return probeCache.get(url)!;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    // SPA fallback (index.html) ပြန်လာခြင်းကို ကာကွယ်ရန် content-type စစ်မည်
    const ok = res.ok && (ct.startsWith(expectedMimePrefix) || ct === 'application/octet-stream');
    probeCache.set(url, ok);
    return ok;
  } catch {
    probeCache.set(url, false);
    return false;
  }
}

export async function resolveMediaSlot(
  slot: 'background' | 'loadingScreen'
): Promise<ResolvedMediaAsset> {
  const cfg = CONNECT4_ASSET_CONFIG[slot];

  if (cfg.mode === 'auto' || cfg.mode === 'video') {
    for (const url of cfg.videoCandidates) {
      if (await checkAssetExists(url, 'video/')) {
        return { kind: 'video', url };
      }
    }
  }

  if (cfg.mode === 'auto' || cfg.mode === 'image') {
    for (const url of cfg.imageCandidates) {
      if (await checkAssetExists(url, 'image/')) {
        return { kind: 'image', url };
      }
    }
  }

  return { kind: 'none', url: null };
}
