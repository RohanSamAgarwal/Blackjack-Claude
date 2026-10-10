// Shared server configuration.
export const PORT = Number(process.env.PORT) || 3004;

// The app is path-routed behind Caddy at /blackjack/ (prefix stripped before it
// reaches us in production). We keep the base consistent so the Socket.IO path
// and static assets line up in both local and deployed environments.
export const BASE_PATH = process.env.BASE_PATH || '/blackjack';
export const SOCKET_PATH = `${BASE_PATH}/socket.io`;

export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
