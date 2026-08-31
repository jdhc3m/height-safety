# Current Status

Last update: 2026-08-31

## Active stage

Stage 3A — foundation implementation; `3A-01`, `3A-02` and `3A-03` are Done.
`3A-04` is in Review.
G-03 is Done as D-027.

## Completed

- Repository inspected; documentation and bounded technical-proof baseline
  confirmed.
- Broad research preserved under `docs/archive/` and marked historical.
- Product narrowed to New South Wales and Queensland installed single-point
  roof anchors using one neutral evidence workflow.
- Canonical product, discovery, requirements, architecture and roadmap docs
  created.
- Initial roles, workflow, non-goals, security minimums and technical risks
  recorded.
- AS 5532:2025 screenshot review integrated as provisional product,
  manufacturing-test, instruction and marking evidence requirements.
- Stage 2A.5 public focused-anchor evidence pass completed:
  `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md` and
  `docs/discovery/sources/STAGE_2A5_SOURCE_REGISTER.md`.
- MVP field cut recorded (D-008); standards candidates remain deferred.
- Assumptions register updated with public-evidence confidence notes.
- Stage 2B workflow specification completed:
  `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.
- Job workflow, recorded outcomes, exceptions, register reconciliation,
  dispositions, sync states and review issues separated (D-009).
- Review blockers/warnings, immutable draft-report behavior and implementation
  acceptance scenarios specified.
- NSW/Queensland public-source scope extension completed:
  `docs/discovery/NSW_QLD_SCOPE_EXTENSION.md`.
- Owner approved both initial states while deferring state-specific legal-rule
  automation (D-010).
- Read-only future-asset preview direction recorded (D-011); no second asset
  workflow is implemented.
- Hybrid release/claim/assignment workflow approved (D-012); independent
  review remains required.
- Relational/private-object/encrypted-local storage direction approved (D-013);
  provider and exact Android encryption library remain open.
- Managed invitation-only authentication approved (D-014): Administrator MFA,
  optional Inspector/Office reviewer MFA, non-destructive logout and bounded
  offline authorisation. Lease duration and revoked-account evidence recovery
  are owner-approved as D-025; G-05 remains open for design-partner review.
- Local-first, idempotent offline sync with stable photo association, visible
  conflicts and synchronisation gates approved (D-015).
- Idempotent draft-report generation from approved immutable snapshots and
  append-only reference-based audit history approved (D-016); D-018 defines the
  retention posture while concrete periods remain open.
- Native Android/NestJS/Next.js stack direction, generated OpenAPI clients,
  provider portability and joint hosting/PDF feasibility gate approved (D-017).
- Prototype retention and controlled cleanup/deletion posture approved (D-018);
  concrete partner, backup and permanent-deletion periods remain open.
- Stage 2C technical blueprint completed:
  `docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md`.
- Stage 2D risk-first execution order approved (D-019).
- Stage 2D repository workspace and quality-command contract approved (D-020):
  `docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md`.
- Stage 2D OpenAPI/runtime strategy approved (D-021), including explicit Kotlin
  fallback, deterministic-generation and generated-diff review gates.
- The bounded `2D-02` proof is implemented and locally verified: NestJS
  generates reviewed OpenAPI JSON, Kotlin and TypeScript clients compile,
  repeated generation is byte-stable, and incompatible changes are rejected.
- Pinned GitHub CI now runs the root verification command and compares pull
  request contracts with the base branch. Generated clients are marked for
  collapsed GitHub presentation without being ignored.
- `2D-02` passed independent API/Android review after exact Temurin vendor
  validation, immutable GitHub Action pins and an Android absolute-base-URL
  integration test were added.
- The local `2D-03` PDF harness passed its fictional 30-anchor, 60-photo load,
  deterministic regeneration, font, termination cleanup, retry, memory,
  duration, concurrency and output-size checks.
- `2D-03` passed independent technical re-review after lease fencing, bounded
  launch/shutdown and deadline-under-contention regressions were added.
- The owner approved the `2D-03` separate asynchronous renderer worker at
  initial concurrency one (D-022); provider and production sizing remain open.
- `2D-03` then passed three corrected 2-vCPU/2-GiB Linux runs and four corrected
  4-vCPU/4-GiB Linux runs, plus repeatable whole-container termination and
  fresh-worker recovery. Every engineering acceptance check passed.
- The Linux evidence supports the approved separate worker at initial
  concurrency one; it does not select a managed provider or production size.
- A root-gate revalidation exposed and corrected an existing synchronous SQLite
  busy-wait overshoot in the `2D-03` harness without relaxing its absolute
  deadline. Three focused PDF checks and the complete root gate then passed;
  independent correction review confirmed the bounded repair.
- The bounded `2D-05` SQLCipher/Room and Android Keystore proof passes
  compile/lint/dependency checks and fourteen API 31 device tests covering
  ciphertext, restart, schema migration, missing/corrupt key material, typed
  provider failure, the Room 2.x read-transaction seam, missing initialized
  database state, concurrent first open, interrupted empty-store initialization
  and fail-closed preservation.
- `2D-05` passed its earlier independent correction cycle and a fresh 2026-08-16
  closure correction/re-review after provider-failure typing, fictional test
  cleanup, architecture consistency and logging-claim findings were fixed.
  A later independent audit also corrected missing-database recreation and a
  concurrent first-open race, authenticated state evaluation and missing or
  empty primary-database handling; twelve device tests, both local gates and a
  final fresh re-review passed.
  A follow-up audit found that interrupted envelope installation could strand
  an otherwise empty store after the Keystore alias was created. The correction
  reuses that alias only when no database or envelope evidence exists; the
  scoped gate, thirteen API 31 tests and root gate passed, and a fresh re-review
  found no implementation, security, concurrency, typing or regression issue.
  G-04 is closed; authorised evidence recovery is owner-approved as D-025.
  G-05 remains open for design-partner review before a controlled pilot.
- `2D-04` is Done. The authorised Sydney Cloud Run candidate was exercised
  and destroyed, independently reviewed, and owner-approved as the first
  managed renderer candidate (D-024). G-02 is closed. Authentication vendor
  selection remains deferred. The spike evidence JSON still records
  `managedProviderApproved: false`.
- `2D-06` is Done. The offline-authorisation lease and revoked-account
  evidence-recovery specification and transition tests are owner-approved as
  D-025. Independent review passed. G-05 remains open for design-partner
  review before a controlled pilot.
- D-026 accepted: product Android field domain will be a Kotlin/JVM module
  with Android/Room/OpenAPI kept in adapters; Kotlin Multiplatform and iOS
  remain deferred. Constraints:
  `docs/architecture/ANDROID_DOMAIN_BOUNDARY.md`.
- `3A-01` scaffolded the Android product build (`:app` plus Kotlin/JVM
  `:domain`), NestJS API workspace commands and a minimal Next.js office
  workspace. The scaffold contains no customer data or feature workflow.
- `3A-01` passed the root `tools/verify.sh` gate and independent review found no
  actionable correctness issues. The reviewer’s direct Android Gradle run was
  environment-blocked by sandbox socket permissions; the approved root gate
  supplied the Android validation.
- G-03 evidence is prepared without cloud mutation: first-party Australian
  provider research, a disposable PostgreSQL 17 schema execution, a tested
  application-owned private object-storage boundary, and deterministic
  fictional backup/export restore checks. The owner approved the gate as D-027;
  production provider, native backup configuration, retention/RPO/RTO and
  strict backup/log/subprocessor residency remain open. See
  `docs/roadmap/G-03_PROVIDER_PORTABILITY.md`.
- `3A-02` adds the company-scoped PostgreSQL migration set, composite tenant
  keys, private object-reference/report/photo metadata, idempotency constraints,
  transaction-local tenant context binding and forced row-level policies. The
  PostgreSQL integration test rejects cross-company reads/writes and missing
  context; relationship, role-privilege, immutability and portability checks
  also pass. Independent review found and fixed actionable issues; `3A-02` is
  Done.
- `3A-03` adds a provider-neutral invitation and application-session boundary:
  verified-email identities, Administrator MFA enforcement, optional
  Inspector/Office reviewer MFA, current-membership role checks, one-time
  invitation digests, short-lived opaque session digests, revocation and
  audit-event emission hooks. Invitation/session tables use the existing
  company-scoped RLS boundary; focused policy tests, generated API clients and
  the live PostgreSQL cross-company checks pass. The identity-provider and
  durable application persistence adapters remain deliberately unconfigured
  while vendor selection is deferred.

## In progress

- `3A-04` site, jurisdiction and anchor-register API boundary is implemented in
  the current worktree and awaiting independent review. It covers company-
  scoped client, site and single-point anchor register operations, explicit
  `NSW`/`QLD` context, manager-role checks, audit-event hooks and fail-closed
  HTTP handling. The runtime persistence and durable audit adapters remain
  deliberately unconfigured.
- Production provider selection, runtime deployment-role configuration and later
  feature APIs remain separate work from the completed `3A-02` boundary.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

Complete independent review of `3A-04`, then start `3A-05` job release, claim and
assignment. Do not add Kotlin Multiplatform, an iOS target or deferred standards
candidates. Authentication vendor selection and the durable identity/runtime
adapters remain deferred.
Production provider/native backup configuration, retention/RPO/RTO and strict
backup/log/subprocessor residency remain open. G-05 still needs design-partner
review before a controlled pilot.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- The `3A-02` product schema and tenant-isolation boundary plus the bounded
  `3A-03` auth policy/session contract are implemented; `3A-04` has a bounded
  API contract in Review, while its durable store/audit adapters and production
  runtime-role deployment remain later work.
- Offline-authorisation lease duration and recovery of unsynchronised evidence
  after account revocation are owner-approved as D-025. G-05 still requires
  design-partner review before a controlled pilot.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- NSW and Queensland workflow, terminology, licensing, interval, proof-test and
  report-authority differences require practitioner validation in each state;
  the product must not auto-calculate or claim statutory compliance.
- Production provider/native backup configuration, retention/RPO/RTO and
  strict backup/log/subprocessor residency remain open after G-03. The
  tenant-isolation API integration, object-storage integration, backup
  scheduling and export workflow remain implementation work in later tickets.
  Authentication vendor selection remains deferred. Authorised Android
  key-loss/revocation recovery is owner-approved as D-025; G-05 remains open
  for design-partner review. Production autoscaling and queue/storage
  integration remain implementation work after 3A. The Playwright/Chromium
  worker (D-022) and Cloud Run first managed renderer candidate (D-024) are
  approved.

## Tests and commands

Verified root command: `tools/verify.sh`. On 2026-08-10 the documentation,
OpenAPI lint, repeated byte-stable generation, committed drift, TypeScript
compile, Kotlin/Gradle build, controlled incompatible-change fixture and
`git diff --check` all passed locally. The Android absolute-base-URL integration
test also passed, and an independent uncommitted-diff review reported no
actionable correctness issues. The `2D-03` static PDF checks and full local
benchmark passed, including a `SIGTERM` after temporary-PDF creation, clean
takeover by an observably waiting retry, enforced timeout cleanup,
completed-result reuse and byte-identical fresh regeneration. Eighteen consecutive
corrected benchmark repetitions passed; one prior transient timeout remains a
sizing warning. The constrained Linux candidate then passed seven corrected
profile runs and a whole-container stop/recovery test. The `2D-04` local
guarded candidate check, authorised managed cycle, destroy inventory and
evidence gate pass; owner approval is D-024 while the spike JSON still
records `managedProviderApproved: false`. The `2D-05`
compile/lint/dependency gate and fourteen API 31 Android instrumentation tests pass;
the corrected suite also rejects a missing initialized database and
proves authenticated state handling, interrupted empty-store recovery,
serialized concurrent first open and the pinned Room 2.x read-transaction seam.
Permanent Keystore-key loss deliberately locks and preserves ciphertext rather
than claiming recovery or resetting evidence. A fresh independent correction
review of `2D-05` reported no actionable findings. The `2D-06` lease/recovery
machine passes its transition checks for expiry, revocation, pending
outbox/media and authorised upload-only recovery; independent re-review
reported no findings and the owner approved D-025. `3A-01` adds product Android,
web and domain checks; feature test suites remain deferred to their tickets. The
`3A-02`/`3A-03` static migration checks, live PostgreSQL 17 cross-tenant
read/write test, focused auth tests, API type-check and generated contract
checks passed on 2026-08-25. The complete `tools/verify.sh` gate also passed
against disposable PostgreSQL 17 on 2026-08-25. The root test gate requires
`TEST_POSTGRES_URL` for a disposable PostgreSQL database and explicit
`TEST_POSTGRES_ALLOW_MIGRATION=1`, plus `HEIGHT_SAFETY_POSTGRES_URL` for the
live portability schema check; the CI workflow provisions PostgreSQL 17.

On 2026-08-31, the `3A-04` API build and full root gate passed with thirteen
API tests, including the live PostgreSQL tenant-isolation test. Web tests and
build, formatting, API type-checking, deterministic OpenAPI/TypeScript/Kotlin
contract checks, provider portability, PDF, offline-lease, encrypted-storage
and Android build/lint checks also passed. The PostgreSQL instance used for
the gate was disposable and has been stopped.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`; `docs/adr/`.

Stage 2A.5: `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.
NSW/Queensland extension: `docs/discovery/NSW_QLD_SCOPE_EXTENSION.md`.
Stage 2B: `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.
Stage 2C: `docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md`.
Stage 2D: `docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md`.
Stage 2D-01: `docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md`.
Stage 2D-02: `docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md`.
Stage 2D-03: `docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md`.
Stage 2D-04: `docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md`.
Stage 2D-04 comparison: `docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md`.
Stage 2D-04 managed evidence: `docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json`.
Stage 2D-05: `docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md`.
Stage 2D-06: `docs/roadmap/STAGE_2D_06_OFFLINE_LEASE_RECOVERY.md`.
Stage 3A-02 migrations: `apps/api/migrations/` and
`apps/api/test/tenant-schema.test.mjs`.
Stage 3A-03 identity boundary: `apps/api/src/identity/`,
`apps/api/migrations/002_identity_auth_schema.sql` and
`apps/api/test/auth.test.mjs`.
Android field domain boundary (D-026): `docs/architecture/ANDROID_DOMAIN_BOUNDARY.md`.
ADR: `docs/adr/0001-kmp-ready-android-domain.md`.
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
