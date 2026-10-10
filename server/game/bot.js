// =============================================================================
//  bot.js — AI opponent decisions. Pure; unit-tested.
// =============================================================================
//  Three play styles ported from the original single-player game. Bots only
//  hit / stand / double (never split or surrender), which keeps seat handling
//  simple and matches the established feel.
// =============================================================================

import { handValue, isSoft, cardValue } from './cards.js';

export const BOT_SKILLS = ['beginner', 'basic', 'aggressive'];

/**
 * Decide a bot's action for the current hand.
 * @returns {'hit'|'stand'|'double'}  (double only ever on a two-card hand)
 */
export function aiDecision(hand, upcard, skill) {
  const cards = hand.cards;
  const v = handValue(cards);
  const soft = isSoft(cards);
  const d = cardValue(upcard);
  const twoCard = cards.length === 2;

  if (skill === 'beginner') {
    if (v < 15) return 'hit';
    if (v >= 17) return 'stand';
    return Math.random() > 0.5 ? 'hit' : 'stand';
  }

  if (skill === 'aggressive') {
    if (twoCard && v >= 9 && v <= 12) return 'double';
    if (v < 16) return 'hit';
    if (v === 16 && d >= 7) return 'hit';
    if (v === 17 && soft) return 'hit';
    return 'stand';
  }

  // 'basic' — condensed basic strategy.
  if (soft) {
    if (v <= 17) return twoCard && v >= 15 && d >= 4 && d <= 6 ? 'double' : 'hit';
    if (v === 18) {
      if (d >= 9) return 'hit';
      if (d >= 3 && d <= 6 && twoCard) return 'double';
      return 'stand';
    }
    return 'stand';
  }
  if (v <= 8) return 'hit';
  if (v === 9) return twoCard && d >= 3 && d <= 6 ? 'double' : 'hit';
  if (v === 10) return twoCard && d <= 9 ? 'double' : 'hit';
  if (v === 11) return twoCard ? 'double' : 'hit';
  if (v === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
  if (v >= 13 && v <= 16) return d <= 6 ? 'stand' : 'hit';
  return 'stand';
}

/**
 * Choose a bot's bet for the next hand, clamped to the table limits and the
 * bot's available chips.
 */
export function aiBet(skill, chips, { minBet, maxBet }, rng = Math.random) {
  const cap = Math.min(chips, maxBet);
  if (cap < minBet) return 0;
  let bet;
  if (skill === 'beginner') bet = Math.floor(rng() * 3) * 5 + 5;
  else if (skill === 'aggressive') bet = Math.floor(rng() * 6) * 10 + 10;
  else bet = Math.floor(rng() * 4) * 5 + 10;
  return Math.max(minBet, Math.min(bet, cap));
}
