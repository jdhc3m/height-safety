# 2D-04 Provider and Authentication Comparison

Status: **Done — Cloud Run approved as first managed renderer candidate (D-024); authentication vendor deferred**,
2026-08-18

## Decision boundary

This comparison narrowed the candidates. On 2026-08-18 the owner approved
Cloud Run in `australia-southeast1` as the first managed draft-PDF renderer
candidate (D-024). G-02 is closed. G-03 remains open for production database,
backup and export evidence. Authentication remains a comparison only; the
owner deferred the identity vendor.

Only fictional fixture data may be used. The product scope remains installed
single-point roof anchors in New South Wales and Queensland, using neutral
evidence language without compliance, certification or engineering claims.

## Hosting comparison

| Criterion | Google Cloud candidate | Credible AWS alternative |
| --- | --- | --- |
| Container compute | Cloud Run service, request concurrency one, 2 vCPU and 2 GiB, scale from zero | ECS task on Fargate, task concurrency one; 2 vCPU requires at least 4 GiB, so the exact 2-vCPU/2-GiB profile cannot be reproduced |
| Australian location | Cloud Run records customer data in the selected region and supports `australia-southeast1` (Sydney) | `ap-southeast-2` is the Sydney region with three availability zones |
| Queue | Cloud Tasks is available in Sydney; an OIDC service account can invoke the private Cloud Run target | SQS is regional and has managed retries/dead-letter queues; starting one Fargate task per message needs additional ECS/EventBridge/Lambda orchestration |
| Private report object | Regional Cloud Storage bucket with public-access prevention and uniform bucket-level access | Regional S3 bucket with all Block Public Access controls; S3 is the approved baseline semantic |
| Recovery model | Cloud Tasks retries a failed request; create-only object upload and a stable job identity prevent duplicate published reports | SQS visibility timeout/retry plus conditional S3 write can provide the same boundary, but needs a separate exercise |
| Portability | Container is portable. Cloud Storage is not S3-compatible, so the application-owned storage adapter and contract tests remain mandatory | Native S3 semantics and PostgreSQL-compatible RDS reduce storage/database adapter variance |
| Renderer fit | Directly matches the passed 2-vCPU/2-GiB Linux profile and approved initial concurrency one | Minimum Fargate memory for 2 vCPU is 4 GiB, increasing the smallest comparable candidate and requiring a new constrained run |
| Operational burden | Low: Cloud Run, Cloud Tasks and Cloud Storage; one provider-specific adapter | Moderate: ECS task definitions, SQS consumer/orchestration, IAM roles, ECR and S3 |
| Cost evidence | Measured duration × hardcoded Sydney list-rate constants, queue operations and report storage; not an invoice line | Fargate bills requested vCPU and memory from image download until task termination; exact Sydney proof cost is not yet measured |
| Current result | **First managed renderer candidate; owner-approved in D-024** | **Credible portability alternative**; comparison only, no infrastructure implemented |

Cloud Run was the better first proof because it maps directly to the accepted
renderer profile and has the required compute, queue and object-storage
services in the same Sydney region. The owner approved that candidate in
D-024. AWS remains important evidence: it offers the cleanest S3 portability
baseline, but its Fargate size floor means it is not an exact substitute for
the tested candidate.

## Authentication comparison

No managed identity provider can enforce the offline lease by itself. The
backend must still check current company, role and session state for every
online request, while the Android application enforces an application-issued,
expiring offline-authorisation lease without deleting unsynchronised evidence.

| Requirement | Auth0 Australian tenant | Amazon Cognito in Sydney | Google Identity Platform |
| --- | --- | --- | --- |
| Invitation-only onboarding | Native Organization membership invitations can include organization roles and expiry | Administrator-created users and custom invitation messages; application must model company membership | Disable end-user signup and create users administratively; invitation acceptance is application-built |
| Tenant and role claims | Organizations plus organization-specific RBAC | User-pool groups/custom attributes and application-owned company membership | Identity Platform tenants plus custom claims |
| Administrator MFA | Per-role or per-user MFA can be required with post-login Actions | MFA can be enabled per user; application administration must enforce the Administrator rule | TOTP/SMS MFA exists, but role-specific enforcement requires application logic or blocking functions |
| Inspector/reviewer optional MFA | Actions can challenge by organization role or metadata | Per-user MFA preference supports optional enrollment | Per-user enrollment is possible after project/tenant MFA is enabled |
| Session revocation | Session Actions and Management API support session/refresh-token revocation | Token revocation and user disablement are supported | Tenant-aware Admin SDK revokes refresh tokens; ID tokens last about one hour |
| Audit events | Tenant logs and near-real-time log streams; retention depends on plan | CloudTrail records user-pool API activity; additional auth event exports add AWS configuration | Cloud Audit Logs plus optional Identity Platform activity logging |
| Australian data handling | Public-cloud AU locality controls the tenant domain and where tenant data is hosted | Regional user pool can be created in `ap-southeast-2`; contractual/subprocessor review remains required | Public Firebase privacy documentation says Firebase Authentication is processed in US data centres; written confirmation is needed before treating Identity Platform as Australian-resident |
| Export/exit | Bulk user export and Management API; passwords are not a portable dependency | Profile export needs an AWS reference architecture; password hashes are not exported | Admin SDK user listing/import and project migration tools; exact exit rehearsal still required |
| Indicative prototype cost | B2B Essentials is advertised from USD 35/month for 500 MAU; plan limits and AU availability must be confirmed before purchase | MAU feature-plan pricing plus email/SMS delivery; likely inexpensive at prototype volume but more operational configuration | Email/social tier currently lists the first 50,000 MAU as free; SMS MFA is extra |
| Fit with D-014 | **Best functional and residency fit for the next bounded proof** | **Credible alternative**, especially if AWS hosting is later preferred | **Deprioritise until residency is clarified** |

Auth0 AU should be the first authentication candidate shown to the owner. It
has the clearest invitation, organization-role, per-role MFA and Australian
tenant story. This is not approval: the owner must review the recurring cost,
plan limits, export behavior, contract and operational dependency. Cognito is a
credible lower-integration-cost alternative if the hosting direction moves to
AWS. Identity Platform should not progress while its Australian data-handling
position is unresolved.

## Cost method for the managed proof

The exercise records the duration and output size of three full benchmark
runs. `--collect-cost` separately prices the measured multi-render proof
harness and an estimated warm single-render execution using hardcoded Sydney
request-based Cloud Run CPU and memory constants, one queue operation and one
month of report-object storage. `sourceCheckedAt` is the collect-cost clock,
not a live price fetch. The estimate excludes free-tier discounts and is not
an invoice charge.

The model excludes PostgreSQL, production API/web services, support, backups,
network egress, log retention and authentication. Those costs are not caused
by a single report render and require the later production architecture and
pilot-volume assumptions.

## Local artifacts and current gate state

- `infra/spikes/cloud-run/` contains the pinned renderer image, private worker,
  lifecycle configuration and static candidate contract. The image is built
  locally and pushed directly to the namespaced Artifact Registry repository;
  Cloud Build is deliberately unused so it cannot add implicit staging or log
  buckets.
- `tools/provider-spike.sh` is the only mutation entry point. It rejects CI,
  production-looking projects, unresolved accounts and missing execution-time
  authorization. Owner-authorised non-TTY mutation is allowed only with the
  explicit confirm pair documented in `STAGE_2D_04_PROVIDER_AUTH_PROOF.md`.
- The worker accepts only a small fictional job identity and enqueue timestamp,
  uploads one final PDF directly to the private bucket, returns metadata rather
  than the PDF, and uses a create-only object write whose retry verifies the
  committed generation, size and hash.
- The termination scenario kills the whole candidate container after a local
  temporary PDF is observed; the queued retry must publish exactly one final
  object.
- `STAGE_2D_04_MANAGED_EVIDENCE.json` records
  `candidate-exercised-and-destroyed` and `managedProviderApproved: false`.
  That false flag is the spike artifact contract. Owner approval is D-024.
  `platformColdProbe` is a revision-token match, not a measured scale-to-zero
  start. Cost figures are duration × hardcoded list-rate constants.

The local commands, authorised managed cycle, destroy inventory and evidence
gate have been run. No production cloud resource is deployed. The owner
approved Cloud Run as the first managed renderer candidate (D-024) and
deferred the authentication vendor.

## Current first-party sources

Sources were last used as hardcoded rate constants on 2026-08-17. Recheck
prices and service capabilities at owner review.

- [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
- [Cloud Tasks locations](https://docs.cloud.google.com/tasks/docs/locations)
- [Cloud Tasks authenticated HTTP targets](https://docs.cloud.google.com/tasks/docs/create-tasks)
- [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing)
- [Cloud Storage locations](https://docs.cloud.google.com/storage/docs/locations)
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing)
- [AWS regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html)
- [Fargate CPU and memory combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html)
- [Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [SQS pricing](https://aws.amazon.com/sqs/pricing/)
- [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [Auth0 Organization invitations](https://auth0.com/docs/manage-users/organizations/configure-organizations/send-membership-invitations)
- [Auth0 MFA factors and policies](https://auth0.com/docs/secure/multi-factor-authentication/multi-factor-authentication-factors)
- [Auth0 tenant regions](https://auth0.com/docs/get-started/auth0-overview/create-tenants)
- [Auth0 log streams](https://auth0.com/docs/customize/log-streams)
- [Auth0 pricing](https://auth0.com/pricing)
- [Cognito user-pool features](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)
- [Cognito TOTP MFA](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html)
- [Cognito pricing](https://aws.amazon.com/cognito/pricing/)
- [Identity Platform multi-tenancy and sessions](https://docs.cloud.google.com/identity-platform/docs/multi-tenancy-managing-tenants)
- [Identity Platform audit logging](https://docs.cloud.google.com/identity-platform/docs/audit-logging)
- [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing)
- [Firebase data-processing locations](https://firebase.google.com/support/privacy/)
