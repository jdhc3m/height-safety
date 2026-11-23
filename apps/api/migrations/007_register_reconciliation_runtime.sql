-- Office register-reconciliation decisions.
--
-- Inspectors submit reconciliation proposals (newly_discovered, replacement,
-- duplicate with a provisional anchor id) through the sync mutation. This
-- migration stores one office decision per submitted proposal so the office
-- can read open proposals per site and record accept/reject outcomes with
-- append-only audit. The submitted anchor inspection rows remain the source
-- of proposal context; no inspector payload changes.

CREATE TABLE register_reconciliation_decisions (
  company_id text NOT NULL,
  proposal_decision_id text NOT NULL,
  anchor_inspection_id text NOT NULL,
  inspection_id text NOT NULL,
  site_id text NOT NULL,
  proposal_type text NOT NULL,
  decision text NOT NULL,
  decided_by_user_id text NOT NULL,
  register_anchor_id text,
  assigned_label text,
  assigned_location text,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, proposal_decision_id),
  CONSTRAINT register_reconciliation_decisions_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT register_reconciliation_decisions_inspection_fk
    FOREIGN KEY (company_id, inspection_id)
    REFERENCES inspections (company_id, inspection_id),
  CONSTRAINT register_reconciliation_decisions_inspection_site_fk
    FOREIGN KEY (company_id, inspection_id, site_id)
    REFERENCES inspections (company_id, inspection_id, site_id),
  CONSTRAINT register_reconciliation_decisions_anchor_inspection_fk
    FOREIGN KEY (company_id, anchor_inspection_id)
    REFERENCES anchor_inspections (company_id, anchor_inspection_id),
  CONSTRAINT register_reconciliation_decisions_decided_by_fk
    FOREIGN KEY (company_id, decided_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT register_reconciliation_decisions_proposal_type_ck
    CHECK (proposal_type IN ('newly_discovered', 'replacement', 'duplicate')),
  CONSTRAINT register_reconciliation_decisions_decision_ck
    CHECK (decision IN ('accepted', 'rejected')),
  CONSTRAINT register_reconciliation_decisions_outcome_shape_ck
    CHECK (
      (
        decision = 'accepted'
        AND reason IS NULL
        AND register_anchor_id IS NOT NULL
      )
      OR (
        decision = 'rejected'
        AND reason IS NOT NULL
        AND register_anchor_id IS NULL
        AND assigned_label IS NULL
        AND assigned_location IS NULL
      )
    ),
  -- One decision action per submitted proposal. A rejected proposal stays
  -- rejected; a new submission creates a new proposal row to decide.
  CONSTRAINT register_reconciliation_decisions_one_per_proposal_unique
    UNIQUE (company_id, anchor_inspection_id)
);

CREATE INDEX register_reconciliation_decisions_company_site_idx
  ON register_reconciliation_decisions (company_id, site_id);

ALTER TABLE register_reconciliation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_reconciliation_decisions FORCE ROW LEVEL SECURITY;

CREATE POLICY register_reconciliation_decisions_tenant_policy
  ON register_reconciliation_decisions
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());

-- Decision rows are append-only office records; the runtime role may insert
-- and read them but never update or delete.
GRANT SELECT, INSERT ON register_reconciliation_decisions
  TO height_safety_runtime;
REVOKE UPDATE, DELETE ON register_reconciliation_decisions
  FROM height_safety_runtime;
