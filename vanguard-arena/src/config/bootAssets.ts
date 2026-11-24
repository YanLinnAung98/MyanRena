import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';

export type BootMediaKind = 'video' | 'image' | 'none';

export interface BootMediaAsset {
  kind: BootMediaKind;
  url: string | null;
}

export interface BootUpdateManifest {
  appVersion: string;
  dataVersion: string;
  downloadUrls: string[];
}

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const DATA_VERSION_KEY = 'vanguard_cached_data_version_v1';
const CACHE_NAME = 'vanguard-ingame-data-v1';

export const bootAssetPath = (relativePath: string) =>
  `${BASE_URL}${relativePath.replace(/^\/+/, '')}`;

export const BOOT_CONFIG = {
  studioImageDurationMs: 2500, // Studio ပုံဖြစ်လျှင် ၂.၅ စက္ကန့် ပြမည်
  studioMaxVideoMs: 8000,      // Studio Video အများဆုံး ၈ စက္ကန့် (သို့) ဆုံးသည်အထိ
  loadingMinDisplayMs: 3000,   // Download စရာမရှိလျှင် အနည်းဆုံး ၃ စက္ကန့် ပြမည်
  defaultAppVersion: '1.0.0',
  studioCandidates: {
    video: [bootAssetPath('assets/boot-studio.mp4'), bootAssetPath('assets/boot-studio.webm')],
    image: [
      bootAssetPath('assets/boot-studio.webp'),
      bootAssetPath('assets/boot-studio.png'),
      bootAssetPath('assets/boot-studio.jpg'),
    ],
  },
  loadingCandidates: {
    video: [bootAssetPath('assets/boot-loading.mp4'), bootAssetPath('assets/boot-loading.webm')],
    image: [
      bootAssetPath('assets/boot-loading.webp'),
      bootAssetPath('assets/boot-loading.png'),
      bootAssetPath('assets/boot-loading.jpg'),
    ],
  },
  corePreloadUrls: [
    bootAssetPath('assets/c4-loading.jpg'),
    bootAssetPath('assets/c4-room-bg.jpg'),
  ],
};

async function probeAsset(url: string, mimePrefix: 'video/' | 'image/'): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return res.ok && (ct.startsWith(mimePrefix) || ct === 'application/octet-stream');
  } catch {
    return false;
  }
}

export async function resolveBootMedia(
  candidates: { video: string[]; image: string[] }
): Promise<BootMediaAsset> {
  for (const url of candidates.video) {
    if (await probeAsset(url, 'video/')) return { kind: 'video', url };
  }
  for (const url of candidates.image) {
    if (await probeAsset(url, 'image/')) return { kind: 'image', url };
  }
  return { kind: 'none', url: null };
}

/**
 * Firebase system/config မှ In-Game Data Version နှင့် Download လုပ်ရမည့် ဖိုင်စာရင်းကို စစ်ဆေးမည်
 */
export async function fetchServerDataManifest(): Promise<BootUpdateManifest> {
  const fallback: BootUpdateManifest = {
    appVersion: BOOT_CONFIG.defaultAppVersion,
    dataVersion: '1.0.0',
    downloadUrls: [],
  };

  if (!isFirebaseConfigured || !db) return fallback;

  try {
    const snap = await getDoc(doc(db, 'system', 'config'));
    if (!snap.exists()) return fallback;
    const data = snap.data() as any;
    return {
      appVersion: String(data.appVersion || BOOT_CONFIG.defaultAppVersion),
      dataVersion: String(data.dataVersion || '1.0.0'),
      downloadUrls: Array.isArray(data.resourceUrls) ? data.resourceUrls : [],
    };
  } catch {
    return fallback;
  }
}

export function getCachedDataVersion(): string | null {
  try {
    return localStorage.getItem(DATA_VERSION_KEY);
  } catch {
    return null;
  }
}

export function saveCachedDataVersion(version: string) {
  try {
    localStorage.setItem(DATA_VERSION_KEY, version);
  } catch {}
}

/**
 * လိုအပ်သော In-Game Resource များကို Cache API ထဲသို့ ဒေါင်းလုဒ်ဆွဲသိမ်းဆည်းမည်
 */
export async function downloadInGameResources(
  urls: string[],
  onProgress: (loadedBytes: number, totalFilesDone: number, totalFiles: number) => void
): Promise<void> {
  if (urls.length === 0) return;

  let loadedBytes = 0;
  let doneCount = 0;
  let cache: Cache | null = null;

  try {
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
    }
  } catch {}

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) {
        const clone = res.clone();
        const blob = await res.blob();
        loadedBytes += blob.size;
        if (cache) await cache.put(url, clone).catch(() => {});
      }
    } catch {
      // ဖိုင်တစ်ခု ချိတ်ဆက်မရလျှင်လည်း ဂိမ်းဝင်မရဖြစ်မသွားအောင် ကျော်သွားမည်
    } finally {
      doneCount += 1;
      onProgress(loadedBytes, doneCount, urls.length);
    }
  }
}
