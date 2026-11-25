export type TTTMark = 'X' | 'O' | null;
export type TTTOutcome = 'X' | 'O' | 'DRAW' | null;

export const TTT_WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function getTTTOutcome(board: readonly TTTMark[]): TTTOutcome {
  if (board.length !== 9) return null;
  for (const [a, b, c] of TTT_WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell !== null) ? 'DRAW' : null;
}

function minimax(board: TTTMark[], maximizing: boolean, depth: number): number {
  const outcome = getTTTOutcome(board);
  if (outcome === 'O') return 10 - depth;
  if (outcome === 'X') return depth - 10;
  if (outcome === 'DRAW') return 0;

  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue;
      board[i] = 'O';
      best = Math.max(best, minimax(board, false, depth + 1));
      board[i] = null;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    board[i] = 'X';
    best = Math.min(best, minimax(board, true, depth + 1));
    board[i] = null;
  }
  return best;
}

function getTacticalMove(board: readonly TTTMark[], mark: 'X' | 'O'): number {
  for (const [a, b, c] of TTT_WIN_LINES) {
    const line = [a, b, c];
    const marked = line.filter((index) => board[index] === mark);
    const empty = line.find((index) => board[index] === null);
    if (marked.length === 2 && empty !== undefined) return empty;
  }
  return -1;
}

export function getBestTTTMove(board: readonly TTTMark[], difficulty: string = 'medium'): number {
  const empty = board.map((cell, index) => cell === null ? index : -1).filter((index) => index !== -1);
  if (empty.length === 0) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];

  const winningMove = getTacticalMove(board, 'O');
  if (winningMove !== -1) return winningMove;
  const blockingMove = getTacticalMove(board, 'X');
  if (blockingMove !== -1) return blockingMove;

  if (difficulty !== 'hard') {
    if (board[4] === null) return 4;
    const corners = [0, 2, 6, 8].filter((index) => board[index] === null);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return empty[Math.floor(Math.random() * empty.length)];
  }

  const workingBoard = [...board];
  let bestMove = empty[0];
  let bestScore = -Infinity;
  for (const index of empty) {
    workingBoard[index] = 'O';
    const score = minimax(workingBoard, false, 1);
    workingBoard[index] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }
  return bestMove;
}
