import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/game/Room.js';

const c = (rank, suit = 'S') => ({ rank, suit });
// A stacked shoe is drawn in array order (see _dealRound deal sequence).
const pad = (arr, n = 20) => arr.concat(Array.from({ length: n }, () => c('2')));

test('full round: two players beat a busting dealer; chips conserved; banker = −(others)', () => {
  // deal order: p0,p1,dealer-up, p0,p1,dealer-hole, then dealer draws.
  const shoe = pad([c('10'), c('10'), c('9'), c('10'), c('10'), c('7'), c('10')]);
  const room = new Room('TEST', { shoe });
  const host = room.join({ name: 'Host', socketId: 's1' }); // seat 0, banker
  const pat = room.join({ name: 'Pat', socketId: 's2' });   // seat 1

  room.startGame(host.id);
  room.placeBet(host.id, 10);
  room.placeBet(pat.id, 10);
  room.deal(host.id);

  assert.equal(room.phase, 'playing');
  assert.equal(room.active.seatIndex, 0);
  room.act(host.id, { type: 'stand' });
  assert.equal(room.active.seatIndex, 1);
  room.act(pat.id, { type: 'stand' });

  assert.equal(room.phase, 'roundEnd');
  const [s0, s1] = room.seats;
  assert.equal(s0.chips + s1.chips, 1500);  // chips conserved
  assert.equal(s1.chips, 760);              // Pat won +10
  assert.equal(s0.chips, 740);              // banker nets −(Pat's +10)
});

test('non-banker blackjack pays 3:2; banker (sitting out) covers it', () => {
  const shoe = pad([c('A'), c('10'), c('K'), c('9')]); // only seat 1 is dealt
  const room = new Room('BJ', { shoe });
  const host = room.join({ name: 'Bank', socketId: 's1' }); // seat 0, banker, sits out
  const pat = room.join({ name: 'Pat', socketId: 's2' });   // seat 1

  room.startGame(host.id);
  room.placeBet(pat.id, 10); // host places no bet
  room.deal(host.id);

  assert.equal(room.phase, 'roundEnd'); // natural resolves with no player turns
  const [s0, s1] = room.seats;
  assert.equal(s1.chips, 765); // +15 (3:2 on a 10 bet)
  assert.equal(s0.chips, 735); // banker covers the 15
  assert.equal(s0.chips + s1.chips, 1500);
});

test('bots play themselves out to roundEnd with no human action', () => {
  const shoe = pad([c('10'), c('9'), c('10'), c('7'), c('10')]); // only the bot is dealt
  const room = new Room('BOT', { shoe });
  const host = room.join({ name: 'Bank', socketId: 's1' }); // seat 0, banker, sits out
  room.addBot(host.id, 1, 'basic');

  room.startGame(host.id);
  room.deal(host.id); // bot auto-bets; bot stands on 20; dealer busts

  assert.equal(room.phase, 'roundEnd');
  const total = room.seats.filter(Boolean).reduce((s, x) => s + x.chips, 0);
  assert.equal(total, 1500); // conserved regardless of the bot's random bet
});

test('endSession produces a balanced settlement', () => {
  const shoe = pad([c('10'), c('10'), c('9'), c('10'), c('10'), c('7'), c('10')]);
  const room = new Room('END', { shoe });
  const host = room.join({ name: 'Host', socketId: 's1' });
  const pat = room.join({ name: 'Pat', socketId: 's2' });
  room.startGame(host.id);
  room.placeBet(host.id, 10);
  room.placeBet(pat.id, 10);
  room.deal(host.id);
  room.act(host.id, { type: 'stand' });
  room.act(pat.id, { type: 'stand' });

  room.endSession(host.id);
  assert.equal(room.phase, 'ended');
  const { nets, transfers, balanced } = room.settlement;
  assert.equal(balanced, true);
  assert.equal(nets.reduce((s, n) => s + n.net, 0), 0);
  // Pat is +10, host −10: a single transfer host → Pat of 10.
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].amount, 10);
});
