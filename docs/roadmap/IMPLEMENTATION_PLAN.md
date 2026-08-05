# Implementation Plan

1. Complete focused anchor evidence and validate terminology/fields
   (Stage 2A.5 public pass done; partner validation remains open).
2. Specify workflow, outcomes, exceptions and draft report
   (Stage 2B complete; see `docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`).
3. Produce the technical blueprint, propagate explicit `NSW`/`QLD` context
   through snapshots/reports, and select stack only after repository-pattern
   review; record decisions without adding state legal-rule logic (next).
4. Build company tenancy, authentication, roles, clients, sites, anchors,
   jobs and assignments with cross-tenant tests.
5. Build mobile assigned-job vertical slice with local saves, forms, photos,
   defects, recommendations, exceptions and submission.
6. Add durable encrypted job packs, outbox, idempotency, retries, photo queue,
   conflicts and visible sync states.
7. Add office review, missing-information handling, snapshots and deterministic
   immutable draft report revisions.
8. Create fictional demonstration job and partner-ready evidence package.

Every task stays narrow and testable. Do not add broader asset types,
certification/compliance automation, customer portals, concurrent offline
editing, jurisdictions beyond New South Wales and Queensland, automatic
jurisdiction-specific rules or integrations without evidence and a
decision-log update.
