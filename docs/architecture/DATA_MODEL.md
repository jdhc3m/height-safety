# Data Model

Every tenant-owned server record has `company_id`; every query, mutation,
download, export and report/media access enforces it server-side. IDs are
stable opaque identifiers. Server timestamps are authoritative; client times
support diagnostics.

Core entities: Company, User, Client, Site, Anchor, Job, JobAssignment,
Inspection, AnchorInspection, Observation, Defect, Recommendation, Photo,
EquipmentComponent, EquipmentInspection, ClearanceAssessment, RescuePlan,
SyncMutation/OutboxItem, Report, ReportRevision and AuditEvent.

Relationships: company owns users and all tenant data; client owns sites; site
owns anchors/jobs; job has assignment and inspection revisions; inspection owns
anchor inspections; anchor inspection owns evidence; report revision points to
immutable inspection snapshot and template version.

AS 5532 product evidence belongs on the anchor/equipment evidence record and
must retain: standard reference/version, manufacturer/model, batch/serial,
fixed-or-portable class, device/attachment-point type, permitted load
directions, rating/person count, instruction version, marking checks and
linked test records. A test record retains specimen, procedure/clause,
apparatus, configuration, force/load, hold time, mass/drop/peak load,
suspension/function result, roof structure, deviations, unusual observations
and date. These are evidence records; they are not a generic standards engine
or an automatic compliance decision.

Invariants: no cross-job evidence links; retry ID has one effect; important
conflicts are explicit; report revision never reads mutable current data only;
required uploads synchronised before review/report generation. Equipment failed,
fall-arrest-used or expired must be unavailable for new work unless explicitly
re-inspected and released. Rule-backed calculations store inputs and formula
version; application does not silently infer compliance. Missing evidence and
unresolved competent-person/professional-engineer review stay visible.

Do not introduce generic asset, compliance-rule, certification, standards or
manufacturer engines for MVP. Manufacturer data is recorded notes/references.
