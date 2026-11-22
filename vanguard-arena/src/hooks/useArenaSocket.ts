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
  normalizeGameId,
  readServerlessStore,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import { soundEngine } from '../utils/sound.ts';
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

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// --- Connect 4 Helpers ---
interface Connect4Result {
  winner: 'P1' | 'P2' | 'DRAW';
  winningCells: Array<[number, number]>;
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

  for (const col of validCols) {
    const sim = simulateDrop(col, 'P2');
    if (sim && checkConnect4Winner(sim)?.winner === 'P2') return col;
  }

  if (difficulty !== 'easy') {
    for (const col of validCols) {
      const sim = simulateDrop(col, 'P1');
      if (sim && checkConnect4Winner(sim)?.winner === 'P1') return col;
    }
  }

  const preferred = [3, 2, 4, 1, 5, 0, 6].filter((c) => validCols.includes(c));
  if (difficulty === 'hard' && Math.random() > 0.25) return preferred[0];
  return validCols[Math.floor(Math.random() * validCols.length)];
}

// --- Tic Tac Toe Helpers ---
const TTT_WIN_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkTTTWinner(board: Array<string | null>): 'X' | 'O' | 'DRAW' | null {
  for (const [a, b, c] of TTT_WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  return board.every((cell) => cell !== null) ? 'DRAW' : null;
}

function pickSmartTTTMove(board: Array<string | null>, difficulty: string): number {
  const empty = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i !== -1);
  if (empty.length === 0) return -1;

  if (difficulty === 'easy' && Math.random() < 0.6) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Bot နိုင်မည့်အကွက် ရှာမည်
  for (const idx of empty) {
    const sim = [...board];
    sim[idx] = 'O';
    if (checkTTTWinner(sim) === 'O') return idx;
  }

  // User နိုင်တော့မည့်အကွက် ပိတ်မည်
  for (const idx of empty) {
    const sim = [...board];
    sim[idx] = 'X';
    if (checkTTTWinner(sim) === 'X') return idx;
  }

  // အလယ်ကွက်နှင့် ထောင့်ကွက်များ ဦးစားပေးမည်
  if (difficulty === 'hard') {
    if (board[4] === null) return 4;
    const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

function computeRankFromXp(xp: number): string {
  if (xp >= 2500) return 'Legend';
  if (xp >= 1800) return 'Diamond';
  if (xp >= 1300) return 'Gold';
  if (xp >= 1000) return 'Silver';
  return 'Bronze';
}

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
  const [botThinking, setBotThinking] = useState<boolean>(false);

  const botTimersRef = useRef<number[]>([]);
  const awardedMatchesRef = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<UserProfile | null>(null);

  const clearBotTimers = useCallback(() => {
    botTimersRef.current.forEach((id) => window.clearTimeout(id));
    botTimersRef.current = [];
    setBotThinking(false);
  }, []);

  useEffect(() => {
    if (!activeMatch) clearBotTimers();
    return () => clearBotTimers();
  }, [activeMatch?.id, clearBotTimers]);

  const pushToast = useCallback((level: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, level, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissWarningLocal = useCallback((warningId: string) => {
    setPendingWarnings((prev) => prev.filter((w) => w.id !== warningId));
  }, []);

  const setAdminSocketMode = useCallback((_mode: 'admin' | 'lobby') => {}, []);

  const applyXpDelta = useCallback(
    (result: 'win' | 'loss' | 'draw', matchId?: string) => {
      if (matchId && awardedMatchesRef.current.has(matchId)) return;
      if (matchId) awardedMatchesRef.current.add(matchId);

      const delta = result === 'win' ? 75 : result === 'draw' ? 25 : -20;
      const store = readServerlessStore();
      const uid =
        currentUserRef.current?.id ||
        (token === 'admin-token'
          ? 'admin_yanlinnaung'
          : (token || '').replace(/^token_/, '')) ||
        'admin_yanlinnaung';

      const existing = store.users[uid] || currentUserRef.current;
      if (!existing) return;

      const updated: any = {
        ...existing,
        xp: Math.max(0, (existing.xp || 0) + delta),
        wins: (existing.wins || 0) + (result === 'win' ? 1 : 0),
        losses: (existing.losses || 0) + (result === 'loss' ? 1 : 0),
        draws: (existing.draws || 0) + (result === 'draw' ? 1 : 0),
      };
      updated.rank = computeRankFromXp(updated.xp);

      store.users[uid] = updated;
      writeServerlessStore(store);
      currentUserRef.current = updated;
      onUserUpdate(updated);

      if (isFirebaseConfigured && db) {
        setDoc(doc(db, 'users', uid), stripUndefined(updated), { merge: true }).catch(() => {});
      }
    },
    [token, onUserUpdate]
  );

  // Ping Simulation
  useEffect(() => {
    if (!token) return;
    setConnectionState('connected');
    const timer = window.setInterval(() => {
      setPingMs(Math.floor(18 + Math.random() * 16));
    }, 5000);
    return () => window.clearInterval(timer);
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
        currentUserRef.current = me;
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

  // Real-Time Active PvP Match Listener
  useEffect(() => {
    if (!activeMatch?.id || !activeMatch?.isRealtimePvp || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(doc(db, 'matches', activeMatch.id), (snap) => {
      if (snap.exists()) {
        setActiveMatch(snap.data());
      }
    });
    return () => unsub();
  }, [activeMatch?.id, activeMatch?.isRealtimePvp]);

  const joinQueue = useCallback(
    (gameType: GameType, bestOf?: 3 | 5, turnTimeLimit?: TurnTimeLimit) => {
      setQueuedGame(gameType);
      setQueueStatus({ gameType, startedAt: Date.now() });
      pushToast('info', `Searching for ${gameType.toUpperCase()} opponent...`);

      const fallbackTimer = window.setTimeout(() => {
        const store = readServerlessStore();
        const me =
          currentUserRef.current ||
          store.users.admin_yanlinnaung ||
          Object.values(store.users)[0];
        if (!me) return;
        const botMatch = buildPlayableMatch(me, {
          gameType,
          mode: 'bot',
          difficulty: 'medium',
          bestOf,
          turnTimeLimit,
        });
        setQueuedGame(null);
        setQueueStatus(null);
        setActiveMatch(botMatch);
      }, 4500);

      botTimersRef.current.push(fallbackTimer);
    },
    [pushToast]
  );

  const leaveQueue = useCallback(() => {
    clearBotTimers();
    setQueuedGame(null);
    setQueueStatus(null);
  }, [clearBotTimers]);

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
      if (!activeMatch || activeMatch.status === 'finished') return;
      const next = JSON.parse(JSON.stringify(activeMatch));
      const gType = normalizeGameId(next.gameType);
      const players: any[] = next.players || [];
      const p1 = players[0];
      const p2 = players[1] || { id: 'aegis_bot', displayName: 'Aegis Bot' };
      const me = currentUserRef.current || p1;
      const isPvp = Boolean(next.isRealtimePvp && players.length >= 2);
      if (!next.scores) next.scores = { [p1.id]: 0, [p2.id]: 0 };

      // ==================== 1. CONNECT 4 (မောင်ဖိုးသား) ====================
      if (gType === 'connect4') {
        const grid: Array<Array<string | null>> = (
          next.c4Board ||
          next.board ||
          Array.from({ length: 6 }, () => Array(7).fill(null))
        ).map((r: any) => [...r]);
        const col = typeof move === 'number' ? move : move?.col ?? -1;
        if (col < 0 || col > 6) return;

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

        if (isPvp) {
          next.c4Board = grid;
          next.board = grid;
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
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          }
          return;
        }

        next.c4Board = grid;
        next.board = grid;
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
            next.winnerId = p1.id;
            next.botPhase = 'crying';
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 1;
            applyXpDelta('win', next.id);
          }
          setActiveMatch(next);
          return;
        }

        next.turnUserId = p2.id;
        next.botPhase = 'thinking';
        next.botTargetCol = null;
        setBotThinking(true);
        setActiveMatch(next);

        const botCol = pickConnect4BotCol(grid, next.difficulty || 'medium');
        if (botCol === -1) return;

        const thinkDelay = 900 + Math.floor(Math.random() * 550);
        const t1 = window.setTimeout(() => {
          setActiveMatch((prev: any) => {
            if (!prev || prev.status === 'finished') return prev;
            return { ...prev, botPhase: 'dropping', botTargetCol: botCol };
          });

          const t2 = window.setTimeout(() => {
            setBotThinking(false);
            setActiveMatch((prev: any) => {
              if (!prev || prev.status === 'finished') return prev;
              const updated = JSON.parse(JSON.stringify(prev));
              const nextGrid: Array<Array<string | null>> = (updated.c4Board || updated.board).map(
                (r: any) => [...r]
              );

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
              updated.board = nextGrid;
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

      // ==================== 2. TIC TAC TOE (မပုတု) ====================
      if (gType === 'tictactoe') {
        const board: Array<string | null> = [
          ...(next.tttBoard || next.board || Array(9).fill(null)),
        ];
        const idx = typeof move === 'number' ? move : move?.index ?? -1;
        if (idx < 0 || idx > 8 || board[idx] !== null) return;

        if (
          !isPvp &&
          (next.tttBotPhase === 'thinking' || next.tttBotPhase === 'bot_scratching')
        ) {
          return;
        }

        if (isPvp) {
          if (next.turnUserId !== me?.id) return;
          board[idx] = me?.id === p1.id ? 'X' : 'O';
          next.tttBoard = board;
          next.board = board;
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
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'matches', next.id), stripUndefined(next)).catch(() => {});
          }
          return;
        }

        // Bot Mode (မပုတု)
        (soundEngine as any).playClick?.();
        board[idx] = 'X';
        next.tttBoard = board;
        next.board = board;

        const userOutcome = checkTTTWinner(board);
        if (userOutcome) {
          next.status = 'finished';
          if (userOutcome === 'DRAW') {
            next.isDraw = true;
            next.tttBotPhase = 'idle';
            applyXpDelta('draw', next.id);
          } else {
            next.winnerId = p1.id;
            next.tttBotPhase = 'rolling_cry';
            next.scores[p1.id] = (next.scores[p1.id] || 0) + 1;
            applyXpDelta('win', next.id);
          }
          setActiveMatch(next);
          return;
        }

        // မပုတု ခဏစဥ်းစားမည်
        next.turnUserId = p2.id;
        next.tttBotPhase = 'thinking';
        next.tttBotTargetIdx = null;
        setBotThinking(true);
        setActiveMatch(next);

        const botPick = pickSmartTTTMove(board, next.difficulty || 'medium');
        if (botPick < 0) return;

        const thinkDelay = 950 + Math.floor(Math.random() * 500);
        const t1 = window.setTimeout(() => {
          // မပုတု တုတ်ချောင်းဖြင့် မြေကြီးခြစ်ဆွဲမည်
          setActiveMatch((prev: any) => {
            if (!prev || prev.status === 'finished') return prev;
            const updated = JSON.parse(JSON.stringify(prev));
            const nextBoard: Array<string | null> = [
              ...(updated.tttBoard || updated.board || Array(9).fill(null)),
            ];
            if (nextBoard[botPick] !== null) return prev;

            (soundEngine as any).playClick?.();
            nextBoard[botPick] = 'O';
            updated.tttBoard = nextBoard;
            updated.board = nextBoard;
            updated.tttBotPhase = 'bot_scratching';
            updated.tttBotTargetIdx = botPick;
            return updated;
          });

          const t2 = window.setTimeout(() => {
            setBotThinking(false);
            setActiveMatch((prev: any) => {
              if (!prev || prev.status === 'finished') return prev;
              const updated = JSON.parse(JSON.stringify(prev));
              updated.tttBotTargetIdx = null;

              const botOutcome = checkTTTWinner(updated.tttBoard || updated.board || []);
              if (botOutcome) {
                updated.status = 'finished';
                if (botOutcome === 'DRAW') {
                  updated.isDraw = true;
                  updated.tttBotPhase = 'idle';
                  applyXpDelta('draw', updated.id);
                } else {
                  updated.winnerId = p2.id;
                  updated.tttBotPhase = 'dancing';
                  updated.scores[p2.id] = (updated.scores[p2.id] || 0) + 1;
                  applyXpDelta('loss', updated.id);
                }
              } else {
                updated.tttBotPhase = 'idle';
                updated.turnUserId = p1.id;
              }
              return updated;
            });
          }, 480);

          botTimersRef.current.push(t2);
        }, thinkDelay);

        botTimersRef.current.push(t1);
        return;
      }

      // ==================== 3. ROCK PAPER SCISSORS ====================
      if (gType === 'rps') {
        const choice = move?.choice;
        if (!choice) return;
        const opts = ['rock', 'paper', 'scissors'];
        const botChoice = opts[Math.floor(Math.random() * opts.length)];
        const beats: Record<string, string> = {
          rock: 'scissors',
          paper: 'rock',
          scissors: 'paper',
        };
        const targetWins = Math.ceil((next.bestOf || 3) / 2);

        let roundWinner: string | null = null;
        if (choice !== botChoice) {
          roundWinner = beats[choice] === botChoice ? p1.id : p2.id;
          next.scores[roundWinner] = (next.scores[roundWinner] || 0) + 1;
        }

        next.round = (next.round || 1) + 1;
        next.lastRound = {
          p1Choice: choice,
          p2Choice: botChoice,
          winnerId: roundWinner,
        };
        if (next.state) {
          next.state.lastRound = next.lastRound;
          next.state.scores = next.scores;
        }

        if ((next.scores[p1.id] || 0) >= targetWins) {
          next.status = 'finished';
          next.winnerId = p1.id;
          applyXpDelta('win', next.id);
        } else if ((next.scores[p2.id] || 0) >= targetWins) {
          next.status = 'finished';
          next.winnerId = p2.id;
          applyXpDelta('loss', next.id);
        }

        setActiveMatch(next);
        return;
      }

      // ==================== 4. SAKAR HTAR / QUIZ ====================
      if (gType === 'sakarhtar') {
        const answerIndex = move?.answerIndex;
        if (typeof answerIndex !== 'number') return;
        const riddles = next.riddles || next.state?.riddles || [];
        const currentIndex = next.currentIndex ?? next.state?.currentIndex ?? 0;
        const currentRiddle = riddles[currentIndex];
        if (!currentRiddle) return;

        const isCorrect = answerIndex === currentRiddle.answerIndex;
        if (isCorrect) {
          next.scores[p1.id] = (next.scores[p1.id] || 0) + 10;
        }
        const botCorrect = Math.random() < (next.difficulty === 'hard' ? 0.75 : 0.45);
        if (!isPvp && botCorrect) {
          next.scores[p2.id] = (next.scores[p2.id] || 0) + 10;
        }

        next.lastAnswer = {
          userAnswer: answerIndex,
          correctIndex: currentRiddle.answerIndex,
          isCorrect,
        };

        const nextIdx = currentIndex + 1;
        if (nextIdx >= riddles.length) {
          next.status = 'finished';
          const s1 = next.scores[p1.id] || 0;
          const s2 = next.scores[p2.id] || 0;
          if (s1 === s2) {
            next.isDraw = true;
            applyXpDelta('draw', next.id);
          } else if (s1 > s2) {
            next.winnerId = p1.id;
            applyXpDelta('win', next.id);
          } else {
            next.winnerId = p2.id;
            applyXpDelta('loss', next.id);
          }
        } else {
          next.currentIndex = nextIdx;
          next.currentRiddle = riddles[nextIdx];
          if (next.state) {
            next.state.currentIndex = nextIdx;
            next.state.currentRiddle = riddles[nextIdx];
            next.state.scores = next.scores;
          }
        }

        setActiveMatch(next);
        return;
      }
    },
    [activeMatch, applyXpDelta]
  );

  const forfeitMatch = useCallback(() => {
    if (!activeMatch) return;
    clearBotTimers();
    const gType = normalizeGameId(activeMatch.gameType);
    const p2 = activeMatch.players?.[1] || { id: 'aegis_bot' };

    setActiveMatch({
      ...activeMatch,
      status: 'finished',
      winnerId: p2.id,
      botPhase: gType === 'connect4' ? 'happy' : activeMatch.botPhase,
      tttBotPhase: gType === 'tictactoe' ? 'dancing' : activeMatch.tttBotPhase,
    });
    applyXpDelta('loss', activeMatch.id);
    pushToast('info', 'Match forfeited.');
  }, [activeMatch, clearBotTimers, applyXpDelta, pushToast]);

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

  const respondChallenge = useCallback(
    (_challengeId: string, accept: boolean) => {
      setPendingChallenge(null);
      if (accept) pushToast('success', 'Challenge accepted!');
    },
    [pushToast]
  );

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
    botThinking,
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
