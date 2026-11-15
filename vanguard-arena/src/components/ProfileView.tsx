import React from 'react';
import { AlertTriangle, Award, Check, Copy, HelpCircle, Lock, Upload } from 'lucide-react';
import { GAME_REGISTRY } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type { Language, MatchHistoryRecord, ProfileFrame, UserProfile } from '../types.ts';
import { canEquipFrame, getRankInfo } from '../utils/rank.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { RankGuideModal } from './RankGuideModal.tsx';

interface ProfileViewProps {
  lang: Language;
  token: string;
  user: UserProfile;
  frames: ProfileFrame[];
  onUserUpdated: (user: UserProfile) => void;
  onNotify: (level: 'info' | 'error' | 'success', msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  lang,
  token,
  user,
  frames,
  onUserUpdated,
  onNotify,
}) => {
  const t = TRANSLATIONS[lang];
  const [displayName, setDisplayName] = React.useState(user.displayName);
  const [selectedFrame, setSelectedFrame] = React.useState(user.frameId);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [history, setHistory] = React.useState<MatchHistoryRecord[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setDisplayName(user.displayName);
    setSelectedFrame(user.frameId);
  }, [user.displayName, user.frameId]);

  React.useEffect(() => {
    fetch('/api/matches/history', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { matches: [] }))
      .then((d) => setHistory(d.matches || []))
      .catch(() => {});
  }, [token, user.wins, user.losses, user.draws]);

  const rank = getRankInfo(user.xp);
  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  const handleCopyGameId = () => {
    navigator.clipboard.writeText(user.gameId);
    setCopied(true);
    onNotify('success', `Copied ${user.gameId} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: displayName.trim(), frameId: selectedFrame }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not update profile.');
      } else {
        onUserUpdated(data.user);
        onNotify('success', 'Profile updated.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onNotify('error', 'Profile picture must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to upload avatar.');
      } else {
        onUserUpdated(data.user);
        onNotify('success', 'Profile picture updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Top Profile Summary & Stats */}
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-6">
          <div className="flex items-center gap-4">
            <AvatarWithFrame
              avatarUrl={user.avatarUrl}
              frameId={selectedFrame}
              frames={frames}
              displayName={displayName}
              size="xl"
              status="online"
            />
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl font-display font-bold text-white truncate">{user.displayName}</h1>
              <button
                type="button"
                onClick={handleCopyGameId}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0D14] border border-white/10 text-xs font-mono text-amber-300 hover:border-amber-400/50 cursor-pointer"
              >
                <span>{user.gameId}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 pt-1">
                <Award className={`w-4 h-4 ${rank.colorClass}`} />
                <span className={`font-semibold ${rank.colorClass}`}>{rank.tier}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Level {rank.level}</span>
                {user.warningCount > 0 && (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/30 text-rose-300 text-[11px] font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    {t.moderation.warningCounterLabel}: {user.warningCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="w-full min-h-[40px] px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/35 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.rankGuide.buttonLabel}</span>
          </button>

          {/* RP Progression Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>
                {user.xp.toLocaleString()} {t.profile.totalXp}
              </span>
              <span>
                {rank.nextTier
                  ? `${rank.rpToNextTier.toLocaleString()} RP → ${rank.nextTier}`
                  : `${rank.xpInLevel} / ${rank.xpForNextLevel} XP`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0A0D14] overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-sky-400 transition-all duration-300"
                style={{ width: `${rank.progressPct}%` }}
              />
            </div>
          </div>

          {/* Win / Loss / Draw Stats */}
          <div className="grid grid-cols-4 gap-2 text-center pt-1">
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-white/10">
              <div className="text-lg font-display font-bold text-emerald-400 tabular-nums">{user.wins}</div>
              <div className="text-[11px] text-slate-400">{t.profile.wins}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-white/10">
              <div className="text-lg font-display font-bold text-rose-400 tabular-nums">{user.losses}</div>
              <div className="text-[11px] text-slate-400">{t.profile.losses}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-white/10">
              <div className="text-lg font-display font-bold text-slate-300 tabular-nums">{user.draws}</div>
              <div className="text-[11px] text-slate-400">{t.profile.draws}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-white/10">
              <div className="text-lg font-display font-bold text-amber-400 tabular-nums">{winRate}%</div>
              <div className="text-[11px] text-slate-400">{t.profile.winRate}</div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>{t.profile.uploadAvatar}</span>
          </button>
        </section>

        {/* Edit Display Name & Frame Selector */}
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-white">{t.profile.customizeTitle}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.profile.customizeDesc}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.profile.displayName}</label>
              <input
                type="text"
                minLength={2}
                maxLength={32}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-medium text-slate-300">{t.profile.frameSelector}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {frames.map((frame) => {
                  const unlocked = canEquipFrame(user.xp, frame.unlockTier);
                  const active = selectedFrame === frame.id;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setSelectedFrame(frame.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        active
                          ? 'bg-amber-500/15 border-amber-400'
                          : unlocked
                          ? 'bg-[#0A0D14] border-white/10 hover:border-white/25 cursor-pointer'
                          : 'bg-[#0A0D14]/60 border-white/5 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <AvatarWithFrame
                        avatarUrl={user.avatarUrl}
                        frameId={frame.id}
                        frames={frames}
                        displayName={user.displayName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{frame.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          {!unlocked && <Lock className="w-3 h-3 text-amber-400" />}
                          <span>{frame.unlockTier === 'All' ? t.profile.unlocked : `${frame.unlockTier}+`}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                {saving ? t.profile.saving : t.profile.saveChanges}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Match History */}
      <section className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
        <h2 className="text-lg font-display font-bold text-white">{t.profile.recentHistory}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">{t.profile.noHistory}</p>
        ) : (
          <div className="divide-y divide-white/10">
            {history.map((m) => {
              const plugin = GAME_REGISTRY[m.gameType];
              const won = !m.isDraw && m.winnerId === user.id;
              const outcome = m.isDraw ? t.profile.draw : won ? t.profile.victory : t.profile.defeat;
              const opponentName = m.player1Id === user.id ? m.player2Name : m.player1Name;

              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-white">
                      {lang === 'my' ? plugin.nameMy : plugin.name} vs {opponentName}
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="capitalize">{m.mode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ''}</span>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      m.isDraw ? 'text-slate-300' : won ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {outcome}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <RankGuideModal open={guideOpen} lang={lang} userRp={user.xp} onClose={() => setGuideOpen(false)} />
    </div>
  );
};
