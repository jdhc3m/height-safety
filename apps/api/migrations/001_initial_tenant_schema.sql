-- 3A-02 product schema.
--
-- Keep tenant-owned identity in every primary key and foreign key. The
-- application must still authorise the company in the current session; the
-- database policies below are a second, fail-closed boundary for accidental
-- unscoped reads and writes.
--
-- IDs are supplied by the application as stable opaque values. No provider-
-- specific ID generator, extension, trigger or generated column is required.

CREATE TABLE companies (
  company_id text PRIMARY KEY,
  name text NOT NULL,
  settings text NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  company_id text NOT NULL,
  user_id text NOT NULL,
  identity_subject text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, user_id),
  CONSTRAINT users_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT users_role_ck
    CHECK (role IN ('administrator', 'office_reviewer', 'inspector')),
  CONSTRAINT users_identity_unique
    UNIQUE (company_id, identity_subject),
  CONSTRAINT users_email_unique
    UNIQUE (company_id, email)
);

CREATE TABLE clients (
  company_id text NOT NULL,
  client_id text NOT NULL,
  name text NOT NULL,
  contact_details text,
  external_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, client_id),
  CONSTRAINT clients_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT clients_external_reference_unique
    UNIQUE (company_id, external_reference)
);

CREATE TABLE sites (
  company_id text NOT NULL,
  site_id text NOT NULL,
  client_id text NOT NULL,
  name text NOT NULL,
  address text,
  jurisdiction text NOT NULL,
  access_notes text,
  site_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, site_id),
  CONSTRAINT sites_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT sites_client_fk
    FOREIGN KEY (company_id, client_id)
    REFERENCES clients (company_id, client_id),
  CONSTRAINT sites_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT sites_id_jurisdiction_unique
    UNIQUE (company_id, site_id, jurisdiction),
  CONSTRAINT sites_reference_unique
    UNIQUE (company_id, site_reference)
);

CREATE TABLE anchors (
  company_id text NOT NULL,
  anchor_id text NOT NULL,
  site_id text NOT NULL,
  label text,
  register_id text,
  location text,
  anchor_type text NOT NULL DEFAULT 'single_point',
  manufacturer text,
  model text,
  install_context text,
  register_status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, anchor_id),
  CONSTRAINT anchors_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT anchors_site_fk
    FOREIGN KEY (company_id, site_id)
    REFERENCES sites (company_id, site_id),
  CONSTRAINT anchors_type_allowed_ck
    CHECK (anchor_type = 'single_point'),
  CONSTRAINT anchors_register_status_ck
    CHECK (register_status IN ('active', 'inactive', 'archived')),
  CONSTRAINT anchors_register_id_unique
    UNIQUE (company_id, site_id, register_id)
);

CREATE TABLE jobs (
  company_id text NOT NULL,
  job_id text NOT NULL,
  site_id text NOT NULL,
  jurisdiction text NOT NULL,
  reference text NOT NULL,
  planned_date date,
  workflow_status text NOT NULL DEFAULT 'draft',
  job_pack_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, job_id),
  CONSTRAINT jobs_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT jobs_site_jurisdiction_fk
    FOREIGN KEY (company_id, site_id, jurisdiction)
    REFERENCES sites (company_id, site_id, jurisdiction),
  CONSTRAINT jobs_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT jobs_status_allowed_ck
    CHECK (
      workflow_status IN (
        'draft',
        'released',
        'assigned',
        'in_progress',
        'submitted',
        'under_review',
        'changes_requested',
        'approved_for_report_generation',
        'report_generated'
      )
    ),
  CONSTRAINT jobs_pack_version_positive_ck
    CHECK (job_pack_version > 0),
  CONSTRAINT jobs_reference_unique
    UNIQUE (company_id, reference),
  CONSTRAINT jobs_id_jurisdiction_unique
    UNIQUE (company_id, job_id, jurisdiction)
);

CREATE TABLE job_assignments (
  company_id text NOT NULL,
  assignment_id text NOT NULL,
  job_id text NOT NULL,
  inspector_user_id text NOT NULL,
  assigned_by_user_id text,
  assignment_type text NOT NULL,
  is_primary boolean NOT NULL DEFAULT TRUE,
  assigned_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at timestamp with time zone,
  PRIMARY KEY (company_id, assignment_id),
  CONSTRAINT job_assignments_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT job_assignments_job_fk
    FOREIGN KEY (company_id, job_id)
    REFERENCES jobs (company_id, job_id),
  CONSTRAINT job_assignments_inspector_fk
    FOREIGN KEY (company_id, inspector_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT job_assignments_assigned_by_fk
    FOREIGN KEY (company_id, assigned_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT job_assignments_type_allowed_ck
    CHECK (assignment_type IN ('assigned', 'claimed'))
);

CREATE UNIQUE INDEX job_assignments_one_primary_idx
  ON job_assignments (company_id, job_id)
  WHERE is_primary;

CREATE TABLE inspections (
  company_id text NOT NULL,
  inspection_id text NOT NULL,
  job_id text NOT NULL,
  jurisdiction text NOT NULL,
  revision_number integer NOT NULL,
  inspector_user_id text NOT NULL,
  workflow_status text NOT NULL DEFAULT 'working',
  submission_intent boolean NOT NULL DEFAULT FALSE,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, inspection_id),
  CONSTRAINT inspections_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT inspections_job_fk
    FOREIGN KEY (company_id, job_id)
    REFERENCES jobs (company_id, job_id),
  CONSTRAINT inspections_job_jurisdiction_fk
    FOREIGN KEY (company_id, job_id, jurisdiction)
    REFERENCES jobs (company_id, job_id, jurisdiction),
  CONSTRAINT inspections_inspector_fk
    FOREIGN KEY (company_id, inspector_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT inspections_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT inspections_revision_positive_ck
    CHECK (revision_number > 0),
  CONSTRAINT inspections_status_allowed_ck
    CHECK (workflow_status IN ('working', 'submitted')),
  CONSTRAINT inspections_job_revision_unique
    UNIQUE (company_id, job_id, revision_number),
  CONSTRAINT inspections_id_jurisdiction_unique
    UNIQUE (company_id, inspection_id, jurisdiction)
);

CREATE TABLE anchor_inspections (
  company_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  inspection_id text NOT NULL,
  anchor_id text,
  provisional_anchor_id text,
  identity_confirmation text,
  location text,
  recorded_outcome text,
  exception_reason text,
  reconciliation_proposal text,
  disposition text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, anchor_inspection_id),
  CONSTRAINT anchor_inspections_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT anchor_inspections_inspection_fk
    FOREIGN KEY (company_id, inspection_id)
    REFERENCES inspections (company_id, inspection_id),
  CONSTRAINT anchor_inspections_anchor_fk
    FOREIGN KEY (company_id, anchor_id)
    REFERENCES anchors (company_id, anchor_id),
  CONSTRAINT anchor_inspections_reference_ck
    CHECK (
      (anchor_id IS NOT NULL AND provisional_anchor_id IS NULL)
      OR (anchor_id IS NULL AND provisional_anchor_id IS NOT NULL)
    ),
  CONSTRAINT anchor_inspections_outcome_ck
    CHECK (
      recorded_outcome IS NULL
      OR recorded_outcome IN (
        'serviceable',
        'defective',
        'not_inspected',
        'further_assessment_required'
      )
    ),
  CONSTRAINT anchor_inspections_exception_ck
    CHECK (
      exception_reason IS NULL
      OR exception_reason IN (
        'inaccessible',
        'unable_to_locate',
        'identity_issue'
      )
    ),
  CONSTRAINT anchor_inspections_disposition_ck
    CHECK (
      disposition IS NULL
      OR disposition IN ('removed_from_service', 'retained', 'replaced')
    )
);

CREATE TABLE observations (
  company_id text NOT NULL,
  observation_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  entered_by_user_id text NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, observation_id),
  CONSTRAINT observations_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT observations_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id),
  CONSTRAINT observations_entered_by_fk
    FOREIGN KEY (company_id, entered_by_user_id)
    REFERENCES users (company_id, user_id)
);

CREATE TABLE defects (
  company_id text NOT NULL,
  defect_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  description text NOT NULL,
  severity text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, defect_id),
  CONSTRAINT defects_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT defects_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id)
);

CREATE TABLE recommendations (
  company_id text NOT NULL,
  recommendation_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  action text NOT NULL,
  owner_context text,
  due_context text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, recommendation_id),
  CONSTRAINT recommendations_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT recommendations_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id)
);

CREATE TABLE object_references (
  company_id text NOT NULL,
  object_id text NOT NULL,
  object_key text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint NOT NULL,
  sha256 text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, object_id),
  CONSTRAINT object_references_key_unique
    UNIQUE (company_id, object_key),
  CONSTRAINT object_references_key_scoped_ck
    CHECK (object_key LIKE company_id || '/%'),
  CONSTRAINT object_references_size_nonnegative_ck
    CHECK (byte_size >= 0)
);

CREATE TABLE photos (
  company_id text NOT NULL,
  photo_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  object_id text NOT NULL,
  local_id text NOT NULL,
  capture_time timestamp with time zone,
  upload_state text NOT NULL DEFAULT 'pending_upload',
  metadata_policy text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, photo_id),
  CONSTRAINT photos_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT photos_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id),
  CONSTRAINT photos_object_fk
    FOREIGN KEY (company_id, object_id)
    REFERENCES object_references (company_id, object_id),
  CONSTRAINT photos_upload_state_ck
    CHECK (upload_state IN ('pending_upload', 'uploaded', 'failed')),
  CONSTRAINT photos_local_id_unique
    UNIQUE (company_id, local_id)
);

CREATE TABLE inspection_snapshots (
  company_id text NOT NULL,
  snapshot_id text NOT NULL,
  inspection_id text NOT NULL,
  jurisdiction text NOT NULL,
  snapshot_document text NOT NULL,
  sha256 text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, snapshot_id),
  CONSTRAINT inspection_snapshots_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT inspection_snapshots_inspection_fk
    FOREIGN KEY (company_id, inspection_id, jurisdiction)
    REFERENCES inspections (company_id, inspection_id, jurisdiction),
  CONSTRAINT inspection_snapshots_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT inspection_snapshots_id_jurisdiction_unique
    UNIQUE (company_id, snapshot_id, jurisdiction)
);

CREATE TABLE reports (
  company_id text NOT NULL,
  report_id text NOT NULL,
  job_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, report_id),
  CONSTRAINT reports_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT reports_job_fk
    FOREIGN KEY (company_id, job_id)
    REFERENCES jobs (company_id, job_id),
  CONSTRAINT reports_job_unique
    UNIQUE (company_id, job_id)
);

CREATE TABLE report_revisions (
  company_id text NOT NULL,
  report_revision_id text NOT NULL,
  report_id text NOT NULL,
  source_inspection_id text NOT NULL,
  source_snapshot_id text NOT NULL,
  jurisdiction text NOT NULL,
  revision_number integer NOT NULL,
  template_version text NOT NULL,
  generation_idempotency_key text NOT NULL,
  object_id text NOT NULL,
  sha256 text NOT NULL,
  created_by_user_id text NOT NULL,
  reviewed_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  superseded_at timestamp with time zone,
  PRIMARY KEY (company_id, report_revision_id),
  CONSTRAINT report_revisions_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT report_revisions_report_fk
    FOREIGN KEY (company_id, report_id)
    REFERENCES reports (company_id, report_id),
  CONSTRAINT report_revisions_inspection_fk
    FOREIGN KEY (company_id, source_inspection_id)
    REFERENCES inspections (company_id, inspection_id),
  CONSTRAINT report_revisions_snapshot_fk
    FOREIGN KEY (company_id, source_snapshot_id, jurisdiction)
    REFERENCES inspection_snapshots (company_id, snapshot_id, jurisdiction),
  CONSTRAINT report_revisions_object_fk
    FOREIGN KEY (company_id, object_id)
    REFERENCES object_references (company_id, object_id),
  CONSTRAINT report_revisions_created_by_fk
    FOREIGN KEY (company_id, created_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT report_revisions_reviewed_by_fk
    FOREIGN KEY (company_id, reviewed_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT report_revisions_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT report_revisions_number_positive_ck
    CHECK (revision_number > 0),
  CONSTRAINT report_revisions_revision_unique
    UNIQUE (company_id, report_id, revision_number),
  CONSTRAINT report_revisions_idempotency_unique
    UNIQUE (company_id, generation_idempotency_key)
);

CREATE TABLE review_issues (
  company_id text NOT NULL,
  review_issue_id text NOT NULL,
  inspection_id text,
  anchor_inspection_id text,
  issue_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reviewer_user_id text,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp with time zone,
  PRIMARY KEY (company_id, review_issue_id),
  CONSTRAINT review_issues_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT review_issues_inspection_fk
    FOREIGN KEY (company_id, inspection_id)
    REFERENCES inspections (company_id, inspection_id),
  CONSTRAINT review_issues_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id),
  CONSTRAINT review_issues_reviewer_fk
    FOREIGN KEY (company_id, reviewer_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT review_issues_type_ck
    CHECK (issue_type IN ('blocker', 'warning', 'conflict', 'change')),
  CONSTRAINT review_issues_status_ck
    CHECK (status IN ('open', 'resolved'))
);

CREATE TABLE review_actions (
  company_id text NOT NULL,
  review_action_id text NOT NULL,
  review_issue_id text NOT NULL,
  reviewer_user_id text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, review_action_id),
  CONSTRAINT review_actions_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT review_actions_issue_fk
    FOREIGN KEY (company_id, review_issue_id)
    REFERENCES review_issues (company_id, review_issue_id),
  CONSTRAINT review_actions_reviewer_fk
    FOREIGN KEY (company_id, reviewer_user_id)
    REFERENCES users (company_id, user_id)
);

CREATE TABLE sync_mutations (
  company_id text NOT NULL,
  mutation_id text NOT NULL,
  idempotency_key text NOT NULL,
  actor_user_id text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  request_sha256 text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  response_body text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  PRIMARY KEY (company_id, mutation_id),
  CONSTRAINT sync_mutations_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT sync_mutations_actor_fk
    FOREIGN KEY (company_id, actor_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT sync_mutations_state_ck
    CHECK (state IN ('pending', 'synchronised', 'failed', 'conflict')),
  CONSTRAINT sync_mutations_idempotency_unique
    UNIQUE (company_id, idempotency_key)
);

CREATE TABLE outbox_items (
  company_id text NOT NULL,
  outbox_item_id text NOT NULL,
  mutation_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, outbox_item_id),
  CONSTRAINT outbox_items_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT outbox_items_mutation_fk
    FOREIGN KEY (company_id, mutation_id)
    REFERENCES sync_mutations (company_id, mutation_id),
  CONSTRAINT outbox_items_state_ck
    CHECK (state IN ('pending', 'synchronising', 'synchronised', 'failed', 'conflict')),
  CONSTRAINT outbox_items_attempt_count_ck
    CHECK (attempt_count >= 0)
);

CREATE TABLE audit_events (
  company_id text NOT NULL,
  audit_event_id text NOT NULL,
  actor_user_id text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  transition_metadata text,
  occurred_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, audit_event_id),
  CONSTRAINT audit_events_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT audit_events_actor_fk
    FOREIGN KEY (company_id, actor_user_id)
    REFERENCES users (company_id, user_id)
);

CREATE INDEX users_company_idx ON users (company_id);
CREATE INDEX clients_company_idx ON clients (company_id);
CREATE INDEX sites_company_client_idx ON sites (company_id, client_id);
CREATE INDEX anchors_company_site_idx ON anchors (company_id, site_id);
CREATE INDEX jobs_company_site_idx ON jobs (company_id, site_id);
CREATE INDEX job_assignments_company_job_idx
  ON job_assignments (company_id, job_id);
CREATE INDEX inspections_company_job_idx
  ON inspections (company_id, job_id);
CREATE INDEX anchor_inspections_company_inspection_idx
  ON anchor_inspections (company_id, inspection_id);
CREATE INDEX observations_company_anchor_inspection_idx
  ON observations (company_id, anchor_inspection_id);
CREATE INDEX defects_company_anchor_inspection_idx
  ON defects (company_id, anchor_inspection_id);
CREATE INDEX recommendations_company_anchor_inspection_idx
  ON recommendations (company_id, anchor_inspection_id);
CREATE INDEX photos_company_anchor_inspection_idx
  ON photos (company_id, anchor_inspection_id);
CREATE INDEX photos_company_object_idx ON photos (company_id, object_id);
CREATE INDEX snapshots_company_inspection_idx
  ON inspection_snapshots (company_id, inspection_id);
CREATE INDEX reports_company_job_idx ON reports (company_id, job_id);
CREATE INDEX report_revisions_company_report_idx
  ON report_revisions (company_id, report_id);
CREATE INDEX review_issues_company_inspection_idx
  ON review_issues (company_id, inspection_id);
CREATE INDEX review_actions_company_issue_idx
  ON review_actions (company_id, review_issue_id);
CREATE INDEX sync_mutations_company_entity_idx
  ON sync_mutations (company_id, entity_type, entity_id);
CREATE INDEX outbox_items_company_mutation_idx
  ON outbox_items (company_id, mutation_id);
CREATE INDEX audit_events_company_target_idx
  ON audit_events (company_id, target_type, target_id);

-- The context is supplied by the authenticated API for each transaction. An
-- absent context returns no rows and rejects writes, rather than acting as a
-- broad database tenant.
CREATE FUNCTION height_safety_current_company_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.company_id', TRUE), '')
$$;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchor_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE companies FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE sites FORCE ROW LEVEL SECURITY;
ALTER TABLE anchors FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE job_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE anchor_inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE observations FORCE ROW LEVEL SECURITY;
ALTER TABLE defects FORCE ROW LEVEL SECURITY;
ALTER TABLE recommendations FORCE ROW LEVEL SECURITY;
ALTER TABLE object_references FORCE ROW LEVEL SECURITY;
ALTER TABLE photos FORCE ROW LEVEL SECURITY;
ALTER TABLE inspection_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
ALTER TABLE report_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE review_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE review_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_mutations FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_items FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY companies_tenant_policy ON companies
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY users_tenant_policy ON users
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY clients_tenant_policy ON clients
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY sites_tenant_policy ON sites
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY anchors_tenant_policy ON anchors
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY jobs_tenant_policy ON jobs
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY job_assignments_tenant_policy ON job_assignments
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY inspections_tenant_policy ON inspections
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY anchor_inspections_tenant_policy ON anchor_inspections
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY observations_tenant_policy ON observations
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY defects_tenant_policy ON defects
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY recommendations_tenant_policy ON recommendations
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY object_references_tenant_policy ON object_references
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY photos_tenant_policy ON photos
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY inspection_snapshots_tenant_policy ON inspection_snapshots
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY reports_tenant_policy ON reports
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY report_revisions_tenant_policy ON report_revisions
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY review_issues_tenant_policy ON review_issues
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY review_actions_tenant_policy ON review_actions
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY sync_mutations_tenant_policy ON sync_mutations
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY outbox_items_tenant_policy ON outbox_items
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY audit_events_tenant_policy ON audit_events
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());

DO $$
DECLARE
  schema_name text := current_schema();
BEGIN
  EXECUTE format(
    'GRANT USAGE ON SCHEMA %I TO height_safety_runtime',
    schema_name
  );
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO height_safety_runtime',
    schema_name
  );
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION %I.height_safety_current_company_id() TO height_safety_runtime',
    schema_name
  );
END
$$;
