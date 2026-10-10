// =============================================================================
//  Room.js — authoritative blackjack table: one room, many rounds.
// =============================================================================
//  All game state lives here, in memory. The server is the single source of
//  truth; clients render stateFor(viewer) and send actions. The dealer is
//  automated (house rules); the designated banker is the money counterparty, so
//  chips are conserved each round and the end-of-session settlement closes.
// =============================================================================

import { Shoe, handValue, isSoft, isBlackjack, canSplit, hiLoValue } from './cards.js';
import { playDealer, resolveHand, resolveInsurance } from './round.js';
import { aiDecision, aiBet, BOT_SKILLS } from './bot.js';
import { autoAction, advise } from './strategy.js';
import { settleSession } from './settlement.js';
import { defaultSettings, normalizeSettings } from './settings.js';

export const PHASES = ['lobby', 'betting', 'insurance', 'playing', 'dealerTurn', 'roundEnd', 'ended'];

const makeHand = (bet) => ({
  cards: [], bet, fromSplit: false, doubled: false, surrendered: false, done: false, result: null,
});

export class Room {
  constructor(code, opts = {}) {
    this.code = code;
    this.settings = normalizeSettings(defaultSettings(), opts.settings || {});
    this.members = new Map();        // playerId → { id, name, socketId, connected, isHost, seatIndex }
    this.seats = new Array(this.settings.maxSeats).fill(null);
    this.bankerSeat = null;          // seat index of the house/bank
    this.phase = 'lobby';
    this.shoe = null;
    this.justShuffled = false;
    this.dealer = { cards: [], revealed: false };
    this.active = null;              // { seatIndex, handIndex } while playing
    this.handNumber = 0;
    this.startedAt = null;
    this.lastRound = null;           // results of the most recent round
    this.settlement = null;          // computed when the session ends
    this.insurancePending = null;    // Set of seat indices still to decide
    this.turnDeadline = null;
    this._botCounter = 0;

    // Injectable for tests: a scheduler and an optional stacked shoe.
    this._setTimeout = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms).unref?.());
    this._clearTimeout = opts.clearTimeout || clearTimeout;
    this._stackedShoe = opts.shoe || null; // array of cards; used instead of shuffling
    this._timer = null;
    this.onChange = opts.onChange || (() => {});
  }

  destroy() { this._cancelTimer(); }

  _emit() { this.onChange(); }

  // ---------------------------------------------------------------------------
  //  Membership
  // ---------------------------------------------------------------------------
  join({ name, playerId, socketId }) {
    let member = playerId && this.members.get(playerId);
    if (member) {
      member.socketId = socketId;
      member.connected = true;
      if (name) member.name = name;
    } else {
      const id = playerId || `p_${Math.random().toString(36).slice(2, 10)}`;
      const isHost = this.members.size === 0;
      member = { id, name: (name || 'Player').slice(0, 20), socketId, connected: true, isHost, seatIndex: null };
      this.members.set(id, member);
      // Auto-seat into the lowest open seat (lobby convenience).
      const open = this.seats.findIndex((s) => s === null);
      if (open >= 0) this._seatMember(member, open);
      if (isHost && member.seatIndex != null) this.bankerSeat = member.seatIndex;
    }
    this._emit();
    return member;
  }

  _seatMember(member, index) {
    this.seats[index] = {
      kind: 'human', playerId: member.id, name: member.name, skill: null,
      chips: this.settings.buyIn, buyIn: this.settings.buyIn,
      bet: 0, hands: [], insuranceBet: 0, insuranceDone: false,
    };
    member.seatIndex = index;
  }

  disconnect(playerId) {
    const m = this.members.get(playerId);
    if (!m) return;
    m.connected = false;
    this._emit();
  }

  isEmpty() {
    return [...this.members.values()].every((m) => !m.connected);
  }

  leaveRoom(playerId) {
    const m = this.members.get(playerId);
    if (!m) return;
    if (m.seatIndex != null) this.seats[m.seatIndex] = null;
    this.members.delete(playerId);
    // Reassign host / banker if needed.
    if (m.isHost) {
      const next = [...this.members.values()].find((x) => x.connected) || [...this.members.values()][0];
      if (next) next.isHost = true;
    }
    if (this.bankerSeat != null && this.seats[this.bankerSeat] == null) {
      const anySeat = this.seats.findIndex((s) => s);
      this.bankerSeat = anySeat >= 0 ? anySeat : null;
    }
    this._emit();
  }

  _host() { return [...this.members.values()].find((m) => m.isHost); }
  _requireHost(playerId) {
    const m = this.members.get(playerId);
    if (!m || !m.isHost) throw new Error('Only the host can do that');
    return m;
  }
  _seatOf(playerId) {
    const m = this.members.get(playerId);
    return m && m.seatIndex != null ? this.seats[m.seatIndex] : null;
  }

  // ---------------------------------------------------------------------------
  //  Lobby
  // ---------------------------------------------------------------------------
  updateSettings(playerId, patch) {
    this._requireHost(playerId);
    if (this.phase !== 'lobby') throw new Error('Settings are locked once the game starts');
    this.settings = normalizeSettings(this.settings, patch);
    // Grow/shrink seats to the new max; re-stack seated players to the new buy-in.
    this._resizeSeats(this.settings.maxSeats);
    for (const s of this.seats) {
      if (s) { s.chips = this.settings.buyIn; s.buyIn = this.settings.buyIn; }
    }
    this._emit();
  }

  _resizeSeats(n) {
    if (n === this.seats.length) return;
    const next = new Array(n).fill(null);
    for (let i = 0; i < Math.min(n, this.seats.length); i++) next[i] = this.seats[i];
    // Drop members whose seat vanished.
    for (const m of this.members.values()) {
      if (m.seatIndex != null && m.seatIndex >= n) m.seatIndex = null;
    }
    this.seats = next;
    if (this.bankerSeat != null && this.bankerSeat >= n) {
      const anySeat = this.seats.findIndex((s) => s);
      this.bankerSeat = anySeat >= 0 ? anySeat : null;
    }
  }

  takeSeat(playerId, seatIndex) {
    if (this.phase !== 'lobby') throw new Error('Can only change seats in the lobby');
    const m = this.members.get(playerId);
    if (!m) throw new Error('Unknown player');
    if (seatIndex < 0 || seatIndex >= this.seats.length) throw new Error('No such seat');
    if (this.seats[seatIndex]) throw new Error('Seat taken');
    if (m.seatIndex != null) this.seats[m.seatIndex] = null;
    this._seatMember(m, seatIndex);
    if (this.bankerSeat == null) this.bankerSeat = seatIndex;
    this._emit();
  }

  leaveSeat(playerId) {
    if (this.phase !== 'lobby') throw new Error('Can only change seats in the lobby');
    const m = this.members.get(playerId);
    if (!m || m.seatIndex == null) return;
    const idx = m.seatIndex;
    this.seats[idx] = null;
    m.seatIndex = null;
    if (this.bankerSeat === idx) {
      const anySeat = this.seats.findIndex((s) => s);
      this.bankerSeat = anySeat >= 0 ? anySeat : null;
    }
    this._emit();
  }

  addBot(playerId, seatIndex, difficulty = 'basic') {
    this._requireHost(playerId);
    if (this.phase !== 'lobby') throw new Error('Add bots in the lobby');
    if (seatIndex < 0 || seatIndex >= this.seats.length || this.seats[seatIndex]) throw new Error('Seat unavailable');
    const skill = BOT_SKILLS.includes(difficulty) ? difficulty : 'basic';
    const names = { beginner: 'Rookie', basic: 'Steady', aggressive: 'Reckless' };
    this.seats[seatIndex] = {
      kind: 'bot', playerId: `bot_${++this._botCounter}`, name: `${names[skill]} Bot`, skill,
      chips: this.settings.buyIn, buyIn: this.settings.buyIn,
      bet: 0, hands: [], insuranceBet: 0, insuranceDone: false,
    };
    this._emit();
  }

  removeBot(playerId, seatIndex) {
    this._requireHost(playerId);
    if (this.phase !== 'lobby') throw new Error('Remove bots in the lobby');
    const s = this.seats[seatIndex];
    if (!s || s.kind !== 'bot') throw new Error('No bot there');
    this.seats[seatIndex] = null;
    if (this.bankerSeat === seatIndex) this.bankerSeat = this.seats.findIndex((x) => x);
    this._emit();
  }

  setBanker(playerId, seatIndex) {
    this._requireHost(playerId);
    if (this.phase !== 'lobby' && this.phase !== 'roundEnd') throw new Error('Change the banker between rounds');
    if (!this.seats[seatIndex]) throw new Error('No one in that seat');
    this.bankerSeat = seatIndex;
    this._emit();
  }

  // ---------------------------------------------------------------------------
  //  Round flow
  // ---------------------------------------------------------------------------
  startGame(playerId) {
    this._requireHost(playerId);
    if (this.phase !== 'lobby') throw new Error('Already started');
    if (!this.seats.some((s) => s)) throw new Error('Need at least one seat filled');
    if (this.bankerSeat == null) this.bankerSeat = this.seats.findIndex((s) => s);
    this.startedAt = Date.now();
    this._openBetting();
  }

  _openBetting() {
    this.phase = 'betting';
    this.dealer = { cards: [], revealed: false };
    this.active = null;
    this.lastRound = null;
    this.insurancePending = null;
    this._cancelTimer();
    for (const s of this.seats) {
      if (s) { s.bet = 0; s.hands = []; s.insuranceBet = 0; s.insuranceDone = false; }
    }
    this._emit();
  }

  placeBet(playerId, amount) {
    if (this.phase !== 'betting') throw new Error('Not taking bets right now');
    const seat = this._seatOf(playerId);
    if (!seat) throw new Error('Take a seat first');
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt < this.settings.minBet) throw new Error(`Minimum bet is ${this.settings.minBet}`);
    if (amt > this.settings.maxBet) throw new Error(`Maximum bet is ${this.settings.maxBet}`);
    // Return any previous bet to the stack before taking the new one.
    seat.chips += seat.bet;
    if (amt > seat.chips) throw new Error('Not enough chips');
    seat.chips -= amt;
    seat.bet = amt;
    this._emit();
  }

  clearBet(playerId) {
    if (this.phase !== 'betting') throw new Error('Not taking bets right now');
    const seat = this._seatOf(playerId);
    if (!seat) return;
    seat.chips += seat.bet;
    seat.bet = 0;
    this._emit();
  }

  deal(playerId) {
    this._requireHost(playerId);
    if (this.phase !== 'betting') throw new Error('Not in the betting phase');
    // Bots bet now.
    for (const s of this.seats) {
      if (s && s.kind === 'bot') {
        s.bet = aiBet(s.skill, s.chips, this.settings);
        s.chips -= s.bet;
      }
    }
    const active = this.seats.filter((s) => s && s.bet > 0);
    if (active.length === 0) throw new Error('No bets placed');
    this._dealRound();
  }

  _ensureShoe() {
    const total = this.settings.decks * 52;
    const cut = Math.floor(total * 0.25);
    if (this._stackedShoe) {
      if (!this.shoe) { this.shoe = new Shoe(this._stackedShoe.slice()); this.justShuffled = true; }
      return;
    }
    if (!this.shoe || this.shoe.remaining() < cut) {
      this.shoe = Shoe.fresh(this.settings.decks);
      this.justShuffled = true;
    } else {
      this.justShuffled = false;
    }
  }

  _dealRound() {
    this._ensureShoe();
    const draw = () => this.shoe.draw();
    const playing = this.seats.map((s, i) => ({ s, i })).filter((x) => x.s && x.s.bet > 0);

    for (const { s } of playing) s.hands = [makeHand(s.bet)];
    this.dealer = { cards: [], revealed: false };

    // Two passes: a card to each player, then the dealer, twice.
    for (let pass = 0; pass < 2; pass++) {
      for (const { s } of playing) s.hands[0].cards.push(draw());
      this.dealer.cards.push(draw());
    }

    this.phase = 'playing';
    this.handNumber += 1;

    // Mark player naturals as done (resolved at settle).
    for (const { s } of playing) {
      if (isBlackjack(s.hands[0].cards)) s.hands[0].done = true;
    }

    const upcard = this.dealer.cards[0];
    const dealerCouldBJ = upcard.rank === 'A' || handValue([upcard]) === 10;

    if (upcard.rank === 'A' && this.settings.allowInsurance) {
      // Offer insurance to human seats with a live (non-natural) hand.
      this.insurancePending = new Set(
        playing.filter((x) => x.s.kind === 'human').map((x) => x.i),
      );
      this.phase = 'insurance';
      this._emit();
      if (this.insurancePending.size === 0) this._afterInsurance();
      return;
    }

    if (dealerCouldBJ && isBlackjack(this.dealer.cards)) {
      this._dealerAndSettle();
      return;
    }

    this._drive();
  }

  // Insurance decisions come through act() while phase === 'insurance'.
  _afterInsurance() {
    this.insurancePending = null;
    if (isBlackjack(this.dealer.cards)) { this._dealerAndSettle(); return; }
    this.phase = 'playing';
    this._drive();
  }

  /** Find the next hand that still needs a decision, in seat then hand order. */
  _activeSpot() {
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (!s || s.bet <= 0) continue;
      for (let h = 0; h < s.hands.length; h++) {
        if (!s.hands[h].done) return { seatIndex: i, handIndex: h };
      }
    }
    return null;
  }

  /** Advance play: resolve bots immediately, pause for humans (with a timer). */
  _drive() {
    for (;;) {
      const spot = this._activeSpot();
      if (!spot) { this._dealerAndSettle(); return; }
      this.active = spot;
      const seat = this.seats[spot.seatIndex];
      if (seat.kind === 'bot') {
        const decision = aiDecision(seat.hands[spot.handIndex], this.dealer.cards[0], seat.skill);
        this._applyAction(seat, spot.handIndex, decision);
        continue;
      }
      // Human's turn — start the clock and wait for their action.
      this._startTurnTimer();
      this._emit();
      return;
    }
  }

  act(playerId, { type, amount } = {}) {
    if (this.phase === 'insurance') return this._insuranceAct(playerId, type, amount);
    if (this.phase !== 'playing') throw new Error('Nothing to act on right now');
    const m = this.members.get(playerId);
    if (!m || m.seatIndex == null) throw new Error('You are not seated');
    if (!this.active || this.active.seatIndex !== m.seatIndex) throw new Error('Not your turn');
    const seat = this.seats[m.seatIndex];
    this._applyAction(seat, this.active.handIndex, type, amount);
    this._cancelTimer();
    this._drive();
  }

  _insuranceAct(playerId, type, amount) {
    const m = this.members.get(playerId);
    if (!m || m.seatIndex == null) throw new Error('You are not seated');
    if (!this.insurancePending || !this.insurancePending.has(m.seatIndex)) throw new Error('No insurance decision pending');
    const seat = this.seats[m.seatIndex];
    if (type === 'insurance') {
      const max = Math.floor(seat.bet / 2);
      const amt = Math.min(Math.max(0, Math.round(Number(amount) || max)), max);
      if (amt > seat.chips) throw new Error('Not enough chips for insurance');
      seat.chips -= amt;
      seat.insuranceBet = amt;
    }
    seat.insuranceDone = true;
    this.insurancePending.delete(m.seatIndex);
    this._emit();
    if (this.insurancePending.size === 0) this._afterInsurance();
  }

  _applyAction(seat, handIndex, type, amount) {
    const hand = seat.hands[handIndex];
    if (!hand || hand.done) throw new Error('That hand is already finished');
    const draw = () => this.shoe.draw();

    switch (type) {
      case 'hit': {
        hand.cards.push(draw());
        const v = handValue(hand.cards);
        if (v >= 21) hand.done = true;
        break;
      }
      case 'stand':
        hand.done = true;
        break;
      case 'double': {
        if (hand.cards.length !== 2 || hand.fromSplit) throw new Error('Can only double on the first two cards');
        if (seat.chips < hand.bet) throw new Error('Not enough chips to double');
        seat.chips -= hand.bet;
        hand.bet *= 2;
        hand.doubled = true;
        hand.cards.push(draw());
        hand.done = true;
        break;
      }
      case 'split': {
        if (!canSplit(hand.cards) || hand.fromSplit) throw new Error('Cannot split this hand');
        if (seat.chips < hand.bet) throw new Error('Not enough chips to split');
        seat.chips -= hand.bet;
        const [c1, c2] = hand.cards;
        const second = makeHand(hand.bet);
        second.fromSplit = true;
        hand.fromSplit = true;
        hand.cards = [c1, draw()];
        second.cards = [c2, draw()];
        seat.hands.splice(handIndex + 1, 0, second);
        if (c1.rank === 'A') { hand.done = true; second.done = true; } // split aces: one card each
        else { // a dealt 21 auto-stands
          if (handValue(hand.cards) === 21) hand.done = true;
          if (handValue(second.cards) === 21) second.done = true;
        }
        break;
      }
      case 'surrender': {
        if (!this.settings.allowSurrender || hand.cards.length !== 2 || hand.fromSplit) {
          throw new Error('Cannot surrender now');
        }
        hand.surrendered = true;
        hand.done = true;
        break;
      }
      default:
        throw new Error(`Unknown action: ${type}`);
    }
  }

  _dealerAndSettle() {
    this._cancelTimer();
    this.phase = 'dealerTurn';
    this.dealer.revealed = true;

    const playingSeats = this.seats.filter((s) => s && s.bet > 0);
    // Dealer only draws if a non-busted, non-NATURAL player hand remains. A
    // split 21 (isBlackjack but fromSplit) is NOT a natural, so it keeps the
    // dealer in the hand.
    const anyLive = playingSeats.some((s) => s.hands.some((h) =>
      !h.surrendered && handValue(h.cards) <= 21 && !(isBlackjack(h.cards) && !h.fromSplit)));
    if (anyLive) {
      this.dealer.cards = playDealer(this.dealer.cards, () => this.shoe.draw(), { hitSoft17: this.settings.dealerHitsSoft17 });
    }

    const results = [];
    let playersNet = 0;
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i];
      if (!seat || seat.bet <= 0) continue;
      let seatNet = 0;
      const handResults = [];
      for (const hand of seat.hands) {
        const { result, ret } = resolveHand(hand, this.dealer.cards, { blackjackPays: this.settings.blackjackPays });
        hand.result = result;
        seat.chips += ret;
        seatNet += ret - hand.bet;
        handResults.push({ result, bet: hand.bet, ret });
      }
      if (seat.insuranceBet > 0) {
        const ins = resolveInsurance(seat.insuranceBet, this.dealer.cards);
        seat.chips += ins.ret;
        seatNet += ins.ret - seat.insuranceBet;
      }
      playersNet += seatNet;
      results.push({ seatIndex: i, name: seat.name, net: seatNet, hands: handResults });
    }

    // The banker is the house: assign the negative of all players' net so chips
    // are conserved and the banker's own hand (if any) nets out to a wash. Fold
    // that house delta into the banker's displayed net so the badge matches the
    // banker's actual chip change (and show a net even when the banker sat out).
    if (this.bankerSeat != null && this.seats[this.bankerSeat]) {
      const bank = this.seats[this.bankerSeat];
      bank.chips += -playersNet;
      const bankResult = results.find((r) => r.seatIndex === this.bankerSeat);
      if (bankResult) bankResult.net += -playersNet;
      else results.push({ seatIndex: this.bankerSeat, name: bank.name, net: -playersNet, hands: [], houseOnly: true });
    }

    this.lastRound = { results, dealer: this.dealer.cards, housePaid: -playersNet };
    this.phase = 'roundEnd';
    this.active = null;
    this._emit();

    this._maybeEndSession();
  }

  _maybeEndSession() {
    const ec = this.settings.endCondition;
    if (ec.type === 'numHands' && this.handNumber >= ec.numHands) this._finishSession();
    else if (ec.type === 'timeLimit' && this.startedAt && Date.now() - this.startedAt >= ec.minutes * 60_000) {
      this._finishSession();
    }
  }

  nextHand(playerId) {
    this._requireHost(playerId);
    if (this.phase !== 'roundEnd') throw new Error('No round to advance from');
    this._openBetting();
  }

  rebuy(playerId, amount) {
    const seat = this._seatOf(playerId);
    if (!seat) throw new Error('Take a seat first');
    if (this.phase === 'playing' || this.phase === 'insurance' || this.phase === 'dealerTurn') {
      throw new Error('Rebuy between rounds');
    }
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid rebuy');
    seat.chips += amt;
    seat.buyIn += amt;
    this._emit();
  }

  endSession(playerId) {
    this._requireHost(playerId);
    if (this.phase === 'lobby' || this.phase === 'ended') throw new Error('Nothing to settle');
    this._finishSession();
  }

  _finishSession() {
    const players = [];
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (!s) continue;
      players.push({ id: s.playerId, name: s.name, buyIn: s.buyIn, chips: s.chips, isBanker: i === this.bankerSeat });
    }
    this.settlement = settleSession(players);
    this.phase = 'ended';
    this.active = null;
    this._cancelTimer();
    this._emit();
  }

  // ---------------------------------------------------------------------------
  //  Turn timer — auto-finish a human hand by basic strategy on expiry.
  // ---------------------------------------------------------------------------
  _startTurnTimer() {
    this._cancelTimer();
    if (!this.settings.turnTimer.enabled) { this.turnDeadline = null; return; }
    const ms = this.settings.turnTimer.seconds * 1000;
    this.turnDeadline = Date.now() + ms;
    this._timer = this._setTimeout(() => this._onTimeout(), ms);
  }

  _cancelTimer() {
    if (this._timer) { this._clearTimeout(this._timer); this._timer = null; }
    this.turnDeadline = null;
  }

  _onTimeout() {
    this._timer = null;
    this.turnDeadline = null;
    if (this.phase !== 'playing' || !this.active) return;
    const seat = this.seats[this.active.seatIndex];
    if (!seat) return;
    // Auto-finish the active hand by count-free basic strategy (no new wager).
    let guard = 0;
    while (this.active && this.active.seatIndex != null) {
      const spot = this._activeSpot();
      if (!spot || spot.seatIndex !== this.active.seatIndex) break;
      const hand = seat.hands[spot.handIndex];
      const move = autoAction(hand, this.dealer.cards[0]); // 'hit' | 'stand'
      this._applyAction(seat, spot.handIndex, move);
      if (++guard > 25) break;
    }
    this._drive();
  }

  // ---------------------------------------------------------------------------
  //  Per-viewer state
  // ---------------------------------------------------------------------------
  _handView(hand, hideResult) {
    return {
      cards: hand.cards,
      value: handValue(hand.cards),
      soft: isSoft(hand.cards),
      bet: hand.bet,
      fromSplit: hand.fromSplit,
      doubled: hand.doubled,
      surrendered: hand.surrendered,
      busted: handValue(hand.cards) > 21,
      blackjack: isBlackjack(hand.cards) && !hand.fromSplit,
      done: hand.done,
      result: hideResult ? null : hand.result,
    };
  }

  _dealerView() {
    const hide = !this.dealer.revealed && this.dealer.cards.length > 0;
    const cards = this.dealer.cards.map((c, i) => (hide && i === 1 ? { hidden: true } : c));
    const shown = hide ? this.dealer.cards.slice(0, 1) : this.dealer.cards;
    return {
      cards,
      value: this.dealer.cards.length ? handValue(shown) : 0,
      revealed: this.dealer.revealed,
      blackjack: this.dealer.revealed && isBlackjack(this.dealer.cards),
    };
  }

  /** Hi-Lo running count over every face-up card (used only if the host enables it). */
  _runningCount() {
    let rc = 0;
    for (const s of this.seats) {
      if (!s) continue;
      for (const h of s.hands) for (const c of h.cards) rc += hiLoValue(c);
    }
    // Only the dealer upcard is face up until the reveal.
    for (let i = 0; i < this.dealer.cards.length; i++) {
      if (this.dealer.revealed || i === 0) {
        const c = this.dealer.cards[i];
        if (c && c.rank) rc += hiLoValue(c);
      }
    }
    return rc;
  }

  stateFor(playerId) {
    const me = this.members.get(playerId);
    const mySeat = me && me.seatIndex;
    const hideResult = this.phase !== 'roundEnd' && this.phase !== 'ended';

    const seats = this.seats.map((s, i) => {
      if (!s) return { index: i, occupied: false };
      const member = s.kind === 'human' ? this.members.get(s.playerId) : null;
      return {
        index: i,
        occupied: true,
        kind: s.kind,
        name: s.name,
        skill: s.skill || undefined,
        isBanker: i === this.bankerSeat,
        isHost: !!(member && member.isHost),
        connected: s.kind === 'human' ? !!(member && member.connected) : true,
        isYou: me ? i === me.seatIndex : false,
        chips: s.chips,
        buyIn: s.buyIn,
        bet: s.bet,
        insuranceBet: s.insuranceBet,
        hands: s.hands.map((h) => this._handView(h, hideResult)),
      };
    });

    const assists = this.settings.assists;

    // "Ask the dealer": computed server-side for the viewer when it's their turn.
    let advice = null;
    if (assists.advisor && this.phase === 'playing' && this.active && me && this.active.seatIndex === me.seatIndex) {
      const seat = this.seats[this.active.seatIndex];
      const hand = seat && seat.hands[this.active.handIndex];
      if (hand && !hand.done) {
        advice = advise(hand, this.dealer.cards[0], {
          canDouble: seat.chips >= hand.bet,
          canSplit: this.settings && seat.chips >= hand.bet,
          canSurrender: this.settings.allowSurrender,
        });
      }
    }

    return {
      code: this.code,
      phase: this.phase,
      you: me ? { playerId: me.id, seatIndex: me.seatIndex, isHost: me.isHost, isBanker: mySeat === this.bankerSeat } : null,
      settings: this.settings,
      advice,
      seats,
      bankerSeat: this.bankerSeat,
      dealer: this._dealerView(),
      active: this.active,
      turnDeadline: this.turnDeadline,
      handNumber: this.handNumber,
      justShuffled: this.justShuffled,
      insurancePending: this.insurancePending ? [...this.insurancePending] : null,
      lastRound: this.lastRound,
      settlement: this.settlement,
      count: assists.countReadout ? this._countInfo() : null,
    };
  }

  _countInfo() {
    const rc = this._runningCount();
    const totalCards = this.settings.decks * 52;
    const seen = this.shoe ? totalCards - this.shoe.remaining() : 0;
    const decksRemaining = Math.max(0.5, (totalCards - seen) / 52);
    return { running: rc, true: Math.round((rc / decksRemaining) * 10) / 10 };
  }
}
