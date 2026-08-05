# Current Status

Last update: 2026-08-04

## Active stage

Stage 2B — anchor workflow specification (after Stage 2A.5 public evidence).

## Completed

- Repository inspected; documentation-only baseline confirmed.
- Broad research preserved under `docs/archive/` and marked historical.
- Product narrowed to Queensland installed single-point roof anchors.
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

## In progress

- Produce Stage 2B workflow specification from the Stage 2A.5 keep-bucket.
- Keep design-partner outreach ready; practitioner validation still open.

## Next recommended task

Write Stage 2B workflow, outcome, exception and draft-report specification
using `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`, without promoting
deferred AS/NZS 1891.4 or AS 5532 candidate fields into MVP requirements.

## Blockers and decisions awaiting confirmation

- No design partner, operational corpus or professional validation yet.
- No implementation stack, schema migration, API, mobile app or web app exists.
- Required fields, outcome meanings, signatures, measurements, retention and
  report wording await partner/legal/professional review.
- AS 5532 product evidence must be validated against the licensed Standard and
  the actual manufacturer instructions before implementation or certification.
- Queensland inspection-interval interpretation for anchorage points versus
  other fall-arrest components remains contested in secondary sources; product
  must not auto-calculate statutory due compliance.

## Tests and commands

No application build, test or lint configuration exists. Documentation
verification: `tools/verify-docs.sh` (run 2026-08-04; exit 0). Repository
checks also used file listing, document reading, `git status`, `git log` and
Markdown review. Future agents must update this section after meaningful work.

## Relevant files

`AGENTS.md`; `docs/product/`; `docs/discovery/`; `docs/requirements/`;
`docs/architecture/`; `docs/roadmap/`; `docs/archive/`.

Stage 2A.5: `docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.
AS 5532 review: `docs/standards/AS-5532-2025-INTEGRATION.md`.
AS/NZS 1891.4 review: `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`.
