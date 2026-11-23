#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"
project="$ROOT/apps/android"

if [[ "$mode" != "--check" && "$mode" != "--record" ]]; then
  echo "Usage: tools/android-theme.sh [--check|--record]"
  exit 1
fi

source "$ROOT/tools/android-env.sh"

if [[ "$mode" == "--record" ]]; then
  bash "$ROOT/tools/gradle.sh" -p "$project" \
    :app:recordRoborazziDebug --no-daemon
  exit 0
fi

bash "$ROOT/tools/gradle.sh" -p "$project" \
  :app:verifyRoborazziDebug --no-daemon

echo "android theme check passed"
