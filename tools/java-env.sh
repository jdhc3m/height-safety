#!/usr/bin/env bash
set -euo pipefail

script_source="${BASH_SOURCE[0]-$0}"
ROOT="$(cd "$(dirname "$script_source")/.." && pwd)"
expected_java="$(tr -d '[:space:]' < "$ROOT/.java-version")"
local_java="$ROOT/.tools/temurin-$expected_java/Contents/Home"

if [[ -x "$local_java/bin/java" ]]; then
  export JAVA_HOME="$local_java"
  export PATH="$JAVA_HOME/bin:$PATH"
  hash -r 2>/dev/null || true
fi

java_command="$(command -v java 2>/dev/null || true)"
actual_java=""
if [[ -n "$java_command" ]]; then
  actual_java="$("$java_command" -version 2>&1 | sed -n '1s/.*version "\([^"]*\)".*/\1/p' || true)"
fi

if [[ "$actual_java" != "$expected_java" ]]; then
  [[ -x "$local_java/bin/java" ]] || {
    echo "Java $expected_java required; found ${actual_java:-missing}"
    exit 1
  }
  export JAVA_HOME="$local_java"
  export PATH="$JAVA_HOME/bin:$PATH"
  hash -r 2>/dev/null || true
  java_command="$JAVA_HOME/bin/java"
fi

actual_java="$("$java_command" -version 2>&1 | sed -n '1s/.*version "\([^"]*\)".*/\1/p' || true)"
[[ "$actual_java" == "$expected_java" ]] || {
  echo "Java $expected_java required; found ${actual_java:-missing}"
  exit 1
}

actual_java_home="$("$java_command" -XshowSettings:properties -version 2>&1 | sed -n 's/^[[:space:]]*java.home = //p' || true)"
if [[ -x "$actual_java_home/bin/java" ]]; then
  export JAVA_HOME="$actual_java_home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
