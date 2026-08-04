# Technical Decisions

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| T-001 | No implementation stack selected yet. | Open | Repository contains documentation only. |
| T-002 | Prefer modular monolith and relational persistence for prototype. | Proposed | Low operational complexity and clear transactions. |
| T-003 | Use encrypted durable local storage plus mutation outbox. | Proposed | Field evidence must survive connectivity loss/restart. |
| T-004 | Require idempotency keys and expected versions for sync. | Proposed | Prevent duplicate retries and silent overwrites. |
| T-005 | Use private object storage and immutable report revisions. | Proposed | Protect media and preserve provenance. |
| T-006 | Keep final review/report generation connected. | Accepted scope constraint | Bounds approval and sync risk. |

Each implementation choice needs tests and an update here when materially
changed. No framework should be introduced without repository-pattern review.
