#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/tools/android-env.sh"

pnpm --filter @height-safety/api test
pnpm --filter @height-safety/web test
pnpm --filter @height-safety/web build
pnpm --filter @height-safety/api-client build
bash "$ROOT/apps/android/gradlew" -p "$ROOT/apps/android" \
  :domain:test \
  :app:testDebugUnitTest \
  --no-daemon

echo "test passed"
