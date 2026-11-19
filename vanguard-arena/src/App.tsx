import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Globe,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Swords,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from './lib/firebase.ts';
import {
  buildPlayableMatch,
  readActiveSessionUser,
  saveActiveSessionUser,
} from './lib/serverlessApi.ts';
import { useArenaSocket } from './hooks/useArenaSocket.ts';
import type { GameType, Language, UserProfile } from './types.ts';
import { soundEngine } from './utils/sound.ts';
import { AdminPanel } from './components/AdminPanel.tsx';
import { LandingView } from './components/LandingView.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { MatchArena } from './components/MatchArena.tsx';
import { PlayerProfileModal } from './components/PlayerProfileModal.tsx';
import { VanguardCrestIcon } from './components/PremiumIcons.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { SocialHub } from './components/SocialHub.tsx';
import { TournamentView } from './components/TournamentView.tsx';

type ActiveTab = 'lobby' | 'tournaments' | 'leaderboard' | 'social' | 'profile' | 'admin';

export default function App() {
  const [lang, setLang] = React.useState<Language>('my');
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('arena_token'));
  const [user, setUser] = React.useState<UserProfile | null>(() => readActiveSessionUser());
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('lobby');
  const [inspectingUserId, setInspectingUserId] = React.useState<string | null>(null);
  const [chatTargetUserId, setChatTargetUserId] = React.useState<string | null>(null);

  // System Maintenance & Locks
  const [maintenance, setMaintenance] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(
    'စနစ်အဆင့်မြှင့်တင်နေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါ။'
  );
  const [liveFeatureLocks, setLiveFeatureLocks] = React.useState<Record<string, boolean>>({});

  // Notifications & Settings UI
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [notiOpen, setNotiOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [graphicsQuality, setGraphicsQuality] = React.useState<'low' | 'medium' | 'high'>('high');

  const isAdmin = Boolean(user && (user.role === 'admin' || token === 'admin-token'));

  const handleUserUpdate = React.useCallback((updated: UserProfile) => {
    setUser((prev) => {
      const merged = prev ? { ...prev, ...updated } : updated;
      saveActiveSessionUser(merged);
      return merged;
    });
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('arena_token');
    localStorage.removeItem('myanrena_active_user');
    setToken(null);
    setUser(null);
    setActiveTab('lobby');
    setSettingsOpen(false);
  }, []);

  const handleKicked = React.useCallback(
    (reason: string) => {
      alert(reason);
      handleLogout();
    },
    [handleLogout]
  );

  const socket = useArenaSocket({
    token,
    lang,
    onUserUpdate: handleUserUpdate,
    onKicked: handleKicked,
  });

  // Subscribe to System Config (Maintenance + Feature Locks) & Notifications
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubCfg = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setMaintenance(Boolean(d.maintenance));
        if (d.maintenanceMessage) setMaintenanceMessage(d.maintenanceMessage);
        if (d.featureLocks) setLiveFeatureLocks(d.featureLocks);
      }
    });

    const unsubNoti = onSnapshot(collection(db, 'notifications'), (snap) => {
      if (!user?.id) return;
      const list: any[] = [];
      snap.forEach((d) => {
        const n = d.data() as any;
        if (n.targetUserId === 'ALL' || n.targetUserId === user.id) {
          list.push({ id: d.id, ...n });
        }
      });
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setNotifications(list.slice(0, 25));
    });

    return () => {
      unsubCfg();
      unsubNoti();
    };
  }, [user?.id]);

  // Live Online Heartbeat
  React.useEffect(() => {
    if (!user?.id || !isFirebaseConfigured || !db) return;
    const beat = () => {
      setDoc(
        doc(db, 'users', user.id),
        { online: true, lastSeenMs: Date.now() },
        { merge: true }
      ).catch(() => {});
    };
    beat();
    const timer = window.setInterval(beat, 25000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  const handleAuthenticated = (
    authToken: string,
    profile: UserProfile,
    _remember?: boolean
  ) => {
    const isAd = authToken === 'admin-token' || profile.role === 'admin';
    const normalized: UserProfile = {
      ...profile,
      role: isAd ? 'admin' : 'user',
    };
    localStorage.setItem('arena_token', authToken);
    saveActiveSessionUser(normalized);
    setToken(authToken);
    setUser(normalized);
    setActiveTab(isAd ? 'admin' : 'lobby');
  };

  // Tournament Join / Leave Handlers (Firestore Real-time)
  const handleJoinTournament = async (tournamentId: string) => {
    if (!user?.id) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        participants: arrayUnion(user.id),
      }).catch(() => {});
    }
    soundEngine.playNotify();
    socket.pushToast(
      'success',
      lang === 'my' ? 'ပြိုင်ပွဲတွင် စာရင်းသွင်းပြီးပါပြီ!' : 'Registered for tournament!'
    );
  };

  const handleLeaveTournament = async (tournamentId: string) => {
    if (!user?.id) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        participants: arrayRemove(user.id),
      }).catch(() => {});
    }
    socket.pushToast(
      'info',
      lang === 'my' ? 'ပြိုင်ပွဲမှ နုတ်ထွက်ပြီးပါပြီ။' : 'Withdrawn from tournament.'
    );
  };

  // Play vs Bot / Create Room / Join Room
  const handlePlayBot = (gameType: GameType, difficulty: 'easy' | 'medium' | 'hard') => {
    if (!user) return;
    const match = buildPlayableMatch([user], {
      gameType,
      mode: 'bot',
      difficulty,
      bestOf: 3,
      turnTimeLimit: 20,
      isRealtimePvp: false,
    });
    socket.setActiveMatch(match);
  };

  const handleCreateRoom = async (gameType: GameType) => {
    if (!user) return;
    const roomId = `room_${Date.now()}`;
    const code = 'VG-' + Math.floor(1000 + Math.random() * 9000);
    const room = stripUndefined({
      id: roomId,
      code,
      gameType,
      hostId: user.id,
      maxPlayers: gameType === 'sakarhtar' ? 8 : 2,
      players: [user],
      status: 'waiting',
      activeMatchId: null,
      createdAtMs: Date.now(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'rooms', roomId), room).catch(() => {});
    }
    socket.setCurrentRoom(room);
    socket.pushToast('success', `Room Created! Code: ${code}`);
  };

  const handleJoinRoom = async (roomIdOrCode: string) => {
    if (!user) return;
    const target = socket.openRooms.find(
      (r) => r.id === roomIdOrCode || String(r.code).toUpperCase() === roomIdOrCode.toUpperCase()
    );
    if (!target) {
      socket.pushToast('error', lang === 'my' ? 'Room ရှာမတွေ့ပါ။' : 'Room not found.');
      return;
    }
    const existing = Array.isArray(target.players) ? target.players : [];
    const nextPlayers = existing.some((p: any) => p.id === user.id)
      ? existing
      : [...existing, user];

    if (nextPlayers.length >= 2) {
      const liveMatch = buildPlayableMatch(nextPlayers, {
        gameType: target.gameType,
        mode: 'room',
        bestOf: 3,
        turnTimeLimit: 20,
        isRealtimePvp: true,
      });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'matches', liveMatch.id), liveMatch).catch(() => {});
        await updateDoc(doc(db, 'rooms', target.id), {
          players: nextPlayers,
          status: 'playing',
          activeMatchId: liveMatch.id,
        }).catch(() => {});
      }
      socket.setActiveMatch(liveMatch);
    } else {
      socket.setCurrentRoom({ ...target, players: nextPlayers });
    }
  };

  const mergedLocks = { ...(socket.featureLocks || {}), ...(liveFeatureLocks || {}) };
  const unreadNotis = notifications.filter((n) => !n.read).length;

  // 1. Unauthenticated -> Landing Login View
  if (!token || !user) {
    return (
      <LandingView
        lang={lang}
        setLang={setLang}
        landingContent={socket.landingContent}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // 2. Maintenance Mode Screen (Regular Players Only)
  if (maintenance && !isAdmin) {
    return (
      <div className="min-h-dvh bg-[#070b14] text-white flex items-center justify-center p-6">
        <div className="cyber-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-amber-500/40">
          <Wrench className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-display font-bold text-white">System Maintenance</h1>
          <p className="text-sm text-slate-300">{maintenanceMessage}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="px-5 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Match Full-Screen Arena
  if (socket.activeMatch) {
    return (
      <MatchArena
        lang={lang}
        match={socket.activeMatch}
        currentUser={user}
        frames={socket.frames}
        matchChat={socket.matchChat}
        onMove={socket.sendMove}
        onForfeit={socket.forfeitMatch}
        onSendChat={socket.sendMatchChat}
        onExit={() => socket.setActiveMatch(null)}
        onRematch={() => {
          const g = socket.activeMatch?.gameType || 'connect4';
          handlePlayBot(g, 'medium');
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Cyber Esports Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080d18]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('lobby')}
            className="flex items-center gap-2 text-left cursor-pointer shrink-0"
          >
            <VanguardCrestIcon className="w-7 h-7" />
            <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white">
              VANGUARD <span className="text-amber-400">ARENA</span>
            </span>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {(
              [
                { id: 'lobby', label: lang === 'my' ? 'ကစားကွင်း' : 'Lobby', icon: Swords },
                { id: 'tournaments', label: lang === 'my' ? 'ပြိုင်ပွဲ' : 'Tournaments', icon: Trophy },
                { id: 'leaderboard', label: lang === 'my' ? 'အဆင့်ဇယား' : 'Ranks', icon: Shield },
                { id: 'social', label: lang === 'my' ? 'မိတ်ဆွေ' : 'Social', icon: MessageSquare },
                { id: 'profile', label: 'Profile', icon: User },
                ...(isAdmin ? [{ id: 'admin' as ActiveTab, label: 'Admin', icon: Shield }] : []),
              ] as Array<{ id: ActiveTab; label: string; icon: any }>
            ).map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    active
                      ? 'cyber-gold-active text-amber-200'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Utility Actions (Noti Bell, Lang, Settings) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNotiOpen((v) => !v)}
              className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotis > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadNotis}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLang((l) => (l === 'my' ? 'en' : 'my'))}
              className="px-2.5 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Live Global Broadcast Strip */}
      {socket.announcement?.message && (
        <div className="bg-amber-500/15 border-b border-amber-400/30 px-4 py-1.5 text-center text-xs text-amber-200">
          <span className="font-bold text-amber-300">{socket.announcement.title}: </span>
          <span>{socket.announcement.message}</span>
        </div>
      )}

      {/* Main Active View Content */}
      <main className="flex-1 pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'lobby' && (
              <LobbyView
                lang={lang}
                user={user}
                frames={socket.frames}
                featureLocks={mergedLocks}
                tournaments={socket.tournaments}
                onlinePlayers={socket.onlinePlayers}
                openRooms={socket.openRooms}
                queuedGame={socket.queuedGame}
                onQuickMatch={(g) => socket.joinQueue(g)}
                onCancelQueue={socket.leaveQueue}
                onPlayBot={handlePlayBot}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onInspectPlayer={(uid) => setInspectingUserId(uid)}
                onOpenTournaments={() => setActiveTab('tournaments')}
                onOpenProfile={() => setActiveTab('profile')}
                onNotify={socket.pushToast}
              />
            )}

            {activeTab === 'tournaments' && (
              <TournamentView
                lang={lang}
                tournaments={socket.tournaments}
                featureLocks={mergedLocks}
                currentUser={user}
                allUsers={socket.onlinePlayers}
                frames={socket.frames}
                onJoin={handleJoinTournament}
                onLeave={handleLeaveTournament}
                onInspectPlayer={(uid) => setInspectingUserId(uid)}
                onLaunchBracketMatch={() => {}}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                lang={lang}
                leaderboard={socket.leaderboard}
                currentUser={user}
                frames={socket.frames}
                onInspectPlayer={(uid) => setInspectingUserId(uid)}
              />
            )}

            {activeTab === 'social' && (
              <SocialHub
                lang={lang}
                token={token}
                currentUser={user}
                allUsers={socket.onlinePlayers}
                frames={socket.frames}
                incomingDMs={socket.incomingDMs}
                refreshTick={socket.socialRefreshTick}
                initialChatUserId={chatTargetUserId || undefined}
                onInspectPlayer={(uid) => setInspectingUserId(uid)}
                onChallenge={(uid, g) => socket.sendChallenge(uid, g)}
                onUserUpdated={handleUserUpdate}
                onNotify={socket.pushToast}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                lang={lang}
                token={token}
                user={user}
                frames={socket.frames}
                onUserUpdated={handleUserUpdate}
                onNotify={socket.pushToast}
              />
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminPanel
                lang={lang}
                token={token}
                currentUser={user}
                users={socket.onlinePlayers}
                tournaments={socket.tournaments}
                rooms={socket.openRooms}
                featureLocks={mergedLocks}
                onSwitchToLobby={() => setActiveTab('lobby')}
                onNotify={socket.pushToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080d18]/95 backdrop-blur-md border-t border-white/10 px-2 py-1.5 flex items-center justify-around">
        {(
          [
            { id: 'lobby', label: 'Arena', icon: Swords },
            { id: 'tournaments', label: 'Tourney', icon: Trophy },
            { id: 'leaderboard', label: 'Ranks', icon: Shield },
            { id: 'social', label: 'Social', icon: MessageSquare },
            { id: 'profile', label: 'Profile', icon: User },
            ...(isAdmin ? [{ id: 'admin' as ActiveTab, label: 'Admin', icon: Shield }] : []),
          ] as Array<{ id: ActiveTab; label: string; icon: any }>
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold cursor-pointer ${
                active ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Player Profile Inspection Modal (with Banner, Bio, Gifts & Multi-Game Duel) */}
      {inspectingUserId && (
        <PlayerProfileModal
          lang={lang}
          token={token}
          userId={inspectingUserId}
          currentUser={user}
          allUsers={socket.onlinePlayers}
          frames={socket.frames}
          onClose={() => setInspectingUserId(null)}
          onUserUpdated={handleUserUpdate}
          onOpenChatWith={(uid) => {
            setChatTargetUserId(uid);
            setActiveTab('social');
          }}
          onChallenge={(uid, g) => socket.sendChallenge(uid, g)}
          onNotify={socket.pushToast}
        />
      )}

      {/* Notification Inbox Drawer */}
      {notiOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end p-3">
          <div className="w-full max-w-sm cyber-panel rounded-2xl border border-amber-400/35 p-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>{lang === 'my' ? 'အသိပေးချက်များ' : 'Notifications'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setNotiOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pt-3">
              {notifications.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">
                  {lang === 'my' ? 'အသိပေးချက် မရှိသေးပါ။' : 'No notifications yet.'}
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-[#070b14] border border-white/10 space-y-1"
                  >
                    <div className="text-xs font-bold text-amber-300">{n.title}</div>
                    <div className="text-xs text-slate-200">{n.message}</div>
                    <div className="text-[10px] text-slate-500">
                      {n.senderName || 'Vanguard System'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm cyber-panel rounded-2xl border border-amber-400/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" /> Settings
              </h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#070b14] border border-white/10">
                <span className="font-bold text-white">Sound Effects</span>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="px-3 py-1 rounded-lg bg-white/10 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {muted ? 'Muted' : 'ON'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/10 space-y-2">
                <div className="font-bold text-white">Graphics Quality</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setGraphicsQuality(q)}
                      className={`h-8 rounded-lg font-bold uppercase cursor-pointer ${
                        graphicsQuality === q
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'my' ? 'အကောင့်မှ ထွက်မည် (Sign Out)' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Admin Warnings / Instant Messages Popup */}
      {socket.pendingWarnings.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm cyber-panel rounded-2xl border border-amber-400/60 p-5 space-y-3 text-center">
            <AlertTriangle className="w-9 h-9 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Admin Notice</h3>
            <p className="text-xs text-slate-200">{socket.pendingWarnings[0].reason}</p>
            <button
              type="button"
              onClick={() => socket.dismissWarningLocal(socket.pendingWarnings[0].id)}
              className="w-full h-9 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <div className="fixed top-16 right-3 z-50 space-y-2 max-w-xs w-full pointer-events-none">
        {socket.toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xl border backdrop-blur-md ${
              t.level === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                : t.level === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                : 'bg-slate-900/95 border-amber-400/40 text-amber-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
