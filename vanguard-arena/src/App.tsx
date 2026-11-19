import './lib/serverlessApi.ts';
import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  Clock,
  Gamepad2,
  LogOut,
  Megaphone,
  ShieldAlert,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { GAME_REGISTRY } from './games/registry.ts';
import { useArenaSocket } from './hooks/useArenaSocket.ts';
import { DEFAULT_LANDING_CONTENT } from './i18n/landingDefaults.ts';
import { TRANSLATIONS } from './i18n/translations.ts';
import { ACTIVE_USER_KEY, getPatchedLandingContent, readActiveSessionUser, saveActiveSessionUser } from './lib/serverlessApi.ts';
import type { Difficulty, GameType, LandingContent, Language, TurnTimeLimit, UserProfile } from './types.ts';
import { soundEngine } from './utils/sound.ts';
import { AvatarWithFrame } from './components/AvatarWithFrame.tsx';
import { LandingView } from './components/LandingView.tsx';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { MatchArena } from './components/MatchArena.tsx';
import { MatchmakingOverlay } from './components/MatchmakingOverlay.tsx';
import { SakarRoomLobby } from './components/SakarRoomLobby.tsx';
import { TournamentView } from './components/TournamentView.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { SocialHub } from './components/SocialHub.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { PlayerProfileModal } from './components/PlayerProfileModal.tsx';

const AdminPanel = React.lazy(() =>
  import('./components/AdminPanel.tsx').then((m) => ({ default: m.AdminPanel }))
);

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode; onSwitchToLobby: () => void; onLogout: () => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; onSwitchToLobby: () => void; onLogout: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Admin Panel Render Error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#121826] border border-amber-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-display font-bold text-white">Master Admin Recovery</h2>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-rose-500/30 text-xs font-mono text-rose-300 break-words">
              {this.state.errorMessage}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.props.onSwitchToLobby}
                className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                🎮 Game Lobby သို့သွားမည်
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
              >
                🔄 ပြန်ကြိုးစားမည်
              </button>
            </div>
            <button
              type="button"
              onClick={this.props.onLogout}
              className="w-full py-2 text-xs text-slate-400 hover:text-rose-300 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type LobbyTab = 'lobby' | 'tournaments' | 'leaderboard' | 'social' | 'profile';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vanguard_token') || sessionStorage.getItem('vanguard_token');
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vanguard_token');
  sessionStorage.removeItem('vanguard_token');
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export default function App() {
  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('vanguard_lang') === 'my' ? 'my' : 'en';
  });
  const [token, setToken] = React.useState<string | null>(readStoredToken);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const [publicOnlineCount, setPublicOnlineCount] = React.useState(1);
  const [publicLandingContent, setPublicLandingContent] = React.useState<LandingContent>(() =>
    getPatchedLandingContent(DEFAULT_LANDING_CONTENT)
  );
  const [activeTab, setActiveTab] = React.useState<LobbyTab>('lobby');
  const [adminViewMode, setAdminViewMode] = React.useState<'admin' | 'lobby'>('admin');
  const [muted, setMuted] = React.useState(soundEngine.isMuted());
  const [inspectUserId, setInspectUserId] = React.useState<string | null>(null);
  const [kickBanner, setKickBanner] = React.useState<string | null>(null);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [acknowledgingWarning, setAcknowledgingWarning] = React.useState(false);

  const t = TRANSLATIONS[lang];

  const handleChangeLang = React.useCallback((next: Language) => {
    setLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vanguard_lang', next);
    }
  }, []);

  const handleLogout = React.useCallback(async () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setAdminViewMode('admin');
  }, []);

  const handleKicked = React.useCallback((reason: string) => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setAdminViewMode('admin');
    setKickBanner(reason);
  }, []);

  React.useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const bootRes = await fetch('/api/bootstrap');
        if (bootRes.ok && active) {
          const boot = await bootRes.json();
          setPublicOnlineCount(Number(boot.onlineCount || 1));
          if (boot.landingContent) {
            setPublicLandingContent(getPatchedLandingContent(boot.landingContent as LandingContent));
          }
        }
        if (token) {
          const saved = readActiveSessionUser();
          if (saved && active) {
            const safeUser =
              token === 'admin-token'
                ? saved
                : ({ ...saved, role: 'player', isAdmin: false } as UserProfile);
            setUser(safeUser);
          } else {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok && active) {
              const me = await meRes.json();
              if (me.user) {
                const safeUser =
                  token === 'admin-token'
                    ? me.user
                    : ({ ...me.user, role: 'player', isAdmin: false } as UserProfile);
                setUser(safeUser);
              }
            } else if (active) {
              clearStoredToken();
              setToken(null);
            }
          }
        }
      } finally {
        if (active) setBootstrapping(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [token]);

  const socket = useArenaSocket({
    token: user ? token : null,
    lang,
    onUserUpdate: React.useCallback(
      (nextUser: UserProfile) => {
        const enforced =
          token === 'admin-token'
            ? nextUser
            : ({ ...nextUser, role: 'player', isAdmin: false } as UserProfile);
        setUser(enforced);
      },
      [token]
    ),
    onKicked: handleKicked,
  });

  const handleAuthenticated = (nextToken: string, nextUser: UserProfile, rememberMe: boolean) => {
    clearStoredToken();
    const isAdminAccount = nextToken === 'admin-token' && nextUser.username === 'yanlinnaung';
    const cleanProfile = {
      ...nextUser,
      role: isAdminAccount ? 'admin' : 'player',
      isAdmin: isAdminAccount,
      frameId: isAdminAccount ? 'legend' : nextUser.frameId || 'bronze',
    } as UserProfile;

    saveActiveSessionUser(cleanProfile);
    if (rememberMe) {
      localStorage.setItem('vanguard_token', nextToken);
    } else {
      sessionStorage.setItem('vanguard_token', nextToken);
    }
    setKickBanner(null);
    setToken(nextToken);
    setUser(cleanProfile);
    setActiveTab('lobby');
    setAdminViewMode(isAdminAccount ? 'admin' : 'lobby');
  };

  const toggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const suspendedUntilMs = user?.suspendedUntil ? Date.parse(user.suspendedUntil) : 0;

  React.useEffect(() => {
    if (!suspendedUntilMs || suspendedUntilMs <= Date.now()) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suspendedUntilMs]);

  const handleAcknowledgeWarning = React.useCallback(
    async (warningId: string) => {
      if (!token) return;
      setAcknowledgingWarning(true);
      try {
        socket.dismissWarningLocal(warningId);
      } finally {
        setAcknowledgingWarning(false);
      }
    },
    [token, socket]
  );

  const handleStartBot = async (
    gameType: GameType,
    difficulty: Difficulty,
    bestOf: 3 | 5 = 3,
    turnTimeLimit?: TurnTimeLimit
  ) => {
    if (!token) return;
    const res = await fetch('/api/matches/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gameType, difficulty, bestOf, turnTimeLimit }),
    });
    const data = await res.json();
    if (!res.ok) {
      socket.pushToast('error', data.error || 'Unable to start bot match.');
    } else if (data.match) {
      socket.setActiveMatch(data.match);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!token) return;
    await fetch('/api/social/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId }),
    });
    socket.pushToast('success', 'Friend request sent.');
  };

  const handleJoinTournament = async (id: string) => {
    if (!token) return;
    await fetch(`/api/tournaments/${id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    socket.pushToast('success', 'Registered for tournament!');
  };

  const handleLeaveTournament = async (id: string) => {
    if (!token) return;
    await fetch(`/api/tournaments/${id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    socket.pushToast('info', 'Withdrawn from tournament.');
  };

  const handleLaunchBracketMatch = async (tournamentId: string, bmId: string) => {
    if (!token) return;
    const res = await fetch(`/api/tournaments/${tournamentId}/matches/${bmId}/launch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.match) socket.setActiveMatch(data.match);
  };

  const handleStartSakarSolo = async () => {
    if (!token) return;
    const res = await fetch('/api/sakar/solo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.match) socket.setActiveMatch(data.match);
  };

  const handleCreateSakarRoom = async (title: string, maxPlayers: number) => {
    if (!token) return;
    const res = await fetch('/api/sakar/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, maxPlayers }),
    });
    const data = await res.json();
    if (data.room) {
      socket.setRoomChat([]);
      socket.setCurrentRoom(data.room);
    }
  };

  const handleJoinSakarRoom = async (codeOrId: string) => {
    if (!token) return;
    const res = await fetch('/api/sakar/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roomId: codeOrId }),
    });
    const data = await res.json();
    if (!res.ok) socket.pushToast('error', data.error || 'Unable to join room.');
    else if (data.room) socket.setCurrentRoom(data.room);
  };

  const handleLeaveSakarRoom = async () => {
    if (!token || !socket.currentRoom) return;
    const roomId = socket.currentRoom.id;
    await fetch(`/api/sakar/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    socket.setCurrentRoom(null);
    socket.setRoomChat([]);
  };

  const handleKickSakarRoomPlayer = async (targetUserId: string) => {
    if (!token || !socket.currentRoom) return;
    const res = await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: targetUserId }),
    });
    const data = await res.json();
    if (data.room) socket.setCurrentRoom(data.room);
  };

  const handleStartSakarRoomMatch = async () => {
    if (!token || !socket.currentRoom) return;
    const res = await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.match) socket.setActiveMatch(data.match);
  };

  const rootClass = lang === 'my' ? 'lang-my' : '';

  if (bootstrapping) {
    return (
      <div className={`min-h-dvh-safe bg-[#0A0D14] flex items-center justify-center text-sm text-slate-400 ${rootClass}`}>
        {t.common.loading}
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className={rootClass}>
        {kickBanner && (
          <div className="bg-rose-500/15 border-b border-rose-500/40 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-4">
            <span>{kickBanner}</span>
            <button
              type="button"
              onClick={() => setKickBanner(null)}
              className="text-rose-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <LandingView
          lang={lang}
          onChangeLang={handleChangeLang}
          onlineCount={publicOnlineCount}
          landingContent={publicLandingContent}
          onAuthenticated={handleAuthenticated}
        />
      </div>
    );
  }

  const isActualAdmin = token === 'admin-token' && user.role === 'admin';

  if (isActualAdmin && adminViewMode === 'admin') {
    return (
      <div className={rootClass}>
        <AdminErrorBoundary
          onSwitchToLobby={() => setAdminViewMode('lobby')}
          onLogout={handleLogout}
        >
          <Suspense
            fallback={
              <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center text-sm text-slate-400">
                {t.common.loading}
              </div>
            }
          >
            <AdminPanel
              token={token}
              adminUser={user}
              livePingMs={socket.pingMs}
              lang={lang}
              onChangeLang={handleChangeLang}
              onSwitchToLobby={() => setAdminViewMode('lobby')}
              landingContent={socket.landingContent}
              onLandingUpdated={socket.setLandingContent}
              onLogout={handleLogout}
              onNotify={socket.pushToast}
            />
          </Suspense>
        </AdminErrorBoundary>
        <ToastStack toasts={socket.toasts} />
      </div>
    );
  }

  const navItems: { id: LobbyTab; label: string; icon: React.ReactNode }[] = [
    { id: 'lobby', label: t.nav.lobby, icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'tournaments', label: t.nav.tournaments, icon: <Swords className="w-5 h-5" /> },
    { id: 'leaderboard', label: t.nav.leaderboard, icon: <Trophy className="w-5 h-5" /> },
    { id: 'social', label: t.nav.social, icon: <Users className="w-5 h-5" /> },
    { id: 'profile', label: t.nav.profile, icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div
      className={`min-h-dvh-safe bg-[#0A0D14] text-slate-100 flex flex-col ${
        !socket.activeMatch ? 'pb-safe-nav md:pb-0' : ''
      } ${rootClass}`}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0D14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2 sm:gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('lobby')}
            className="text-sm sm:text-lg font-display font-bold tracking-tight text-white truncate min-w-0 cursor-pointer"
          >
            {t.brandName}
          </button>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeTab === item.id
                    ? 'text-white border-amber-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isActualAdmin && (
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className="min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.nav.adminPanel}</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            <LanguageSwitcher lang={lang} onChange={handleChangeLang} />

            <div
              className="hidden sm:flex items-center gap-1.5 text-xs font-mono tabular-nums px-2.5 py-2 rounded-lg bg-[#121826] border border-white/10"
              title="Live server latency"
            >
              {socket.connectionState === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
              <span className="text-slate-300">{socket.pingMs}ms</span>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121826] hover:bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex items-center gap-2 cursor-pointer"
              title={t.nav.profile}
            >
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                frameId={user.frameId}
                frames={socket.frames}
                displayName={user.displayName}
                size="sm"
                status="online"
              />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              aria-label={t.nav.signOut}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121826] hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {socket.announcement && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-amber-500/15 border-b border-amber-400/40 px-4 py-3"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-amber-300">{socket.announcement.title}: </span>
                  <span className="text-slate-100">{socket.announcement.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => socket.setAnnouncement(null)}
                aria-label="Dismiss announcement"
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {suspendedUntilMs > nowTs && (
        <div className="bg-rose-500/15 border-b border-rose-500/40 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-rose-300">{t.moderation.suspendedBannerTitle}: </span>
                <span className="text-rose-100/90">{t.moderation.suspendedBannerDesc}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs font-mono tabular-nums text-rose-200">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {t.moderation.remainingTime}: {formatCountdown(suspendedUntilMs - nowTs)}
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {socket.activeMatch ? (
          <MatchArena
            lang={lang}
            token={token}
            match={socket.activeMatch}
            currentUser={user}
            frames={socket.frames}
            featureLocks={socket.featureLocks}
            chatMessages={socket.matchChat}
            onMove={socket.sendMove}
            onForfeit={socket.forfeitMatch}
            onSendChat={socket.sendMatchChat}
            onLeaveFinished={() => socket.setActiveMatch(null)}
            onNotify={socket.pushToast}
          />
        ) : activeTab === 'lobby' && socket.currentRoom ? (
          <SakarRoomLobby
            lang={lang}
            room={socket.currentRoom}
            currentUser={user}
            frames={socket.frames}
            featureLocks={socket.featureLocks}
            chatMessages={socket.roomChat}
            onLeaveRoom={handleLeaveSakarRoom}
            onStartMatch={handleStartSakarRoomMatch}
            onKickPlayer={handleKickSakarRoomPlayer}
            onSendChat={socket.sendRoomChat}
          />
        ) : activeTab === 'lobby' ? (
          <LobbyView
            lang={lang}
            landingContent={socket.landingContent}
            currentUser={user}
            onlinePlayers={socket.onlinePlayers}
            frames={socket.frames}
            featureLocks={socket.featureLocks}
            matchmakingSettings={socket.matchmakingSettings}
            queuedGame={socket.queuedGame}
            sakarQuickCount={socket.sakarQuickCount}
            openRooms={socket.openRooms}
            onStartBot={handleStartBot}
            onJoinQueue={socket.joinQueue}
            onLeaveQueue={socket.leaveQueue}
            onStartSakarSolo={handleStartSakarSolo}
            onJoinSakarQuick={socket.joinSakarQuick}
            onStartSakarQuickNow={socket.startSakarQuickNow}
            onCreateSakarRoom={handleCreateSakarRoom}
            onJoinSakarRoom={handleJoinSakarRoom}
            onSendChallenge={socket.sendChallenge}
            onInspectPlayer={(id) => setInspectUserId(id)}
            onAddFriend={handleAddFriend}
          />
        ) : activeTab === 'tournaments' ? (
          <TournamentView
            lang={lang}
            tournaments={socket.tournaments}
            featureLocks={socket.featureLocks}
            currentUser={user}
            frames={socket.frames}
            onJoin={handleJoinTournament}
            onLeave={handleLeaveTournament}
            onLaunchBracketMatch={handleLaunchBracketMatch}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView
            lang={lang}
            leaderboard={socket.leaderboard}
            currentUserId={user.id}
            currentUserRp={user.xp}
            frames={socket.frames}
            onInspectPlayer={(id) => setInspectUserId(id)}
          />
        ) : activeTab === 'social' ? (
          <SocialHub
            lang={lang}
            token={token}
            currentUser={user}
            frames={socket.frames}
            featureLocks={socket.featureLocks}
            refreshTick={socket.socialRefreshTick}
            incomingDMs={socket.incomingDMs}
            onInspectPlayer={(id) => setInspectUserId(id)}
            onChallenge={(id, gt) => socket.sendChallenge(id, gt)}
            onNotify={socket.pushToast}
          />
        ) : (
          <ProfileView
            lang={lang}
            token={token}
            user={user}
            frames={socket.frames}
            onUserUpdated={(updated) => {
              const enforced = isActualAdmin ? updated : { ...updated, role: 'player' as const, isAdmin: false };
              saveActiveSessionUser(enforced);
              setUser(enforced);
            }}
            onNotify={socket.pushToast}
          />
        )}
      </main>

      {!socket.activeMatch && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E131F]/95 backdrop-blur-md border-t border-white/10 safe-bottom-bar">
          <div className="grid grid-cols-5 h-16 items-center">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    active ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-1">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <AnimatePresence>
        {socket.queueStatus && !socket.activeMatch && (
          <MatchmakingOverlay
            lang={lang}
            queueStatus={socket.queueStatus}
            sakarCount={socket.sakarQuickCount}
            onCancel={socket.leaveQueue}
            onStartSakarNow={socket.startSakarQuickNow}
          />
        )}
      </AnimatePresence>

      {socket.pendingChallenge && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#121826] border border-amber-400/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <AvatarWithFrame
                avatarUrl={socket.pendingChallenge.from.avatarUrl}
                frameId={socket.pendingChallenge.from.frameId}
                frames={socket.frames}
                displayName={socket.pendingChallenge.from.displayName}
                size="md"
              />
              <div>
                <div className="text-xs font-semibold text-amber-400">{t.common.directChallenge}</div>
                <div className="text-base font-display font-bold text-white">
                  {socket.pendingChallenge.from.displayName}
                </div>
                <div className="text-xs text-slate-400">
                  {t.common.wantsToPlay}{' '}
                  {lang === 'my'
                    ? GAME_REGISTRY[socket.pendingChallenge.gameType].nameMy
                    : GAME_REGISTRY[socket.pendingChallenge.gameType].name}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => socket.respondChallenge(socket.pendingChallenge!.id, false)}
                className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
              >
                {t.common.decline}
              </button>
              <button
                type="button"
                onClick={() => socket.respondChallenge(socket.pendingChallenge!.id, true)}
                className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                {t.common.acceptMatch}
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectUserId && (
        <PlayerProfileModal
          lang={lang}
          token={token}
          userId={inspectUserId}
          currentUserId={user.id}
          frames={socket.frames}
          onClose={() => setInspectUserId(null)}
          onAddFriend={handleAddFriend}
          onChallenge={(id, gt) => socket.sendChallenge(id, gt)}
        />
      )}

      {socket.pendingWarnings.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-amber-400/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  {t.moderation.warningModalTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t.moderation.warningModalDesc}</p>
              </div>
            </div>
            <div className="rounded-xl bg-[#0A0D14] border border-white/10 p-3.5 text-sm text-amber-100">
              {socket.pendingWarnings[0].reason}
            </div>
            <button
              type="button"
              disabled={acknowledgingWarning}
              onClick={() => handleAcknowledgeWarning(socket.pendingWarnings[0].id)}
              className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              {acknowledgingWarning ? t.common.loading : t.moderation.warningAckBtn}
            </button>
          </div>
        </div>
      )}

      <ToastStack toasts={socket.toasts} />
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

function ToastStack({ toasts }: { toasts: { id: string; level: string; message: string }[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 space-y-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`px-4 py-3 rounded-xl border text-xs font-medium shadow-xl pointer-events-auto flex items-center gap-2 ${
              t.level === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-100'
                : t.level === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                : 'bg-[#161D2E]/95 border-white/15 text-slate-100'
            }`}
          >
            <Award className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
