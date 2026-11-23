#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/tools/android-env.sh"

for shell_script in "$ROOT"/tools/*.sh; do
  bash -n "$shell_script"
done

pnpm --filter @height-safety/api lint
pnpm --filter @height-safety/web lint
pnpm --filter @height-safety/api-client build
bash "$ROOT/apps/android/gradlew" -p "$ROOT/apps/android" \
  :domain:compileKotlin \
  :data:lintDebug \
  :app:lintDebug \
  --no-daemon

echo "lint passed"
