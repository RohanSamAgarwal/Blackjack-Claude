// End-of-session overlay: net result per player + the who-owes-whom breakdown.
export default function Settlement({ state, actions }) {
  const s = state.settlement;
  if (!s) return null;
  const nets = [...s.nets].sort((a, b) => b.net - a.net);
  const fmt = (n) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString());

  return (
    <div className="overlay">
      <div className="overlay-card settle">
        <h2>Session settled</h2>

        <div className="settle-sec">
          <div className="settle-h">Net result</div>
          <ol className="nets">
            {nets.map((n) => (
              <li key={n.id} className={n.net > 0 ? 'up' : n.net < 0 ? 'down' : ''}>
                <span className="who">{n.name}{n.isBanker && <span className="badge bank">Bank</span>}{n.id === state.you?.playerId && <span className="badge you">You</span>}</span>
                <span className="amt">{fmt(n.net)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="settle-sec">
          <div className="settle-h">Who owes whom</div>
          {s.transfers.length === 0 ? (
            <p className="muted">Everyone's even — no payments needed. 🎉</p>
          ) : (
            <ul className="transfers">
              {s.transfers.map((t, i) => (
                <li key={i}>
                  <b>{t.fromName}</b> pays <b>{t.toName}</b> <span className="amt">{t.amount.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Tracking only — settle up however you normally do.</p>
        </div>

        <div className="overlay-actions">
          <button className="btn" onClick={() => actions.leaveRoom()}>Back to start</button>
        </div>
      </div>
    </div>
  );
}
