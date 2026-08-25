-- 3A-02 database runtime boundary.
--
-- The application connection uses this non-login role after the deployment
-- connection has selected the tenant context for a transaction. It is kept
-- separate from the migration/owner role so FORCE ROW LEVEL SECURITY applies
-- to application queries as well as to tests.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'height_safety_runtime'
  ) THEN
    CREATE ROLE height_safety_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT;
  END IF;
END
$$;
