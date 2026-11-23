# Local PostgreSQL to GCP: cost and access notes

**Date:** 2026-09-09
**Status:** Research and recommendation; no cloud resources were created or changed.

## Question

Can the project use PostgreSQL locally until it has a client, allow phones to
use the local services, and later migrate to the approved Google Cloud target
within an approximately US$15/month budget?

## Repository facts

- The approved bounded-pilot target is Google Cloud in Sydney
  (`australia-southeast1`): Cloud Run for the API, office web and PDF worker,
  Cloud SQL for PostgreSQL, Cloud Tasks and private Cloud Storage. Clients call
  the authenticated API; they do not receive database credentials.
  See [`GCP_TARGET_PLATFORM.md`](../architecture/GCP_TARGET_PLATFORM.md).
- PostgreSQL migrations and tenant-isolation rules are already proved against
  disposable PostgreSQL, but the API's durable runtime persistence adapters
  are still unconfigured. Running PostgreSQL locally therefore supports
  migration/integration testing immediately; it does not, by itself, make the
  current API persist production data.
- The product currently supports Android field capture. iOS is deferred by
  D-026. See [`CURRENT_STATUS.md`](../roadmap/CURRENT_STATUS.md) and
  [`ANDROID_DOMAIN_BOUNDARY.md`](../architecture/ANDROID_DOMAIN_BOUNDARY.md).

## Facts from primary sources

- Google Cloud is usage-billed through a Cloud Billing account. A billing
  account can pay for one or more projects; Google does not provide a single
  fixed-price “$15 plan” that includes a number of applications or databases.
  [Create a self-serve Cloud Billing account](https://docs.cloud.google.com/billing/docs/how-to/create-billing-account?hl=en)
- Cloud SQL for PostgreSQL supports creating multiple databases inside an
  instance. Cloud SQL quotas and limits apply independently of a budget; the
  current documentation lists up to 1,000 instances per project with the new
  SQL network architecture, subject to quota and availability. These are
  technical limits, not what a $15 budget can operate.
  [Create and manage PostgreSQL databases](https://docs.cloud.google.com/sql/docs/postgres/create-manage-databases?authuser=7)
  and [Cloud SQL quotas and limits](https://docs.cloud.google.com/sql/docs/postgres/quotas).
- The current Cloud SQL pricing page lists the shared-core `db-f1-micro` at
  US$0.0105/hour and states that shared-core instances are not covered by the
  Cloud SQL SLA.
  [Cloud SQL pricing](https://cloud.google.com/sql/pricing?authuser=1)
- Cloud Run is usage-based and a project can run many services. Services can
  scale down when idle, but CPU, memory, requests, networking, image storage,
  logs and other resources can still contribute to cost.
  [Cloud Run resource model](https://docs.cloud.google.com/run/docs/resource-model?authuser=921975487)
  and [Cloud Run pricing](https://cloud.google.com/run/pricing).
- Cloud Storage charges for storage, operations and network usage, with rates
  dependent on storage class and location. Sydney is a supported region.
  [Cloud Storage pricing](https://cloud.google.com/storage/pricing).
- Google Cloud budget alerts do not automatically stop usage or billing. A
  spend-cap preview can pause eligible services such as Cloud Run, but it does
  not pause persistent resources such as Cloud SQL.
  [Budgets and alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets?authuser=7)
  and [Spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps?authuser=01).
- Cloud SQL supports importing PostgreSQL SQL dumps and documents `pg_dump`,
  `pg_restore` and Database Migration Service as migration options.
  [Cloud SQL SQL-dump import/export](https://cloud.google.com/sql/docs/postgres/import-export/import-export-sql)
  and [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/17/app-pgrestore.html).
- Auth0 is a separate bill from GCP. Its current public pricing shows a Free
  plan and paid Essentials pricing; the required MFA/organization features
  must be checked against the selected Auth0 AU configuration.
  [Auth0 pricing](https://auth0.com/pricing).

## Recommendation and inferences

1. Use local PostgreSQL for development, tests and fictional demonstration
   data. This is a good cost-saving decision and is compatible with the current
   architecture if the same migrations and PostgreSQL version are used locally
   and in Cloud SQL.
2. Keep one `height_safety` database for the current product and preserve the
   existing company-scoped tenant/RLS boundary. Do not create one database per
   customer at this stage.
3. Phones should call the NestJS API. For same-Wi-Fi development, point a
   debug Android build at the developer machine's LAN address. For an off-site
   phone, use a private VPN or authenticated HTTPS tunnel, or deploy the API.
   Do not expose PostgreSQL port 5432 or database credentials to a phone.
4. Before a real client, deploy a staging environment and rehearse migrations,
   backups/restoration, private photo storage, authentication, tenant
   isolation and sync. If the local database contains only fictional data, a
   fresh Cloud SQL database plus migrations is simpler than migrating data.
5. A rough US$15/month GCP budget is likely enough for one very small shared
   Cloud SQL instance plus small storage and low-volume scale-to-zero Cloud Run
   services, but it is not a reliable production guarantee. The repository's
   2026-09-04 indicative estimate was about US$11.07/month for the smallest
   Cloud SQL compute and 20 GiB disk, plus about US$0.20 for 10 GiB object
   storage, before backups, egress, taxes, logs and authentication. This is an
   estimate, not a quote.
6. A second tiny application can technically share the same GCP billing
   account and use another Cloud Run service. A second database can technically
   share the same Cloud SQL instance. Both share the same bill and capacity,
   however; a separate production application should receive separate
   credentials and preferably a separate database/project. The budget does
   not promise a fixed number of apps or databases.

## What deploying the API means

Deploying the API to Cloud Run means packaging the NestJS API as a container
image, storing that image in a container registry, and creating a Cloud Run
service from it. Cloud Run supplies a stable HTTPS endpoint and can require
authentication. The service connects to Cloud SQL through the configured
application boundary; phones still call the API and never connect directly to
Cloud SQL. See [Deploy container images to Cloud Run](https://docs.cloud.google.com/run/docs/deploying)
and [Cloud Run HTTPS endpoints](https://docs.cloud.google.com/run/docs/triggering/https-request).

With default request-based billing, Cloud Run charges mainly while instances
start, stop or process requests. This makes an idle, low-volume API often free
or very inexpensive after the applicable free tier, but container image storage,
logs, network traffic, minimum instances and other services can add charges.
Cloud SQL is different: its small database instance and allocated storage are
persistent charges even when the API receives no requests. This difference is
why deploying only the API is not the same as deploying the complete customer
system.

## Open ambiguity

If “the $15 plan” means Supabase, Render, Railway, Hostinger or another named
provider rather than Google Cloud, the app/database limits and pricing are
different. The exact provider and currency are required for a precise count.
