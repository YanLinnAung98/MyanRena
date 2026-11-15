import React from 'react';
import { Award, HelpCircle, Trophy } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { Language, ProfileFrame, UserProfile } from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { RankGuideModal } from './RankGuideModal.tsx';

interface LeaderboardViewProps {
  lang: Language;
  leaderboard: UserProfile[];
  currentUserId: string;
  currentUserRp?: number;
  frames: ProfileFrame[];
  onInspectPlayer: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  lang,
  leaderboard,
  currentUserId,
  currentUserRp,
  frames,
  onInspectPlayer,
}) => {
  const t = TRANSLATIONS[lang];
  const [guideOpen, setGuideOpen] = React.useState(false);
  const rankedPlayers = leaderboard.filter((p) => p.role !== 'admin');
  const resolvedUserRp =
    currentUserRp ?? rankedPlayers.find((p) => p.id === currentUserId)?.xp ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.leaderboard.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{t.leaderboard.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t.leaderboard.tiersLine}</span>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="min-h-[38px] px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t.rankGuide.buttonLabel}</span>
          </button>
        </div>
      </div>

      <RankGuideModal open={guideOpen} lang={lang} userRp={resolvedUserRp} onClose={() => setGuideOpen(false)} />

      <div className="rounded-2xl bg-[#121826] border border-white/10 overflow-hidden">
        {rankedPlayers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">{t.leaderboard.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-slate-400 bg-[#0E131F]">
                  <th className="py-3.5 px-4">{t.leaderboard.rank}</th>
                  <th className="py-3.5 px-4">{t.leaderboard.competitor}</th>
                  <th className="py-3.5 px-4">{t.leaderboard.tier}</th>
                  <th className="py-3.5 px-4 text-right">{t.leaderboard.wld}</th>
                  <th className="py-3.5 px-4 text-right">{t.leaderboard.winRate}</th>
                  <th className="py-3.5 px-4 text-right">{t.leaderboard.xp}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {rankedPlayers.map((player, idx) => {
                  const rankInfo = getRankInfo(player.xp);
                  const total = player.wins + player.losses + player.draws;
                  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;
                  const isMe = player.id === currentUserId;

                  return (
                    <tr
                      key={player.id}
                      onClick={() => onInspectPlayer(player.id)}
                      className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                        isMe ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-slate-300">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <AvatarWithFrame
                            avatarUrl={player.avatarUrl}
                            frameId={player.frameId}
                            frames={frames}
                            displayName={player.displayName}
                            size="sm"
                          />
                          <div>
                            <div className="font-semibold text-white">
                              {player.displayName} {isMe ? '(You)' : ''}
                            </div>
                            <div className="text-xs font-mono text-slate-500">{player.gameId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${rankInfo.colorClass}`}>
                          <Award className="w-3.5 h-3.5" />
                          <span>{rankInfo.tier}</span>
                          <span className="text-slate-500 font-mono">Lv {rankInfo.level}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                        {player.wins} / {player.losses} / {player.draws}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {winRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                        {player.xp.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
