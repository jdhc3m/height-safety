#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/tools/java-env.sh"

if [[ -z "${TEST_POSTGRES_URL:-}" ]]; then
  echo "verify: set TEST_POSTGRES_URL to a disposable PostgreSQL database" >&2
  exit 2
fi
if [[ "${TEST_POSTGRES_ALLOW_MIGRATION:-}" != "1" ]]; then
  echo "verify: set TEST_POSTGRES_ALLOW_MIGRATION=1 for isolated migration checks" >&2
  exit 2
fi
if [[ -z "${HEIGHT_SAFETY_POSTGRES_URL:-}" ]]; then
  echo "verify: set HEIGHT_SAFETY_POSTGRES_URL for the live portability check" >&2
  exit 2
fi

bash "$ROOT/tools/verify-docs.sh"
bash "$ROOT/tools/format.sh" --check
bash "$ROOT/tools/lint.sh"
bash "$ROOT/tools/contracts.sh" --check
bash "$ROOT/tools/design-tokens.sh" --check
node "$ROOT/tools/agent-loop/unblock.mjs" --self-test
pnpm --dir "$ROOT" run test
HEIGHT_SAFETY_POSTGRES_URL="$HEIGHT_SAFETY_POSTGRES_URL" \
  bash "$ROOT/tools/provider-portability/postgresql-check.sh"
pnpm run pdf-spike:check
pnpm run provider-portability:check
pnpm run provider-spike:check
pnpm run offline-lease:check
bash "$ROOT/tools/android-storage-spike.sh" --check
bash "$ROOT/tools/android-job-pack.sh" --check
bash "$ROOT/tools/android-theme.sh" --check
git -C "$ROOT" diff --check
