# Deferred work and vendor-cost research

**Date:** 2026-09-04
**Status:** Research and indicative estimate; GCP Sydney is the bounded-pilot
target under D-041, but this is not a production-deployment approval.

This note answers which product work is still deferred and which external services
may create a cash cost for a controlled pilot. Amounts are approximate USD list
prices using 730 hours per month, low traffic, and Sydney/Australia regions where
available. They are not an invoice or a commitment to deploy.

## What is still missing

The bounded Android 3B-03 local anchor-capture and 3B-04 local review/queue
slices are implemented, but this is not a complete pilot. The remaining work
is:

1. **Build 3C sync:** durable idempotent mutation outbox, photo upload queue and
   retry states, server acknowledgements, conflict visibility, logout/lease
   expiry/revocation safety, and the bounded offline recovery path.
2. **Build 3D office review and reports:** change requests, reviewer decisions,
   exact immutable approved snapshots, deterministic draft PDF revisions, audit
   export and controlled cleanup.
3. **Configure production adapters:** managed invitation-only identity and
   membership, durable API/database persistence, durable audit, private object
   storage, deployment configuration and runtime role separation. The current
   scaffold deliberately leaves these adapters unconfigured.
4. **Close operational controls:** backup and restore exercise, tenant export,
   retention/deletion terms, RPO/RTO, data-residency decision, monitoring and
   cost alerts. These are prerequisites for real customer data, not merely
   hosting details.
5. **Validate with people and evidence:** design-partner review of the offline
   lease/recovery (G-05), real-data pilot terms (G-06), practitioner/legal/
   privacy review, and validation of NSW and Queensland terminology and report
   wording. Any licensed-standard or manufacturer-instruction review must remain
   evidence-led; it does not turn the product into an automatic compliance or
   certification system.

The authoritative status and ticket order are in
[`CURRENT_STATUS.md`](CURRENT_STATUS.md) and
[`STAGE_2D_IMPLEMENTATION_TICKETS.md`](STAGE_2D_IMPLEMENTATION_TICKETS.md).

## Explicitly deferred, not missing from the anchor MVP

- Other asset families and a generic asset catalogue.
- Automatic compliance, certification, standards/rules interpretation, legal
  interval inference, or engineer approval.
- Jurisdictions beyond NSW and Queensland, or statutory conclusions inferred
  from the jurisdiction field.
- Native iOS/Kotlin Multiplatform work.
- Customer portal, billing/accounting/invoicing, advanced CRM, scheduling,
  broad integrations and AI features.
- Concurrent offline editing and offline final approval.

## Likely paid services

| Need | Candidate | Indicative cost and trade-off |
| --- | --- | --- |
| Managed PostgreSQL | **Cloud SQL for PostgreSQL, Sydney** | Smallest shared-core `db-f1-micro` is about **US$7.67/month** at $0.0105/hour. A 20-GiB Sydney SSD adds about **US$3.40/month**, so roughly **US$11.07/month** before backups, egress and taxes. It is not SLA-covered; suitable only for a low-volume controlled pilot. See [Cloud SQL pricing](https://cloud.google.com/sql/pricing?hl=en) and the [Cloud SQL FAQ](https://docs.cloud.google.com/sql/docs/postgres/faq?authuser=19). |
| Alternative database | AWS RDS PostgreSQL, Sydney | Current public Sydney price data indicates about **US$18.25/month** for a `db.t4g.micro` single-AZ instance plus about **US$2.76/month** for 20 GiB gp3: roughly **US$21.01/month** before backups, egress and taxes. An eligible new AWS account may have free-tier coverage for a period. See [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/) and the [Sydney RDS price list](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/ap-southeast-2/index.json). |
| Private photo/report storage | **Cloud Storage Standard, Sydney** | About **US$0.020/GiB-month**; 10 GiB is about **US$0.20/month**, before operations and egress. Sydney does not receive the US-only Always Free storage tier. See [Cloud Storage pricing](https://cloud.google.com/storage/pricing). |
| API/web/PDF worker | **Cloud Run + Cloud Tasks**, Sydney | Cloud Run request-based free tier includes 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests per month; Cloud Tasks includes the first 1 million operations monthly. Low-volume use with scale-to-zero should be **$0 or cents**, but a minimum instance, logs, egress or other resources changes that. See [Cloud Run pricing](https://cloud.google.com/run/pricing) and [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing). |
| Alternative authentication (not selected) | **Amazon Cognito**, Sydney | Lite/Essentials direct or social sign-in has an indefinite free tier up to 10,000 MAU. TOTP authenticator-app MFA avoids SMS charges; invitation/verification email is a separate SES cost. Company membership, roles and product audit semantics still belong in our application. See [Cognito pricing](https://aws.amazon.com/cognito/pricing/), [TOTP MFA](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html) and [regional data considerations](https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html). |
| Invitation/verification email | **Amazon SES** | About **US$0.10 per 1,000 emails** after the applicable introductory allowance; no SMS vendor is needed if TOTP is used. See [SES pricing](https://aws.amazon.com/ses/pricing/). |
| Android distribution | Android Developer Console | Limited distribution currently has **no registration fee for up to 20 devices**. Full distribution requires a **one-time US$25** registration. See [Android Developer Console distribution options](https://support.google.com/android-developer/answer/16640817?hl=en). |
| Practitioner, legal and privacy validation | Design partner / qualified professionals | Required before a real-data pilot, but **quote-only**. This is likely to cost more than the initial cloud bill and cannot be responsibly estimated from vendor list prices. |

Potential but avoidable costs at this stage are SMS/Twilio, maps, analytics,
AI, Stripe/billing, CRM, customer-portal hosting, Apple Developer enrolment and
enterprise integrations. They are either unnecessary for the current workflow
or explicitly out of scope.

## Cheapest practical option

There are two different answers:

- **Synthetic demo/local development:** approximately **$0/month** in vendor
  spend. Keep the current local/debug path and limited Android distribution.
  This does not support real customer data or prove the production controls.
- **Small controlled pilot with real data:** keep the app, database, private
  storage, Cloud Run services and queue in **GCP Sydney**, using the already
  exercised Cloud Run renderer candidate. The authentication vendor remains a
  separate open decision; keep the provider-neutral adapter until that decision
  is made. The GCP database/storage baseline is approximately
  **US$11.27/month** before authentication, backups, egress, taxes, paid
  support, engineering and professional validation: about US$11.07 for the
  smallest Cloud SQL instance and 20 GiB, plus roughly US$0.20 for 10 GiB of
  object storage; compute and queue can remain free or near-free at this
  scale.

This is the lowest-cost target that keeps the current Australian-region
services together and reuses the existing renderer evidence. It is **not** an
approved production deployment. Before any cloud mutation or real customer
data, the project must close residency, backup/restore, retention, export,
RPO/RTO, runtime IAM and G-05/G-06 evidence questions.

Cloud Identity Platform may appear cheaper because its first 50,000 email/social
MAU are free, but Firebase states that Firebase Authentication processes data
exclusively in US data centers. It should therefore not be used for real partner
data until the unresolved residency and privacy decision is explicitly accepted;
see [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing)
and [Firebase data-processing locations](https://firebase.google.com/support/privacy).

Auth0 is a more turnkey alternative but not the cheap option for this workflow:
Auth0's current B2B material lists Essentials from **US$150/month for 500 MAU**;
see [Auth0 B2B plans](https://auth0.com/blog/whatever-you-are-building-auth0-has-a-plan/).

## Confidence and caveats

- Repository status and deferral claims: **high confidence**, based on the
  current roadmap and architecture documents.
- Vendor rates: **high confidence as list-price snapshots on 2026-09-03**, but
  rates, free tiers, taxes and eligibility can change.
- Monthly totals: **indicative estimates**, not quotes. They exclude engineering
  time, professional review, support, backups beyond the small baseline,
  observability, egress, domains and payment-processing fees.
- No cloud resource has been created by this research. GCP Sydney is the target
  under D-041, while native provider configuration and production deployment
  remain open.
