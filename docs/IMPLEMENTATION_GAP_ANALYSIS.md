# Implementation Gap Analysis

## Repository finding

The repository has no application source, database schema, migrations, API,
mobile project, web project, report renderer, CI test suite or deployment
configuration. Code implementation is therefore entirely outstanding; no
existing feature can be classified as aligned beyond the documentation baseline.

## Required implementation changes

- **Database/migrations:** create the company-scoped entities in `DATA_MODEL.md`,
  status enums as changeable application values, inspection revisions, outbox
  records, private media metadata, report revisions and append-only audit events.
- **API:** authenticated tenant-scoped CRUD for clients, sites, anchors, jobs,
  assignments, inspection mutations, media upload lifecycle, review actions and
  report generation. Require idempotency keys and expected versions for sync.
- **Mobile:** assigned-job download, encrypted local persistence, durable
  mutation journal, retry state UI, camera/photo references, anchor-first forms,
  exception outcomes, submission and bounded cache cleanup.
- **Web:** role-based administration, anchor register/import, assignment,
  review queue, missing/failed evidence warnings, conflict review, report
  revision access and structured export.
- **Reports:** server-side deterministic PDF generation from an immutable
  inspection snapshot, template version and explicit prototype disclaimer.
- **Security:** server-side tenant checks, private signed media access,
  secure local storage, no sensitive logs, environment separation and
  cross-tenant tests.

## Broader-than-needed features to disable/postpone

Any generic asset catalogue, certification/recertification workflow,
standards/rules engine, automatic interval logic, multi-jurisdiction support,
other asset types, customer portal, billing, scheduling and AI conclusions
should be removed from active implementation plans or feature-flagged out.

## Risks from starting architecture

Because no implementation exists, the main risk is premature architecture
choice. Introducing a broad generic compliance model would increase scope and
make authority language harder to control. The highest technical risks to prove
early are offline durability and idempotency, photo-to-anchor association,
tenant isolation, report provenance and audit history.

## Recommended test inventory

Tenant isolation for every resource and file path; mutation replay idempotency;
version conflict visibility; local save/restart recovery; failed photo upload
retry; correct association of new/missing anchors; report reproducibility;
immutable revision behaviour; role permissions; and no sensitive data in logs.
