import React from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileWarning,
  Gamepad2,
  ImagePlus,
  LayoutTemplate,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  Unlock,
  UserX,
  Wifi,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  Announcement,
  FeatureLocks,
  GameType,
  LandingContent,
  Language,
  MatchmakingSettings,
  PlayerReport,
  ProfileFrame,
  SakarRiddle,
  Tournament,
  TurnTimeLimit,
  UserProfile,
} from '../types.ts';
import { downloadSampleFrameTemplate } from '../utils/frameTemplate.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

interface AdminUserRow extends UserProfile {
  isOnline: boolean;
  deviceCount: number;
  pingMs: number;
  inMatch: boolean;
}

interface AdminPanelProps {
  token: string;
  adminUser: UserProfile;
  livePingMs: number;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onSwitchToLobby: () => void;
  landingContent: LandingContent;
  onLandingUpdated: (next: LandingContent) => void;
  onLogout: () => void;
  onNotify: (level: 'info' | 'error' | 'success', msg: string) => void;
}

function defaultLocalDatetimeValue(): string {
  const d = new Date(Date.now() + 15 * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  token,
  adminUser,
  livePingMs,
  lang,
  onChangeLang,
  onSwitchToLobby,
  landingContent,
  onLandingUpdated,
  onLogout,
  onNotify,
}) => {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = React.useState<
    'telemetry' | 'users' | 'reports' | 'locks' | 'tournaments' | 'frames' | 'cms' | 'riddles'
  >('telemetry');
  const [telemetry, setTelemetry] = React.useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeDevices: 0,
    activeMatches: 0,
    queueSize: 0,
    pendingReports: 0,
    serverUptimeSec: 0,
    memoryMb: 0,
    serverStatus: 'healthy',
  });
  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [reports, setReports] = React.useState<PlayerReport[]>([]);
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [reportAdminNotes, setReportAdminNotes] = React.useState('');
  const [suspendHours, setSuspendHours] = React.useState<1 | 6 | 24 | 72 | 168>(1);
  const [frames, setFrames] = React.useState<ProfileFrame[]>([]);
  const [locks, setLocks] = React.useState<FeatureLocks>({
    connect4: false,
    ttt: false,
    rps: false,
    sakar_htar: false,
    matchmaking: false,
    chat: false,
    tournaments: false,
  });
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [riddles, setRiddles] = React.useState<SakarRiddle[]>([]);
  const [userSearch, setUserSearch] = React.useState('');

  // Broadcast form
  const [broadcastTitle, setBroadcastTitle] = React.useState('');
  const [broadcastMsg, setBroadcastMsg] = React.useState('');
  const [broadcastTarget, setBroadcastTarget] = React.useState('');

  // Advanced Tournament form
  const [tourTitle, setTourTitle] = React.useState('');
  const [tourGames, setTourGames] = React.useState<GameType[]>(['connect4']);
  const [tourMaxPlayers, setTourMaxPlayers] = React.useState<4 | 8 | 16 | 32 | 64>(8);
  const [tourRoundsPerMatch, setTourRoundsPerMatch] = React.useState<1 | 3 | 5>(1);
  const [tourTurnLimit, setTourTurnLimit] = React.useState<TurnTimeLimit>(20);
  const [tourStartMode, setTourStartMode] = React.useState<'auto' | 'manual'>('auto');
  const [tourStartLocal, setTourStartLocal] = React.useState<string>(defaultLocalDatetimeValue);
  const [tourOpenNow, setTourOpenNow] = React.useState(true);

  // Frame CRUD state
  const [frameName, setFrameName] = React.useState('');
  const [frameDesc, setFrameDesc] = React.useState('');
  const [frameTier, setFrameTier] = React.useState('All');
  const [frameDataUrl, setFrameDataUrl] = React.useState('');
  const [editingFrame, setEditingFrame] = React.useState<ProfileFrame | null>(null);

  // Landing CMS state
  const [cmsDraft, setCmsDraft] = React.useState<LandingContent>(landingContent);
  const [cmsSaving, setCmsSaving] = React.useState(false);

  // Matchmaking & Bot Backfill Rules state
  const [mmSettings, setMmSettings] = React.useState<MatchmakingSettings>({
    maxSearchSeconds: 25,
    botFillDelaySeconds: 8,
    autoBotFillDefault: true,
  });
  const [mmSaving, setMmSaving] = React.useState(false);
  const mmInitRef = React.useRef(false);

  // Sakar-Htar Riddle Bank CRUD state
  const [riddleSearch, setRiddleSearch] = React.useState('');
  const [editingRiddleId, setEditingRiddleId] = React.useState<string | null>(null);
  const [riddleQMy, setRiddleQMy] = React.useState('');
  const [riddleHintEn, setRiddleHintEn] = React.useState('');
  const [riddleOpts, setRiddleOpts] = React.useState<[string, string, string, string]>(['', '', '', '']);
  const [riddleCorrectIdx, setRiddleCorrectIdx] = React.useState<0 | 1 | 2 | 3>(0);
  const [riddleExpMy, setRiddleExpMy] = React.useState('');
  const [riddleExpEn, setRiddleExpEn] = React.useState('');
  const [riddleSaving, setRiddleSaving] = React.useState(false);

  React.useEffect(() => {
    setCmsDraft(landingContent);
  }, [landingContent]);

  const loadOverview = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTelemetry(data.telemetry);
      setUsers(data.users || []);
      setReports(data.reports || []);
      setFrames(data.frames || []);
      setLocks(data.featureLocks);
      setTournaments(data.tournaments || []);
      setAnnouncements(data.announcements || []);
      if (Array.isArray(data.riddles)) setRiddles(data.riddles);
      if (data.landingContent) {
        onLandingUpdated(data.landingContent);
      }
      if (data.matchmakingSettings && !mmInitRef.current) {
        setMmSettings(data.matchmakingSettings);
        mmInitRef.current = true;
      }
    } catch {
      // silent
    }
  }, [token, onLandingUpdated]);

  React.useEffect(() => {
    loadOverview();
    const id = setInterval(loadOverview, 5000);
    return () => clearInterval(id);
  }, [loadOverview]);

  const handleModerateUser = async (
    userId: string,
    action: 'warn' | 'kick' | 'suspend' | 'unsuspend' | 'ban' | 'unban',
    durationHours?: number,
    reason?: string
  ) => {
    const res = await fetch(`/api/admin/users/${userId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, durationHours, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Moderation action failed.');
    } else {
      onNotify('success', data.actionTaken || 'Moderation applied.');
      loadOverview();
    }
  };

  const handleReportAction = async (
    reportId: string,
    action: 'warn' | 'kick' | 'suspend' | 'ban' | 'dismiss',
    durationHours?: number
  ) => {
    const res = await fetch(`/api/admin/reports/${reportId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, durationHours, adminNotes: reportAdminNotes.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Could not resolve report.');
    } else {
      setReports(data.reports || []);
      setReportAdminNotes('');
      onNotify('success', 'Moderation tribunal verdict applied.');
      loadOverview();
    }
  };

  const handleLockToggle = async (key: keyof FeatureLocks) => {
    const next = !locks[key];
    const res = await fetch('/api/admin/locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, locked: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setLocks(data.featureLocks);
      onNotify('success', `${key} ${next ? 'locked' : 'unlocked'}.`);
    }
  };

  const handleSaveMatchmakingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMmSaving(true);
    try {
      const res = await fetch('/api/admin/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(mmSettings),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not save matchmaking settings.');
      } else if (data.matchmakingSettings) {
        setMmSettings(data.matchmakingSettings);
        onNotify('success', 'Matchmaking queue settings saved & broadcast live.');
      }
    } finally {
      setMmSaving(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: broadcastTitle.trim(),
        message: broadcastMsg.trim(),
        targetUserId: broadcastTarget || null,
      }),
    });
    if (res.ok) {
      setBroadcastTitle('');
      setBroadcastMsg('');
      setBroadcastTarget('');
      onNotify('success', 'Notification broadcast sent.');
      loadOverview();
    }
  };

  const toggleTourGame = (g: GameType) => {
    setTourGames((prev) => {
      if (prev.includes(g)) {
        return prev.length === 1 ? prev : prev.filter((x) => x !== g);
      }
      return [...prev, g];
    });
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourTitle.trim() || tourGames.length === 0) return;
    const startIso = tourStartLocal ? new Date(tourStartLocal).toISOString() : new Date(Date.now() + 900_000).toISOString();
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: tourTitle.trim(),
        gameType: tourGames[0],
        includedGames: tourGames,
        maxPlayers: tourMaxPlayers,
        roundsPerMatch: tourRoundsPerMatch,
        turnTimeLimit: tourTurnLimit,
        startMode: tourStartMode,
        startTime: startIso,
        openRegistration: tourOpenNow,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTourTitle('');
      onNotify('success', 'Tournament event created.');
      loadOverview();
    } else {
      onNotify('error', data.error || 'Could not create tournament.');
    }
  };

  const handleStartTournament = async (id: string) => {
    const res = await fetch(`/api/admin/tournaments/${id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) onNotify('error', data.error || 'Could not generate bracket.');
    else {
      onNotify('success', 'Knockout bracket generated and launched.');
      loadOverview();
    }
  };

  const handleTournamentStatus = async (id: string, status: Tournament['status']) => {
    await fetch(`/api/admin/tournaments/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadOverview();
  };

  const handleDeleteTournament = async (id: string) => {
    await fetch(`/api/admin/tournaments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadOverview();
  };

  const handleFrameFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFrameDataUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSaveFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFrame) {
      const res = await fetch(`/api/admin/frames/${editingFrame.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: frameName.trim(),
          description: frameDesc.trim(),
          unlockTier: frameTier,
          isActive: editingFrame.isActive,
        }),
      });
      if (res.ok) {
        setEditingFrame(null);
        setFrameName('');
        setFrameDesc('');
        setFrameTier('All');
        onNotify('success', 'Frame updated.');
        loadOverview();
      }
      return;
    }

    if (!frameName.trim() || !frameDataUrl) {
      onNotify('error', 'Provide a frame name and upload a PNG image.');
      return;
    }

    const res = await fetch('/api/admin/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: frameName.trim(),
        description: frameDesc.trim(),
        unlockTier: frameTier,
        imageDataUrl: frameDataUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Failed to add frame.');
    } else {
      setFrameName('');
      setFrameDesc('');
      setFrameDataUrl('');
      onNotify('success', 'Custom frame published.');
      loadOverview();
    }
  };

  const handleDeleteFrame = async (id: string) => {
    await fetch(`/api/admin/frames/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onNotify('info', 'Frame deleted.');
    loadOverview();
  };

  const handleCmsImageUpload = (
    target: 'hero' | GameType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onNotify('error', 'Image must be under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (target === 'hero') {
        setCmsDraft((prev) => ({ ...prev, heroBannerUrl: dataUrl }));
      } else {
        setCmsDraft((prev) => ({
          ...prev,
          games: {
            ...prev.games,
            [target]: { ...prev.games[target], bannerUrl: dataUrl },
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cmsDraft),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to publish landing content.');
      } else if (data.landingContent) {
        onLandingUpdated(data.landingContent);
        setCmsDraft(data.landingContent);
        onNotify('success', 'Landing page content published live.');
      }
    } finally {
      setCmsSaving(false);
    }
  };

  const resetRiddleForm = () => {
    setEditingRiddleId(null);
    setRiddleQMy('');
    setRiddleHintEn('');
    setRiddleOpts(['', '', '', '']);
    setRiddleCorrectIdx(0);
    setRiddleExpMy('');
    setRiddleExpEn('');
  };

  const handleEditRiddle = (r: SakarRiddle) => {
    setEditingRiddleId(r.id);
    setRiddleQMy(r.questionMy);
    setRiddleHintEn(r.hintEn || '');
    setRiddleOpts([r.options[0], r.options[1], r.options[2], r.options[3]]);
    setRiddleCorrectIdx(r.correctIndex);
    setRiddleExpMy(r.explanationMy || '');
    setRiddleExpEn(r.explanationEn || '');
  };

  const handleSaveRiddle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOpts = riddleOpts.map((o) => o.trim());
    if (!riddleQMy.trim() || cleanOpts.some((o) => !o)) {
      onNotify('error', 'Enter the Burmese riddle question and all 4 options.');
      return;
    }
    setRiddleSaving(true);
    try {
      const url = editingRiddleId ? `/api/admin/riddles/${editingRiddleId}` : '/api/admin/riddles';
      const method = editingRiddleId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          questionMy: riddleQMy.trim(),
          hintEn: riddleHintEn.trim(),
          options: cleanOpts,
          correctIndex: riddleCorrectIdx,
          explanationMy: riddleExpMy.trim(),
          explanationEn: riddleExpEn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not save riddle.');
      } else {
        if (Array.isArray(data.riddles)) setRiddles(data.riddles);
        onNotify('success', editingRiddleId ? 'Riddle updated.' : 'New riddle added to bank.');
        resetRiddleForm();
      }
    } finally {
      setRiddleSaving(false);
    }
  };

  const handleDeleteRiddle = async (id: string) => {
    const res = await fetch(`/api/admin/riddles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Could not delete riddle.');
    } else {
      if (Array.isArray(data.riddles)) setRiddles(data.riddles);
      if (editingRiddleId === id) resetRiddleForm();
      onNotify('info', 'Riddle removed.');
    }
  };

  const filteredRiddles = riddles.filter((r) => {
    if (!riddleSearch.trim()) return true;
    const q = riddleSearch.toLowerCase();
    return (
      r.questionMy.toLowerCase().includes(q) ||
      (r.hintEn || '').toLowerCase().includes(q) ||
      r.options.some((opt) => opt.toLowerCase().includes(q))
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.gameId.toLowerCase().includes(q)
    );
  });

  const lockEntries: { key: keyof FeatureLocks; label: string; desc: string }[] = [
    { key: 'connect4', label: '4 in a Row', desc: 'Disable new matches or bot play for Connect 4' },
    { key: 'ttt', label: 'Tic-Tac-Toe', desc: 'Disable Tic-Tac-Toe across lobby and challenges' },
    { key: 'rps', label: 'Rock, Paper, Scissors', desc: 'Place RPS into maintenance mode' },
    { key: 'sakar_htar', label: 'Sakar-Htar (စကားထာ)', desc: 'Disable Sakar-Htar Solo, Quick Match, and Custom Rooms' },
    { key: 'matchmaking', label: 'Random Matchmaking', desc: 'Lock ranked matchmaking queues' },
    { key: 'chat', label: 'Global & Match Chat', desc: 'Mute in-match chat, room chat, stickers, and DMs' },
    { key: 'tournaments', label: 'Tournament System', desc: 'Lock tournament tab into Coming Soon mode' },
  ];

  return (
    <div className="min-h-dvh-safe bg-[#0A0D14] text-slate-100 flex flex-col">
      {/* Admin Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0E131F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-sm sm:text-lg font-display font-bold text-white truncate">
              {t.admin.controlPanel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={onSwitchToLobby}
              className="min-h-[44px] px-2.5 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.playGames}</span>
              <span className="sm:hidden">{t.nav.lobby}</span>
            </button>

            <LanguageSwitcher lang={lang} onChange={onChangeLang} />

            <span className="hidden xs:inline-flex sm:inline-flex items-center gap-1.5 font-mono text-emerald-400 tabular-nums px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.admin.adminPing}:</span> {livePingMs}ms
            </span>
            <button
              type="button"
              onClick={loadOverview}
              aria-label="Refresh telemetry"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.nav.signOut}
              className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.signOut}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#121826] border border-white/10 max-w-full">
          {(
            [
              ['telemetry', t.admin.tabTelemetry, 0],
              ['users', t.admin.tabUsers, 0],
              ['reports', t.admin.tabReports, telemetry.pendingReports || 0],
              ['locks', t.admin.tabLocks, 0],
              ['tournaments', t.admin.tabTournaments, 0],
              ['frames', t.admin.tabFrames, 0],
              ['cms', t.admin.tabCms, 0],
              ['riddles', t.admin.tabRiddles, 0],
            ] as const
          ).map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`min-h-[44px] px-3 sm:px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{label}</span>
              {badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeTab === id ? 'bg-slate-950 text-amber-300' : 'bg-rose-500 text-white'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Telemetry & Global Broadcaster */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#121826] border border-white/10">
                <div className="text-xs text-slate-400">Total Registered Users</div>
                <div className="text-3xl font-display font-bold text-white mt-1 tabular-nums">
                  {telemetry.totalUsers}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#121826] border border-white/10">
                <div className="text-xs text-slate-400">Live Online Users</div>
                <div className="text-3xl font-display font-bold text-emerald-400 mt-1 tabular-nums">
                  {telemetry.onlineUsers}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#121826] border border-white/10">
                <div className="text-xs text-slate-400">Active Connected Devices</div>
                <div className="text-3xl font-display font-bold text-sky-400 mt-1 tabular-nums">
                  {telemetry.activeDevices}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#121826] border border-white/10">
                <div className="text-xs text-slate-400">Server Health & Memory</div>
                <div className="text-lg font-display font-bold text-amber-400 mt-2 flex items-center gap-2 tabular-nums">
                  <Activity className="w-5 h-5" />
                  <span>Nominal · {telemetry.memoryMb} MB</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  Matches: {telemetry.activeMatches} · Uptime: {telemetry.serverUptimeSec}s
                </div>
              </div>
            </div>

            {/* Global / Targeted Notification Broadcaster */}
            <div className="grid lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleBroadcast}
                className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-display font-bold text-white">Notification Broadcaster</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">Title</label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Maintenance Notice / Event Alert"
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">Target Audience</label>
                    <select
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">All Online Players (Global)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.gameId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={3}
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Enter instant real-time banner announcement..."
                    className="w-full p-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
                >
                  Send Real-Time Broadcast
                </button>
              </form>

              <div className="lg:col-span-5 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
                <h3 className="text-base font-display font-bold text-white">Recent Broadcasts</h3>
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500">No announcements dispatched yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl bg-[#0A0D14] border border-white/10">
                        <div className="text-xs font-semibold text-amber-300">{a.title}</div>
                        <div className="text-xs text-slate-300 mt-0.5">{a.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: User Moderation Directory */}
        {activeTab === 'users' && (
          <div className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-white">{t.admin.userDirectory}</h2>
                <p className="text-xs text-slate-400">
                  Issue official warnings, timed play suspensions, kick live sessions, or ban accounts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={suspendHours}
                  onChange={(e) => setSuspendHours(Number(e.target.value) as 1 | 6 | 24 | 72 | 168)}
                  className="h-11 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-amber-300 font-semibold"
                  title="Timed suspension duration"
                >
                  <option value={1}>Suspend: 1 Hour</option>
                  <option value={6}>Suspend: 6 Hours</option>
                  <option value={24}>Suspend: 24 Hours</option>
                  <option value={72}>Suspend: 3 Days</option>
                  <option value={168}>Suspend: 7 Days</option>
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user or #PLY..."
                    className="h-11 pl-9 pr-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400 w-full sm:w-56"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="py-3 px-3">Player</th>
                    <th className="py-3 px-3">Session / Ping</th>
                    <th className="py-3 px-3 text-right">W / L / D</th>
                    <th className="py-3 px-3 text-right">RP</th>
                    <th className="py-3 px-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((u) => {
                    const isSuspended = Boolean(u.suspendedUntil && Date.parse(u.suspendedUntil) > Date.now());
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <AvatarWithFrame
                              avatarUrl={u.avatarUrl}
                              frameId={u.frameId}
                              frames={frames}
                              displayName={u.displayName}
                              size="sm"
                              status={u.isOnline ? (u.inMatch ? 'in_game' : 'online') : 'offline'}
                            />
                            <div>
                              <div className="font-semibold text-white flex flex-wrap items-center gap-1.5">
                                <span>{u.displayName}</span>
                                {u.isBanned && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                    Banned
                                  </span>
                                )}
                                {isSuspended && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                                    Suspended
                                  </span>
                                )}
                                {u.warningCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px]">
                                    {u.warningCount} Warn
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-slate-400">
                                @{u.username} · {u.gameId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-mono tabular-nums">
                          {u.isOnline ? (
                            <span className="text-emerald-400">
                              Online · {u.deviceCount} device(s) · {u.pingMs}ms
                            </span>
                          ) : (
                            <span className="text-slate-500">Offline</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-slate-300">
                          {u.wins}/{u.losses}/{u.draws}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs font-bold text-amber-400 tabular-nums">
                          {u.xp}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleModerateUser(
                                  u.id,
                                  'warn',
                                  undefined,
                                  'Official Fair Play warning from Arena Administration.'
                                )
                              }
                              className="min-h-[34px] px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                              title="Send Official Warning"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{t.admin.warn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                isSuspended
                                  ? handleModerateUser(u.id, 'unsuspend')
                                  : handleModerateUser(u.id, 'suspend', suspendHours)
                              }
                              className="min-h-[34px] px-2.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isSuspended ? 'Lift' : `${suspendHours}h`}</span>
                            </button>
                            <button
                              type="button"
                              disabled={!u.isOnline}
                              onClick={() => handleModerateUser(u.id, 'kick')}
                              className="min-h-[34px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-35 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{t.admin.kick}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModerateUser(u.id, u.isBanned ? 'unban' : 'ban')}
                              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer ${
                                u.isBanned
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                                  : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                              }`}
                            >
                              {u.isBanned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              <span>{u.isBanned ? t.admin.unban : t.admin.ban}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2B: Reports & Match Logs Tribunal */}
        {activeTab === 'reports' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-rose-400" />
                  <span>{t.admin.tabReports} ({reports.length})</span>
                </h2>
              </div>

              {reports.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No player reports have been submitted.</p>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {reports.map((r) => {
                    const active = selectedReportId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedReportId(r.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                          active
                            ? 'bg-amber-500/10 border-amber-400/60'
                            : 'bg-[#0A0D14] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {r.reportedName} <span className="text-slate-500 font-normal">vs</span> {r.reporterName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              r.status === 'pending'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-300 font-mono">{r.category} · {r.gameType}</div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{new Date(r.createdAt).toLocaleString()}</span>
                          {r.actionTaken && <span className="text-emerald-300">{r.actionTaken}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-5">
              {(() => {
                const selected = reports.find((r) => r.id === selectedReportId) || reports[0];
                if (!selected) {
                  return (
                    <div className="py-16 text-center text-xs text-slate-500">
                      Select a report ticket on the left to review full chat transcripts, move logs, and apply tribunal rulings.
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                      <div>
                        <div className="text-xs font-mono text-rose-300 uppercase">{selected.category}</div>
                        <h3 className="text-lg font-display font-bold text-white">
                          Reported: {selected.reportedName}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Filed by {selected.reporterName} · Match {selected.matchId} ({selected.gameType})
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                          selected.status === 'pending'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {selected.actionTaken || selected.status}
                      </span>
                    </div>

                    {selected.notes && (
                      <div className="p-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-slate-200">
                        <div className="text-[10px] uppercase text-slate-400 mb-1">Reporter Statement</div>
                        {selected.notes}
                      </div>
                    )}

                    {/* Snapshot 1: Match Chat & Sticker Transcript */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Match Chat & Sticker Transcript ({selected.chatTranscript.length})</span>
                      </h4>
                      <div className="max-h-44 overflow-y-auto rounded-xl bg-[#0A0D14] border border-white/10 p-3 space-y-1.5 text-xs">
                        {selected.chatTranscript.length === 0 ? (
                          <div className="text-slate-500 italic">No chat messages or stickers were sent during this match.</div>
                        ) : (
                          selected.chatTranscript.map((c) => (
                            <div key={c.id} className="flex items-start gap-2">
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                {new Date(c.createdAt).toLocaleTimeString()}
                              </span>
                              <span className="font-semibold text-amber-300 shrink-0">{c.senderName}:</span>
                              <span className="text-slate-200 break-words">{c.content}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Snapshot 2: Full Move History Log */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Match Move History Log ({selected.moveHistory.length})</span>
                      </h4>
                      <div className="max-h-44 overflow-y-auto rounded-xl bg-[#0A0D14] border border-white/10 p-3 space-y-1 text-xs font-mono">
                        {selected.moveHistory.length === 0 ? (
                          <div className="text-slate-500 italic font-sans">No move logs recorded.</div>
                        ) : (
                          selected.moveHistory.map((m) => (
                            <div key={m.step} className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-500">#{m.step}</span>
                              <span className="text-sky-300">{m.playerName}</span>
                              <span className="text-slate-300">{m.summary}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Graduated Disciplinary Actions */}
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={reportAdminNotes}
                          onChange={(e) => setReportAdminNotes(e.target.value)}
                          placeholder="Optional warning/ruling message shown to player..."
                          className="h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                        />
                        <select
                          value={suspendHours}
                          onChange={(e) => setSuspendHours(Number(e.target.value) as 1 | 6 | 24 | 72 | 168)}
                          className="h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-amber-300 font-semibold"
                        >
                          <option value={1}>Suspension: 1 Hour</option>
                          <option value={6}>Suspension: 6 Hours</option>
                          <option value={24}>Suspension: 24 Hours</option>
                          <option value={72}>Suspension: 3 Days</option>
                          <option value={168}>Suspension: 7 Days</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReportAction(selected.id, 'warn')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold cursor-pointer"
                        >
                          1. Send Official Warning
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(selected.id, 'kick')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 text-xs font-semibold cursor-pointer"
                        >
                          2. Kick Player
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(selected.id, 'suspend', suspendHours)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-orange-200 text-xs font-semibold cursor-pointer"
                        >
                          3. Suspend ({suspendHours}h)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(selected.id, 'ban')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 text-xs font-semibold cursor-pointer"
                        >
                          4. Permanent Ban
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(selected.id, 'dismiss')}
                          className="min-h-[38px] px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold cursor-pointer ml-auto"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 3: Feature, Matchmaking Rules & Game Locks */}
        {activeTab === 'locks' && (
          <div className="space-y-6">
            {/* Smart Matchmaking & Burmese Bot Backfill Rules */}
            <form
              onSubmit={handleSaveMatchmakingSettings}
              className="p-5 sm:p-6 rounded-2xl bg-[#121826] border border-amber-400/25 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-bold text-white">
                    {t.admin.matchmakingConfigTitle}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {t.admin.matchmakingConfigDesc}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.admin.maxSearchSecondsLabel} (10–90s)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={mmSettings.maxSearchSeconds}
                    onChange={(e) =>
                      setMmSettings((prev) => ({
                        ...prev,
                        maxSearchSeconds: Math.max(10, Math.min(90, Number(e.target.value) || 25)),
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.admin.botFillDelayLabel} (3–30s)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={mmSettings.botFillDelaySeconds}
                    onChange={(e) =>
                      setMmSettings((prev) => ({
                        ...prev,
                        botFillDelaySeconds: Math.max(3, Math.min(30, Number(e.target.value) || 8)),
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={mmSettings.autoBotFillDefault}
                  onClick={() =>
                    setMmSettings((prev) => ({ ...prev, autoBotFillDefault: !prev.autoBotFillDefault }))
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 hover:border-white/25 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-200">{t.admin.autoBotFillDefaultLabel}</span>
                  <span
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                      mmSettings.autoBotFillDefault ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white" />
                  </span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={mmSaving}
                  className="min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  {mmSaving ? t.common.loading : t.admin.saveMatchmakingBtn}
                </button>
              </div>
            </form>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockEntries.map((item) => {
                const isLocked = locks[item.key];
                return (
                  <div
                    key={item.key}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                      isLocked ? 'bg-rose-500/10 border-rose-500/35' : 'bg-[#121826] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-display font-bold text-white">{item.label}</h3>
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLockToggle(item.key)}
                      className={`min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        isLocked
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200'
                      }`}
                    >
                      {isLocked ? 'Unlock / Enable Live' : 'Lock / Maintenance Mode'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Tournament Manager (Scheduler, Multi-game, Auto/Manual, up to 64 Players) */}
        {activeTab === 'tournaments' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleCreateTournament}
              className="lg:col-span-5 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-display font-bold text-white">Schedule Championship Event</h2>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={tourTitle}
                  onChange={(e) => setTourTitle(e.target.value)}
                  placeholder="Weekend Championship Cup"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Included Games (Multi-Game Pool)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ['connect4', 'Connect 4'],
                      ['ttt', 'Tic-Tac-Toe'],
                      ['rps', 'RPS'],
                      ['sakar_htar', 'စကားထာ'],
                    ] as const
                  ).map(([gid, label]) => {
                    const checked = tourGames.includes(gid);
                    return (
                      <button
                        key={gid}
                        type="button"
                        onClick={() => toggleTourGame(gid)}
                        className={`min-h-[38px] px-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                          checked
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Max Players</label>
                  <select
                    value={tourMaxPlayers}
                    onChange={(e) => setTourMaxPlayers(Number(e.target.value) as 4 | 8 | 16 | 32 | 64)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  >
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                    <option value={32}>32 Players</option>
                    <option value={64}>64 Players</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Rounds / Match</label>
                  <select
                    value={tourRoundsPerMatch}
                    onChange={(e) => setTourRoundsPerMatch(Number(e.target.value) as 1 | 3 | 5)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  >
                    <option value={1}>Best of 1</option>
                    <option value={3}>Best of 3</option>
                    <option value={5}>Best of 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Turn Timer</label>
                  <select
                    value={tourTurnLimit}
                    onChange={(e) => setTourTurnLimit(Number(e.target.value) as TurnTimeLimit)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={tourStartLocal}
                    onChange={(e) => setTourStartLocal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Start Trigger Mode</label>
                  <select
                    value={tourStartMode}
                    onChange={(e) => setTourStartMode(e.target.value as 'auto' | 'manual')}
                    className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  >
                    <option value="auto">Automatic Start (on countdown 0)</option>
                    <option value="manual">Manual Start (Admin Trigger)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tourOpenNow}
                  onChange={(e) => setTourOpenNow(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>Open player registration immediately</span>
              </label>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                Create Scheduled Event
              </button>
            </form>

            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
              <h2 className="text-lg font-display font-bold text-white">Managed Events</h2>
              {tournaments.length === 0 ? (
                <p className="text-xs text-slate-400">No tournaments configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {tournaments.map((tour) => (
                    <div
                      key={tour.id}
                      className="p-4 rounded-xl bg-[#0A0D14] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">{tour.title}</div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums">
                          {(tour.includedGames || [tour.gameType]).join('+')} · Bo{tour.roundsPerMatch || 1} · {tour.turnTimeLimit || 20}s · {tour.startMode === 'auto' ? 'Auto-Start' : 'Manual'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(tour.startTime).toLocaleString()} · {tour.status} · {tour.participants.length}/{tour.maxPlayers} registered
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {tour.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleTournamentStatus(tour.id, 'registration')}
                            className="min-h-[36px] px-3 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-semibold cursor-pointer"
                          >
                            Open Registration
                          </button>
                        )}
                        {tour.status === 'registration' && (
                          <button
                            type="button"
                            onClick={() => handleStartTournament(tour.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Event Now</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTournament(tour.id)}
                          aria-label="Delete tournament"
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Profile Frame Manager & 512x512 PNG Template Generator */}
        {activeTab === 'frames' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-display font-bold text-white">
                    {editingFrame ? 'Edit Profile Frame' : 'Upload Profile Frame'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Design frames using our 512x512px transparent PNG template guide.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadSampleFrameTemplate}
                className="w-full min-h-[44px] px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample Frame Template (.png)</span>
              </button>

              <form onSubmit={handleSaveFrame} className="space-y-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Frame Name</label>
                  <input
                    type="text"
                    required
                    value={frameName}
                    onChange={(e) => setFrameName(e.target.value)}
                    placeholder="e.g. Emerald Apex Ring"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={frameDesc}
                    onChange={(e) => setFrameDesc(e.target.value)}
                    placeholder="Short decorative note"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Unlock Tier Requirement</label>
                  <select
                    value={frameTier}
                    onChange={(e) => setFrameTier(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  >
                    <option value="All">All Players (Unlocked)</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver+</option>
                    <option value="Gold">Gold+</option>
                    <option value="Platinum">Platinum+</option>
                    <option value="Diamond">Diamond+</option>
                    <option value="Master">Master+</option>
                    <option value="Grandmaster">Grandmaster+</option>
                    <option value="Mythic">Mythic Only</option>
                  </select>
                </div>

                {!editingFrame && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Upload Frame PNG (512x512)</label>
                    <label className="min-h-[46px] px-4 rounded-xl bg-[#0A0D14] border border-dashed border-white/20 hover:border-amber-400/50 text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer">
                      <ImagePlus className="w-4 h-4 text-amber-400" />
                      <span>{frameDataUrl ? 'PNG Loaded — Ready to Publish' : 'Choose Transparent PNG File'}</span>
                      <input type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleFrameFile} />
                    </label>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
                  >
                    {editingFrame ? 'Save Frame Edits' : 'Publish Frame'}
                  </button>
                  {editingFrame && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFrame(null);
                        setFrameName('');
                        setFrameDesc('');
                        setFrameTier('All');
                      }}
                      className="min-h-[44px] px-4 rounded-xl bg-white/10 text-xs font-semibold text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
              <h2 className="text-lg font-display font-bold text-white">Active & Custom Frames ({frames.length})</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {frames.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarWithFrame
                        avatarUrl={adminUser.avatarUrl}
                        frameId={f.id}
                        frames={frames}
                        displayName={f.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                        <div className="text-xs text-slate-400 truncate">Tier: {f.unlockTier}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFrame(f);
                          setFrameName(f.name);
                          setFrameDesc(f.description);
                          setFrameTier(f.unlockTier);
                        }}
                        aria-label={`Edit ${f.name}`}
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {f.id !== 'frame_none' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFrame(f.id)}
                          aria-label={`Delete ${f.name}`}
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Tab 6: Landing CMS */}
        {activeTab === 'cms' && (
          <form onSubmit={handleSaveCms} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <LayoutTemplate className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">{t.admin.cmsTitle}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{t.admin.cmsDesc}</p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={cmsSaving}
                  className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm cursor-pointer whitespace-nowrap"
                >
                  {cmsSaving ? t.profile.saving : t.admin.saveCms}
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Hero Headline (English)</label>
                  <input
                    type="text"
                    value={cmsDraft.heroTitleEn}
                    onChange={(e) => setCmsDraft((p) => ({ ...p, heroTitleEn: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Hero Headline (မြန်မာ)</label>
                  <input
                    type="text"
                    value={cmsDraft.heroTitleMy}
                    onChange={(e) => setCmsDraft((p) => ({ ...p, heroTitleMy: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Hero Subtitle (English)</label>
                  <textarea
                    rows={3}
                    value={cmsDraft.heroSubtitleEn}
                    onChange={(e) => setCmsDraft((p) => ({ ...p, heroSubtitleEn: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Hero Subtitle (မြန်မာ)</label>
                  <textarea
                    rows={3}
                    value={cmsDraft.heroSubtitleMy}
                    onChange={(e) => setCmsDraft((p) => ({ ...p, heroSubtitleMy: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-white/10">
                <img
                  src={cmsDraft.heroBannerUrl}
                  alt="Hero Banner"
                  className="w-40 h-24 rounded-xl object-cover border border-white/10 bg-[#0A0D14]"
                />
                <label className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs font-medium text-slate-200 flex items-center gap-2 cursor-pointer w-fit">
                  <ImagePlus className="w-4 h-4 text-amber-400" />
                  <span>Upload Hero Background Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleCmsImageUpload('hero', e)}
                  />
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              {(['connect4', 'ttt', 'rps', 'sakar_htar'] as GameType[]).map((gt) => {
                const g = cmsDraft.games[gt];
                return (
                  <div key={gt} className="p-5 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-[#0A0D14] border border-white/10 relative">
                      <img src={g.bannerUrl} alt={g.nameEn} className="w-full h-full object-cover" />
                    </div>
                    <label className="min-h-[40px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs text-slate-200 flex items-center justify-center gap-2 cursor-pointer">
                      <ImagePlus className="w-4 h-4 text-amber-400" />
                      <span>Upload {gt.toUpperCase()} Banner</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleCmsImageUpload(gt, e)}
                      />
                    </label>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Title (EN)</label>
                      <input
                        type="text"
                        value={g.nameEn}
                        onChange={(e) =>
                          setCmsDraft((p) => ({
                            ...p,
                            games: { ...p.games, [gt]: { ...p.games[gt], nameEn: e.target.value } },
                          }))
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Title (မြန်မာ)</label>
                      <input
                        type="text"
                        value={g.nameMy}
                        onChange={(e) =>
                          setCmsDraft((p) => ({
                            ...p,
                            games: { ...p.games, [gt]: { ...p.games[gt], nameMy: e.target.value } },
                          }))
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Description (EN)</label>
                      <textarea
                        rows={2}
                        value={g.taglineEn}
                        onChange={(e) =>
                          setCmsDraft((p) => ({
                            ...p,
                            games: { ...p.games, [gt]: { ...p.games[gt], taglineEn: e.target.value } },
                          }))
                        }
                        className="w-full p-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Description (မြန်မာ)</label>
                      <textarea
                        rows={2}
                        value={g.taglineMy}
                        onChange={(e) =>
                          setCmsDraft((p) => ({
                            ...p,
                            games: { ...p.games, [gt]: { ...p.games[gt], taglineMy: e.target.value } },
                          }))
                        }
                        className="w-full p-2.5 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </form>
        )}

        {/* Tab 7: Sakar-Htar Riddle Bank CRUD (စကားထာ) */}
        {activeTab === 'riddles' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveRiddle}
              className="lg:col-span-5 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-display font-bold text-white">
                    {editingRiddleId ? 'Edit Riddle' : 'Add New Riddle (စကားထာ)'}
                  </h2>
                </div>
                {editingRiddleId && (
                  <button
                    type="button"
                    onClick={resetRiddleForm}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Riddle Question (Myanmar Unicode)</label>
                <textarea
                  rows={2}
                  required
                  value={riddleQMy}
                  onChange={(e) => setRiddleQMy(e.target.value)}
                  placeholder="မြန်မာ့ရိုးရာ စကားထာ မေးခွန်း..."
                  className="w-full p-3 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white lang-my leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Optional English Hint / Translation</label>
                <input
                  type="text"
                  value={riddleHintEn}
                  onChange={(e) => setRiddleHintEn(e.target.value)}
                  placeholder="Short poetic clue in English"
                  className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-slate-300">4 Answer Options (A / B / C / D)</label>
                {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRiddleCorrectIdx(idx as 0 | 1 | 2 | 3)}
                      title="Mark as Official Answer"
                      className={`w-10 h-10 rounded-xl font-mono font-bold text-xs border shrink-0 cursor-pointer ${
                        riddleCorrectIdx === idx
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'bg-[#0A0D14] text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      required
                      value={riddleOpts[idx]}
                      onChange={(e) => {
                        const next: [string, string, string, string] = [...riddleOpts] as [
                          string,
                          string,
                          string,
                          string,
                        ];
                        next[idx] = e.target.value;
                        setRiddleOpts(next);
                      }}
                      placeholder={`Option ${letter}`}
                      className="flex-1 h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white lang-my"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-emerald-300">
                  Highlighted green letter ({['A', 'B', 'C', 'D'][riddleCorrectIdx]}) is the Official Answer (အဖြေမှန်).
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Explanation (မြန်မာ)</label>
                  <input
                    type="text"
                    value={riddleExpMy}
                    onChange={(e) => setRiddleExpMy(e.target.value)}
                    placeholder="အဖြေရှင်းလင်းချက်..."
                    className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white lang-my"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Explanation (English)</label>
                  <input
                    type="text"
                    value={riddleExpEn}
                    onChange={(e) => setRiddleExpEn(e.target.value)}
                    placeholder="Short explanation in English"
                    className="w-full h-10 px-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={riddleSaving}
                className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingRiddleId ? 'Save Riddle Changes' : 'Add Riddle to Bank'}</span>
              </button>
            </form>

            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-display font-bold text-white">
                    Sakar-Htar Riddle Bank ({riddles.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    10 unique riddles are randomly drawn for every Solo, Quick, or Custom Room match.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={riddleSearch}
                    onChange={(e) => setRiddleSearch(e.target.value)}
                    placeholder="Search riddles..."
                    className="h-10 pl-9 pr-3 rounded-xl bg-[#0A0D14] border border-white/10 text-xs text-white w-full sm:w-56"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredRiddles.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-xl border space-y-2 ${
                      editingRiddleId === r.id
                        ? 'bg-amber-500/10 border-amber-400/60'
                        : 'bg-[#0A0D14] border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-semibold text-white lang-my leading-relaxed">
                          <span className="font-mono text-amber-400 mr-2">#{idx + 1}</span>
                          {r.questionMy}
                        </div>
                        {r.hintEn && <div className="text-xs text-slate-400 italic">“{r.hintEn}”</div>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditRiddle(r)}
                          aria-label="Edit riddle"
                          className="min-h-[34px] min-w-[34px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRiddle(r.id)}
                          aria-label="Delete riddle"
                          className="min-h-[34px] min-w-[34px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                      {r.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-2.5 py-1.5 rounded-lg border lang-my ${
                            oIdx === r.correctIndex
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 font-semibold'
                              : 'bg-[#121826] border-white/5 text-slate-300'
                          }`}
                        >
                          <span className="font-mono mr-1.5 text-slate-400">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
