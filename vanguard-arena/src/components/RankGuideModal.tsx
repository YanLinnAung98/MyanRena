import React from 'react';
import { motion } from 'motion/react';
import { Award, ShieldCheck, Trophy, X } from 'lucide-react';
import { RANK_TIERS, getRankInfo } from '../utils/rank.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { Language } from '../types.ts';

interface RankGuideModalProps {
  open: boolean;
  lang: Language;
  userRp: number;
  onClose: () => void;
}

export const RankGuideModal: React.FC<RankGuideModalProps> = ({ open, lang, userRp, onClose }) => {
  const t = TRANSLATIONS[lang];
  if (!open) return null;

  const currentRank = getRankInfo(userRp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#101423] border border-white/15 shadow-2xl p-6 ${
          lang === 'my' ? 'leading-relaxed' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span>{t.rankGuide.yourRpLabel}: {userRp.toLocaleString()} RP ({currentRank.tier})</span>
            </div>
            <h3 className="text-xl font-bold text-white">{t.rankGuide.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{t.rankGuide.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-Tier Table */}
        <div className="mt-5 rounded-xl border border-white/10 overflow-hidden bg-black/25">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                <th className="py-2.5 px-4">{t.rankGuide.colTier}</th>
                <th className="py-2.5 px-4">{t.rankGuide.colThreshold}</th>
                <th className="py-2.5 px-4 text-right">{t.rankGuide.colBadge}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {RANK_TIERS.map((def) => {
                const isCurrent = currentRank.tier === def.tier;
                const thresholdLabel =
                  def.maxRp === null
                    ? `${def.minRp.toLocaleString()}+ RP`
                    : `${def.minRp.toLocaleString()} – ${def.maxRp.toLocaleString()} RP`;
                return (
                  <tr
                    key={def.tier}
                    className={isCurrent ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'}
                  >
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${def.bgClass} ${def.colorClass} ${def.borderClass}`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {def.tier}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-200">{thresholdLabel}</td>
                    <td className="py-2.5 px-4 text-right">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t.rankGuide.currentTierBadge}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RP Gain/Loss Rules */}
        <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <h4 className="text-sm font-bold text-white mb-2.5">{t.rankGuide.rulesTitle}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium">
              {t.rankGuide.rulePvpWin}
            </div>
            <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-medium">
              {t.rankGuide.rulePvpLoss}
            </div>
            <div className="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 font-medium">
              {t.rankGuide.ruleDraw}
            </div>
            <div className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-medium">
              {t.rankGuide.ruleBotWin}
            </div>
            <div className="sm:col-span-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
              {t.rankGuide.ruleBotLoss}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
