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
  Megaphone,
  RotateCcw,
  Settings,
  ShieldAlert,
  Swords,
  Trophy,
  User,
  Users,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useArenaSocket } from './hooks/useArenaSocket.ts';
import { DEFAULT_LANDING_CONTENT } from './i18n/landingDefaults.ts';
import { TRANSLATIONS } from './i18n/translations.ts';
import { db, isFirebaseConfigured, stripUndefined } from './lib/firebase.ts';
import {
  ACTIVE_USER_KEY,
  buildPlayableMatch,
  getPatchedLandingContent,
  normalizeGameId,
  readActiveSessionUser,
  saveActiveSessionUser,
} from './lib/serverlessApi.ts';
import type {
  Difficulty,
  GameType,
  LandingContent,
  Language,
  Tournament,
  TurnTimeLimit,
  UserProfile,
} from './types.ts';
import { soundEngine } from './utils/sound.ts';
import { AvatarWithFrame } from './components/AvatarWithFrame.tsx';
import { GameArenaSetupView } from './components/GameArenaSetupView.tsx';
import { LandingView } from './components/LandingView.tsx';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { MatchArena } from './components/MatchArena.tsx';
import { MatchmakingOverlay } from './components/MatchmakingOverlay.tsx';
import { PlayerProfileModal } from './components/PlayerProfileModal.tsx';
import { VanguardCrestIcon } from './components/PremiumIcons.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { SakarRoomLobby } from './components/SakarRoomLobby.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { SocialHub } from './components/SocialHub.tsx';
import { TournamentView } from './components/TournamentView.tsx';

const AdminPanel = React.lazy(() =>
  import('./components/AdminPanel.tsx').then((m) => ({ default: m.AdminPanel }))
);

type LobbyTab = 'lobby' | 'tournaments' | 'leaderboard' | 'social' | 'profile';

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
        <div className="min-h-dvh cyber-bg text-white flex items-center justify-center p-4">
          <div className="max-w-sm w-full cyber-panel rounded-2xl border border-amber-500/40 p-6 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-base font-bold">Vanguard Auto-Recovery</h2>
            <p className="text-xs font-mono text-rose-300 break-words bg-[#070b14] p-2.5 rounded-xl">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ပြန်လည်စတင်မည် (Reload)</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('vanguard_token') ||
    sessionStorage.getItem('vanguard_token') ||
    localStorage.getItem('arena_token')
  );
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vanguard_token');
  sessionStorage.removeItem('vanguard_token');
  localStorage.removeItem('arena_token');
  localStorage.removeItem(ACTIVE_USER_KEY);
}

function safeChallengeGameName(rawType: string | undefined, lang: Language): string {
  const norm = normalizeGameId(rawType);
  if (norm === 'connect4') return lang === 'my' ? '၄ လုံးတန်း' : '4 in a Row';
  if (norm === 'tictactoe') return 'Tic-Tac-Toe';
  if (norm === 'rps') return lang === 'my' ? 'ကျောက်တုံး စက္ကူ ကတ်ကြေး' : 'Rock Paper Scissors';
  return lang === 'my' ? 'ဉာဏ်စမ်းပဟေဠိ' : 'Wise Owl Quiz';
}

function readSharedPlayerParam(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('player') || params.get('profile');
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
  const [selectedSetupGame, setSelectedSetupGame] = React.useState<GameType | null>(null);
  const [adminViewMode, setAdminViewMode] = React.useState<'admin' | 'lobby'>('admin');
  const [inspectUserId, setInspectUserId] = React.useState<string | null>(readSharedPlayerParam);
  const [initialChatUserId, setInitialChatUserId] = React.useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [kickBanner, setKickBanner] = React.useState<string | null>(null);
  const [notiDrawerOpen, setNotiDrawerOpen] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  // Direct Real-Time Firestore Mirrors
  const [liveUsers, setLiveUsers] = React.useState<UserProfile[]>([]);
  const [liveTournaments, setLiveTournaments] = React.useState<Tournament[]>([]);
  const [liveNotifications, setLiveNotifications] = React.useState<any[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<{ title: string; message: string } | null>(null);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(
    'စနစ်အဆင့်မြှင့်တင်နေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါ။'
  );
  const [liveFeatureLocks, setLiveFeatureLocks] = React.useState<Record<string, boolean>>({});

  const t = TRANSLATIONS[lang];

  const handleChangeLang = React.useCallback((next: Language) => {
    setLang(next);
    if (typeof window !== 'undefined') localStorage.setItem('vanguard_lang', next);
  }, []);

  const handleLogout = React.useCallback(async () => {
    soundEngine.stopAmbientMusic?.();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearStoredToken();
    setToken(null);
    setUser(null);
    setSelectedSetupGame(null);
    setAdminViewMode('admin');
  }, [token]);

  const handleKicked = React.useCallback((reason: string) => {
    soundEngine.stopAmbientMusic?.();
    clearStoredToken();
    setToken(null);
    setUser(null);
    setSelectedSetupGame(null);
    setAdminViewMode('admin');
    setKickBanner(reason);
  }, []);

  // Bootstrap Session
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
                : ({ ...saved, role: 'user', isAdmin: false } as UserProfile)
            );
          } else {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${initialToken}` },
            }).catch(() => null);
            if (meRes?.ok && active) {
              const me = await meRes.json();
              if (me.user) setUser(me.user);
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

  // Timestamp-guarded user update so stale socket state NEVER reverts a new displayName
  const mergeUserSafely = React.useCallback(
    (incoming: UserProfile) => {
      setUser((prev) => {
        if (prev && prev.id === incoming.id) {
          const prevTs = Number(prev.updatedAtMs || 0);
          const incTs = Number(incoming.updatedAtMs || 0);
          if (prevTs > incTs && incTs > 0) return prev;
          const merged = {
            ...prev,
            ...incoming,
            displayName: prevTs > incTs ? prev.displayName : incoming.displayName || prev.displayName,
            bio: prevTs > incTs ? prev.bio : incoming.bio ?? prev.bio,
          };
          const enforced =
            token === 'admin-token' ? merged : ({ ...merged, role: 'user', isAdmin: false } as UserProfile);
          saveActiveSessionUser(enforced);
          return enforced;
        }
        const enforced =
          token === 'admin-token' ? incoming : ({ ...incoming, role: 'user', isAdmin: false } as UserProfile);
        saveActiveSessionUser(enforced);
        return enforced;
      });
    },
    [token]
  );

  const socket = useArenaSocket({
    token: user ? token : null,
    lang,
    onUserUpdate: mergeUserSafely,
    onKicked: handleKicked,
  });

  // Real-Time Firestore Listeners (Users, Tournaments, Config, Announcements)
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubCfg = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setMaintenanceMode(Boolean(d.maintenance));
        if (d.maintenanceMessage) setMaintenanceMessage(d.maintenanceMessage);
        if (d.featureLocks) setLiveFeatureLocks(d.featureLocks);
      }
    });

    const unsubAnn = onSnapshot(doc(db, 'system', 'announcement'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setLiveAnnouncement(d?.message ? { title: d.title || 'Notice', message: d.message } : null);
      } else {
        setLiveAnnouncement(null);
      }
    });

    const unsubLanding = onSnapshot(doc(db, 'system', 'landing'), (snap) => {
      if (snap.exists()) {
        const next = getPatchedLandingContent(snap.data() as LandingContent);
        setPublicLandingContent(next);
        socket.setLandingContent?.(next);
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) } as UserProfile));
      list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      setLiveUsers(list);
    });

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) } as Tournament));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setLiveTournaments(list);
    });

    return () => {
      unsubCfg();
      unsubAnn();
      unsubLanding();
      unsubUsers();
      unsubTourneys();
    };
  }, []);

  // Direct Real-Time Listener on Logged-In User Document
  React.useEffect(() => {
    if (!user?.id || !isFirebaseConfigured || !db) return;

    const unsubMe = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (!snap.exists()) return;
      const latest = { id: snap.id, ...(snap.data() as any) } as UserProfile;
      if (latest.status === 'banned' && token !== 'admin-token') {
        handleKicked('Your account has been banned by an Administrator.');
        return;
      }
      mergeUserSafely(latest);
    });

    const unsubNotis = onSnapshot(collection(db, 'notifications'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const n = d.data() as any;
        if (n.targetUserId === 'ALL' || n.targetUserId === user.id) {
          list.push({ id: d.id, ...n });
        }
      });
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setLiveNotifications(list.slice(0, 30));
    });

    const beat = () => {
      setDoc(doc(db, 'users', user.id), { online: true, lastSeenMs: Date.now() }, { merge: true }).catch(() => {});
    };
    beat();
    const timer = window.setInterval(beat, 20000);

    return () => {
      unsubMe();
      unsubNotis();
      window.clearInterval(timer);
    };
  }, [user?.id, token, handleKicked, mergeUserSafely]);

  // Real-Time Firestore Sync for Active Tournament PvP Match + Auto Bracket Winner Recording
  const activeMatchId = socket.activeMatch?.id;
  React.useEffect(() => {
    if (!activeMatchId || !activeMatchId.startsWith('tmatch_') || !isFirebaseConfigured || !db) return;

    const unsubMatch = onSnapshot(doc(db, 'matches', activeMatchId), async (snap) => {
      if (!snap.exists()) return;
      const mData = { id: snap.id, ...(snap.data() as any) };
      socket.setActiveMatch(mData);

      // Auto-record winner into Tournament bracket when match finishes
      if (mData.status === 'finished' && mData.winnerId && mData.tournamentId && mData.matchupId) {
        const tSnap = await getDoc(doc(db, 'tournaments', mData.tournamentId)).catch(() => null);
        if (tSnap?.exists()) {
          const tData = tSnap.data() as Tournament;
          const matchups = Array.isArray(tData.matchups) ? tData.matchups : [];
          const targetM = matchups.find((x) => x.id === mData.matchupId);
          if (targetM && targetM.winnerId !== mData.winnerId) {
            const nextMatchups = matchups.map((x) =>
              x.id === mData.matchupId
                ? { ...x, winnerId: mData.winnerId, status: 'finished' as const }
                : x
            );
            await setDoc(
              doc(db, 'tournaments', mData.tournamentId),
              { matchups: nextMatchups },
              { merge: true }
            ).catch(() => {});
          }
        }
      }
    });

    return () => unsubMatch();
  }, [activeMatchId]);

  const suspendedUntilMs = (user as any)?.suspendedUntil ? Date.parse((user as any).suspendedUntil) : 0;

  React.useEffect(() => {
    if (!suspendedUntilMs || suspendedUntilMs <= Date.now()) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suspendedUntilMs]);

  const mergedUsers = React.useMemo(() => {
    const base = liveUsers.length > 0 ? liveUsers : Array.isArray(socket.leaderboard) ? socket.leaderboard : [];
    if (!user) return base;
    const exists = base.some((u) => u.id === user.id);
    return exists ? base.map((u) => (u.id === user.id ? { ...u, ...user } : u)) : [...base, user];
  }, [liveUsers, socket.leaderboard, user]);

  const mergedTournaments = React.useMemo(
    () => (liveTournaments.length > 0 ? liveTournaments : Array.isArray(socket.tournaments) ? socket.tournaments : []),
    [liveTournaments, socket.tournaments]
  );

  const mergedLocks = React.useMemo(
    () => ({ ...(socket.featureLocks || {}), ...(liveFeatureLocks || {}) }),
    [socket.featureLocks, liveFeatureLocks]
  );

  const handleAuthenticated = (nextToken: string, nextUser: UserProfile, rememberMe: boolean) => {
    clearStoredToken();
    const isAdminAccount = nextToken === 'admin-token' || nextUser.role === 'admin';
    const cleanProfile: UserProfile = {
      ...nextUser,
      role: isAdminAccount ? 'admin' : 'user',
      isAdmin: isAdminAccount,
      frameId: isAdminAccount ? 'legend' : nextUser.frameId || 'bronze',
    };

    saveActiveSessionUser(cleanProfile);
    if (rememberMe) localStorage.setItem('vanguard_token', nextToken);
    else sessionStorage.setItem('vanguard_token', nextToken);

    setKickBanner(null);
    setToken(nextToken);
    setUser(cleanProfile);
    setActiveTab('lobby');
    setSelectedSetupGame(null);
    setAdminViewMode(isAdminAccount ? 'admin' : 'lobby');
  };

  const handleUserProfileUpdated = React.useCallback(
    (updated: UserProfile) => {
      const isAd = token === 'admin-token' || user?.role === 'admin';
      const enforced: UserProfile = isAd
        ? { ...updated, role: 'admin', isAdmin: true }
        : { ...updated, role: 'user', isAdmin: false };
      saveActiveSessionUser(enforced);
      setUser(enforced);
      setLiveUsers((prev) => prev.map((u) => (u.id === enforced.id ? { ...u, ...enforced } : u)));
    },
    [token, user?.role]
  );

  /**
   * LAUNCH LIVE TOURNAMENT MATCH FOR JOINED PARTICIPANTS
   * Guarantees both opponents load the EXACT SAME Firestore `matches/{matchId}` document
   */
  const handleLaunchTournamentMatch = async (tournament: Tournament, matchupId?: string) => {
    if (!user) return;
    const normGame = normalizeGameId(tournament.gameType);
    const matchups = Array.isArray(tournament.matchups) ? tournament.matchups : [];

    // Locate user's matchup
    let targetMatchup = matchupId
      ? matchups.find((m) => m.id === matchupId)
      : matchups.find(
          (m) => (m.player1Id === user.id || m.player2Id === user.id) && m.status !== 'finished'
        );

    // Fallback if Admin toggled `ongoing` directly without seeding matchups
    if (!targetMatchup) {
      const otherParticipantId = (tournament.participants || []).find((pid) => pid !== user.id);
      if (!otherParticipantId) {
        socket.pushToast(
          'info',
          lang === 'my'
            ? 'ပြိုင်ဘက် နောက်တစ်ဦး စာရင်းသွင်းရန် စောင့်ဆိုင်းနေပါသည်။'
            : 'Waiting for an opponent to join the tournament.'
        );
        return;
      }
      const sortedPair = [user.id, otherParticipantId].sort();
      targetMatchup = {
        id: `auto_${sortedPair[0]}_${sortedPair[1]}`,
        round: 1,
        player1Id: sortedPair[0],
        player2Id: sortedPair[1],
        matchId: `tmatch_${tournament.id}_auto_${sortedPair[0]}_${sortedPair[1]}`,
        status: 'live',
      };
      if (isFirebaseConfigured && db) {
        await setDoc(
          doc(db, 'tournaments', tournament.id),
          { matchups: [...matchups, targetMatchup] },
          { merge: true }
        ).catch(() => {});
      }
    }

    if (!targetMatchup.player2Id) {
      socket.pushToast(
        'success',
        lang === 'my' ? 'သင်သည် ဤအဆင့်တွင် BYE ဖြင့် အလိုအလျောက် အနိုင်ရထားပါသည်။' : 'You received a BYE for this round!'
      );
      return;
    }

    const matchId = targetMatchup.matchId || `tmatch_${tournament.id}_${targetMatchup.id}`;

    // 1. Check if shared match document already exists in Firestore
    if (isFirebaseConfigured && db) {
      const existingSnap = await getDoc(doc(db, 'matches', matchId)).catch(() => null);
      if (existingSnap?.exists()) {
        socket.setActiveMatch({ id: existingSnap.id, ...(existingSnap.data() as any) });
        return;
      }
    }

    // 2. Otherwise build deterministic shared PvP match and persist to Firestore
    const p1 = mergedUsers.find((u) => u.id === targetMatchup!.player1Id) || user;
    const p2 = mergedUsers.find((u) => u.id === targetMatchup!.player2Id) || user;
    const built = buildPlayableMatch([p1 as any, p2 as any], {
      gameType: normGame,
      mode: 'tournament',
      bestOf: 3,
      turnTimeLimit: 20,
      isRealtimePvp: true,
    });

    const sharedMatch = stripUndefined({
      ...built,
      id: matchId,
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      matchupId: targetMatchup.id,
      round: targetMatchup.round || 1,
      isRealtimePvp: true,
      updatedAtMs: Date.now(),
    });

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'matches', matchId), sharedMatch).catch(() => {});
    }

    soundEngine.playNotify?.();
    socket.setActiveMatch(sharedMatch);
  };

  // Game Launchers
  const handleStartBot = async (
    gameType: GameType,
    difficulty: Difficulty,
    bestOf: 3 | 5 = 3,
    turnTimeLimit: TurnTimeLimit = 20
  ) => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/matches/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameType, difficulty, bestOf, turnTimeLimit }),
      });
      const data = await res.json();
      if (res.ok && data.match) {
        socket.setActiveMatch(data.match);
        setSelectedSetupGame(null);
        return;
      }
    } catch {}
    const fallbackMatch = buildPlayableMatch([user] as any, {
      gameType,
      mode: 'bot',
      difficulty,
      bestOf,
      turnTimeLimit,
      isRealtimePvp: false,
    });
    socket.setActiveMatch(fallbackMatch);
    setSelectedSetupGame(null);
  };

  const handleStartSakarSolo = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/sakar/solo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.match) {
        socket.setActiveMatch(data.match);
        setSelectedSetupGame(null);
        return;
      }
    } catch {}
    socket.setActiveMatch(buildPlayableMatch([user] as any, { gameType: 'sakarhtar', mode: 'solo' }));
    setSelectedSetupGame(null);
  };

  const handleCreateRoom = async (title: string, maxPlayers: number, gameType: GameType) => {
    if (!token || !user) return;
    if (mergedLocks.customRooms) {
      socket.pushToast('error', 'Custom Room ကို Admin မှ ယာယီပိတ်ထားပါသည်။');
      return;
    }
    try {
      const res = await fetch('/api/sakar/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, maxPlayers, gameType }),
      });
      const data = await res.json();
      if (data.room) {
        socket.setRoomChat([]);
        socket.setCurrentRoom(data.room);
        setSelectedSetupGame(null);
        return;
      }
    } catch {}
    socket.pushToast('error', 'Unable to create room.');
  };

  const handleJoinRoom = async (codeOrId: string) => {
    if (!token) return;
    if (mergedLocks.customRooms) {
      socket.pushToast('error', 'Custom Room ကို Admin မှ ယာယီပိတ်ထားပါသည်။');
      return;
    }
    try {
      const res = await fetch('/api/sakar/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: codeOrId }),
      });
      const data = await res.json();
      if (!res.ok) {
        socket.pushToast('error', data.error || 'Room ရှာမတွေ့ပါ။');
      } else if (data.room) {
        socket.setRoomChat(data.room.chat || []);
        socket.setCurrentRoom(data.room);
        setSelectedSetupGame(null);
      }
    } catch {
      socket.pushToast('error', 'Room ဝင်ရောက်၍ မရပါ။');
    }
  };

  const handleLeaveRoom = async () => {
    if (!token || !socket.currentRoom) return;
    await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    socket.setCurrentRoom(null);
    socket.setRoomChat([]);
  };

  const handleKickRoomPlayer = async (targetUserId: string) => {
    if (!token || !socket.currentRoom) return;
    const res = await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: targetUserId }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      if (data.room) socket.setCurrentRoom(data.room);
    }
  };

  const handleStartRoomMatch = async () => {
    if (!token || !socket.currentRoom) return;
    const res = await fetch(`/api/sakar/rooms/${socket.currentRoom.id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      if (data.match) {
        socket.setCurrentRoom(null);
        socket.setActiveMatch(data.match);
      }
    }
  };

  const handleJoinTournament = async (tid: string) => {
    if (!user) return;
    if (mergedLocks.tournaments) {
      socket.pushToast('error', 'ပြိုင်ပွဲစနစ်ကို Admin မှ ယာယီပိတ်ထားပါသည်။');
      return;
    }
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'tournaments', tid), { participants: arrayUnion(user.id) }).catch(() => {});
    }
    soundEngine.playNotify?.();
    socket.pushToast('success', 'ပြိုင်ပွဲစာရင်း သွင်းပြီးပါပြီ!');
  };

  const handleLeaveTournament = async (tid: string) => {
    if (!user) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'tournaments', tid), { participants: arrayRemove(user.id) }).catch(() => {});
    }
    socket.pushToast('info', 'ပြိုင်ပွဲစာရင်းမှ ထွက်ခွာပြီးပါပြီ။');
  };

  const markAllNotisRead = async () => {
    setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isFirebaseConfigured && db && user?.id) {
      for (const n of liveNotifications) {
        if (n.targetUserId === user.id && !n.read) {
          await setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true }).catch(() => {});
        }
      }
    }
  };

  const rootClass = lang === 'my' ? 'lang-my' : '';

  if (bootstrapping) {
    return (
      <div className={`min-h-dvh cyber-bg flex items-center justify-center text-sm text-amber-300 ${rootClass}`}>
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

  const isActualAdmin = token === 'admin-token' || user.role === 'admin';
  const safeFrames = Array.isArray(socket.frames) ? socket.frames : [];
  const safeMatchChat = Array.isArray(socket.matchChat) ? socket.matchChat : [];
  const safeRoomChat = Array.isArray(socket.roomChat) ? socket.roomChat : [];
  const safeRooms = Array.isArray(socket.openRooms) ? socket.openRooms : [];
  const safeWarnings = Array.isArray(socket.pendingWarnings) ? socket.pendingWarnings : [];
  const safeToasts = Array.isArray(socket.toasts) ? socket.toasts : [];
  const unreadNotiCount = liveNotifications.filter((n) => !n.read).length;
  const activeBannerAnnouncement = liveAnnouncement || socket.announcement;

  if (maintenanceMode && !isActualAdmin) {
    return (
      <div className={`min-h-dvh cyber-bg text-slate-100 flex items-center justify-center p-4 ${rootClass}`}>
        <div className="max-w-md w-full cyber-panel rounded-2xl border border-amber-400/50 p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <Wrench className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-display font-bold text-white">System Maintenance</h2>
          <p className="text-sm text-amber-100/90 leading-relaxed">{maintenanceMessage}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

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
            currentUser={user}
            livePingMs={socket.pingMs}
            lang={lang}
            onChangeLang={handleChangeLang}
            onSwitchToLobby={() => setAdminViewMode('lobby')}
            landingContent={publicLandingContent}
            onLandingUpdated={(next) => {
              setPublicLandingContent(next);
              socket.setLandingContent?.(next);
            }}
            onLogout={handleLogout}
            onNotify={socket.pushToast}
          />
        </Suspense>
        <ToastStack toasts={safeToasts} />
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
      className={`min-h-dvh cyber-bg text-slate-100 flex flex-col ${
        !socket.activeMatch ? 'pb-16 lg:pb-0' : ''
      } ${rootClass}`}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080c15]/90 backdrop-blur-md shrink-0">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('lobby');
                setSelectedSetupGame(null);
              }}
              className="flex items-center gap-2 text-sm sm:text-base font-display font-extrabold tracking-wide text-white cursor-pointer shrink-0"
            >
              <VanguardCrestIcon className="w-7 h-7" />
              <span>
                Vanguard <span className="text-amber-400">Arena</span>
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedSetupGame(null);
                    }}
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
              {unreadNotiCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotiCount}
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
              onClick={() => {
                setActiveTab('profile');
                setSelectedSetupGame(null);
              }}
              className="cursor-pointer"
              title={user.displayName}
            >
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                frameId={user.frameId}
                frames={safeFrames}
                displayName={user.displayName}
                size="sm"
              />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick?.();
                setSettingsOpen(true);
              }}
              aria-label="Settings"
              className="w-9 h-9 rounded-xl bg-[#0d1322] hover:bg-amber-500/20 border border-white/10 text-slate-200 hover:text-amber-300 flex items-center justify-center cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {activeBannerAnnouncement && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-amber-500/15 border-b border-amber-400/40 px-4 py-2 shrink-0"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">{activeBannerAnnouncement.title}:</span>
                <span className="text-slate-100 truncate">{activeBannerAnnouncement.message}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLiveAnnouncement(null);
                  socket.setAnnouncement?.(null);
                }}
                className="text-slate-300 cursor-pointer"
              >
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
              Account Suspended
            </span>
            <span className="font-mono text-rose-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(suspendedUntilMs - nowTs)}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0">
        {socket.activeMatch ? (
          <MatchArena
            lang={lang}
            token={token}
            match={socket.activeMatch}
            currentUser={user}
            frames={safeFrames}
            featureLocks={mergedLocks}
            chatMessages={safeMatchChat}
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
            frames={safeFrames}
            featureLocks={mergedLocks}
            chatMessages={safeRoomChat}
            onLeaveRoom={handleLeaveRoom}
            onStartMatch={handleStartRoomMatch}
            onKickPlayer={handleKickRoomPlayer}
            onSendChat={socket.sendRoomChat}
          />
        ) : activeTab === 'lobby' && selectedSetupGame ? (
          <GameArenaSetupView
            lang={lang}
            gameType={selectedSetupGame}
            featureLocks={mergedLocks}
            openRooms={safeRooms}
            queuedGame={socket.queuedGame}
            onBack={() => setSelectedSetupGame(null)}
            onJoinQueue={socket.joinQueue}
            onLeaveQueue={socket.leaveQueue}
            onStartBot={handleStartBot}
            onStartSakarSolo={handleStartSakarSolo}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        ) : activeTab === 'lobby' ? (
          <LobbyView
            lang={lang}
            landingContent={publicLandingContent}
            currentUserId={user.id}
            frames={safeFrames}
            featureLocks={mergedLocks}
            tournaments={mergedTournaments}
            allUsers={mergedUsers}
            onSelectGame={(g) => setSelectedSetupGame(g)}
            onInspectPlayer={(id) => setInspectUserId(id)}
            onOpenTournaments={() => setActiveTab('tournaments')}
            onEnterTournamentMatch={handleLaunchTournamentMatch}
          />
        ) : activeTab === 'tournaments' ? (
          <TournamentView
            lang={lang}
            tournaments={mergedTournaments}
            featureLocks={mergedLocks}
            currentUser={user}
            allUsers={mergedUsers}
            frames={safeFrames}
            onJoin={handleJoinTournament}
            onLeave={handleLeaveTournament}
            onInspectPlayer={(id) => setInspectUserId(id)}
            onLaunchBracketMatch={handleLaunchTournamentMatch}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView
            lang={lang}
            leaderboard={mergedUsers}
            currentUser={user}
            frames={safeFrames}
            onInspectPlayer={(id) => setInspectUserId(id)}
          />
        ) : activeTab === 'social' ? (
          <SocialHub
            lang={lang}
            token={token}
            currentUser={user}
            allUsers={mergedUsers}
            frames={safeFrames}
            featureLocks={mergedLocks}
            initialChatUserId={initialChatUserId}
            onClearInitialChat={() => setInitialChatUserId(null)}
            onUserUpdated={handleUserProfileUpdated}
            onInspectPlayer={(id) => setInspectUserId(id)}
            onChallenge={(id, gt) => socket.sendChallenge(id, gt)}
            onNotify={socket.pushToast}
          />
        ) : (
          <ProfileView
            lang={lang}
            token={token}
            user={user}
            frames={safeFrames}
            onUserUpdated={handleUserProfileUpdated}
            onNotify={socket.pushToast}
          />
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        lang={lang}
        onChangeLang={handleChangeLang}
        user={user}
        isAdmin={isActualAdmin}
        onOpenAdmin={() => setAdminViewMode('admin')}
        onLogout={handleLogout}
        onNotify={socket.pushToast}
      />

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
                <Bell className="w-4 h-4" /> Notifications ({liveNotifications.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllNotisRead}
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
              {liveNotifications.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  {lang === 'my' ? 'Notification အသစ် မရှိသေးပါ။' : 'No notifications yet.'}
                </div>
              ) : (
                liveNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      n.read ? 'bg-[#090d16] border-white/5 opacity-75' : 'bg-amber-500/10 border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">{n.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {n.createdAtMs
                          ? new Date(n.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
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
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedSetupGame(null);
                  }}
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
                frames={safeFrames}
                displayName={socket.pendingChallenge.from.displayName}
                size="md"
              />
              <div>
                <div className="text-xs font-semibold text-amber-400">{t.common.directChallenge}</div>
                <div className="text-base font-bold text-white">{socket.pendingChallenge.from.displayName}</div>
                <div className="text-xs text-slate-400">
                  {safeChallengeGameName(socket.pendingChallenge.gameType, lang)}
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
          currentUser={user}
          allUsers={mergedUsers}
          frames={safeFrames}
          onClose={() => {
            setInspectUserId(null);
            if (typeof window !== 'undefined' && window.location.search.includes('player=')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
          onUserUpdated={handleUserProfileUpdated}
          onOpenChatWith={(targetId) => {
            setInitialChatUserId(targetId);
            setActiveTab('social');
          }}
          onChallenge={(id, gt) => socket.sendChallenge(id, gt)}
          onNotify={socket.pushToast}
        />
      )}

      {safeWarnings.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/60 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" /> Admin Notice
            </h3>
            <div className="rounded-xl bg-[#070b14] border border-white/10 p-3.5 text-sm text-amber-100">
              {safeWarnings[0].reason}
            </div>
            <button
              type="button"
              onClick={() => socket.dismissWarningLocal(safeWarnings[0].id)}
              className="w-full min-h-[44px] rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer"
            >
              နားလည်ပါပြီ (OK)
            </button>
          </div>
        </div>
      )}

      <ToastStack toasts={safeToasts} />
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
  if (!toasts || toasts.length === 0) return null;
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
