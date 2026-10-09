import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advise, autoAction, coreHitStand } from '../server/game/strategy.js';

const c = (rank, suit = 'S') => ({ rank, suit });
const hand = (...cards) => ({ cards });

test('advise: pairs', () => {
  assert.equal(advise(hand(c('8'), c('8')), c('10')).action, 'split');
  assert.equal(advise(hand(c('A'), c('A')), c('6')).action, 'split');
  assert.equal(advise(hand(c('10'), c('K')), c('6')).action, 'stand'); // never split 10s
});

test('advise: double vs no-double downgrade', () => {
  assert.equal(advise(hand(c('6'), c('5')), c('6')).action, 'double'); // hard 11
  assert.equal(advise(hand(c('6'), c('5')), c('6'), { canDouble: false }).action, 'hit');
});

test('advise: surrender only when allowed', () => {
  assert.equal(advise(hand(c('10'), c('6')), c('10'), { canSurrender: true }).action, 'surrender');
  assert.equal(advise(hand(c('10'), c('6')), c('10'), { canSurrender: false }).action, 'hit');
});

test('advise: soft 18', () => {
  assert.equal(advise(hand(c('A'), c('7')), c('9')).action, 'hit');   // vs strong
  assert.equal(advise(hand(c('A'), c('7')), c('2')).action, 'stand'); // vs 2
  assert.equal(advise(hand(c('A'), c('7')), c('4')).action, 'double'); // vs weak, can double
});

test('autoAction is count-free hit/stand only', () => {
  assert.equal(autoAction(hand(c('10'), c('6')), c('10')), 'hit');  // 16 vs 10
  assert.equal(autoAction(hand(c('10'), c('6')), c('6')), 'stand'); // 16 vs 6
  assert.equal(autoAction(hand(c('A'), c('7')), c('9')), 'hit');    // soft 18 vs 9
  assert.equal(autoAction(hand(c('A'), c('7')), c('6')), 'stand');  // soft 18 vs 6, no double
  // never recommends double/split even on an 11
  assert.equal(['hit', 'stand'].includes(autoAction(hand(c('6'), c('5')), c('6'))), true);
});

test('coreHitStand hard totals', () => {
  assert.equal(coreHitStand([c('10'), c('7')], c('K')), 'stand'); // 17
  assert.equal(coreHitStand([c('10'), c('2')], c('6')), 'stand'); // 12 vs 6
  assert.equal(coreHitStand([c('10'), c('2')], c('10')), 'hit');  // 12 vs 10
});
