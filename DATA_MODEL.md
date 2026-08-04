# Compatibility copy — canonical: [docs/architecture/DATA_MODEL.md](docs/architecture/DATA_MODEL.md)

# Anchor MVP Data Model

All tenant-owned records include `company_id` and are authorised server-side.
IDs are stable opaque identifiers. Timestamps include a server timestamp and,
where useful for offline diagnostics, a client timestamp.

## Entities

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Company | Tenant boundary | has users, clients, sites and all tenant data |
| User | Account and role | belongs to company; Administrator, Office reviewer or Inspector |
| Client | Customer record | belongs to company; has sites |
| Site | Inspection location | belongs to client and company; has anchors and jobs |
| Job | One planned inspection visit | belongs to site; has one primary inspection |
| JobAssignment | Assignment record | links job to one inspector; records download/submission state |
| Anchor | Installed single-point roof anchor register item | belongs to site; may be newly discovered |
| Inspection | Job-level submission/revision | belongs to job; has revision and workflow status |
| AnchorInspection | Per-anchor field record | links one inspection to one anchor; owns evidence links |
| Observation | Recorded field observation | belongs to anchor inspection |
| Defect | Recorded issue | belongs to anchor inspection |
| Recommendation | Recorded follow-up | belongs to anchor inspection |
| Photo | Private media metadata | belongs to anchor inspection or controlled job context |
| SyncMutation / OutboxItem | Idempotent client mutation | belongs to company, job and device/client session |
| Report | Logical report | belongs to job and company |
| ReportRevision | Immutable generated report revision | points to exact inspection revision and template version |
| AuditEvent | Append-only important action | belongs to company and references affected record |

Do not add generic asset, compliance-rule, certification, standards or
manufacturer engines for the MVP. Manufacturer notes can remain plain recorded
data until validated.

## Invariants

- An anchor inspection cannot attach evidence from another anchor or job.
- A report revision cannot point at mutable “current” inspection data only.
- A retry of the same mutation identifier has one effect.
- Tenant checks apply to queries, mutations, downloads, exports and report files.
- Review and report generation require all required uploads to be synchronised.
