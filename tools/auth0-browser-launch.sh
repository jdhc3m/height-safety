#!/usr/bin/env bash
# Launch the dedicated automation Chrome (own profile, local debug port).
# It stays open across script runs so the login session is kept once.
set -euo pipefail

PROFILE="/var/folders/0l/b700nwys2tj56ssxv3pjf16w0000gn/T/opencode/auth0-profile"
PORT=9222

# Stop only a previous automation instance (matched by our profile dir), never
# the owner's normal Chrome.
pkill -f "user-data-dir=$PROFILE" 2>/dev/null || true
sleep 1

open -na "Google Chrome" --args \
  --user-data-dir="$PROFILE" \
  --remote-debugging-port="$PORT" \
  --remote-allow-origins='*' \
  --no-first-run \
  --no-default-browser-check \
  --disable-blink-features=AutomationControlled \
  --start-maximized

for _ in $(seq 1 30); do
  if curl -s "http://localhost:$PORT/json/version" >/dev/null; then
    echo "Chrome automation window ready on :$PORT"
    exit 0
  fi
  sleep 1
done
echo "Chrome did not expose the debug port" >&2
exit 1