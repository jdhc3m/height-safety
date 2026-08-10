# Prototype Architecture

No product application exists yet; only the bounded OpenAPI contract proof is
scaffolded. Approved lowest-complexity shape: modular monolith,
PostgreSQL-compatible relational database, authenticated web API, Android
client with an encrypted Room-based local database, private object storage for
media/reports, deterministic server-side PDF generation and append-only audit
events. Authentication uses a managed provider with invitation-only access;
cloud provider, authentication provider and exact Android encryption library
remain open.

Approved application stack: Kotlin with Jetpack Compose, Room and WorkManager
for Android; TypeScript with NestJS for the backend; TypeScript with Next.js for
the office web application. Versioned OpenAPI generated from NestJS is the
cross-platform API contract. CI generates Kotlin and TypeScript clients and
checks committed contract changes; generated API models do not become Room
database entities.

Modules: identity/tenancy; clients/sites/anchors; jobs/assignments; inspections
and evidence; sync/media; review; reports; audit. Keep module boundaries clear
without microservices. Choose framework only after inspecting repository and
recording a decision.

Data flow: office prepares job; server authorises assigned download; mobile
saves locally first; outbox replays idempotent mutations; media uploads bind to
anchor inspection; server exposes failures/conflicts; connected review creates
snapshot and report revision.

Media uses non-guessable unique object keys, integrity checksums and private
buckets. Authorised uploads/downloads may use narrowly scoped short-lived URLs;
there are no permanent public file links. Submitted inspection and generated
report revisions are locked at the application level with source references,
timestamps and checksums; regulatory-grade WORM storage is not an MVP claim.

Report generation accepts an approved snapshot/template identity and a stable
idempotency key. A retry returns the existing report revision. Corrections
create new inspection/report revisions; prior files remain unchanged and may
be marked superseded. Append-only audit events record important actors,
transitions and record references without copying full notes or media content.

Database migrations use portable PostgreSQL/standard SQL where practical.
Provider-specific database and object-storage SDKs stay in infrastructure
adapters. Object storage exposes application-owned upload, download, checksum,
delete and short-lived-access operations using S3-compatible semantics as the
baseline; a non-S3 provider must pass the same common adapter contract tests.

Backend and web deploy as containers to a managed Australian-region platform.
No provider is selected. Hosting and PDF renderer are co-selected only after a
representative report spike measures memory, CPU, timeout, concurrency,
cold-start, fonts and retry behavior in the candidate environment.

Quality gates: cross-tenant tests, restart recovery, mutation replay, photo
association, conflict visibility, deterministic report reproduction and private
media access.
