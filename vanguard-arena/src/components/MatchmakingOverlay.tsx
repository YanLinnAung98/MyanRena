import React from 'react';
import { motion } from 'motion/react';
import { Bot, Radar, ShieldCheck, Sparkles, Swords, Users, X } from 'lucide-react';
import { GAME_REGISTRY } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { Language, QueueStatus } from '../types.ts';

interface MatchmakingOverlayProps {
  lang: Language;
  queueStatus: QueueStatus;
  sakarCount: number;
  onCancel: () => void;
  onStartSakarNow: () => void;
}

export const MatchmakingOverlay: React.FC<MatchmakingOverlayProps> = ({
  lang,
  queueStatus,
  sakarCount,
  onCancel,
  onStartSakarNow,
}) => {
  const t = TRANSLATIONS[lang];
  const plugin = GAME_REGISTRY[queueStatus.gameType];
  const gameTitle = lang === 'my' ? plugin.nameMy : plugin.name;

  const maxSec = Math.max(1, queueStatus.maxSearchSeconds);
  const elapsed = Math.min(maxSec, Math.max(0, queueStatus.elapsedSec));
  const progressPct = Math.min(100, Math.round((elapsed / maxSec) * 100));
  const botCountdown = Math.max(0, queueStatus.botFillDelaySeconds - elapsed);
  const liveSakarCount = Math.max(1, sakarCount || queueStatus.count);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.lobby.searchingOpponent}
      className="fixed inset-0 z-50 bg-[#05080F]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 safe-bottom-bar overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#151D2F] via-[#101624] to-[#0B0F1A] border border-amber-400/35 p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.75)] space-y-5 relative overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl"
        />

        {/* Header Row */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              <Radar className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>{t.lobby.searchingOpponent}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white mt-1 truncate">
              {gameTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.lobby.matchingNearTier}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.lobby.cancelSearch}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated SVG Matchmaking Radar */}
        <div className="relative flex items-center justify-center py-2">
          <div className="relative w-44 h-44 sm:w-48 sm:h-48">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_24px_rgba(245,158,11,0.22)]">
              <defs>
                <radialGradient id="radarBgGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#0F172A" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#090D16" stopOpacity="1" />
                </radialGradient>
                <linearGradient id="radarSweepGrad" x1="50%" y1="50%" x2="100%" y2="20%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.48" />
                </linearGradient>
              </defs>

              <circle cx="100" cy="100" r="94" fill="url(#radarBgGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
              <circle cx="100" cy="100" r="22" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />

              {/* Crosshairs */}
              <line x1="6" y1="100" x2="194" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1="100" y1="6" x2="100" y2="194" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              {/* Rotating Sweep Sector */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '100px 100px' }}
              >
                <path d="M100 100 L100 8 A92 92 0 0 1 178 52 Z" fill="url(#radarSweepGrad)" />
                <line x1="100" y1="100" x2="100" y2="8" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
              </motion.g>

              {/* Pulsing Rival Blip Signals */}
              <motion.circle
                cx="148"
                cy="64"
                r="4"
                fill="#38BDF8"
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.35, 0.8] }}
                transition={{ duration: 1.9, repeat: Infinity }}
              />
              <motion.circle
                cx="62"
                cy="132"
                r="3.5"
                fill="#34D399"
                animate={{ opacity: [0.2, 0.95, 0.2], scale: [0.85, 1.3, 0.85] }}
                transition={{ duration: 2.3, delay: 0.7, repeat: Infinity }}
              />

              {/* Center Beacon */}
              <motion.circle
                cx="100"
                cy="100"
                r="14"
                fill="rgba(245,158,11,0.22)"
                animate={{ scale: [1, 1.55, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ transformOrigin: '100px 100px' }}
              />
              <circle cx="100" cy="100" r="8" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="2" />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-1">
              <div className="px-2.5 py-0.5 rounded-full bg-[#0A0D14]/90 border border-amber-400/40 text-[11px] font-mono font-bold text-amber-300 tabular-nums shadow">
                {elapsed}s / {maxSec}s
              </div>
            </div>
          </div>
        </div>

        {/* Authoritative Countdown Progress & Metrics */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {t.lobby.radarElapsed}:{' '}
              <span className="font-mono font-semibold text-white tabular-nums">{elapsed}s</span>
            </span>
            <span className="text-slate-400">
              {t.lobby.radarMaxLimit}:{' '}
              <span className="font-mono font-semibold text-amber-300 tabular-nums">{maxSec}s</span>
            </span>
          </div>

          <div className="h-2 rounded-full bg-[#0A0D14] border border-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>

          {/* Bot Backfill vs Real-Players-Only Live Indicator */}
          <div className="p-3 rounded-2xl bg-[#0A0D14]/90 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {queueStatus.autoBotFill ? (
                <Bot className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs text-slate-200 leading-relaxed">
                {queueStatus.autoBotFill ? (
                  botCountdown > 0 ? (
                    <>
                      {t.lobby.botBackfillIn}:{' '}
                      <span className="font-mono font-bold text-sky-300 tabular-nums">{botCountdown}s</span>
                    </>
                  ) : (
                    <span className="text-amber-300 font-semibold">
                      {lang === 'my' ? 'ပြိုင်ပွဲစတင်နေပါသည်...' : 'Deploying AI rival & starting match...'}
                    </span>
                  )
                ) : (
                  t.lobby.realPlayersOnly
                )}
              </span>
            </div>

            {queueStatus.gameType === 'sakar_htar' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 text-[11px] font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                <Users className="w-3 h-3" />
                {liveSakarCount}/6
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons (>= 48px touch-first) */}
        <div className="space-y-2.5 pt-1">
          {queueStatus.gameType === 'sakar_htar' && liveSakarCount >= 1 && (
            <button
              type="button"
              onClick={onStartSakarNow}
              className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {t.sakar.startNowBtn} ({liveSakarCount}/6)
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-500/40 text-sm font-semibold text-white hover:text-rose-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Swords className="w-4 h-4 opacity-70" />
            <span>{t.lobby.cancelSearch}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
