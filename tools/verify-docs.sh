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

echo "Verifying Stage 2A.5/2B/2C/2D, dual-state scope and canonical docs under $ROOT"

require_file "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md"
require_file "docs/discovery/NSW_QLD_SCOPE_EXTENSION.md"
require_file "docs/discovery/sources/STAGE_2A5_SOURCE_REGISTER.md"
require_file "docs/discovery/ASSUMPTIONS_TO_VALIDATE.md"
require_file "docs/decisions/assumptions-register.md"
require_file "docs/discovery/RESEARCH_SUMMARY.md"
require_file "docs/discovery/INSPECTOR_QUESTIONS.md"
require_file "docs/requirements/FIELD_CATALOGUE.md"
require_file "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md"
require_file "docs/product/DECISION_LOG.md"
require_file "docs/product/NON_GOALS.md"
require_file "docs/roadmap/CURRENT_STATUS.md"
require_file "docs/roadmap/ROADMAP.md"
require_file "docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md"
require_file "docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md"
require_file "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md"
require_file "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md"
require_file "docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md"
require_file "docs/roadmap/STAGE_2D_03_LOCAL_BENCHMARK.json"
require_file "docs/roadmap/STAGE_2D_03_LINUX_BENCHMARK.json"
require_file "docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md"
require_file "docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md"
require_file "docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json"
require_file "docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md"

require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "MVP field cut"
require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "Do not"
require_text "docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md" "Never for MVP"
require_text "docs/product/DECISION_LOG.md" "D-008"
require_text "docs/product/DECISION_LOG.md" "D-009"
require_text "docs/product/DECISION_LOG.md" "D-010"
require_text "docs/product/DECISION_LOG.md" "D-011"
require_text "docs/product/DECISION_LOG.md" "D-012"
require_text "docs/product/DECISION_LOG.md" "D-013"
require_text "docs/product/DECISION_LOG.md" "D-014"
require_text "docs/product/DECISION_LOG.md" "D-015"
require_text "docs/product/DECISION_LOG.md" "D-016"
require_text "docs/product/DECISION_LOG.md" "D-017"
require_text "docs/product/DECISION_LOG.md" "D-018"
require_text "docs/product/DECISION_LOG.md" "D-019"
require_text "docs/product/DECISION_LOG.md" "D-020"
require_text "docs/product/DECISION_LOG.md" "D-021"
require_text "docs/product/DECISION_LOG.md" "D-022"
require_text "docs/product/DECISION_LOG.md" "D-023"
require_text "docs/architecture/OFFLINE_SYNC_SCOPE.md" "cleanup is blocked"
require_text "docs/architecture/OFFLINE_SYNC_SCOPE.md" "bounded offline-authorisation lease"
require_text "docs/discovery/NSW_QLD_SCOPE_EXTENSION.md" "New South Wales and Queensland"
require_text "docs/discovery/INSPECTOR_QUESTIONS.md" "what changes between NSW and Queensland"
require_text "docs/product/CURRENT_SCOPE.md" "New South Wales and Queensland"
require_text "docs/product/CURRENT_SCOPE.md" "Read-only future-asset preview"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" "Recorded outcome model"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" "Hard blockers"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" "Design-partner questions"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" "New South Wales and Queensland"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" "eligible inspector claims"
require_text "docs/requirements/STAGE_2B_WORKFLOW_SPEC.md" '| Released |'
require_text "docs/roadmap/CURRENT_STATUS.md" "Stage 2D"
require_text "docs/roadmap/CURRENT_STATUS.md" "STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE"
require_text "docs/roadmap/CURRENT_STATUS.md" "STAGE_2B_WORKFLOW_SPEC"
require_text "docs/requirements/FIELD_CATALOGUE.md" "deferred candidates"
require_text "docs/requirements/FIELD_CATALOGUE.md" 'NSW` or `QLD'
require_text "docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md" "versioned OpenAPI"
require_text "docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md" "S3-compatible"
require_text "docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md" "PDF/hosting feasibility gate"
require_text "docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md" "generated Kotlin and TypeScript clients"
require_text "docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md" "S3-compatible"
require_text "docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md" "Logout never silently destroys pending evidence"
require_text "docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md" "does not automate compliance"
require_text "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md" "tools/verify.sh"
require_text "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md" "generated Android API client"
require_text "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md" "apps/api/migrations/"
require_text "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md" "OpenAPI source of truth"
require_text "docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md" "runtime-pinning mechanism"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "SwaggerModule.createDocument"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "typescript-fetch"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "openapi-diff"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "distributionSha256Sum"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "Known deterministic-generation risk"
require_text "docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md" "linguist-generated=true"
require_text "docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md" "separate asynchronous worker"
require_text "docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md" "G-02 is not closed yet"
require_text "docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md" "no compliance, certification or engineering"
require_text "docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md" "STAGE_2D_03_LINUX_BENCHMARK.json"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md" "managedProviderApproved: false"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md" "require explicit authorization"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md" "every other data-bearing managed"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md" "verify-destroyed"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md" "managedProviderApproved: false"
require_text "docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md" "No cloud resource"
require_text "docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md" "KEYSTORE_KEY_MISSING"
require_text "docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md" "android-database-sqlcipher"
require_text "docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md" "fail closed"
require_text "docs/discovery/ASSUMPTIONS_TO_VALIDATE.md" "Partially supported"
require_text "docs/decisions/assumptions-register.md" "../discovery/ASSUMPTIONS_TO_VALIDATE.md"
require_text "docs/product/NON_GOALS.md" "certification, compliance or standards interpretation"

# Guardrails: Stage 2A.5 must not claim product certification authority.
if grep -qiE 'product (is|provides|issues) (a )?certif|automatic compliance conclusion' \
  "$ROOT/docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md"; then
  echo "AUTHORITY RISK: Stage 2A.5 evidence doc contains unsupported certification claim language"
  failures=$((failures + 1))
fi

if grep -qiE 'product (is|provides|issues) (a )?certif|automatic compliance conclusion' \
  "$ROOT/docs/requirements/STAGE_2B_WORKFLOW_SPEC.md"; then
  echo "AUTHORITY RISK: Stage 2B workflow contains unsupported certification claim language"
  failures=$((failures + 1))
fi

if [[ "$failures" -ne 0 ]]; then
  echo "verify-docs failed with $failures issue(s)"
  exit 1
fi

echo "verify-docs passed"
