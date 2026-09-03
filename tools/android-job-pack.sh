#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"
project="$ROOT/apps/android"
committed_schemas="$project/data/schemas"

if [[ "$mode" != "--check" && "$mode" != "--instrumented" ]]; then
  echo "Usage: tools/android-job-pack.sh [--check|--instrumented]"
  exit 1
fi

source "$ROOT/tools/android-env.sh"

if [[ "$mode" == "--check" ]]; then
  if [[ ! -d "$committed_schemas" ]]; then
    echo "Committed job-pack Room schemas are missing"
    exit 1
  fi
  generated_schemas="$(mktemp -d "${TMPDIR:-/tmp}/height-safety-job-pack-schemas.XXXXXX")"
  trap 'rm -rf "$generated_schemas"' EXIT
  cp -R "$committed_schemas/." "$generated_schemas/"
  bash "$ROOT/tools/gradle.sh" -p "$project" \
    -ProomSchemaLocation="$generated_schemas" \
    :data:kaptDebugKotlin --rerun-tasks --no-daemon
  diff -ru "$committed_schemas" "$generated_schemas"
  bash "$ROOT/tools/gradle.sh" -p "$project" \
    :data:assembleDebug :data:assembleDebugAndroidTest :data:lintDebug :data:check \
    --no-daemon
  exit 0
fi

if ! "$ANDROID_HOME/platform-tools/adb" get-state >/dev/null 2>&1; then
  echo "A booted Android API 26+ device or emulator is required"
  exit 1
fi

exec bash "$ROOT/tools/gradle.sh" -p "$project" :data:connectedDebugAndroidTest --no-daemon
