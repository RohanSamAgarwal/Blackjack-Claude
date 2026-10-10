import { useState } from 'react';

function Toggle({ label, hint, checked, disabled, onChange }) {
  return (
    <label className={`toggle ${disabled ? 'is-ro' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-label">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

function NumberField({ label, value, disabled, min, max, step = 1, onCommit }) {
  const [v, setV] = useState(value);
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={disabled ? value : v} min={min} max={max} step={step} disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(Number(v))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
    </label>
  );
}

export default function Lobby({ state, actions }) {
  const isHost = !!state.you?.isHost;
  const s = state.settings;
  const mySeat = state.you?.seatIndex;
  const [botSkill, setBotSkill] = useState('basic');
  const set = (patch) => actions.updateSettings(patch);
  const ro = !isHost;

  const occupied = state.seats.filter((x) => x.occupied).length;

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div>
          <div className="code-label">Room code</div>
          <button className="code" title="Copy" onClick={() => navigator.clipboard?.writeText(state.code)}>{state.code}</button>
        </div>
        <button className="btn ghost" onClick={() => actions.leaveRoom()}>Leave</button>
      </header>

      <div className="lobby-grid">
        {/* Seats */}
        <section className="panel">
          <h3>Seats <span className="muted">({occupied}/{s.maxSeats})</span></h3>
          {isHost && (
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="muted small">Bot difficulty</span>
              <select value={botSkill} onChange={(e) => setBotSkill(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="basic">Basic strategy</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          )}
          <div className="seat-list">
            {state.seats.map((seat) => (
              <div key={seat.index} className={`seat-tile ${seat.occupied ? 'filled' : ''} ${seat.isYou ? 'you' : ''}`}>
                <div className="seat-no">#{seat.index + 1}</div>
                {seat.occupied ? (
                  <>
                    <div className="seat-name">
                      {seat.name}
                      <div className="badges">
                        {seat.isHost && <span className="badge host">Host</span>}
                        {seat.isBanker && <span className="badge bank">Bank</span>}
                        {seat.kind === 'bot' && <span className="badge bot">{seat.skill}</span>}
                        {seat.isYou && <span className="badge you">You</span>}
                      </div>
                    </div>
                    <div className="seat-chips">{seat.chips.toLocaleString()} chips</div>
                    <div className="seat-actions">
                      {isHost && !seat.isBanker && <button className="mini" onClick={() => actions.setBanker(seat.index)}>Make bank</button>}
                      {isHost && seat.kind === 'bot' && <button className="mini danger" onClick={() => actions.removeBot(seat.index)}>Remove</button>}
                      {seat.isYou && <button className="mini" onClick={() => actions.leaveSeat()}>Leave seat</button>}
                    </div>
                  </>
                ) : (
                  <div className="seat-empty">
                    {mySeat == null && <button className="mini" onClick={() => actions.takeSeat(seat.index)}>Sit here</button>}
                    {isHost && <button className="mini" onClick={() => actions.addBot(seat.index, botSkill)}>+ Bot</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            The <b>bank</b> is the house — it covers wins and collects losses. At session end everyone settles with the bank.
          </p>
        </section>

        {/* Settings */}
        <section className="panel">
          <h3>Table {ro && <span className="muted small">(host controls these)</span>}</h3>
          <div className="fields">
            <NumberField label="Decks" value={s.decks} min={1} max={8} disabled={ro} onCommit={(v) => set({ decks: v })} />
            <NumberField label="Buy-in (chips)" value={s.buyIn} min={50} step={50} disabled={ro} onCommit={(v) => set({ buyIn: v })} />
            <NumberField label="Min bet" value={s.minBet} min={1} disabled={ro} onCommit={(v) => set({ minBet: v })} />
            <NumberField label="Max bet" value={s.maxBet} min={1} disabled={ro} onCommit={(v) => set({ maxBet: v })} />
            <NumberField label="Max seats" value={s.maxSeats} min={1} max={6} disabled={ro} onCommit={(v) => set({ maxSeats: v })} />
            <label className="field">
              <span>Blackjack pays</span>
              <select value={s.blackjackPays} disabled={ro} onChange={(e) => set({ blackjackPays: Number(e.target.value) })}>
                <option value={1.5}>3:2</option>
                <option value={1.2}>6:5</option>
              </select>
            </label>
          </div>

          <div className="toggles">
            <Toggle label="Dealer hits soft 17" checked={s.dealerHitsSoft17} disabled={ro} onChange={(v) => set({ dealerHitsSoft17: v })} />
            <Toggle label="Allow surrender" checked={s.allowSurrender} disabled={ro} onChange={(v) => set({ allowSurrender: v })} />
            <Toggle label="Offer insurance" checked={s.allowInsurance} disabled={ro} onChange={(v) => set({ allowInsurance: v })} />
          </div>

          <h4 className="sub">Assists</h4>
          <div className="toggles">
            <Toggle label="Ask the dealer" hint="basic-strategy hint" checked={s.assists.advisor} disabled={ro} onChange={(v) => set({ assists: { advisor: v } })} />
            <Toggle label="Count readout" hint="Hi-Lo running / true count" checked={s.assists.countReadout} disabled={ro} onChange={(v) => set({ assists: { countReadout: v } })} />
            <Toggle label="High/low tags" hint="per-card +1 / 0 / −1" checked={s.assists.hiLoTags} disabled={ro} onChange={(v) => set({ assists: { hiLoTags: v } })} />
          </div>

          <h4 className="sub">Turn timer</h4>
          <div className="toggles">
            <Toggle label="Enable turn timer" hint="auto-plays basic strategy on timeout" checked={s.turnTimer.enabled} disabled={ro} onChange={(v) => set({ turnTimer: { enabled: v } })} />
          </div>
          {s.turnTimer.enabled && (
            <div className="fields">
              <NumberField label="Seconds per turn" value={s.turnTimer.seconds} min={5} max={300} step={5} disabled={ro} onCommit={(v) => set({ turnTimer: { seconds: v } })} />
            </div>
          )}
        </section>
      </div>

      <footer className="lobby-foot">
        {isHost ? (
          <button className="btn" disabled={occupied === 0} onClick={() => actions.startGame()}>Start game</button>
        ) : (
          <span className="muted">Waiting for the host to start…</span>
        )}
      </footer>
    </div>
  );
}
