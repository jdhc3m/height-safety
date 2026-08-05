# Current Status

Last update: 2026-08-05

## Active stage

Stage 2C — technical blueprint.

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

## In progress

- Produce the Stage 2C technical blueprint from the Stage 2B acceptance rules,
  including explicit `NSW`/`QLD` propagation without a legal rules engine.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

Define component boundaries, tenant-authorised API, relational schema,
encrypted Android job pack/outbox, private media lifecycle, conflict protocol,
snapshot/report pipeline, supported-jurisdiction field and automated test
strategy. Record stack decisions without beginning feature implementation,
adding state legal-rule logic or promoting deferred standards candidates into
the MVP.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- No implementation stack, schema migration, API, mobile app or web app exists.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- NSW and Queensland workflow, terminology, licensing, interval, proof-test and
  report-authority differences require practitioner validation in each state;
  the product must not auto-calculate or claim statutory compliance.

## Tests and commands

No application build, test or lint configuration exists. Documentation
verification: `tools/verify-docs.sh` (run 2026-08-05; exit 0). Repository
checks also used file listing, document reading, `git status`, `git log` and
Markdown review. Future agents must update this section after meaningful work.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`.

Stage 2A.5: `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.
NSW/Queensland extension: `docs/discovery/NSW_QLD_SCOPE_EXTENSION.md`.
Stage 2B: `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
