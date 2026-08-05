#!/usr/bin/env bash
# Documentation integrity checks for the docs-only repository.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
failures=0

require_file() {
  local path="$1"
  if [[ ! -f "$ROOT/$path" ]]; then
    echo "MISSING: $path"
    failures=$((failures + 1))
  fi
}

require_text() {
  local path="$1"
  local pattern="$2"
  if [[ ! -f "$ROOT/$path" ]]; then
    echo "MISSING: $path"
    failures=$((failures + 1))
    return
  fi
  if ! grep -q "$pattern" "$ROOT/$path"; then
    echo "MISSING TEXT in $path: $pattern"
    failures=$((failures + 1))
  fi
}

echo "Verifying Stage 2A.5 and canonical docs under $ROOT"

require_file "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md"
require_file "docs/discovery/sources/STAGE_2A5_SOURCE_REGISTER.md"
require_file "docs/discovery/ASSUMPTIONS_TO_VALIDATE.md"
require_file "docs/decisions/assumptions-register.md"
require_file "docs/discovery/RESEARCH_SUMMARY.md"
require_file "docs/discovery/INSPECTOR_QUESTIONS.md"
require_file "docs/requirements/FIELD_CATALOGUE.md"
require_file "docs/product/DECISION_LOG.md"
require_file "docs/product/NON_GOALS.md"
require_file "docs/roadmap/CURRENT_STATUS.md"
require_file "docs/roadmap/ROADMAP.md"

require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "MVP field cut"
require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "Do not"
require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "Never for MVP"
require_text "docs/product/DECISION_LOG.md" "D-008"
require_text "docs/roadmap/CURRENT_STATUS.md" "Stage 2B"
require_text "docs/roadmap/CURRENT_STATUS.md" "STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE"
require_text "docs/requirements/FIELD_CATALOGUE.md" "deferred candidates"
require_text "docs/discovery/ASSUMPTIONS_TO_VALIDATE.md" "Partially supported"
require_text "docs/decisions/assumptions-register.md" "../discovery/ASSUMPTIONS_TO_VALIDATE.md"
require_text "docs/product/NON_GOALS.md" "certification, compliance or standards interpretation"

# Guardrails: Stage 2A.5 must not claim product certification authority.
if grep -qiE 'product (is|provides|issues) (a )?certif|automatic compliance conclusion' \
  "$ROOT/docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md"; then
  echo "AUTHORITY RISK: Stage 2A.5 evidence doc contains unsupported certification claim language"
  failures=$((failures + 1))
fi

if [[ "$failures" -ne 0 ]]; then
  echo "verify-docs failed with $failures issue(s)"
  exit 1
fi

echo "verify-docs passed"
