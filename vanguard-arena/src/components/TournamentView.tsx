import React from 'react';
import { Calendar, Clock, Crown, Lock, Play, Swords, Trophy, Users } from 'lucide-react';
import { GAME_REGISTRY } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { FeatureLocks, Language, ProfileFrame, Tournament, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface TournamentViewProps {
  lang: Language;
  tournaments: Tournament[];
  featureLocks: FeatureLocks;
  currentUser: UserProfile;
  frames: ProfileFrame[];
  onJoin: (tournamentId: string) => void;
  onLeave: (tournamentId: string) => void;
  onLaunchBracketMatch: (tournamentId: string, bracketMatchId: string) => void;
}

function getRoundLabel(roundIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIdx;
  if (fromEnd === 1) return 'Finals';
  if (fromEnd === 2) return 'Semifinals';
  if (fromEnd === 3) return 'Quarterfinals';
  const size = Math.pow(2, fromEnd);
  return `Round of ${size}`;
}

function formatCountdown(targetIso: string, nowMs: number): string | null {
  const targetMs = Date.parse(targetIso);
  if (!Number.isFinite(targetMs)) return null;
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  if (diffSec === 0) return '00:00:00';
  const days = Math.floor(diffSec / 86400);
  const hrs = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  lang,
  tournaments,
  featureLocks,
  currentUser,
  frames,
  onJoin,
  onLeave,
  onLaunchBracketMatch,
}) => {
  const t = TRANSLATIONS[lang];
  const [now, setNow] = React.useState(Date.now());
  const visibleTournaments = tournaments.filter((tr) => tr.status !== 'draft');
  const isSuspended = Boolean(currentUser.suspendedUntil && Date.parse(currentUser.suspendedUntil) > now);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (featureLocks.tournaments || visibleTournaments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="p-10 sm:p-14 rounded-3xl bg-[#121826] border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {featureLocks.tournaments ? t.tournament.lockedTitle : t.tournament.comingSoonTitle}
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {featureLocks.tournaments ? t.tournament.lockedDesc : t.tournament.comingSoonDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.tournament.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{t.tournament.subtitle}</p>
      </div>

      {visibleTournaments.map((tour) => {
        const plugin = GAME_REGISTRY[tour.gameType];
        const isJoined = tour.participants.some((p) => p.id === currentUser.id);
        const champion = tour.championId ? tour.participants.find((p) => p.id === tour.championId) : null;
        const countdown = formatCountdown(tour.startTime, now);
        const includedGameNames = (tour.includedGames?.length ? tour.includedGames : [tour.gameType])
          .map((g) => (lang === 'my' ? GAME_REGISTRY[g]?.nameMy : GAME_REGISTRY[g]?.shortName) || g)
          .join(' · ');

        const allBracketMatches = tour.rounds.flatMap((roundList, rIdx) =>
          roundList.map((bm) => ({ bm, rLabel: getRoundLabel(rIdx, tour.rounds.length) }))
        );

        return (
          <section key={tour.id} className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-6">
            {/* Event Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-400">
                  <span>{lang === 'my' ? plugin.nameMy : plugin.name}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-300">
                    {tour.status}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-mono tabular-nums">
                    {tour.participants.length} / {tour.maxPlayers}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono">
                    {t.tournament.roundsPerMatchLabel}{tour.roundsPerMatch || 1}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono">
                    {t.tournament.turnLimitLabel}: {tour.turnTimeLimit || 20}s
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/25 text-amber-300">
                    {tour.startMode === 'auto' ? t.tournament.autoStartLabel : t.tournament.manualStartLabel}
                  </span>
                </div>

                <h2 className="text-2xl font-display font-bold text-white">{tour.title}</h2>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {t.tournament.scheduledStart}: {new Date(tour.startTime).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-sky-400" />
                    {t.tournament.includedGamesLabel}: <strong className="text-slate-200">{includedGameNames}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {tour.status === 'registration' && countdown && (
                  <div className="px-4 py-2 rounded-xl bg-[#0A0D14] border border-amber-400/30 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{t.tournament.countdownLabel}</span>
                    </div>
                    <div className="text-base font-mono font-bold text-amber-300 tabular-nums">
                      {countdown}
                    </div>
                  </div>
                )}

                {tour.status === 'live' && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-semibold text-emerald-300">
                    {t.tournament.eventLiveNow}
                  </div>
                )}

                {tour.status === 'registration' && (
                  isJoined ? (
                    <button
                      type="button"
                      onClick={() => onLeave(tour.id)}
                      className="min-h-[44px] px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                    >
                      {t.tournament.withdraw}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={tour.participants.length >= tour.maxPlayers || isSuspended}
                      onClick={() => onJoin(tour.id)}
                      className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm cursor-pointer"
                    >
                      {tour.participants.length >= tour.maxPlayers
                        ? t.tournament.bracketFull
                        : t.tournament.register}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Registered Entrants List (during registration) */}
            {tour.status === 'registration' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>{t.tournament.registeredCompetitors}</span>
                </div>
                {tour.participants.length === 0 ? (
                  <p className="text-xs text-slate-500">{t.tournament.firstToRegister}</p>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {tour.participants.map((p, i) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center gap-3"
                      >
                        <AvatarWithFrame
                          avatarUrl={p.avatarUrl}
                          frameId={p.frameId}
                          frames={frames}
                          displayName={p.displayName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{p.displayName}</div>
                          <div className="text-[11px] font-mono text-slate-500">Seed #{i + 1} · {p.xp} RP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Champion Podium */}
            {champion && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Crown className="w-8 h-8 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">{t.tournament.champion}</div>
                    <div className="text-xl font-display font-bold text-white">{champion.displayName}</div>
                    <div className="text-xs font-mono text-slate-300">{champion.gameId}</div>
                  </div>
                </div>
                <Trophy className="w-8 h-8 text-amber-400/70 hidden sm:block" />
              </div>
            )}

            {/* Live Single-Elimination Knockout Bracket Tree */}
            {tour.rounds.length > 0 && (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-6 min-w-max">
                  {tour.rounds.map((roundMatches, rIdx) => (
                    <div key={rIdx} className="w-64 space-y-3 flex flex-col justify-around">
                      <div className="text-xs font-semibold text-amber-400 pb-1 border-b border-white/10 flex items-center justify-between">
                        <span>{getRoundLabel(rIdx, tour.rounds.length)}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {GAME_REGISTRY[roundMatches[0]?.gameType || tour.gameType]?.shortName}
                        </span>
                      </div>
                      <div className="space-y-4 flex-1 flex flex-col justify-around">
                        {roundMatches.map((bm) => {
                          const amIInMatch =
                            bm.player1?.id === currentUser.id || bm.player2?.id === currentUser.id;
                          const canPlay =
                            !isSuspended &&
                            amIInMatch &&
                            (bm.status === 'ready' || bm.status === 'active') &&
                            bm.player1 &&
                            bm.player2;

                          return (
                            <div
                              key={bm.id}
                              className={`p-3 rounded-xl border space-y-2 ${
                                bm.status === 'active'
                                  ? 'bg-sky-500/10 border-sky-400/50'
                                  : bm.status === 'completed'
                                  ? 'bg-[#0A0D14] border-white/10'
                                  : 'bg-[#0E131E] border-white/10'
                              }`}
                            >
                              {[
                                { player: bm.player1, score: bm.p1Score ?? 0 },
                                { player: bm.player2, score: bm.p2Score ?? 0 },
                              ].map(({ player, score }, slotIdx) => {
                                const isWinner = player && bm.winnerId === player.id;
                                return (
                                  <div
                                    key={slotIdx}
                                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${
                                      isWinner
                                        ? 'bg-amber-500/15 text-amber-200 font-semibold'
                                        : 'bg-[#121826] text-slate-300'
                                    }`}
                                  >
                                    <span className="text-xs truncate">
                                      {player ? player.displayName : 'TBD'}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {(bm.bestOf || 1) > 1 && player && (
                                        <span className="text-[11px] font-mono text-slate-400">{score}</span>
                                      )}
                                      {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                    </div>
                                  </div>
                                );
                              })}

                              {canPlay && (
                                <button
                                  type="button"
                                  onClick={() => onLaunchBracketMatch(tour.id, bm.id)}
                                  className="w-full min-h-[38px] rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>{bm.status === 'active' ? t.tournament.rejoinMatch : t.tournament.playMatch}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Public Match Progress Table */}
            {allBracketMatches.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{t.tournament.progressTableTitle}</span>
                </h3>
                <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#0A0D14]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                        <th className="py-2.5 px-3">{t.tournament.colRound}</th>
                        <th className="py-2.5 px-3">{t.tournament.colMatchup}</th>
                        <th className="py-2.5 px-3">{t.tournament.colGame}</th>
                        <th className="py-2.5 px-3 text-center">{t.tournament.colScore}</th>
                        <th className="py-2.5 px-3">{t.tournament.colStatus}</th>
                        <th className="py-2.5 px-3">{t.tournament.colWinner}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allBracketMatches.map(({ bm, rLabel }) => {
                        const winnerName =
                          bm.winnerId === bm.player1?.id
                            ? bm.player1?.displayName
                            : bm.winnerId === bm.player2?.id
                            ? bm.player2?.displayName
                            : null;
                        const bmGame = GAME_REGISTRY[bm.gameType || tour.gameType]?.shortName || tour.gameType;
                        return (
                          <tr key={bm.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-medium text-amber-300 whitespace-nowrap">{rLabel}</td>
                            <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap">
                              {bm.player1 ? bm.player1.displayName : 'TBD'}{' '}
                              <span className="text-slate-500">vs</span>{' '}
                              {bm.player2 ? bm.player2.displayName : bm.status === 'completed' ? 'BYE' : 'TBD'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{bmGame}</td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-300">
                              {bm.p1Score ?? 0} - {bm.p2Score ?? 0}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded capitalize text-[11px] font-semibold ${
                                  bm.status === 'active'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : bm.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : bm.status === 'ready'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-white/5 text-slate-400'
                                }`}
                              >
                                {bm.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-emerald-300 whitespace-nowrap">
                              {winnerName || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
