import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import {
  buildPlayableMatch,
  DEFAULT_SAKAR_RIDDLES,
  getPatchedLandingContent,
  readActiveSessionUser,
  readServerlessStore,
  saveActiveSessionUser,
} from '../lib/serverlessApi.ts';
import type {
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

function checkConnect4Winner(grid: Array<Array<string | null>>): 'P1' | 'P2' | 'DRAW' | null {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = grid[r]?.[c];
      if (!v) continue;
      if (c <= 3 && v === grid[r][c + 1] && v === grid[r][c + 2] && v === grid[r][c + 3]) return v as 'P1' | 'P2';
      if (r <= 2 && v === grid[r + 1][c] && v === grid[r + 2][c] && v === grid[r + 3][c]) return v as 'P1' | 'P2';
      if (r <= 2 && c <= 3 && v === grid[r + 1][c + 1] && v === grid[r + 2][c + 2] && v === grid[r + 3][c + 3]) return v as 'P1' | 'P2';
      if (r <= 2 && c >= 3 && v === grid[r + 1][c - 1] && v === grid[r + 2][c - 2] && v === grid[r + 3][c - 3]) return v as 'P1' | 'P2';
    }
  }
  return grid.every((row) => row.every((cell) => cell !== null)) ? 'DRAW' : null;
}

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [pingMs, setPingMs] = useState<number>(22);
  const [landingContent, setLandingContent] = useState<LandingContent>(() => getPatchedLandingContent());
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
  const queueTimerRef = useRef<number | null>(null);

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

  const resolveCurrentPlayer = useCallback(() => {
    const store = readServerlessStore();
    if (token === 'admin-token') return store.users.admin_yanlinnaung;
    const saved = readActiveSessionUser();
    if (saved) return saved;
    if (token) {
      const uid = token.replace(/^token_/, '');
      if (store.users[uid]) return store.users[uid];
    }
    return Object.values(store.users).find((u: any) => u.id !== 'admin_yanlinnaung') || store.users.admin_yanlinnaung;
  }, [token]);

  const applyXpDelta = useCallback(
    async (outcome: 'win' | 'loss' | 'draw') => {
      const player = resolveCurrentPlayer();
      if (!player) return;

      const delta = outcome === 'win' ? 75 : outcome === 'draw' ? 25 : -20;
      const nextXp = Math.max(0, (player.xp || 1000) + delta);
      const nextRank =
        nextXp >= 2500
          ? 'Legend'
          : nextXp >= 1800
          ? 'Diamond'
          : nextXp >= 1300
          ? 'Gold'
          : nextXp >= 1000
          ? 'Silver'
          : 'Bronze';

      const updated = {
        ...player,
        xp: nextXp,
        rank: nextRank,
        wins: (player.wins || 0) + (outcome === 'win' ? 1 : 0),
        losses: (player.losses || 0) + (outcome === 'loss' ? 1 : 0),
        draws: (player.draws || 0) + (outcome === 'draw' ? 1 : 0),
      };

      saveActiveSessionUser(updated);
      onUserUpdate(updated);

      if (isFirebaseConfigured && db && updated.id) {
        await setDoc(doc(db, 'users', updated.id), updated, { merge: true }).catch(() => {});
      }
    },
    [resolveCurrentPlayer, onUserUpdate]
  );

  useEffect(() => {
    if (!token) return;
    setConnectionState('connected');
    const timer = setInterval(() => {
      setPingMs(Math.floor(18 + Math.random() * 14));
    }, 5000);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!token || !isFirebaseConfigured || !db) return;

    const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setLeaderboard(list);
      setOnlinePlayers(list);

      if (token !== 'admin-token') {
        const uid = token.replace(/^token_/, '');
        const me = list.find((u) => u.id === uid) as any;
        if (me) {
          if (me.status === 'banned' || me.status === 'suspended') {
            onKicked('Your account has been suspended or banned.');
          } else {
            onUserUpdate({ ...me, role: 'player', isAdmin: false });
          }
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

    return () => {
      unsubUsers();
      unsubTourneys();
      unsubRooms();
    };
  }, [token, onUserUpdate, onKicked]);

  const joinQueue = useCallback(
    (gameType: GameType, bestOf: 3 | 5 = 3, turnTimeLimit: TurnTimeLimit = 20) => {
      setQueuedGame(gameType);
      setQueueStatus({ gameType, startedAt: Date.now() });
      if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);

      queueTimerRef.current = window.setTimeout(() => {
        const player = resolveCurrentPlayer();
        const match = buildPlayableMatch(player, {
          gameType,
          mode: 'matchmaking',
          difficulty: 'medium',
          bestOf,
          turnTimeLimit,
        });
        setQueuedGame(null);
        setQueueStatus(null);
        setMatchChat([]);
        setActiveMatch(match);
        pushToast('success', 'Opponent found!');
      }, 2000);
    },
    [resolveCurrentPlayer, pushToast]
  );

  const leaveQueue = useCallback(() => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    setQueuedGame(null);
    setQueueStatus(null);
  }, []);

  const joinSakarQuick = useCallback(() => {
    setSakarQuickCount((c) => Math.min(8, c + 1));
    joinQueue('sakarhtar');
  }, [joinQueue]);

  const startSakarQuickNow = useCallback(() => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    const player = resolveCurrentPlayer();
    setQueueStatus(null);
    setQueuedGame(null);
    setActiveMatch(buildPlayableMatch(player, { gameType: 'sakarhtar', mode: 'matchmaking' }));
  }, [resolveCurrentPlayer]);

  const sendMove = useCallback(
    (move: any) => {
      setActiveMatch((prev: any) => {
        if (!prev || prev.status === 'finished') return prev;
        const p1 = prev.players?.[0] || resolveCurrentPlayer();
        const p2 = prev.players?.[1] || { id: 'aegis_bot' };
        const next = JSON.parse(JSON.stringify(prev));

        // 1. TIC-TAC-TOE
        if (next.gameType === 'tictactoe') {
          const board: Array<string | null> = [...(next.tttBoard || Array(9).fill(null))];
          const idx = typeof move === 'number' ? move : move?.index ?? -1;
          if (idx < 0 || idx > 8 || board[idx] !== null) return prev;

          board[idx] = 'X';
          let outcome = checkTTTWinner(board);

          if (!outcome) {
            const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
            if (empty.length > 0) {
              const botPick = empty[Math.floor(Math.random() * empty.length)];
              board[botPick] = 'O';
              outcome = checkTTTWinner(board);
            }
          }

          next.tttBoard = board;
          if (outcome) {
            next.status = 'finished';
            if (outcome === 'DRAW') {
              next.isDraw = true;
              applyXpDelta('draw');
            } else {
              const p1Won = outcome === 'X';
              next.winnerId = p1Won ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
              applyXpDelta(p1Won ? 'win' : 'loss');
            }
          }
          return next;
        }

        // 2. CONNECT 4
        if (next.gameType === 'connect4') {
          const grid: Array<Array<string | null>> = next.c4Board.map((r: any) => [...r]);
          const col = typeof move === 'number' ? move : move?.col ?? -1;
          if (col < 0 || col > 6) return prev;

          let placed = false;
          for (let r = 5; r >= 0; r--) {
            if (grid[r][col] === null) {
              grid[r][col] = 'P1';
              placed = true;
              break;
            }
          }
          if (!placed) return prev;

          let outcome = checkConnect4Winner(grid);
          if (!outcome) {
            const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => grid[0][c] === null);
            if (validCols.length > 0) {
              const botCol = validCols[Math.floor(Math.random() * validCols.length)];
              for (let r = 5; r >= 0; r--) {
                if (grid[r][botCol] === null) {
                  grid[r][botCol] = 'P2';
                  break;
                }
              }
              outcome = checkConnect4Winner(grid);
            }
          }

          next.c4Board = grid;
          if (outcome) {
            next.status = 'finished';
            if (outcome === 'DRAW') {
              next.isDraw = true;
              applyXpDelta('draw');
            } else {
              const p1Won = outcome === 'P1';
              next.winnerId = p1Won ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
              applyXpDelta(p1Won ? 'win' : 'loss');
            }
          }
          return next;
        }

        // 3. ROCK, PAPER, SCISSORS
        if (next.gameType === 'rps') {
          const pChoice = String(move?.choice || move || 'rock').toLowerCase();
          const opts = ['rock', 'paper', 'scissors'];
          const bChoice = opts[Math.floor(Math.random() * 3)];

          let winner: 'player' | 'bot' | 'draw' = 'draw';
          if (pChoice !== bChoice) {
            const beats =
              (pChoice === 'rock' && bChoice === 'scissors') ||
              (pChoice === 'paper' && bChoice === 'rock') ||
              (pChoice === 'scissors' && bChoice === 'paper');
            winner = beats ? 'player' : 'bot';
          }

          if (winner === 'player') next.scores[p1.id] = (next.scores[p1.id] || 0) + 1;
          if (winner === 'bot') next.scores[p2.id] = (next.scores[p2.id] || 0) + 1;

          next.rpsLastRound = { playerChoice: pChoice, botChoice: bChoice, winner };
          next.round = (next.round || 1) + 1;

          const target = Math.ceil((next.bestOf || 3) / 2);
          if (next.scores[p1.id] >= target || next.scores[p2.id] >= target) {
            const p1Won = next.scores[p1.id] >= target;
            next.status = 'finished';
            next.winnerId = p1Won ? p1.id : p2.id;
            applyXpDelta(p1Won ? 'win' : 'loss');
          }
          return next;
        }

        // 4. SAKAR-HTAR
        if (next.gameType === 'sakarhtar') {
          const riddles = next.riddles || DEFAULT_SAKAR_RIDDLES;
          const idx = next.riddleIndex || 0;
          const current = riddles[idx] || riddles[0];
          const chosen = typeof move === 'number' ? move : move?.answerIndex ?? -1;

          if (chosen === current.answerIndex) {
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 100;
          }
          if (Math.random() > 0.5) {
            next.scores[p2.id] = (next.scores[p2.id] || 0) + 100;
          }

          const nextIdx = idx + 1;
          next.riddleIndex = nextIdx;
          if (nextIdx >= riddles.length) {
            next.status = 'finished';
            if (next.scores[p1.id] === next.scores[p2.id]) {
              next.isDraw = true;
              applyXpDelta('draw');
            } else {
              const p1Won = next.scores[p1.id] > next.scores[p2.id];
              next.winnerId = p1Won ? p1.id : p2.id;
              applyXpDelta(p1Won ? 'win' : 'loss');
            }
          }
          return next;
        }

        return next;
      });
    },
    [resolveCurrentPlayer, applyXpDelta]
  );

  const forfeitMatch = useCallback(() => {
    setActiveMatch((prev: any) => {
      if (!prev) return null;
      const p2 = prev.players?.[1] || { id: 'aegis_bot' };
      applyXpDelta('loss');
      return { ...prev, status: 'finished', winnerId: p2.id };
    });
  }, [applyXpDelta]);

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
      const player = resolveCurrentPlayer();
      setActiveMatch(buildPlayableMatch(player, { gameType, mode: 'bot', difficulty: 'hard' }));
      setSocialRefreshTick((n) => n + 1);
    },
    [resolveCurrentPlayer]
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
