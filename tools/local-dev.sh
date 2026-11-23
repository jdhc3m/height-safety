#!/usr/bin/env bash
#
# One-command local run for the office web + API.
#
# It loads local identity configuration, builds and starts the NestJS API and
# the Next.js office web, waits for both, and opens the browser. Values are
# read from local files that are git-ignored:
#
#   apps/web/.env.local   web runtime values (AUTH0_DOMAIN, AUTH0_CLIENT_ID,
#                         AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL,
#                         AUTH0_API_AUDIENCE, API_BASE_URL)
#   .env.auth0.local      optional; wizard output (AUTH0_DOMAIN, ...)
#
# Secrets never leave this machine and are never printed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ENV="$ROOT/apps/web/.env.local"
WIZARD_ENV="$ROOT/.env.auth0.local"

API_PORT="${API_PORT:-3001}"
WEB_PORT="${WEB_PORT:-3000}"

# Optional wizard output supplies API-side values if the caller has not set them.
if [[ -f "$WIZARD_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$WIZARD_ENV"
  set +a
fi

if [[ ! -f "$WEB_ENV" ]]; then
  cat > "$WEB_ENV" <<'TEMPLATE'
# Local office web configuration. Git-ignored; never commit or share.
# Fill each value, then re-run tools/local-dev.sh.
#
# AUTH0_DOMAIN          Auth0 Dashboard -> Settings -> General -> Domain
# AUTH0_CLIENT_ID       Applications -> your Regular Web App -> Settings
# AUTH0_CLIENT_SECRET   same page (reveal once). Never share this value.
# AUTH0_SECRET          generate locally: openssl rand -hex 32
# APP_BASE_URL          http://localhost:3000
# AUTH0_API_AUDIENCE    Applications -> APIs -> your API -> Identifier
# API_BASE_URL          http://localhost:3001/api/v1
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000
AUTH0_API_AUDIENCE=
API_BASE_URL=http://localhost:3001/api/v1
TEMPLATE
  echo "local-dev: created $WEB_ENV with placeholders."
  echo "local-dev: fill it in, seed the membership (tools/seed-local-inspector.sh),"
  echo "           deploy tools/auth0/post-login-company-claim.js, then re-run this script."
  exit 2
fi

missing=()
for key in AUTH0_DOMAIN AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET AUTH0_SECRET AUTH0_API_AUDIENCE; do
  value="$(grep -E "^${key}=" "$WEB_ENV" | tail -1 | cut -d= -f2- || true)"
  if [[ -z "${value// /}" ]]; then
    missing+=("$key")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "local-dev: these values are still empty in $WEB_ENV:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo "local-dev: see docs/research/AUTH0_SETUP.md for where to get each one." >&2
  exit 2
fi

AUTH0_DOMAIN="${AUTH0_DOMAIN:-$(grep -E '^AUTH0_DOMAIN=' "$WEB_ENV" | tail -1 | cut -d= -f2-)}"
AUTH0_API_AUDIENCE="${AUTH0_API_AUDIENCE:-$(grep -E '^AUTH0_API_AUDIENCE=' "$WEB_ENV" | tail -1 | cut -d= -f2-)}"

export HEIGHT_SAFETY_POSTGRES_URL="${HEIGHT_SAFETY_POSTGRES_URL:-postgres://height_safety:height_safety_dev@127.0.0.1:5432/height_safety}"

echo "local-dev: building the API"
pnpm --filter @height-safety/api build >/dev/null

echo "local-dev: starting the API on :$API_PORT"
PORT="$API_PORT" HOST=127.0.0.1 nohup node "$ROOT/apps/api/dist/main.js" \
  > /tmp/hs-api.log 2>&1 &
api_pid=$!

echo "local-dev: starting the office web on :$WEB_PORT"
nohup pnpm --dir "$ROOT" --filter @height-safety/web dev --port "$WEB_PORT" \
  > /tmp/hs-web.log 2>&1 &
web_pid=$!

cleanup() {
  echo
  echo "local-dev: stopping (api $api_pid, web $web_pid)"
  kill "$api_pid" "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null; then
    break
  fi
  sleep 0.5
done
for _ in $(seq 1 40); do
  if curl -sf "http://localhost:$WEB_PORT/" >/dev/null; then
    break
  fi
  sleep 0.5
done

echo "local-dev: API   http://localhost:$API_PORT/api/v1"
echo "local-dev: web   http://localhost:$WEB_PORT/office"
echo "local-dev: logs  /tmp/hs-api.log  /tmp/hs-web.log"
echo "local-dev: press Ctrl-C to stop both."

open "http://localhost:$WEB_PORT/office" 2>/dev/null || true

wait
