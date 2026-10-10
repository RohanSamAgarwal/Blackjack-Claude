// =============================================================================
//  cards.js — pure card + hand primitives. No I/O; fully unit-tested.
// =============================================================================
//  Cards are plain objects { rank, suit }. Suits are single letters
//  (S/H/D/C) server-side; the client maps them to glyphs + colors.
// =============================================================================

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['S', 'H', 'D', 'C'];

/** Base point value of a card; Ace is 11 here (soft), downgraded in handValue. */
export function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

/** Best hand total, counting Aces as 1 when 11 would bust. */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

/** True when the hand holds an Ace still counted as 11 (and isn't busting). */
export function isSoft(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces += 1;
  }
  let soft = aces;
  while (total > 21 && soft > 0) { total -= 10; soft -= 1; }
  return soft > 0 && total <= 21;
}

/** A natural blackjack: exactly two cards totalling 21. */
export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

/** Two cards of equal rank-value can be split. */
export function canSplit(cards) {
  return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
}

/** Hi-Lo running-count contribution of a single card (2–6 = +1, 10/A = −1). */
export function hiLoValue(card) {
  const v = cardValue(card);
  if (card.rank === 'A' || v === 10) return -1;
  if (v >= 2 && v <= 6) return 1;
  return 0;
}

/**
 * A multi-deck shoe. Construct with Shoe.fresh(n) for a shuffled shoe, or
 * new Shoe(cards) with an explicit (e.g. stacked, for tests) card array.
 * rng is injectable for deterministic shuffles in tests.
 */
export class Shoe {
  constructor(cards = []) {
    this.cards = cards;
    this.pos = 0;
  }

  static build(numDecks) {
    const cards = [];
    for (let d = 0; d < numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) cards.push({ rank, suit });
      }
    }
    return cards;
  }

  static fresh(numDecks, rng = Math.random) {
    const cards = Shoe.build(numDecks);
    // Fisher–Yates with injectable rng.
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return new Shoe(cards);
  }

  draw() {
    if (this.pos >= this.cards.length) throw new Error('Shoe exhausted');
    return this.cards[this.pos++];
  }

  remaining() { return this.cards.length - this.pos; }
}
