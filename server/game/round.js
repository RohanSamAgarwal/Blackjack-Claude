// =============================================================================
//  round.js — dealer play + hand resolution. Pure; unit-tested.
// =============================================================================

import { handValue, isSoft, isBlackjack } from './cards.js';

/**
 * Play out the dealer's hand by house rules.
 * @param {Array} cards  the dealer's starting cards (upcard + hole)
 * @param {Function} draw  () => card
 * @param {{hitSoft17?: boolean}} rules
 * @returns {Array} the dealer's final cards
 */
export function playDealer(cards, draw, { hitSoft17 = false } = {}) {
  const hand = [...cards];
  for (;;) {
    const v = handValue(hand);
    if (v > 17) break;
    if (v === 17) {
      if (hitSoft17 && isSoft(hand)) { hand.push(draw()); continue; }
      break;
    }
    hand.push(draw());
  }
  return hand;
}

/**
 * Resolve one player hand against the dealer's final hand.
 * `ret` is the amount credited back to the player's stack (the bet was already
 * moved out when placed), so net profit = ret − bet.
 *
 * @param {{cards:Array, bet:number, fromSplit?:boolean, doubled?:boolean, surrendered?:boolean}} hand
 * @param {Array} dealerCards
 * @param {{blackjackPays?:number}} rules  (blackjackPays 1.5 = 3:2, 1.2 = 6:5)
 */
export function resolveHand(hand, dealerCards, { blackjackPays = 1.5 } = {}) {
  const bet = hand.bet;

  if (hand.surrendered) return { result: 'SURRENDER', ret: bet * 0.5 };

  const pv = handValue(hand.cards);
  if (pv > 21) return { result: 'BUST', ret: 0 };

  // A two-card 21 off the initial deal is a natural; 21 after a split is not.
  const playerBJ = !hand.fromSplit && isBlackjack(hand.cards);
  const dealerBJ = isBlackjack(dealerCards);

  if (playerBJ) {
    if (dealerBJ) return { result: 'PUSH', ret: bet };
    return { result: 'BLACKJACK', ret: bet * (1 + blackjackPays) };
  }
  if (dealerBJ) return { result: 'LOSE', ret: 0 };

  const dv = handValue(dealerCards);
  if (dv > 21) return { result: 'WIN', ret: bet * 2 };
  if (pv > dv) return { result: 'WIN', ret: bet * 2 };
  if (pv < dv) return { result: 'LOSE', ret: 0 };
  return { result: 'PUSH', ret: bet };
}

/**
 * Resolve an insurance side bet. Pays 2:1 when the dealer has a natural.
 * `ret` = amount credited back (stake was already moved out).
 */
export function resolveInsurance(insuranceBet, dealerCards) {
  if (insuranceBet <= 0) return { result: 'NONE', ret: 0 };
  if (isBlackjack(dealerCards)) return { result: 'WIN', ret: insuranceBet * 3 };
  return { result: 'LOSE', ret: 0 };
}
