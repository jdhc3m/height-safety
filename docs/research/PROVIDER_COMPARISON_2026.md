# Provider comparison — 2026

Status: research note; GCP Sydney is the bounded-pilot target under D-041;
production deployment and native provider configuration remain open.

## Finding

For a small Australian pilot, the strongest candidates are:

1. **Google Cloud Sydney** — Cloud Run for the NestJS API/web/PDF worker,
   Cloud SQL for PostgreSQL, Cloud Storage and Cloud Tasks. This best reuses
   the repository's existing Sydney Cloud Run renderer proof. Cloud SQL is
   available in `australia-southeast1` and provides managed backups, failover
   and encryption. Cloud Run is usage-based. Sources: [Cloud SQL regional
   availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview),
   [Cloud SQL PostgreSQL](https://cloud.google.com/sql/postgresql), [Cloud SQL
   pricing](https://cloud.google.com/sql/pricing/), and [Cloud Run
   pricing](https://cloud.google.com/run/pricing).

2. **DigitalOcean Sydney** — App Platform for containers, Managed PostgreSQL
   in `syd1`, and private Spaces for photos/reports. App Platform supports
   the `syd` region and VPC access to `syd1`; the smallest app container is
   listed at US$5/month, Managed PostgreSQL starts at US$15/month, and Spaces
   starts at US$5/month. Managed PostgreSQL provides daily point-in-time
   backups and SSL. Spaces is S3-compatible, private by default and supports
   presigned URLs, but Spaces itself has no built-in backup, so an independent
   copy/restore process is required. Sources: [App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/),
   [App Platform VPC](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/),
   [PostgreSQL pricing](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/),
   [PostgreSQL features](https://docs.digitalocean.com/products/databases/postgresql/details/features/),
   [Spaces pricing](https://docs.digitalocean.com/products/spaces/details/pricing/),
   [Spaces availability](https://docs.digitalocean.com/products/spaces/details/availability/),
   and [Spaces limits](https://docs.digitalocean.com/products/spaces/details/limits/).

3. **AWS** — RDS for PostgreSQL in Sydney plus App Runner or ECS/Fargate for
   the API, S3 for objects and SQS for jobs. RDS supports VPC placement,
   backups and point-in-time recovery. It is mature and a good long-term
   choice when AWS expertise or an organisational requirement exists, but it
   has more networking/IAM/container setup than the two options above.
   Sources: [RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html),
   [RDS backup and restore](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/managing-backup-restore.html),
   and [App Runner VPC access](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html).

## Project decision

D-041 points the bounded pilot at Google Cloud in `australia-southeast1`
(Sydney): Cloud Run for the NestJS API, Next.js office web and separate PDF
worker; Cloud Tasks for authenticated asynchronous invocation; Cloud SQL for
PostgreSQL; and private Cloud Storage for photos/reports. This is a target
architecture only. Cloud resources have not been created, and backup/restore,
retention, export, residency, runtime IAM and recovery gates remain open.

## Popular but weaker fit for this product

- **Supabase** is easy and has a Sydney region. Pro is listed at US$25/month
  and includes daily database backups retained for seven days. It is a good
  prototype choice, but the project still needs its own NestJS API and its
  built-in Auth/Storage/API features overlap the deliberate provider-neutral
  boundaries. Sources: [Supabase regions](https://supabase.com/docs/guides/platform/regions),
  [Supabase pricing](https://supabase.com/pricing), and [Supabase
  backups](https://supabase.com/docs/guides/platform/backups).
- **Neon** is very good for development, branching and intermittent traffic;
  it has a Sydney region and a usage-based Launch plan. Private Networking is
  a Scale feature, so it needs extra security/recovery review before being the
  first evidence-bearing production database. Sources: [Neon Sydney
  announcement](https://neon.com/docs/changelog/2024-02-02), [Neon
  pricing](https://neon.com/pricing), and [Neon security](https://neon.com/docs/security/security-overview).
- **Railway** and **Render** are popular and easy, but their currently listed
  deployment regions do not include Australia (Railway lists Singapore;
  Render lists Singapore as its Asia-Pacific option). Railway explicitly says
  its PostgreSQL template is an unmanaged service, so it would require an
  application-owned backup and recovery design. Sources: [Railway
  regions](https://docs.railway.com/deployments/regions), [Railway
  databases](https://docs.railway.com/databases), and [Render
  regions](https://render.com/docs/regions).
- **Fly.io Managed Postgres** is available in Sydney and includes HA,
  backups and private networking, but its Basic plan is listed at US$38/month
  plus storage and several operational features remain under development.
  Sources: [Fly regions](https://fly.io/docs/reference/regions/) and [Fly
  Managed Postgres](https://fly.io/docs/mpg/).

## Community signal

Recent Reddit and Hacker News discussions repeatedly mention Vercel or a
small PaaS with Neon/Supabase/Railway for early projects, while experienced
operators emphasise managed backups and a tested restore rather than a free
tier. These are anecdotal experiences, not reliability or residency evidence:
[Reddit early-stage Postgres discussion](https://www.reddit.com/r/webdev/comments/1uqq52r/whats_the_most_practical_postgres_hosting_choice/),
[Reddit small production hosting discussion](https://www.reddit.com/r/webdev/comments/1w6f563/render_vs_railway_vs_cloudflare_workers/),
and [Hacker News Cloud Run/Cloud SQL to DigitalOcean discussion](https://news.ycombinator.com/item?id=25187779).

## Project implication

The API host and database host remain different services:

```text
Android / office web -> HTTPS -> NestJS API host
                                  -> private PostgreSQL connection -> database host
                                  -> private object-storage adapter -> photo/report bucket
```

Do not let Android or the browser connect directly to PostgreSQL. The GCP
target must pass the existing tenant-isolation, private-object, backup/export
and restore checks. A database backup alone does not preserve photo bytes in
object storage.
