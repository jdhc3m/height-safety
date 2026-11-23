#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" != "--check" ]]; then
  echo "usage: tools/offline-lease.sh --check" >&2
  exit 1
fi

node "$ROOT/tools/offline-lease/check.mjs"
