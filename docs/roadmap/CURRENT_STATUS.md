# Current Status

Last update: 2026-08-16

## Active stage

Stage 2D — implementation planning.

## Completed

- Repository inspected; documentation-only baseline confirmed.
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
  remain open.
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
  compile/lint/dependency checks and thirteen API 31 device tests covering
  ciphertext, restart, schema migration, missing/corrupt key material, typed
  provider failure, missing initialized database state, concurrent first open,
  interrupted empty-store initialization and fail-closed preservation.
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
  G-04 is closed; authorised evidence recovery remains 2D-06 work.

## In progress

- `2D-04` local preparation is complete: the current provider/authentication
  comparison, guarded Cloud Run candidate, private worker, lifecycle plan,
  sanitised evidence schema and command gates are implemented. Local `--check`
  and `--plan` pass. No cloud resource was deployed.
- Run the attended, explicitly authorised Cloud Run exercise, cost collection,
  destroy verification and independent review before closing G-02.
- Add board owners/agent types and concrete commands as the repository scaffold
  is approved.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

No further unattended local ticket is Ready. The attended managed portion of
`2D-04` is still required, but was outside this run's no-cloud boundary. G-02
remains open for real Australian-region queue, private storage, lifecycle,
termination recovery and measured cost evidence. The bounded command and
evidence contract is in `STAGE_2D_04_PROVIDER_AUTH_PROOF.md`; cloud deployment
still requires explicit authorization and must not run in CI or an unattended
agent. `2D-06` remains Backlog until `2D-04` and `2D-05` are both complete.
Do not begin broader feature implementation or promote deferred standards
candidates into MVP.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- No product Android, web or domain application scaffold or production schema
  migration exists beyond the bounded Stage 2D proofs.
- Offline-authorisation lease duration and recovery of unsynchronised evidence
  after account revocation require design-partner and technical validation.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- NSW and Queensland workflow, terminology, licensing, interval, proof-test and
  report-authority differences require practitioner validation in each state;
  the product must not auto-calculate or claim statutory compliance.
- Hosting/database/object-storage provider, authentication provider, authorised
  Android key-loss/revocation recovery, managed renderer deployment
  sizing/scaling and production queue/storage integration remain open behind
  explicit Stage 2D gates. The
  Playwright/Chromium separate-worker direction itself is approved in D-022.

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
guarded candidate check and non-mutating Cloud Run plan also pass. The `2D-05`
compile/lint/dependency gate and thirteen API 31 Android instrumentation tests pass;
the corrected suite also rejects a missing initialized database and
proves authenticated state handling, interrupted empty-store recovery and
serialized concurrent first open.
Permanent Keystore-key loss deliberately locks and preserves ciphertext rather
than claiming recovery or resetting evidence. A fresh independent correction
review reported no actionable findings. Managed
evidence verification is expected to remain incomplete until an authorised
deploy/exercise/destroy cycle. Product Android, web and domain test suites
remain deferred because those applications are not scaffolded yet.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`.

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
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
