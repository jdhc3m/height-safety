#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"

if [[ "$mode" != "--check" ]]; then
  echo "Usage: tools/format.sh --check"
  exit 1
fi

git -C "$ROOT" diff --check

while IFS= read -r -d '' markdown_file; do
  if grep -nE '[[:blank:]]+$' "$markdown_file"; then
    echo "documentation formatting failure: trailing whitespace in $markdown_file"
    exit 1
  fi
  fence_count="$(grep -cE '^[[:space:]]*```' "$markdown_file" || true)"
  if (( fence_count % 2 != 0 )); then
    echo "documentation formatting failure: unclosed code fence in $markdown_file"
    exit 1
  fi
done < <(
  find "$ROOT/docs" -type f -name '*.md' -print0
  printf '%s\0%s\0' "$ROOT/AGENTS.md" "$ROOT/DECISION_LOG.md"
)

pnpm --dir "$ROOT" exec prettier --check \
  'package.json' 'pnpm-workspace.yaml' '.prettierrc.json' \
  'apps/api/**/*.{ts,mjs,json}' \
  'apps/web/**/*.{ts,tsx,mjs,json,css}' \
  'docs/adr/**/*.md' \
  'docs/architecture/ANDROID_DOMAIN_BOUNDARY.md' \
  'docs/architecture/ANDROID_SKILLS_GUIDELINE.md'

echo "format check passed"
