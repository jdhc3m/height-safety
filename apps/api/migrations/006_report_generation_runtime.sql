-- 3D-03 local durable report-generation queue.
--
-- Queue rows retain only stable references and operational state. Approved
-- snapshot content remains the source of report inputs; PDF bytes are written
-- to private object storage by a separate worker process.

CREATE TABLE report_generation_jobs (
  company_id text NOT NULL,
  generation_id text NOT NULL,
  generation_idempotency_key text NOT NULL,
  report_id text NOT NULL,
  report_revision_id text NOT NULL,
  job_id text NOT NULL,
  source_inspection_id text NOT NULL,
  source_snapshot_id text NOT NULL,
  source_snapshot_sha256 text NOT NULL,
  jurisdiction text NOT NULL,
  template_version text NOT NULL,
  revision_number integer,
  created_by_user_id text NOT NULL,
  reviewed_by_user_id text NOT NULL,
  requested_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamp with time zone NOT NULL,
  lease_token text,
  lease_expires_at timestamp with time zone,
  last_failure_code text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, generation_id),
  CONSTRAINT report_generation_jobs_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT report_generation_jobs_report_fk
    FOREIGN KEY (company_id, report_id, job_id)
    REFERENCES reports (company_id, report_id, job_id),
  CONSTRAINT report_generation_jobs_inspection_fk
    FOREIGN KEY (company_id, source_inspection_id, job_id, jurisdiction)
    REFERENCES inspections (company_id, inspection_id, job_id, jurisdiction),
  CONSTRAINT report_generation_jobs_snapshot_fk
    FOREIGN KEY (
      company_id,
      source_snapshot_id,
      jurisdiction,
      source_inspection_id
    )
    REFERENCES inspection_snapshots (
      company_id,
      snapshot_id,
      jurisdiction,
      inspection_id
    ),
  CONSTRAINT report_generation_jobs_created_by_fk
    FOREIGN KEY (company_id, created_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT report_generation_jobs_reviewed_by_fk
    FOREIGN KEY (company_id, reviewed_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT report_generation_jobs_jurisdiction_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT report_generation_jobs_status_ck
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'superseded')),
  CONSTRAINT report_generation_jobs_idempotency_key_ck
    CHECK (generation_idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT report_generation_jobs_snapshot_sha_ck
    CHECK (source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT report_generation_jobs_revision_ck
    CHECK (revision_number IS NULL OR revision_number > 0),
  CONSTRAINT report_generation_jobs_attempt_ck
    CHECK (attempt_count >= 0),
  CONSTRAINT report_generation_jobs_lease_ck
    CHECK (
      (status = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
      OR
      (status <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
    ),
  CONSTRAINT report_generation_jobs_completed_ck
    CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CONSTRAINT report_generation_jobs_idempotency_unique
    UNIQUE (company_id, generation_idempotency_key),
  CONSTRAINT report_generation_jobs_revision_id_unique
    UNIQUE (company_id, report_revision_id)
);

CREATE INDEX report_generation_jobs_claim_idx
  ON report_generation_jobs (status, available_at, requested_at);
CREATE INDEX report_generation_jobs_company_job_idx
  ON report_generation_jobs (company_id, job_id, status);

CREATE UNIQUE INDEX report_generation_jobs_active_revision_unique
  ON report_generation_jobs (company_id, report_id, revision_number)
  WHERE status IN ('queued', 'processing') AND revision_number IS NOT NULL;

ALTER TABLE report_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY report_generation_jobs_tenant_policy ON report_generation_jobs
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());

GRANT SELECT, INSERT, UPDATE ON report_generation_jobs TO height_safety_runtime;
