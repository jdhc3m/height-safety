# Application Improvement Audit

**Review date:** 2026-09-14

**Reviewed branch:** `anchor-mvp-reset`

**Reviewed HEAD:** `fe7a4e8` (`docs(auth): record local Auth0 verification`)

**Purpose:** implementation handoff, not a production-readiness approval

## Executive outcome

The repository has a stronger integrity foundation than a normal scaffold:
tenant-scoped keys and forced PostgreSQL row-level security, encrypted Android
storage, durable local mutation and photo queues, immutable job-pack and
approved-snapshot concepts, generated API clients, neutral product language and
a disciplined merge gate are already present.

The product is **not ready for a controlled real-data pilot yet**. The principal
reason is not visual polish. The office, synchronisation, media, review and
report paths are not connected end to end, and several Android process/lifecycle
seams can prevent or misclassify legitimate offline work. The current working
tree also has a broken verification baseline and production dependency alerts.

The recommended strategy is to complete one narrow, test-backed item at a time
in the order given below. Do not start a broad rewrite. Preserve the existing
domain boundaries, evidence identities, tenant isolation, offline queues and
immutable revision model.

## Scope and evidence

This review covers the current product and architecture documents, Android field
app and Kotlin/JVM domain, encrypted Room adapter, CameraX capture, WorkManager
queues, NestJS API, PostgreSQL migrations and RLS, Auth0 boundaries, Next.js
office scaffold, OpenAPI generation, PDF feasibility proof, CI and repository
verification tooling.

The review includes a large pre-existing staged and unstaged working tree. Those
changes were treated as the application under review and were not reverted. A
future implementation agent must inspect `git status` first and must not reset,
overwrite or discard unrelated work.

Evidence used:

- Current product status and declared gaps in
  [`CURRENT_STATUS.md`](CURRENT_STATUS.md).
- Product scope in [`CURRENT_SCOPE.md`](../product/CURRENT_SCOPE.md) and
  requirements in
  [`ANCHOR_MVP_REQUIREMENTS.md`](../requirements/ANCHOR_MVP_REQUIREMENTS.md),
  [`STAGE_2B_WORKFLOW_SPEC.md`](../requirements/STAGE_2B_WORKFLOW_SPEC.md) and
  [`REPORT_REQUIREMENTS.md`](../requirements/REPORT_REQUIREMENTS.md).
- Static inspection of the application, tests, manifests, migrations and build
  configuration.
- Local builds, lint, contract generation, tests, a production dependency audit
  and an Android API 31 emulator launch.
- GitHub Advisory Database entries linked in IMP-002.

Important limits:

- No real design partner, operational inspection corpus or professional review
  was available. Product requiredness, photograph volume and wording remain
  assumptions rather than validated facts.
- No production GCP project, Auth0 tenant, Cloud SQL instance, private object
  store, backup policy or real-data retention agreement was exercised.
- Generated clients were validated through the deterministic contract gate;
  generated source was not treated as independently designed application code.

## Priority definitions

- **P0 — pilot blocker:** blocks a real-data pilot, can lose/strand evidence,
  can cross an authority boundary, or prevents the repository from providing a
  trusted result.
- **P1 — required before routine field use:** important reliability, security,
  accessibility, release or operational hardening after the P0 integrity spine
  is working.
- **P2 — important maintainability:** reduces future defect risk but must not
  displace the integrity and end-to-end work above it.

## Current verification snapshot

| Check                           | Result on reviewed working tree                                                  | Interpretation                                                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/verify.sh`               | Failed at the format stage                                                       | Trailing whitespace in untracked `docs/research/LOCAL_POSTGRES_TO_GCP_COSTS_2026.md` stops the root gate.                                                                                                                                                           |
| API tests                       | 33 passed, 13 failed                                                             | Twelve failures are consistent with the in-progress synchronous-to-asynchronous store conversion not being reflected in tests/callers. One PostgreSQL isolation test could not start because the host `psql` executable is absent. Do not weaken or skip that test. |
| `tools/lint.sh`                 | Passed                                                                           | TypeScript checks and Android lint completed. Android lint reported 0 errors, 29 warnings and 1 hint.                                                                                                                                                               |
| OpenAPI contract check          | Passed                                                                           | Spec generation is deterministic and generated TypeScript/Kotlin clients build.                                                                                                                                                                                     |
| Web tests/build                 | 3 tests passed; production build passed with an Auth0 DPoP bundling warning      | The authentication boundary builds, but it is still a scaffold.                                                                                                                                                                                                     |
| Android debug/release build     | Passed                                                                           | Debug launched on API 31. Release produced an unsigned 22 MB APK; shrinking is not configured.                                                                                                                                                                      |
| Android data instrumented tests | 18/18 passed on API 31 and the connected Pixel 10 Pro                            | Encrypted storage coverage is useful and should be preserved.                                                                                                                                                                                                       |
| Android app instrumented tests  | Failed                                                                           | API 31 had one UI lookup failure; the Pixel 10 Pro had 15 Espresso failures caused by `InputManager.getInstance` reflection. Device coverage is not currently trustworthy.                                                                                          |
| `pnpm audit --prod`             | Failed: 41 findings                                                              | 2 critical, 20 high, 16 moderate and 3 low findings were reported.                                                                                                                                                                                                  |
| Tracked secret scan             | No obvious tracked private keys, keystores or populated secret assignments found | This is not a substitute for a CI secret scanner.                                                                                                                                                                                                                   |

## Ordered improvement backlog

### IMP-001 — Restore a green, reproducible baseline

**Priority:** P0

**Type:** demonstrated regression and environment gap

**Why first:** no subsequent change has a trustworthy completion signal while
the root gate and device tests are red.

Evidence:

- [`tools/verify.sh`](../../tools/verify.sh) is the declared merge gate and
  stops on documentation format, lint, contracts, tests and live PostgreSQL
  checks.
- The current API services and ports are being converted to promises, for
  example [`site-register-service.ts`](../../apps/api/src/site-register/site-register-service.ts)
  and [`job-workflow-service.ts`](../../apps/api/src/job-workflow/job-workflow-service.ts),
  while existing tests still make synchronous assertions.
- Connected UI tests are not part of the root gate and failed on both connected
  device types during this review.

Required outcome:

1. Finish the async store conversion coherently across ports, services,
   controllers, in-memory fakes and tests. Await all promise-returning behavior;
   eliminate post-test unhandled rejections.
2. Fix repository formatting without altering research meaning.
3. Standardise the local/CI PostgreSQL test environment so PostgreSQL 17 and
   `psql` are always available to the tenant-isolation test.
4. Repair the API 31 UI assertion and update the Android test stack or runner so
   the current Pixel/API level is supported.
5. Add an explicit connected-device job, at least scheduled if it is too slow
   for every commit. Do not replace device tests with compile-only checks.

Acceptance checks:

- A clean checkout runs `tools/verify.sh` successfully against a disposable
  PostgreSQL 17 database.
- API tests produce no unhandled rejection messages.
- Android app and data connected tests pass on min-supported/API 26, an
  intermediate API level and the current supported target/latest test device.
- The fix contains no skipped, quarantined or weakened tenant/security tests.

### IMP-002 — Patch production dependency vulnerabilities and gate regressions

**Priority:** P0

**Type:** demonstrated security exposure

Evidence:

- The web app pins Next.js 15.5.9 in
  [`apps/web/package.json`](../../apps/web/package.json).
- The current production audit reports two critical Next.js advisories affecting
  versions below 15.5.24: [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36)
  and [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
- High findings also include Next.js, PostCSS, `js-yaml`, Sharp and Multer. The
  current Multer 2.2.0 path is affected by
  [GHSA-qfvm-cv95-jqjf](https://github.com/advisories/GHSA-qfvm-cv95-jqjf),
  whose reviewed remediation is Multer 2.3.0.

Required outcome:

1. Upgrade direct parent packages so patched transitive versions are selected.
   Use targeted overrides only when the owning framework cannot yet resolve a
   patched version and compatibility is proven.
2. Upgrade Next.js to at least the patched 15.5.x release identified by the
   advisories, or a later supported release, without mixing this work with an
   unrelated application rewrite.
3. Confirm the NestJS version can use patched Multer and `js-yaml` lines.
4. Re-run authentication middleware, server rendering, OpenAPI generation and
   all application tests after the lockfile change.
5. Add `pnpm audit --prod --audit-level high` or an equivalent reviewed scanner
   to CI with a documented, expiring exception process.

Acceptance checks:

- No critical or high production findings remain without a written,
  time-bounded risk decision.
- The web production build, Auth0 sign-in/out boundary and API contract gate
  pass after the upgrade.
- No vulnerable version is hidden with a blanket audit ignore.

### IMP-003 — Complete the tenant-scoped runtime persistence spine

**Priority:** P0

**Type:** intentionally unfinished roadmap work

Evidence:

- Site register runtime still injects `UnconfiguredSiteRegisterStore` and a
  no-op audit sink in
  [`site-register.module.ts`](../../apps/api/src/site-register/site-register.module.ts).
- Job workflow does the same for its store, member directory and audit sink in
  [`job-workflow.module.ts`](../../apps/api/src/job-workflow/job-workflow.module.ts).
- Sync and approved snapshots remain unconfigured in
  [`sync.module.ts`](../../apps/api/src/sync/sync.module.ts) and
  [`approved-snapshot.module.ts`](../../apps/api/src/approved-snapshot/approved-snapshot.module.ts).
- Candidate PostgreSQL adapters, a shared database module, an audit adapter and
  job-pack snapshot migration exist in the working tree, but presence is not
  runtime completion.

Required outcome:

1. Use one process-wide PostgreSQL pool and one fail-closed configuration path.
2. Wire site register, job workflow, membership lookup, immutable job packs,
   sync, review, approved snapshots and reports to tenant-bound adapters.
3. Keep `SET LOCAL ROLE height_safety_runtime` and company context inside every
   transaction. Continue to force RLS on all tenant tables.
4. Replace no-op runtime audit sinks. A business mutation and its audit record
   must commit atomically or both roll back; a separate audit transaction is
   insufficient.
5. Keep unconfigured local/test modes explicit. A configured runtime must fail
   startup or readiness when a required adapter is missing rather than serving
   partial product behavior as healthy.

Acceptance checks:

- A configured API can create a client/site/anchor, release and assign a job,
  download the exact job-pack snapshot and restart without losing state.
- Cross-company reads and writes fail at both service and RLS boundaries.
- Forced failures before and after the audit insert demonstrate atomic rollback.
- Pool shutdown is graceful and there is only one runtime pool.

### IMP-004 — Implement one authoritative, atomic server sync transaction

**Priority:** P0

**Type:** intentionally unfinished roadmap work plus schema contract risk

Evidence:

- Runtime sync uses an unconfigured store and a no-op payload applier in
  [`sync.module.ts`](../../apps/api/src/sync/sync.module.ts).
- [`sync-service.ts`](../../apps/api/src/sync/sync-service.ts) currently performs
  synchronous store operations and hashes `JSON.stringify` output directly.
- `sync_mutations` in
  [`001_initial_tenant_schema.sql`](../../apps/api/migrations/001_initial_tenant_schema.sql)
  lacks the full request/version fields used by the API contract.
- The API payload has Boolean identity/location confirmations, while the current
  database stores a text `identity_confirmation` and has no explicit location
  confirmation. The database also models `identity_issue` as an exception even
  though the workflow specification treats it separately, and the database does
  not constrain reconciliation proposal values.

Required outcome:

1. In one tenant-bound transaction, re-check active membership, inspector
   assignment, job identity, site jurisdiction, job-pack version and expected
   entity version.
2. Persist the exact inspection revision, anchor evidence, observations,
   defects, recommendations and photo metadata; then persist mutation outcome,
   version/conflict state and audit event.
3. Acknowledge only after all required writes commit. Return the original stable
   response for an identical mutation or idempotency-key replay. Keep identity
   reuse with a different payload visibly conflicted.
4. Define canonical serialisation for request identity; do not depend on object
   property ordering across runtimes.
5. Reconcile the SQL schema with the OpenAPI/domain vocabulary before writing
   production rows. Record any changed product or architecture decision.

Acceptance checks:

- Crash/fault injection at every transaction boundary never produces an
  acknowledgement without evidence or evidence without a replayable mutation.
- Concurrent same-version submissions produce one commit and one visible,
  stable conflict/replay result.
- A wrong company, job, assignment, jurisdiction or pack version cannot mutate
  state.
- Identical retries after process restart return the same server identity and
  response.

### IMP-005 — Connect private, integrity-checked photograph transport

**Priority:** P0

**Type:** intentionally unfinished roadmap work

Evidence:

- [`PhotoUploadWork.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/PhotoUploadWork.kt)
  uses `UnconfiguredPhotoUploadTransport`, which permanently fails every real
  upload.
- The requirements make pending, failed, orphaned or integrity-failed photos
  visible blockers for office approval.

Required outcome:

1. Implement authenticated, resumable upload using the existing stable local
   photo ID and checksum. Never place bearer tokens in WorkManager input data.
2. Store bytes in private object storage under a server-authorised,
   non-guessable tenant/job/inspection/anchor/photo association.
3. Verify content type, byte count and SHA-256 on the server. Treat a mismatched
   existing identity as a visible conflict, never an overwrite.
4. Persist object reference, upload acknowledgement and audit state durably.
   Define cleanup for abandoned multipart uploads and unreferenced objects.
5. Decide partner photo count/size limits from evidence. Until then, use a
   conservative configurable technical ceiling and show storage-pressure errors
   without deleting captured evidence.

Acceptance checks:

- Interrupted uploads resume with the same identity and do not duplicate bytes
  or metadata.
- Cross-company object access and association are denied.
- Corrupted, missing, oversized and duplicate content produce visible typed
  states and block approval.
- Logout/revocation/recovery rules preserve pending local photographs.

### IMP-006 — Make Android evidence, queue, lease ledger and audit writes atomic

**Priority:** P0

**Type:** demonstrated evidence-durability risk already recognised by the roadmap

Evidence:

- [`FieldViewModel.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldViewModel.kt)
  saves a draft first and then records mutation/photo IDs through separate
  offline-state writes. Submission queuing similarly performs a Room
  transaction followed by multiple lease-ledger transitions.
- [`OfflineAuthorizationStore.kt`](../../apps/android/domain/src/main/kotlin/au/com/heightsafety/domain/OfflineAuthorizationStore.kt)
  publishes the new in-memory state before durable storage succeeds.
- CameraX writes a file before the evidence row is associated in Room in
  [`CameraCaptureActivity.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/CameraCaptureActivity.kt).

Required outcome:

1. Add adapter-level Room commands that atomically commit evidence, photo queue,
   mutation outbox, offline evidence ledger and local audit event.
2. Persist an offline transition before publishing it as current in memory.
3. On startup, reconcile the lease ledger from authoritative evidence/outbox/
   photo/conflict tables. A derived ledger must not silently disagree with the
   rows that gate logout or recovery.
4. Add a durable capture handoff or orphan-file inventory so process death
   between camera write and Room association cannot strand an invisible photo.
5. Keep submitted evidence immutable; corrections create a later revision.

Acceptance checks:

- Fault injection after each write step leaves either the old complete state or
  the new complete state, never a split ledger.
- Process death immediately after capture, save and queue is recoverable on
  restart.
- Logout stays blocked whenever authoritative pending evidence, photos or
  conflicts exist, even if a prior ledger write failed.

### IMP-007 — Make valid offline packs usable after process restart

**Priority:** P0

**Type:** demonstrated workflow defect

Evidence:

- Session restore calls the server before exposing local work in
  [`FieldViewModel.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldViewModel.kt).
  A retryable network failure ends in a generic error and retry performs another
  online job-list request.
- `FieldJobPackStore` in
  [`FieldJobPacks.kt`](../../apps/android/domain/src/main/kotlin/au/com/heightsafety/domain/FieldJobPacks.kt)
  can load only a caller-supplied job ID; it cannot enumerate authorised cached
  packs after process memory is lost.

Required outcome:

1. Persist and list minimal cached job summaries bound to company, user,
   assignment/job-pack identity and lease.
2. After process restart with no network, restore the encrypted state, require
   device authentication and expose only cached packs whose D-025 lease is still
   valid.
3. Record a failed online refresh as unreachable; do not convert it to
   revocation, clear the pack or shorten a still-valid lease.
4. Keep a fail-closed path for expired leases, clock rollback, lost Keystore and
   confirmed revocation.
5. Decide and test reboot behavior explicitly because elapsed realtime resets on
   reboot; do not accidentally label every reboot as an unexplained clock attack.

Acceptance checks:

- Download a pack, kill the process, enable airplane mode, relaunch, authenticate
  the device and continue capture under the valid lease.
- The same flow is denied after lease expiry or confirmed revocation while local
  evidence remains preserved.
- Another company/user cannot discover or open the cached pack.

### IMP-008 — Separate expiry, revocation and account state; add session renewal

**Priority:** P0

**Type:** demonstrated authorisation defect plus declared roadmap gap

Evidence:

- The application session is intentionally 15 minutes in
  [`auth.module.ts`](../../apps/api/src/identity/auth.module.ts).
- In [`FieldViewModel.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldViewModel.kt),
  `isSessionExpired` and `isServerAuthorizationFailure` both classify the same
  `UNAUTHENTICATED` gateway reason, and the revocation branch runs first. Normal
  expiry can therefore be recorded as account revocation and trigger the wrong
  recovery path.
- Android saves Auth0 `offline_access` credentials in
  [`ProviderAccessTokenSources.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/ProviderAccessTokenSources.kt),
  but application sign-out does not clear or deliberately retain provider
  credentials through an explicit account-switch policy.

Required outcome:

1. Return typed API errors for expired application session, revoked session,
   inactive membership, removed role/company access and transient provider
   failure without disclosing sensitive detail.
2. Add application-session renewal using a freshly verified provider token and
   current membership. Integrate it into Android, web/API exchange and upload
   workers with bounded retries.
3. Only confirmed inactive/revoked membership may enter D-025 upload-only
   recovery. Expiry should renew or ask for normal sign-in.
4. Define sign-out versus switch-account behavior. Clear Auth0 credentials when
   the user expects a full sign-out/account switch, while preserving unsent local
   evidence through the existing logout gate.
5. Complete authenticated, same-company Administrator recovery and invitation
   delivery; both are currently bounded seams rather than usable workflows.

Acceptance checks:

- Tests distinguish expired, explicitly revoked, inactive, wrong-company,
  network and provider failures from API through Android UI.
- Session renewal cannot extend removed membership and is auditable.
- Full sign-out cannot silently re-enter the previous provider account.
- Pending evidence survives all denied sign-out and recovery paths.

### IMP-009 — Make WorkManager drains process-resilient

**Priority:** P0

**Type:** demonstrated process-death defect

Evidence:

- [`MutationOutboxWork.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/MutationOutboxWork.kt)
  holds its authenticated session only in a volatile static field.
- After process death, both mutation and photo workers have no session and
  return `Result.success()` when upload is disallowed. This consumes one-time
  work while durable queue items remain.

Required outcome:

1. Workers restore only non-secret identifiers and the encrypted application
   session from durable storage, then renew/revalidate it through the typed flow
   in IMP-008. Never persist bearer tokens in work input.
2. A blocked worker must retain a visible deferred state and be deterministically
   rescheduled on sign-in, renewal, recovery grant, application start and network
   return. Do not report successful completion for work that was not attempted.
3. Preserve unique-work and backoff behavior. Keep retries bounded and classify
   permanent failure, transient failure and conflict separately.
4. Reconcile acknowledged mutations/photos into the offline ledger atomically.

Acceptance checks:

- Queue work, kill the process before execution, restore connectivity and prove
  the same item drains once after restart.
- Test device reboot, expired/renewed session, confirmed revocation, upload-only
  recovery, retry exhaustion and server conflict.
- No queue becomes permanently idle solely because its original process died.

### IMP-010 — Close the foreground-lock gap across camera and external activities

**Priority:** P0

**Type:** demonstrated security/lifecycle risk

Evidence:

- [`MainActivity.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/MainActivity.kt)
  deliberately suppresses background locking while camera capture is in
  progress. Pressing Home while `CameraCaptureActivity` is foreground can leave
  the evidence surface outside the main lock coordinator.
- Release manifest inspection found the camera activity non-exported and the
  Auth0 redirect boundary constrained; no material intent-redirection issue was
  found. Preserve those properties.

Required outcome:

1. Move foreground/device-auth state to an application-level lifecycle/security
   coordinator that covers MainActivity, CameraCaptureActivity and authentication
   callbacks.
2. Returning from Home, screen lock or task switching must authenticate before
   showing a camera preview or downloaded evidence.
3. Distinguish trusted short external-auth transitions from a real background
   event without relying on a mutable Activity Boolean that process death can
   erase.
4. Cancel or durably hand off an in-progress capture safely.

Acceptance checks:

- Instrumented tests cover Home/resume, lock screen, rotation and process death
  while camera and Auth0 flows are active.
- No camera preview, captured image or job-pack detail appears before successful
  device authentication on resume.

### IMP-011 — Build the office review-to-draft-report vertical slice

**Priority:** P0

**Type:** intentionally unfinished core product work

Evidence:

- [`apps/web/src/app/office/page.tsx`](../../apps/web/src/app/office/page.tsx)
  explicitly states that job review data is not connected and only proves the
  browser authentication boundary.
- [`approved-snapshot-service.ts`](../../apps/api/src/approved-snapshot/approved-snapshot-service.ts)
  accepts an `ApprovedSnapshotSource` supplied by its caller, including flags and
  blocker counts. Its type states that the missing review boundary will become
  the authoritative producer.
- Runtime snapshot persistence and audit are not wired, and report generation is
  still represented by a feasibility harness rather than a product workflow.

Implement this epic as bounded slices in this order:

1. Office application-session exchange and company-scoped client/site/anchor/job
   screens.
2. Submission queue with visible mutation/photo/conflict state.
3. Append-only review issues, comments, requested changes, re-submission and
   exact revision selection.
4. Approval transaction that verifies all gates against durable server state.
5. Approved snapshot creation by approval ID. The snapshot service must read the
   exact authoritative review/submission rows in the same transaction; it must
   not trust caller-supplied synchronised/blocker/change counts.
6. Idempotent draft report generation from only the immutable approved snapshot,
   with template version, checksum, source revision and audit references.
7. New immutable report revision for a corrected/re-approved inspection.

Acceptance checks:

- Inspector cannot approve their own submission. Reviewer/Administrator actions
  are current-membership and tenant checked.
- Pending/failed photos, pending mutations, conflicts, hard blockers and open
  change requests prevent approval.
- Approval and report retries return the same exact snapshot/revision identity.
- The PDF carries required prototype wording and never claims certification,
  standards compliance, engineer approval or an automatic compliance result.
- NSW or QLD is reproduced only as recorded site context; it does not derive a
  rule, interval or authority.

### IMP-012 — Complete the controlled-pilot human and operational gates

**Priority:** P0 for real data

**Type:** human decision/operations work; not fully delegable to an implementation model

Required outcome:

1. Validate required fields, outcome vocabulary, exception handling,
   photographs, office review, report wording, acceptable offline duration and
   photo volume with at least one relevant design partner. Record evidence class
   and confidence; do not promote opinion to fact.
2. Obtain professional/legal review of prototype wording and organisational
   responsibility boundaries. Do not ask the model to interpret standards or
   jurisdictional legal rules.
3. Agree real-data retention, export, deletion, residency and subprocessor terms
   before ingestion.
4. With separate explicit owner authorisation for cloud mutation, configure the
   bounded Sydney GCP deployment: least-privilege runtime identities, Cloud SQL,
   private object storage, secrets, Auth0 AU settings, TLS/ingress and budgets.
5. Define and test backup/restore, RPO/RTO, incident response, access review,
   audit export and permanent-deletion procedures.

Acceptance checks:

- Open assumptions are either validated with cited evidence or remain visibly
  open; the code does not invent answers.
- A fictional-data rehearsal covers device loss, account revocation, upload-only
  recovery, database restore, report reproduction and audit reconstruction.
- Real partner data is not accepted until the owner signs off the retention and
  operational checklist.

### IMP-013 — Prevent unsaved UI state and navigation loss

**Priority:** P1

Evidence:

- [`MainActivity.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/MainActivity.kt)
  constructs a plain 1,488-line `FieldViewModel` with `remember` and an Activity
  lifecycle scope rather than a lifecycle ViewModel with saved state.
- [`FieldScreen.kt`](../../apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldScreen.kt)
  switches an entire 2,198-line screen tree from one state and has no system
  back-stack integration. Unsaved edits can be lost by configuration changes or
  unexpected Back navigation.

Required outcome:

1. Move app-layer state to lifecycle-aware ViewModels and explicit saved-state
   keys while keeping Android APIs out of the Kotlin/JVM domain module.
2. Define Back behavior for job pack, anchor edit, submission review and camera.
   A dirty draft must autosave safely or require an explicit discard decision.
3. Restore in-progress navigation and non-secret form state after rotation;
   restore durable evidence after process death.
4. Follow the repository's Android guidance and evaluate Navigation 3 before
   implementing adaptive multi-pane/back-stack work. If adopted, record the
   architecture decision first; do not introduce it incidentally in a UI patch.

Acceptance checks:

- Rotation and process-recreation tests cover a partially edited anchor, photo
  return and submission review.
- Hardware/system Back never exits a nested flow while silently discarding
  evidence.

### IMP-014 — Harden field usability, accessibility and camera failure handling

**Priority:** P1

Required outcome:

1. Give outcome, exception and reconciliation choice groups proper selectable
   semantics and selected-state announcements. Current custom choice buttons
   communicate selection mainly through colour and a decorative check.
2. Make the whole checkbox label row toggleable, verify focus order and support
   screen reader, keyboard and switch access.
3. Move camera strings to resources and provide clear flows for first denial,
   permanent denial/settings, no back camera, bind failure, full storage,
   checksum failure and capture cancellation.
4. Use window-aware compact/medium/expanded layouts. Keep readable maximum
   widths and consider list/detail on tablets rather than stretching phone
   columns. Preserve the existing large touch targets and neutral language.
5. Add screenshot/accessibility tests at representative phone, tablet and
   landscape widths and at 1.0 and 1.5 font scale. Test outdoor-relevant contrast
   rather than relying only on palette appearance.

Acceptance checks:

- TalkBack announces each choice label, group purpose and selected state.
- Essential actions remain visible and operable at large font and narrow/short
  windows without clipping.
- Camera tests use fakes plus real hardware/emulator coverage across permission,
  lifecycle and failure scenarios.

### IMP-015 — Add an explicit server/web security and observability perimeter

**Priority:** P1

Evidence:

- [`api-bootstrap.ts`](../../apps/api/src/api-bootstrap.ts) configures strict DTO
  whitelisting and the API prefix, but no application-level security headers,
  request size policy, rate limiting, timeout or structured request tracing.
- [`health.controller.ts`](../../apps/api/src/health.controller.ts) always returns
  `ok`; it does not indicate whether PostgreSQL, identity configuration, media or
  required runtime adapters are ready.
- [`next.config.ts`](../../apps/web/next.config.ts) enables only React strict mode.

Required outcome:

1. Define where CSP, HSTS, framing, MIME, referrer, permissions, CORS and trusted
   proxy/host controls live. Configure them in the app or prove the managed edge
   owns them; test the deployed result.
2. Bound JSON and future multipart request sizes, add endpoint-appropriate rate
   limits for auth/invitations/sync/media and use timeouts/cancellation.
3. Add redacted structured logs, correlation IDs, latency/error metrics and
   alerts without logging tokens, report contents or unnecessary inspection
   evidence.
4. Separate liveness from readiness. Readiness must fail when required runtime
   persistence, Auth0 verification, media or migrations are unavailable.
5. Add graceful shutdown and drain behavior for database and in-flight requests.

Acceptance checks:

- Automated tests inspect deployed headers, limits, rate behavior and readiness.
- Logs correlate an authorised workflow and audit identity without exposing a
  credential or evidence body.

### IMP-016 — Create a real release and cross-component test lane

**Priority:** P1

Required outcome:

1. Add one end-to-end fictional-data journey: office creates and releases a NSW
   or QLD job; Android downloads, captures offline and restarts; sync/media
   recover; office requests a change and approves the exact later revision; a
   reproducible draft report revision is generated.
2. Run concurrency, network loss, process death, storage pressure, database
   restart and object-integrity cases. Preserve stable IDs and visible conflicts.
3. Configure the Android release build explicitly: versioning, signing outside
   source control, `minifyEnabled`, resource shrinking and mapping retention.
4. Start from generated/library consumer R8 rules, remove only rules proven
   redundant, and add narrow app rules only for demonstrated reflection. The
   current generated serialization rules are relevant; a broad package keep is
   not an acceptable shortcut.
5. Smoke-test a shrunk release build through Auth0, generated Retrofit/
   serialization, SQLCipher/Room, WorkManager and CameraX. Confirm the merged
   release manifest remains free of debug activities and cleartext traffic.
6. Add production dependency scanning, tracked-secret scanning and a software
   bill of materials to the release evidence.

Acceptance checks:

- The end-to-end journey runs in CI or a reproducible pre-pilot environment and
  preserves tenant, revision, photo and audit identities throughout.
- A signed internal release passes on supported device/API classes.
- Release mappings and artefact checksums are retained securely for incident
  diagnosis.

### IMP-017 — Reduce Android change risk after the integrity spine is green

**Priority:** P2

Evidence:

- `FieldScreen.kt` is 2,198 lines, `FieldViewModel.kt` is 1,488 lines and
  `JobPackDatabase.kt` is 1,596 lines. These files combine many independently
  testable workflows and increase merge and regression risk.
- Offline audit history is held inside one serialised state object and grows as
  transitions append, causing the full history to be rewritten repeatedly.

Required outcome:

1. Split by existing workflow boundaries—authentication/lock, jobs/job pack,
   anchor capture, submission/sync and recovery—without changing domain terms or
   introducing a framework solely for file size.
2. Keep one clear app composition root and use small interfaces/fakes for tests.
3. Move local audit events to an append-only Room table with explicit retention/
   export behavior consistent with the product decision. Do not silently cap or
   delete audit history.
4. Measure build/runtime performance before adding DI, paging or other
   frameworks. Record any architectural choice in the decision log.

Acceptance checks:

- Each extracted workflow has focused state-transition tests.
- Refactoring produces no contract, database, report or user-visible terminology
  change.

## Recommended delivery sequence

Do not hand all items to one model in one prompt. Use the following sequence and
keep every change reviewable:

1. **Trust the baseline:** IMP-001, then IMP-002.
2. **Complete the server integrity spine:** IMP-003, IMP-004 and IMP-005.
3. **Close Android durability and access seams:** IMP-006 through IMP-010.
4. **Complete the user-visible product loop:** IMP-011.
5. **Harden and rehearse:** IMP-013 through IMP-016.
6. **Run human/operational gates before real data:** IMP-012.
7. **Refactor only after behavior is protected:** IMP-017.

IMP-012 discovery can run in parallel with code, but its unresolved answers must
not be guessed or silently encoded.

## Instructions for a lower-cost implementation model

For each item:

1. Read `AGENTS.md`, `docs/roadmap/CURRENT_STATUS.md`, the named requirement and
   architecture documents, and the current `git status` before editing.
2. Select exactly one IMP item or one explicitly numbered sub-slice. Restate its
   invariant and acceptance checks before implementation.
3. Inspect existing patterns first. Preserve the Kotlin/JVM Android domain
   boundary; Android, Room, Retrofit and identity-provider APIs stay in adapters.
4. Write the failing test that demonstrates the gap, then make the smallest
   implementation that passes it. Add migration, contract and cross-tenant tests
   whenever persistence or API shape changes.
5. Keep assumptions separate from facts. If a field, photograph rule, retention
   period, legal rule or approval authority is unknown, stop and record the open
   question instead of inventing it.
6. Use only neutral language: recorded outcome, submitted by inspector, reviewed
   by, draft report and further assessment required.
7. Never claim certification, automatic compliance, standards compliance,
   engineer approval or replacement of professional judgement.
8. Record NSW or Queensland explicitly only as site context. Do not infer rules,
   intervals, authority or compliance from jurisdiction.
9. Update `docs/product/DECISION_LOG.md` only when a real scope or architecture
   decision is made. Do not turn implementation detail into a product decision.
10. Run the narrow tests while working and the complete `tools/verify.sh` gate
    before handoff. Report any unavailable external validation honestly.
11. Never perform cloud mutation without separate explicit owner authorisation.
12. Do not move to the next item while required acceptance checks for the current
    item are red.

## Do not spend implementation budget on these now

- Additional asset families, certification/compliance engines, standards or
  jurisdiction rule interpretation.
- Kotlin Multiplatform, iOS, CRM, accounting, customer portals or broad
  integrations.
- A wholesale visual redesign; the current Android visual hierarchy and touch
  target sizing are serviceable.
- Replacing PostgreSQL/RLS, Room/SQLCipher, generated contracts or the existing
  offline outbox merely for novelty.
- Bulk dependency upgrades without a security, compatibility or supported-device
  reason.
- Refactoring generated client files by hand.

## Strengths to preserve

- Kotlin/JVM product domain currently has no Android, Room or Retrofit leakage.
- The release manifest keeps the camera activity non-exported, disables backup
  and contains no debug-only activities or cleartext flag.
- Tenant-scoped composite keys, forced RLS and the no-login/no-bypass runtime role
  provide useful defence in depth.
- Stable mutation/photo identities, durable local queue rows, conflict states and
  immutable snapshot/report concepts align with the product's evidence model.
- The application consistently uses neutral language and avoids automatic
  compliance conclusions.
- Deterministic OpenAPI generation and checked generated clients are valuable
  merge protections.

These strengths materially reduce risk. Improvements should connect and harden
them, not replace them.
