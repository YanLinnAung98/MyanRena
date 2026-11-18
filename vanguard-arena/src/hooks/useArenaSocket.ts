import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import type {
  Difficulty,
  GameType,
  LandingContent,
  Language,
  TurnTimeLimit,
  UserProfile,
} from '../types.ts';

interface UseArenaSocketOptions {
  token: string | null;
  lang: Language;
  onUserUpdate: (user: UserProfile) => void;
  onKicked: (reason: string) => void;
}

const DEFAULT_FRAMES = [
  { id: 'bronze', name: 'Bronze Vanguard', minXp: 0 },
  { id: 'silver', name: 'Silver Striker', minXp: 1000 },
  { id: 'gold', name: 'Gold Champion', minXp: 1300 },
  { id: 'diamond', name: 'Diamond Sovereign', minXp: 1800 },
  { id: 'legend', name: 'Legend Mythic', minXp: 2500 },
];

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [pingMs, setPingMs] = useState<number>(24);
  const [landingContent, setLandingContent] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [frames] = useState<any[]>(DEFAULT_FRAMES);
  const [featureLocks, setFeatureLocks] = useState<Record<string, boolean>>({});
  const [matchmakingSettings, setMatchmakingSettings] = useState<any>({ maxWaitSec: 30, xpRange: 400 });
  const [onlinePlayers, setOnlinePlayers] = useState<UserProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [openRooms, setOpenRooms] = useState<any[]>([]);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);
  const [matchChat, setMatchChat] = useState<any[]>([]);
  const [roomChat, setRoomChat] = useState<any[]>([]);
  const [queuedGame, setQueuedGame] = useState<GameType | null>(null);
  const [queueStatus, setQueueStatus] = useState<any | null>(null);
  const [sakarQuickCount, setSakarQuickCount] = useState<number>(1);
  const [pendingChallenge, setPendingChallenge] = useState<any | null>(null);
  const [pendingWarnings, setPendingWarnings] = useState<{ id: string; reason: string }[]>([]);
  const [socialRefreshTick, setSocialRefreshTick] = useState<number>(0);
  const [incomingDMs] = useState<any[]>([]);
  const [toasts, setToasts] = useState<{ id: string; level: string; message: string }[]>([]);

  const pushToast = useCallback((level: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissWarningLocal = useCallback((warningId: string) => {
    setPendingWarnings((prev) => prev.filter((w) => w.id !== warningId));
  }, []);

  const setAdminSocketMode = useCallback((_mode: 'admin' | 'lobby') => {}, []);

  // Measure simulated/cloud ping
  useEffect(() => {
    if (!token) return;
    setConnectionState('connected');
    const timer = setInterval(() => {
      setPingMs(Math.floor(18 + Math.random() * 16));
    }, 5000);
    return () => clearInterval(timer);
  }, [token]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!token || !isFirebaseConfigured || !db) return;

    const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setLeaderboard(list);
      setOnlinePlayers(list);

      const uid = token === 'admin-token' ? 'admin_yanlinnaung' : token.replace(/^token_/, '');
      const me = list.find((u) => u.id === uid) as any;
      if (me) {
        if (me.status === 'banned' || me.status === 'suspended') {
          onKicked('Your account has been suspended or banned by an Administrator.');
        } else {
          onUserUpdate(me);
        }
      }
    });

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      setTournaments(list);
    });

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === 'waiting') list.push(data);
      });
      setOpenRooms(list);
    });

    const unsubLanding = onSnapshot(doc(db, 'system', 'landing'), (snap) => {
      if (snap.exists()) {
        setLandingContent(snap.data() as LandingContent);
      }
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const cfg = snap.data();
        if (cfg.featureLocks) setFeatureLocks(cfg.featureLocks);
        if (cfg.matchmakingSettings) setMatchmakingSettings(cfg.matchmakingSettings);
        if (cfg.announcement) {
          setAnnouncement({ title: 'Announcement', message: cfg.announcement });
        }
      }
    });

    return () => {
      unsubUsers();
      unsubTourneys();
      unsubRooms();
      unsubLanding();
      unsubConfig();
    };
  }, [token, onUserUpdate, onKicked]);

  const joinQueue = useCallback(
    (gameType: GameType, _bestOf?: 3 | 5, _turnTimeLimit?: TurnTimeLimit) => {
      setQueuedGame(gameType);
      setQueueStatus({ gameType, startedAt: Date.now() });
      pushToast('info', `Searching for ${gameType.toUpperCase()} opponent...`);
    },
    [pushToast]
  );

  const leaveQueue = useCallback(() => {
    setQueuedGame(null);
    setQueueStatus(null);
  }, []);

  const joinSakarQuick = useCallback(() => {
    setSakarQuickCount((c) => Math.min(8, c + 1));
    setQueueStatus({ gameType: 'sakarhtar', startedAt: Date.now() });
  }, []);

  const startSakarQuickNow = useCallback(() => {
    setQueueStatus(null);
    setQueuedGame(null);
  }, []);

  const sendMove = useCallback(
    async (move: any) => {
      if (!activeMatch) return;
      const nextMatch = { ...activeMatch, lastMove: move };
      setActiveMatch(nextMatch);
      if (isFirebaseConfigured && db && activeMatch.id) {
        await setDoc(doc(db, 'matches', activeMatch.id), nextMatch, { merge: true }).catch(() => {});
      }
    },
    [activeMatch]
  );

  const forfeitMatch = useCallback(() => {
    if (!activeMatch) return;
    setActiveMatch({ ...activeMatch, status: 'finished' });
    pushToast('info', 'Match forfeited.');
  }, [activeMatch, pushToast]);

  const sendMatchChat = useCallback((text: string) => {
    if (!text.trim()) return;
    setMatchChat((prev) => [...prev, { id: Date.now(), sender: 'You', text, time: Date.now() }]);
  }, []);

  const sendRoomChat = useCallback((text: string) => {
    if (!text.trim()) return;
    setRoomChat((prev) => [...prev, { id: Date.now(), sender: 'You', text, time: Date.now() }]);
  }, []);

  const sendChallenge = useCallback(
    (_targetUserId: string, gameType: GameType) => {
      pushToast('success', `Challenge sent for ${gameType.toUpperCase()}!`);
      setSocialRefreshTick((n) => n + 1);
    },
    [pushToast]
  );

  const respondChallenge = useCallback((_challengeId: string, accept: boolean) => {
    setPendingChallenge(null);
    if (accept) pushToast('success', 'Challenge accepted!');
  }, [pushToast]);

  return {
    connectionState,
    pingMs,
    landingContent,
    setLandingContent,
    announcement,
    setAnnouncement,
    frames,
    featureLocks,
    matchmakingSettings,
    onlinePlayers,
    leaderboard,
    tournaments,
    openRooms,
    activeMatch,
    setActiveMatch,
    currentRoom,
    setCurrentRoom,
    matchChat,
    roomChat,
    setRoomChat,
    queuedGame,
    queueStatus,
    sakarQuickCount,
    pendingChallenge,
    pendingWarnings,
    socialRefreshTick,
    incomingDMs,
    toasts,
    pushToast,
    dismissWarningLocal,
    setAdminSocketMode,
    joinQueue,
    leaveQueue,
    joinSakarQuick,
    startSakarQuickNow,
    sendMove,
    forfeitMatch,
    sendMatchChat,
    sendRoomChat,
    sendChallenge,
    respondChallenge,
  };
}
