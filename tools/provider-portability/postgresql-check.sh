#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCHEMA="$ROOT/infra/provider-portability/postgresql-schema.sql"
PSQL_BIN="${PSQL_BIN:-psql}"
PSQL_PREFIX_COMMAND="${PSQL_PREFIX_COMMAND:-}"
SCHEMA_PATH="${HEIGHT_SAFETY_POSTGRES_SCHEMA_PATH:-$SCHEMA}"
DATABASE_URL="${HEIGHT_SAFETY_POSTGRES_URL:-}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "provider-portability: set HEIGHT_SAFETY_POSTGRES_URL to a disposable PostgreSQL database" >&2
  exit 2
fi

PSQL_PREFIX=()
if [[ -n "$PSQL_PREFIX_COMMAND" ]]; then
  read -r -a PSQL_PREFIX <<< "$PSQL_PREFIX_COMMAND"
else
  command -v "$PSQL_BIN" >/dev/null || {
    echo "provider-portability: psql is required" >&2
    exit 2
  }
fi

psql() {
  if (( ${#PSQL_PREFIX[@]} > 0 )); then
    "${PSQL_PREFIX[@]}" "$PSQL_BIN" "$@"
  else
    command "$PSQL_BIN" "$@"
  fi
}

schema_name="hs_g03_$(openssl rand -hex 6 2>/dev/null || date -u +%s)"
if [[ ! "$schema_name" =~ ^hs_g03_[a-z0-9]+$ ]]; then
  echo "provider-portability: generated schema name is invalid" >&2
  exit 1
fi

cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA IF EXISTS \"$schema_name\" CASCADE" >/dev/null
}
trap cleanup EXIT

run_psql() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v "g03_schema=$schema_name" "$@"
}

run_psql \
  -c "CREATE SCHEMA \"$schema_name\"; SET search_path TO \"$schema_name\"" \
  -f - < "$SCHEMA_PATH" >/dev/null

run_psql -c "
  SET search_path TO \"$schema_name\";
  INSERT INTO companies (company_id, name, jurisdiction, created_at)
    VALUES
      ('company-a', 'Fictional Company A', 'NSW', '2026-08-24T00:00:00Z'),
      ('company-b', 'Fictional Company B', 'QLD', '2026-08-24T00:00:00Z');
  INSERT INTO sites (company_id, site_id, name, jurisdiction, created_at)
    VALUES
      ('company-a', 'site-a', 'Fictional Site A', 'NSW', '2026-08-24T00:00:00Z'),
      ('company-b', 'site-b', 'Fictional Site B', 'QLD', '2026-08-24T00:00:00Z');
  INSERT INTO evidence_records
    (company_id, evidence_id, site_id, recorded_outcome, created_at)
    VALUES ('company-a', 'evidence-a', 'site-a', 'recorded outcome', '2026-08-24T00:00:00Z');
  DO \$\$
  BEGIN
    BEGIN
      INSERT INTO evidence_records
        (company_id, evidence_id, site_id, recorded_outcome, created_at)
        VALUES ('company-a', 'cross-tenant', 'site-b', 'recorded outcome', '2026-08-24T00:00:00Z');
      RAISE EXCEPTION 'cross-tenant foreign-key write unexpectedly succeeded';
    EXCEPTION WHEN foreign_key_violation THEN
      NULL;
    END;
  END
  \$\$;
  SELECT CASE
    WHEN (SELECT count(*) FROM evidence_records WHERE company_id = 'company-a') = 1
    THEN 'provider-portability: PostgreSQL schema and tenant-key constraint passed'
    ELSE 'provider-portability: unexpected evidence count'
  END;
" | rg -F 'provider-portability: PostgreSQL schema and tenant-key constraint passed'

echo "provider-portability: PostgreSQL check passed ($schema_name)"
