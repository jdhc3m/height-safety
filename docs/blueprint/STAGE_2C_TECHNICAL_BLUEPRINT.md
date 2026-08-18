# Stage 2C Technical Blueprint

Status: **complete for repository-level technical direction** (2026-08-10).
Provider selection, implementation spikes and partner validation remain open.
This blueprint implements the Stage 2B workflow without adding compliance,
certification or jurisdiction-rule automation.

## System shape

One repository contains four main areas:

- Android field application;
- office web application;
- modular-monolith backend/API; and
- generated API contracts plus infrastructure/configuration.

Approved stack direction:

| Area | Direction |
| --- | --- |
| Android | Kotlin, Jetpack Compose, Room and WorkManager |
| Backend | TypeScript and NestJS modular monolith |
| Office web | TypeScript and Next.js |
| Server database | PostgreSQL-compatible relational database |
| Media/reports | S3-compatible private object storage or a provider adapter passing equivalent contract tests |
| Authentication | Managed, invitation-only provider; exact provider open |
| Deployment | Containerised backend/web on a managed Australian-region platform; provider open |

No Kubernetes, microservices, multi-region deployment, generic rules engine or
event-streaming platform is required for the prototype.

## Backend modules

The backend deploys as one application with explicit internal modules:

1. Identity and company tenancy.
2. Clients, sites and supported jurisdiction.
3. Anchor register and history.
4. Jobs, release, claim and assignment.
5. Inspection revisions and anchor evidence.
6. Synchronisation, idempotency and conflict handling.
7. Private media lifecycle.
8. Office review and changes requested.
9. Snapshot and draft-report generation.
10. Audit and export.
11. Read-only future-asset presentation content.

Domain modules depend on application-owned interfaces, not cloud SDKs. Future
asset cards contain presentation content only and do not create generic asset
tables, forms, reports or rules.

## API contract

NestJS routes and DTOs generate a versioned OpenAPI document. The generated and
reviewed OpenAPI artifact is the cross-platform wire contract.

- Generate a Kotlin client for Android.
- Generate a TypeScript client for office web.
- Keep generated API models separate from Room entities and domain models.
- Regenerate clients in CI and fail when generated changes are not committed.
- Detect incompatible API changes before merge.
- Use stable opaque IDs, explicit enum/string evolution and ISO timestamps.
- Version breaking API changes; do not silently repurpose fields.

TypeScript types shared between web and backend may improve local development,
but they are not the Android contract and never replace OpenAPI validation.

## Tenancy and authorisation

Every tenant-owned row contains `company_id`. Every API query, mutation,
download, export, report and media request checks current company membership and
role server-side. PostgreSQL row-level security may add defence in depth but
does not replace application authorisation or cross-tenant tests.

Prototype roles:

- Administrator manages company users/settings and may perform authorised
  office-reviewer actions.
- Office reviewer prepares/releases jobs, assigns or manages claims, reviews
  submissions and generates draft report revisions.
- Inspector claims eligible released jobs or receives assignments, captures
  evidence and submits revisions.

The product does not infer competence, licence or certification authority from
a role.

## Authentication and offline authorisation

- Accounts are invitation-only with verified email.
- Administrator MFA is required.
- Inspector and Office reviewer MFA is optional during prototype and reviewed
  before live deployment.
- Online requests use short-lived access tokens and current server-side
  session/company/role checks.
- Device PIN/biometric protects reopening downloaded jobs where supported.
- Downloaded job access has a bounded offline-authorisation lease.
- Lease expiry, failed refresh or confirmed revocation locks the application
  without deleting local evidence.

The exact lease duration and revoked-account evidence-recovery path are
owner-approved as D-025 (24-hour capture lease; administrator one-hour
upload-only recovery that does not restore the account). Design-partner review
is still required before G-05 closes. Central revocation cannot immediately
reach a disconnected device; documentation and UI must not claim otherwise.

## Job release, claim and assignment

The lifecycle uses a hybrid model:

`Draft → Released → Assigned → In progress → Submitted → Under review → Approved for report generation → Report generated`

- Office prepares and releases a versioned job pack.
- An eligible same-company inspector may claim an unclaimed released job, or
  office may assign it.
- One primary inspector owns offline editing for the prototype.
- Claim, reassignment and cancellation are audited.
- Office changes after download become an explicit pack update or conflict.
- Inspector submission never approves its own evidence.

## Android local data and synchronisation

The encrypted Room database is the Android application's source of truth while
online or offline. Database key material is protected through Android Keystore;
D-023 selects and proves maintained SQLCipher Android as the bounded Room
candidate, with production adoption conditional on its documented exit
triggers.

For every local business mutation:

1. Save the evidence change and durable outbox entry consistently.
2. Assign a stable client mutation ID, entity ID/version and device/session
   context.
3. Use WorkManager to drain eligible queued work when connectivity returns.
4. Send the stable mutation ID as the server idempotency identity.
5. Mark success only after server acknowledgement.
6. Keep failed/conflicting work visible and retryable.

Expected versions prevent silent last-write-wins for evidence, outcomes,
identity and review actions. Inspectors resolve conflicts in their field
evidence; office reviewers resolve register/administrative conflicts.

Submission intent is durable locally. Server workflow becomes `Submitted` only
after required mutations reach the server. Pending/failed photos or unresolved
conflicts block review completion and report generation.

## Media lifecycle

Photos use stable local IDs and remain linked to the relevant anchor-inspection
record through capture, retry, upload and reporting.

- Store object bytes outside relational rows.
- Use non-guessable unique object keys; never overwrite on retry.
- Record checksum, size, media type, upload state and company/record reference.
- Keep buckets/containers private with public access disabled.
- Use narrowly scoped short-lived upload/download access when required.
- Verify checksum before marking upload complete.
- Test cross-company access for API metadata and object delivery.

The storage module exposes upload, download, checksum, delete and short-lived
access interfaces with S3-compatible semantics as the baseline. A non-S3
provider must pass the same contract tests; provider SDKs remain inside
infrastructure adapters.

## Snapshot, report and audit pipeline

Review approval identifies one exact, fully synchronised inspection snapshot.
Connected server generation receives snapshot identity, template version and a
stable generation idempotency key.

- A retry returns the existing report revision.
- Report metadata includes company, jurisdiction, source inspection revision,
  template version, reviewer, creator, generation time and checksums.
- The private report file never reads mutable current data after generation.
- Corrections produce new inspection and report revisions.
- Prior files remain unchanged and may be marked superseded.
- Reports remain neutral prototype drafts, not certificates.

Append-only audit events record company, actor, action, target reference, time
and necessary transition metadata for claims, assignments, submissions,
reviews, changes and report generation. They reference evidence instead of
duplicating full notes, photographs or report content.

## Retention, logout and deletion

- Do not automatically delete server inspection evidence, report revisions or
  audit history during prototype.
- Administrator may reset fictional demonstration data.
- Real partner retention/export/deletion terms must be agreed before ingestion.
- Locking the app does not delete local evidence.
- Normal logout/local cleanup requires an empty outbox, completed required
  uploads, resolved conflicts and server acknowledgement.
- The MVP has no offline destructive override.
- Synced local job packs may be cleaned after a configurable approved period.
- Material server deletion is explicit, company-authorised and audited, with
  export available first.
- Referenced records are archived/inactivated before any hard-deletion process.

Backup expiry and permanent-deletion periods remain open before live partner
deployment. 2D-06 / D-025 records the owner-approved recovery path; G-05 still
requires design-partner review.

## Portability and deployment

- Use portable PostgreSQL/standard SQL where practical.
- Keep provider-specific database features behind explicit adapters.
- Require migrations to run against the selected managed PostgreSQL service and
  a local/test PostgreSQL environment.
- Use S3-compatible object operations as the baseline and keep all provider
  implementations under common adapter contract tests.
- Build backend and web as portable container images.
- Keep secrets outside images and repository.
- Separate development, test and production configuration.
- Select an Australian region near initial users and co-locate dependent
  services where practical.

Google Cloud Run is an evaluation candidate, not an approved provider.

## PDF/hosting feasibility gate

Hosting and PDF renderer are selected together after a representative spike.
The spike must use a realistic report fixture with photographs and evaluate:

- memory and CPU use;
- render duration and platform timeout;
- concurrency and cost behavior;
- cold start and fonts;
- temporary-file requirements;
- cancellation/termination behavior; and
- idempotent recovery after interrupted generation.

Compare in-API rendering, a separate worker container and an external renderer.
Record provider/renderer choice only after the spike passes agreed limits.

## Required automated verification

Before a pilot, the implementation must cover at least:

- cross-company API, export, media and report denial;
- role and current-session authorisation;
- claim race: only one primary inspector succeeds;
- offline save/restart recovery;
- mutation and photo replay idempotency;
- stable photo-to-anchor association;
- expected-version conflict visibility;
- non-destructive logout/revocation behavior;
- offline-lease expiry lock behavior;
- submission/report synchronisation gates;
- report-generation idempotency and revision immutability;
- OpenAPI regeneration and breaking-change detection;
- storage adapter contract tests; and
- migration tests against PostgreSQL.

## Stage 2C exit and open work

Stage 2C is complete because component boundaries, stack direction, API
contract, tenancy, local persistence, synchronisation, media, report/audit,
retention, portability and test strategy are explicit.

Stage 2D must turn this blueprint into bounded implementation tickets and
resolve or schedule these gates:

- managed hosting/database/object-storage provider;
- authentication provider;
- Android database-encryption library;
- offline-authorisation lease duration (owner-approved D-025; G-05 open for design-partner review);
- revoked-account evidence recovery (owner-approved D-025; G-05 open for design-partner review);
- PDF renderer after the hosting feasibility spike;
- real partner retention/backup/deletion periods; and
- design-partner validation of terminology, fields and operating workflow.
