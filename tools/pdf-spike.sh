#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"

case "$mode" in
  --check)
    node "$ROOT/tools/pdf-spike/check.mjs"
    ;;
  --install-browser)
    pnpm exec playwright install chromium
    ;;
  --run)
    node "$ROOT/tools/pdf-spike/benchmark.mjs"
    ;;
  *)
    echo "Usage: tools/pdf-spike.sh [--check|--install-browser|--run]"
    exit 1
    ;;
esac
