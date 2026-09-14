-- 3D-01 review history hardening.
--
-- Review issues may transition from open to resolved, but an application
-- runtime must never remove the issue or mutate the append-only action log.
-- The database owner can still perform controlled maintenance outside the
-- application role; tenant RLS remains the boundary for runtime statements.

REVOKE UPDATE, DELETE ON review_issues FROM height_safety_runtime;
GRANT UPDATE (status, resolved_at) ON review_issues TO height_safety_runtime;
REVOKE UPDATE, DELETE ON review_actions FROM height_safety_runtime;
