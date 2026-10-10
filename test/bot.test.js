import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiDecision, aiBet } from '../server/game/bot.js';

const c = (rank, suit = 'S') => ({ rank, suit });
const hand = (...cards) => ({ cards });

test('basic bot core decisions', () => {
  assert.equal(aiDecision(hand(c('6'), c('5')), c('6'), 'basic'), 'double'); // 11
  assert.equal(aiDecision(hand(c('10'), c('10')), c('9'), 'basic'), 'stand'); // 20
  assert.equal(aiDecision(hand(c('10'), c('2')), c('5'), 'basic'), 'stand'); // 12 vs 5
  assert.equal(aiDecision(hand(c('10'), c('2')), c('10'), 'basic'), 'hit');  // 12 vs 10
});

test('aggressive bot doubles low two-card totals', () => {
  assert.equal(aiDecision(hand(c('6'), c('4')), c('10'), 'aggressive'), 'double'); // 10
  assert.equal(aiDecision(hand(c('10'), c('6')), c('7'), 'aggressive'), 'hit');    // 16 vs 7
});

test('beginner bot: deterministic extremes', () => {
  assert.equal(aiDecision(hand(c('10'), c('2')), c('5'), 'beginner'), 'hit');   // 12 < 15
  assert.equal(aiDecision(hand(c('10'), c('7')), c('5'), 'beginner'), 'stand'); // 17 >= 17
});

test('aiBet clamps to limits and chips', () => {
  const limits = { minBet: 5, maxBet: 500 };
  assert.equal(aiBet('beginner', 3, limits), 0); // can't meet min
  assert.equal(aiBet('beginner', 1000, limits, () => 0), 5); // floor to min
  assert.equal(aiBet('aggressive', 1000, limits, () => 0), 10);
  const bet = aiBet('basic', 1000, limits, () => 0.99);
  assert.ok(bet >= 5 && bet <= 500);
});
