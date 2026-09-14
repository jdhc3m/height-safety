-- 3C runtime payload and media continuation.
--
-- The original schema intentionally kept the first sync contract small. These
-- columns retain the additional capture fields that are already frozen in the
-- Android evidence model, while the mutation request body gives the durable
-- server record enough information to replay an acknowledgement after a
-- process restart.

ALTER TABLE anchor_inspections
  ADD COLUMN location_confirmed boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN proof_test_load text,
  ADD COLUMN proof_test_hold text,
  ADD COLUMN proof_test_result text,
  ADD COLUMN proof_test_equipment_reference text;

ALTER TABLE sync_mutations
  ADD COLUMN request_body text NOT NULL DEFAULT '{}',
  ADD COLUMN entity_version integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT sync_mutations_entity_version_ck
    CHECK (entity_version >= 0);

CREATE INDEX sync_mutations_company_entity_version_idx
  ON sync_mutations (company_id, entity_type, entity_id, entity_version);
