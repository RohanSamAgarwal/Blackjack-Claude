import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served under /blackjack/ in every environment (see server/config.js),
// so assets are built with that base. During local dev, proxy the Socket.IO
// endpoint to the Node game server on :3004.
export default defineConfig({
  base: '/blackjack/',
  plugins: [react()],
  server: {
    proxy: {
      '/blackjack/socket.io': {
        target: 'http://localhost:3004',
        ws: true,
      },
    },
  },
});
