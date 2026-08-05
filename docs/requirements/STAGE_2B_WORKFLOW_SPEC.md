# Stage 2B Anchor Workflow Specification

Status: **complete for prototype specification** (2026-08-05), amended the
same day for the owner-approved New South Wales and Queensland scope.
Terminology, requiredness and authority remain subject to design-partner,
professional and legal validation.

This specification turns the Stage 2A.5 keep-bucket into a testable workflow
for installed single-point roof anchors in New South Wales and Queensland. It
does not define a certification process, decide compliance, interpret a
Standard, determine competence or authorise report issue.

## Product concepts

The product keeps these concepts separate so one value cannot silently stand
for several decisions:

| Concept | Meaning |
| --- | --- |
| Job workflow state | Where the office/field/review process is up to |
| Recorded outcome | Inspector-entered result for one anchor inspection |
| Exception reason | Why the expected inspection could not be completed normally |
| Register reconciliation | Proposed relationship between expected, discovered, duplicated or replaced anchors |
| Disposition | A recorded physical/organisational action such as removal from service |
| Synchronisation state | Whether local mutations and photographs reached the server |
| Review issue | A visible blocker, warning, conflict or requested change |
| Jurisdiction | Explicit supported site context (`NSW` or `QLD`), not an automatic legal conclusion |

No concept automatically sets another. In particular, a sync success is not a
review approval, a recorded outcome is not a compliance conclusion, and a
software disposition does not perform physical isolation. Jurisdiction does
not select inspection intervals, licence requirements, proof-test rules,
report authority or a compliance result.

## Roles and authority

| Role | Allowed workflow actions | Boundary |
| --- | --- | --- |
| Administrator | Manage company users/settings; perform office-reviewer actions when authorised by the company | Product role does not establish technical competence |
| Office reviewer | Prepare registers/jobs, assign one primary inspector, review submitted revisions, request changes, approve a complete snapshot for draft generation and generate draft revisions | Cannot silently rewrite inspector evidence or make the product issue a compliance conclusion |
| Inspector | Download assigned jobs, record evidence/outcomes/exceptions/reconciliation proposals, save offline and submit an inspection revision | Cannot use the app to approve its own submission or issue a final certificate |

Every server action is company-scoped and role-authorised. The initial pilot
assumes one primary inspector edits a downloaded job offline.

## Job workflow lifecycle

Download and sync conditions are tracked separately from this lifecycle.

| State | Entered when | Allowed next state |
| --- | --- | --- |
| Draft | Office creates the job and prepares its register snapshot | Assigned |
| Assigned | Office assigns one primary inspector | In progress |
| In progress | Inspector starts or resumes the working inspection revision | Submitted |
| Submitted | Submission intent and inspection revision reach the server | Under review |
| Under review | Reviewer starts review of the submitted revision | Changes requested; Approved for report generation |
| Changes requested | Reviewer records one or more required changes | In progress |
| Approved for report generation | Reviewer completes all approval gates for an exact inspection snapshot | Report generated; Changes requested |
| Report generated | Connected generation creates an immutable draft report revision | Changes requested when a corrected inspection revision is needed |

Transition rules:

1. Assignment identifies one primary inspector and a server-side job-pack
   version.
2. Downloading a pack does not change the job workflow state.
3. Offline submission records durable local intent; `Submitted` is the server
   state after that intent and its inspection revision synchronise.
4. A changes request records reviewer, time, reason and affected records. The
   inspector edits a new working revision; submitted history remains visible.
5. Approval records reviewer, time and exact source snapshot. It is approval
   only for prototype draft generation, not certification or client issue.
6. A later correction creates a new inspection and report revision. The prior
   report file never changes and may be marked superseded only after the new
   revision exists.

## Office preparation

Before assignment, the office records or selects:

- company, client, site, supported jurisdiction (`NSW` or `QLD`) and job identity;
- one primary inspector and planned visit context;
- the expected anchor register snapshot with stable IDs and available history;
- known location, label/register ID, type, manufacturer/model and install notes;
- site access notes and human-entered interval/last/next-due context when used;
- source/import references when available.

Missing register details are visible but do not become invented values. The
assigned job pack is versioned so later office changes can produce an explicit
update or conflict instead of silently replacing local work.

## Anchor-first field capture

The inspector works from the expected anchor list. Every expected anchor must
have one coverage record before local submission:

- a completed anchor inspection; or
- `Not inspected` with an exception reason.

A completed anchor inspection records identity/location confirmation,
observations, notes as needed, one provisional recorded outcome, associated
photographs when captured, defects, recommendations and optional recorded
proof-test evidence when a test was performed.

Local saves must survive restart and temporary connectivity loss. Every photo
uses a stable local ID and remains bound to its anchor-inspection record through
upload, retry and report generation.

### Recorded outcome model

These values are provisional workflow vocabulary, not legally validated domain
truth:

| Recorded outcome | Minimum companion evidence |
| --- | --- |
| Serviceable | Observations supporting the inspector-entered result |
| Defective | At least one defect description and supporting observation |
| Not inspected | One exception reason; no serviceability implication |
| Further assessment required | Reason and recommended follow-up or review note |

The product never derives these values from photographs, fields, dates,
manufacturer data or standards material.

### Exception and reconciliation model

| Situation | Record as | Required handling |
| --- | --- | --- |
| Anchor cannot be safely reached | Outcome `Not inspected`; exception `Inaccessible` | Record reason and available context/photo |
| Expected anchor cannot be found | Outcome `Not inspected`; exception `Unable to locate` | Preserve expected register item; record search/location context |
| Label is absent, illegible or identity conflicts | Explicit identity issue | Do not silently merge; preserve evidence for review |
| Anchor exists onsite but not in the pack | Newly discovered provisional anchor | Create stable provisional ID, location and evidence; reviewer decides register action |
| Existing anchor appears replaced | Replacement proposal linking old and new records | Preserve old history; reviewer confirms or rejects link |
| Two records may represent one anchor | Duplicate proposal | Keep both identities until office review resolves them |
| Inspector records physical isolation | Disposition `Removed from service` | Record actor, time and note; software does not perform or verify isolation |

`Newly discovered`, `Replaced` and `Removed from service` are not substitutes
for the recorded outcome. This separation preserves what was observed, what
could not be inspected, and what organisational action was taken.

### Optional proof-test evidence

The MVP does not decide whether a proof test is required. If the inspector
records that one was performed, the record captures the entered load, hold,
result, equipment/reference and associated evidence. Missing companion values
become review issues; the application does not calculate a pass or compliance
result.

## Submission and synchronisation

Local submission is allowed when every expected anchor is accounted for and
the conditional field relationships above are internally complete. The app
then freezes the submitted local revision and queues idempotent mutations and
photograph uploads.

Visible mutation states are `local`, `pending`, `synchronising`, `synchronised`,
`failed` and `conflict`. Visible photo states are `pending upload`, `uploaded`
and `failed`. Retry uses the same stable mutation/upload identity and must not
duplicate records.

The reviewer may inspect a server-submitted revision while uploads complete,
but cannot approve it for report generation until all hard blockers are clear.

## Office review

### Hard blockers

- the site jurisdiction is missing, unsupported or inconsistent with the job pack;
- an expected anchor has no coverage record;
- an anchor inspection has no recorded outcome;
- `Not inspected` has no exception reason;
- `Defective` has no defect description;
- a newly discovered or replacement proposal lacks identity/location context;
- a recorded proof test lacks its conditional companion fields;
- a photo is orphaned, failed, pending upload or has an integrity failure;
- a mutation is pending, failed or in conflict;
- a requested change remains open; or
- the reviewer lacks company/role access.

### Warnings requiring reviewer disposition

- an inspected anchor has no associated photograph;
- manufacturer/model, label or install context is unknown;
- human-entered interval or due-date context lacks a source;
- observation detail appears insufficient for the recorded outcome; or
- a register identity/reconciliation proposal remains uncertain.

Because the mandatory shot list and several fields are not partner-validated,
a reviewer may resolve a warning only by recording a reason. Resolving a
warning does not alter inspector evidence. Hard blockers cannot be waived.

The reviewer can request changes against specific records or approve the exact
snapshot for draft generation. All review actions are append-only audit events.

## Draft report specification

Connected generation is available only from `Approved for report generation`.
The first template is titled **Prototype Draft Inspection Report** and displays
`Draft` prominently.

The snapshot includes, where recorded:

1. company, client, site, jurisdiction, job, inspection dates and revision identifiers;
2. inspector, reviewer and generation details;
3. expected anchor register and reconciliation notes;
4. per-anchor identity/location, observations, recorded outcome, exception,
   disposition, photographs, defects, recommendations and optional test data;
5. warnings/limitations and their recorded reviewer disposition;
6. human-entered interval/last/next-due context labelled as recorded data; and
7. template version, report revision and prototype disclaimer.

Use this disclaimer:

> This report was generated using an early-stage inspection workflow prototype. Inspection outcomes, technical decisions and report approval remain the responsibility of the inspecting organisation and its authorised personnel.

Do not label the document or an anchor `certified`, `compliant`, `passed for 12
months`, engineer-approved or standards-approved. The product may display the
human-entered outcome `Serviceable` as a recorded outcome with its source
inspector and revision.

Each generated revision stores an immutable file, exact inspection snapshot,
template version, revision number, creation time, creating user, reviewer and
audit references. A correction creates a new revision; no later edit mutates a
prior file. `Issued`, if a partner uses it, remains outside automatic product
workflow and requires a later authority decision.

## Acceptance scenarios for later implementation

1. A site selected as `NSW` or `QLD` retains that jurisdiction in its job pack,
   inspection snapshot, review, export and report without deriving legal rules.
2. An assigned inspector can save one anchor inspection and photo offline,
   restart the app and recover the same association.
3. An expected anchor recorded as unable to locate is preserved in history and
   cannot be mistaken for an inspected/serviceable anchor.
4. A newly discovered anchor receives a stable provisional ID and cannot merge
   into an existing anchor without review.
5. A replacement proposal preserves the old anchor history and both identities.
6. Replaying the same mutation/upload has one server effect.
7. A concurrent identity or outcome edit creates a visible conflict rather than
   last-write-wins replacement.
8. A failed or pending photo upload blocks approval for report generation.
9. A reviewer request creates a new working inspection revision and preserves
   the submitted revision.
10. Generating the same approved snapshot/template is reproducible, and a later
   correction creates a distinct immutable report revision.
11. Cross-company users cannot access the job pack, evidence, review, export or
    report file.

## Design-partner questions

Stage 2B deliberately leaves these open:

- exact outcome/exception words and meanings (A-005);
- mandatory photographs and acceptable no-photo reasons (A-004);
- product-specific checks and proof-test applicability (A-009, A-010);
- reviewer/approver/issuer authority and change ownership (A-012);
- report layout, disclaimer, signature and issue language (A-013, A-014);
- offline duration, device limits and photo volume (A-018, A-019);
- register import/export formats and handover package (A-020, A-021);
- state-specific workflow, authority and terminology differences, validated by
  a practitioner in each supported state (A-022); and
- retention, deletion, credential and professional-review policy.

Answers must be captured as evidence and promoted through the assumptions and
decision logs; one participant preference does not silently become a product
rule.

## Stage 2B exit and Stage 2C input

Stage 2B is complete when the lifecycle, concept separation, capture rules,
exceptions, review gates, draft report behavior, acceptance scenarios and open
partner questions are explicit. This document meets that repository-level
criterion; operational validation remains open.

Stage 2C should now define the technical blueprint that can implement these
rules: component boundaries, tenant-authorised API, relational schema,
encrypted Android job pack/outbox, private media lifecycle, conflict protocol,
snapshot/report pipeline, explicit jurisdiction propagation and automated test
strategy. It must not begin feature implementation, add a jurisdiction rules
engine or broaden the MVP.
