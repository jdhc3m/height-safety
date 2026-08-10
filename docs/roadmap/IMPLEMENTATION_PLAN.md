# Implementation Plan

1. Complete focused anchor evidence and validate terminology/fields
   (Stage 2A.5 public pass done; partner validation remains open).
2. Specify workflow, outcomes, exceptions and draft report
   (Stage 2B complete; see `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`).
3. Produce the technical blueprint and propagate explicit `NSW`/`QLD` context
   through snapshots/reports without state legal-rule logic (complete; see
   `docs/blueprint/STAGE_2C_TECHNICAL_BLUEPRINT.md`).
4. Convert the blueprint into bounded tickets, dependency order, acceptance
   tests and provider/PDF feasibility spikes (Stage 2D first pass created; see
   `docs/roadmap/STAGE_2D_IMPLEMENTATION_TICKETS.md`).
5. Build company tenancy, authentication, roles, clients, sites, anchors,
   jobs and assignments with cross-tenant tests.
6. Build mobile claimed/assigned-job vertical slice with local saves, forms,
   photos, defects, recommendations, exceptions and submission.
7. Add durable encrypted job packs, outbox, idempotency, retries, photo queue,
   conflicts and visible sync states.
8. Add office review, missing-information handling, snapshots and deterministic
   immutable draft report revisions.
9. Create fictional demonstration job and partner-ready evidence package.

Every task stays narrow and testable. Do not add broader asset types,
certification/compliance automation, customer portals, concurrent offline
editing, jurisdictions beyond New South Wales and Queensland, automatic
jurisdiction-specific rules or integrations without evidence and a
decision-log update.
