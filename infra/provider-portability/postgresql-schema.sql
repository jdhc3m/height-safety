-- G-03 portability contract. This is a bounded proof schema, not the product
-- migration set. Product migrations belong to 3A-02 after G-03 approval.
-- Keep this file portable PostgreSQL/standard SQL where practical: no
-- extensions, provider-specific functions, policies or generated columns.

CREATE TABLE companies (
  company_id text PRIMARY KEY,
  name text NOT NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('NSW', 'QLD')),
  created_at timestamp with time zone NOT NULL
);

CREATE TABLE sites (
  company_id text NOT NULL,
  site_id text NOT NULL,
  name text NOT NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('NSW', 'QLD')),
  created_at timestamp with time zone NOT NULL,
  PRIMARY KEY (company_id, site_id),
  CONSTRAINT sites_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT sites_jurisdiction_allowed_ck
    CHECK (jurisdiction IN ('NSW', 'QLD'))
);

CREATE TABLE evidence_records (
  company_id text NOT NULL,
  evidence_id text NOT NULL,
  site_id text NOT NULL,
  recorded_outcome text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  PRIMARY KEY (company_id, evidence_id),
  CONSTRAINT evidence_site_fk
    FOREIGN KEY (company_id, site_id)
    REFERENCES sites (company_id, site_id)
);

CREATE TABLE object_references (
  company_id text NOT NULL,
  object_id text NOT NULL,
  object_key text NOT NULL,
  content_type text NOT NULL,
  sha256 text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  PRIMARY KEY (company_id, object_id),
  UNIQUE (company_id, object_key),
  CONSTRAINT object_key_is_tenant_scoped
    CHECK (object_key LIKE company_id || '/%')
);

CREATE INDEX evidence_records_company_site_idx
  ON evidence_records (company_id, site_id);

CREATE INDEX object_references_company_idx
  ON object_references (company_id);
