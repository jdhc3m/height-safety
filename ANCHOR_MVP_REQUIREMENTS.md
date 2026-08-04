# Compatibility copy — canonical: [docs/requirements/ANCHOR_MVP_REQUIREMENTS.md](docs/requirements/ANCHOR_MVP_REQUIREMENTS.md)

# Anchor MVP Requirements

## Roles

- **Administrator:** manages company settings, users and company data.
- **Office reviewer:** creates clients, sites and jobs; manages anchors;
  assigns inspectors; reviews submissions; generates draft reports.
- **Inspector:** views assigned jobs, downloads job data, records evidence and
  submits inspections for review.

An inspector is not assumed to have authority to certify or issue a final
report.

## Web requirements

Authentication, company account, user management, clients, sites, an anchor
register, job creation, inspector assignment, review queue, missing-information
warnings, basic conflict review, draft report generation, report revision
history, CSV/structured export, and private photograph/document access.

## Mobile requirements

Authentication, assigned jobs, downloadable job packs, site and anchor details,
new-anchor capture, observations, notes, photographs, defects,
recommendations, recorded outcomes, durable local saves, mutation queue with
visible pending/synchronising/failed/synchronised states, and submission for
office review.

## Required outcomes

Anchor inspections may be Serviceable, Defective, Not inspected, Inaccessible,
Unable to locate, Removed from service, Replaced, Newly discovered, or Further
assessment required. These are prototype values, configurable in code and not
legally validated.

Job/inspection workflow statuses may be Draft, Assigned, Downloaded, In
progress, Submitted, Under review, Changes requested, Approved for report
generation, Report generated, or Superseded. These statuses describe product
workflow only and are also prototype values.

## Acceptance constraints

Every tenant-owned record belongs to a company. Photos and notes remain tied to
the correct anchor inspection. A report revision references an exact inspection
snapshot. Unsynchronised evidence blocks completion of the office review.
