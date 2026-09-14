#!/usr/bin/env bash
set -euo pipefail

container="${POSTGRES_CONTAINER:-height-safety-postgres}"
docker_context="${DOCKER_CONTEXT:-colima}"
admin_user="${POSTGRES_ADMIN_USER:-height_safety}"
company_id="${COMPANY_ID:-aaa}"
user_id="${AUTH0_USER_ID:-auth0-inspector}"

: "${AUTH0_USER_SUB:?set AUTH0_USER_SUB to the Auth0 user's sub}"
: "${AUTH0_USER_EMAIL:?set AUTH0_USER_EMAIL to the Auth0 user's verified email}"

docker --context "$docker_context" exec --interactive "$container" \
  psql --username="$admin_user" --dbname=height_safety \
  --set=ON_ERROR_STOP=1 \
  --set=company_id="$company_id" \
  --set=user_id="$user_id" \
  --set=identity_subject="$AUTH0_USER_SUB" \
  --set=email="$AUTH0_USER_EMAIL" <<'SQL'
INSERT INTO companies (company_id, name)
VALUES (:'company_id', 'AAA local test company')
ON CONFLICT (company_id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO users (
  company_id,
  user_id,
  identity_subject,
  email,
  role,
  active
)
VALUES (
  :'company_id',
  :'user_id',
  :'identity_subject',
  lower(trim(:'email')),
  'inspector',
  TRUE
)
ON CONFLICT (company_id, user_id) DO UPDATE
SET identity_subject = EXCLUDED.identity_subject,
    email = EXCLUDED.email,
    role = 'inspector',
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP;
SQL

echo "Seeded company ${company_id} and Inspector membership ${user_id}."
