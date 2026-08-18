# Technical Decisions

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| T-001 | Use Kotlin/Compose/Room/WorkManager for Android, NestJS for backend and Next.js for office web. | Accepted direction | Fits native offline risk and modular web/backend delivery. |
| T-002 | Use a modular monolith and PostgreSQL-compatible relational persistence. | Accepted direction | Low operational complexity and clear transactions. |
| T-003 | Use encrypted durable local storage plus mutation outbox. | Accepted direction | Field evidence must survive connectivity loss/restart. |
| T-004 | Require idempotency keys and expected versions for sync. | Accepted direction | Prevent duplicate retries and silent overwrites. |
| T-005 | Use private object storage and immutable report revisions. | Accepted direction | Protect media and preserve provenance. |
| T-006 | Keep final review/report generation connected. | Accepted scope constraint | Bounds approval and sync risk. |
| T-007 | Generate versioned OpenAPI from NestJS and generate Kotlin/TypeScript clients in CI. | Accepted direction | Makes the mobile/backend contract explicit and testable. |
| T-008 | Isolate provider-specific database/storage code behind adapters and contract tests. | Accepted direction | Preserves the Approval 16 portability boundary. |
| T-009 | Select hosting and PDF renderer together after a representative rendering spike. | Accepted gate | Renderer memory, timeout, font and concurrency needs affect hosting suitability. |
| T-010 | Preserve server evidence by default during prototype; agree real-data retention before pilot. | Accepted direction | Avoids evidence loss and invented retention periods. |
| T-011 | Issue an application-owned offline lease and recover revoked-device pending evidence only through administrator upload-only authorisation. | Owner-approved; G-05 open for design-partner review | Identity providers cannot reach a disconnected device; D-023 already fails closed on Keystore loss. |

Provider, authentication service, production Android encryption adoption,
retention periods and G-05 design-partner review remain open. D-023 selects
and proves maintained SQLCipher Android as the bounded Room candidate;
production adoption remains conditional on its documented exit triggers. D-025
is owner-approved for the 24-hour lease and upload-only recovery path. Each
implementation choice needs tests and an update here when materially changed.
