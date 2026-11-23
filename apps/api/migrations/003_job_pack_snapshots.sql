-- Runtime job-pack persistence used by the assigned Android field boundary.
-- A released pack is an immutable, tenant-scoped snapshot of the site and
-- anchor register at release time. Later register edits never rewrite it.

CREATE TABLE job_pack_snapshots (
  company_id text NOT NULL,
  job_id text NOT NULL,
  job_pack_version integer NOT NULL,
  site_id text NOT NULL,
  jurisdiction text NOT NULL,
  site_document text NOT NULL,
  anchors_document text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, job_id, job_pack_version),
  CONSTRAINT job_pack_snapshots_job_fk
    FOREIGN KEY (company_id, job_id)
    REFERENCES jobs (company_id, job_id),
  CONSTRAINT job_pack_snapshots_site_fk
    FOREIGN KEY (company_id, site_id)
    REFERENCES sites (company_id, site_id),
  CONSTRAINT job_pack_snapshots_job_site_fk
    FOREIGN KEY (company_id, job_id, site_id)
    REFERENCES jobs (company_id, job_id, site_id),
  CONSTRAINT job_pack_snapshots_jurisdiction_ck
    CHECK (jurisdiction IN ('NSW', 'QLD')),
  CONSTRAINT job_pack_snapshots_version_ck
    CHECK (job_pack_version > 0),
  CONSTRAINT job_pack_snapshots_site_document_ck
    CHECK (site_document <> ''),
  CONSTRAINT job_pack_snapshots_anchors_document_ck
    CHECK (anchors_document <> '')
);

CREATE FUNCTION height_safety_reject_job_pack_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'job_pack_snapshots are immutable';
END
$$;

CREATE TRIGGER job_pack_snapshots_immutable
  BEFORE UPDATE OR DELETE ON job_pack_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION height_safety_reject_job_pack_mutation();

CREATE INDEX job_pack_snapshots_company_job_idx
  ON job_pack_snapshots (company_id, job_id);

ALTER TABLE job_pack_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pack_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY job_pack_snapshots_tenant_policy ON job_pack_snapshots
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());

GRANT SELECT, INSERT ON job_pack_snapshots TO height_safety_runtime;
