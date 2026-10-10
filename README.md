# Blackjack — play with friends

A self-hosted, real-time multiplayer blackjack table in the same mould as the
Kamino **Poker** game: the first visitor hosts, configures the table, and shares
a room code for friends to join. Play a session together, buy in for chips, and
at the end see the net result per player and a **who-owes-whom** settlement
(tracking only — no real money moves).

> Originally a single-player browser game built with Claude; rebuilt as a
> multiplayer app (React + Express + Socket.IO) on the Poker stack.

## What it does

- **Live multiplayer rooms** — host/room-code join, up to 6 seats, real-time
  state for everyone at the table, reconnect after a refresh or drop.
- **Buy-in & settlement** — each player buys in for chips; the **banker** is the
  house (covers wins, collects losses), so at session end the nets sum to zero
  and the who-owes-whom breakdown closes exactly. Rebuys supported.
- **Full blackjack** — 1–8 deck shoe, split / double / surrender / insurance,
  configurable dealer rules (S17 / H17) and blackjack payout (3:2 or 6:5).
- **AI bots** — fill empty seats with beginner / basic-strategy / aggressive
  bots; solo play is just you plus bots.
- **Optional assists (host toggles, off by default):** "ask the dealer"
  basic-strategy hints, a Hi-Lo running/true count readout, and per-card high/low
  tags.
- **Optional turn timer** — on expiry the server auto-finishes the hand by basic
  strategy from the table cards only (no count, no new wager) and stops; it never
  auto-starts the next hand.

## Architecture

- **Server** — Express + Socket.IO (`server/`). Authoritative in-memory game
  state; the dealer is automated and the designated banker is the money
  counterparty, so chips are conserved every round. Serves the built client on
  one port (`3004`, base path `/blackjack`).
  - `server/game/` — the pure, unit-tested engine: `cards`, `round` (dealer play
    + outcomes), `strategy` (advisor + count-free timeout play), `bot`,
    `settlement`, `settings`, plus `Room` / `RoomManager` and the socket
    protocol (`types/protocol.js`).
- **Client** — React + Vite (`client/`), served under base path `/blackjack/`.
  A `useRoom()` hook holds the server-authoritative state; components render
  Landing → Lobby → Table → Settlement.
- **Deploy** — multi-stage Dockerfile (build client → run Node), its own
  container, path-routed at `/blackjack/` behind Caddy on the Kamino homeserver.

## Develop

```bash
npm install                 # server deps
npm --prefix client install # client deps
npm test                    # engine + room test suite (node:test)

# Local run (two terminals):
npm start                   # server on :3004 (serves the built client)
npm run dev:client          # Vite dev server with a socket proxy to :3004
```

The previous single-player version is preserved under `legacy/` for reference.
