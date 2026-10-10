import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playDealer, resolveHand, resolveInsurance } from '../server/game/round.js';

const c = (rank, suit = 'S') => ({ rank, suit });
// A draw function that deals the given cards in order.
const feeder = (cards) => { let i = 0; return () => cards[i++]; };

test('dealer stands on hard 17 and above', () => {
  const final = playDealer([c('10'), c('7')], feeder([]), { hitSoft17: false });
  assert.deepEqual(final, [c('10'), c('7')]);
});

test('dealer hits until reaching 17', () => {
  const final = playDealer([c('5'), c('6')], feeder([c('6')]), {}); // 11 -> draw 6 -> 17
  assert.equal(final.length, 3);
});

test('soft 17 rule', () => {
  const stand = playDealer([c('A'), c('6')], feeder([c('4')]), { hitSoft17: false });
  assert.equal(stand.length, 2); // stands on soft 17
  const hit = playDealer([c('A'), c('6')], feeder([c('4')]), { hitSoft17: true });
  assert.equal(hit.length, 3); // hits soft 17 -> A,6,4 = 21, then stops
});

test('resolveHand outcomes', () => {
  assert.deepEqual(resolveHand({ cards: [c('10'), c('10')], bet: 10 }, [c('10'), c('9')]),
    { result: 'WIN', ret: 20 });
  assert.deepEqual(resolveHand({ cards: [c('10'), c('9')], bet: 10 }, [c('10'), c('10')]),
    { result: 'LOSE', ret: 0 });
  assert.deepEqual(resolveHand({ cards: [c('10'), c('8')], bet: 10 }, [c('10'), c('8')]),
    { result: 'PUSH', ret: 10 });
  assert.deepEqual(resolveHand({ cards: [c('K'), c('6'), c('10')], bet: 10 }, [c('10'), c('7')]),
    { result: 'BUST', ret: 0 });
});

test('blackjack pays 3:2 and pushes vs dealer blackjack', () => {
  assert.deepEqual(resolveHand({ cards: [c('A'), c('K')], bet: 10 }, [c('10'), c('9')]),
    { result: 'BLACKJACK', ret: 25 }); // 10 + 15
  assert.deepEqual(resolveHand({ cards: [c('A'), c('K')], bet: 10 }, [c('A'), c('Q')]),
    { result: 'PUSH', ret: 10 });
});

test('21 after a split is not a blackjack', () => {
  const r = resolveHand({ cards: [c('A'), c('K')], bet: 10, fromSplit: true }, [c('10'), c('9')]);
  assert.equal(r.result, 'WIN');
  assert.equal(r.ret, 20);
});

test('surrender returns half', () => {
  assert.deepEqual(resolveHand({ cards: [c('10'), c('6')], bet: 10, surrendered: true }, [c('10'), c('K')]),
    { result: 'SURRENDER', ret: 5 });
});

test('insurance pays 2:1 only on dealer blackjack', () => {
  assert.deepEqual(resolveInsurance(5, [c('A'), c('K')]), { result: 'WIN', ret: 15 });
  assert.deepEqual(resolveInsurance(5, [c('A'), c('6')]), { result: 'LOSE', ret: 0 });
  assert.deepEqual(resolveInsurance(0, [c('A'), c('K')]), { result: 'NONE', ret: 0 });
});
