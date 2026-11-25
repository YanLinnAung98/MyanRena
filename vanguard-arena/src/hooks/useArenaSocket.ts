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
import { QUIZ_BANK_100 } from '../data/quizBank100.ts';
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
  targetUserId: string; // 'ALL' or specific user.id
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

const DISMISSED_NOTIS_KEY = 'vanguard_dismissed_notis_v1';
const USE_SERVER_API = import.meta.env.VITE_USE_SERVER_API === 'true';

function mapServerMatchToClient(serverMatch: any): any {
  if (!serverMatch?.state) return serverMatch;
  const state = serverMatch.state;
  const rawType = String(state.gameType || serverMatch.gameType || '');
  const gameType =
    rawType === 'ttt' ? 'tictactoe' : rawType === 'sakar_htar' ? 'sakarhtar' : rawType;
  const player1 = serverMatch.player1 || state.players?.[0] || null;
  const player2 = serverMatch.player2 || state.players?.[1] || null;
  const participants = rawType === 'sakar_htar' && Array.isArray(state.players)
    ? state.players
    : [player1, player2].filter(Boolean);
  const isDraw = Boolean(serverMatch.isDraw || state.winner === 'draw');
  const winnerId = serverMatch.winnerId ||
    (state.winner === 1 ? player1?.id : state.winner === 2 ? player2?.id : null);
  const scores: Record<string, number> = {};
  if (rawType === 'rps') {
    if (player1?.id) scores[player1.id] = Number(state.p1Score || 0);
    if (player2?.id) scores[player2.id] = Number(state.p2Score || 0);
  } else if (rawType === 'sakar_htar') {
    (state.players || []).forEach((player: any) => { scores[player.id] = Number(player.score || 0); });
  } else if (serverMatch.scores) {
    Object.assign(scores, serverMatch.scores);
  }

  const uiMatch: any = {
    ...serverMatch,
    gameType,
    players: participants,
    isRealtimePvp: serverMatch.mode !== 'bot' && serverMatch.mode !== 'solo',
    status: serverMatch.status === 'active' ? 'active' : serverMatch.status,
    winnerId,
    isDraw,
    scores,
    turnDeadline: serverMatch.turnDeadline || null,
    bestOf: state.bestOf || serverMatch.bestOf || 3,
    round: state.currentRound || 1,
  };

  if (rawType === 'connect4') {
    uiMatch.c4Board = (state.board || []).map((row: number[]) =>
      row.map((cell: number) => cell === 1 ? 'P1' : cell === 2 ? 'P2' : null)
    );
    uiMatch.turnUserId = state.turn === 1 ? player1?.id : player2?.id;
    uiMatch.winningCells = state.winLine || [];
    uiMatch.lastMove = state.lastMove
      ? {
          ...state.lastMove,
          disc: state.board?.[state.lastMove.row]?.[state.lastMove.col] === 1 ? 'P1' : 'P2',
        }
      : null;
  } else if (rawType === 'ttt' || rawType === 'tictactoe') {
    uiMatch.tttBoard = (state.board || []).map((cell: number) => cell === 1 ? 'X' : cell === 2 ? 'O' : null);
    uiMatch.turnUserId = state.turn === 1 ? player1?.id : player2?.id;
  } else if (rawType === 'rps') {
    uiMatch.rpsPicks = {};
    if (state.p1Submitted && player1?.id && state.p1Choice) uiMatch.rpsPicks[player1.id] = state.p1Choice;
    if (state.p2Submitted && player2?.id && state.p2Choice) uiMatch.rpsPicks[player2.id] = state.p2Choice;
    uiMatch.rpsLastRound = state.lastReveal
      ? {
          p1Choice: state.lastReveal.p1Choice,
          p2Choice: state.lastReveal.p2Choice,
          winnerId: state.lastReveal.winner === 1
            ? player1?.id
            : state.lastReveal.winner === 2
            ? player2?.id
            : null,
        }
      : null;
  } else if (rawType === 'sakar_htar') {
    uiMatch.riddles = (state.questions || []).map((question: any) => ({
      ...question,
      question: question.questionMy,
      options: question.options || [],
      answerIndex: question.correctIndex,
    }));
    uiMatch.riddleIndex = Number(state.questionIndex || 0);
    uiMatch.roundAnswers = Object.fromEntries(
      (state.players || [])
        .filter((player: any) => player.answeredCurrent && typeof player.selectedOptionCurrent === 'number')
        .map((player: any) => [player.id, player.selectedOptionCurrent])
    );
  }
  return uiMatch;
}

function mapServerChatMessage(message: any) {
  return {
    id: message?.id || `chat_${Date.now()}`,
    sender: message?.senderName || message?.sender || 'Player',
    text: message?.content || message?.text || '',
    time: message?.createdAt ? Date.parse(message.createdAt) : Number(message?.time || Date.now()),
    kind: message?.kind || 'text',
  };
}

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

function checkConnect4Winner(
  grid: Array<Array<string | null>>
): { winner: 'P1' | 'P2' | 'DRAW'; winningCells: Array<[number, number]> } | null {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = grid[r]?.[c];
      if (!v) continue;
      if (c <= 3 && v === grid[r][c + 1] && v === grid[r][c + 2] && v === grid[r][c + 3]) {
        return { winner: v as 'P1' | 'P2', winningCells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
      }
      if (r <= 2 && v === grid[r + 1][c] && v === grid[r + 2][c] && v === grid[r + 3][c]) {
        return { winner: v as 'P1' | 'P2', winningCells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
      }
      if (r <= 2 && c <= 3 && v === grid[r + 1][c + 1] && v === grid[r + 2][c + 2] && v === grid[r + 3][c + 3]) {
        return { winner: v as 'P1' | 'P2', winningCells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
      }
      if (r <= 2 && c >= 3 && v === grid[r + 1][c - 1] && v === grid[r + 2][c - 2] && v === grid[r + 3][c - 3]) {
        return { winner: v as 'P1' | 'P2', winningCells: [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]] };
      }
    }
  }
  const isFull = grid.every((row) => row.every((cell) => cell !== null));
  return isFull ? { winner: 'DRAW', winningCells: [] } : null;
}

function getDropRow(grid: Array<Array<string | null>>, col: number): number {
  for (let r = 5; r >= 0; r--) {
    if (grid[r]?.[col] === null) return r;
  }
  return -1;
}

function pickSmartConnect4Col(grid: Array<Array<string | null>>, difficulty: string): number {
  const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => grid[0]?.[c] === null);
  if (validCols.length === 0) return -1;
  if (difficulty === 'easy') return validCols[Math.floor(Math.random() * validCols.length)];

  // 1. Try winning move for P2, then block P1
  for (const disc of ['P2', 'P1'] as const) {
    for (const c of validCols) {
      const r = getDropRow(grid, c);
      if (r === -1) continue;
      const testGrid = grid.map((row) => [...row]);
      testGrid[r][c] = disc;
      const res = checkConnect4Winner(testGrid);
      if (res && res.winner === disc) return c;
    }
  }

  // 2. Prefer center columns
  const centerOrder = [3, 2, 4, 1, 5, 0, 6].filter((c) => validCols.includes(c));
  if (difficulty === 'hard' && Math.random() > 0.25) return centerOrder[0];
  return validCols[Math.floor(Math.random() * validCols.length)];
}

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>(
    USE_SERVER_API ? 'connecting' : 'connected'
  );
  const [cloudError, setCloudError] = useState<string | null>(USE_SERVER_API ? null : firebaseInitError);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('စနစ်အဆင့်မြှင့်တင်နေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါ။');
  const [pingMs, setPingMs] = useState<number>(20);
  const [landingContent, setLandingContent] = useState<LandingContent>(() => getPatchedLandingContent());
  const [announcement, setAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [notifications, setNotifications] = useState<ArenaNotification[]>([]);
  const [frames, setFrames] = useState<any[]>(SVG_FRAME_TEMPLATES);
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
  const [pendingWarnings, setPendingWarnings] = useState<{ id: string; title?: string; reason: string }[]>([]);
  const [socialRefreshTick, setSocialRefreshTick] = useState<number>(0);
  const [incomingDMs] = useState<any[]>([]);
  const [toasts, setToasts] = useState<{ id: string; level: string; message: string }[]>([]);

  const queueTimerRef = useRef<number | null>(null);
  const queueRoomIdRef = useRef<string | null>(null);
  const xpAwardedMatchRef = useRef<string | null>(null);
  const alertedNotiIdsRef = useRef<Set<string>>(new Set());
  const botTimersRef = useRef<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const clearBotTimers = useCallback(() => {
    botTimersRef.current.forEach((id) => window.clearTimeout(id));
    botTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearBotTimers();
  }, [clearBotTimers]);

  const pushToast = useCallback((level: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const resolveCurrentPlayer = useCallback(() => {
    const store = readServerlessStore();
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
    if (USE_SERVER_API) {
      await fetch(`/api/warnings/${encodeURIComponent(notiId)}/ack`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
      }).catch(() => {});
    } else if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'notifications', notiId), { read: true }).catch(() => {});
    }
  }, [token]);

  const markAllNotificationsRead = useCallback(() => {
    notifications.forEach((n) => addDismissedNotiId(n.id));
    setPendingWarnings([]);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (USE_SERVER_API && token) {
      notifications.forEach((n) => {
        void fetch(`/api/warnings/${encodeURIComponent(n.id)}/ack`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }
  }, [notifications, token]);

  const sendServerMessage = useCallback((payload: Record<string, unknown>) => {
    if (!USE_SERVER_API) return false;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushToast('error', 'Realtime server is reconnecting. Please try again.');
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, [pushToast]);

  const setAdminSocketMode = useCallback((mode: 'admin' | 'lobby') => {
    if (USE_SERVER_API && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'admin:mode', mode }));
    }
  }, []);

  const applyXpDelta = useCallback(
    async (outcome: 'win' | 'loss' | 'draw', matchId?: string) => {
      if (matchId && xpAwardedMatchRef.current === matchId) return;
      if (matchId) xpAwardedMatchRef.current = matchId;

      const player = resolveCurrentPlayer();
      if (!player) return;

      const delta = outcome === 'win' ? 75 : outcome === 'draw' ? 25 : -20;
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
        await setDoc(doc(db, 'users', updated.id), updated, { merge: true }).catch((e) =>
          console.error('XP Sync Error:', e)
        );
      }
    },
    [resolveCurrentPlayer, onUserUpdate]
  );

  // 1. REAL-TIME DEVICE PRESENCE HEARTBEAT
  useEffect(() => {
    if (!token || USE_SERVER_API) return;
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
          console.error('Heartbeat Firestore Error:', err);
        }
      }
    };

    pushHeartbeat(true);
    const intervalId = window.setInterval(() => {
      setPingMs(Math.floor(15 + Math.random() * 14));
      pushHeartbeat(true);
    }, 15000);

    const handleBeforeUnload = () => {
      pushHeartbeat(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, activeMatch?.id, currentRoom?.id, resolveCurrentPlayer]);

  // 2. SERVER-AUTHORITATIVE REALTIME TRANSPORT
  useEffect(() => {
    if (!USE_SERVER_API || !token) return;

    let mounted = true;
    let retryTimer: number | null = null;
    let socket: WebSocket | null = null;
    let retryAttempt = 0;

    const connect = () => {
      if (!mounted) return;
      setConnectionState('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;
      } catch (error: any) {
        setConnectionState('disconnected');
        setCloudError(error?.message || 'Unable to open realtime connection.');
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (!mounted) return;
        retryAttempt = 0;
        setConnectionState('connected');
        setCloudError(null);
        socket?.send(JSON.stringify({ type: 'match:sync' }));
      };

      socket.onmessage = (event) => {
        if (!mounted) return;
        let message: any;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        switch (message.type) {
          case 'init': {
            if (message.user) onUserUpdate(message.user as UserProfile);
            if (Array.isArray(message.frames)) setFrames(message.frames);
            if (message.featureLocks) setFeatureLocks(message.featureLocks);
            if (message.matchmakingSettings) setMatchmakingSettings(message.matchmakingSettings);
            if (Array.isArray(message.onlinePlayers)) setOnlinePlayers(message.onlinePlayers);
            if (Array.isArray(message.leaderboard)) setLeaderboard(message.leaderboard);
            if (Array.isArray(message.tournaments)) setTournaments(message.tournaments);
            if (message.landingContent) setLandingContent(getPatchedLandingContent(message.landingContent));
            if (Array.isArray(message.openRooms)) setOpenRooms(message.openRooms);
            if (typeof message.sakarQueueCount === 'number') setSakarQuickCount(message.sakarQueueCount);
            if (Array.isArray(message.warnings)) {
              const warnings = message.warnings.map((warning: any) => ({
                id: String(warning.id),
                title: warning.title || 'Account notice',
                reason: warning.reason || warning.message || '',
              }));
              setPendingWarnings(warnings);
            }
            setConnectionState('connected');
            setCloudError(null);
            break;
          }
          case 'auth:error':
            clearBotTimers();
            setCloudError(message.error || 'Your session has expired.');
            onKicked(message.error || 'Your session has expired. Please sign in again.');
            break;
          case 'user:update':
            if (message.user) onUserUpdate(message.user as UserProfile);
            break;
          case 'presence:update':
            if (Array.isArray(message.onlinePlayers)) setOnlinePlayers(message.onlinePlayers);
            break;
          case 'rooms:update':
            if (Array.isArray(message.openRooms)) setOpenRooms(message.openRooms);
            break;
          case 'tournaments:update':
            if (Array.isArray(message.tournaments)) setTournaments(message.tournaments);
            break;
          case 'social:update':
          case 'dm:received':
            setSocialRefreshTick((previous) => previous + 1);
            break;
          case 'queue:tick':
            if (message.queue) {
              setQueueStatus(message.queue);
              setQueuedGame(message.queue.gameType);
            }
            break;
          case 'queue:timeout':
          case 'queue:cancelled':
            setQueueStatus(null);
            setQueuedGame(null);
            setSakarQuickCount(0);
            if (message.type === 'queue:timeout') {
              pushToast('info', 'No opponent was found before the search timed out.');
            }
            break;
          case 'sakar:queue':
            setSakarQuickCount(Number(message.count || 0));
            break;
          case 'match:state':
            if (message.match) {
              const mapped = mapServerMatchToClient(message.match);
              setActiveMatch(mapped);
              setCurrentRoom(null);
              setQueueStatus(null);
              setQueuedGame(null);
              setMatchChat([]);
              setMatchChat((message.match.chat || []).map(mapServerChatMessage));
            }
            break;
          case 'match:chat':
            if (message.message) setMatchChat((previous) => [...previous, mapServerChatMessage(message.message)]);
            break;
          case 'match:left':
            setActiveMatch(null);
            setMatchChat([]);
            break;
          case 'room:state':
            setCurrentRoom(message.room || null);
            setRoomChat(Array.isArray(message.chat) ? message.chat.map(mapServerChatMessage) : []);
            break;
          case 'room:chat':
            if (message.message) setRoomChat((previous) => [...previous, mapServerChatMessage(message.message)]);
            break;
          case 'challenge:received':
            setPendingChallenge(message.invite || null);
            break;
          case 'toast':
            pushToast(message.level || 'info', message.message || '');
            break;
          case 'ping':
            socket?.send(JSON.stringify({ type: 'pong', ts: message.ts }));
            break;
          case 'ping:ack':
            if (typeof message.pingMs === 'number') setPingMs(message.pingMs);
            break;
          case 'announcement':
            if (message.announcement) {
              setAnnouncement({
                title: message.announcement.title || 'Announcement',
                message: message.announcement.message || '',
              });
            }
            break;
          default:
            break;
        }
      };

      socket.onerror = () => {
        if (mounted) setCloudError('Realtime connection interrupted.');
      };

      socket.onclose = () => {
        if (!mounted) return;
        if (wsRef.current === socket) wsRef.current = null;
        setConnectionState('disconnected');
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (!mounted || retryTimer !== null) return;
      const delay = Math.min(15000, 1000 * (2 ** Math.min(retryAttempt, 4)));
      retryAttempt += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    connect();
    return () => {
      mounted = false;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (wsRef.current === socket) wsRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [token, onUserUpdate, onKicked, pushToast, clearBotTimers]);

  // 3. REAL-TIME USERS, RANKING & ADMIN NOTIFICATIONS LISTENER
  useEffect(() => {
    if (!token || USE_SERVER_API) return;
    const myId = token.replace(/^token_/, '').replace(/^local_/, '');

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
            soundEngine.playNotify();
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
            if (me.status === 'banned' || me.status === 'suspended') {
              onKicked('သင့်အကောင့်ကို Admin မှ ပိတ်သိမ်းထားပါသည်။');
            } else {
              onUserUpdate({ ...me, role: 'player', isAdmin: false });
            }
          }
        }
      },
      (err) => {
        setCloudError(err.message);
        console.error('Firestore users listener error:', err);
      }
    );

    const unsubNotis = onSnapshot(
      collection(db, 'notifications'),
      (snap) => {
        const list: ArenaNotification[] = [];
        snap.forEach((d) => {
          list.push({ ...(d.data() as ArenaNotification), id: d.id });
        });
        const store = readServerlessStore();
        store.notifications = list;
        writeServerlessStore(store);
        processNotifications(list);
      },
      (err) => {
        console.error('Firestore notifications listener error:', err);
      }
    );

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const cfg = snap.data() as any;
        if (typeof cfg.maintenance === 'boolean') setMaintenanceMode(cfg.maintenance);
        if (typeof cfg.maintenanceMessage === 'string') setMaintenanceMessage(cfg.maintenanceMessage);
        if (cfg.featureLocks) setFeatureLocks(cfg.featureLocks);
        if (cfg.matchmakingSettings) setMatchmakingSettings(cfg.matchmakingSettings);
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

    return () => {
      window.removeEventListener('storage', syncLocalFallback);
      channel?.close();
      unsubUsers();
      unsubNotis();
      unsubConfig();
      unsubTourneys();
      unsubRooms();
    };
  }, [token, onUserUpdate, onKicked, pushToast]);

  // 3. Real-Time Room Sync
  useEffect(() => {
    if (USE_SERVER_API || !currentRoom?.id || !isFirebaseConfigured || !db) return;
    const roomId = currentRoom.id;

    const firestore = db;
    if (!firestore) return;
    const unsubRoom = onSnapshot(doc(firestore, 'rooms', roomId), async (snap) => {
      if (!snap.exists()) {
        setCurrentRoom(null);
        return;
      }
      const latestRoom = snap.data() as any;
      setCurrentRoom(latestRoom);
      if (Array.isArray(latestRoom.chat)) setRoomChat(latestRoom.chat);

      if (latestRoom.status === 'playing' && latestRoom.activeMatchId) {
        // A real opponent has joined. Cancel the pending solo-fallback timer
        // before loading the live match so it cannot replace this match later.
        if (queueRoomIdRef.current === roomId) {
          if (queueTimerRef.current !== null) {
            window.clearTimeout(queueTimerRef.current);
            queueTimerRef.current = null;
          }
          queueRoomIdRef.current = null;
        }

        const matchSnap = await getDoc(doc(firestore, 'matches', latestRoom.activeMatchId)).catch(() => null);
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
    if (USE_SERVER_API || !activeMatch?.id || !activeMatch?.isRealtimePvp || !isFirebaseConfigured || !db) return;
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
      const gameType = normalizeGameId(rawGameType);
      const player = resolveCurrentPlayer();
      if (!player) return;
      clearBotTimers();
      setQueuedGame(rawGameType);
      setQueueStatus({ gameType: rawGameType, startedAt: Date.now() });

      if (USE_SERVER_API) {
        if (queueTimerRef.current !== null) {
          window.clearTimeout(queueTimerRef.current);
          queueTimerRef.current = null;
        }
        const isSakar = gameType === 'sakarhtar' || gameType === 'sakar_htar';
        sendServerMessage(
          isSakar
            ? { type: 'sakar:quick:join', autoBotFill: true }
            : {
                type: 'queue:join',
                gameType: gameType === 'tictactoe' ? 'ttt' : gameType,
                bestOf,
                turnTimeLimit,
                autoBotFill: true,
              }
        );
        return;
      }

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
        } catch (err) {
          console.error('Matchmaking error:', err);
        }
      }

      const scheduledRoomId = queueRoomIdRef.current;
      queueTimerRef.current = window.setTimeout(async () => {
        queueTimerRef.current = null;

        // The Firestore room listener and this timeout can race. Re-check the
        // room before starting a bot match, and never overwrite a live PvP match.
        if (scheduledRoomId && isFirebaseConfigured && db) {
          const roomSnap = await getDoc(doc(db, 'rooms', scheduledRoomId)).catch(() => null);
          const latestRoom = roomSnap?.exists() ? roomSnap.data() as any : null;

          if (latestRoom?.status === 'playing' && latestRoom.activeMatchId) {
            const matchSnap = await getDoc(doc(db, 'matches', latestRoom.activeMatchId)).catch(() => null);
            if (matchSnap?.exists()) {
              if (queueRoomIdRef.current === scheduledRoomId) queueRoomIdRef.current = null;
              setCurrentRoom(null);
              setQueuedGame(null);
              setQueueStatus(null);
              setMatchChat([]);
              setActiveMatch(matchSnap.data());
              return;
            }
          }

          // Another queue attempt may have replaced this one while Firestore was loading.
          if (queueRoomIdRef.current !== scheduledRoomId) return;

          if (latestRoom?.status === 'waiting') {
            await deleteDoc(doc(db, 'rooms', scheduledRoomId)).catch(() => {});
          }
          queueRoomIdRef.current = null;
        }

        setCurrentRoom(null);
        setQueuedGame(null);
        setQueueStatus(null);
        setMatchChat([]);
        setActiveMatch(
          buildPlayableMatch([player], {
            gameType,
            mode: 'bot',
            difficulty: 'medium',
            bestOf,
            turnTimeLimit,
            isRealtimePvp: false,
          })
        );
      }, 6000);
    },
    [resolveCurrentPlayer, pushToast, clearBotTimers, sendServerMessage]
  );

  const leaveQueue = useCallback(async () => {
    if (USE_SERVER_API) {
      const isSakar = normalizeGameId(queuedGame || '') === 'sakarhtar';
      sendServerMessage({ type: isSakar ? 'sakar:quick:leave' : 'queue:leave' });
      if (queueTimerRef.current !== null) window.clearTimeout(queueTimerRef.current);
      setCurrentRoom(null);
      setQueuedGame(null);
      setQueueStatus(null);
      setSakarQuickCount(0);
      return;
    }
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    if (queueRoomIdRef.current && isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
      queueRoomIdRef.current = null;
    }
    setCurrentRoom(null);
    setQueuedGame(null);
    setQueueStatus(null);
  }, [queuedGame, sendServerMessage]);

  const joinSakarQuick = useCallback(() => {
    setSakarQuickCount((c) => Math.min(8, c + 1));
    joinQueue('sakarhtar');
  }, [joinQueue]);

  const startSakarQuickNow = useCallback(async () => {
    if (USE_SERVER_API) {
      sendServerMessage({ type: 'sakar:quick:start_now' });
      return;
    }
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    if (queueRoomIdRef.current && isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
      queueRoomIdRef.current = null;
    }
    const player = resolveCurrentPlayer();
    setCurrentRoom(null);
    setQueueStatus(null);
    setQueuedGame(null);
    setActiveMatch(buildPlayableMatch([player], { gameType: 'sakarhtar', mode: 'solo' }));
  }, [resolveCurrentPlayer, sendServerMessage]);

  // 6. Move Handler for All 4 Games (With Full Connect 4 Sound FX & Bot Phases)
  const sendMove = useCallback(
    async (move: any) => {
      if (!activeMatch || activeMatch.status === 'finished') return;
      const gType = normalizeGameId(activeMatch.gameType);
      if (USE_SERVER_API) {
        const payload =
          gType === 'tictactoe'
            ? { index: move?.index ?? move }
            : gType === 'connect4'
            ? { col: move?.col ?? move }
            : gType === 'rps'
            ? { choice: move?.choice ?? move }
            : { optionIndex: move?.answerIndex ?? move?.optionIndex ?? move };
        soundEngine.playClick();
        sendServerMessage({ type: 'match:move', matchId: activeMatch.id, payload });
        return;
      }
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

        soundEngine.playClick();

        if (isPvp) {
          if (next.turnUserId !== me?.id) return;
          board[idx] = me?.id === p1.id ? 'X' : 'O';
          next.tttBoard = board;
          next.turnUserId = me?.id === p1.id ? p2.id : p1.id;
          const outcome = checkTTTWinner(board);
          if (outcome) {
            next.status = 'finished';
            if (outcome === 'DRAW') {
              next.isDraw = true;
              soundEngine.playDraw();
            } else {
              next.winnerId = outcome === 'X' ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
              if (next.winnerId === me?.id) soundEngine.playWin();
              else soundEngine.playLose();
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
            soundEngine.playDraw();
            applyXpDelta('draw', next.id);
          } else {
            const p1Won = outcome === 'X';
            next.winnerId = p1Won ? p1.id : p2.id;
            next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            if (p1Won) soundEngine.playWin();
            else soundEngine.playLose();
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

        // Block clicks while bot is thinking/dropping
        if (!isPvp && (next.turnUserId === p2.id || next.botPhase === 'thinking' || next.botPhase === 'dropping')) {
          return;
        }
        if (isPvp && next.turnUserId !== me?.id) return;

        const myDisc = isPvp ? (me?.id === p1.id ? 'P1' : 'P2') : 'P1';
        const placedRow = getDropRow(grid, col);
        if (placedRow === -1) {
          soundEngine.playColumnFull();
          return;
        }

        grid[placedRow][col] = myDisc;
        soundEngine.playDiscDropSequence(placedRow);
        next.c4Board = grid;
        next.lastMove = { row: placedRow, col, disc: myDisc };

        if (isPvp) {
          next.turnUserId = me?.id === p1.id ? p2.id : p1.id;
          const outcome = checkConnect4Winner(grid);
          if (outcome) {
            next.status = 'finished';
            next.winningCells = outcome.winningCells;
            if (outcome.winner === 'DRAW') {
              next.isDraw = true;
              window.setTimeout(() => soundEngine.playDraw(), 300);
            } else {
              next.winnerId = outcome.winner === 'P1' ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
              if (next.winnerId === me?.id) {
                window.setTimeout(() => soundEngine.playConnect4Win(), 300);
              } else {
                window.setTimeout(() => soundEngine.playLose(), 300);
              }
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          return;
        }

        // Single-player vs Maung Pho Thar Bot
        const userOutcome = checkConnect4Winner(grid);
        if (userOutcome) {
          next.status = 'finished';
          next.winningCells = userOutcome.winningCells;
          if (userOutcome.winner === 'DRAW') {
            next.isDraw = true;
            next.botPhase = 'idle';
            window.setTimeout(() => soundEngine.playDraw(), 300);
            applyXpDelta('draw', next.id);
          } else {
            next.winnerId = p1.id;
            next.botPhase = 'crying';
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 1;
            window.setTimeout(() => soundEngine.playConnect4Win(), 280);
            window.setTimeout(() => soundEngine.playKidCry(), 680);
            applyXpDelta('win', next.id);
          }
          setActiveMatch(next);
          return;
        }

        // Bot Thinking Phase
        next.turnUserId = p2.id;
        next.botPhase = 'thinking';
        next.botTargetCol = null;
        setActiveMatch(next);

        clearBotTimers();
        const thinkSfxTimer = window.setTimeout(() => {
          soundEngine.playKidThinking();
        }, 350);

        const botCol = pickSmartConnect4Col(grid, next.difficulty || 'medium');
        const dropPreviewTimer = window.setTimeout(() => {
          setActiveMatch((prev: any) =>
            prev && prev.id === next.id && prev.status === 'active'
              ? { ...prev, botPhase: 'dropping', botTargetCol: botCol }
              : prev
          );
        }, 950);

        const botCommitTimer = window.setTimeout(() => {
          setActiveMatch((prev: any) => {
            if (!prev || prev.id !== next.id || prev.status !== 'active') return prev;
            const nextGrid: Array<Array<string | null>> = prev.c4Board.map((r: any) => [...r]);
            const botRow = getDropRow(nextGrid, botCol);
            if (botRow === -1) {
              return { ...prev, turnUserId: p1.id, botPhase: 'idle', botTargetCol: null };
            }

            nextGrid[botRow][botCol] = 'P2';
            soundEngine.playDiscDropSequence(botRow);

            const updated = {
              ...prev,
              c4Board: nextGrid,
              lastMove: { row: botRow, col: botCol, disc: 'P2' },
              botTargetCol: null,
            };

            const botOutcome = checkConnect4Winner(nextGrid);
            if (botOutcome) {
              updated.status = 'finished';
              updated.winningCells = botOutcome.winningCells;
              if (botOutcome.winner === 'DRAW') {
                updated.isDraw = true;
                updated.botPhase = 'idle';
                window.setTimeout(() => soundEngine.playDraw(), 320);
                applyXpDelta('draw', updated.id);
              } else {
                updated.winnerId = p2.id;
                updated.botPhase = 'happy';
                updated.scores = { ...updated.scores, [p2.id]: (updated.scores[p2.id] || 0) + 1 };
                window.setTimeout(() => soundEngine.playKidHappy(), 320);
                applyXpDelta('loss', updated.id);
              }
            } else {
              updated.turnUserId = p1.id;
              updated.botPhase = 'idle';
            }
            return updated;
          });
        }, 1450);

        botTimersRef.current.push(thinkSfxTimer, dropPreviewTimer, botCommitTimer);
        return;
      }

      if (gType === 'rps') {
        const myChoice = String(move?.choice || move || 'rock').toLowerCase();
        soundEngine.playClick();

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
              if (next.winnerId === me?.id) soundEngine.playWin();
              else soundEngine.playLose();
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
          if (p1Won) soundEngine.playWin();
          else soundEngine.playLose();
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
        soundEngine.playClick();

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
              if ((next.scores[sorted[0].id] || 0) === (next.scores[sorted[1]?.id] || 0)) {
                next.isDraw = true;
                soundEngine.playDraw();
              } else {
                next.winnerId = sorted[0].id;
                if (next.winnerId === me?.id) soundEngine.playWin();
                else soundEngine.playLose();
              }
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
            soundEngine.playDraw();
            applyXpDelta('draw', next.id);
          } else {
            const p1Won = next.scores[p1.id] > next.scores[p2.id];
            next.winnerId = p1Won ? p1.id : p2.id;
            if (p1Won) soundEngine.playWin();
            else soundEngine.playLose();
            applyXpDelta(p1Won ? 'win' : 'loss', next.id);
          }
        }
        setActiveMatch(next);
      }
    },
    [activeMatch, resolveCurrentPlayer, applyXpDelta, clearBotTimers, sendServerMessage]
  );

  const forfeitMatch = useCallback(async () => {
    if (!activeMatch) return;
    if (USE_SERVER_API) {
      sendServerMessage({ type: 'match:forfeit', matchId: activeMatch.id });
      return;
    }
    clearBotTimers();
    const me = resolveCurrentPlayer();
    const other = (activeMatch.players || []).find((p: any) => p.id !== me?.id) || { id: 'aegis_bot' };
    const finished = { ...activeMatch, status: 'finished', winnerId: other.id, botPhase: 'happy' };
    setActiveMatch(finished);
    soundEngine.playLose();
    applyXpDelta('loss', activeMatch.id);
    if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
      await setDoc(doc(db, 'matches', activeMatch.id), stripUndefined(finished)).catch(() => {});
    }
  }, [activeMatch, resolveCurrentPlayer, applyXpDelta, clearBotTimers, sendServerMessage]);

  const sendMatchChat = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeMatch) return;
      if (USE_SERVER_API) {
        sendServerMessage({ type: 'match:chat', matchId: activeMatch.id, content: text.trim().slice(0, 240) });
        return;
      }
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setMatchChat((prev) => [...prev, msg]);
      if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'matches', activeMatch.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [activeMatch, resolveCurrentPlayer, sendServerMessage]
  );

  const sendRoomChat = useCallback(
    async (text: string) => {
      if (!text.trim() || !currentRoom) return;
      if (USE_SERVER_API) {
        sendServerMessage({ type: 'room:chat', roomId: currentRoom.id, content: text.trim().slice(0, 240) });
        return;
      }
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setRoomChat((prev) => [...prev, msg]);
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'rooms', currentRoom.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [currentRoom, resolveCurrentPlayer, sendServerMessage]
  );

  const sendChallenge = useCallback(
    (targetUserId: string, gameType: GameType) => {
      if (USE_SERVER_API) {
        const normalized = normalizeGameId(gameType);
        sendServerMessage({
          type: 'challenge:send',
          targetUserId,
          gameType: normalized === 'tictactoe' ? 'ttt' : normalized === 'sakarhtar' ? 'sakar_htar' : normalized,
          bestOf: 3,
        });
        return;
      }
      const player = resolveCurrentPlayer();
      clearBotTimers();
      setActiveMatch(buildPlayableMatch([player], { gameType, mode: 'bot', difficulty: 'hard' }));
      setSocialRefreshTick((n) => n + 1);
    },
    [resolveCurrentPlayer, clearBotTimers, sendServerMessage]
  );

  const respondChallenge = useCallback(
    (challengeId: string, accept: boolean) => {
      setPendingChallenge(null);
      if (USE_SERVER_API) {
        sendServerMessage({ type: 'challenge:respond', inviteId: challengeId, accept });
      } else if (accept) {
        pushToast('success', 'Challenge accepted!');
      }
    },
    [pushToast, sendServerMessage]
  );

  const unreadNotiCount = notifications.filter((n) => !n.read).length;

  return {
    connectionState,
    cloudError,
    maintenanceMode,
    maintenanceMessage,
    pingMs,
    socialRefreshTick,
    landingContent,
    setLandingContent,
    announcement,
    setAnnouncement,
    notifications,
    unreadNotiCount,
    markAllNotificationsRead,
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
