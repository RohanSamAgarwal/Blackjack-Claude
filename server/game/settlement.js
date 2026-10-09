// =============================================================================
//  settlement.js — end-of-session accounting. Pure; unit-tested.
// =============================================================================
//  Each player's net = currentChips − totalBuyIn (in chips). Because the dealer
//  is automated and the house P/L accrues to the designated banker, the nets
//  across all players sum to zero, so "who owes whom" closes exactly.
//
//  `transfers` are the minimal set of payments that settle every balance,
//  computed with the standard greedy min-cash-flow method. Amounts are in chips;
//  multiply by chipValue for a currency display.
// =============================================================================

/**
 * @param {Array<{id:string,name:string,buyIn:number,chips:number,isBanker?:boolean}>} players
 * @param {{chipValue?:number}} opts
 * @returns {{nets:Array, transfers:Array, chipValue:number, balanced:boolean}}
 */
export function settleSession(players, { chipValue = 1 } = {}) {
  const nets = players.map((p) => ({
    id: p.id,
    name: p.name,
    isBanker: !!p.isBanker,
    buyIn: p.buyIn,
    chips: p.chips,
    net: p.chips - p.buyIn,
  }));

  const sum = nets.reduce((a, n) => a + n.net, 0);

  // Work on a copy so we can mutate running balances. If the nets don't sum to
  // exactly zero (shouldn't happen in the banker model, but be robust), push the
  // residual onto the banker so the transfers still balance.
  const bal = nets.map((n) => ({ id: n.id, name: n.name, amt: n.net }));
  if (sum !== 0) {
    const banker = bal.find((b) => nets.find((n) => n.id === b.id)?.isBanker) || bal[0];
    if (banker) banker.amt -= sum;
  }

  const debtors = bal.filter((b) => b.amt < 0).map((b) => ({ ...b, amt: -b.amt })); // owe this much
  const creditors = bal.filter((b) => b.amt > 0).map((b) => ({ ...b })); // owed this much
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const pay = Math.min(d.amt, c.amt);
    if (pay > 0) {
      transfers.push({ from: d.id, fromName: d.name, to: c.id, toName: c.name, amount: pay });
    }
    d.amt -= pay;
    c.amt -= pay;
    if (d.amt <= 1e-9) di += 1;
    if (c.amt <= 1e-9) ci += 1;
  }

  return { nets, transfers, chipValue, balanced: sum === 0 };
}
