import type {
  Connect4State,
  Difficulty,
  GameState,
  GameType,
  MatchParticipant,
  RPSChoice,
  RPSState,
  SakarHtarPlayerState,
  SakarHtarState,
  SakarRiddle,
  TTTState,
} from '../types.ts';
import { BUILT_IN_SAKAR_RIDDLES } from './sakarHtar/riddles.ts';

// ─── CONNECT 4 (6 rows x 7 cols) ─────────────────────────────────────────────

export const C4_ROWS = 6;
export const C4_COLS = 7;

export function createConnect4State(): Connect4State {
  return {
    gameType: 'connect4',
    board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(0) as (0 | 1 | 2)[]),
    turn: 1,
    winner: 0,
    winLine: null,
    lastMove: null,
  };
}

export function getConnect4DropRow(board: (0 | 1 | 2)[][], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1;
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

export function checkConnect4Win(board: (0 | 1 | 2)[][]): { winner: 0 | 1 | 2 | 'draw'; winLine: [number, number][] | null } {
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const p = board[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS || board[nr][nc] !== p) break;
          line.push([nr, nc]);
        }
        if (line.length === 4) {
          return { winner: p, winLine: line };
        }
      }
    }
  }

  const full = board[0].every((cell) => cell !== 0);
  if (full) return { winner: 'draw', winLine: null };
  return { winner: 0, winLine: null };
}

export function applyConnect4Move(
  state: Connect4State,
  playerNum: 1 | 2,
  col: number
): { ok: true; next: Connect4State } | { ok: false; error: string } {
  if (state.winner !== 0) return { ok: false, error: 'Match already finished' };
  if (state.turn !== playerNum) return { ok: false, error: 'Not your turn' };
  const row = getConnect4DropRow(state.board, col);
  if (row === -1) return { ok: false, error: 'Column is full or invalid' };

  const nextBoard = state.board.map((r) => [...r]);
  nextBoard[row][col] = playerNum;
  const { winner, winLine } = checkConnect4Win(nextBoard);

  return {
    ok: true,
    next: {
      ...state,
      board: nextBoard,
      turn: winner === 0 ? (playerNum === 1 ? 2 : 1) : state.turn,
      winner,
      winLine,
      lastMove: { row, col },
    },
  };
}

function scoreWindow(window: (0 | 1 | 2)[], botNum: 1 | 2): number {
  const oppNum: 1 | 2 = botNum === 1 ? 2 : 1;
  let botCount = 0;
  let oppCount = 0;
  let emptyCount = 0;
  for (const cell of window) {
    if (cell === botNum) botCount++;
    else if (cell === oppNum) oppCount++;
    else emptyCount++;
  }
  if (botCount === 4) return 10000;
  if (oppCount === 4) return -10000;
  let score = 0;
  if (botCount === 3 && emptyCount === 1) score += 12;
  else if (botCount === 2 && emptyCount === 2) score += 3;
  if (oppCount === 3 && emptyCount === 1) score -= 18;
  return score;
}

function evaluateConnect4(board: (0 | 1 | 2)[][], botNum: 1 | 2): number {
  let score = 0;
  // Center column preference
  const centerCol = Math.floor(C4_COLS / 2);
  let centerCount = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    if (board[r][centerCol] === botNum) centerCount++;
  }
  score += centerCount * 4;

  // Horizontal
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], botNum);
    }
  }
  // Vertical
  for (let c = 0; c < C4_COLS; c++) {
    for (let r = 0; r <= C4_ROWS - 4; r++) {
      score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], botNum);
    }
  }
  // Diagonals
  for (let r = 0; r <= C4_ROWS - 4; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], botNum);
      score += scoreWindow([board[r + 3][c], board[r + 2][c + 1], board[r + 1][c + 2], board[r][c + 3]], botNum);
    }
  }
  return score;
}

function getValidCols(board: (0 | 1 | 2)[][]): number[] {
  const order = [3, 2, 4, 1, 5, 0, 6];
  return order.filter((c) => board[0][c] === 0);
}

function minimaxC4(
  board: (0 | 1 | 2)[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botNum: 1 | 2
): { col: number; score: number } {
  const oppNum: 1 | 2 = botNum === 1 ? 2 : 1;
  const { winner } = checkConnect4Win(board);
  const validCols = getValidCols(board);

  if (winner === botNum) return { col: -1, score: 100000 + depth };
  if (winner === oppNum) return { col: -1, score: -100000 - depth };
  if (winner === 'draw' || validCols.length === 0) return { col: -1, score: 0 };
  if (depth === 0) return { col: -1, score: evaluateConnect4(board, botNum) };

  if (maximizing) {
    let bestScore = -Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getConnect4DropRow(board, col);
      board[row][col] = botNum;
      const result = minimaxC4(board, depth - 1, alpha, beta, false, botNum);
      board[row][col] = 0;
      if (result.score > bestScore) {
        bestScore = result.score;
        bestCol = col;
      }
      alpha = Math.max(alpha, bestScore);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: bestScore };
  } else {
    let bestScore = Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getConnect4DropRow(board, col);
      board[row][col] = oppNum;
      const result = minimaxC4(board, depth - 1, alpha, beta, true, botNum);
      board[row][col] = 0;
      if (result.score < bestScore) {
        bestScore = result.score;
        bestCol = col;
      }
      beta = Math.min(beta, bestScore);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: bestScore };
  }
}

export function getConnect4BotMove(state: Connect4State, difficulty: Difficulty, botNum: 1 | 2 = 2): number {
  const validCols = getValidCols(state.board);
  if (validCols.length === 0) return 0;

  if (difficulty === 'easy') {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  const depth = difficulty === 'medium' ? 3 : 5;
  if (difficulty === 'medium' && Math.random() < 0.25) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  const clone = state.board.map((r) => [...r]);
  const { col } = minimaxC4(clone, depth, -Infinity, Infinity, true, botNum);
  return col !== -1 ? col : validCols[0];
}

// ─── TIC-TAC-TOE (3x3) ───────────────────────────────────────────────────────

const TTT_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createTTTState(): TTTState {
  return {
    gameType: 'ttt',
    board: Array(9).fill(0) as (0 | 1 | 2)[],
    turn: 1,
    winner: 0,
    winLine: null,
    lastMove: null,
  };
}

export function checkTTTWin(board: (0 | 1 | 2)[]): { winner: 0 | 1 | 2 | 'draw'; winLine: number[] | null } {
  for (const line of TTT_WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winLine: line };
    }
  }
  if (board.every((c) => c !== 0)) return { winner: 'draw', winLine: null };
  return { winner: 0, winLine: null };
}

export function applyTTTMove(
  state: TTTState,
  playerNum: 1 | 2,
  index: number
): { ok: true; next: TTTState } | { ok: false; error: string } {
  if (state.winner !== 0) return { ok: false, error: 'Match already finished' };
  if (state.turn !== playerNum) return { ok: false, error: 'Not your turn' };
  if (index < 0 || index >= 9 || state.board[index] !== 0) {
    return { ok: false, error: 'Invalid or occupied cell' };
  }

  const nextBoard = [...state.board];
  nextBoard[index] = playerNum;
  const { winner, winLine } = checkTTTWin(nextBoard);

  return {
    ok: true,
    next: {
      ...state,
      board: nextBoard,
      turn: winner === 0 ? (playerNum === 1 ? 2 : 1) : state.turn,
      winner,
      winLine,
      lastMove: index,
    },
  };
}

function minimaxTTT(board: (0 | 1 | 2)[], depth: number, maximizing: boolean, botNum: 1 | 2): { index: number; score: number } {
  const oppNum: 1 | 2 = botNum === 1 ? 2 : 1;
  const { winner } = checkTTTWin(board);
  if (winner === botNum) return { index: -1, score: 10 - depth };
  if (winner === oppNum) return { index: -1, score: depth - 10 };
  if (winner === 'draw') return { index: -1, score: 0 };

  const empty: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === 0) empty.push(i);
  }

  if (maximizing) {
    let bestScore = -Infinity;
    let bestIdx = empty[0];
    for (const idx of empty) {
      board[idx] = botNum;
      const res = minimaxTTT(board, depth + 1, false, botNum);
      board[idx] = 0;
      if (res.score > bestScore) {
        bestScore = res.score;
        bestIdx = idx;
      }
    }
    return { index: bestIdx, score: bestScore };
  } else {
    let bestScore = Infinity;
    let bestIdx = empty[0];
    for (const idx of empty) {
      board[idx] = oppNum;
      const res = minimaxTTT(board, depth + 1, true, botNum);
      board[idx] = 0;
      if (res.score < bestScore) {
        bestScore = res.score;
        bestIdx = idx;
      }
    }
    return { index: bestIdx, score: bestScore };
  }
}

export function getTTTBotMove(state: TTTState, difficulty: Difficulty, botNum: 1 | 2 = 2): number {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (state.board[i] === 0) empty.push(i);
  }
  if (empty.length === 0) return 0;

  if (difficulty === 'easy') {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  if (difficulty === 'medium' && Math.random() < 0.4) {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  const clone = [...state.board];
  return minimaxTTT(clone, 0, true, botNum).index;
}

// ─── ROCK, PAPER, SCISSORS (Best-of-3 / Best-of-5) ───────────────────────────

export function createRPSState(bestOf: 1 | 3 | 5 = 3): RPSState {
  return {
    gameType: 'rps',
    bestOf,
    currentRound: 1,
    p1Score: 0,
    p2Score: 0,
    p1Submitted: false,
    p2Submitted: false,
    p1Choice: null,
    p2Choice: null,
    lastReveal: null,
    history: [],
    winner: 0,
  };
}

function resolveRPSRound(p1: RPSChoice, p2: RPSChoice): 1 | 2 | 'draw' {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) {
    return 1;
  }
  return 2;
}

export function applyRPSMove(
  state: RPSState,
  playerNum: 1 | 2,
  choice: RPSChoice
): { ok: true; next: RPSState; roundResolved: boolean } | { ok: false; error: string } {
  if (state.winner !== 0) return { ok: false, error: 'Match already finished' };
  if (choice !== 'rock' && choice !== 'paper' && choice !== 'scissors') {
    return { ok: false, error: 'Invalid choice' };
  }
  if (playerNum === 1 && state.p1Submitted) return { ok: false, error: 'Already submitted for this round' };
  if (playerNum === 2 && state.p2Submitted) return { ok: false, error: 'Already submitted for this round' };

  const p1Choice = playerNum === 1 ? choice : state.p1Choice ?? null;
  const p2Choice = playerNum === 2 ? choice : state.p2Choice ?? null;
  const p1Submitted = playerNum === 1 ? true : state.p1Submitted;
  const p2Submitted = playerNum === 2 ? true : state.p2Submitted;

  if (p1Submitted && p2Submitted && p1Choice && p2Choice) {
    const roundWinner = resolveRPSRound(p1Choice, p2Choice);
    const p1Score = state.p1Score + (roundWinner === 1 ? 1 : 0);
    const p2Score = state.p2Score + (roundWinner === 2 ? 1 : 0);
    const neededToWin = Math.ceil(state.bestOf / 2);
    const matchWinner: 0 | 1 | 2 | 'draw' =
      p1Score >= neededToWin ? 1 : p2Score >= neededToWin ? 2 : 0;

    const record = {
      round: state.currentRound,
      p1Choice,
      p2Choice,
      winner: roundWinner,
    };

    return {
      ok: true,
      roundResolved: true,
      next: {
        ...state,
        p1Score,
        p2Score,
        p1Submitted: false,
        p2Submitted: false,
        p1Choice: null,
        p2Choice: null,
        lastReveal: record,
        history: [...state.history, record],
        currentRound: matchWinner === 0 ? state.currentRound + 1 : state.currentRound,
        winner: matchWinner,
      },
    };
  }

  return {
    ok: true,
    roundResolved: false,
    next: {
      ...state,
      p1Choice,
      p2Choice,
      p1Submitted,
      p2Submitted,
    },
  };
}

export function sanitizeRPSStateForPlayer(state: RPSState, viewerNum: 1 | 2 | 0): RPSState {
  if (state.winner !== 0) return state;
  return {
    ...state,
    p1Choice: viewerNum === 1 ? state.p1Choice : null,
    p2Choice: viewerNum === 2 ? state.p2Choice : null,
  };
}

export function getRPSBotMove(state: RPSState, difficulty: Difficulty): RPSChoice {
  const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
  if (difficulty === 'easy' || state.history.length === 0) {
    return choices[Math.floor(Math.random() * 3)];
  }
  const counter: Record<RPSChoice, RPSChoice> = {
    rock: 'paper',
    paper: 'scissors',
    scissors: 'rock',
  };
  const lastOpp = state.history[state.history.length - 1].p1Choice;
  if (difficulty === 'medium') {
    return Math.random() < 0.55 ? counter[lastOpp] : choices[Math.floor(Math.random() * 3)];
  }
  // Hard: analyze frequency of opponent moves
  const counts: Record<RPSChoice, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const h of state.history) {
    counts[h.p1Choice]++;
  }
  let mostFrequent: RPSChoice = lastOpp;
  let maxC = -1;
  for (const k of choices) {
    if (counts[k] > maxC) {
      maxC = counts[k];
      mostFrequent = k;
    }
  }
  return Math.random() < 0.72 ? counter[mostFrequent] : counter[lastOpp];
}

// ─── SAKAR-HTAR (စကားထာ — 10-Question Multi-Player Riddle Duel) ──────────────

export const SAKAR_QUESTION_COUNT = 10;
export const SAKAR_QUESTION_DURATION_MS = 15_000;
export const SAKAR_REVEAL_DURATION_MS = 3_200;

export function pickRandomRiddles(pool: SakarRiddle[], count = SAKAR_QUESTION_COUNT): SakarRiddle[] {
  const source = pool.length >= count ? [...pool] : [...pool, ...BUILT_IN_SAKAR_RIDDLES];
  const uniqueMap = new Map<string, SakarRiddle>();
  for (const r of source) {
    if (!uniqueMap.has(r.id)) uniqueMap.set(r.id, r);
  }
  const items = Array.from(uniqueMap.values());
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, count);
}

export function createSakarHtarState(
  participants: MatchParticipant[],
  riddles: SakarRiddle[] = BUILT_IN_SAKAR_RIDDLES,
  seatCapacity = 6
): SakarHtarState {
  const now = Date.now();
  const selected = pickRandomRiddles(riddles, SAKAR_QUESTION_COUNT);
  const players: SakarHtarPlayerState[] = participants.map((p, idx) => ({
    id: p.id,
    gameId: p.gameId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    frameId: p.frameId,
    xp: p.xp,
    seatIndex: idx,
    score: 0,
    correctCount: 0,
    streak: 0,
    answeredCurrent: false,
    selectedOptionCurrent: null,
    lastAnswerCorrect: null,
    lastPointsEarned: 0,
    answers: [],
  }));

  return {
    gameType: 'sakar_htar',
    seatCapacity: Math.max(seatCapacity, players.length),
    totalQuestions: selected.length,
    questionIndex: 0,
    phase: 'question',
    questionStartedAt: now,
    questionDeadline: now + SAKAR_QUESTION_DURATION_MS,
    revealDeadline: null,
    questions: selected.map((r) => ({
      id: r.id,
      questionMy: r.questionMy,
      hintEn: r.hintEn,
      options: r.options,
      correctIndex: r.correctIndex,
      explanationMy: r.explanationMy,
      explanationEn: r.explanationEn,
    })),
    players,
    winner: 0,
  };
}

export function applySakarHtarAnswer(
  state: SakarHtarState,
  playerId: string,
  optionIndex: number,
  nowMs = Date.now()
): { ok: true; next: SakarHtarState; allAnswered: boolean; isCorrect: boolean; points: number } | { ok: false; error: string } {
  if (state.phase !== 'question') return { ok: false, error: 'Question phase is closed' };
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
    return { ok: false, error: 'Invalid option index' };
  }
  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) return { ok: false, error: 'Player not seated in this match' };
  const target = state.players[playerIdx];
  if (target.answeredCurrent) return { ok: false, error: 'Already answered this riddle' };

  const currentQ = state.questions[state.questionIndex];
  const isCorrect = optionIndex === currentQ.correctIndex;
  const elapsedMs = Math.max(0, nowMs - state.questionStartedAt);
  const remainingMs = Math.max(0, state.questionDeadline - nowMs);

  let points = 0;
  const nextStreak = isCorrect ? target.streak + 1 : 0;
  if (isCorrect) {
    const speedBonus = Math.round((remainingMs / SAKAR_QUESTION_DURATION_MS) * 100);
    const streakBonus = Math.min(50, (nextStreak - 1) * 15);
    points = 100 + speedBonus + streakBonus;
  }

  const nextPlayers = state.players.map((p, idx) =>
    idx !== playerIdx
      ? p
      : {
          ...p,
          score: p.score + points,
          correctCount: p.correctCount + (isCorrect ? 1 : 0),
          streak: nextStreak,
          answeredCurrent: true,
          selectedOptionCurrent: optionIndex,
          lastAnswerCorrect: isCorrect,
          lastPointsEarned: points,
          answers: [
            ...p.answers,
            {
              questionIndex: state.questionIndex,
              selectedIndex: optionIndex,
              isCorrect,
              points,
              timeMs: elapsedMs,
            },
          ],
        }
  );

  const allAnswered = nextPlayers.every((p) => p.answeredCurrent);
  return {
    ok: true,
    allAnswered,
    isCorrect,
    points,
    next: {
      ...state,
      players: nextPlayers,
    },
  };
}

export function revealSakarHtarQuestion(state: SakarHtarState, nowMs = Date.now()): SakarHtarState {
  if (state.phase !== 'question') return state;
  const nextPlayers = state.players.map((p) => {
    if (p.answeredCurrent) return p;
    return {
      ...p,
      streak: 0,
      answeredCurrent: true,
      selectedOptionCurrent: null,
      lastAnswerCorrect: false,
      lastPointsEarned: 0,
      answers: [
        ...p.answers,
        {
          questionIndex: state.questionIndex,
          selectedIndex: null,
          isCorrect: false,
          points: 0,
          timeMs: SAKAR_QUESTION_DURATION_MS,
        },
      ],
    };
  });

  return {
    ...state,
    phase: 'reveal',
    revealDeadline: nowMs + SAKAR_REVEAL_DURATION_MS,
    players: nextPlayers,
  };
}

export function advanceSakarHtarQuestion(state: SakarHtarState, nowMs = Date.now()): SakarHtarState {
  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= state.totalQuestions) {
    const sorted = [...state.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctCount - a.correctCount;
    });
    const top = sorted[0];
    const second = sorted[1];
    let winner: 0 | 1 | 2 | 'draw' = 1;
    if (sorted.length >= 2 && top.score === second.score && top.correctCount === second.correctCount) {
      winner = 'draw';
    } else if (state.players.length >= 2 && top?.id === state.players[1]?.id) {
      winner = 2;
    }

    return {
      ...state,
      phase: 'finished',
      revealDeadline: null,
      winner,
    };
  }

  return {
    ...state,
    questionIndex: nextIndex,
    phase: 'question',
    questionStartedAt: nowMs,
    questionDeadline: nowMs + SAKAR_QUESTION_DURATION_MS,
    revealDeadline: null,
    players: state.players.map((p) => ({
      ...p,
      answeredCurrent: false,
      selectedOptionCurrent: null,
      lastAnswerCorrect: null,
      lastPointsEarned: 0,
    })),
  };
}

export function sanitizeSakarHtarStateForPlayer(state: SakarHtarState, viewerId: string): SakarHtarState {
  if (state.phase === 'finished') return state;
  return {
    ...state,
    questions: state.questions.map((q, idx) => {
      const revealed = idx < state.questionIndex || (idx === state.questionIndex && state.phase === 'reveal');
      if (revealed) return q;
      return {
        id: q.id,
        questionMy: q.questionMy,
        hintEn: q.hintEn,
        options: q.options,
      };
    }),
    players: state.players.map((p) => {
      if (state.phase === 'reveal' || p.id === viewerId) return p;
      return {
        ...p,
        selectedOptionCurrent: null,
        lastAnswerCorrect: null,
        lastPointsEarned: 0,
      };
    }),
  };
}

export function createInitialGameState(
  gameType: GameType,
  options?: {
    bestOf?: 1 | 3 | 5;
    participants?: MatchParticipant[];
    riddles?: SakarRiddle[];
    seatCapacity?: number;
  }
): GameState {
  if (gameType === 'connect4') return createConnect4State();
  if (gameType === 'ttt') return createTTTState();
  if (gameType === 'sakar_htar') {
    return createSakarHtarState(
      options?.participants || [],
      options?.riddles || BUILT_IN_SAKAR_RIDDLES,
      options?.seatCapacity || 6
    );
  }
  const bo = options?.bestOf === 1 || options?.bestOf === 5 ? options.bestOf : 3;
  return createRPSState(bo);
}
