# Agent Instructions

Read `docs/roadmap/CURRENT_STATUS.md` before implementation. Read the relevant
authoritative product, requirements and architecture documents before changing
scope or design.

Current product: New South Wales and Queensland workflow for installed
single-point roof anchors, with Android field capture, web office review,
limited offline use and draft report generation. Major non-goals include other
asset families, automatic compliance or certification, jurisdiction-specific
legal rules, standards interpretation, accounting, CRM, customer portals and
broad integrations.

Authoritative documents:

- Product: `docs/product/`
- Discovery: `docs/discovery/`
- Requirements: `docs/requirements/`
- Architecture: `docs/architecture/`
- Roadmap and handover: `docs/roadmap/`
- Historical research: `docs/archive/` (reference only)

Rules:

- Keep assumptions separate from validated facts; preserve evidence class and
  confidence.
- Update `docs/product/DECISION_LOG.md` for scope or architectural decisions.
- Use neutral language: recorded outcome, submitted by inspector, reviewed by,
  draft report and further assessment required.
- Never claim certification, automatic compliance, standards compliance,
  engineer approval or replacement of professional judgement.
- Record the supported site jurisdiction explicitly as NSW or Queensland; do
  not infer legal rules, intervals, authority or compliance from that value.
- Inspect existing patterns before introducing frameworks.
- Make small, reviewable changes and add appropriate tests for every code
  change.
- Preserve historical research; do not delete it.
- Preserve tenant isolation, durable offline evidence, idempotent sync,
  photograph association, conflict visibility, report revisions and auditability.

Repository currently contains documentation, the bounded `2D-02` contract
proof, the `2D-03` PDF feasibility harness and local guarded `2D-04` provider
spike preparation. `tools/verify.sh` is the verified root merge-gate command;
broader Android, web and domain application scaffolding remains deferred to
`3A-01`. Cloud mutation remains an attended, explicitly authorised step.
