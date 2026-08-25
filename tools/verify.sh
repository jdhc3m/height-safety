#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/tools/java-env.sh"

bash "$ROOT/tools/verify-docs.sh"
bash "$ROOT/tools/format.sh" --check
bash "$ROOT/tools/lint.sh"
bash "$ROOT/tools/contracts.sh" --check
pnpm --dir "$ROOT" run test
pnpm run pdf-spike:check
pnpm run provider-portability:check
pnpm run provider-spike:check
pnpm run offline-lease:check
bash "$ROOT/tools/android-storage-spike.sh" --check
git -C "$ROOT" diff --check
