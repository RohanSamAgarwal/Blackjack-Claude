// =============================================================================
//  protocol.js — Socket.IO event names shared in spirit by client and server.
// =============================================================================
//  Client → Server events are prefixed `c:`; Server → Client are `s:`.
//  Kept as a flat map of constants so both ends refer to the same strings and
//  typos surface as undefined rather than silent no-ops.
// =============================================================================

export const C = {
  CREATE_ROOM: 'c:createRoom',       // { name, settings? }        → ack { code, playerId }
  JOIN_ROOM: 'c:joinRoom',           // { code, name, playerId? }  → ack { code, playerId } | { error }
  UPDATE_SETTINGS: 'c:updateSettings', // { settings }             (host only, in lobby)
  TAKE_SEAT: 'c:takeSeat',           // { seatIndex }              (spectator → open seat, in lobby)
  LEAVE_SEAT: 'c:leaveSeat',         // {}                         (seat → spectator, in lobby)
  ADD_BOT: 'c:addBot',               // { seatIndex, difficulty }  (host only)
  REMOVE_BOT: 'c:removeBot',         // { seatIndex }              (host only)
  SET_BANKER: 'c:setBanker',         // { seatIndex }              (host only — designate the house/bank)
  START_GAME: 'c:startGame',         // {}                         (host only — opens the first betting round)
  PLACE_BET: 'c:placeBet',           // { amount }                 (seated player, BET phase)
  CLEAR_BET: 'c:clearBet',           // {}                         (seated player, BET phase)
  DEAL: 'c:deal',                    // {}                         (host — lock bets and deal)
  ACTION: 'c:action',                // { type, amount? }          (current actor: hit|stand|double|split|surrender|insurance|decline)
  NEXT_HAND: 'c:nextHand',           // {}                         (host — return to betting after a round)
  REBUY: 'c:rebuy',                  // { amount }                 (seated player — top up chips / new buy-in)
  END_SESSION: 'c:endSession',       // {}                         (host — end session → settlement)
  LEAVE_ROOM: 'c:leaveRoom',         // {}
};

export const S = {
  STATE: 's:state',                  // full per-viewer room/game state
  ERROR: 's:error',                  // { message }
  ROUND_RESULT: 's:roundResult',     // { results }  (emitted at settle for animations)
  SESSION_OVER: 's:sessionOver',     // { settlement } (net per player + who-owes-whom)
};
