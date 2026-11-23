# Anchor MVP Requirements

Stage 2B workflow authority:
`docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`. Values below remain provisional
until design-partner validation.

## Roles

- Administrator: company settings and users.
- Office reviewer: clients, sites, anchor register, jobs, assignments, review,
  exports and draft reports.
- Inspector: eligible job claims, assigned/downloaded jobs, field evidence and
  submission.

Inspector authority to certify or issue compliance certificates is not assumed.

The prototype may display read-only future-asset previews for industry
discussions. Previewed assets have no register, inspection, evidence, report or
compliance behavior.

## Functional requirements

Office must create clients/sites with an explicit supported jurisdiction
(`NSW` or `QLD`), add or import anchors, create/release jobs, assign inspectors
or manage inspector claims, inspect sync failures/conflicts, request changes,
review submissions and generate immutable draft report revisions. Mobile must
download claimed/assigned job packs, show site jurisdiction and anchor register,
durably save observations/notes/photos/
defects/recommendations/outcomes, support inaccessible/unable-to-locate/new
anchors, show sync states and submit for review.

## Provisional values

Recorded outcomes: Serviceable, Defective, Not inspected and Further assessment
required. Exceptions include Inaccessible and Unable to locate. Newly
discovered, duplicate and replacement cases are register-reconciliation
proposals. Removed from service is a recorded disposition. These concepts do
not automatically set one another.

Job workflow: Draft, Released, Assigned, In progress, Submitted, Under review,
Changes requested, Approved for report generation and Report generated. Download,
mutation, photo and conflict states are synchronisation concerns; Superseded is
a report-revision condition rather than a job workflow state.

## Acceptance constraints

Every tenant record is company-scoped and server-authorised. Retries are
idempotent. Photos and notes remain tied to correct anchor inspection. Missing
or failed uploads are visible and block review completion. Report revisions
reference exact snapshots and do not silently change. Site jurisdiction is
preserved through the job pack, inspection, review, export and report; it does
not derive legal rules or outcomes.

Approval also requires every expected anchor to be accounted for, valid
outcome/exception relationships, complete conditional proof-test evidence,
resolved changes and no unresolved sync conflicts. Unvalidated completeness
warnings require an explicit reviewer disposition.
