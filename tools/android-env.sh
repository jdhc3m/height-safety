#!/usr/bin/env bash
set -euo pipefail

script_source="${BASH_SOURCE[0]-$0}"
ROOT="$(cd "$(dirname "$script_source")/.." && pwd)"
source "$ROOT/tools/java-env.sh"

if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
elif [[ -n "${ANDROID_SDK_ROOT:-}" && -d "$ANDROID_SDK_ROOT" ]]; then
  export ANDROID_HOME="$ANDROID_SDK_ROOT"
else
  detected_sdk=""
  if command -v android >/dev/null 2>&1; then
    detected_sdk="$(android info sdk 2>/dev/null | sed -n '1p' || true)"
  fi
  if [[ -z "$detected_sdk" && -n "${HOME:-}" ]]; then
    for candidate in "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
      if [[ -d "$candidate" ]]; then
        detected_sdk="$candidate"
        break
      fi
    done
  fi
  if [[ -n "$detected_sdk" && -d "$detected_sdk" ]]; then
    export ANDROID_HOME="$detected_sdk"
    export ANDROID_SDK_ROOT="$detected_sdk"
  fi
fi

[[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]] || {
  echo "Android SDK required; set ANDROID_HOME or ANDROID_SDK_ROOT"
  exit 1
}
