// =============================================================================
//  socketHandlers.js — bridges Socket.IO connections to Room/RoomManager.
// =============================================================================
//  Each viewer gets state tailored to them (their seat, their "you" markers),
//  so we broadcast by iterating the room's connected members and emitting
//  stateFor(playerId) to each one's socket.
// =============================================================================

import { RoomManager } from './game/RoomManager.js';
import { C, S } from './types/protocol.js';

export function attachSocketHandlers(io) {
  const manager = new RoomManager();

  /** Send every connected member of a room their own tailored state. */
  function broadcast(room) {
    for (const member of room.members.values()) {
      if (member.socketId && member.connected) {
        io.to(member.socketId).emit(S.STATE, room.stateFor(member.id));
      }
    }
  }

  io.on('connection', (socket) => {
    let bound = null; // { code, playerId }

    const fail = (message) => socket.emit(S.ERROR, { message });

    const guard = (fn) => (payload, ack) => {
      try {
        const result = fn(payload || {}) || {};
        if (typeof ack === 'function') ack({ ok: true, ...result });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        fail(err.message);
      }
    };

    function bindRoom(room, member) {
      bound = { code: room.code, playerId: member.id };
      socket.join(room.code);
      room.onChange = () => broadcast(room);
    }

    socket.on(C.CREATE_ROOM, guard(({ name, settings }) => {
      const room = manager.createRoom(settings ? { settings } : {});
      const member = room.join({ name, socketId: socket.id });
      bindRoom(room, member);
      broadcast(room);
      return { code: room.code, playerId: member.id };
    }));

    socket.on(C.JOIN_ROOM, guard(({ code, name, playerId }) => {
      const room = manager.getRoom(code);
      if (!room) throw new Error('No room with that code');
      const member = room.join({ name, playerId, socketId: socket.id });
      bindRoom(room, member);
      broadcast(room);
      return { code: room.code, playerId: member.id };
    }));

    // --- Actions that require an already-bound room --------------------------
    const withRoom = (fn) => (payload) => {
      if (!bound) throw new Error('Join a room first');
      const room = manager.getRoom(bound.code);
      if (!room) throw new Error('Room no longer exists');
      return fn(room, bound.playerId, payload);
    };

    socket.on(C.UPDATE_SETTINGS, guard(withRoom((room, pid, { settings }) => room.updateSettings(pid, settings))));
    socket.on(C.TAKE_SEAT, guard(withRoom((room, pid, { seatIndex }) => room.takeSeat(pid, seatIndex))));
    socket.on(C.LEAVE_SEAT, guard(withRoom((room, pid) => room.leaveSeat(pid))));
    socket.on(C.ADD_BOT, guard(withRoom((room, pid, { seatIndex, difficulty }) => room.addBot(pid, seatIndex, difficulty))));
    socket.on(C.REMOVE_BOT, guard(withRoom((room, pid, { seatIndex }) => room.removeBot(pid, seatIndex))));
    socket.on(C.SET_BANKER, guard(withRoom((room, pid, { seatIndex }) => room.setBanker(pid, seatIndex))));
    socket.on(C.START_GAME, guard(withRoom((room, pid) => room.startGame(pid))));
    socket.on(C.PLACE_BET, guard(withRoom((room, pid, { amount }) => room.placeBet(pid, amount))));
    socket.on(C.CLEAR_BET, guard(withRoom((room, pid) => room.clearBet(pid))));
    socket.on(C.DEAL, guard(withRoom((room, pid) => room.deal(pid))));
    socket.on(C.ACTION, guard(withRoom((room, pid, action) => room.act(pid, action))));
    socket.on(C.NEXT_HAND, guard(withRoom((room, pid) => room.nextHand(pid))));
    socket.on(C.REBUY, guard(withRoom((room, pid, { amount }) => room.rebuy(pid, amount))));
    socket.on(C.END_SESSION, guard(withRoom((room, pid) => room.endSession(pid))));

    socket.on(C.LEAVE_ROOM, guard(withRoom((room, pid) => {
      room.leaveRoom(pid);
      socket.leave(room.code);
      manager.scheduleCleanup(room.code);
      bound = null;
    })));

    socket.on('disconnect', () => {
      if (!bound) return;
      const room = manager.getRoom(bound.code);
      if (!room) return;
      room.disconnect(bound.playerId);
      manager.scheduleCleanup(room.code);
    });
  });

  return manager;
}
