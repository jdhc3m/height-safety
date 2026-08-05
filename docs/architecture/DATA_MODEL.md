# Data Model

Every tenant-owned server record has `company_id`; every query, mutation,
download, export and report/media access enforces it server-side. IDs are
stable opaque identifiers. Server timestamps are authoritative; client times
support diagnostics.

Core entities: Company, User, Client, Site, Anchor, Job, JobAssignment,
Inspection, AnchorInspection, Observation, Defect, Recommendation, Photo,
ReviewIssue/ReviewAction, SyncMutation/OutboxItem, Report, ReportRevision and
AuditEvent.

Relationships: company owns users and all tenant data; client owns sites; site
owns anchors/jobs; job has assignment and inspection revisions; inspection owns
anchor inspections; anchor inspection owns evidence; report revision points to
immutable inspection snapshot and template version.

AnchorInspection stores recorded outcome separately from exception reason,
register-reconciliation proposal and disposition. Newly discovered anchors use
stable provisional IDs; replacement/duplicate proposals never erase or merge
history before review.

AS 5532 product/manufacturing evidence is deferred from the MVP data model.
Candidate fields and provenance requirements remain in `FIELD_CATALOGUE.md`
and the standards integration notes; do not add them to core entities without
partner/professional evidence and a recorded decision.

Invariants: no cross-job evidence links; retry ID has one effect; important
conflicts are explicit; report revision never reads mutable current data only;
required uploads synchronised before review/report generation; expected anchors
are accounted for; outcome/exception relationships are valid; submitted and
report revisions remain immutable. Missing evidence and unresolved review stay
visible.

EquipmentComponent, EquipmentInspection, ClearanceAssessment, RescuePlan and
standards-rule models are deferred candidates, not MVP core entities.

Do not introduce generic asset, compliance-rule, certification, standards or
manufacturer engines for MVP. Manufacturer data is recorded notes/references.
