import { useCallback, useEffect, useRef, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import {
  buildPlayableMatch,
  DEFAULT_SAKAR_RIDDLES,
  getPatchedLandingContent,
  readActiveSessionUser,
  readServerlessStore,
  saveActiveSessionUser,
  writeServerlessStore,
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
  return grid.every((row) => row.every((cell) => cell === null)) ? 'DRAW' : null;
}

export function useArenaSocket({ token, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [pingMs, setPingMs] = useState<number>(20);
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
  const queueRoomIdRef = useRef<string | null>(null);
  const knownUserCountRef = useRef<number>(0);
  const xpAwardedMatchRef = useRef<string | null>(null);

  const pushToast = useCallback((level: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
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
      setPingMs(Math.floor(16 + Math.random() * 14));
    }, 5000);
    return () => clearInterval(timer);
  }, [token]);

  // 1. Real-Time Users, Leaderboard, Tournaments & Open Rooms Subscription
  useEffect(() => {
    if (!token || !isFirebaseConfigured || !db) return;

    const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(100));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: UserProfile[] = [];
      const store = readServerlessStore();
      snap.forEach((d) => {
        const u = d.data() as any;
        list.push(u as UserProfile);
        if (u?.id) store.users[u.id] = u;
      });
      writeServerlessStore(store);

      // Notify Admin in real-time when a new player registers
      if (token === 'admin-token' && knownUserCountRef.current > 0 && list.length > knownUserCountRef.current) {
        pushToast('success', `New Player Registered! (Total: ${list.length})`);
      }
      knownUserCountRef.current = list.length;

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
  }, [token, onUserUpdate, onKicked, pushToast]);

  // 2. Real-Time Room Sync (Players Joining, Chat, & Host Starting Match)
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
      if (Array.isArray(latestRoom.chat)) {
        setRoomChat(latestRoom.chat);
      }

      // If Host started the match (or matchmaking paired), transition all players into activeMatch!
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

  // 3. Real-Time Active Match Sync (Live PvP Moves & Match Chat)
  useEffect(() => {
    if (!activeMatch?.id || !activeMatch?.isRealtimePvp || !isFirebaseConfigured || !db) return;
    const matchId = activeMatch.id;
    const me = resolveCurrentPlayer();

    const unsubMatch = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (!snap.exists()) return;
      const latest = snap.data() as any;
      setActiveMatch(latest);
      if (Array.isArray(latest.chat)) {
        setMatchChat(latest.chat);
      }

      if (latest.status === 'finished' && me?.id) {
        if (latest.isDraw) {
          applyXpDelta('draw', matchId);
        } else if (latest.winnerId) {
          applyXpDelta(latest.winnerId === me.id ? 'win' : 'loss', matchId);
        }
      }
    });

    return () => unsubMatch();
  }, [activeMatch?.id, activeMatch?.isRealtimePvp, resolveCurrentPlayer, applyXpDelta]);

  // 4. Real-Time Matchmaking Queue (Pairs 2 Human Players via Firestore, falls back to Bot after 8s)
  const joinQueue = useCallback(
    async (gameType: GameType, bestOf: 3 | 5 = 3, turnTimeLimit: TurnTimeLimit = 20) => {
      const player = resolveCurrentPlayer();
      setQueuedGame(gameType);
      setQueueStatus({ gameType, startedAt: Date.now() });

      if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);

      if (isFirebaseConfigured && db && player) {
        try {
          const snap = await getDocs(collection(db, 'rooms'));
          let waitingRoom: any = null;
          snap.forEach((d) => {
            const r = d.data();
            if (
              r.status === 'waiting' &&
              r.isMatchmaking === true &&
              r.gameType === gameType &&
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
            await setDoc(doc(db, 'matches', liveMatch.id), liveMatch);
            await updateDoc(doc(db, 'rooms', waitingRoom.id), {
              players: twoPlayers,
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

          // Otherwise create a waiting matchmaking ticket in Firestore
          const ticketId = `mm_${Date.now()}_${player.id}`;
          queueRoomIdRef.current = ticketId;
          const ticketRoom = {
            id: ticketId,
            code: 'MM-' + Math.floor(1000 + Math.random() * 9000),
            gameType,
            isMatchmaking: true,
            hostId: player.id,
            maxPlayers: 2,
            players: [player],
            status: 'waiting',
            activeMatchId: null,
          };
          await setDoc(doc(db, 'rooms', ticketId), ticketRoom);
          setCurrentRoom(ticketRoom);
        } catch {}
      }

      // Fallback to Aegis Bot after 8 seconds if no human joins
      queueTimerRef.current = window.setTimeout(async () => {
        if (queueRoomIdRef.current && isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'rooms', queueRoomIdRef.current)).catch(() => {});
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
      }, 8000);
    },
    [resolveCurrentPlayer, pushToast]
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
    setActiveMatch(buildPlayableMatch([player], { gameType: 'sakarhtar', mode: 'solo' }));
  }, [resolveCurrentPlayer]);

  // 5. Unified Move Handler (Supports BOTH Real-Time PvP via Firestore & Bot AI)
  const sendMove = useCallback(
    async (move: any) => {
      if (!activeMatch || activeMatch.status === 'finished') return;
      const me = resolveCurrentPlayer();
      const players = activeMatch.players || [me];
      const p1 = players[0];
      const p2 = players[1] || { id: 'aegis_bot' };
      const isPvp = Boolean(activeMatch.isRealtimePvp && players.length >= 2);
      const next = JSON.parse(JSON.stringify(activeMatch));

      // --- A. TIC-TAC-TOE ---
      if (next.gameType === 'tictactoe') {
        const board: Array<string | null> = [...(next.tttBoard || Array(9).fill(null))];
        const idx = typeof move === 'number' ? move : move?.index ?? -1;
        if (idx < 0 || idx > 8 || board[idx] !== null) return;

        if (isPvp) {
          if (next.turnUserId !== me.id) return;
          const myMark = me.id === p1.id ? 'X' : 'O';
          board[idx] = myMark;
          next.tttBoard = board;
          next.turnUserId = me.id === p1.id ? p2.id : p1.id;

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
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), next).catch(() => {});
          return;
        }

        // Bot Match
        board[idx] = 'X';
        let outcome = checkTTTWinner(board);
        if (!outcome) {
          const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
          if (empty.length > 0) {
            board[empty[Math.floor(Math.random() * empty.length)]] = 'O';
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

      // --- B. CONNECT 4 ---
      if (next.gameType === 'connect4') {
        const grid: Array<Array<string | null>> = next.c4Board.map((r: any) => [...r]);
        const col = typeof move === 'number' ? move : move?.col ?? -1;
        if (col < 0 || col > 6) return;

        if (isPvp && next.turnUserId !== me.id) return;
        const myDisc = isPvp ? (me.id === p1.id ? 'P1' : 'P2') : 'P1';

        let placed = false;
        for (let r = 5; r >= 0; r--) {
          if (grid[r][col] === null) {
            grid[r][col] = myDisc;
            placed = true;
            break;
          }
        }
        if (!placed) return;

        if (isPvp) {
          next.c4Board = grid;
          next.turnUserId = me.id === p1.id ? p2.id : p1.id;
          const outcome = checkConnect4Winner(grid);
          if (outcome) {
            next.status = 'finished';
            if (outcome === 'DRAW') next.isDraw = true;
            else {
              next.winnerId = outcome === 'P1' ? p1.id : p2.id;
              next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), next).catch(() => {});
          return;
        }

        // Bot Match
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
            applyXpDelta('draw', next.id);
          } else {
            const p1Won = outcome === 'P1';
            next.winnerId = p1Won ? p1.id : p2.id;
            next.scores[next.winnerId] = (next.scores[next.winnerId] || 0) + 1;
            applyXpDelta(p1Won ? 'win' : 'loss', next.id);
          }
        }
        setActiveMatch(next);
        return;
      }

      // --- C. ROCK, PAPER, SCISSORS (Simultaneous PvP or Bot) ---
      if (next.gameType === 'rps') {
        const myChoice = String(move?.choice || move || 'rock').toLowerCase();

        if (isPvp) {
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
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), next).catch(() => {});
          return;
        }

        // Bot Match
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

      // --- D. SAKAR-HTAR (1 to 8 Players Real-Time or Solo) ---
      if (next.gameType === 'sakarhtar') {
        const riddles = next.riddles || DEFAULT_SAKAR_RIDDLES;
        const idx = next.riddleIndex || 0;
        const current = riddles[idx] || riddles[0];
        const chosen = typeof move === 'number' ? move : move?.answerIndex ?? -1;

        if (isPvp) {
          next.roundAnswers = next.roundAnswers || {};
          if (typeof next.roundAnswers[me.id] === 'number') return; // Already answered this riddle

          next.roundAnswers[me.id] = chosen;
          if (chosen === current.answerIndex) {
            next.scores[me.id] = (next.scores[me.id] || 0) + 100;
          }

          // Advance to next riddle once all room players have answered
          const allAnswered = players.every((p: any) => typeof next.roundAnswers[p.id] === 'number');
          if (allAnswered) {
            next.roundAnswers = {};
            next.riddleIndex = idx + 1;
            if (next.riddleIndex >= riddles.length) {
              next.status = 'finished';
              const sorted = [...players].sort((a, b) => (next.scores[b.id] || 0) - (next.scores[a.id] || 0));
              if ((next.scores[sorted[0].id] || 0) === (next.scores[sorted[1]?.id] || 0)) {
                next.isDraw = true;
              } else {
                next.winnerId = sorted[0].id;
              }
            }
          }
          setActiveMatch(next);
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'matches', next.id), next).catch(() => {});
          return;
        }

        // Solo / Bot Match
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
    if (!activeMatch) return;
    const me = resolveCurrentPlayer();
    const other = (activeMatch.players || []).find((p: any) => p.id !== me?.id) || { id: 'aegis_bot' };
    const finished = { ...activeMatch, status: 'finished', winnerId: other.id };
    setActiveMatch(finished);
    applyXpDelta('loss', activeMatch.id);
    if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
      await setDoc(doc(db, 'matches', activeMatch.id), finished).catch(() => {});
    }
  }, [activeMatch, resolveCurrentPlayer, applyXpDelta]);

  const sendMatchChat = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeMatch) return;
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setMatchChat((prev) => [...prev, msg]);
      if (activeMatch.isRealtimePvp && isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'matches', activeMatch.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [activeMatch, resolveCurrentPlayer]
  );

  const sendRoomChat = useCallback(
    async (text: string) => {
      if (!text.trim() || !currentRoom) return;
      const me = resolveCurrentPlayer();
      const msg = { id: Date.now(), sender: me?.displayName || 'Player', text: text.trim(), time: Date.now() };
      setRoomChat((prev) => [...prev, msg]);
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'rooms', currentRoom.id), { chat: arrayUnion(msg) }).catch(() => {});
      }
    },
    [currentRoom, resolveCurrentPlayer]
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
