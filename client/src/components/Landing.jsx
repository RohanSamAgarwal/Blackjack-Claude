import { useState } from 'react';

export default function Landing({ onCreate, onJoin, connected }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const go = async () => {
    if (!trimmedName || busy) return;
    setBusy(true);
    if (mode === 'create') await onCreate(trimmedName);
    else await onJoin(code.trim(), trimmedName);
    setBusy(false);
  };

  return (
    <div className="center">
      <div className="card">
        <div className="brand">Blackjack</div>
        <div className="brand-sub">Kamino&nbsp;·&nbsp;play with friends</div>

        <div className="seg" style={{ marginTop: 24 }}>
          <button className={mode === 'create' ? 'seg-on' : ''} onClick={() => setMode('create')}>Create table</button>
          <button className={mode === 'join' ? 'seg-on' : ''} onClick={() => setMode('join')}>Join table</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <input placeholder="Your name" value={name} maxLength={20}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
          {mode === 'join' && (
            <input placeholder="Room code" value={code} maxLength={4}
              style={{ textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', fontFamily: 'var(--font-display)' }}
              onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && go()} />
          )}
          <button className="btn" disabled={!trimmedName || busy || (mode === 'join' && code.trim().length < 4) || !connected}
            onClick={go}>
            {!connected ? 'Connecting…' : mode === 'create' ? 'Create table' : 'Join table'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-dim)', fontSize: 13 }}>
          The first player hosts, sets the table, and shares the room code.
        </p>
      </div>
    </div>
  );
}
