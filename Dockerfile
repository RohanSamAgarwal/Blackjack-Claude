# =============================================================================
#  Blackjack — Static Site Docker Build
# =============================================================================
#  Serves the blackjack game as static files using nginx.
#  The game is a single HTML file + JSX that runs entirely in the browser.
# =============================================================================

FROM nginx:alpine

# Copy game files to nginx's default serve directory
COPY blackjack.html /usr/share/nginx/html/index.html
COPY blackjack.jsx /usr/share/nginx/html/blackjack.jsx

# Copy favicon / PWA assets (served from the site root)
COPY favicon.svg favicon.ico favicon-16.png favicon-32.png favicon-48.png apple-touch-icon.png favicon-192.png favicon-512.png site.webmanifest /usr/share/nginx/html/

# Use a custom nginx config for clean URL handling
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
