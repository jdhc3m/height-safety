#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
version="8.14.3"
expected_sha="bd71102213493060956ec229d946beee57158dbd89d0e62b91bca0fa2c5f3531"
tool_dir="$ROOT/.tools/gradle-$version"
archive="$ROOT/.tools/gradle-$version-bin.zip"
executable="$tool_dir/gradle-$version/bin/gradle"

if [[ ! -x "$executable" ]]; then
  mkdir -p "$tool_dir"
  if [[ ! -f "$archive" ]]; then
    curl -fL "https://services.gradle.org/distributions/gradle-$version-bin.zip" -o "$archive"
  fi

  actual_sha="$(shasum -a 256 "$archive" | awk '{print $1}')"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    echo "Gradle $version checksum mismatch"
    exit 1
  fi

  unzip -q "$archive" -d "$tool_dir"
fi

exec "$executable" "$@"
