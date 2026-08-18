# Compatibility copy — canonical: [docs/product/DECISION_LOG.md](docs/product/DECISION_LOG.md)

# Decision Log

| ID | Date | Decision | Reason | Status |
| --- | --- | --- | --- | --- |
| D-001 | 2026-08-04 | Narrow MVP to periodic inspection/reporting workflow for installed single-point roof anchors in Queensland. | Makes a one-partner prototype feasible and testable. | Accepted working direction |
| D-002 | 2026-08-04 | Use Administrator, Office reviewer and Inspector as initial product roles. | Matches the bounded office/field/review workflow without assigning certification authority. | Accepted working direction |
| D-003 | 2026-08-04 | Reports are neutral, versioned draft reports with a prototype disclaimer. | Avoids unsupported compliance, certification and engineering claims. | Accepted working direction |
| D-004 | 2026-08-04 | Limit offline use to assigned jobs and one primary inspector; require connectivity for final report approval. | Reduces conflict and approval risk while preserving field usability. | Accepted working direction |
| D-005 | 2026-08-04 | Prefer a modular monolith, relational database, private object storage, encrypted local database and outbox when implementation starts. | Simplest architecture matching the repository direction and difficult parts. | Proposed implementation posture |
| D-006 | 2026-08-04 | Preserve broad Stage 2A research under `docs/archive/`. | Retains useful evidence and history without allowing it to define current scope. | Accepted |
| D-008 | 2026-08-04 | Stage 2A.5 MVP field cut: keep narrow single-point evidence; defer broader standards candidates. | See canonical decision log. | Accepted working direction |
| D-009 | 2026-08-05 | Separate workflow, outcome, exception, reconciliation, disposition and sync concepts. | See canonical decision log. | Accepted working direction |
| D-010 | 2026-08-05 | Expand the initial prototype scope to New South Wales and Queensland while keeping legal rules human-entered or deferred. | See canonical decision log. | Owner-approved working direction |
| D-011 | 2026-08-05 | Show future asset families as read-only informational previews while keeping the implemented MVP anchor-only. | See canonical decision log. | Owner-approved working direction |
| D-012 | 2026-08-05 | Use a hybrid assignment model: office releases a prepared job; an eligible inspector may claim it or the office may assign it. | See canonical decision log. | Owner-approved working direction |
| D-013 | 2026-08-05 | Use relational server data, private object storage, encrypted Room-based Android storage, durable local outbox and application-level immutable revisions; defer provider selection. | See canonical decision log. | Owner-approved technical direction |
| D-014 | 2026-08-05 | Use managed invitation-only authentication with Administrator MFA, optional Inspector/Reviewer MFA, non-destructive logout and a bounded offline-authorisation lease. | See canonical decision log. | Owner-approved technical direction; lease/recovery details owner-approved as D-025 |
| D-015 | 2026-08-06 | Save mobile evidence locally first with durable idempotent sync, stable photo associations, visible conflicts and synchronisation gates before review/reporting. | See canonical decision log. | Owner-approved technical direction |
| D-016 | 2026-08-06 | Generate neutral draft reports idempotently from approved immutable snapshots and preserve append-only workflow audit events. | See canonical decision log. | Owner-approved technical direction; retention addressed by D-018 |
| D-017 | 2026-08-10 | Use native Android, NestJS backend and Next.js web with generated OpenAPI clients, portable PostgreSQL/S3-compatible persistence boundaries, and a joint hosting/PDF feasibility gate. | See canonical decision log. | Owner-approved technical direction; provider/renderer remain open |
| D-018 | 2026-08-10 | Preserve server evidence during prototype; define real-data retention by pilot agreement and require safe, authorised, audited cleanup/deletion. | See canonical decision log. | Owner-approved technical direction; durations remain open |
| D-019 | 2026-08-10 | Execute Stage 2D in risk-first order: workspace contract, OpenAPI proof, and then gated hosting/PDF and provider decisions. | See canonical decision log. | Owner-approved execution direction |
| D-020 | 2026-08-10 | Use the approved application/client/contract/infrastructure workspace, source-controlled API migrations and one root verification entry point. | See canonical decision log. | Owner-approved workspace contract |
| D-021 | 2026-08-10 | Prove the approved code-first OpenAPI pipeline with generated Kotlin/TypeScript clients, pinned runtimes, deterministic output and compatibility gates. | See canonical decision log. | Owner-approved; proof implemented and independently reviewed |
| D-022 | 2026-08-12 | Use a separate asynchronous Playwright/Chromium PDF worker, initially at concurrency one; keep provider and production sizing open pending candidate evidence. | See canonical decision log. | Owner-approved renderer direction; managed provider later selected in D-024 |
| D-023 | 2026-08-15 | Use sqlcipher-android behind Room with Keystore-wrapped passphrase for the Android encrypted-storage candidate. | See canonical decision log. | Accepted; G-04 closed; recovery owner-approved in D-025 |
| D-024 | 2026-08-18 | Use Cloud Run in Sydney as the first managed draft-PDF renderer candidate at 2 vCPU / 2 GiB and concurrency one. | See canonical decision log. | Owner-approved; G-02 closed; auth vendor deferred |
| D-025 | 2026-08-18 | Use a 24-hour application-issued offline lease and administrator upload-only recovery that does not restore a revoked account. | See canonical decision log. | Owner-approved; 2D-06 Done; G-05 remains open for design-partner review |
| D-026 | 2026-08-18 | Keep Android field domain as a Kotlin/JVM module and defer KMP/iOS sharing until iOS is an approved product. | See canonical decision log. | Owner-accepted technical direction; scaffold still `3A-01` |

All outcome values, required fields, report wording and partner terms remain
open to design-partner validation. Historical decisions and research are not
professional validation. Canonical: `docs/product/DECISION_LOG.md`.
