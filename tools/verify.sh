#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$ROOT/tools/verify-docs.sh"
bash "$ROOT/tools/contracts.sh" --check
git -C "$ROOT" diff --check
