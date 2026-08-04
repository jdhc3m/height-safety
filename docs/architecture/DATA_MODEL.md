# Data Model

Every tenant-owned server record has `company_id`; every query, mutation,
download, export and report/media access enforces it server-side. IDs are
stable opaque identifiers. Server timestamps are authoritative; client times
support diagnostics.

Core entities: Company, User, Client, Site, Anchor, Job, JobAssignment,
Inspection, AnchorInspection, Observation, Defect, Recommendation, Photo,
SyncMutation/OutboxItem, Report, ReportRevision and AuditEvent.

Relationships: company owns users and all tenant data; client owns sites; site
owns anchors/jobs; job has assignment and inspection revisions; inspection owns
anchor inspections; anchor inspection owns evidence; report revision points to
immutable inspection snapshot and template version.

Invariants: no cross-job evidence links; retry ID has one effect; important
conflicts are explicit; report revision never reads mutable current data only;
required uploads synchronised before review/report generation.

Do not introduce generic asset, compliance-rule, certification, standards or
manufacturer engines for MVP. Manufacturer data is recorded notes/references.
