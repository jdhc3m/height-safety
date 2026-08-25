export interface TenantContext {
  readonly companyId: string;
}

export interface TenantContextStatement {
  readonly text: "SELECT set_config('app.company_id', $1, true)";
  readonly values: readonly [string];
}

const COMPANY_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

/**
 * Creates the only context value accepted by the database tenant boundary.
 * Authentication and membership authorisation happen before this function is
 * called; this value is still bound as a query parameter when applied.
 */
export function createTenantContext(companyId: string): TenantContext {
  if (typeof companyId !== 'string' || !COMPANY_ID_PATTERN.test(companyId)) {
    throw new Error('companyId must be a stable lowercase opaque identifier');
  }

  return { companyId };
}

/**
 * The API must execute this statement at the start of every tenant-scoped
 * transaction. The `true` argument makes the setting transaction-local.
 */
export function setTenantContextStatement(
  context: TenantContext,
): TenantContextStatement {
  return {
    text: "SELECT set_config('app.company_id', $1, true)",
    values: [context.companyId],
  };
}
