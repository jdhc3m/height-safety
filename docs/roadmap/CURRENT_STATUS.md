# Current Status

Last update: 2026-08-10

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

## In progress

- Send the implemented `2D-02` OpenAPI/runtime proof through independent API
  and Android build review:
  `docs/roadmap/STAGE_2D_02_OPENAPI_PIPELINE.md`.
- Add board owners/agent types and concrete commands as the repository scaffold
  is approved.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

Complete independent API and Android build review for `2D-02`. `2D-03` and
`2D-05` are also ready for independent spikes, but hosting/PDF feasibility
evidence must precede provider selection.
Do not begin broader feature implementation or promote deferred standards
candidates into MVP.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- No scaffolded codebase, schema migration, API, mobile app or web app exists.
- Offline-authorisation lease duration and recovery of unsynchronised evidence
  after account revocation require design-partner and technical validation.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- NSW and Queensland workflow, terminology, licensing, interval, proof-test and
  report-authority differences require practitioner validation in each state;
  the product must not auto-calculate or claim statutory compliance.
- Hosting/database/object-storage provider, authentication provider, Android
  encryption library and PDF renderer remain open behind explicit Stage 2D
  gates.

## Tests and commands

Verified root command: `tools/verify.sh`. On 2026-08-10 the documentation,
OpenAPI lint, repeated byte-stable generation, committed drift, TypeScript
compile, Kotlin/Gradle build, controlled incompatible-change fixture and
`git diff --check` all passed locally. Product Android, web and domain test
suites remain deferred because those applications are not scaffolded yet.

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
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
