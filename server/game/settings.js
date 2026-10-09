// =============================================================================
//  settings.js — host-configurable room settings: defaults + validation.
// =============================================================================

export const END_TYPES = ['manual', 'numHands', 'timeLimit'];
export const MAX_SEATS = 6;
export const MIN_SEATS = 1;

export function defaultSettings() {
  return {
    decks: 2,                   // 1–4 deck shoe
    dealerHitsSoft17: false,    // S17 by default
    blackjackPays: 1.5,         // 3:2 (1.2 = 6:5)
    minBet: 5,
    maxBet: 500,
    buyIn: 750,                 // starting chips per seat (per buy-in)
    maxSeats: 4,
    allowSurrender: true,
    allowInsurance: true,       // insurance offered when the dealer shows an Ace
    // Optional assists — host toggles; default off for multiplayer fairness.
    assists: {
      advisor: false,           // "ask the dealer" basic-strategy hint
      countReadout: false,      // Hi-Lo running + true count panel
      hiLoTags: false,          // per-card +1 / 0 / −1 tags on dealt cards
    },
    // Per-turn clock. On expiry the server auto-finishes the hand by basic
    // strategy from the table cards (no count, no new wager) and stops.
    turnTimer: { enabled: false, seconds: 30 },
    endCondition: { type: 'manual' },
  };
}

const clampInt = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};
const clampNum = (v, lo, hi, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

/**
 * Merge a partial patch over current settings, then validate/normalize.
 * Throws on bad enums; clamps numeric ranges silently.
 */
export function normalizeSettings(current, patch = {}) {
  const base = current || defaultSettings();
  const s = { ...base, ...patch };
  if (patch.assists) s.assists = { ...base.assists, ...patch.assists };
  if (patch.turnTimer) s.turnTimer = { ...base.turnTimer, ...patch.turnTimer };
  if (patch.endCondition) s.endCondition = { ...base.endCondition, ...patch.endCondition };

  s.decks = clampInt(s.decks, 1, 8, 2);
  s.dealerHitsSoft17 = !!s.dealerHitsSoft17;
  s.blackjackPays = s.blackjackPays === 1.2 ? 1.2 : 1.5; // 3:2 or 6:5
  s.maxSeats = clampInt(s.maxSeats, MIN_SEATS, MAX_SEATS, 4);
  s.buyIn = clampInt(s.buyIn, 50, 10_000_000, 750);
  s.maxBet = clampInt(s.maxBet, 1, s.buyIn, Math.min(500, s.buyIn));
  s.minBet = clampInt(s.minBet, 1, s.maxBet, Math.min(5, s.maxBet));
  s.allowSurrender = !!s.allowSurrender;
  s.allowInsurance = !!s.allowInsurance;

  s.assists = {
    advisor: !!s.assists?.advisor,
    countReadout: !!s.assists?.countReadout,
    hiLoTags: !!s.assists?.hiLoTags,
  };

  s.turnTimer = {
    enabled: !!s.turnTimer?.enabled,
    seconds: clampInt(s.turnTimer?.seconds, 5, 300, 30),
  };

  if (!END_TYPES.includes(s.endCondition?.type)) {
    throw new Error(`Unknown end condition: ${s.endCondition?.type}`);
  }
  const ec = { ...s.endCondition };
  if (ec.type === 'numHands') ec.numHands = clampInt(ec.numHands, 1, 100_000, 20);
  if (ec.type === 'timeLimit') ec.minutes = clampInt(ec.minutes, 1, 1440, 30);
  s.endCondition = ec;

  return s;
}
