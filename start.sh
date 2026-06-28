#!/usr/bin/env bash
# start.sh — launches the 3D-Ascii-Profile-Card project with the Daedalus UI.
#
# Serves the project root on a local HTTP server so that both the Daedalus UI
# (Daedalus/index.html) and the profile card (index.html) are available.
# Opens the Daedalus UI in your browser as the entry point.
#
# Usage:
#   ./start.sh [port]
#
# If no port is given, defaults to 8080.

PORT="${1:-8080}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "┌──────────────────────────────────────────────┐"
echo "│  3D-Ascii-Profile-Card + Daedalus UI         │"
echo "│  Serving from: $ROOT"
echo "│  Port: $PORT                                 │"
echo "└──────────────────────────────────────────────┘"
echo ""
echo "  Profile Card:  http://localhost:$PORT/"
echo "  Daedalus UI:  http://localhost:$PORT/Daedalus/"
echo ""

if command -v python3 &>/dev/null; then
  cd "$ROOT"
  # Try to open browser (ignore errors in headless environments)
  (sleep 1 && xdg-open "http://localhost:$PORT/Daedalus/" 2>/dev/null || true) &
  exec python3 -m http.server "$PORT"
else
  echo "Error: python3 is required to run the local server." >&2
  exit 1
fi