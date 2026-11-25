import assert from 'node:assert/strict';
import test from 'node:test';
import { getBestTTTMove, getTTTOutcome, type TTTMark } from './ticTacToe.ts';

test('detects all win directions and a full-board draw', () => {
  assert.equal(getTTTOutcome(['X', 'X', 'X', 'O', null, 'O', null, null, null]), 'X');
  assert.equal(getTTTOutcome(['O', null, 'X', 'O', 'X', null, 'O', null, null]), 'O');
  assert.equal(getTTTOutcome(['X', null, 'O', null, 'X', 'O', 'O', null, 'X']), 'X');
  assert.equal(getTTTOutcome(['X', null, 'O', null, 'O', 'X', 'O', 'X', null]), 'O');
  assert.equal(getTTTOutcome(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), 'DRAW');
  assert.equal(getTTTOutcome(Array(9).fill(null)), null);
});

test('returns only an empty cell and handles a full board', () => {
  const board: TTTMark[] = ['X', 'O', 'X', 'O', null, null, null, null, null];
  const move = getBestTTTMove(board, 'hard');
  assert.ok(move >= 0 && move < 9);
  assert.equal(board[move], null);
  assert.equal(getBestTTTMove(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'], 'hard'), -1);
});

test('hard bot takes a winning move and blocks an immediate loss', () => {
  assert.equal(getBestTTTMove(['O', 'O', null, 'X', 'X', null, null, null, null], 'hard'), 2);
  assert.equal(getBestTTTMove(['X', 'X', null, 'O', null, null, null, 'O', null], 'hard'), 2);
});

test('hard bot cannot lose against any sequence of legal human moves', () => {
  const visit = (board: TTTMark[], humanTurn: boolean): void => {
    const outcome = getTTTOutcome(board);
    if (outcome !== null) {
      assert.notEqual(outcome, 'X');
      return;
    }

    if (humanTurn) {
      for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        board[i] = 'X';
        visit(board, false);
        board[i] = null;
      }
      return;
    }

    const move = getBestTTTMove(board, 'hard');
    assert.ok(move >= 0 && board[move] === null);
    board[move] = 'O';
    visit(board, true);
    board[move] = null;
  };

  for (let firstMove = 0; firstMove < 9; firstMove++) {
    const board: TTTMark[] = Array(9).fill(null);
    board[firstMove] = 'X';
    visit(board, false);
  }
});
