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

## In progress

- Convert the Stage 2C blueprint into bounded Stage 2D implementation tickets,
  dependencies, acceptance tests and feasibility spikes.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

Produce a Stage 2D ticket plan ordered by risk: repository foundation and
generated OpenAPI contract; tenancy/authentication; relational schema; Android
offline vertical slice; media/sync; review/reporting; then the fictional demo.
Include a hosting/PDF renderer spike before provider selection. Do not begin
feature implementation or promote deferred standards candidates into MVP.

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

No application build, test or lint configuration exists. Documentation
verification: `tools/verify-docs.sh` (run 2026-08-10; exit 0). Repository
checks also used file listing, document reading, `git status`, `git log` and
Markdown review. Future agents must update this section after meaningful work.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`.

Stage 2A.5: `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.
NSW/Queensland extension: `docs/discovery/NSW_QLD_SCOPE_EXTENSION.md`.
Stage 2B: `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.
Stage 2C: `docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md`.
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
