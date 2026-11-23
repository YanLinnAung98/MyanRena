import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import {
  CONNECT4_ASSET_CONFIG,
  EMPTY_ASSET_BUNDLE,
  EMPTY_MEDIA,
  preloadAllConnect4Assets,
  resolveLoadingScreenMedia,
  type Connect4AssetBundle,
  type KidMood,
  type ResolvedMediaAsset,
} from '../config/connect4Assets.ts';
import type { Language } from '../types.ts';
import {
  Connect4LoadingScreen,
  PhoTharMediaCharacter,
  SeamlessMediaBackdrop,
} from './Connect4MediaKit.tsx';

export type { KidMood };

const toSvgUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

// Bot Profile တွင် သုံးမည့် မောင်ဖိုးသား Avatar
export const KID_BOT_AVATAR_DATA_URI = toSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="avBg" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0b1224"/>
    </radialGradient>
    <linearGradient id="hoodieG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="skinG" cx="45%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#ffe1c9"/>
      <stop offset="100%" stop-color="#eab38f"/>
    </radialGradient>
  </defs>
  <rect width="120" height="120" rx="24" fill="url(#avBg)"/>
  <circle cx="24" cy="24" r="1.5" fill="#93c5fd" opacity="0.8"/>
  <circle cx="96" cy="28" r="2" fill="#fde047" opacity="0.7"/>
  <circle cx="102" cy="54" r="1.2" fill="#38bdf8" opacity="0.8"/>
  <path d="M22 120 C24 90, 38 82, 60 82 C82 82, 96 90, 98 120 Z" fill="url(#hoodieG)" stroke="#94a3b8" stroke-width="1.5"/>
  <path d="M44 86 Q60 100 76 86" fill="none" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="30" cy="60" r="7.5" fill="#e8ae88"/>
  <circle cx="90" cy="60" r="7.5" fill="#e8ae88"/>
  <ellipse cx="60" cy="58" rx="28" ry="27" fill="url(#skinG)"/>
  <path d="M30 55 C28 28, 44 16, 62 16 C82 16, 92 30, 90 55 C84 42, 75 38, 68 41 C62 32, 48 33, 41 42 C36 39, 32 46, 30 55 Z" fill="#1e1b18"/>
  <path d="M40 46 Q48 42 54 45" stroke="#292524" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M66 45 Q72 42 80 46" stroke="#292524" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="58" rx="4.8" ry="5.2" fill="#ffffff"/>
  <ellipse cx="72" cy="58" rx="4.8" ry="5.2" fill="#ffffff"/>
  <circle cx="48.5" cy="58.5" r="3" fill="#2b1810"/>
  <circle cx="71.5" cy="58.5" r="3" fill="#2b1810"/>
  <circle cx="47.2" cy="57" r="1.2" fill="#ffffff"/>
  <circle cx="70.2" cy="57" r="1.2" fill="#ffffff"/>
  <ellipse cx="40" cy="66" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.35"/>
  <ellipse cx="80" cy="66" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.35"/>
  <path d="M51 71 Q60 79 69 71" stroke="#9f1239" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>
`);

export function getConnect4BotName(lang: Language, difficulty?: string): string {
  const base = lang === 'my' ? 'မောင်ဖိုးသား' : 'Mg Pho Thar';
  if (!difficulty) return base;
  return `${base} (${String(difficulty).toUpperCase()})`;
}

interface Connect4BoardProps {
  lang: Language;
  match: any;
  currentUserId: string;
  onDropColumn: (col: number) => void;
  onLeaveFinished: () => void;
}

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  lang,
  match,
  currentUserId,
  onDropColumn,
  onLeaveFinished,
}) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [assets, setAssets] = useState<Connect4AssetBundle>(EMPTY_ASSET_BUNDLE);
  const [loadingMedia, setLoadingMedia] = useState<ResolvedMediaAsset>(EMPTY_MEDIA);
  const [isLoadingScene, setIsLoadingScene] = useState(true);
  const [loadProgress, setLoadProgress] = useState(10);

  // ဖုန်းဖြင့် ကစားနေချိန်တွင် Page Scroll လုံးဝဆွဲမရအောင် Lock ချထားမည်
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // ဂိမ်းအဝင်တွင် အနည်းဆုံး ၂ စက္ကန့် Loading ပြပြီး Asset အားလုံး အဆင်သင့်ဖြစ်မှ စမည်
  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();
    let finished = false;

    const finishLoading = () => {
      if (!mounted || finished) return;
      finished = true;
      const elapsed = Date.now() - startedAt;
      const remainingMinMs = Math.max(
        0,
        CONNECT4_ASSET_CONFIG.loadingScreen.minDisplayMs - elapsed
      );
      setLoadProgress(100);
      window.setTimeout(() => {
        if (mounted) setIsLoadingScene(false);
      }, remainingMinMs);
    };

    resolveLoadingScreenMedia().then((m) => {
      if (mounted) setLoadingMedia(m);
    });

    const safetyTimer = window.setTimeout(
      finishLoading,
      CONNECT4_ASSET_CONFIG.loadingScreen.maxWaitMs
    );

    preloadAllConnect4Assets((pct) => {
      if (mounted) setLoadProgress((prev) => Math.max(prev, pct));
    }).then((bundle) => {
      if (!mounted) return;
      setAssets(bundle);
      if (bundle.loadingScreen.kind !== 'none') {
        setLoadingMedia(bundle.loadingScreen);
      }
      finishLoading();
    });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
    };
  }, []);

  const hasCustomRoomBackdrop =
    assets.background.kind === 'video' || assets.background.kind === 'image';
  const hasCustomBoardFrame =
    assets.boardOverlay.kind === 'image' && Boolean(assets.boardOverlay.url);

  const grid: Array<Array<string | null>> =
    match.c4Board || Array.from({ length: 6 }, () => Array(7).fill(null));
  const winningCells: Array<[number, number]> = match.winningCells || [];
  const isFinished = match.status === 'finished';
  const isDraw = Boolean(match.isDraw);
  const userWon = isFinished && !isDraw && match.winnerId === currentUserId;
  const botWon = isFinished && !isDraw && match.winnerId !== currentUserId;

  const kidMood: KidMood = userWon
    ? 'crying'
    : botWon
    ? 'happy'
    : (match.botPhase as KidMood) || 'idle';

  const botTargetCol: number | null =
    typeof match.botTargetCol === 'number' ? match.botTargetCol : null;

  const isUserTurn =
    !isLoadingScene &&
    !isFinished &&
    kidMood === 'idle' &&
    (!match.isRealtimePvp || match.turnUserId === currentUserId);

  const isWinningCell = (r: number, c: number) =>
    winningCells.some(([wr, wc]) => wr === r && wc === c);

  const statusText = () => {
    if (userWon) {
      return lang === 'my'
        ? '🎉 သင် အနိုင်ရရှိပါသည်!'
        : '🎉 You Win! Mg Pho Thar is crying!';
    }
    if (botWon) {
      return lang === 'my'
        ? '😄 မောင်ဖိုးသား အနိုင်ရရှိသွားပါပြီ!'
        : '😄 Mg Pho Thar Wins & Celebrates!';
    }
    if (isDraw) {
      return lang === 'my' ? '🤝 သရေကျသွားပါပြီ!' : '🤝 It is a Draw!';
    }
    if (kidMood === 'thinking') {
      return lang === 'my'
        ? '🤔 မောင်ဖိုးသား ခဏစဥ်းစားနေပါသည်...'
        : '🤔 Mg Pho Thar is thinking...';
    }
    if (kidMood === 'dropping') {
      return lang === 'my'
        ? '🔴 မောင်ဖိုးသား အနီဝိုင်းပြား ချနေပါသည်...'
        : '🔴 Mg Pho Thar is dropping a red disc...';
    }
    return lang === 'my'
      ? 'သင့်အလှည့် - ကော်လံတစ်ခု နှိပ်ပါ'
      : 'Your Turn - Click a column';
  };

  return (
    <div className="relative w-full h-full max-w-3xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden touch-none overscroll-none border border-amber-300/25 shadow-[0_24px_60px_rgba(0,0,0,0.7)] flex flex-col items-center justify-end pt-1.5 pb-1.5 sm:pb-3 px-2 select-none bg-[#0a1022]">
      {/* 0. Game Entry Loading Screen */}
      <AnimatePresence>
        {isLoadingScene && (
          <Connect4LoadingScreen
            lang={lang}
            progress={loadProgress}
            media={loadingMedia}
          />
        )}
      </AnimatePresence>

      {/* 1. Seamless Video / Image Room Backdrop */}
      <SeamlessMediaBackdrop
        media={assets.background}
        onFallback={() =>
          setAssets((prev) => ({ ...prev, background: EMPTY_MEDIA }))
        }
      />

      {/* 2. Compact Speech-Bubble Status Pill */}
      <div className="relative z-30 flex flex-col items-center shrink-0 mb-0.5">
        <motion.div
          key={statusText()}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`relative px-4 py-1 sm:py-1.5 rounded-2xl border text-[11px] sm:text-sm font-bold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md ${
            userWon
              ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-200'
              : botWon
              ? 'bg-rose-950/85 border-rose-400/60 text-rose-200'
              : kidMood === 'thinking' || kidMood === 'dropping'
              ? 'bg-slate-900/90 border-amber-400/65 text-amber-200'
              : 'bg-[#161c33]/90 border-amber-300/55 text-amber-100'
          }`}
        >
          {statusText()}
          <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#161c33] border-r border-b border-amber-300/55" />
        </motion.div>
      </div>

      {/* 3. No-Scroll Responsive Stage: မောင်ဖိုးသား + 4-Row Board */}
      <div className="relative z-20 w-full flex-1 min-h-0 flex flex-col items-center justify-end overflow-hidden">
        {/* Kid Character Peeking Directly Behind Board */}
        <div className="relative z-10 -mb-10 sm:-mb-11 w-full flex justify-center pointer-events-none shrink-0 scale-[0.78] sm:scale-95 origin-bottom">
          <PhoTharMediaCharacter
            mood={kidMood}
            targetCol={botTargetCol}
            kidMedia={assets.kid}
          />
        </div>

        {/* Custom PNG 3D Board Frame Mode (Bright Vivid Discs Inside Gold Rings) */}
        {hasCustomBoardFrame ? (
          <div
            className="relative z-20 flex flex-col items-center shrink-0"
            style={{
              width: 'min(95vw, 500px, calc(48dvh * 1.33))',
            }}
          >
            {/* Hover Preview Row Aligned to the Exact 7 Columns */}
            <div className="w-full px-[15.3%] h-5 sm:h-6 grid grid-cols-7 mb-0.5">
              {Array.from({ length: 7 }).map((_, c) => {
                const showUserDisc = isUserTurn && hoverCol === c && grid[0][c] === null;
                return (
                  <div key={c} className="flex items-center justify-center">
                    <AnimatePresence>
                      {showUserDisc && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.75 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex items-center justify-center"
                        >
                          {assets.discUser.kind === 'image' && assets.discUser.url ? (
                            <img
                              src={assets.discUser.url}
                              alt="Yellow Disc"
                              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(253,224,71,0.95)]"
                            />
                          ) : (
                            <div
                              className="w-full h-full rounded-full border-2 border-yellow-100"
                              style={{
                                background:
                                  'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 45%, #ea580c 100%)',
                                boxShadow: '0 0 14px rgba(250,204,21,0.95)',
                              }}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Natural-Aspect Board Container */}
            <div className="relative w-full">
              {/* Dark Recessed Backing Behind the 7x6 Holes */}
              <div
                className="pointer-events-none absolute z-0 rounded-lg bg-[#050814] shadow-inner"
                style={{
                  top: '8%',
                  bottom: '24%',
                  left: '14.8%',
                  right: '14.8%',
                }}
              />

              {/* 3D PNG Board Frame (z-20) */}
              <img
                src={assets.boardOverlay.url!}
                alt="3D Connect 4 Board"
                className="pointer-events-none relative z-20 block w-full h-auto drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)]"
              />

              {/* Playable 7x6 Grid (z-30 ON TOP so discs are 100% Bright & Never Dimmed, Sized to Fit Inside Gold Rings) */}
              <div
                className="absolute z-30 grid grid-cols-7 overflow-hidden"
                style={{
                  top: '8.4%',
                  bottom: '24.6%',
                  left: '15.3%',
                  right: '15.3%',
                }}
              >
                {Array.from({ length: 7 }).map((_, colIdx) => {
                  const colFull = grid[0][colIdx] !== null;
                  const canClick = isUserTurn && !colFull;
                  return (
                    <button
                      key={colIdx}
                      type="button"
                      disabled={!canClick}
                      onMouseEnter={() => setHoverCol(colIdx)}
                      onMouseLeave={() => setHoverCol(null)}
                      onClick={() => canClick && onDropColumn(colIdx)}
                      className={`h-full min-h-0 grid grid-rows-6 rounded-md transition-colors ${
                        canClick ? 'cursor-pointer hover:bg-amber-300/12' : 'cursor-default'
                      } ${botTargetCol === colIdx ? 'bg-rose-400/15' : ''}`}
                      aria-label={`Column ${colIdx + 1}`}
                    >
                      {Array.from({ length: 6 }).map((__, rowIdx) => {
                        const cell = grid[rowIdx][colIdx];
                        const winning = isWinningCell(rowIdx, colIdx);
                        const customDiscUrl =
                          cell === 'P1'
                            ? assets.discUser.url
                            : cell === 'P2'
                            ? assets.discBot.url
                            : null;

                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className="relative w-full h-full min-h-0 min-w-0"
                          >
                            {cell && (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <motion.div
                                  key={`${rowIdx}-${colIdx}-${cell}`}
                                  initial={{ y: -(rowIdx + 2) * 42, opacity: 1 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 330,
                                    damping: 21,
                                    mass: 0.85,
                                  }}
                                  style={
                                    customDiscUrl
                                      ? undefined
                                      : cell === 'P1'
                                      ? {
                                          background:
                                            'radial-gradient(circle at 32% 28%, #fef9c3 0%, #fde047 38%, #f59e0b 78%, #b45309 100%)',
                                          boxShadow:
                                            '0 0 12px rgba(250, 204, 21, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.85)',
                                        }
                                      : {
                                          background:
                                            'radial-gradient(circle at 32% 28%, #ffe4e6 0%, #ff2e55 40%, #e11d48 78%, #881337 100%)',
                                          boxShadow:
                                            '0 0 12px rgba(255, 46, 85, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.75)',
                                        }
                                  }
                                  className={`h-[78%] aspect-square rounded-full flex items-center justify-center ${
                                    customDiscUrl
                                      ? ''
                                      : cell === 'P1'
                                      ? 'border border-yellow-100/95'
                                      : 'border border-rose-200/95'
                                  } ${winning ? 'ring-4 ring-white animate-pulse scale-105' : ''}`}
                                >
                                  {customDiscUrl ? (
                                    <img
                                      src={customDiscUrl}
                                      alt={cell === 'P1' ? 'Yellow Disc' : 'Red Disc'}
                                      className="w-full h-full object-contain brightness-110 saturate-125"
                                    />
                                  ) : (
                                    <span
                                      className={`w-[58%] h-[58%] rounded-full border ${
                                        cell === 'P1'
                                          ? 'border-yellow-50/75 bg-yellow-200/35'
                                          : 'border-rose-100/75 bg-rose-300/30'
                                      }`}
                                    />
                                  )}
                                </motion.div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Natural Table Contact Shadow */}
            <div className="pointer-events-none relative z-10 -mt-2 w-[88%] h-3.5 rounded-full bg-black/70 blur-md" />
          </div>
        ) : (
          /* Fallback CSS 3D Board */
          <div className="relative z-20 flex flex-col items-center shrink-0">
            <div className="w-[310px] sm:w-[374px] h-5 sm:h-6 grid grid-cols-7 px-3 mb-0.5">
              {Array.from({ length: 7 }).map((_, c) => {
                const showUserDisc = isUserTurn && hoverCol === c && grid[0][c] === null;
                return (
                  <div key={c} className="flex items-center justify-center">
                    <AnimatePresence>
                      {showUserDisc && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.75 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border-2 border-yellow-100/90 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="flex items-end justify-center">
              <div className="relative w-3 sm:w-3.5 h-[210px] sm:h-[256px] -mr-1.5 rounded-t-md rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-sky-300/40 shadow-[0_12px_20px_rgba(0,0,0,0.75)] flex flex-col items-center justify-between py-2">
                <span className="w-1 h-16 rounded-full bg-sky-200 shadow-[0_0_10px_#7dd3fc]" />
                <span className="w-1 h-10 rounded-full bg-amber-200/90 shadow-[0_0_8px_#fde68a]" />
              </div>

              <div className="relative p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-[#1e2946] via-[#151e36] to-[#0f172a] border-[3px] border-amber-300/75 shadow-[0_18px_36px_rgba(0,0,0,0.8),inset_0_1px_8px_rgba(254,240,138,0.25)] mb-3">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: 7 }).map((_, colIdx) => {
                    const colFull = grid[0][colIdx] !== null;
                    const canClick = isUserTurn && !colFull;
                    return (
                      <button
                        key={colIdx}
                        type="button"
                        disabled={!canClick}
                        onMouseEnter={() => setHoverCol(colIdx)}
                        onMouseLeave={() => setHoverCol(null)}
                        onClick={() => canClick && onDropColumn(colIdx)}
                        className={`flex flex-col gap-1.5 sm:gap-2 rounded-xl p-0.5 transition-colors ${
                          canClick ? 'cursor-pointer hover:bg-amber-300/12' : 'cursor-default'
                        } ${botTargetCol === colIdx ? 'bg-rose-400/20' : ''}`}
                        aria-label={`Column ${colIdx + 1}`}
                      >
                        {Array.from({ length: 6 }).map((__, rowIdx) => {
                          const cell = grid[rowIdx][colIdx];
                          const winning = isWinningCell(rowIdx, colIdx);
                          return (
                            <div
                              key={`${rowIdx}-${colIdx}`}
                              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#090e1c]/90 shadow-[inset_0_3px_7px_rgba(0,0,0,0.92)] border-[1.5px] border-amber-300/45 flex items-center justify-center"
                            >
                              {cell && (
                                <motion.div
                                  key={`${rowIdx}-${colIdx}-${cell}`}
                                  initial={{ y: -(rowIdx + 2) * 44, opacity: 1 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 330,
                                    damping: 21,
                                    mass: 0.85,
                                  }}
                                  className={`w-[88%] h-[88%] rounded-full border-2 flex items-center justify-center ${
                                    cell === 'P1'
                                      ? 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border-yellow-100/85 shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                                      : 'bg-gradient-to-br from-rose-300 via-red-500 to-rose-700 border-rose-200/85 shadow-[0_0_12px_rgba(244,63,94,0.85)]'
                                  } ${winning ? 'ring-4 ring-white animate-pulse scale-105' : ''}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative w-3 sm:w-3.5 h-[210px] sm:h-[256px] -ml-1.5 rounded-t-md rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-sky-300/40 shadow-[0_12px_20px_rgba(0,0,0,0.75)] flex flex-col items-center justify-between py-2">
                <span className="w-1 h-16 rounded-full bg-sky-200 shadow-[0_0_10px_#7dd3fc]" />
                <span className="w-1 h-10 rounded-full bg-amber-200/90 shadow-[0_0_8px_#fde68a]" />
              </div>
            </div>

            <div className="pointer-events-none relative z-10 -mt-2 w-[310px] sm:w-[375px] h-4 rounded-full bg-black/65 blur-md" />
          </div>
        )}

        {!hasCustomRoomBackdrop && (
          <div className="relative z-0 -mt-5 w-[130%] flex flex-col items-center pointer-events-none shrink-0">
            <div
              className="w-full h-14 sm:h-16 rounded-t-3xl bg-gradient-to-b from-[#3b4b75] via-[#263252] to-[#161e36] border-t-2 border-sky-200/30 shadow-[0_-6px_30px_rgba(15,23,42,0.8)]"
              style={{ transform: 'perspective(380px) rotateX(42deg)' }}
            />
          </div>
        )}
      </div>

      {/* 4. Match Finished Action Bar */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-3 bottom-3 z-40 rounded-2xl bg-[#0d1426]/95 backdrop-blur-md border border-amber-400/55 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  userWon
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : botWon
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {userWon ? <Trophy className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  {userWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သင်နိုင်ပါသည်!'
                      : 'Match Over — Victory!'
                    : botWon
                    ? lang === 'my'
                      ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — မောင်ဖိုးသား နိုင်ပါသည်'
                      : 'Match Over — Mg Pho Thar Wins'
                    : lang === 'my'
                    ? 'ကစားပွဲ ပြီးဆုံးပါပြီ — သရေ'
                    : 'Match Over — Draw'}
                </div>
                <div className="text-[11px] text-amber-300 font-mono font-semibold">
                  {isDraw ? '+25 XP' : userWon ? '+75 XP' : '-20 XP'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLeaveFinished}
              className="px-4 h-9 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ပြန်ထွက်မည်' : 'Lobby'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
