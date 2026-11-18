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
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import {
  buildPlayableMatch,
  DEFAULT_SAKAR_RIDDLES,
  readServerlessStore,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
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

function checkTTTResult(board: Array<string | null>): string | 'DRAW' | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every((cell) => cell !== null) ? 'DRAW' : null;
}

function checkConnect4Result(grid: Array<Array<string | null>>): string | 'DRAW' | null {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = grid[r]?.[c];
      if (!v) continue;
      if (c <= 3 && v === grid[r][c + 1] && v === grid[r][c + 2] && v === grid[r][c + 3]) return v;
      if (r <= 2 && v === grid[r + 1][c] && v === grid[r + 2][c] && v === grid[r + 3][c]) return v;
      if (r <= 2 && c <= 3 && v === grid[r + 1][c + 1] && v === grid[r + 2][c + 2] && v === grid[r + 3][c + 3]) return v;
      if (r <= 2 && c >= 3 && v === grid[r + 1][c - 1] && v === grid[r + 2][c - 2] && v === grid[r + 3][c - 3]) return v;
    }
  }
  const hasEmpty = grid.some((row) => row.some((cell) => cell === null));
  return hasEmpty ? null : 'DRAW';
}

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [pingMs, setPingMs] = useState<number>(22);
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

  const getCurrentPlayerFromStore = useCallback(() => {
    const store = readServerlessStore();
    const adminFallback = store.users.admin_yanlinnaung || Object.values(store.users)[0];
    if (!token || token === 'admin-token') return adminFallback;
    return Object.values(store.users).find((u: any) => token.includes(u.id)) || adminFallback;
  }, [token]);

  const applyXpDeltaToPlayer = useCallback(
    async (outcome: 'win' | 'loss' | 'draw') => {
      const store = readServerlessStore();
      const player = getCurrentPlayerFromStore();
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

      player.xp = nextXp;
      player.rank = nextRank;
      player.wins = (player.wins || 0) + (outcome === 'win' ? 1 : 0);
      player.losses = (player.losses || 0) + (outcome === 'loss' ? 1 : 0);
      player.draws = (player.draws || 0) + (outcome === 'draw' ? 1 : 0);

      store.users[player.id] = player;
      writeServerlessStore(store);
      onUserUpdate({ ...player });

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', player.id), player, { merge: true }).catch(() => {});
      }
      pushToast(
        outcome === 'win' ? 'success' : 'info',
        outcome === 'win'
          ? 'Victory! +75 XP earned'
          : outcome === 'draw'
          ? 'Draw! +25 XP earned'
          : 'Defeat! -20 XP'
      );
    },
    [getCurrentPlayerFromStore, onUserUpdate, pushToast]
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
      if (snap.exists()) setLandingContent(snap.data() as LandingContent);
    });

    return () => {
      unsubUsers();
      unsubTourneys();
      unsubRooms();
      unsubLanding();
    };
  }, [token, onUserUpdate, onKicked]);

  // Matchmaking Queue -> Auto-pairs with Aegis Bot in 3 seconds so user can always play
  const joinQueue = useCallback(
    (gameType: GameType, bestOf: 3 | 5 = 3, turnTimeLimit: TurnTimeLimit = 20) => {
      setQueuedGame(gameType);
      setQueueStatus({ gameType, startedAt: Date.now(), elapsedSec: 0 });
      if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);

      queueTimerRef.current = window.setTimeout(() => {
        const player = getCurrentPlayerFromStore();
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
        pushToast('success', 'Opponent found! Match starting...');
      }, 2500);
    },
    [getCurrentPlayerFromStore, pushToast]
  );

  const leaveQueue = useCallback(() => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    setQueuedGame(null);
    setQueueStatus(null);
  }, []);

  const joinSakarQuick = useCallback(() => {
    setSakarQuickCount((c) => Math.min(8, c + 1));
    setQueueStatus({ gameType: 'sakarhtar', startedAt: Date.now() });
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    queueTimerRef.current = window.setTimeout(() => {
      const player = getCurrentPlayerFromStore();
      setQueueStatus(null);
      setQueuedGame(null);
      setActiveMatch(buildPlayableMatch(player, { gameType: 'sakarhtar', mode: 'matchmaking' }));
    }, 2500);
  }, [getCurrentPlayerFromStore]);

  const startSakarQuickNow = useCallback(() => {
    if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    const player = getCurrentPlayerFromStore();
    setQueueStatus(null);
    setQueuedGame(null);
    setActiveMatch(buildPlayableMatch(player, { gameType: 'sakarhtar', mode: 'matchmaking' }));
  }, [getCurrentPlayerFromStore]);

  // Full Local & Bot Gameplay Engine for All 4 Games
  const sendMove = useCallback(
    async (move: any) => {
      setActiveMatch((prev: any) => {
        if (!prev || prev.status === 'finished') return prev;
        const p1 = prev.players?.[0] || prev.player1;
        const p2 = prev.players?.[1] || prev.player2;
        const next = JSON.parse(JSON.stringify(prev));

        // 1. TIC-TAC-TOE
        if (next.gameType === 'tictactoe') {
          const board: Array<string | null> = [...(next.state?.board || next.board || Array(9).fill(null))];
          const idx = typeof move === 'number' ? move : (move?.index ?? move?.cell ?? move?.position ?? -1);
          if (idx < 0 || idx > 8 || board[idx] !== null) return prev;

          board[idx] = p1.id;
          let res = checkTTTResult(board);

          if (!res) {
            const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
            if (empty.length > 0) {
              const botIdx = empty[Math.floor(Math.random() * empty.length)];
              board[botIdx] = p2.id;
              res = checkTTTResult(board);
            }
          }

          next.board = board;
          next.state.board = board;
          next.state.cells = board;

          if (res) {
            next.status = 'finished';
            next.state.status = 'finished';
            if (res === 'DRAW') {
              next.isDraw = true;
              next.state.isDraw = true;
              applyXpDeltaToPlayer('draw');
            } else {
              next.winnerId = res;
              next.state.winnerId = res;
              applyXpDeltaToPlayer(res === p1.id ? 'win' : 'loss');
            }
          }
          return next;
        }

        // 2. CONNECT 4
        if (next.gameType === 'connect4') {
          const grid: Array<Array<string | null>> = (next.state?.board || next.board).map((r: any) => [...r]);
          const col = typeof move === 'number' ? move : (move?.col ?? move?.column ?? -1);
          if (col < 0 || col > 6) return prev;

          let placed = false;
          for (let r = 5; r >= 0; r--) {
            if (grid[r][col] === null) {
              grid[r][col] = p1.id;
              placed = true;
              break;
            }
          }
          if (!placed) return prev;

          let res = checkConnect4Result(grid);
          if (!res) {
            const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => grid[0][c] === null);
            if (validCols.length > 0) {
              const botCol = validCols[Math.floor(Math.random() * validCols.length)];
              for (let r = 5; r >= 0; r--) {
                if (grid[r][botCol] === null) {
                  grid[r][botCol] = p2.id;
                  break;
                }
              }
              res = checkConnect4Result(grid);
            }
          }

          next.board = grid;
          next.state.board = grid;
          next.state.grid = grid;

          if (res) {
            next.status = 'finished';
            next.state.status = 'finished';
            if (res === 'DRAW') {
              next.isDraw = true;
              next.state.isDraw = true;
              applyXpDeltaToPlayer('draw');
            } else {
              next.winnerId = res;
              next.state.winnerId = res;
              applyXpDeltaToPlayer(res === p1.id ? 'win' : 'loss');
            }
          }
          return next;
        }

        // 3. ROCK, PAPER, SCISSORS (Best of 3 / 5)
        if (next.gameType === 'rps') {
          const p1Choice = String(typeof move === 'string' ? move : (move?.choice ?? move?.move ?? 'rock')).toLowerCase();
          const options = ['rock', 'paper', 'scissors'];
          const p2Choice = options[Math.floor(Math.random() * 3)];

          let roundWinner: string | null = null;
          if (p1Choice !== p2Choice) {
            const p1Beats =
              (p1Choice === 'rock' && p2Choice === 'scissors') ||
              (p1Choice === 'paper' && p2Choice === 'rock') ||
              (p1Choice === 'scissors' && p2Choice === 'paper');
            roundWinner = p1Beats ? p1.id : p2.id;
          }

          next.scores = next.scores || { [p1.id]: 0, [p2.id]: 0 };
          if (roundWinner) {
            next.scores[roundWinner] = (next.scores[roundWinner] || 0) + 1;
          }
          next.state.scores = { ...next.scores };
          next.state.choices = { [p1.id]: p1Choice, [p2.id]: p2Choice };
          next.state.lastRound = { [p1.id]: p1Choice, [p2.id]: p2Choice, winnerId: roundWinner };
          next.round = (next.round || 1) + 1;
          next.state.round = next.round;

          const targetWins = Math.ceil((next.bestOf || 3) / 2);
          if (next.scores[p1.id] >= targetWins || next.scores[p2.id] >= targetWins) {
            const p1Won = next.scores[p1.id] >= targetWins;
            next.status = 'finished';
            next.winnerId = p1Won ? p1.id : p2.id;
            next.state.winnerId = next.winnerId;
            applyXpDeltaToPlayer(p1Won ? 'win' : 'loss');
          }
          return next;
        }

        // 4. SAKAR-HTAR (Myanmar Riddles)
        if (next.gameType === 'sakarhtar') {
          const riddles = next.state?.riddles || DEFAULT_SAKAR_RIDDLES;
          const idx = next.state?.currentIndex || 0;
          const current = riddles[idx] || riddles[0];
          const chosenIdx = typeof move === 'number' ? move : (move?.answerIndex ?? move?.optionIndex ?? -1);

          next.scores = next.scores || { [p1.id]: 0, [p2.id]: 0 };
          if (chosenIdx === current.answerIndex) {
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 100;
          }
          if (Math.random() > 0.45) {
            next.scores[p2.id] = (next.scores[p2.id] || 0) + 100;
          }

          const nextIdx = idx + 1;
          next.state.scores = { ...next.scores };
          next.state.currentIndex = nextIdx;
          next.state.currentRiddle = riddles[nextIdx] || riddles[0];

          if (nextIdx >= riddles.length) {
            next.status = 'finished';
            if (next.scores[p1.id] === next.scores[p2.id]) {
              next.isDraw = true;
              applyXpDeltaToPlayer('draw');
            } else {
              const p1Won = next.scores[p1.id] > next.scores[p2.id];
              next.winnerId = p1Won ? p1.id : p2.id;
              applyXpDeltaToPlayer(p1Won ? 'win' : 'loss');
            }
          }
          return next;
        }

        return next;
      });
    },
    [applyXpDeltaToPlayer]
  );

  const forfeitMatch = useCallback(() => {
    setActiveMatch((prev: any) => {
      if (!prev) return null;
      const p2 = prev.players?.[1] || prev.player2;
      applyXpDeltaToPlayer('loss');
      return { ...prev, status: 'finished', winnerId: p2?.id || 'aegis_bot' };
    });
  }, [applyXpDeltaToPlayer]);

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
      const player = getCurrentPlayerFromStore();
      setActiveMatch(buildPlayableMatch(player, { gameType, mode: 'bot', difficulty: 'hard' }));
      setSocialRefreshTick((n) => n + 1);
    },
    [getCurrentPlayerFromStore]
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
