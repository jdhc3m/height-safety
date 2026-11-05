#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"

if [[ "$mode" != "--check" && "$mode" != "--generate" ]]; then
  echo "Usage: tools/design-tokens.sh [--check|--generate]"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required; run tools/bootstrap.sh first"
  exit 1
fi

node "$ROOT/tools/design-tokens/generate.mjs" "$mode"
