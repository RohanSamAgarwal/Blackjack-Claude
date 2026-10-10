import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handValue, isSoft, isBlackjack, canSplit, hiLoValue, cardValue, Shoe } from '../server/game/cards.js';

const c = (rank, suit = 'S') => ({ rank, suit });

test('cardValue', () => {
  assert.equal(cardValue(c('A')), 11);
  assert.equal(cardValue(c('K')), 10);
  assert.equal(cardValue(c('10')), 10);
  assert.equal(cardValue(c('7')), 7);
});

test('handValue downgrades aces to avoid busting', () => {
  assert.equal(handValue([c('A'), c('K')]), 21);
  assert.equal(handValue([c('A'), c('6')]), 17);
  assert.equal(handValue([c('A'), c('6'), c('10')]), 17); // ace becomes 1
  assert.equal(handValue([c('A'), c('A'), c('9')]), 21);
  assert.equal(handValue([c('A'), c('A'), c('A')]), 13);
  assert.equal(handValue([c('K'), c('Q'), c('5')]), 25); // bust value reported
});

test('isSoft', () => {
  assert.equal(isSoft([c('A'), c('6')]), true);
  assert.equal(isSoft([c('A'), c('6'), c('10')]), false); // ace forced to 1
  assert.equal(isSoft([c('10'), c('7')]), false);
  assert.equal(isSoft([c('A'), c('A')]), true); // 12, one ace still 11
});

test('isBlackjack is two-card 21 only', () => {
  assert.equal(isBlackjack([c('A'), c('K')]), true);
  assert.equal(isBlackjack([c('A'), c('5'), c('5')]), false);
  assert.equal(isBlackjack([c('10'), c('9')]), false);
});

test('canSplit on equal value', () => {
  assert.equal(canSplit([c('8'), c('8')]), true);
  assert.equal(canSplit([c('10'), c('K')]), true);
  assert.equal(canSplit([c('10'), c('9')]), false);
});

test('hiLoValue', () => {
  assert.equal(hiLoValue(c('2')), 1);
  assert.equal(hiLoValue(c('6')), 1);
  assert.equal(hiLoValue(c('7')), 0);
  assert.equal(hiLoValue(c('9')), 0);
  assert.equal(hiLoValue(c('10')), -1);
  assert.equal(hiLoValue(c('A')), -1);
});

test('Shoe builds, draws, and tracks remaining', () => {
  const shoe = Shoe.fresh(1, () => 0.5);
  assert.equal(shoe.remaining(), 52);
  const first = shoe.draw();
  assert.ok(first.rank && first.suit);
  assert.equal(shoe.remaining(), 51);
  // 6 decks → 312 cards
  assert.equal(Shoe.build(6).length, 312);
});
