import { useRoom } from './useRoom.js';
import './styles/global.css';

// Phase 0 shell: confirms the client builds and the socket connects. Landing /
// Lobby / Table screens are added in later phases.
export default function App() {
  const { connected } = useRoom();

  return (
    <div className="center">
      <div className="card">
        <div className="brand">Blackjack</div>
        <div className="brand-sub">Kamino&nbsp;·&nbsp;play with friends</div>
        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)' }}>
          {connected ? 'Connected to the table server.' : 'Connecting…'}
        </p>
      </div>
    </div>
  );
}
