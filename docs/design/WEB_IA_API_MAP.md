# Web IA ↔ API map (`design/DESIGN.md` §6.2)

Status: produced for the web IA data-needs discovery (#80, epic #32). It maps
each redesigned web screen's needed reads and actions onto the contracts that
actually exist today. Nothing here implements an endpoint, changes a contract
or adds application code; missing reads become the linked follow-up tickets and
the web IA tickets use typed fixtures until those land.

Sources of truth used for this map, read fresh from the repository:

- Screen needs: [`design/DESIGN.md`](../../design/DESIGN.md) §6.2
  (Dashboard, Jobs list/detail, Review workspace, Site › Anchor register,
  Reports).
- Contract: [`contracts/openapi/v1/openapi.json`](../../contracts/openapi/v1/openapi.json)
  (operationIds are quoted below; the file is the generated source of truth).
- Controllers: `apps/api/src/<module>/<module>.controller.ts` files quoted
  below.
- Web client methods: [`apps/web/src/lib/office-api.ts`](../../apps/web/src/lib/office-api.ts).

## How to read the status column

- `ready` — contract operation, API controller and web client method all
  exist; the screen need can be served without further API work.
- `client gap` — contract and controller exist; `office-api.ts` has no method
  yet. Adding that method is ordinary UI-ticket work (T9/T10/T11), not
  contract work, so no follow-up API ticket is filed.
- `partial` — some of the need is served by existing reads; the remainder is
  listed with its follow-up ticket.
- `fixture-only — #N` — no contract exists; the UI uses typed fixtures until
  the linked follow-up ticket lands. No endpoint was invented here.

Guardrails that apply to every row: every call is a bearer session plus the
`x-company-id` header, and tenant scoping plus product role are enforced at
the API (see `apps/api/src/identity/auth-http.ts`); product roles are
`administrator`, `office_reviewer` and `inspector`. The recorded jurisdiction
(`NSW` / `QLD`) is carried on job, site, snapshot and generation records and
is display context only; it drives nothing. Evidence submitted by an inspector
is read-only everywhere in the office; review records append-only issues.

## Existing contract inventory the office web can already call

| Contract operation | Controller | Web client method in `office-api.ts` |
| --- | --- | --- |
| `createSession` (`POST /auth/sessions`) | `apps/api/src/identity/auth.controller.ts` | `openOfficeSession` |
| `listJobs` (`GET /jobs`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | `listJobs` |
| `getJob` (`GET /jobs/{jobId}`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | — |
| `downloadJobPack` (`GET /jobs/{jobId}/pack`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | — |
| `createJob` (`POST /jobs`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | — |
| `releaseJob` (`POST /jobs/{jobId}/release`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | — |
| `assignJob` (`POST /jobs/{jobId}/assignment`) | `apps/api/src/job-workflow/job-workflow.controller.ts` | — |
| `listReviewIssues` (`GET /reviews/inspections/{inspectionId}/issues`) | `apps/api/src/review/review.controller.ts` | `listReviewIssues` |
| `createReviewIssue` (`POST /reviews/issues`) | `apps/api/src/review/review.controller.ts` | `createReviewIssue` |
| `listReviewActions` (`GET /reviews/issues/{reviewIssueId}/actions`) | `apps/api/src/review/review.controller.ts` | — |
| `resolveReviewIssue` (`POST /reviews/issues/{reviewIssueId}/resolve`) | `apps/api/src/review/review.controller.ts` | `resolveReviewIssue` |
| `approveInspectionRevision` (`POST /approvals`) | `apps/api/src/approved-snapshot/approved-snapshot.controller.ts` | `approveInspection` |
| `getApprovedSnapshot` (`GET /approvals/{snapshotId}`) | `apps/api/src/approved-snapshot/approved-snapshot.controller.ts` | `getApprovedSnapshot` |
| `requestDraftReportGeneration` (`POST /reports/generations`) | `apps/api/src/reports/report-generation.controller.ts` | `requestDraftReportGeneration` |
| `getDraftReportGeneration` (`GET /reports/generations/{generationId}`) | `apps/api/src/reports/report-generation.controller.ts` | `getDraftReportGeneration` |
| `downloadDraftReport` (`GET /reports/generations/{generationId}/file`) | `apps/api/src/reports/report-generation.controller.ts` | `getDraftReportFile` (streamed by `apps/web/src/app/office/(shell)/reports/[generationId]/file/route.ts`) |
| `listClients` / `getClient` / `createClient` / `updateClient` | `apps/api/src/site-register/site-register.controller.ts` | — |
| `listSites` / `getSite` / `createSite` / `updateSite` | `apps/api/src/site-register/site-register.controller.ts` | — |
| `listAnchors` / `getAnchor` / `createAnchor` / `updateAnchor` | `apps/api/src/site-register/site-register.controller.ts` | — |
| `submitSyncMutation` (`POST /sync/mutations`) and photo chunk uploads | `apps/api/src/sync/sync.controller.ts` | — (Android field path; office never calls these) |

The current built web surface (T8 shell) renders the job list from `listJobs`
and a review page that reads `listReviewIssues` and offers request-changes,
resolve, approve and generate-report actions; everything else in §6.2 is not
built yet.

## Dashboard (§6.2)

| Screen need | Existing endpoint and client method | Status | Tenant/role note |
| --- | --- | --- | --- |
| Counter: awaiting review | `listJobs` (`GET /jobs`); count `workflowStatus` client-side | ready | Manager roles see all company jobs; inspectors only released/assigned jobs |
| Counter: changes requested | `listJobs`; `workflowStatus: changes_requested` | ready | Same role split |
| Counter: released not started | `listJobs`; `workflowStatus: released` | ready | Same role split |
| Counter: failed sync / conflicts | No job-level conflict or sync-failure read | fixture-only — #81 | Conflicts are currently visible only in the sync mutation response to the inspector, or as `conflict` review issues per inspection once an inspection id is known |
| Needs-you table: job, site, status | `listJobs` (reference, `siteId`, status) + `listSites` for names (`GET /sites`) | client gap (add `listSites` in T9) | Site reads are administrator/office reviewer only |
| Needs-you table: inspector name | `assignment.inspectorUserId` on `JobResponseDto`; no company user read exists | fixture-only — #87 | `GET /auth/me` returns only the signed-in user |
| Needs-you table: submitted at | Not on `JobResponseDto` | fixture-only — #81 | Comes with the submitted-inspection revision read |
| Needs-you table: anchors / accounted | `downloadJobPack` (`GET /jobs/{jobId}/pack`) gives expected anchors; accounted count needs submissions | fixture-only — #81 | Pack read is inspector-facing today (`assertInspector`); office needs the submission-side count |
| Needs-you flags (defective, photo pending, further assessment, conflict, clean) | No read of anchor-level recorded outcomes; `listReviewIssues` covers raised issues per known inspection | fixture-only — #81 | Flags must derive from stored outcomes, never from a UI guess |
| Action: Review / Resolve | Navigation into the review surface; issue reads/actions are ready (`listReviewIssues`, `createReviewIssue`, `resolveReviewIssue`) | partial | Evidence display behind the action waits on #81 |
| Right rail: field activity (inspector, job, accounted, last sync) | No submission/sync read | fixture-only — #81 | The web shows recorded sync state only; device presence is not a server concept |
| Right rail: reports (latest generated) | `listDraftReportGenerations` (`GET /reports/generations`, newest first; optional `?jobId=`) — landed after this map was written as #83 | client gap (wire in T11) | Report reads are administrator/office reviewer only |
| Global search: jobs, sites, clients | `listJobs`, `listSites`, `listClients` (client-side filtering) | partial | Anchor labels have no company-wide read — #88 |
| New job | `createJob` (`POST /jobs`); site and client pickers need `listSites` / `listClients` | client gap | Job create and register reads are manager roles |

## Jobs list / job detail (§6.2)

| Screen need | Existing endpoint and client method | Status | Tenant/role note |
| --- | --- | --- | --- |
| List rows with status pill | `listJobs` + `StatusPill` | ready | Role split as above |
| Filters: status, inspector, site, date | `listJobs` returns all authorised jobs; filter client-side | ready (documented decision) | Server-side query parameters are not required for the MVP list sizes; revisit only if a partner needs them |
| Detail header + workflow stepper | `getJob` (`GET /jobs/{jobId}`) | client gap (add `getJob` in T9) | Same role split as list |
| Tab: anchors with recorded outcomes | `downloadJobPack` gives register anchors; recorded outcomes unreadable | fixture-only — #81 | Outcomes live on submitted inspections |
| Tab: pack versions | Only current `jobPackVersion` on `JobResponseDto` | fixture-only — #86 | No version history read |
| Tab: assignment | `assignment` embedded in `JobResponseDto` | ready (display name via #87 later) | Assignment mutations are manager roles |
| Tab: timeline | No job event read | fixture-only — #86 | Audit events exist but are not exposed |
| Primary action: release | `releaseJob` (`POST /jobs/{jobId}/release`) | client gap (add in T9) | Administrator/office reviewer only |
| Primary action: assign | `assignJob` (`POST /jobs/{jobId}/assignment`) | client gap + #87 for the eligible-inspector picker | Server validates eligible inspectors; the web still needs the member list |
| Primary action: open review | Navigation; needs the job's current inspection id | fixture-only — #81 | The id exists only on the submission record today |
| Primary action: generate report | `requestDraftReportGeneration` (`POST /reports/generations`) | ready (method `requestDraftReportGeneration`) | Requires an approved snapshot; approval endpoint refuses with 409 while gate blockers remain |

## Review workspace (§6.2)

| Screen need | Existing endpoint and client method | Status | Tenant/role note |
| --- | --- | --- | --- |
| Header: breadcrumb, status pill | `getJob` | client gap (add `getJob` in T10) | Manager roles |
| Header: "Submitted by … · time" | No submission read | fixture-only — #81 (+ name via #87) | Submission identity lives on the inspection record |
| Request changes (one bundle per anchor set) | `createReviewIssue` (`POST /reviews/issues`) supports per-anchor `anchorInspectionId` | ready (method `createReviewIssue`) | The bundle can be sequential issue creation; no atomic batch endpoint is required for §6.2 — if the owner later wants all-or-nothing creation, raise it as its own decision |
| Approve for report (gate-enforced) | `approveInspectionRevision` (`POST /approvals`) | ready (method `approveInspection`) | Server re-derives gate state and refuses 409 on hard blockers, open change requests or unsynchronised evidence; caller counts are never trusted |
| Gate display: "n blockers remaining" | `listReviewIssues` covers raised blockers/warnings/conflicts/changes; unsynchronised-evidence and photo-pending states are not readable | partial — complete with #81 | Never present the gate as a pass/fail verdict; it lists what still blocks the snapshot freeze |
| Pane 1: anchor rows, outcome tiles, sub-badges, chips | No anchor-level evidence read | fixture-only — #81 | Keyboard J/K/F is UI-only |
| Pane 2: large photo + thumbnail strip | `getInspectionPhotoMedia` (`GET /reviews/inspections/{inspectionId}/photos/{photoId}/file`) — landed as #82 | ready (wire in T10) | Photo bytes stay private; served through the office session boundary with the recorded content type |
| Pane 2: fact sheet (recorded outcome, label match, identity/location confirmation, defect, recommendation, proof test, observations, captured, sync) | No evidence read | fixture-only — #81 | Fields exist in the sync submission payload; nothing reads them back for the office |
| Pane 2: previous-inspection card | `getPreviousAnchorInspectionRevision` (`GET /reviews/anchor-inspections/{anchorInspectionId}/previous-revision`) — landed as #85 | ready | Office reviewer/Administrator; 404 when the anchor inspection is unknown or no earlier submitted revision exists |
| Pane 3: comments on `ANC-xxxx` + request-change toggle | `listReviewIssues` + `createReviewIssue` + `resolveReviewIssue` | ready | Append-only; issues never rewrite submitted evidence |
| Pane 3: review log | `listReviewActions` (`GET /reviews/issues/{reviewIssueId}/actions`) | client gap (add in T10) | Manager roles only |

## Site › Anchor register (§6.2)

| Screen need | Existing endpoint and client method | Status | Tenant/role note |
| --- | --- | --- | --- |
| Site header + recorded-jurisdiction chip | `getSite` (`GET /sites/{siteId}`) carries `jurisdiction` | client gap (add `getSite` in T11) | Chip is display context only; it drives nothing |
| Edit site | `updateSite` (`PATCH /sites/{siteId}`) | client gap | Manager roles |
| Tab: anchor register table (label, location, type, register status) | `listAnchors` (`GET /sites/{siteId}/anchors`) | client gap | Manager roles; contract enum is `active` / `inactive` / `archived` |
| Table: last recorded outcome + last inspected | `listAnchorRecordedOutcomes` (`GET /reviews/anchors/{anchorId}/recorded-outcomes`) — landed as #85 | ready | Office reviewer/Administrator; the newest returned entry supplies both columns client-side |
| Table: "Proposed" rows | Proposals are not in the register table until accepted; `listReconciliationProposals` (`GET /sites/{siteId}/reconciliation-proposals`) — landed as #84 | ready | Proposals come from submitted inspections through sync; "Proposed" is proposal state, not a `registerStatus` value |
| Table: "Removed from service" presentation | `registerStatus` has no such value; inspections carry a `removed_from_service` disposition | partial | Mapping is a T11 display decision over existing fields; no new contract value is filed |
| Tab: jobs | `listJobs` filtered by `siteId` client-side | ready | Same role split as dashboard |
| Tab: roof plan (optional per §6.2) | No storage, upload or read anywhere | fixture-only — #89 (owner-approval; §6.2 marks it optional) | Needs an owner decision before any contract work |
| Tab: history | No register history read | fixture-only — #86 | Audit events exist but are not exposed |
| Proposal banner + slide-over list | `listReconciliationProposals` (`GET /sites/{siteId}/reconciliation-proposals`) — landed as #84 | client gap (wire in T11) | Administrator/office reviewer only; open proposals only |
| Slide-over: photo + inspector note | Inspector note and photo metadata are on each proposal read; photo bytes stream through `getInspectionPhotoMedia` (`GET /reviews/inspections/{inspectionId}/photos/{photoId}/file`) — landed as #82 | ready (wire in T11) | The note is the recorded inspector note; byte access is a separate office session route |
| Action: accept into register / reject with reason | `decideReconciliationProposal` (`POST /sites/{siteId}/reconciliation-proposals/{proposalId}/decision`) — landed as #84 | client gap (wire in T11) | One decision per proposal; accept writes the register anchor change and reject records a reason, both append-only audit events |
| Action: assign label / location on a proposal | The decision action carries `assignedLabel` / `location`; later edits use `updateAnchor` (`PATCH /sites/{siteId}/anchors/{anchorId}`) | client gap (wire in T11) | Accept of a newly discovered proposal creates the anchor; accept of a replacement or duplicate updates the referenced anchor |
| Anchor history drawer | `listAnchorRecordedOutcomes` (`GET /reviews/anchors/{anchorId}/recorded-outcomes`) — landed as #85 | ready | Office reviewer/Administrator; photo metadata only, photo bytes stream through the #82 photo file route |
| Action: new job from register | `createJob` | client gap | Manager roles |

## Reports (§6.2)

| Screen need | Existing endpoint and client method | Status | Tenant/role note |
| --- | --- | --- | --- |
| Chips: all / generated / superseded / awaiting generation | `listDraftReportGenerations` (`GET /reports/generations`, optional `?jobId=`) — landed after this map was written as #83 | ready (chips filter client-side over `status`) | Administrator/office reviewer only; single `getDraftReportGeneration` also exists |
| Table: job, site | `jobId` on each `ReportGenerationResponseDto`; names need `listJobs` / `listSites` joins | client gap | Manager roles |
| Table: revision, status, generated | `revisionNumber`, `status`, `requestedAt` on `ReportGenerationResponseDto` | ready | Statuses include `superseded`; superseded files stay unchanged |
| Table: "Approved by" | `getApprovedSnapshot` (`GET /approvals/{snapshotId}`) carries `approvedByUserId`; display name needs #87 | partial | This is the reviewer who recorded the approval freeze — not an engineering sign-off |
| Action: download PDF | `downloadDraftReport` + the server-side web route | ready | Bytes stream through the office session boundary; no public URLs |
| Action: view snapshot | `getApprovedSnapshot` returns freeze metadata (ids, checksums, source revision) | partial | Full frozen-evidence display would ride on #81 scoped to the frozen revision |
| Action: open review | Navigation via `sourceInspectionId` on the approved snapshot | ready | Issue reads/actions are ready |
| Footnote copy (single page disclaimer) | Copy is a T11 UI concern | no data gap | Draft-report wording stays in one place per §7 |

## Confirmed contract gaps and their follow-up tickets

There are data gaps; the sections above name them per row. Consolidated:

- #81 — office read of a submitted inspection revision and its anchor
  evidence (blocks dashboard flags/counters, review panes 1–2, gate display,
  register last-outcome columns). Landed after this map was written: the
  company-scoped read `getSubmittedInspectionEvidence`
  (`GET /reviews/inspections/{inspectionId}/evidence`) returns the revision
  header with its evidence synchronisation state, per-anchor recorded
  evidence and photo metadata, and recorded counts for expected/accounted
  anchors, open review issues and pending/failed photo uploads. Photo bytes
  landed as #82; the submitted-inspection queue remains open; the per-row
  statuses above record the map-time state.
- #82 — office read of inspection photo media (blocks review pane 2 and the
  proposal slide-over photo). Landed after this map was written: the
  company-scoped read `getInspectionPhotoMedia`
  (`GET /reviews/inspections/{inspectionId}/photos/{photoId}/file`) streams
  one uploaded evidence photo's private bytes with its recorded content type
  for Administrator and Office reviewer roles through the office session
  boundary; there is still no public or pre-signed URL and no web call-site
  change, which remains a later design-system ticket.
- #83 — list draft report generations per company and job (blocks the Reports
  screen and the dashboard reports rail). Landed after this map was written:
  the company-scoped read `listDraftReportGenerations`
  (`GET /reports/generations`, optional `?jobId=`) returns the existing
  `ReportGenerationResponseDto` shape per revision, newest first; the
  generated Kotlin/TypeScript clients include the method, and the Reports
  screen itself remains T11 UI work.
- #84 — read reconciliation proposals and record accept/reject decisions.
  Landed after this map was written: the company-scoped read
  `listReconciliationProposals`
  (`GET /sites/{siteId}/reconciliation-proposals`) returns open proposals
  per site with the submitted anchor inspection context (provisional anchor,
  inspector note, photo metadata, submitted by/at), and
  `decideReconciliationProposal`
  (`POST /sites/{siteId}/reconciliation-proposals/{proposalId}/decision`)
  records one accept or reject decision per proposal as append-only audit.
  Accept creates or updates the referenced register anchor with the
  assigned label/location; reject records a recorded reason. Photo bytes
  landed as #82 and the register history columns landed as #85.
- #85 — read per-anchor recorded-outcome history and the previous inspection
  revision. Landed after this map was written: `listAnchorRecordedOutcomes`
  (`GET /reviews/anchors/{anchorId}/recorded-outcomes`) returns one register
  anchor's recorded outcomes across its submitted inspection revisions
  (recorded outcome, exception reason, disposition, submitted at, job id and
  reference, photo metadata), newest first, and
  `getPreviousAnchorInspectionRevision`
  (`GET /reviews/anchor-inspections/{anchorInspectionId}/previous-revision`)
  returns the submitted revision recorded immediately before one anchor
  inspection for the same register anchor. Both reads are read-only,
  company-scoped and enforced for Administrators and Office reviewers.
- #86 — read job timeline, job pack versions and site register history
  (blocks job detail Timeline/Pack versions tabs and the site History tab).
- #87 — read company users for display names and eligible inspectors (blocks
  the Needs-you inspector column, assignment picker, "Submitted by …" and the
  reports approver column).
- #88 — company-wide anchor label lookup for dashboard global search.
- #89 — roof plan upload with per-label pins, optional per §6.2 and held for
  owner approval.

T9 (#42), T10 (#44) and T11 (#45) stay UI-only and use typed fixtures for
every `fixture-only` row until the matching ticket lands.

## Where there is no gap

Stated explicitly so later tickets do not re-litigate it:

- Review issue creation, resolution and action history are fully covered by
  the existing review endpoints and current client methods.
- The approval action and its server-side gate enforcement, plus draft report
  request, list, status, supersede and PDF download, are fully covered.
- Job workflow mutations the office needs (create, release, assign) exist; the
  web only lacks client methods for them.
- Register CRUD (clients, sites, anchors) exists for every §6.2 mutation the
  register screens perform; only proposal decisions, history and outcome
  columns need new reads.
- Job list filtering and the site jobs tab can stay client-side over
  `listJobs` for the MVP; no server query parameters are filed as a gap.

## Vocabulary guardrails for implementing UIs

- Keep the recorded-outcome vocabulary; the product never presents an
  outcome, a gate or a report as a formal determination of its own or on
  behalf of any practitioner role.
- The gate lists what still blocks freezing a snapshot; approval records a
  reviewer decision and freezes the submitted revision.
- The jurisdiction chip stays a recorded value with no derived rules.
- Reports are draft records generated from an approved snapshot; corrections
  create a new revision and earlier revisions remain available.
