#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
expected_node="$(tr -d '[:space:]' < "$ROOT/.node-version")"
expected_java="$(tr -d '[:space:]' < "$ROOT/.java-version")"
expected_pnpm="$(node -p "require('$ROOT/package.json').packageManager.split('@').at(-1)")"

actual_node="$(node --version 2>/dev/null | sed 's/^v//')"
if [[ "$actual_node" != "$expected_node" ]]; then
  echo "Node.js $expected_node required; found ${actual_node:-missing}"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm $expected_pnpm required; pnpm is not installed"
  exit 1
fi

actual_pnpm="$(pnpm --version)"
if [[ "$actual_pnpm" != "$expected_pnpm" ]]; then
  echo "pnpm $expected_pnpm required; found $actual_pnpm"
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Temurin JDK $expected_java required; Java is not installed"
  exit 1
fi

actual_java="$(java -version 2>&1 | sed -n '1s/.*version "\([^"]*\)".*/\1/p')"
if [[ "$actual_java" != "$expected_java" ]]; then
  echo "Temurin JDK $expected_java required; found ${actual_java:-unknown}"
  exit 1
fi

java_settings="$(java -XshowSettings:properties -version 2>&1)"
actual_java_vendor="$(sed -n 's/^[[:space:]]*java.vendor = //p' <<< "$java_settings")"
actual_java_distribution="$(sed -n 's/^[[:space:]]*java.vendor.version = //p' <<< "$java_settings")"
if [[ "$actual_java_vendor" != "Eclipse Adoptium" || \
      "$actual_java_distribution" != "Temurin-$expected_java"+* ]]; then
  echo "Temurin JDK $expected_java required; found ${actual_java_distribution:-${actual_java_vendor:-unknown vendor}}"
  exit 1
fi

pnpm install --frozen-lockfile
