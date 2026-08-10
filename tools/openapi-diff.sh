#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
version="2.1.7"
expected_sha="aec2750f6ec0ccb7f557c2c4c8aa3a272a545b9cde1effe479e311451dfcd970"
tool_dir="$ROOT/.tools/openapi-diff"
artifact="$tool_dir/openapi-diff-cli-$version-all.jar"

mkdir -p "$tool_dir"
if [[ ! -f "$artifact" ]]; then
  curl -fL \
    "https://repo1.maven.org/maven2/org/openapitools/openapidiff/openapi-diff-cli/$version/openapi-diff-cli-$version-all.jar" \
    -o "$artifact"
fi

actual_sha="$(shasum -a 256 "$artifact" | awk '{print $1}')"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "OpenAPI-diff $version checksum mismatch"
  exit 1
fi

exec java -jar "$artifact" "$@"
