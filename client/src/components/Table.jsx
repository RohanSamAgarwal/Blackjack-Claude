import { useState, useEffect } from 'react';
import Card from './Card.jsx';

const DENOMS = [5, 25, 100];
const tenRank = (r) => r === '10' || r === 'J' || r === 'Q' || r === 'K';
const rankVal = (r) => (r === 'A' ? 11 : tenRank(r) ? 10 : Number(r));

function resultClass(r) {
  if (r === 'WIN' || r === 'BLACKJACK') return 'win';
  if (r === 'PUSH') return 'push';
  return 'lose';
}

function TurnClock({ deadline }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return <span className={`clock ${left <= 5 ? 'low' : ''}`}>⏱ {left}s</span>;
}

function HandView({ hand, tags, isActive, scale }) {
  return (
    <div className={`hand ${isActive ? 'active' : ''}`}>
      <div className="hand-cards">
        {hand.cards.map((c, i) => <Card key={i} card={c} scale={scale} animate delay={i * 0.06} showTag={tags} />)}
      </div>
      <div className="hand-meta">
        <span className={`val ${hand.busted ? 'bust' : ''}`}>{hand.blackjack ? 'BJ' : hand.value}</span>
        {hand.bet > 0 && <span className="hbet">${hand.bet}</span>}
        {hand.result && <span className={`res ${resultClass(hand.result)}`}>{hand.result}</span>}
      </div>
    </div>
  );
}

function Seat({ seat, state }) {
  if (!seat.occupied) return <div className="seat empty"><span className="seat-no">Seat {seat.index + 1}</span></div>;
  const activeHand = state.active && state.active.seatIndex === seat.index ? state.active.handIndex : -1;
  const net = state.phase === 'roundEnd' && state.lastRound
    ? (state.lastRound.results.find((r) => r.seatIndex === seat.index)?.net) : null;
  return (
    <div className={`seat ${seat.isYou ? 'you' : ''} ${activeHand >= 0 ? 'turn' : ''}`}>
      <div className="seat-top">
        <span className="nm">{seat.name}</span>
        <span className="badges">
          {seat.isBanker && <span className="badge bank">Bank</span>}
          {seat.kind === 'bot' && <span className="badge bot">bot</span>}
          {!seat.connected && <span className="badge off">off</span>}
        </span>
      </div>
      <div className="hands">
        {seat.hands.length === 0
          ? <div className="muted small nohand">{state.phase === 'betting' ? (seat.bet > 0 ? `Bet $${seat.bet}` : 'No bet') : 'Sitting out'}</div>
          : seat.hands.map((h, i) => <HandView key={i} hand={h} tags={state.settings.assists.hiLoTags} isActive={activeHand === i} scale={seat.hands.length > 1 ? 0.5 : 0.62} />)}
      </div>
      <div className="seat-bottom">
        <span className="chips">{seat.chips.toLocaleString()}</span>
        {net != null && <span className={`net ${net > 0 ? 'win' : net < 0 ? 'lose' : 'push'}`}>{net > 0 ? `+${net}` : net}</span>}
      </div>
    </div>
  );
}

function BetBar({ state, actions, mySeat }) {
  if (!mySeat) return <div className="muted">Spectating — grab a seat next game.</div>;
  const { minBet, maxBet } = state.settings;
  const bankroll = mySeat.chips + mySeat.bet;
  const setBet = (delta) => {
    let t = mySeat.bet + delta;
    if (t < minBet) t = minBet;
    if (t > maxBet) t = maxBet;
    if (t > bankroll) t = bankroll;
    if (t >= minBet) actions.placeBet(t);
  };
  const anyBet = state.seats.some((s) => s.occupied && s.bet > 0);
  return (
    <div className="betbar">
      <div className="chip-row">
        {DENOMS.map((d) => (
          <button key={d} className={`chip c${d}`} disabled={mySeat.bet + d > bankroll && mySeat.bet < minBet} onClick={() => setBet(d)}>{d}</button>
        ))}
        <button className="mini" onClick={() => actions.clearBet()}>Clear</button>
      </div>
      <div className="bet-status">Your bet <b>${mySeat.bet}</b> · {mySeat.chips.toLocaleString()} chips</div>
      {state.you.isHost && <button className="btn" disabled={!anyBet} onClick={() => actions.deal()}>Deal</button>}
      {!state.you.isHost && <span className="muted small">Waiting for the host to deal…</span>}
    </div>
  );
}

function ActionBar({ state, actions, mySeat }) {
  const myTurn = state.active && mySeat && state.active.seatIndex === mySeat.index;
  if (!myTurn) {
    const who = state.active != null ? state.seats[state.active.seatIndex]?.name : null;
    return <div className="muted">{who ? `${who} is playing…` : 'Dealer is playing…'}</div>;
  }
  const hand = mySeat.hands[state.active.handIndex];
  const canDouble = hand.cards.length === 2 && !hand.fromSplit && mySeat.chips >= hand.bet;
  const pair = hand.cards.length === 2 && rankVal(hand.cards[0].rank) === rankVal(hand.cards[1].rank);
  const canSplit = pair && !hand.fromSplit && mySeat.chips >= hand.bet;
  const canSurrender = state.settings.allowSurrender && hand.cards.length === 2 && !hand.fromSplit;
  const act = (type) => actions.act(type);
  return (
    <div className="actionbar">
      <div className="act-row">
        <button className="act hit" onClick={() => act('hit')}>Hit</button>
        <button className="act stand" onClick={() => act('stand')}>Stand</button>
        {canDouble && <button className="act dbl" onClick={() => act('double')}>Double</button>}
        {canSplit && <button className="act split" onClick={() => act('split')}>Split</button>}
        {canSurrender && <button className="act surr" onClick={() => act('surrender')}>Surrender</button>}
      </div>
      <div className="act-meta">
        <TurnClock deadline={state.turnDeadline} />
        {state.advice && <span className="advice">💡 {state.advice.action.toUpperCase()} — {state.advice.reason}</span>}
      </div>
    </div>
  );
}

function InsuranceBar({ state, actions, mySeat }) {
  const pending = mySeat && state.insurancePending && state.insurancePending.includes(mySeat.index);
  if (!pending) return <div className="muted">Dealer shows an Ace — offering insurance…</div>;
  const cost = Math.floor(mySeat.bet / 2);
  return (
    <div className="actionbar">
      <div className="muted small">Dealer shows an Ace. Insure against a dealer blackjack?</div>
      <div className="act-row">
        <button className="act" disabled={cost > mySeat.chips} onClick={() => actions.act('insurance', cost)}>Take insurance (${cost})</button>
        <button className="act stand" onClick={() => actions.act('decline')}>No thanks</button>
      </div>
    </div>
  );
}

function EndBar({ state, actions, mySeat }) {
  return (
    <div className="endbar">
      {mySeat && mySeat.chips < state.settings.minBet && (
        <button className="btn ghost" onClick={() => actions.rebuy(state.settings.buyIn)}>Rebuy +{state.settings.buyIn}</button>
      )}
      {state.you.isHost ? (
        <>
          <button className="btn" onClick={() => actions.nextHand()}>Next hand</button>
          <button className="btn ghost" onClick={() => actions.endSession()}>End session</button>
        </>
      ) : <span className="muted">Waiting for the host…</span>}
    </div>
  );
}

export default function Table({ state, actions }) {
  const mySeat = state.seats.find((s) => s.occupied && s.isYou) || null;
  const { phase } = state;

  return (
    <div className="table">
      <div className="table-top">
        <button className="code sm" title="Copy code" onClick={() => navigator.clipboard?.writeText(state.code)}>{state.code}</button>
        <div className="top-mid">
          <span className="muted small">Hand {state.handNumber}</span>
          {state.count && <span className="count">RC {state.count.running >= 0 ? `+${state.count.running}` : state.count.running} · TC {state.count.true}</span>}
          {state.justShuffled && <span className="shuffled">🔀 shuffled</span>}
        </div>
        <button className="btn ghost sm" onClick={() => actions.leaveRoom()}>Leave</button>
      </div>

      <div className="felt">
        <div className="dealer-area">
          <div className="dealer-label">Dealer{state.dealer.revealed && ` · ${state.dealer.value}${state.dealer.blackjack ? ' (BJ)' : ''}`}</div>
          <div className="hand-cards">
            {state.dealer.cards.length === 0
              ? <div className="muted small">—</div>
              : state.dealer.cards.map((c, i) => <Card key={i} card={c} scale={0.8} animate delay={i * 0.06} showTag={state.settings.assists.hiLoTags && !c.hidden} />)}
          </div>
        </div>

        <div className="seats-row">
          {state.seats.map((seat) => <Seat key={seat.index} seat={seat} state={state} />)}
        </div>
      </div>

      <div className="controls">
        {phase === 'betting' && <BetBar state={state} actions={actions} mySeat={mySeat} />}
        {phase === 'insurance' && <InsuranceBar state={state} actions={actions} mySeat={mySeat} />}
        {phase === 'playing' && <ActionBar state={state} actions={actions} mySeat={mySeat} />}
        {phase === 'dealerTurn' && <div className="muted">Dealer is playing…</div>}
        {phase === 'roundEnd' && <EndBar state={state} actions={actions} mySeat={mySeat} />}
      </div>
    </div>
  );
}
