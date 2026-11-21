import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, ROOMS, startRound, swat, hide, tick, roomProgress, DURATION } from '../src/model.js';

test('rooms have stable unique item ids and positions', () => {
  for (const room of ROOMS) {
    assert.equal(room.things.length, 10);
    assert.equal(new Set(room.things.map(item => item.id)).size, 10);
    assert.ok(room.things.every(item => item.x > 0 && item.x < 1000 && item.y > 0 && item.y < 560));
  }
  assert.throws(() => createGame(99), RangeError);
});

test('swats require an active game, cannot double score and award combo', () => {
  const game = createGame();
  assert.equal(swat(game, 'cup'), null);
  assert.equal(startRound(game), true);
  assert.equal(startRound(game), false);
  const first = swat(game, 'cup');
  assert.equal(first.gain, 95);
  assert.equal(swat(game, 'cup'), null);
  const second = swat(game, 'vase');
  assert.equal(second.combo, 2);
  assert.equal(second.gain, 360);
  assert.equal(game.score, 455);
  assert.equal(roomProgress(game), 2);
  tick(game, 0.05);
  assert.ok(game.suspicion < 34);
});

test('hiding lowers suspicion, costs time and has cooldown', () => {
  const game = createGame();
  startRound(game);
  swat(game, 'cup');
  swat(game, 'vase');
  assert.equal(hide(game), true);
  assert.equal(game.suspicion, 0);
  assert.equal(game.timeLeft, DURATION - 2);
  assert.equal(swat(game, 'lamp'), null);
  assert.equal(hide(game), false);
  for (let i = 0; i < 30; i++) tick(game, .05);
  assert.equal(game.hiding, 0);
  assert.ok(game.hideCooldown > 0);
});

test('all props destroyed ends round and prevents additional scoring', () => {
  const game = createGame(1);
  startRound(game);
  for (const item of game.props) {
    // Imitate evasive play between swats.
    if (game.suspicion > 65) game.suspicion = 0;
    swat(game, item.id);
  }
  assert.equal(game.outcome, 'clean');
  assert.equal(game.phase, 'ended');
  assert.equal(roomProgress(game), 10);
  assert.equal(swat(game, 'bread'), null);
});

test('timer expires safely and no scoring occurs after game over', () => {
  const game = createGame();
  startRound(game);
  for (let i = 0; i < DURATION * 20; i++) tick(game, 0.05);
  assert.equal(game.phase, 'ended');
  assert.equal(game.outcome, 'time');
  assert.equal(game.timeLeft, 0);
  assert.equal(swat(game, 'cup'), null);
});

test('too much noise attracts the owner', () => {
  const game = createGame();
  startRound(game);
  for (const item of game.props) {
    if (game.phase === 'ended') break;
    swat(game, item.id);
  }
  assert.equal(game.outcome, 'caught');
});
