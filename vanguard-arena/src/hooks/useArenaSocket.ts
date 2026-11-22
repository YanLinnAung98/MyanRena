import { useCallback, useEffect, useRef, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getShuffledQuizSet, QUIZ_BANK_100 } from '../data/quizBank100.ts';
import { db, firebaseInitError, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import {
  broadcastLocalSync,
  buildPlayableMatch,
  getPatchedLandingContent,
  normalizeGameId,
  readActiveSessionUser,
  readServerlessStore,
  saveActiveSessionUser,
  SYNC_CHANNEL_NAME,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import { detectClientDevice } from '../utils/deviceDetector.ts';
import { SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';
import type {
  GameType,
  LandingContent,
  Language,
  TurnTimeLimit,
  UserProfile,
} from '../types.ts';

export interface ArenaNotification {
  id: string;
  targetUserId: string;
  title: string;
  message: string;
  type: 'broadcast' | 'message' | 'warning';
  senderName: string;
  createdAtMs: number;
  read?: boolean;
}

interface UseArenaSocketOptions {
  token: string | null;
  lang: Language;
  onUserUpdate: (user: UserProfile) => void;
  onKicked: (reason: string) => void;
}

interface Connect4Result {
  winner: 'P1' | 'P2' | 'DRAW';
  winningCells: Array<[number, number]>;
}

const DISMISSED_NOTIS_KEY = 'vanguard_dismissed_notis_v1';

function readDismissedNotiIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDismissedNotiId(id: string) {
  try {
    const set = readDismissedNotiIds();
    set.add(id);
    localStorage.setItem(DISMISSED_NOTIS_KEY, JSON.stringify(Array.from(set).slice(-100)));
  } catch {}
}

function checkTTTWinner(board: Array<string | null>): 'X' | 'O' | 'DRAW' | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as 'X' | 'O';
  }
  return board.every((c) => c !== null) ? 'DRAW' : null;
}

function pickSmartTTTMove(board: Array<string | null>, difficulty: string): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
  if (empty.length === 0) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const mark of ['O', 'X']) {
    for (const [a, b, c] of lines) {
      const vals = [board[a], board[b], board[c]];
      if (vals.filter((v) => v === mark).length === 2 && vals.includes(null)) {
        if (board[a] === null) return a;
        if (board[b] === null) return b;
        if (board[c] === null) return c;
      }
    }
  }
  if (difficulty === 'hard' && board[4] === null) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
}

function checkConnect4Winner(grid: Array<Array<string | null>>): Connect4Result | null {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = grid[r]?.[c];
      if (!v) continue;

      if (c <= 3 && v === grid[r][c + 1] && v === grid[r][c + 2] && v === grid[r][c + 3]) {
        return {
          winner: v as 'P1' | 'P2',
          winningCells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]],
        };
      }
      if (r <= 2 && v === grid[r + 1][c] && v === grid[r + 2][c] && v === grid[r + 3][c]) {
        return {
          winner: v as 'P1' | 'P2',
          winningCells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]],
        };
      }
      if (r <= 2 && c <= 3 && v === grid[r + 1][c + 1] && v === grid[r + 2][c + 2] && v === grid[r + 3][c + 3]) {
        return {
          winner: v as 'P1' | 'P2',
          winningCells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]],
        };
      }
      if (r <= 2 && c >= 3 && v === grid[r + 1][c - 1] && v === grid[r + 2][c - 2] && v === grid[r + 3][c - 3]) {
        return {
          winner: v as 'P1' | 'P2',
          winningCells: [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]],
        };
      }
    }
  }
  const isFull = grid.every((row) => row.every((cell) => cell !== null));
  return isFull ? { winner: 'DRAW', winningCells: [] } : null;
}

function pickConnect4BotCol(grid: Array<Array<string | null>>, difficulty: string): number {
  const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => grid[0][c] === null);
  if (validCols.length === 0) return -1;

  const simulateDrop = (col: number, disc: 'P1' | 'P2') => {
    const copy = grid.map((r) => [...r]);
    for (let r = 5; r >= 0; r--) {
      if (copy[r][col] === null) {
        copy[r][col] = disc;
        return copy;
      }
    }
    return null;
  };

  // 1. နိုင်မည့်အကွက်ရှိလျှင် ချက်ချင်းယူမည်
  for (const col of validCols) {
    const sim = simulateDrop(col, 'P2');
    if (sim && checkConnect4Winner(sim)?.winner === 'P2') return col;
  }

  // 2. User နိုင်တော့မည့်အကွက်ကို ပိတ်မည်
  if (difficulty !== 'easy') {
    for (const col of validCols) {
      const sim = simulateDrop(col, 'P1');
      if (sim && checkConnect4Winner(sim)?.winner === 'P1') return col;
    }
  }

  // 3. အလယ်ကော်လံများကို ဦးစားပေးရွေးမည်
  const preferred = [3, 2, 4, 1, 5, 0, 6].filter((c) => validCols.includes(c));
  if (difficulty === 'hard' && Math.random() > 0.25) return preferred[0];
  if (difficulty === 'medium' && Math.random() > 0.55) return preferred[0];
  return validCols[Math.floor(Math.random() * validCols.length)];
}

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [cloudError, setCloudError] = useState<string | null>(firebaseInitError);
  const [pingMs, setPingMs] = useState<number>(20);
  const [landingContent, setLandingContent] = useState<LandingContent>(() => getPatchedLandingContent());
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [notifications, setNotifications] = useState<ArenaNotification[]>([]);
  const [frames] = useState<any[]>(SVG_FRAME_TEMPLATES);

  // Live Admin-Controlled System State
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    'Vanguard Arena ကို အဆင့်မြှင့်တင် ပြုပြင်နေပါသည်။ ခေတ္တစောင့်ဆိုင်းပေးပါ။'
  );
  const [featureLocks, setFeatureLocks] = useState<Record<string, boolean>>({});
  const [xpRules, setXpRules] = useState({ winXp: 75, drawXp: 25, lossXp: -20, quizCountPerMatch: 10 });
  const [matchmakingSettings, setMatchmakingSettings] = useState<any>({
    maxWaitSec: 30,
    botFallbackSec: 8,
    xpRange: 400,
    defaultTurnTime: 20,
  });

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
  const [pendingWarnings, setPendingWarnings] = useState<{ id: string; title?: string; reason: string }[]>([]);
  const [socialRefreshTick, setSocialRefreshTick] = useState<number>(0);
  const [incomingDMs] = useState<any[]>([]);
  const [toasts, setToasts] = useState<{ id: string; level: string; message: string }[]>([]);

  const queueTimerRef = useRef<number | null>(null);
  const queueRoomIdRef = useRef<string | null>(null);
  const botTimersRef = useRef<number[]>([]);
  const xpAwardedMatchRef = useRef<string | null>(null);
  const alertedNotiIdsRef = useRef<Set<string>>(new Set());
  const sessionStartedAtRef = useRef<number>(Date.now());
  const xpRulesRef = useRef(xpRules);
  xpRulesRef.current = xpRules;

  const clearBotTimers = useCallback(() => {
    botTimersRef.current.forEach((id) => window.clearTimeout(id));
    botTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (!activeMatch) clearBotTimers();
    return () => clearBotTimers();
  }, [activeMatch?.id, clearBotTimers]);

  const pushToast = useCallback((level: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const resolveCurrentPlayer = useCallback(() => {
    const store = readServerlessStore();
    if (token === 'admin-token') return store.users.admin_yanlinnaung;
    const saved = readActiveSessionUser();
    if (saved) return saved;
    if (token) {
      const uid = token.replace(/^token_/, '').replace(/^local_/, '');
      if (store.users[uid]) return store.users[uid];
    }
    return null;
  }, [token]);

  const dismissWarningLocal = useCallback(async (notiId: string) => {
    addDismissedNotiId(notiId);
    setPendingWarnings((prev) => prev.filter((w) => w.id !== notiId));
    setNotifications((prev) => prev.map((n) => (n.id === notiId ? { ...n, read: true } : n)));
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'notifications', notiId), { read: true }).catch(() => {});
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    notifications.forEach((n) => addDismissedNotiId(n.id));
    setPendingWarnings([]);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const setAdminSocketMode = useCallback((_mode: 'admin' | 'lobby') => {}, []);

  const applyXpDelta = useCallback(
    async (outcome: 'win' | 'loss' | 'draw', matchId?: string) => {
      if (matchId && xpAwardedMatchRef.current === matchId) return;
      if (matchId) xpAwardedMatchRef.current = matchId;

      const player = resolveCurrentPlayer();
      if (!player) return;

      const rules = xpRulesRef.current;
      const delta =
        outcome === 'win' ? rules.winXp : outcome === 'draw' ? rules.drawXp : rules.lossXp;
      const nextXp = Math.max(0, (player.xp || 1000) + delta);
      const nextRank =
        nextXp >= 2500
          ? 'Legend'
          : nextXp >= 1900
          ? 'Diamond'
          : nextXp >= 1300
          ? 'Gold'
          : nextXp >= 1000
          ? 'Silver'
          : 'Bronze';

      const updated = stripUndefined({
        ...player,
        xp: nextXp,
        rank: nextRank,
        wins: (player.wins || 0) + (outcome === 'win' ? 1 : 0),
        losses: (player.losses || 0) + (outcome === 'loss' ? 1 : 0),
        draws: (player.draws || 0) + (outcome === 'draw' ? 1 : 0),
        lastSeenMs: Date.now(),
      });

      saveActiveSessionUser(updated);
      onUserUpdate(updated);

      if (isFirebaseConfigured && db && updated.id) {
        await setDoc(doc(db, 'users', updated.id), updated, { merge: true }).catch(() => {});
      }
    },
    [resolveCurrentPlayer, onUserUpdate]
  );

  // 1. Live Device Heartbeat
  useEffect(() => {
    if (!token) return;
    const me = resolveCurrentPlayer();
    if (!me?.id) return;

    const pushHeartbeat = async (isOnline: boolean) => {
      const dev = detectClientDevice();
      const activity = activeMatch
        ? `Playing ${normalizeGameId(activeMatch.gameType).toUpperCase()}`
        : currentRoom
        ? `In Room ${currentRoom.code || ''}`
        : 'In Game Lobby';

      const payload = stripUndefined({
        ...me,
        ...dev,
        online: isOnline,
        currentActivity: activity,
        lastSeenMs: Date.now(),
      });

      const store = readServerlessStore();
      store.users[me.id] = { ...(store.users[me.id] || {}), ...payload };
      writeServerlessStore(store);
      broadcastLocalSync('HEARTBEAT');

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'users', me.id), payload, { merge: true });
          setCloudError(null);
          setConnectionState('connected');
        } catch (err: any) {
          setCloudError(err?.message || 'Firestore Write Error');
        }
      }
    };

    pushHeartbeat(true);
    const intervalId = window.setInterval(() => {
      setPingMs(Math.floor(15 + Math.random() * 14));
      pushHeartbeat(true);
    }, 15000);

    const handleBeforeUnload = () => pushHeartbeat(false);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, activeMatch?.id, currentRoom?.id, resolveCurrentPlayer]);

  // 2. Real-Time Platform Subscriptions
  useEffect(() => {
    if (!token) return;
    const myId = token === 'admin-token' ? 'admin_yanlinnaung' : token.replace(/^token_/, '').replace(/^local_/, '');

    const processNotifications = (rawList: ArenaNotification[]) => {
      const dismissed = readDismissedNotiIds();
      const mine = rawList
        .filter((n) => n.targetUserId === 'ALL' || n.targetUserId === myId)
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
        .map((n) => ({
          ...n,
          read: Boolean(n.read || dismissed.has(n.id)),
        }));

      setNotifications(mine);

      if (token !== 'admin-token') {
        const latestBroadcast = mine.find((n) => n.type === 'broadcast' && !n.read);
        if (latestBroadcast) {
          setAnnouncement({ title: latestBroadcast.title, message: latestBroadcast.message });
        }

        const unreadPopups = mine.filter((n) => !n.read);
        if (unreadPopups.length > 0) {
          setPendingWarnings(
            unreadPopups.map((u) => ({
              id: u.id,
              title: u.title,
              reason: u.message,
            }))
          );
          const newest = unreadPopups[0];
          if (!alertedNotiIdsRef.current.has(newest.id)) {
            alertedNotiIdsRef.current.add(newest.id);
            soundEngine.playNotify?.();
            pushToast('info', `📢 ${newest.title}: ${newest.message}`);
          }
        }
      }
    };

    const syncLocalFallback = () => {
      const store = readServerlessStore();
      const allUsers = Object.values(store.users).sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
      setLeaderboard(allUsers as UserProfile[]);
      setOnlinePlayers(allUsers as UserProfile[]);
      processNotifications(store.notifications || []);
    };

    syncLocalFallback();

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.onmessage = () => syncLocalFallback();
      }
    } catch {}
    window.addEventListener('storage', syncLocalFallback);

    if (!isFirebaseConfigured || !db) {
      return () => {
        window.removeEventListener('storage', syncLocalFallback);
        channel?.close();
      };
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setCloudError(null);
        setConnectionState('connected');
        const list: UserProfile[] = [];
        const store = readServerlessStore();
        snap.forEach((d) => {
          const u = d.data() as any;
          if (u?.id) {
            list.push(u as UserProfile);
            store.users[u.id] = u;
          }
        });
        list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        writeServerlessStore(store);

        setLeaderboard(list);
        setOnlinePlayers(list);

        if (token !== 'admin-token') {
          const me = list.find((u) => u.id === myId) as any;
          if (me) {
            const kickedByAdmin =
              me.forceLogoutAt && Number(me.forceLogoutAt) > sessionStartedAtRef.current;
            if (me.status === 'banned') {
              onKicked('သင့်အကောင့်ကို Admin မှ အပြီးပိတ်သိမ်း (Ban) ထားပါသည်။');
            } else if (me.status === 'suspended') {
              const until = me.suspendedUntil ? Date.parse(me.suspendedUntil) : 0;
              if (!until || until > Date.now()) {
                onKicked('သင့်အကောင့်ကို Admin မှ ယာယီပိတ်ထား (Suspended) ပါသည်။');
              } else {
                onUserUpdate({ ...me, status: 'active', role: 'player', isAdmin: false });
              }
            } else if (kickedByAdmin) {
              onKicked('Admin မှ သင့် Session ကို ချက်ချင်းထုတ်ပယ် (Kick) လိုက်ပါသည်။');
            } else {
              onUserUpdate({ ...me, role: 'player', isAdmin: false });
            }
          }
        }
      },
      (err) => setCloudError(err.message)
    );

    const unsubNotis = onSnapshot(collection(db, 'notifications'), (snap) => {
      const list: ArenaNotification[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as ArenaNotification), id: d.id }));
      const store = readServerlessStore();
      store.notifications = list;
      writeServerlessStore(store);
      processNotifications(list);
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const cfg = snap.data() as any;
        setMaintenanceMode(Boolean(cfg.maintenanceMode));
        if (cfg.maintenanceMessage) setMaintenanceMessage(cfg.maintenanceMessage);
        if (cfg.featureLocks) setFeatureLocks(cfg.featureLocks);
        if (cfg.xpRules) setXpRules((prev) => ({ ...prev, ...cfg.xpRules }));
        if (cfg.matchmakingSettings) setMatchmakingSettings((prev: any) => ({ ...prev, ...cfg.matchmakingSettings }));
      }
    });

    const unsubLanding = onSnapshot(doc(db, 'system', 'landing'), (snap) => {
      if (snap.exists()) {
        setLandingContent(getPatchedLandingContent(snap.data() as LandingContent));
      }
    });

    const unsubRiddles = onSnapshot(collection(db, 'riddles'), (snap) => {
      const custom: any[] = [];
      snap.forEach((d) => custom.push({ ...d.data(), id: d.id }));
      const store = readServerlessStore();
      store.riddles = [...custom, ...QUIZ_BANK_100];
      writeServerlessStore(store);
    });

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
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

    return () => {
      window.removeEventListener('storage', syncLocalFallback);
      channel?.close();
      unsubUsers();
      unsubNotis();
      unsubConfig();
      unsubLanding();
      unsubRiddles();
      unsubTourneys();
      unsubRooms();
    };
  }, [token, onUserUpdate, onKicked, pushToast]);

  // 3. Real-Time Room Sync
  useEffect(() => {
    if (!currentRoom?.id || !isFirebaseConfigured || !db) return;
    const roomId = currentRoom.id;

    const unsubRoom = onSnapshot(doc(db, 'rooms', roomId), async (snap) => {
      if (!snap.exists()) {
        setCurrentRoom(null);
        return;
      }
      const latestRoom = snap.data() as any;
      setCurrentRoom(latestRoom);
      if (Array.isArray(latestRoom.chat)) setRoomChat(latestRoom.chat);

      if (latestRoom.status === 'playing' && latestRoom.activeMatchId) {
        const matchSnap = await getDoc(doc(db, 'matches', latestRoom.activeMatchId)).catch(() => null);
        if (matchSnap && matchSnap.exists()) {
          setCurrentRoom(null);
          setQueueStatus(null);
          setQueuedGame(null);
          setMatchChat([]);
          setActiveMatch(matchSnap.data());
        }
      }
    });

    return () => unsubRoom();
  }, [currentRoom?.id]);

  // 4. Real-Time Active Match Sync
  useEffect(() => {
    if (!activeMatch?.id || !activeMatch?.isRealtimePvp || !isFirebaseConfigured || !db) return;
    const matchId = activeMatch.id;
    const me = resolveCurrentPlayer();

    const unsubMatch = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (!snap.exists()) return;
      const latest = snap.data() as any;
      setActiveMatch(latest);
      if (Array.isArray(latest.chat)) setMatchChat(latest.chat);

      if (latest.status === 'finished' && me?.id) {
        if (latest.isDraw) applyXpDelta('draw', matchId);
        else if (latest.winnerId) applyXpDelta(latest.winnerId === me.id ? 'win' : 'loss', matchId);
      }
    });

    return () => unsubMatch();
  }, [activeMatch?.id, activeMatch?.isRealtimePvp, resolveCurrentPlayer, applyXpDelta]);

  // 5. Matchmaking Queue
  const joinQueue = useCallback(
    async (rawGameType: GameType, bestOf: 3 | 5 = 3, turnTimeLimit: TurnTimeLimit = 20) => {
      if (featureLocks.matchmaking) {
        pushToast('error', 'Matchmaking ကို Admin မှ ယာယီပိတ်ထားပါသည်။');
        return;
      }
      const gameType = normalizeGameId(rawGameType);
      const player = resolveCurrentPlayer();
      if (!player) return;
      setQueuedGame(rawGameType);
      setQueueStatus({ gameType: rawGameType, startedAt: Date.now() });

      if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);

      if (isFirebaseConfigured && db) {
        try {
          const snap = await getDocs(collection(db, 'rooms'));
          let waitingRoom: any = null;
          snap.forEach((d) => {
            const r = d.data();
            if (
              r.status === 'waiting' &&
              r.isMatchmaking === true &&
              normalizeGameId(r.gameType) === gameType &&
              Array.isArray(r.players) &&
              r.players.length === 1 &&
              r.players[0].id !== player.id
            ) {
              waitingRoom = r;
            }
          });

          if (waitingRoom) {
            const twoPlayers = [waitingRoom.players[0], player];
            const liveMatch = buildPlayableMatch(twoPlayers, {
              gameType,
              mode: 'matchmaking',
              bestOf,
              turnTimeLimit,
              isRealtimePvp: true,
            });
            await setDoc(doc(db, 'matches', liveMatch.id), stripUndefined(liveMatch));
            await updateDoc(doc(db, 'rooms', waitingRoom.id), {
              players: stripUndefined(twoPlayers),
              status: 'playing',
              activeMatchId: liveMatch.id,
            });
            setQueuedGame(null);
            setQueueStatus(null);
            setMatchChat([]);
            setActiveMatch(liveMatch);
            pushToast('success', 'Real opponent found!');
            return;
          }

          const ticketId = `mm_${Date.now()}_${player.id}`;
          queueRoomIdRef.current = ticketId;
          const ticketRoom = stripUndefined({
            id: ticketId,
            code: 'MM-' + Math.floor(1000 + Math.random() * 9000),
            gameType,
            isMatchmaking: true,
            hostId: player.id,
            maxPlayers: 2,
            players: [player],
            status: 'waiting',
            activeMatchId: null,
          });
          await setDoc(doc(db, 'rooms', ticketId), ticketRoom);
          setCurrentRoom(ticketRoom);
        } catch {}
      }

      const fallbackMs = Math.max(3000, (Number(matchmakingSettings.botFallbackSec) || 8) * 1000);
      queueTimerRef.current = window.setTimeout(async () => {
        if (queueRoomIdRef.current && isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
          queueRoomIdRef.current = null;
        }
        setCurrentRoom(null);
        setQueuedGame(null);
        setQueueStatus(null);
        setMatchChat([]);
        const match = buildPlayableMatch([player], {
          gameType,
          mode: 'bot',
          difficulty: 'medium',
          bestOf,
          turnTimeLimit,
          isRealtimePvp: false,
        });
        if (gameType === 'sakarhtar') {
          const store = readServerlessStore();
          match.riddles = getShuffledQuizSet(xpRulesRef.current.quizCountPerMatch || 10, store.riddles);
        }
        setActiveMatch(match);
      }, fallbackMs);
    },
    [featureLocks.matchmaking, matchmakingSettings.botFallbackSec, resolveCurrentPlayer, pushToast]
  );

  const leaveQueue = useCallback(async () => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    if (queueRoomIdRef.current && isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
      queueRoomIdRef.current = null;
    }
    setCurrentRoom(null);
    setQueuedGame(null);
    setQueueStatus(null);
  }, []);

  const joinSakarQuick = useCallback(() => {
    setSakarQuickCount((c) => Math.min(8, c + 1));
    joinQueue('sakarhtar');
  }, [joinQueue]);

  const startSakarQuickNow = useCallback(async () => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    if (queueRoomIdRef.current && isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
      queueRoomIdRef.current = null;
    }
    const player = resolveCurrentPlayer();
    setCurrentRoom(null);
    setQueueStatus(null);
    setQueuedGame(null);
    const match = buildPlayableMatch([player], { gameType: 'sakarhtar', mode: 'solo' });
    const store = readServerlessStore();
    match.riddles = getShuffledQuizSet(xpRulesRef.current.quizCountPerMatch || 10, store.riddles);
    setActiveMatch(match);
  }, [resolveCurrentPlayer]);

  // 6. Unified Move Handler
  const sendMove = useCallback(
    async (move: any) => {
      if (!activeMatch || activeMatch.status === 'finished') return;
      const gType = normalizeGameId(activeMatch.gameType);
      const me = resolveCurrentPlayer();
      const players = activeMatch.players || [me];
      const p1 = players[0];
      const p2 = players[1] || { id: 'aegis_bot' };
      const isPvp = Boolean(activeMatch.isRealtimePvp && players.length >= 2);
      const next = JSON.parse(JSON.stringify(activeMatch));
      next.gameType = gType;

      if (gType === 'tictactoe') {
        const board: Array<string | null> = [...(next.tttBoard || Array(9).fill(null))];
        const idx = typeof move === 'number' ? move : move?.index ?? -1;
        if (idx < 0 || idx > 8 || board[idx] !== null) return;

        if (isPvp) {
          if (next.turnUserId !== me?.id) return;
          board[idx] = me?.id === p1.id ? 'X' : 'O';
          next.tttBoard = board;
          next.turnUserId = me?.id === p1.id ? p2.id : p1.id;
          const outcome = checkTTTWinner(board);
          if (outcome) {
            next.status = 'finished';
            if (outcome === 'DRAW') next.isDraw = true;
            else {
              next.winnerId = outcome === 'X' ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          return;
        }

        board[idx] = 'X';
        let outcome = checkTTTWinner(board);
        if (!outcome) {
          const botPick = pickSmartTTTMove(board, next.difficulty || 'medium');
          if (botPick >= 0) {
            board[botPick] = 'O';
            outcome = checkTTTWinner(board);
          }
        }
        next.tttBoard = board;
        if (outcome) {
          next.status = 'finished';
          if (outcome === 'DRAW') {
            next.isDraw = true;
            applyXpDelta('draw', next.id);
          } else {
            const p1Won = outcome === 'X';
            next.winnerId = p1Won ? p1.id : p2.id;
            next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            applyXpDelta(p1Won ? 'win' : 'loss', next.id);
          }
        }
        setActiveMatch(next);
        return;
      }

      if (gType === 'connect4') {
        const grid: Array<Array<string | null>> = next.c4Board.map((r: any) => [...r]);
        const col = typeof move === 'number' ? move : move?.col ?? -1;
        if (col < 0 || col > 6) return;

        // ကလေးငယ် စဥ်းစားနေချိန် (သို့) အနီပြားချနေချိန်တွင် User ထပ်နှိပ်မရအောင် ပိတ်ထားမည်
        if (!isPvp && (next.botPhase === 'thinking' || next.botPhase === 'dropping')) return;
        if (isPvp && next.turnUserId !== me?.id) return;

        const myDisc = isPvp ? (me?.id === p1.id ? 'P1' : 'P2') : 'P1';

        let placedRow = -1;
        for (let r = 5; r >= 0; r--) {
          if (grid[r][col] === null) {
            grid[r][col] = myDisc;
            placedRow = r;
            break;
          }
        }
        if (placedRow === -1) return;

        (soundEngine as any).playClick?.();

        // PvP Mode
        if (isPvp) {
          next.c4Board = grid;
          next.lastMove = { row: placedRow, col, disc: myDisc };
          next.turnUserId = me?.id === p1.id ? p2.id : p1.id;
          const result = checkConnect4Winner(grid);
          if (result) {
            next.status = 'finished';
            next.winningCells = result.winningCells;
            if (result.winner === 'DRAW') next.isDraw = true;
            else {
              next.winnerId = result.winner === 'P1' ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          return;
        }

        // Bot (ကလေးငယ်) Mode
        next.c4Board = grid;
        next.lastMove = { row: placedRow, col, disc: 'P1' };

        const userOutcome = checkConnect4Winner(grid);
        if (userOutcome) {
          next.status = 'finished';
          next.winningCells = userOutcome.winningCells;
          if (userOutcome.winner === 'DRAW') {
            next.isDraw = true;
            next.botPhase = 'idle';
            applyXpDelta('draw', next.id);
          } else {
            // User နိုင်သွားပြီ -> ကလေးငယ် ငိုမည်
            next.winnerId = p1.id;
            next.botPhase = 'crying';
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 1;
            applyXpDelta('win', next.id);
          }
          setActiveMatch(next);
          return;
        }

        // အဆင့် (၁): ကလေးငယ် ခဏစဥ်းစားမည်
        next.turnUserId = p2.id;
        next.botPhase = 'thinking';
        next.botTargetCol = null;
        setActiveMatch(next);

        const botCol = pickConnect4BotCol(grid, next.difficulty || 'medium');
        if (botCol === -1) return;

        const thinkDelay = 900 + Math.floor(Math.random() * 550);

        const t1 = window.setTimeout(() => {
          // အဆင့် (၂): အနီဝိုင်းပြားကို ကိုင်ပြီး ရွေးထားသည့် ကော်လံပေါ်သို့ ရွှေ့မည်
          setActiveMatch((prev: any) => {
            if (!prev || prev.status === 'finished') return prev;
            return {
              ...prev,
              botPhase: 'dropping',
              botTargetCol: botCol,
            };
          });

          const t2 = window.setTimeout(() => {
            // အဆင့် (၃): အနီဝိုင်းပြားကို ဘုတ်ထဲသို့ ချမည်
            setActiveMatch((prev: any) => {
              if (!prev || prev.status === 'finished') return prev;
              const updated = JSON.parse(JSON.stringify(prev));
              const nextGrid: Array<Array<string | null>> = updated.c4Board.map((r: any) => [...r]);

              let botRow = -1;
              for (let r = 5; r >= 0; r--) {
                if (nextGrid[r][botCol] === null) {
                  nextGrid[r][botCol] = 'P2';
                  botRow = r;
                  break;
                }
              }
              if (botRow === -1) return prev;

              (soundEngine as any).playClick?.();
              updated.c4Board = nextGrid;
              updated.lastMove = { row: botRow, col: botCol, disc: 'P2' };
              updated.botTargetCol = null;

              const botOutcome = checkConnect4Winner(nextGrid);
              if (botOutcome) {
                updated.status = 'finished';
                updated.winningCells = botOutcome.winningCells;
                if (botOutcome.winner === 'DRAW') {
                  updated.isDraw = true;
                  updated.botPhase = 'idle';
                  applyXpDelta('draw', updated.id);
                } else {
                  // Bot နိုင်သွားပြီ (User ရှုံးပြီ) -> ကလေးငယ် ပျော်နေမည်
                  updated.winnerId = p2.id;
                  updated.botPhase = 'happy';
                  updated.scores[p2.id] = (updated.scores[p2.id] || 0) + 1;
                  applyXpDelta('loss', updated.id);
                }
              } else {
                updated.botPhase = 'idle';
                updated.turnUserId = p1.id;
              }
              return updated;
            });
          }, 520);

          botTimersRef.current.push(t2);
        }, thinkDelay);

        botTimersRef.current.push(t1);
        return;
      }

      if (gType === 'rps') {
        const myChoice = String(move?.choice || move || 'rock').toLowerCase();

        if (isPvp && me?.id) {
          next.rpsPicks = { ...(next.rpsPicks || {}), [me.id]: myChoice };
          const c1 = next.rpsPicks[p1.id];
          const c2 = next.rpsPicks[p2.id];
          if (c1 && c2) {
            let roundWinnerId: string | null = null;
            if (c1 !== c2) {
              const p1Beats =
                (c1 === 'rock' && c2 === 'scissors') ||
                (c1 === 'paper' && c2 === 'rock') ||
                (c1 === 'scissors' && c2 === 'paper');
              roundWinnerId = p1Beats ? p1.id : p2.id;
            }
            if (roundWinnerId) next.scores[roundWinnerId] = (next.scores[roundWinnerId] || 0) + 1;
            next.rpsLastRound = { p1Choice: c1, p2Choice: c2, winnerId: roundWinnerId };
            next.rpsPicks = {};
            next.round = (next.round || 1) + 1;

            const target = Math.ceil((next.bestOf || 3) / 2);
            if (next.scores[p1.id] >= target || next.scores[p2.id] >= target) {
              next.status = 'finished';
              next.winnerId = next.scores[p1.id] >= target ? p1.id : p2.id;
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          return;
        }

        const opts = ['rock', 'paper', 'scissors'];
        const bChoice = opts[Math.floor(Math.random() * 3)];
        let roundWinnerId: string | null = null;
        if (myChoice !== bChoice) {
          const beats =
            (myChoice === 'rock' && bChoice === 'scissors') ||
            (myChoice === 'paper' && bChoice === 'rock') ||
            (myChoice === 'scissors' && bChoice === 'paper');
          roundWinnerId = beats ? p1.id : p2.id;
        }
        if (roundWinnerId) next.scores[roundWinnerId] = (next.scores[roundWinnerId] || 0) + 1;
        next.rpsLastRound = { p1Choice: myChoice, p2Choice: bChoice, winnerId: roundWinnerId };
        next.round = (next.round || 1) + 1;

        const target = Math.ceil((next.bestOf || 3) / 2);
        if (next.scores[p1.id] >= target || next.scores[p2.id] >= target) {
          const p1Won = next.scores[p1.id] >= target;
          next.status = 'finished';
          next.winnerId = p1Won ? p1.id : p2.id;
          applyXpDelta(p1Won ? 'win' : 'loss', next.id);
        }
        setActiveMatch(next);
        return;
      }

      if (gType === 'sakarhtar') {
        const riddles = next.riddles?.length ? next.riddles : QUIZ_BANK_100;
        const idx = next.riddleIndex || 0;
        const current = riddles[idx] || riddles[0];
        const chosen = typeof move === 'number' ? move : move?.answerIndex ?? -1;

        if (isPvp && me?.id) {
          next.roundAnswers = next.roundAnswers || {};
          if (typeof next.roundAnswers[me.id] === 'number') return;
          next.roundAnswers[me.id] = chosen;
          if (chosen === current.answerIndex) {
            next.scores[me.id] = (next.scores[me.id] || 0) + 100;
          }
          const allAnswered = players.every((p: any) => typeof next.roundAnswers[p.id] === 'number');
          if (allAnswered) {
            next.roundAnswers = {};
            next.riddleIndex = idx + 1;
            if (next.riddleIndex >= riddles.length) {
              next.status = 'finished';
              const sorted = [...players].sort((a, b) => (next.scores[b.id] || 0) - (next.scores[a.id] || 0));
              if ((next.scores[sorted[0].id] || 0) === (next.scores[sorted[1]?.id] || 0)) next.isDraw = true;
              else next.winnerId = sorted[0].id;
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          return;
        }

        if (chosen === current.answerIndex) {
          next.scores[p1.id] = (next.scores[p1.id] || 0) + 100;
        }
        if (Math.random() > 0.55) {
          next.scores[p2.id] = (next.scores[p2.id] || 0) + 100;
        }
        const nextIdx = idx + 1;
        next.riddleIndex = nextIdx;
        if (nextIdx >= riddles.length) {
          next.status = 'finished';
          if (next.scores[p1.id] === next.scores[p2.id]) {
            next.isDraw = true;
            applyXpDelta('draw', next.id);
          } else {
            const p1Won = next.scores[p1.id] > next.scores[p2.id];
            next.winnerId = p1Won ? p1.id : p2.id;
            applyXpDelta(p1Won ? 'win' : 'loss', next.id);
          }
        }
        setActiveMatch(next);
      }
    },
    [activeMatch, resolveCurrentPlayer, applyXpDelta]
  );

  const forfeitMatch = useCallback(async () => {
    clearBotTimers();
    if (!activeMatch) return;
    const me = resolveCurrentPlayer();
    const other = (activeMatch.players || []).find((p: any) => p.id !== me?.id) || { id: 'aegis_bot' };
    const finished = {
      ...activeMatch,
      status: 'finished',
      winnerId: other.id,
      botPhase: normalizeGameId(activeMatch.gameType) === 'connect4' ? 'happy' : activeMatch.botPhase,
    };
    setActiveMatch(finished);
    applyXpDelta('loss', activeMatch.id);
    if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
      await setDoc(doc(db, 'matches', activeMatch.id), stripUndefined(finished)).catch(() => {});
    }
  }, [activeMatch, clearBotTimers, resolveCurrentPlayer, applyXpDelta]);

  const sendMatchChat = useCallback(
    async (text: string) => {
      if (featureLocks.chat || !text.trim() || !activeMatch) return;
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setMatchChat((prev) => [...prev, msg]);
      if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'matches', activeMatch.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [featureLocks.chat, activeMatch, resolveCurrentPlayer]
  );

  const sendRoomChat = useCallback(
    async (text: string) => {
      if (featureLocks.chat || !text.trim() || !currentRoom) return;
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setRoomChat((prev) => [...prev, msg]);
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'rooms', currentRoom.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [featureLocks.chat, currentRoom, resolveCurrentPlayer]
  );

  const sendChallenge = useCallback(
    (_targetUserId: string, gameType: GameType) => {
      const player = resolveCurrentPlayer();
      setActiveMatch(buildPlayableMatch([player], { gameType, mode: 'bot', difficulty: 'hard' }));
      setSocialRefreshTick((n) => n + 1);
    },
    [resolveCurrentPlayer]
  );

  const respondChallenge = useCallback((_challengeId: string, accept: boolean) => {
    setPendingChallenge(null);
    if (accept) pushToast('success', 'Challenge accepted!');
  }, [pushToast]);

  const unreadNotiCount = notifications.filter((n) => !n.read).length;

  return {
    connectionState,
    cloudError,
    pingMs,
    landingContent,
    setLandingContent,
    announcement,
    setAnnouncement,
    notifications,
    unreadNotiCount,
    markAllNotificationsRead,
    maintenanceMode,
    maintenanceMessage,
    xpRules,
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
