# Stage 2D Implementation Ticket Plan

Status: first planning pass, 2026-08-10

## Purpose

Convert the approved Stage 2C blueprint into bounded, dependency-ordered work.
This plan does not authorise feature implementation or settle provider choices
that remain behind a feasibility or owner-approval gate.

The implementation remains limited to installed single-point roof anchors in
New South Wales and Queensland. Both states use one neutral evidence workflow;
the product does not automate compliance, licensing, inspection intervals,
certification or state-specific legal conclusions.

## Kanban and agent operating model

Use these columns: `Backlog`, `Ready`, `In progress`, `Review`, `Owner approval`,
`Done` and `Blocked`.

Each ticket must name:

- objective, dependencies and files/components it may change;
- acceptance scenarios and exact validation commands;
- required tests, migration or contract evidence;
- decisions or assumptions changed;
- handoff summary, risks and remaining work.

An agent may start a ticket only when all dependencies are `Done`, the ticket is
`Ready`, and no owner-approval gate is open. Finishing an agent run moves the
ticket to `Review`; it does not mark it `Done` or automatically approve a
decision. The next agent can be triggered only after automated checks pass and
the reviewer or owner closes the applicable gate.

## Execution gates

| Gate | Must be resolved before | Required evidence | Approval |
| --- | --- | --- | --- |
| G-01 Contract pipeline | API/domain implementation | NestJS-generated versioned OpenAPI document; generated Kotlin and TypeScript clients; breaking-change check | Technical review |
| G-02 Hosting and PDF feasibility | Provider selection or report implementation | Representative photo-heavy report tested against candidate renderer/hosting limits, fonts, retries, memory, timeout and concurrency | Owner + technical review |
| G-03 Provider portability | Production infrastructure | Australian-region comparison; standard PostgreSQL; S3-compatible semantics or tested adapter boundary; backup/export path | Owner approval |
| G-04 Android encrypted storage | Offline job-pack implementation | Room-compatible encryption spike, Keystore integration, migration/recovery test and abandoned-library risk | Technical review |
| G-05 Offline authorisation | Controlled pilot | Lease duration, expiry behaviour and recovery path for unsynchronised evidence after revocation | Owner + design-partner review |
| G-06 Real-data retention | Any real customer data | Pilot terms, export process, backup/deletion periods and authorised audited cleanup | Owner + legal/privacy review |

## Ordered tickets

### Stage 2D risk-reduction tickets

| ID | State | Ticket | Depends on | Exit evidence |
| --- | --- | --- | --- | --- |
| 2D-01 | Done | Define repository workspace and quality-command contract | Stage 2C | Approved as D-020; see `STAGE_2D_01_WORKSPACE_CONTRACT.md`; no feature scaffold created |
| 2D-02 | Done | Prove the OpenAPI generation pipeline and pin tool runtimes | 2D-01 | D-021 implemented and independently reviewed; checked-in OpenAPI plus generated Kotlin and TypeScript clients compile; deterministic drift and breaking changes are CI gates |
| 2D-03 | Done | Run hosting/PDF renderer feasibility spike | 2D-01 | Representative report passed repeated local and constrained-Linux tests, including container termination recovery; separate worker and initial concurrency one are owner-approved (D-022), while managed-provider evidence remains in G-02/2D-04 |
| 2D-04 | In progress | Compare and prove provider and authentication candidates | 2D-02, 2D-03 | Local comparison and guarded Cloud Run candidate are prepared. Execute the still-authorised managed commands in `STAGE_2D_04_PROVIDER_AUTH_PROOF.md`: bounded proof covering Australian region, portability, tenancy, invitations, MFA, revocation, private object upload, queue retry after instance termination, lifecycle/cold start, renderer sizing and actual per-report platform/storage cost; owner and technical review close G-02 |
| 2D-05 | Done | Prove Android encrypted Room storage | 2D-01 | Bounded SQLCipher/Room and Keystore proof passes twelve API 31 device tests for encryption, restart, schema migration, typed provider failure, authenticated database-state loss, concurrent first open and fail-closed key loss; independent correction review passed and G-04 is closed |
| 2D-06 | Backlog | Specify offline lease and evidence recovery | 2D-04, 2D-05 | State transitions and tests for expiry, revoked users, pending outbox/media and authorised recovery; resolves G-05 before pilot |

### Stage 3A foundation backlog

| ID | Ticket | Depends on | Acceptance boundary |
| --- | --- | --- | --- |
| 3A-01 | Scaffold Android, NestJS and Next.js workspaces | 2D-01, 2D-02 | Reproducible build/lint/test commands run locally and in CI |
| 3A-02 | Add database migrations and tenant isolation | 3A-01, G-03 | Company-scoped PostgreSQL schema; cross-tenant read/write tests fail closed |
| 3A-03 | Add invitation auth, roles and sessions | 3A-02, 2D-04 | Administrator MFA enforced; inspector/reviewer MFA optional; revocation and claims tested |
| 3A-04 | Add site, jurisdiction and anchor register APIs | 3A-02, G-01 | NSW/QLD recorded as context; no legal-rule engine or future-asset domain model |
| 3A-05 | Add job release, claim and assignment | 3A-03, 3A-04 | Atomic single-primary-inspector claim; office assignment and race tests; independent review retained |

### Stage 3B anchor vertical-slice backlog

| ID | Ticket | Depends on | Acceptance boundary |
| --- | --- | --- | --- |
| 3B-01 | Build Android sign-in and eligible-job list | 3A-03, 3A-05 | Inspector sees only authorised company jobs and explicit sync state |
| 3B-02 | Download and open a versioned job pack | 3B-01, G-04 | Encrypted local pack is usable offline and records its authorisation lease |
| 3B-03 | Capture anchor evidence, notes and photos | 3B-02 | Required fields, outcomes, exceptions and inspector input follow Stage 2B; local saves survive restart |
| 3B-04 | Review and queue submission | 3B-03 | Blockers/warnings are distinct; submission creates durable outbox work rather than claiming server success |

### Stage 3C offline and synchronisation backlog

| ID | Ticket | Depends on | Acceptance boundary |
| --- | --- | --- | --- |
| 3C-01 | Implement idempotent mutation outbox | 3B-04 | Retry/restart/duplicate tests preserve one logical mutation and visible state |
| 3C-02 | Implement durable photo upload queue | 3B-03, G-03 | Stable media IDs, resumable retry and no orphaned photo association |
| 3C-03 | Implement conflict and server-acknowledgement handling | 3C-01, 3C-02 | Conflict is visible; server acknowledgement gates local completion and cleanup |
| 3C-04 | Implement logout, lease expiry and revocation safety | 3C-03, 2D-06 | Logout never silently destroys pending evidence; empty-outbox cleanup and audited recovery paths are tested |

### Stage 3D review and reporting backlog

| ID | Ticket | Depends on | Acceptance boundary |
| --- | --- | --- | --- |
| 3D-01 | Build office review and change requests | 3C-03 | Review blockers and missing-information loops preserve authorship and history |
| 3D-02 | Build immutable approved snapshots | 3D-01 | Snapshot references evidence versions and cannot be rewritten in place |
| 3D-03 | Render deterministic draft report revisions | 3D-02, G-02 | Same approved snapshot is idempotent; each change creates a traceable revision |
| 3D-04 | Add audit export and controlled cleanup | 3D-03, G-06 | Export precedes authorised deletion; references and deletion events remain auditable |

### Stage 3E demonstration backlog

| ID | Ticket | Depends on | Acceptance boundary |
| --- | --- | --- | --- |
| 3E-01 | Add read-only future-asset preview cards | 3A-01 | Presentation-only cards have no create/edit workflow, rules or persistence domain |
| 3E-02 | Build fictional NSW and Queensland demo jobs | 3D-04, 3E-01 | Synthetic data demonstrates both contexts without asserting jurisdiction-specific compliance |
| 3E-03 | Prepare partner-validation package | 3E-02 | Script, open questions and evidence gaps cover inspector, reviewer and state differences |

## First execution slice

The recommended first slice is `2D-01` and then `2D-02`. This establishes the
workspace and the Android-to-backend contract boundary before domain code can
drift. `2D-03` may run in parallel after `2D-01`; its result must precede any
hosting/provider approval. The owner approved this order as D-019; the exact
`2D-01` workspace contract remains at its separate owner-approval gate.

## Stage 2D completion criteria

Stage 2D is complete when:

- every ticket has an owner/agent type, estimate and review path in the Kanban;
- G-01 through G-06 are represented as blocking board gates;
- acceptance commands are concrete once the workspace is scaffolded;
- the owner approves the execution order and first implementation slice; and
- deferred practitioner, legal and provider decisions remain visibly open.
