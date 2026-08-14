#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"

if [[ "$mode" != "--check" && "$mode" != "--generate" ]]; then
  echo "Usage: tools/contracts.sh [--check|--generate]"
  exit 1
fi

for command in node pnpm java; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is required; run tools/bootstrap.sh first"
    exit 1
  fi
done

generate_tree() {
  local destination="$1"
  local spec="$destination/contracts/openapi/v1/openapi.json"
  local ignored_wrappers="gradlew,gradlew.bat,gradle/wrapper/gradle-wrapper.jar,gradle/wrapper/gradle-wrapper.properties"

  mkdir -p "$(dirname "$spec")"
  node "$ROOT/apps/api/dist/generate-openapi.js" "$spec"
  pnpm exec redocly lint "$spec" --config "$ROOT/contracts/openapi/redocly.yaml"
  pnpm exec openapi-generator-cli generate \
    -i "$spec" \
    -c "$ROOT/contracts/openapi/generators/kotlin.yaml" \
    -o "$destination/clients/kotlin" \
    --openapi-generator-ignore-list "$ignored_wrappers"
  pnpm exec openapi-generator-cli generate \
    -i "$spec" \
    -c "$ROOT/contracts/openapi/generators/typescript.yaml" \
    -o "$destination/clients/typescript"
}

pnpm --filter @height-safety/api build

first="$(mktemp -d "${TMPDIR:-/tmp}/height-safety-contract-first.XXXXXX")"
second="$(mktemp -d "${TMPDIR:-/tmp}/height-safety-contract-second.XXXXXX")"
trap 'rm -rf "$first" "$second"' EXIT

generate_tree "$first"

if [[ "$mode" == "--generate" ]]; then
  mkdir -p "$ROOT/contracts/openapi/v1" "$ROOT/clients/kotlin" "$ROOT/clients/typescript"
  rsync -a --delete "$first/contracts/openapi/v1/" "$ROOT/contracts/openapi/v1/"
  rsync -a --delete "$first/clients/kotlin/" "$ROOT/clients/kotlin/"
  rsync -a --delete "$first/clients/typescript/" "$ROOT/clients/typescript/"
  echo "Generated OpenAPI and clients"
  exit 0
fi

generate_tree "$second"
diff -ru "$first" "$second"
diff -ru "$ROOT/contracts/openapi/v1" "$first/contracts/openapi/v1"
diff -ru --exclude=.gradle --exclude=.kotlin --exclude=build \
  "$ROOT/clients/kotlin" "$first/clients/kotlin"
diff -ru --exclude=dist --exclude=node_modules \
  "$ROOT/clients/typescript" "$first/clients/typescript"

pnpm exec tsc -p "$first/clients/typescript/tsconfig.json"
pnpm exec tsc -p "$first/clients/typescript/tsconfig.esm.json"
mkdir -p "$first/clients/kotlin/src/test/kotlin/au/com/heightsafety/api/infrastructure"
cp "$ROOT/contracts/openapi/tests/kotlin/ApiClientBaseUrlTest.kt" \
  "$first/clients/kotlin/src/test/kotlin/au/com/heightsafety/api/infrastructure/"
bash "$ROOT/tools/gradle.sh" -p "$first/clients/kotlin" build --no-daemon

if bash "$ROOT/tools/openapi-diff.sh" \
  "$ROOT/contracts/openapi/fixtures/breaking/base.json" \
  "$ROOT/contracts/openapi/fixtures/breaking/revision.json" \
  --fail-on-incompatible --off; then
  echo "Expected the breaking-change fixture to fail"
  exit 1
fi

echo "contracts check passed"
