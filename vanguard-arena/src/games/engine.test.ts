import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyConnect4Move,
  applyRPSMove,
  applySakarHtarAnswer,
  applyTTTMove,
  createConnect4State,
  createRPSState,
  createSakarHtarState,
  createTTTState,
  sanitizeRPSStateForPlayer,
  sanitizeSakarHtarStateForPlayer,
} from './engine.ts';
import type { MatchParticipant, SakarRiddle } from '../types.ts';

test('Connect Four rejects invalid turns and detects a vertical win', () => {
  let state = createConnect4State();
  assert.equal(applyConnect4Move(state, 2, 0).ok, false);
  for (const player of [1, 2, 1, 2, 1, 2, 1] as const) {
    const move = applyConnect4Move(state, player, player === 1 ? 0 : 1);
    assert.equal(move.ok, true);
    if (move.ok) state = move.next;
  }
  assert.equal(state.winner, 1);
  assert.equal(state.winLine?.length, 4);
  assert.equal(applyConnect4Move(state, 2, 2).ok, false);
});

test('Tic-Tac-Toe rejects occupied cells and detects a winning row', () => {
  let state = createTTTState();
  const moves: [1 | 2, number][] = [[1, 0], [2, 3], [1, 1], [2, 4], [1, 2]];
  for (const [player, cell] of moves) {
    const move = applyTTTMove(state, player, cell);
    assert.equal(move.ok, true);
    if (move.ok) state = move.next;
  }
  assert.equal(state.winner, 1);
  assert.deepEqual(state.winLine, [0, 1, 2]);
  assert.equal(applyTTTMove(state, 2, 5).ok, false);
});

test('Rock Paper Scissors keeps choices private and resolves a round', () => {
  let state = createRPSState(1);
  const first = applyRPSMove(state, 1, 'rock');
  assert.equal(first.ok, true);
  if (!first.ok) return;
  state = first.next;
  const hidden = sanitizeRPSStateForPlayer(state, 2);
  assert.equal(hidden.p1Choice, null);
  const second = applyRPSMove(state, 2, 'scissors');
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.roundResolved, true);
  assert.equal(second.next.winner, 1);
  assert.equal(second.next.p1Score, 1);
});

test('Sakar-Htar awards points, rejects duplicate answers and hides unrevealed answers', () => {
  const participants: MatchParticipant[] = [
    { id: 'p1', displayName: 'Player One', xp: 0 },
    { id: 'p2', displayName: 'Player Two', xp: 0 },
  ];
  const riddles: SakarRiddle[] = Array.from({ length: 10 }, (_, index) => ({
    id: `riddle-${index}`,
    questionMy: `Question ${index}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanationMy: 'Explanation',
    explanationEn: 'Explanation',
  }));
  const state = createSakarHtarState(participants, riddles, 2);
  const privateView = sanitizeSakarHtarStateForPlayer(state, 'p2');
  assert.equal('correctIndex' in privateView.questions[0], false);

  const answerTime = state.questionStartedAt + 1000;
  const first = applySakarHtarAnswer(state, 'p1', 0, answerTime);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.ok(first.points >= 100);
  assert.equal(applySakarHtarAnswer(first.next, 'p1', 1, answerTime).ok, false);

  const second = applySakarHtarAnswer(first.next, 'p2', 1, answerTime);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.allAnswered, true);
  assert.equal(second.next.players[0].correctCount, 1);
  assert.equal(second.next.players[1].correctCount, 0);
});
