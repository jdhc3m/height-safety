# Anchor MVP Implementation Plan

Compatibility copy. Canonical plan: [docs/roadmap/IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md).

1. Select the existing stack once a codebase is introduced; retain a modular
   monolith and relational storage.
2. Establish authentication, company tenancy, roles and server-side
   authorisation tests.
3. Implement Company/User/Client/Site/Anchor/Job/Assignment schema and CRUD.
4. Implement anchor register import/export with stable IDs and duplicate review.
5. Implement Inspection and AnchorInspection revisions with neutral outcomes.
6. Build the mobile assigned-job pack and encrypted local database.
7. Add the outbox, idempotency keys, expected versions, retry UI and conflict
   review; prove restart and no-connectivity durability.
8. Add private photograph capture, durable references, resumable/background
   upload and association tests.
9. Build office review queue, missing-information warnings and changes-requested
   flow.
10. Generate immutable versioned draft PDFs from exact inspection snapshots;
    add audit events and report access.

Do not add broad asset types, compliance automation, customer portals,
concurrent offline editing or enterprise integrations during these tasks.

## Required migrations when implementation begins

There are no current migrations to modify. The first migration set must create
the entities and indexes described in `DATA_MODEL.md`, including `company_id`
on every tenant-owned table, unique stable identifiers, inspection/report
revision references, outbox idempotency constraints, and private photo/report
metadata. Later migrations should be additive and preserve historical report
snapshots.
