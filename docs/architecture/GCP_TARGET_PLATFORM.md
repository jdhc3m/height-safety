# GCP Target Platform

Status: **target architecture under D-041**, 2026-09-07. No cloud resource
has been created or changed by this document.

The bounded-pilot target is Google Cloud in `australia-southeast1` (Sydney).
The target keeps the application/API boundary intact: Cloud SQL is the
database host, not the API host. Android and the browser call the authenticated
HTTPS API; the API and asynchronous report worker authorize persistence, with
clients using only narrowly scoped short-lived object URLs when media transfer
requires it.

## Service map

| Product responsibility | GCP target | Boundary |
| --- | --- | --- |
| NestJS application/API | Cloud Run `api` service with an authenticated HTTPS application boundary | The API host validates identity, tenant membership, role and workflow state before database or object access. |
| Next.js office application | Cloud Run `web` service | The browser uses the API contract; it never connects to Cloud SQL directly, and any object transfer uses an API-authorized short-lived URL. |
| Draft PDF generation | Separate Cloud Run `pdf-worker` service | The worker is not a public application endpoint. It accepts authenticated Cloud Tasks requests and writes an immutable report revision through application-owned storage ports. |
| Asynchronous delivery | Cloud Tasks queue in Sydney | The API enqueues a stable, idempotent report task; an OIDC service identity invokes the private worker; retry/dead-letter behavior remains part of deployment configuration. |
| Relational data | Cloud SQL for PostgreSQL in Sydney | Application migrations and the existing tenant-isolation boundary remain authoritative. The runtime uses the least-privilege application role; migration/admin access is separate. |
| Photos and reports | Private regional Cloud Storage bucket in Sydney | Public access is prevented. The application-owned object-storage adapter enforces tenant-prefixed keys, checksums, scoped access and photo association. GCS-specific SDK calls stay below that adapter. |
| Secrets and service identity | Secret Manager plus dedicated service accounts | Secrets stay outside images and source control. API, web, worker, task invoker and migration identities are separated according to least privilege. |

Authentication remains a separate decision. The current API/session boundary
must continue to accept a provider token through an adapter, then own
application membership, roles, session state, offline leases, evidence
recovery and audit semantics.

## Request and report flow

```text
Android / office browser
          |
          | HTTPS + application authentication
          v
     Cloud Run API host
       |          | \
       |          |  \ enqueue stable report task
       |          v   v
       |     Cloud SQL       Cloud Tasks -> private Cloud Run PDF worker
       |                                      |
       +---------- Cloud Storage <------------+
                    private photos/reports
```

The API remains the only application entry point for field and office data
operations. A report task carries an approved snapshot/report identity and
idempotency key, not arbitrary client instructions. The worker must re-check
authorisation and snapshot state before creating a report revision. A database
backup alone is insufficient: tenant export/restore must cover both relational
records and associated private object bytes.

## Non-negotiable project boundaries

- Keep Cloud SQL and Cloud Storage in infrastructure adapters; domain and
  application ports remain provider-neutral.
- Keep Android local-first capture, encrypted evidence, durable outbox,
  idempotent replay, photo association, conflict visibility and offline lease
  behavior unchanged.
- Preserve composite tenant keys, transaction-local tenant context, forced
  row-level policies, current-membership checks and auditability.
- Keep NSW/Queensland as explicit recorded site context. The region or a GCP
  service does not infer legal rules, inspection intervals or compliance.
- Keep report wording neutral: draft report, recorded outcome, submitted by
  inspector, reviewed by and further assessment required.
- Do not expose PostgreSQL credentials, Cloud SQL endpoints or public object
  URLs to Android or the browser.

## Readiness gates before real data

The target does not close the remaining operational gates. Before a controlled
pilot or real partner data, the project still needs evidence for:

- private Cloud SQL connectivity, migration execution, role separation,
  backup/restore and a tested recovery exercise;
- Cloud Storage access policy, checksum behavior, retention/deletion controls,
  export and restoration of photo/report bytes;
- Cloud Tasks authenticated invocation, retry/dead-letter handling and
  idempotent report generation;
- runtime IAM, secret rotation, audit logging, monitoring and cost alerts;
- retention, RPO/RTO, residency for data/backups/logs/subprocessors and G-05/
  G-06 partner review; and
- production sizing for API, web and PDF worker memory, CPU, timeout,
  concurrency, cold start, fonts and retry behavior.

This file is a target/service map, not a deployment script. Cloud mutation
remains an explicitly authorised step, and no Terraform or provider-specific
runtime configuration is introduced until the deployment work and its gates
are approved. The Android `api_base_url` therefore remains a safe placeholder
until an authorised Cloud Run API service exists; no unverified endpoint is
embedded in the app.
