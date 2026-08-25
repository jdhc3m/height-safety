-- 3A-03 invitation and application-session boundary.
--
-- Provider credentials and provider refresh tokens remain outside this schema.
-- The application stores only a one-time invitation digest and high-entropy
-- opaque session digest, then resolves the current company membership and
-- role for every online request.

CREATE TABLE user_invitations (
  company_id text NOT NULL,
  invitation_id text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  token_hash text NOT NULL,
  invited_by_user_id text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, invitation_id),
  CONSTRAINT user_invitations_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT user_invitations_invited_by_fk
    FOREIGN KEY (company_id, invited_by_user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT user_invitations_role_ck
    CHECK (role IN ('administrator', 'office_reviewer', 'inspector')),
  CONSTRAINT user_invitations_token_hash_ck
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT user_invitations_expiry_ck
    CHECK (expires_at > created_at),
  CONSTRAINT user_invitations_terminal_state_ck
    CHECK (accepted_at IS NULL OR revoked_at IS NULL),
  CONSTRAINT user_invitations_token_unique
    UNIQUE (company_id, token_hash)
);

CREATE TABLE user_sessions (
  company_id text NOT NULL,
  session_id text NOT NULL,
  user_id text NOT NULL,
  identity_subject text NOT NULL,
  token_hash text NOT NULL,
  mfa_satisfied boolean NOT NULL,
  issued_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  PRIMARY KEY (company_id, session_id),
  CONSTRAINT user_sessions_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (company_id),
  CONSTRAINT user_sessions_user_fk
    FOREIGN KEY (company_id, user_id)
    REFERENCES users (company_id, user_id),
  CONSTRAINT user_sessions_token_hash_ck
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT user_sessions_expiry_ck
    CHECK (expires_at > issued_at),
  CONSTRAINT user_sessions_last_seen_ck
    CHECK (last_seen_at >= issued_at),
  CONSTRAINT user_sessions_token_unique
    UNIQUE (company_id, token_hash)
);

CREATE INDEX user_invitations_company_email_idx
  ON user_invitations (company_id, email);
CREATE INDEX user_sessions_company_user_idx
  ON user_sessions (company_id, user_id);
CREATE INDEX user_sessions_company_expiry_idx
  ON user_sessions (company_id, expires_at);

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY user_invitations_tenant_policy ON user_invitations
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());
CREATE POLICY user_sessions_tenant_policy ON user_sessions
  USING (company_id = height_safety_current_company_id())
  WITH CHECK (company_id = height_safety_current_company_id());

DO $$
DECLARE
  schema_name text := current_schema();
BEGIN
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE ON user_invitations TO height_safety_runtime'
  );
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE ON user_sessions TO height_safety_runtime'
  );
END
$$;
