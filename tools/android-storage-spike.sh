#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"
project="$ROOT/apps/android/storage-spike"
committed_schemas="$project/schemas"

if [[ "$mode" != "--check" && "$mode" != "--instrumented" ]]; then
  echo "Usage: tools/android-storage-spike.sh [--check|--instrumented]"
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  if [[ -d "${ANDROID_SDK_ROOT:-}" ]]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
  elif [[ -d "$HOME/Library/Android/sdk" ]]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  else
    echo "ANDROID_HOME or ANDROID_SDK_ROOT must identify an Android SDK"
    exit 1
  fi
fi

if [[ "$mode" == "--check" ]]; then
  if [[ ! -d "$committed_schemas" ]]; then
    echo "Committed Room schemas are missing"
    exit 1
  fi
  generated_schemas="$(mktemp -d "${TMPDIR:-/tmp}/height-safety-room-schemas.XXXXXX")"
  trap 'rm -rf "$generated_schemas"' EXIT
  bash "$ROOT/tools/gradle.sh" -p "$project" \
    -ProomSchemaLocation="$generated_schemas" \
    kaptDebugKotlin --rerun-tasks --no-daemon
  diff -ru "$committed_schemas" "$generated_schemas"
  bash "$ROOT/tools/gradle.sh" -p "$project" \
    assembleDebug assembleDebugAndroidTest lintDebug check --no-daemon
  exit 0
fi

if ! "$ANDROID_HOME/platform-tools/adb" get-state >/dev/null 2>&1; then
  echo "A booted Android API 23+ device or emulator is required"
  exit 1
fi

exec bash "$ROOT/tools/gradle.sh" -p "$project" connectedDebugAndroidTest --no-daemon
