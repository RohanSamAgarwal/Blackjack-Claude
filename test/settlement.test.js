import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleSession } from '../server/game/settlement.js';

test('nets and minimal transfers in the banker model (sums to zero)', () => {
  const players = [
    { id: 'a', name: 'Alice', buyIn: 100, chips: 150 },           // +50
    { id: 'b', name: 'Bob', buyIn: 100, chips: 60 },              // -40
    { id: 'k', name: 'Banker', buyIn: 100, chips: 90, isBanker: true }, // -10
  ];
  const { nets, transfers, balanced } = settleSession(players);
  assert.equal(balanced, true);
  assert.equal(nets.find((n) => n.id === 'a').net, 50);
  assert.equal(nets.find((n) => n.id === 'b').net, -40);
  assert.equal(nets.find((n) => n.id === 'k').net, -10);

  // Everyone who's down pays; total paid equals total owed (50).
  const paid = transfers.reduce((s, t) => s + t.amount, 0);
  assert.equal(paid, 50);
  // Alice is the only creditor, so every transfer lands on her.
  assert.ok(transfers.every((t) => t.to === 'a'));
  assert.equal(transfers.length, 2);
});

test('handles an unbalanced set by loading the residual on the banker', () => {
  const players = [
    { id: 'a', name: 'A', buyIn: 100, chips: 130 }, // +30
    { id: 'k', name: 'K', buyIn: 100, chips: 100, isBanker: true }, // 0 -> absorbs -30
  ];
  const { transfers } = settleSession(players);
  const paid = transfers.reduce((s, t) => s + t.amount, 0);
  assert.equal(paid, 30);
  assert.equal(transfers[0].from, 'k');
  assert.equal(transfers[0].to, 'a');
});

test('all-even session produces no transfers', () => {
  const players = [
    { id: 'a', name: 'A', buyIn: 100, chips: 100 },
    { id: 'b', name: 'B', buyIn: 100, chips: 100, isBanker: true },
  ];
  const { transfers } = settleSession(players);
  assert.equal(transfers.length, 0);
});
