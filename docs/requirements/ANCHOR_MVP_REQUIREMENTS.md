# Anchor MVP Requirements

## Roles

- Administrator: company settings and users.
- Office reviewer: clients, sites, anchor register, jobs, assignments, review,
  exports and draft reports.
- Inspector: assigned jobs, downloaded data, field evidence and submission.

Inspector authority to certify or issue compliance certificates is not assumed.

## Functional requirements

Office must create clients/sites, add or import anchors, create jobs, assign
inspectors, inspect sync failures/conflicts, request changes, review submissions
and generate immutable draft report revisions. Mobile must download assigned job
packs, show anchor register, durably save observations/notes/photos/defects/
recommendations/outcomes, support inaccessible/unable-to-locate/new anchors,
show sync states and submit for review.

## Provisional values

Anchor outcomes: Serviceable, Defective, Not inspected, Inaccessible, Unable to
locate, Removed from service, Replaced, Newly discovered, Further assessment
required. Workflow: Draft, Assigned, Downloaded, In progress, Submitted, Under
review, Changes requested, Approved for report generation, Report generated,
Superseded. Validate before treating values as domain truth.

## Acceptance constraints

Every tenant record is company-scoped and server-authorised. Retries are
idempotent. Photos and notes remain tied to correct anchor inspection. Missing
or failed uploads are visible and block review completion. Report revisions
reference exact snapshots and do not silently change.
