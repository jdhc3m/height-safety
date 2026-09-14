#!/usr/bin/env bash
set -euo pipefail

container="${POSTGRES_CONTAINER:-height-safety-postgres}"
docker_context="${DOCKER_CONTEXT:-colima}"
admin_user="${POSTGRES_ADMIN_USER:-height_safety}"
company_id="${COMPANY_ID:-aaa}"
user_id="${INSPECTOR_USER_ID:-${AUTH0_USER_ID:-auth0-inspector}}"
client_id="${LOCAL_CLIENT_ID:-client-local}"
site_id="${LOCAL_SITE_ID:-site-local}"
anchor_id="${LOCAL_ANCHOR_ID:-anchor-local}"
job_id="${LOCAL_JOB_ID:-job-local}"
assignment_id="${LOCAL_ASSIGNMENT_ID:-assignment-local}"
job_pack_version="${LOCAL_JOB_PACK_VERSION:-1}"
site_reference="${LOCAL_SITE_REFERENCE:-LOCAL-SITE-001}"
job_reference="${LOCAL_JOB_REFERENCE:-LOCAL-JOB-001}"

docker --context "$docker_context" exec --interactive "$container" \
  psql --username="$admin_user" --dbname=height_safety \
  --set=ON_ERROR_STOP=1 \
  --set=company_id="$company_id" \
  --set=user_id="$user_id" \
  --set=client_id="$client_id" \
  --set=site_id="$site_id" \
  --set=anchor_id="$anchor_id" \
  --set=job_id="$job_id" \
  --set=assignment_id="$assignment_id" \
  --set=job_pack_version="$job_pack_version" \
  --set=site_reference="$site_reference" \
  --set=job_reference="$job_reference" <<'SQL'
INSERT INTO companies (company_id, name)
VALUES (:'company_id', 'AAA local test company')
ON CONFLICT (company_id) DO UPDATE
SET updated_at = CURRENT_TIMESTAMP;

INSERT INTO clients (company_id, client_id, name)
VALUES (:'company_id', :'client_id', 'Local test client')
ON CONFLICT (company_id, client_id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO sites (
  company_id, site_id, client_id, name, address, jurisdiction,
  access_notes, site_reference
)
VALUES (
  :'company_id', :'site_id', :'client_id', 'Local test site',
  '1 Example Street, Brisbane QLD 4000', 'QLD',
  'Use the front access gate.', :'site_reference'
)
ON CONFLICT (company_id, site_id) DO UPDATE
SET client_id = EXCLUDED.client_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    jurisdiction = EXCLUDED.jurisdiction,
    access_notes = EXCLUDED.access_notes,
    site_reference = EXCLUDED.site_reference,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO anchors (
  company_id, anchor_id, site_id, label, register_id, location,
  anchor_type, manufacturer, model, install_context, register_status, notes
)
VALUES (
  :'company_id', :'anchor_id', :'site_id', 'A-001', 'LOCAL-A-001',
  'North roof near access ladder', 'single_point', 'Recorded manufacturer',
  'Recorded model', 'Existing installed anchor', 'active', NULL
)
ON CONFLICT (company_id, anchor_id) DO UPDATE
SET site_id = EXCLUDED.site_id,
    label = EXCLUDED.label,
    register_id = EXCLUDED.register_id,
    location = EXCLUDED.location,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO jobs (
  company_id, job_id, site_id, jurisdiction, reference, planned_date,
  workflow_status, job_pack_version
)
VALUES (
  :'company_id', :'job_id', :'site_id', 'QLD', :'job_reference',
  CURRENT_DATE, 'assigned', :'job_pack_version'
)
ON CONFLICT (company_id, job_id) DO UPDATE
SET site_id = EXCLUDED.site_id,
    jurisdiction = EXCLUDED.jurisdiction,
    reference = EXCLUDED.reference,
    planned_date = EXCLUDED.planned_date,
    workflow_status = 'assigned',
    job_pack_version = :'job_pack_version',
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO job_pack_snapshots (
  company_id, job_id, job_pack_version, site_id, jurisdiction,
  site_document, anchors_document
)
VALUES (
  :'company_id', :'job_id', :'job_pack_version', :'site_id', 'QLD',
  json_build_object(
    'companyId', :'company_id',
    'siteId', :'site_id',
    'clientId', :'client_id',
    'name', 'Local test site',
    'address', '1 Example Street, Brisbane QLD 4000',
    'jurisdiction', 'QLD',
    'accessNotes', 'Use the front access gate.',
    'siteReference', :'site_reference',
    'createdAt', CURRENT_TIMESTAMP,
    'updatedAt', CURRENT_TIMESTAMP
  )::text,
  json_build_array(json_build_object(
    'companyId', :'company_id',
    'anchorId', :'anchor_id',
    'siteId', :'site_id',
    'label', 'A-001',
    'registerId', 'LOCAL-A-001',
    'location', 'North roof near access ladder',
    'anchorType', 'single_point',
    'manufacturer', 'Recorded manufacturer',
    'model', 'Recorded model',
    'installContext', 'Existing installed anchor',
    'registerStatus', 'active',
    'createdAt', CURRENT_TIMESTAMP,
    'updatedAt', CURRENT_TIMESTAMP
  ))::text
)
ON CONFLICT (company_id, job_id, job_pack_version) DO NOTHING;

INSERT INTO job_assignments (
  company_id, assignment_id, job_id, inspector_user_id,
  assigned_by_user_id, assignment_type, is_primary, assigned_at
)
VALUES (
  :'company_id', :'assignment_id', :'job_id', :'user_id',
  NULL, 'assigned', TRUE, CURRENT_TIMESTAMP
)
ON CONFLICT (company_id, assignment_id) DO UPDATE
SET job_id = EXCLUDED.job_id,
    inspector_user_id = EXCLUDED.inspector_user_id,
    assignment_type = 'assigned',
    is_primary = TRUE;
SQL

echo "Seeded assigned QLD job ${job_id} for Inspector membership ${user_id}."
