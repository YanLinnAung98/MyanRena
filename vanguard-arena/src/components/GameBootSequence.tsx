import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudDownload, ShieldCheck } from 'lucide-react';
import {
  BOOT_CONFIG,
  bootAssetPath,
  downloadInGameResources,
  fetchServerDataManifest,
  getCachedDataVersion,
  resolveBootMedia,
  saveCachedDataVersion,
  type BootMediaAsset,
} from '../config/bootAssets.ts';
import type { Language } from '../types.ts';

interface GameBootSequenceProps {
  lang: Language;
  onComplete: () => void;
}

type BootPhase = 'loading' | 'done';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const GameBootSequence: React.FC<GameBootSequenceProps> = ({ lang, onComplete }) => {
  const [phase, setPhase] = useState<BootPhase>('loading');
  const [loadingMedia, setLoadingMedia] = useState<BootMediaAsset>({ kind: 'none', url: null });

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(
    lang === 'my' ? 'ဆာဗာနှင့် ချိတ်ဆက်စစ်ဆေးနေသည်...' : 'Connecting to MyanRena...'
  );
  const [versionInfo, setVersionInfo] = useState(`v${BOOT_CONFIG.defaultAppVersion}`);
  const [downloadBadge, setDownloadBadge] = useState<string | null>(null);

  const completedRef = useRef(false);

  // Resolve the loading artwork only; the redundant Vanguard Studio intro is removed.
  useEffect(() => {
    let active = true;
    resolveBootMedia(BOOT_CONFIG.loadingCandidates).then((loading) => {
      if (active) setLoadingMedia(loading);
    });
    return () => { active = false; };
  }, []);

  // 3. Stage 2: Game Loading & In-Game Data Check / Download (အနည်းဆုံး ၃ စက္ကန့်)
  useEffect(() => {
    if (phase !== 'loading') return;

    let cancelled = false;
    const startedAt = Date.now();

    const finishBoot = () => {
      if (cancelled || completedRef.current) return;
      completedRef.current = true;
      setPhase('done');
      window.setTimeout(() => {
        onComplete();
      }, 380);
    };

    const runLoadingPipeline = async () => {
      setProgress(15);
      setStatusText(
        lang === 'my' ? 'ဂိမ်းဒေတာအသစ်များ စစ်ဆေးနေသည်...' : 'Checking for in-game updates...'
      );

      const manifest = await fetchServerDataManifest();
      if (cancelled) return;

      setVersionInfo(`v${manifest.appVersion} · Data ${manifest.dataVersion}`);
      const cachedVersion = getCachedDataVersion();
      const needsDownload =
        cachedVersion !== manifest.dataVersion || manifest.downloadUrls.length > 0;

      const urlsToFetch = Array.from(
        new Set([
          ...manifest.downloadUrls,
          ...(cachedVersion !== manifest.dataVersion ? BOOT_CONFIG.corePreloadUrls : []),
        ])
      );

      if (needsDownload && urlsToFetch.length > 0 && cachedVersion !== manifest.dataVersion) {
        setProgress(35);
        setStatusText(
          lang === 'my' ? 'ဂိမ်းအရင်းအမြစ်များ ဒေါင်းလုဒ်ဆွဲနေသည်...' : 'Downloading in-game resources...'
        );

        await downloadInGameResources(urlsToFetch, (bytes, done, total) => {
          if (cancelled) return;
          const pct = 35 + Math.round((done / Math.max(1, total)) * 55);
          setProgress(pct);
          setDownloadBadge(`${done}/${total} · ${formatBytes(bytes)}`);
        });

        saveCachedDataVersion(manifest.dataVersion);
      } else {
        // Download လုပ်စရာမရှိပါက ၃ စက္ကန့်အတွင်း Smooth Progress Animation ဖြင့် ပြမည်
        setStatusText(
          lang === 'my'
            ? 'ဒေတာများ နောက်ဆုံးဗားရှင်းဖြစ်နေပါပြီ — ဂိမ်းပြင်ဆင်နေသည်...'
            : 'Resources up to date — Loading Arena...'
        );
      }

      // အနည်းဆုံး ၃ စက္ကန့် ပြည့်အောင် Smooth ဖြည့်ပေးမည်
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, BOOT_CONFIG.loadingMinDisplayMs - elapsed);

      if (remaining > 0) {
        const steps = 15;
        const stepTime = remaining / steps;
        for (let i = 1; i <= steps; i++) {
          await new Promise((r) => window.setTimeout(r, stepTime));
          if (cancelled) return;
          setProgress((prev) => Math.min(98, Math.max(prev, Math.round(25 + (i / steps) * 73))));
        }
      }

      if (cancelled) return;
      setProgress(100);
      setStatusText(
        lang === 'my' ? 'အဆင်သင့်ဖြစ်ပါပြီ — ဂိမ်းထဲသို့ ဝင်ရောက်နေသည်...' : 'Ready! Entering MyanRena...'
      );
      window.setTimeout(finishBoot, 320);
    };

    runLoadingPipeline();

    return () => {
      cancelled = true;
    };
  }, [phase, lang, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="game-boot-root"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] bg-[#050811] text-white overflow-hidden select-none"
        >
          <AnimatePresence mode="wait">
            {/* STAGE 2: GAME LOADING & IN-GAME DATA DOWNLOAD */}
            {phase === 'loading' && (
              <motion.div
                key="boot-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="relative w-full h-full flex flex-col justify-between bg-[#070b14]"
              >
                {/* Background Image or Video */}
                <div className="absolute inset-0 z-0">
                  {loadingMedia.kind === 'video' && loadingMedia.url ? (
                    <video
                      src={loadingMedia.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : loadingMedia.kind === 'image' && loadingMedia.url ? (
                    <picture className="block w-full h-full">
                      <source
                        media="(max-width: 767px), (orientation: portrait)"
                        srcSet={bootAssetPath('assets/boot-loading-mobile.svg')}
                      />
                      <motion.img
                        src={loadingMedia.url}
                        alt="MyanRena Arena Loading"
                        initial={{ scale: 1.04 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 3.5, ease: 'easeOut' }}
                        className="w-full h-full object-cover"
                      />
                    </picture>
                  ) : (
                    <div className="w-full h-full bg-[radial-gradient(circle_at_50%_30%,#1e293b_0%,#070b14_75%)]" />
                  )}
                  {/* အောက်ဘက် Loading Bar ထင်ရှားစေရန် Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/35 to-black/30" />
                </div>

                {/* Top Version Badge */}
                <div className="relative z-10 flex items-center justify-between px-5 pt-6 text-[11px] font-mono text-slate-300/90">
                  <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm">
                    {versionInfo}
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-emerald-500/30 text-emerald-300 backdrop-blur-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>MyanRena Network</span>
                  </span>
                </div>

                {/* Bottom MLBB-Style Loading Bar */}
                <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-200 font-medium truncate pr-2">
                      {downloadBadge && <CloudDownload className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />}
                      <span className="truncate">{statusText}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 shrink-0">{progress}%</span>
                  </div>

                  {/* Progress Track */}
                  <div className="relative h-2.5 w-full rounded-full bg-white/10 border border-amber-400/25 overflow-hidden backdrop-blur-sm">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_16px_rgba(251,191,36,0.8)]"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {lang === 'my'
                        ? 'အကြံပြုချက် — Wi-Fi သို့မဟုတ် 4G ဖြင့် ကစားပါက ပိုမိုမြန်ဆန်ပါသည်။'
                        : 'Tip: Play on stable Wi-Fi or 4G for zero-lag PvP matches.'}
                    </span>
                    {downloadBadge && <span className="font-mono text-amber-300/90">{downloadBadge}</span>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
