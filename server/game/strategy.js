// =============================================================================
//  strategy.js — basic strategy. Pure; unit-tested.
// =============================================================================
//  Two entry points:
//   • advise()     — full recommendation (split/double/surrender/hit/stand) with
//                    a short reason, used by the optional "ask the dealer" assist.
//   • autoAction() — count-free hit/stand only, used to finish a hand when a
//                    player's turn timer expires (commits no new wager).
//  Both use ONLY the player's cards and the dealer upcard — never the count.
// =============================================================================

import { handValue, isSoft, canSplit, cardValue } from './cards.js';

/**
 * Count-free hit/stand backbone (S17 basic strategy, no double/split/surrender).
 * @returns {'hit'|'stand'}
 */
export function coreHitStand(cards, upcard) {
  const v = handValue(cards);
  const d = cardValue(upcard);
  if (isSoft(cards)) {
    if (v >= 19) return 'stand';
    if (v === 18) return d >= 9 ? 'hit' : 'stand';
    return 'hit';
  }
  if (v >= 17) return 'stand';
  if (v >= 13) return d <= 6 ? 'stand' : 'hit';
  if (v === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
  return 'hit';
}

/**
 * The move used to auto-finish a hand on a turn-timer timeout: basic strategy
 * from the table cards only, and never commits additional chips (no double or
 * split) and never surrenders.
 * @returns {'hit'|'stand'}
 */
export function autoAction(hand, upcard) {
  return coreHitStand(hand.cards, upcard);
}

/**
 * Full basic-strategy recommendation.
 * @param {{cards:Array, fromSplit?:boolean}} hand
 * @param {object} upcard  dealer upcard
 * @param {{canDouble?:boolean, canSplit?:boolean, canSurrender?:boolean}} opts
 * @returns {{action:'hit'|'stand'|'double'|'split'|'surrender', reason:string}}
 */
export function advise(hand, upcard, opts = {}) {
  const cards = hand.cards;
  const v = handValue(cards);
  const soft = isSoft(cards);
  const d = cardValue(upcard);
  const twoCard = cards.length === 2;

  const canD = opts.canDouble !== false && twoCard;
  const canSp = opts.canSplit !== false && canSplit(cards) && !hand.fromSplit;
  const canSr = opts.canSurrender !== false && twoCard && !hand.fromSplit;

  const dbl = (elseAction) => (canD ? 'double' : elseAction);
  const R = (action, reason) => ({ action, reason });

  // --- Pairs -----------------------------------------------------------------
  if (canSp) {
    const p = cardValue(cards[0]);
    if (p === 11) return R('split', 'Always split Aces');
    if (p === 8) return R('split', 'Always split 8s — 16 is the worst hand');
    if (p === 10) return R('stand', 'Never split 10s — 20 is very strong');
    if (p === 5) return d <= 9 ? R(dbl('hit'), `Pair of 5s is 10 vs ${d}`) : R('hit', '10 total — hit to improve');
    if (p === 4) return (d === 5 || d === 6) ? R('split', `Split 4s vs weak ${d}`) : R('hit', `8 vs ${d} — just hit`);
    if (p === 9) return (d === 7 || d >= 10) ? R('stand', `18 is strong vs ${d}`) : R('split', `Split 9s vs ${d}`);
    if (p === 7) return d <= 7 ? R('split', `Split 7s vs ${d}`) : R('hit', `14 vs strong ${d}`);
    if (p === 6) return d <= 6 ? R('split', `Split 6s vs weak ${d}`) : R('hit', `12 vs ${d} — hit`);
    if (p <= 3) return d <= 7 ? R('split', `Split ${p}s vs ${d}`) : R('hit', `${v} vs strong ${d}`);
  }

  // --- Soft totals -----------------------------------------------------------
  if (soft) {
    if (v >= 20) return R('stand', `Soft ${v} — very strong`);
    if (v === 19) return (d === 6 && canD) ? R('double', 'Soft 19 vs 6 — double') : R('stand', 'Soft 19 — strong');
    if (v === 18) {
      if (d >= 9) return R('hit', `Soft 18 vs strong ${d}`);
      if (d >= 3 && d <= 6) return R(dbl('stand'), `Soft 18 vs weak ${d}`);
      return R('stand', 'Soft 18 — solid');
    }
    if (v === 17) return (d >= 3 && d <= 6) ? R(dbl('hit'), `Soft 17 vs weak ${d}`) : R('hit', 'Soft 17 — hit to improve');
    if (v >= 15) return (d >= 4 && d <= 6) ? R(dbl('hit'), `Soft ${v} vs weak ${d}`) : R('hit', `Soft ${v} — hit`);
    if (v >= 13) return (d === 5 || d === 6) ? R(dbl('hit'), `Soft ${v} vs weak ${d}`) : R('hit', `Soft ${v} — hit`);
    return R('hit', `Soft ${v} — hit`);
  }

  // --- Hard totals -----------------------------------------------------------
  if (v >= 17) return R('stand', `Hard ${v} — bust risk too high`);
  if (v === 16) {
    if (canSr && d >= 9) return R('surrender', `16 vs ${d} — surrender saves half`);
    return d <= 6 ? R('stand', `16 vs weak ${d} — let the dealer bust`) : R('hit', `16 vs strong ${d} — risky but hit`);
  }
  if (v === 15) {
    if (canSr && d === 10) return R('surrender', '15 vs 10 — best to surrender');
    return d <= 6 ? R('stand', `15 vs weak ${d}`) : R('hit', `15 vs ${d} — must hit`);
  }
  if (v >= 13) return d <= 6 ? R('stand', `${v} vs weak ${d} — let the dealer bust`) : R('hit', `${v} vs strong ${d} — hit`);
  if (v === 12) return (d >= 4 && d <= 6) ? R('stand', `12 vs weak ${d} — dealer likely busts`) : R('hit', `12 vs ${d} — low bust risk`);
  if (v === 11) return R(dbl('hit'), '11 — best doubling hand');
  if (v === 10) return d <= 9 ? R(dbl('hit'), `10 vs ${d} — strong double`) : R('hit', '10 — hit');
  if (v === 9) return (d >= 3 && d <= 6) ? R(dbl('hit'), `9 vs weak ${d} — double`) : R('hit', '9 — hit');
  return R('hit', `${v} — low total, always hit`);
}
