import { useRoom } from './useRoom.js';
import { useSounds } from './useSounds.js';
import Landing from './components/Landing.jsx';
import Lobby from './components/Lobby.jsx';
import Table from './components/Table.jsx';
import Settlement from './components/Settlement.jsx';
import SoundToggle from './components/SoundToggle.jsx';
import './styles/global.css';

export default function App() {
  const room = useRoom();
  const { state, error, connected } = room;
  useSounds(state);

  const actions = {
    createRoom: room.createRoom,
    joinRoom: room.joinRoom,
    leaveRoom: room.leaveRoom,
    updateSettings: room.updateSettings,
    takeSeat: room.takeSeat,
    leaveSeat: room.leaveSeat,
    addBot: room.addBot,
    removeBot: room.removeBot,
    setBanker: room.setBanker,
    startGame: room.startGame,
    placeBet: room.placeBet,
    clearBet: room.clearBet,
    deal: room.deal,
    act: room.act,
    nextHand: room.nextHand,
    rebuy: room.rebuy,
    endSession: room.endSession,
  };

  let screen;
  if (!state) screen = <Landing onCreate={room.createRoom} onJoin={room.joinRoom} connected={connected} />;
  else if (state.phase === 'lobby') screen = <Lobby state={state} actions={actions} />;
  else screen = <Table state={state} actions={actions} />;

  return (
    <>
      <SoundToggle />
      {screen}
      {state?.phase === 'ended' && <Settlement state={state} actions={actions} />}
      {!connected && state && <div className="conn-banner"><span className="conn-dot" /> Reconnecting…</div>}
      {error && <div className="toast">{error}</div>}
    </>
  );
}
