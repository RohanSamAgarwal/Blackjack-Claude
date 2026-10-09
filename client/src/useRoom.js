import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';

const LS_KEY = 'blackjack:session';

function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; }
}
function saveSession(s) {
  try {
    if (s) localStorage.setItem(LS_KEY, JSON.stringify(s));
    else localStorage.removeItem(LS_KEY);
  } catch { /* private mode / blocked storage — session just won't persist */ }
}

// Promise wrapper around an ack'd emit.
function request(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

/**
 * Central client state: connection, the current room view (server-authoritative),
 * transient errors, and the action senders. Handles reconnect via a stored
 * playerId + room code.
 */
export function useRoom() {
  const [connected, setConnected] = useState(socket.connected);
  const [state, setState] = useState(null); // latest s:state for this viewer
  const [error, setError] = useState(null);
  const sessionRef = useRef(loadSession());

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      const s = sessionRef.current;
      if (s?.code && s?.playerId) {
        request('c:joinRoom', { code: s.code, name: s.name, playerId: s.playerId })
          .then((res) => { if (!res?.ok) { sessionRef.current = null; saveSession(null); setState(null); } });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s) => setState(s);
    const onError = (e) => {
      setError(e?.message || 'Something went wrong');
      setTimeout(() => setError(null), 4000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('s:state', onState);
    socket.on('s:error', onError);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('s:state', onState);
      socket.off('s:error', onError);
    };
  }, []);

  const remember = useCallback((res, name) => {
    if (res?.ok && res.code) {
      sessionRef.current = { code: res.code, playerId: res.playerId, name };
      saveSession(sessionRef.current);
    }
    return res;
  }, []);

  const createRoom = useCallback(async (name, settings) => {
    const res = await request('c:createRoom', { name, settings });
    if (!res?.ok) setError(res?.error || 'Could not create room');
    return remember(res, name);
  }, [remember]);

  const joinRoom = useCallback(async (code, name) => {
    const res = await request('c:joinRoom', { code: String(code || '').toUpperCase(), name });
    if (!res?.ok) setError(res?.error || 'Could not join room');
    return remember(res, name);
  }, [remember]);

  const leaveRoom = useCallback(async () => {
    await request('c:leaveRoom', {});
    sessionRef.current = null; saveSession(null); setState(null);
  }, []);

  // Thin senders for the rest of the protocol.
  const send = useCallback((event, payload = {}) => request(event, payload), []);

  return {
    connected, state, error,
    createRoom, joinRoom, leaveRoom,
    updateSettings: useCallback((settings) => send('c:updateSettings', { settings }), [send]),
    takeSeat: useCallback((seatIndex) => send('c:takeSeat', { seatIndex }), [send]),
    leaveSeat: useCallback(() => send('c:leaveSeat', {}), [send]),
    addBot: useCallback((seatIndex, difficulty) => send('c:addBot', { seatIndex, difficulty }), [send]),
    removeBot: useCallback((seatIndex) => send('c:removeBot', { seatIndex }), [send]),
    setBanker: useCallback((seatIndex) => send('c:setBanker', { seatIndex }), [send]),
    startGame: useCallback(() => send('c:startGame', {}), [send]),
    placeBet: useCallback((amount) => send('c:placeBet', { amount }), [send]),
    clearBet: useCallback(() => send('c:clearBet', {}), [send]),
    deal: useCallback(() => send('c:deal', {}), [send]),
    act: useCallback((type, amount) => send('c:action', { type, amount }), [send]),
    nextHand: useCallback(() => send('c:nextHand', {}), [send]),
    rebuy: useCallback((amount) => send('c:rebuy', { amount }), [send]),
    endSession: useCallback(() => send('c:endSession', {}), [send]),
  };
}
