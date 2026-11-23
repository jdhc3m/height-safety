export const INSPECTION_REVISION_LOCK_ENTITY_TYPE =
  'inspection_submission' as const;

export const INSPECTION_REVISION_LOCK_SQL = `
  SELECT pg_advisory_xact_lock(
    hashtextextended(concat_ws(':', $1::text, $2::text, $3::text), 0)
  )
`;

export function inspectionRevisionLockValues(
  companyId: string,
  jobId: string,
): readonly [string, typeof INSPECTION_REVISION_LOCK_ENTITY_TYPE, string] {
  return [companyId, INSPECTION_REVISION_LOCK_ENTITY_TYPE, jobId];
}
