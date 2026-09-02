#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/tools/android-env.sh"

if [[ -z "${TEST_POSTGRES_URL:-}" ]]; then
  echo "test: set TEST_POSTGRES_URL to a disposable PostgreSQL database" >&2
  exit 2
fi
if [[ "${TEST_POSTGRES_ALLOW_MIGRATION:-}" != "1" ]]; then
  echo "test: set TEST_POSTGRES_ALLOW_MIGRATION=1 for isolated migration checks" >&2
  exit 2
fi

pnpm --filter @height-safety/api test
pnpm --filter @height-safety/web test
pnpm --filter @height-safety/web build
pnpm --filter @height-safety/api-client build
bash "$ROOT/apps/android/gradlew" -p "$ROOT/apps/android" \
  :domain:test \
  :app:testDebugUnitTest \
  :app:compileDebugAndroidTestKotlin \
  --no-daemon

echo "test passed"
