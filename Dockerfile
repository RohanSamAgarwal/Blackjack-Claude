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

# Use a custom nginx config for clean URL handling
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
