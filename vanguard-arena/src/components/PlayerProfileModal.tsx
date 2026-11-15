import React from 'react';
import { Award, Swords, UserPlus, Wifi, X } from 'lucide-react';
import { GAME_REGISTRY } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { GameType, Language, MatchHistoryRecord, ProfileFrame, UserProfile } from '../types.ts';
import { getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

interface PlayerProfileModalProps {
  lang: Language;
  token: string;
  userId: string;
  currentUserId: string;
  frames: ProfileFrame[];
  onClose: () => void;
  onAddFriend: (userId: string) => void;
  onChallenge: (userId: string, gameType: GameType) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  lang,
  token,
  userId,
  currentUserId,
  frames,
  onClose,
  onAddFriend,
  onChallenge,
}) => {
  const t = TRANSLATIONS[lang];
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isOnline, setIsOnline] = React.useState(false);
  const [pingMs, setPingMs] = React.useState(0);
  const [matches, setMatches] = React.useState<MatchHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setIsOnline(Boolean(d.isOnline));
          setPingMs(Number(d.pingMs || 0));
          setMatches(d.recentMatches || []);
        }
      })
      .finally(() => setLoading(false));
  }, [token, userId]);

  const rank = profile ? getRankInfo(profile.xp) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#121826] border border-white/15 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-bold text-white">Competitor Profile</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !profile || !rank ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading competitor dossier...</div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <AvatarWithFrame
                avatarUrl={profile.avatarUrl}
                frameId={profile.frameId}
                frames={frames}
                displayName={profile.displayName}
                size="lg"
                status={isOnline ? 'online' : 'offline'}
              />
              <div>
                <div className="text-xl font-display font-bold text-white">{profile.displayName}</div>
                <div className="text-xs font-mono text-slate-400">{profile.gameId}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 font-semibold ${rank.colorClass}`}>
                    <Award className="w-3.5 h-3.5" />
                    {rank.tier} Lv {rank.level}
                  </span>
                  {isOnline && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono text-emerald-400 tabular-nums">
                        <Wifi className="w-3 h-3" />
                        {pingMs}ms
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10">
                <div className="text-base font-bold text-amber-400 tabular-nums">{profile.xp}</div>
                <div className="text-[11px] text-slate-400">{t.leaderboard.xp}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10">
                <div className="text-base font-bold text-emerald-400 tabular-nums">{profile.wins}</div>
                <div className="text-[11px] text-slate-400">{t.profile.wins}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10">
                <div className="text-base font-bold text-rose-400 tabular-nums">{profile.losses}</div>
                <div className="text-[11px] text-slate-400">{t.profile.losses}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-white/10">
                <div className="text-base font-bold text-slate-300 tabular-nums">{profile.draws}</div>
                <div className="text-[11px] text-slate-400">{t.profile.draws}</div>
              </div>
            </div>

            {profile.id !== currentUserId && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onAddFriend(profile.id)}
                  className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t.social.addFriend}</span>
                </button>
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    onChallenge(profile.id, 'connect4');
                    onClose();
                  }}
                  className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Swords className="w-4 h-4" />
                  <span>{isOnline ? t.lobby.challenge : 'Offline'}</span>
                </button>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-semibold text-slate-300">{t.profile.recentHistory}</div>
              {matches.length === 0 ? (
                <p className="text-xs text-slate-500">{t.profile.noHistory}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-white/10">
                  {matches.slice(0, 6).map((m) => (
                    <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {GAME_REGISTRY[m.gameType].shortName} vs {m.player1Id === profile.id ? m.player2Name : m.player1Name}
                      </span>
                      <span
                        className={
                          m.isDraw
                            ? 'text-slate-400'
                            : m.winnerId === profile.id
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400'
                        }
                      >
                        {m.isDraw ? t.profile.draw : m.winnerId === profile.id ? t.profile.victory : t.profile.defeat}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
