import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, normalizeSettings } from '../server/game/settings.js';

test('defaults are sane', () => {
  const s = defaultSettings();
  assert.equal(s.decks, 2);
  assert.equal(s.assists.advisor, false);
  assert.equal(s.turnTimer.enabled, false);
  assert.equal(s.endCondition.type, 'manual');
});

test('normalize clamps numeric ranges', () => {
  const s = normalizeSettings(defaultSettings(), { decks: 99, buyIn: 1000, minBet: 9999, maxBet: 50 });
  assert.equal(s.decks, 8);
  assert.ok(s.maxBet <= s.buyIn);
  assert.ok(s.minBet <= s.maxBet);
});

test('assist + timer patches merge and coerce', () => {
  const s = normalizeSettings(defaultSettings(), {
    assists: { advisor: true },
    turnTimer: { enabled: true, seconds: 2 },
  });
  assert.equal(s.assists.advisor, true);
  assert.equal(s.assists.countReadout, false); // untouched
  assert.equal(s.turnTimer.enabled, true);
  assert.equal(s.turnTimer.seconds, 5); // clamped up to min 5
});

test('bad end condition throws', () => {
  assert.throws(() => normalizeSettings(defaultSettings(), { endCondition: { type: 'nope' } }));
});

test('numHands end condition normalizes', () => {
  const s = normalizeSettings(defaultSettings(), { endCondition: { type: 'numHands', numHands: 0 } });
  assert.equal(s.endCondition.type, 'numHands');
  assert.equal(s.endCondition.numHands, 1); // clamped up
});
