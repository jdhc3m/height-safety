# 2D-01 Repository Workspace and Quality Contract

Status: **approved and complete**, 2026-08-10 (D-020)

## Objective

Define where each application, generated client and infrastructure adapter will
live, and give people, agents and CI one stable set of root validation commands.
This ticket defines the contract only. Application scaffolding belongs to
`3A-01`; the minimal contract proof in `2D-02` may create only the files needed
to demonstrate OpenAPI generation.

## Proposed workspace

```text
height-safety/
├── apps/
│   ├── android/                 # Kotlin, Compose, Room and WorkManager
│   ├── api/                     # NestJS modular-monolith API
│   │   └── migrations/          # ordered, source-controlled DB migrations
│   └── web/                     # Next.js office application
├── clients/
│   ├── kotlin/                  # generated Android API client; no manual edits
│   └── typescript/              # generated web API client; no manual edits
├── contracts/
│   └── openapi/                 # API-generated, checked-in contract/config
├── fixtures/
│   └── reports/                 # fictional representative PDF-spike inputs
├── infra/                       # portable deployment and provider adapters
├── tools/                       # root orchestration and repository checks
└── docs/                        # product, evidence, requirements and decisions
```

The TypeScript applications and generated TypeScript client use one root
JavaScript workspace and lockfile. Android remains a Gradle build with its
wrapper checked into the repository. The root scripts call both ecosystems so
agents and CI do not need different entry points.

NestJS routes and DTOs under `apps/api/` are the OpenAPI source of truth. The
versioned document under `contracts/openapi/` is generated from that source,
checked in and reviewed in pull requests; agents must not hand-author a
competing schema-first contract. Ordered database migrations live under
`apps/api/migrations/`, are checked in and are reviewed alongside the domain or
schema change that requires them.

Generated clients are separate from Android Room entities, application domain
models and NestJS DTOs. Provider SDKs remain below `infra/` or an
application-owned adapter; domain modules do not import them directly.

## Root command contract

The scaffold must eventually provide these stable commands:

| Command | Contract |
| --- | --- |
| `tools/bootstrap.sh` | Verify pinned runtimes and install locked dependencies without adding or upgrading packages. |
| `tools/format.sh --check` | Check formatting across documentation, TypeScript and Kotlin without rewriting files. |
| `tools/lint.sh` | Run static analysis for shell, TypeScript, NestJS/Next.js and Kotlin. |
| `tools/test.sh` | Run unit and repository-level tests; later include PostgreSQL integration suites. |
| `tools/contracts.sh --check` | Generate OpenAPI and both clients in a temporary location, lint the contract and fail on committed-output drift or incompatible changes. |
| `tools/verify.sh` | Run documentation, formatting, lint, contract and test checks used as the merge gate. |

The existing `tools/verify-docs.sh` remains the documentation check and is
called by `tools/verify.sh`. Scripts must fail fast, produce non-interactive CI
output and avoid requiring production secrets. Exact runtime and dependency
versions are selected and pinned when the minimal scaffold is created.

`2D-02` must select and document the runtime-pinning mechanism used by
`tools/bootstrap.sh`: for example, one repository-level tool-version manifest
or explicit Node.js/JDK version files plus script checks. It must cover the
Node.js runtime, Java/JDK, JavaScript package manager and checked-in Gradle
wrapper. The mechanism remains open in `2D-01`; silently using whatever happens
to be installed on an agent or developer machine is not permitted.

The proposed resolution is documented in
`STAGE_2D_02_OPENAPI_PIPELINE.md`; it remains subject to its owner-approval gate.

## CI boundaries

CI may run these jobs in parallel after dependency restoration:

1. documentation and repository policy;
2. OpenAPI and generated-client drift;
3. backend lint/tests;
4. web lint/tests;
5. Android lint/tests; and
6. PostgreSQL/storage integration tests when those components exist.

A pull request cannot merge unless every applicable job passes. Path filters
may save time on a branch, but the default branch still runs the complete
`tools/verify.sh` contract. Generated output, lockfiles and database migrations
are reviewed source artifacts, not CI-only files.

## Ownership and handoff

- Primary agent type: platform/repository builder.
- Review agent type: independent repository reviewer.
- Owner approval: workspace layout and root command names.
- Estimate after approval: half a day for the contract proof; application
  scaffolding is estimated separately under `3A-01`.
- Handoff to `2D-02`: approved paths, root contract command and generated-code
  ownership rules.

An agent finishing implementation moves the ticket to `Review`. The reviewer
must show command output, changed paths, dependency/lockfile changes and any
deviation from this contract before it can become `Done`.

## Acceptance scenarios

`2D-01` is complete when:

- the owner approves the workspace and root command interface;
- `2D-02` can add its minimal proof without choosing a cloud provider;
- migrations have one source-controlled location under `apps/api/`;
- NestJS code is the declared OpenAPI source of truth;
- Android and TypeScript generated clients have explicit destinations;
- feature/domain code remains outside this ticket; and
- documentation verification and `git diff --check` pass.

## Approved decision

The owner approved the proposed `apps/`, `clients/`, `contracts/`, `fixtures/`,
`infra/`, `tools/` and `docs/` layout, with `tools/verify.sh` as the single
merge-gate entry point (D-020).
