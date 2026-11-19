import './styles/cyberArena.css';
import './lib/serverlessApi.ts';
import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCheck,
  Clock,
  Gamepad2,
  LogOut,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { GAME_REGISTRY } from './games/registry.ts';
import { useArenaSocket } from './hooks/useArenaSocket.ts';
import { DEFAULT_LANDING_CONTENT } from './i18n/landingDefaults.ts';
import { TRANSLATIONS } from './i18n/translations.ts';
import {
  ACTIVE_USER_KEY,
  getPatchedLandingContent,
  readActiveSessionUser,
  saveActiveSessionUser,
} from './lib/serverlessApi.ts';
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

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh-safe cyber-bg text-white flex items-center justify-center p-4">
          <div className="max-w-sm w-full cyber-panel rounded-2xl border border-amber-500/40 p-6 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-base font-bold">Vanguard Auto-Recovery</h2>
            <p className="text-xs font-mono text-rose-300 break-words bg-[#070b14] p-2.5 rounded-xl">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('vanguard_token');
                sessionStorage.removeItem('vanguard_token');
                localStorage.removeItem(ACTIVE_USER_KEY);
                window.location.reload();
              }}
              className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ပြန်လည်စတင်မည် (Reset Session)</span>
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

function VanguardAppCore() {
  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window === 'undefined') return 'my';
    return localStorage.getItem('vanguard_lang') === 'en' ? 'en' : 'my';
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
  const [notiDrawerOpen, setNotiDrawerOpen] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [acknowledgingWarning, setAcknowledgingWarning] = React.useState(false);

  const t = TRANSLATIONS[lang];

  const handleChangeLang = React.useCallback((next: Language) => {
    setLang(next);
    if (typeof window !== 'undefined') localStorage.setItem('vanguard_lang', next);
  }, []);

  const handleLogout = React.useCallback(async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearStoredToken();
    setToken(null);
    setUser(null);
    setAdminViewMode('admin');
  }, [token]);

  const handleKicked = React.useCallback((reason: string) => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setAdminViewMode('admin');
    setKickBanner(reason);
  }, []);

  // Run initial bootstrap & session restore ONCE on mount (prevents overwriting fresh login state)
  React.useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const bootRes = await fetch('/api/bootstrap').catch(() => null);
        if (bootRes?.ok && active) {
          const boot = await bootRes.json();
          setPublicOnlineCount(Number(boot.onlineCount || 1));
          if (boot.landingContent) {
            setPublicLandingContent(getPatchedLandingContent(boot.landingContent as LandingContent));
          }
        }
        const initialToken = readStoredToken();
        if (initialToken && active) {
          const saved = readActiveSessionUser();
          if (saved) {
            setUser(
              initialToken === 'admin-token'
                ? saved
                : ({ ...saved, role: 'player', isAdmin: false } as UserProfile)
            );
          } else {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${initialToken}` },
            }).catch(() => null);
            if (meRes?.ok && active) {
              const me = await meRes.json();
              if (me.user) {
                setUser(
                  initialToken === 'admin-token'
                    ? me.user
                    : ({ ...me.user, role: 'player', isAdmin: false } as UserProfile)
                );
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
  }, []);

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

  const suspendedUntilMs = user?.suspendedUntil ? Date.parse(user.suspendedUntil) : 0;

  React.useEffect(() => {
    if (!suspendedUntilMs || suspendedUntilMs <= Date.now()) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suspendedUntilMs]);

  const handleAcknowledgeWarning = React.useCallback(
    async (warningId: string) => {
      setAcknowledgingWarning(true);
      try {
        await socket.dismissWarningLocal(warningId);
      } finally {
        setAcknowledgingWarning(false);
      }
    },
    [socket]
  );

  // ALWAYS declare all hooks (useMemo) BEFORE any conditional early return!
  const mergedLeaderboard = React.useMemo(() => {
    if (!user) return socket.leaderboard;
    const exists = socket.leaderboard.some((u) => u.id === user.id);
    return exists ? socket.leaderboard : [...socket.leaderboard, user];
  }, [socket.leaderboard, user]);

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
    if (rememberMe) localStorage.setItem('vanguard_token', nextToken);
    else sessionStorage.setItem('vanguard_token', nextToken);

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
    if (!res.ok) socket.pushToast('error', data.error || 'Unable to start bot match.');
    else if (data.match) socket.setActiveMatch(data.match);
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

  const handleStartSakarSolo = async () => {
    if (!token) return;
    const res = await fetch('/api/sakar/solo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.match) socket.setActiveMatch(data.match);
  };

  const handleCreateSakarRoom = async (title: string, maxPlayers: number, gameType: GameType = 'sakarhtar') => {
    if (!token) return;
    const res = await fetch('/api/sakar/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, maxPlayers, gameType }),
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
    else if (data.room) {
      socket.setRoomChat(data.room.chat || []);
      socket.setCurrentRoom(data.room);
    }
  };

  const handleLeaveSakarRoom = async () => {
    if (!token || !socket.currentRoom) return;
    await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/leave`, {
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
    if (data.match) {
      socket.setCurrentRoom(null);
      socket.setActiveMatch(data.match);
    }
  };

  const rootClass = lang === 'my' ? 'lang-my' : '';

  if (bootstrapping) {
    return (
      <div className={`min-h-dvh-safe cyber-bg flex items-center justify-center text-sm text-amber-300 ${rootClass}`}>
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
            <button type="button" onClick={() => setKickBanner(null)} className="text-rose-200 cursor-pointer">
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
        <Suspense
          fallback={
            <div className="min-h-screen cyber-bg flex items-center justify-center text-sm text-amber-300">
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
      className={`h-dvh lg:h-auto lg:min-h-dvh-safe overflow-hidden lg:overflow-visible cyber-bg text-slate-100 flex flex-col ${
        !socket.activeMatch ? 'pb-16 lg:pb-0' : ''
      } ${rootClass}`}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080c15]/90 backdrop-blur-md shrink-0">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('lobby')}
              className="vanguard-brand-box px-3 py-1 rounded-lg text-sm sm:text-base font-display font-extrabold tracking-wide text-sky-300 cursor-pointer shrink-0"
            >
              Vanguard
            </button>

            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'text-amber-300 bg-amber-500/10 border-b-2 border-amber-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isActualAdmin && (
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className="h-9 px-2.5 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setNotiDrawerOpen((v) => !v)}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-xl bg-[#0d1322] hover:bg-white/10 border border-white/10 text-amber-300 flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {socket.unreadNotiCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {socket.unreadNotiCount}
                </span>
              )}
            </button>

            <LanguageSwitcher lang={lang} onChange={handleChangeLang} />

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-[#0d1322] border border-emerald-500/25 text-emerald-300">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{socket.pingMs}ms</span>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-xl bg-[#0d1322] border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="cursor-pointer"
              title={user.displayName}
            >
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                frameId={user.frameId}
                frames={socket.frames}
                displayName={user.displayName}
                size="sm"
              />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-[#0d1322] hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer"
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
            className="bg-amber-500/15 border-b border-amber-400/40 px-4 py-2 shrink-0"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">{socket.announcement.title}:</span>
                <span className="text-slate-100 truncate">{socket.announcement.message}</span>
              </div>
              <button type="button" onClick={() => socket.setAnnouncement(null)} className="text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {suspendedUntilMs > nowTs && (
        <div className="bg-rose-500/15 border-b border-rose-500/40 px-4 py-1.5 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t.moderation.suspendedBannerTitle}
            </span>
            <span className="font-mono text-rose-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(suspendedUntilMs - nowTs)}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
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
            onlinePlayers={mergedLeaderboard}
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
            onJoin={() => socket.pushToast('success', 'Registered!')}
            onLeave={() => socket.pushToast('info', 'Withdrawn.')}
            onLaunchBracketMatch={() => {}}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView
            lang={lang}
            leaderboard={mergedLeaderboard}
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

      <AnimatePresence>
        {notiDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-3 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl cyber-panel border border-amber-400/40 p-3.5 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Bell className="w-4 h-4" /> Notifications ({socket.notifications.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={socket.markAllNotificationsRead}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Read All
                </button>
                <button type="button" onClick={() => setNotiDrawerOpen(false)} className="text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {socket.notifications.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  {lang === 'my' ? 'Notification အသစ် မရှိသေးပါ။' : 'No notifications yet.'}
                </div>
              ) : (
                socket.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      n.read ? 'bg-[#090d16] border-white/5 opacity-75' : 'bg-amber-500/10 border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">{n.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!socket.activeMatch && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-t border-amber-500/20">
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
                  <span className="text-[10px] font-semibold truncate max-w-full px-1">{item.label}</span>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl cyber-panel border border-amber-400/40 p-6 space-y-5 shadow-2xl">
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
                <div className="text-base font-bold text-white">{socket.pendingChallenge.from.displayName}</div>
                <div className="text-xs text-slate-400">
                  {GAME_REGISTRY[socket.pendingChallenge.gameType]?.nameMy}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => socket.respondChallenge(socket.pendingChallenge!.id, false)}
                className="min-h-[44px] rounded-xl bg-white/10 text-xs font-semibold text-white cursor-pointer"
              >
                {t.common.decline}
              </button>
              <button
                type="button"
                onClick={() => socket.respondChallenge(socket.pendingChallenge!.id, true)}
                className="min-h-[44px] rounded-xl cyber-cta-gold text-slate-950 text-xs font-bold cursor-pointer"
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
          <div className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/60 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {socket.pendingWarnings[0].title || 'Admin မှ အသိပေးစာ'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-Time Notification from Vanguard Admin</p>
              </div>
            </div>
            <div className="rounded-xl bg-[#070b14] border border-white/10 p-3.5 text-sm text-amber-100 leading-relaxed">
              {socket.pendingWarnings[0].reason}
            </div>
            <button
              type="button"
              disabled={acknowledgingWarning}
              onClick={() => handleAcknowledgeWarning(socket.pendingWarnings[0].id)}
              className="w-full min-h-[44px] rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer"
            >
              {acknowledgingWarning ? '...' : 'နားလည်ပါပြီ (OK)'}
            </button>
          </div>
        </div>
      )}

      <ToastStack toasts={socket.toasts} />
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <VanguardAppCore />
    </GlobalErrorBoundary>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ToastStack({ toasts }: { toasts: { id: string; level: string; message: string }[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 space-y-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className={`px-4 py-3 rounded-xl border text-xs font-medium shadow-xl pointer-events-auto flex items-center gap-2 ${
              t.level === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-100'
                : t.level === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                : 'bg-[#121a2d]/95 border-amber-400/35 text-slate-100'
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
