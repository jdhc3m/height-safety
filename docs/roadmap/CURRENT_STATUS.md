# Current Status

Last update: 2026-10-09

## Active stage

Stage 3D — office review and reporting continuation; `3A-01` through `3A-05`
are Done.
`3B-01`, `3B-02`, the bounded local-capture acceptance for `3B-03` and
`3B-04` bounded local review/queue slice are Done. `3C-01` durable mutation
outbox implementation is in review and now has a tenant-bound PostgreSQL
mutation store with atomic payload persistence and replay. `3C-02` durable
photo upload queue is implemented for its bounded local/provider-neutral slice
and now has an authenticated resumable API transport backed by private local
objects for the development runtime. `3C-03` bounded
acknowledgement/conflict protocol continuation is implemented for payload-aware
service tests, encrypted-local payload reconstruction and a company-scoped
authenticated worker seam; the local runtime now persists inspection evidence,
mutation identity and photo metadata in one transaction.
`3C-04` initial Kotlin/JVM offline-authorisation state-machine slice and its
bounded encrypted Android state adapter are implemented. The continuation adds
encrypted opaque-session persistence, server revalidation on process recovery,
foreground lifecycle locking, explicit server-revocation UI and bounded
Administrator recovery UI. Auth0 AU is now the selected provider and its
bounded API, Android and office-web boundaries are wired. The API's local
Auth0 membership and opaque-session store now use PostgreSQL with the forced
tenant boundary. Session renewal and `/auth/me` revalidation, application
invitation delivery and authenticated inspector photo upload are wired behind
explicit runtime configuration. The local PostgreSQL runtime smoke passes;
production database, provider endpoint, recovery upload and cloud deployment
configuration remain open.
Under D-046, the existing owner-configured US-5 tenant is accepted for
synthetic/local development and physical verification only. The physical
verification record therefore does not satisfy AU production locality. When a
real client or controlled pilot is proposed, the owner must revisit Auth0 plan,
contract, subprocessors, export/recovery and locality terms and, if AU remains
required, consider the needed plan capacity plus an owner-approved new-AU-
tenant migration/reconfiguration before real client data is accepted.
G-03 is Done as D-027.

`3D-01` now has a bounded provider-neutral review producer in review. Office
reviewers and Administrators can create blocker, warning, conflict or change
issues against a submitted inspection/anchor context, resolve them with a
reason, and read append-only actions. The PostgreSQL adapter writes the issue,
review action and generic audit event in one tenant-bound transaction. The
connected office web can read issue records for an explicit inspection ID and
submit reasoned resolve, change-request and approval actions through server-side
actions; the API remains authoritative for role and tenant checks. There is not
yet a submitted-inspection queue, submission-evidence view or authenticated
office photo viewer. Change requests move the mutable job workflow pointer to
`changes_requested` without mutating the submitted inspection; the next sync
submission against the same pack receives a new server-assigned inspection
revision, serialized per company/job (D-048).

`3D-02` is now in progress with a bounded provider-neutral approved-snapshot
freeze boundary. The slice preserves the exact inspection/evidence revision,
checks review gates, records the supported jurisdiction as context, emits an
approval audit event and has a PostgreSQL adapter port/proof with
company-scoped approval uniqueness, tenant-context setup and checksum-checked
round trips. Configured PostgreSQL approval now writes the snapshot and
`inspection.snapshot_approved` audit event in one tenant-bound transaction;
retries still return the original snapshot. A new authoritative approval path
reads the durable submitted inspection revision, its open
blocker/change-request counts, the synchronised payload (JSON text, parsed by
the adapter rather than cast in SQL) and pending photo uploads from
persistence instead of caller-supplied gate counts, and the same transaction
moves the mutable job workflow pointer to `approved_for_report_generation`
without mutating the submitted inspection. The job transition is guarded on
the approved row still being the latest submitted revision for the job and
runs under the D-048 per-company/job revision lock. Review issue creation and
resolution use that same lock, and approval rechecks the exact frozen review
history and hard gates in its write transaction, so intervening review changes
roll the approval back. A stale revision or a store that cannot move the pointer
also rolls the approval back. Approval identity is derived from the
server-assigned inspection revision (D-048), so each resubmission requires its
own approval. The per-inspection approval action is connected; queue discovery
and a full submitted-evidence/photo review surface remain open.

`3D-03` has a bounded local report-generation API/worker implementation in
review. Generation is idempotent per company, approved snapshot and template;
enqueue and completion are recorded as append-only audit events. Retryable
jobs retain their revision reservation, and a lower-numbered revision that
finishes late is retained as superseded. Migration `006` adds the tenant-scoped
queue and reservation constraint. One 60-second deadline covers snapshot/photo
preparation and PDF rendering, with timed-out browser work closed before its
lease can be released. The local filesystem object adapter is selected only
for explicit development or test mode; unset/other modes use an unavailable
adapter, and production fails closed until a durable private adapter is
provided. Submission acknowledgement time is not recorded as inspection start
time, so reports show the start as not recorded unless a trusted start value
exists. The office web now carries the approved snapshot ID into an explicit
draft-generation request, reads generation status and serves the completed PDF
through an authenticated, server-side download route. This continuation is
local/synthetic only. Cloud Tasks, Cloud Storage and production deployment
remain open operational work.

D-051 records the synthetic-only retention baseline: no automatic deletion of
server evidence/reports/audit history, audited synthetic-tenant reset after a
verified tenant export, and a 30-day cap for persistent synthetic development
backups. G-06 remains open for real customer data; no real-data retention period
is inferred or approved.

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
  GCP is the bounded-pilot target in D-041, while native Cloud SQL/Cloud
  Storage configuration and the exact Android encryption library remain open.
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
  initial concurrency one (D-022); production sizing and native target-service
  configuration remain open.
- `2D-03` then passed three corrected 2-vCPU/2-GiB Linux runs and four corrected
  4-vCPU/4-GiB Linux runs, plus repeatable whole-container termination and
  fresh-worker recovery. Every engineering acceptance check passed.
- The Linux evidence supports the approved separate worker at initial
  concurrency one; it does not by itself select a managed provider or
  production size. D-041 later records GCP Sydney as the bounded-pilot target.
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
  managed renderer candidate (D-024). G-02 is closed. D-041 now points the
  bounded pilot at GCP Sydney for Cloud Run, Cloud SQL, Cloud Storage and Cloud
  Tasks; authentication vendor selection remains deferred. The spike evidence
  JSON still records `managedProviderApproved: false` because it is a historical
  renderer-candidate artifact.
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
  D-041 selects GCP Sydney as the bounded-pilot target, while native Cloud
  SQL/Cloud Storage backup configuration, retention/RPO/RTO and strict
  backup/log/subprocessor residency remain open. See
  `docs/roadmap/G-03_PROVIDER_PORTABILITY.md`.
- D-042 records the owner-selected Auth0 AU identity provider. The API verifies
  Auth0 access tokens before the existing company membership and opaque-session
  checks; Android uses Universal Login with encrypted provider-credential
  storage; and the office web exposes a protected `/office` boundary. Tenant
  creation, secret configuration, production database deployment and invitation
  provider endpoint provisioning remain open. A local PostgreSQL
  membership/session adapter is implemented for this runtime slice. See
  `docs/research/AUTH0_SETUP.md`.
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
  durable application persistence adapters were deliberately unconfigured at
  this milestone; the local Auth0/PostgreSQL runtime continuation is recorded
  above.
- `3A-04` adds the company-scoped site, supported-jurisdiction and
  single-point anchor-register API boundary. It preserves explicit `NSW` or
  `QLD` context, manager-only writes, audit metadata, fail-closed HTTP errors,
  versioned runtime mounting and generated Kotlin/TypeScript clients. Durable
  store and audit adapters were deliberately unconfigured at this milestone;
  the local PostgreSQL continuation is recorded above.
- `3A-04` passed independent review after malformed-body handling, unknown
  failure fallbacks, update DTO optionality and changed-field audit metadata
  were corrected. Runtime smoke coverage confirms `/api/v1` matches the
  generated contract.
- `3A-05` adds the bounded job workflow boundary: draft creation from a
  company-scoped site, release, active same-company inspector assignment or
  claim, explicit job-pack version and jurisdiction retention, role checks,
  current-assignment conflict visibility and one-primary assignment semantics.
  The store and audit ports were deliberately unconfigured for runtime use at
  this milestone; the in-memory proof exercises the atomic operation and race
  behavior, and the local PostgreSQL continuation is recorded above.
- `3A-05` passed fresh independent review. Service and controller tests cover
  tenant isolation, role boundaries, valid dates, malformed input, claim
  replay, competing claims, assignment eligibility and HTTP error mapping.
- `3B-01` adds a provider-neutral Android sign-in/session boundary, generated
  OpenAPI session and authorised-job adapters, inspector-only tenant filtering,
  explicit jurisdiction/status/assignment/job-pack-version display, and
  loading, synchronising, synchronised, failed and empty states. Opaque
  application sessions remain memory-only in this bounded slice; authentication
  vendor selection and durable session storage remain open.
- `3B-01` adds JVM tests for authorised visibility, cross-company hiding,
  unauthorised-job denial, role/tenant checks, session expiry, sign-out,
  adapter mapping and sync/error/empty states, plus Compose instrumented UI
  coverage and state-restoration coverage.
- `3B-02` adds an inspector-only versioned job-pack API response containing the
  authorised release-time job/site/expected-anchor snapshot, generated client
  mapping, Kotlin/JVM pack/lease validation, and a company-plus-job keyed
  encrypted Room/SQLCipher Android adapter protected by Keystore key material.
- `3B-02` adds device-credential confirmation before app access, restart-safe
  pack replacement, tenant-isolated local keys, wall-clock/elapsed-runtime/
  rollback lease locks that preserve local evidence, and read-only pack UI
  states. Independent review passed after the release-time snapshot correction.
- `3B-03` is complete for its bounded local-capture acceptance. The Android
  field flow records and reopens expected-anchor evidence and explicit newly
  discovered provisional records without silently removing expected register
  coverage. Domain validation covers outcomes, exceptions, identity/location,
  reconciliation, dispositions, observations, recommendations, optional
  proof-test fields and photo association; encrypted local drafts survive
  restart and CameraX stores durable app-private JPEG evidence with a checksum.
  Submission, upload/retry and synchronisation remain separate `3B-04`/`3C`
  work.
- `3B-04` is Done for the bounded local review/queue slice. It separates hard
  capture/coverage blockers from office-review warnings, preserves explicit NSW
  or Queensland context, and queues a durable local inspection-submission
  intent with stable IDs. The encrypted Room transaction freezes the local
  evidence revision and keeps photograph associations. Fresh independent
  review found no actionable issue after submission-lock and duplicate-coverage
  corrections. The UI states that server submission is not confirmed; upload,
  retry, acknowledgement, conflict handling and background draining remain
  `3C` work.
- `3C-01` implementation slice adds domain-owned mutation identity and state
  transitions, durable encrypted Room outbox persistence with a version-4 to
  version-5 migration, visible submission/evidence state mirroring and a
  WorkManager-connected drain seam. Retry, restart, duplicate-enqueue and
  conflict behavior are covered; server transport is deliberately unconfigured
  until the API sync contract is implemented.
- `3C-02` adds stable media IDs, an encrypted Room photo-upload queue with a
  version-5 to version-6 migration, durable byte offsets/attempts/failures,
  restart recovery, private no-backup content reads, provider-neutral chunk
  delivery and network-constrained WorkManager scheduling. Queue rows require
  their evidence-photo parent, and pending/uploaded/failed states remain
  visible without claiming server acknowledgement; provider/server transport,
  conflict handling and cleanup remain open.
- `3C-03` bounded continuation adds an optional normalized inspection payload,
  explicit `payloadApplied` response state and an in-memory payload-applier
  proof. Android reconstructs the frozen payload from encrypted Room evidence,
  maps it through generated OpenAPI DTOs and supplies a bearer token only from
  the active process-memory session to a company-scoped WorkManager drain.
  Missing/expired session or missing frozen payload remains a visible local
  failure; the API runtime persistence/applier and photo media transport are
  deliberately unconfigured.
- `3C-04` starts with a Kotlin/JVM product-domain state machine for the
  D-025 capture lease, elapsed-runtime and clock-rollback locks, separate
  server/device account state, device authentication, same-company
  Administrator upload-only recovery, evidence-preserving logout/cleanup gates
  and permanent Keystore-loss failure. The slice emits domain audit events and
  has transition coverage without Android or persistence dependencies.
  The continuation adds encrypted Room session persistence, server-authoritative
  `/auth/me` revalidation, lifecycle lock/unlock handling, evidence-preserving
  server-revocation visibility and a provider-neutral Administrator recovery UI.
  Auth0 AU provider adapters now cover API JWT verification, Android Universal
  Login/secure credentials and the protected office-web boundary. Invitation
  delivery and recovery upload transport remain separate work.

## In progress

- Design-system icon source set (`T2a`, issue #35) is drafted for owner
  review: all 39 glyphs listed in `design/DESIGN.md` §9 (17 navigation/object,
  9 action and 13 status icons) are authored as SVG sources under
  `design/icons/` on a documented 24px-grid, 2px-keyline convention with
  `base/detail/mark/accent` path roles. Tile and free-glyph SVG variants and a
  self-contained light/dark contact sheet are derived from the sources by
  `tools/design-icons/generate.mjs`, with hue pairs read from
  `design/tokens.json` and drift, completeness and rule checks gated by
  `tools/design-icons.sh --check` in the root verify command. No Android
  ImageVector, web sprite or screen call-site change is included: that
  generation work stays with `T2b` (issue #66) until the owner approves this
  source set, so this ticket changes no app code and adds no runtime
  behavior. Emulator instrumented coverage for icon rendering belongs to the
  code-generation ticket.
- Design-system theme core (`T1`, issue #34) is implemented for the Android
  field app: light and dark Material 3 color schemes, field typography
  minimums (`bodyLarge` 16sp, `titleLarge` 22sp) and shapes now derive from the
  generated `DesignTokens` (brand seed `#1D7AFC`), with the old Signal Field
  theme kept only as a compatibility entry point. Roborazzi light/dark theme
  baselines are committed and gated through
  `tools/android-theme.sh --check` in the root verify command. Screens, icons
  and navigation remain separate design-system tickets.
- `3C-01` is in review: durable idempotent mutation outbox and background
  drain seam are implemented, and the local API now commits mutation envelopes,
  inspection evidence and replayable acknowledgements atomically. Production
  deployment and fault-injection review remain open.
- `3C-02` bounded implementation is complete for the local/provider-neutral
  queue slice. The API has a tenant-bound resumable photo endpoint and private
  development object store; provider-backed production storage and recovery
  operations remain open.
- `3C-03` bounded protocol work is implemented: the API and generated clients
  define stable mutation/idempotency identity, expected-version acknowledgement,
  visible conflict responses with replay behavior and optional inspection
  payload application reporting. The Android adapter maps responses into the
  durable outbox, reconstructs frozen evidence, and uses a process-memory
  authenticated, company-scoped worker seam. The local review gate still
  requires server acknowledgement plus every recorded photo upload. Local
  runtime mutation and photo persistence now pass replay/checksum smoke checks.
- `3C-04` initial domain implementation and the bounded Android adapter are
  implemented. Product transitions are tested for lease expiry, elapsed-runtime
  expiry, clock rollback, revocation notification, unnotified revocation,
  device lock, recovery expiry, same-company Administrator upload-only recovery,
  logout/cleanup gates and Keystore-loss evidence preservation. Encrypted Room
  state and the opaque application session survive restart; `/auth/me`
  revalidation, lifecycle lock/unlock, explicit server revocation visibility and
  recovery UI are wired. Auth0 provider adapters cover API JWT verification,
  Android Universal Login/secure credentials and the protected office-web
  boundary. Session renewal and `/auth/me` revalidation are wired, and
  invitation delivery is an application-owned fail-closed HTTP adapter; the
  owner must still configure its provider endpoint and Administrator recovery
  upload remains a production gate.
- `3D-02` approved-snapshot work is in progress: the API service and in-memory
  proof freeze a tenant-scoped inspection submission with source inspection
  and evidence versions, canonical JSON and SHA-256 provenance, and no update
  or delete operation. A provider-neutral PostgreSQL adapter port/proof now
  applies transaction-local tenant context, persists the approval identity,
  maps uniqueness conflicts for replay and rejects checksum/document mismatch.
  The authoritative `createApproved` path now reads the submitted revision,
  review-issue counts, synchronised payload and pending photo uploads from
  durable state in one tenant-bound transaction, and the approval commit
  writes the snapshot, audit event and `approved_for_report_generation` job
  pointer atomically, guarded so a stale revision or a store without the job
  transition capability fails closed. Review writes and approval share the
  D-048 company/job lock; approval rechecks frozen review history and hard gates
  before inserting the snapshot. The reader parses the `request_body` JSON text
  in the adapter instead of using a JSON operator on the text column. The
  per-inspection approval action is connected; queue discovery and the
  submitted-evidence/photo review surface remain open.
- `3D-03` report-generation API and sequential worker are in implementation
  review. Approved snapshots and associated photos are rechecked before render;
  request identity includes the frozen snapshot and template version. One
  deadline spans snapshot/photo preparation and browser rendering. The PDF
  download contract and generated Kotlin/TypeScript clients describe binary
  bytes. Direct API tests and the live PostgreSQL migration/RLS integration
  pass. Local file storage is
  development/test-only, not the pilot object storage adapter.
- Scoped `3B-04` JVM, lint, Compose and encrypted-storage checks pass; an API 30
  emulator passes 15 app and 11 data instrumented tests. Runtime persistence,
  durable audit, identity membership, pack-update/sync/recovery workflows and
  production deployment adapters remain deliberately unconfigured and are
  separate work.
- GCP runtime deployment-role configuration, native Cloud SQL/Cloud Storage
  adapters and later feature APIs remain separate work from the completed
  `3A-02` boundary.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

The `3D-03` API/worker implementation and generated API contract pass the root
gate against disposable PostgreSQL, including migration `006` tenant isolation
and reserved-revision constraints. The office web now connects approval to
draft generation, status refresh and authenticated PDF download. Next, add the
company-scoped submitted-inspection queue and read-only evidence/photo detail
surface so reviewers can locate and inspect submitted records before acting.
Keep this work synthetic/local. The local report object store is
development/test-only. Production Cloud SQL, private Cloud Storage, Cloud Tasks,
worker concurrency configuration and Administrator recovery verification
remain operational gates. The local `3C` runtime integration is implemented
and smoke-tested, but remains a development adapter until those operational
gates close. Do not treat bounded protocol, payload-applier, process-memory
worker or domain state-machine slices as production synchronisation.
Do not add Kotlin
Multiplatform, an iOS target or deferred standards candidates. Auth0 tenant
setup and production identity/runtime deployment remain open. The US-5 tenant
is development-only; the client/pilot trigger for an Auth0 plan review and,
if still required, AU-tenant migration/reconfiguration is recorded in D-046.
GCP runtime deployment configuration, native Cloud SQL/Cloud Storage backup and
export configuration, retention/RPO/RTO and strict backup/log/subprocessor
residency remain open. G-05 still needs design-partner review before a
controlled pilot.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- The `3A-02` product schema and tenant-isolation boundary, bounded `3A-03`
  auth policy/session contract, `3A-04` register API and `3A-05` job workflow
  contract are implemented; `3B-01` and `3B-02` are Done; durable store/audit adapters
  and production runtime-role deployment remain later work.
- Offline-authorisation lease duration and recovery of unsynchronised evidence
  after account revocation are owner-approved as D-025. G-05 still requires
  design-partner review before a controlled pilot.
- D-051 applies only to synthetic/local development. G-06 still requires owner
  plus legal/privacy review of real-data terms, export, backup/deletion periods
  and authorised audited cleanup before any real customer data.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- NSW and Queensland workflow, terminology, licensing, interval, proof-test and
  report-authority differences require practitioner validation in each state;
  the product must not auto-calculate or claim statutory compliance.
- GCP runtime/native backup configuration, retention/RPO/RTO and strict
  backup/log/subprocessor residency remain open after G-03 and D-041. The
  tenant-isolation API integration, object-storage integration, backup
  scheduling and export workflow remain implementation work in later tickets.
  Auth0 tenant setup and native runtime configuration remain open. Authorised
  Android key-loss/revocation recovery is owner-approved as D-025; G-05 remains
  open
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

On 2026-09-01, the corrected `3A-04`/`3A-05` API suite passed 22 tests,
including runtime `/api/v1` smoke coverage and the live PostgreSQL
tenant-isolation test. The full `tools/verify.sh` gate passed with disposable
PostgreSQL 17, generated contract checks, web build, PDF/provider/offline
checks and Android build/lint checks. Fresh independent review passed after
the corrections; the disposable PostgreSQL container was stopped.

On 2026-09-01, the `3B-01` domain and Android JVM suites passed, generated
client adapter tests passed, and the Compose instrumented test source compiled.

On 2026-09-02, the `3B-02` API suite/build and generated contract checks passed;
the Kotlin/JVM domain and Android app tests passed; the data adapter compiled;
the versioned Room schema check passed; three encrypted job-pack adapter tests
passed on `Pixel_5_API_30` (API 30); and seven Compose instrumented app tests
passed on the same emulator. The bounded Android job-pack check is available
through `tools/android-job-pack.sh`.
Fresh independent re-review after the release-time snapshot correction returned
no issues. The full `tools/verify.sh` root gate stopped at its required
`TEST_POSTGRES_URL` prerequisite in this environment; the scoped checks above
passed. Connected UI execution passed 7/7 tests on the local
`Pixel_5_API_30` emulator (API 30).

The first `3B-03` slice then passed the Kotlin/JVM domain and app suites, Room
schema drift checking, six encrypted evidence-adapter tests and eight Compose
instrumented app tests on the same emulator. A pack-refresh regression also
confirmed evidence from the prior pack version remains readable.

On 2026-09-03, a debug-build-only interactive demo activity was added for
physical-device review. It uses synthetic NSW and Queensland jobs with the
real encrypted local job-pack and anchor-evidence path; it does not call the
API or alter release authentication behavior.
Manual physical-device review was reported passed on the Pixel 10 Pro,
including opening the demo job and reaching the anchor-capture flow.

On 2026-09-04, the `3B-04` Kotlin/JVM domain and Android app unit suites,
Android data/app compilation and lint, Room schema drift check, eleven
encrypted data instrumented tests and fifteen Compose app instrumented tests
passed on the `Pixel_5_API_30` emulator. The checks cover blocker/warning
separation, local queue readiness, stable replay, immutable queued evidence,
restart-safe encrypted submission intent and photograph association. Server
submission and synchronisation were not claimed or exercised.

The first `3C-01` slice then passed the domain and app unit suites, Room schema
drift/build/lint checks, the full root gate against disposable PostgreSQL 17,
12 encrypted data instrumented tests and 15 Compose app instrumented tests on
`Pixel_5_API_31` (API 31). The tests cover stable mutation identity,
duplicate enqueue, retry, interrupted-work recovery, visible failed/conflict
states, migration and submission/evidence state mirroring. No server
acknowledgement or production sync transport is claimed.

On 2026-09-04, the bounded `3C-02` slice passed the Kotlin/JVM domain and app
unit suites, Android data/app compilation, Room schema drift/build/lint checks,
fourteen encrypted data instrumented tests and fifteen Compose app instrumented
tests on `Pixel_5_API_31` (API 31). The tests cover stable media identity,
resumable chunk retry, completion checksum verification, permanent-failure
visibility, interrupted-work recovery, private-content reads, migration and
evidence-photo cascade cleanup. The repository root gate stopped at its
required `TEST_POSTGRES_URL` prerequisite in this environment; scoped gates
passed. Server upload, acknowledgement, conflict handling and production
transport are not claimed.

On 2026-09-05, the API build and suite passed 31 tests with one expected
PostgreSQL integration skip, and deterministic OpenAPI/client generation passed
with the payload-aware synchronisation schemas. The Kotlin/JVM domain suite
passed. Android data/app compilation was environment-blocked because no local
Android SDK is configured; no Android runtime or production synchronisation
claim is made.

On 2026-09-06, the Kotlin/JVM domain suite passed 60 tests with the initial
`3C-04` offline-authorisation state-machine coverage. On 2026-09-07, the
encrypted Room state adapter, Android capture/logout/worker gates and restart
coverage were added. The session continuation then passed the Kotlin/JVM and
Android app unit suites, encrypted data/app restart coverage and 18 data plus
16 app instrumented tests on `Pixel_5_API_31` (API 31). Authentication-provider
selection, authenticated recovery/upload transport and production runtime
persistence remain unconfigured.

On 2026-09-09, the API build and 44-test API suite passed with the approved
snapshot service and PostgreSQL adapter proof included. The PostgreSQL
integration test remained skipped because this scoped run had no disposable
`TEST_POSTGRES_URL`; runtime snapshot persistence is not claimed.

On 2026-09-15, the API build and 59-test suite passed (including the review
producer/adapter, atomic approved-snapshot, server-assigned resubmission
revision tests and the live PostgreSQL tenant-isolation migration check). A
local PostgreSQL 17 runtime
smoke passed `/auth/me`, session renewal, authorised job listing, a versioned
QLD job-pack read, one atomic inspection mutation, identical replay and a
resumable photo upload whose database state and private-object SHA-256 matched.
The complete `tools/verify.sh` gate then passed against the local PostgreSQL 17
instance, including the live tenant-isolation migration check and Android
storage/job-pack checks.
The new `005_review_history_runtime.sql` migration was applied to the local
runtime and confirms that the application role can only change review issue
status/resolution time; review action rows and issue content remain protected.
The Android JVM/app/data suites passed after tenant-scoping the authenticated
photo queue. A rebuilt debug APK installed and launched on the physical Pixel
10 Pro; the sign-in screen rendered. The prior Auth0 provider login remains
recorded in `LOCAL_AUTH0_TEST_LOG.md`; a fresh provider login was not repeated
because the native client ID is intentionally redacted from the workspace.

On review, the authoritative `3D-02` slice was corrected so the state reader
parses the `request_body` JSON text in the adapter (the column is `text`, so a
`->` operator cannot run) and the job-pointer commit is guarded on the
approved revision still being the latest submitted revision, under the D-048
per-company/job advisory lock, with the snapshot, audit event and job
transition rolling back together. The API build and a 68-test API suite
(67 passing, one PostgreSQL integration test skipped without a disposable
database, including the durable-state approval, state-reader and guarded
job-pointer transaction tests) pass, and the new reader and transition
statements were parse/plan-validated with `PREPARE` against the local
PostgreSQL 17 schema. The complete `tools/verify.sh` gate with the live
tenant-isolation migration check has not been re-run since this correction.

On 2026-10-07, the API build and test suite passed with 88 tests passing and the
PostgreSQL tenant-isolation integration test skipped because
`TEST_POSTGRES_URL` was not configured. Added report tests cover
snapshot/template idempotency, role checks, authenticated controller
serialization, atomic request-audit behavior, retry after completion
persistence failure, reserved revision allocation, late superseded revisions,
approval-time review-history rechecks, one cancellable render deadline,
acknowledgement/start-time separation, private local object writes, and binary
PDF contract/client types. Migration `006` is included in static schema checks;
its live tenant/RLS and reservation-index assertions still require the
disposable PostgreSQL gate.
`tools/contracts.sh --generate` updated the checked-in OpenAPI document and
Kotlin/TypeScript clients; `tools/contracts.sh --check` passed, including
repeat generation, client compilation and compatibility fixture checks. On the
same day, the complete `tools/verify.sh` gate then passed against disposable
PostgreSQL 17, including the live tenant-isolation migration/RLS check
(89 API tests, no skips), provider portability, PDF, offline-lease and Android
storage/job-pack checks; the disposable PostgreSQL container was removed
afterwards.

On 2026-10-09, the office web gained the server-side approval-to-report flow:
idempotent generation request, generation-status read and authenticated PDF
download. The focused web suite passed 7/7 tests, TypeScript typecheck and Next
production build passed, and `tools/verify.sh` passed again against a fresh
disposable PostgreSQL 17 database (89 API tests, no skips), including provider
portability, PDF, offline-lease and Android storage/job-pack checks. D-051 records
the synthetic-only retention/reset baseline; G-06 remains open for real data.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`; `docs/adr/`.

Stage 2A.5: `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.
NSW/Queensland extension: `docs/discovery/NSW_QLD_SCOPE_EXTENSION.md`.
Stage 2B: `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.
Stage 2C: `docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md`.
GCP target platform: `docs/architecture/GCP_TARGET_PLATFORM.md`.
Stage 2D: `docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md`.
Stage 2D-01: `docs/roadmap/STAGE_2D_01_WORKSPACE_CONTRACT.md`.
Stage 2D-02: `docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md`.
Stage 2D-03: `docs/roadmap/STAGE_2D_03_PDF_HOSTING_SPIKE.md`.
Stage 2D-04: `docs/roadmap/STAGE_2D_04_PROVIDER_AUTH_PROOF.md`.
Stage 2D-04 comparison: `docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md`.
Stage 2D-04 managed evidence: `docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json`.
Stage 2D-05: `docs/roadmap/STAGE_2D_05_ANDROID_ENCRYPTED_STORAGE_PROOF.md`.
Stage 2D-06: `docs/roadmap/STAGE_2D_06_OFFLINE_LEASE_RECOVERY.md`.
G-06 retention research: `docs/roadmap/G-06_REAL_DATA_RETENTION_RESEARCH.md`.
Stage 3A-02 migrations: `apps/api/migrations/` and
`apps/api/test/tenant-schema.test.mjs`.
Stage 3A-03 identity boundary: `apps/api/src/identity/`,
`apps/api/migrations/002_identity_auth_schema.sql` and
`apps/api/test/auth.test.mjs`.
Stage 3D-02 approved snapshots: `apps/api/src/approved-snapshot/`,
`apps/api/migrations/001_initial_tenant_schema.sql` and
`apps/api/test/approved-snapshot.test.mjs`.
Stage 3D-03 reports: `apps/api/src/reports/`,
`apps/api/migrations/006_report_generation_runtime.sql`,
`apps/api/test/report-generation.test.mjs`, and the generated API contract and
clients.
Android field domain boundary (D-026): `docs/architecture/ANDROID_DOMAIN_BOUNDARY.md`.
ADR: `docs/adr/0001-kmp-ready-android-domain.md`.
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
