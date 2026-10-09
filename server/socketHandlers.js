// =============================================================================
//  socketHandlers.js — bridges Socket.IO connections to Room/RoomManager.
// =============================================================================
//  Phase 0 skeleton: a connection logger and a hello round-trip so the server
//  is runnable. Phase 2 replaces this with the real room-bound protocol.
// =============================================================================

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('c:hello', (_payload, ack) => {
      if (typeof ack === 'function') ack({ ok: true, service: 'blackjack' });
    });
  });
}
