# G-03 provider research — Australian-region capabilities

**Research date:** 2026-08-24 (Australia/Brisbane)

**Status:** Point-in-time primary-source research only. No production provider is selected, no cloud resource was created or changed, and G-03 is not closed by this document.

## Reading guide and scope

- **[Evidence — repository]** The current roadmap records G-03 as the gate for production database, object storage, backup, and export decisions. It keeps provider selection open and records the Sydney Cloud Run candidate separately. See [CURRENT_STATUS.md](CURRENT_STATUS.md), [STAGE_2D_04_PROVIDER_COMPARISON.md](STAGE_2D_04_PROVIDER_COMPARISON.md), and [DECISION_LOG.md](../product/DECISION_LOG.md).
- **[Evidence — repository]** The architecture requires PostgreSQL portability, private object storage, an application storage adapter with S3-compatible semantics as the baseline, tenant isolation, durable evidence, immutable report revisions, and a tenant export/handover path. See [TECHNICAL_DECISIONS.md](../architecture/TECHNICAL_DECISIONS.md) and [PROTOTYPE_ARCHITECTURE.md](../architecture/PROTOTYPE_ARCHITECTURE.md).
- **[Evidence — provider]** Findings below are taken from official Google Cloud and AWS documentation checked on the research date. A service-region listing is evidence that the documented service capability exists in that region; it is not evidence of a configured project, resource, quota, price, SLA, or legal outcome.
- **[Inference — G-03]** Provider capabilities below should be converted into configuration checks, adapter contract tests, recovery exercises, and an owner decision before production infrastructure is approved.

The comparison is limited to the existing candidates and boundary: Cloud SQL for PostgreSQL versus Amazon RDS for PostgreSQL; Cloud Storage versus Amazon S3 for private object storage and S3-compatible application semantics; managed backup/export primitives; and the already-approved Sydney renderer boundary. It does not interpret Australian legal rules, standards, certification, or compliance.

## Findings summary

| Area | Evidence checked on 2026-08-24 | G-03 implication |
| --- | --- | --- |
| Managed PostgreSQL | Cloud SQL lists Sydney as `australia-southeast1`; RDS lists Sydney as `ap-southeast-2`. Both document regional HA options. | Both remain viable comparison candidates, but regional HA is not regional-outage DR and SQL/extension portability still needs tests. |
| Private object storage | GCS lists Sydney, Melbourne, and an AU dual-region pairing; GCS and S3 both document private-access controls, versioning/recovery, and integrity mechanisms. | Keep the application-owned storage adapter and test conditional writes, checksums, private access, and short-lived retrieval against each candidate. |
| Provider backup/export | Cloud SQL has standard/enhanced backup, PITR, and Cloud Storage SQL/CSV export. RDS has automated backups, PITR, snapshots, and S3 snapshot export; its snapshot export is Parquet and is not restorable to RDS. | Treat provider recovery as infrastructure recovery. Define a separate provider-independent tenant export contract. |
| Renderer | Cloud Run and Cloud Tasks both list Sydney. The repository has an owner-approved, exercised Cloud Run Sydney candidate with private queued invocation. | Preserve D-024 as the renderer boundary; it does not select the database or object-storage provider. |

## 1. Managed PostgreSQL in Australian regions

### Google Cloud SQL for PostgreSQL

**Checked:** 2026-08-24.

- **[Evidence — provider]** Cloud SQL’s PostgreSQL location documentation lists `australia-southeast1` (Sydney) and `australia-southeast2` (Melbourne). The instance location is selected at creation and cannot be changed afterward. [Cloud SQL PostgreSQL instance locations](https://docs.cloud.google.com/sql/docs/postgres/locations)
- **[Evidence — provider]** The current region-availability page lists Sydney as supporting Cloud SQL Enterprise and Enterprise Plus editions for PostgreSQL. [Cloud SQL PostgreSQL region availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview)
- **[Evidence — provider]** High availability is regional: a primary and standby are placed in different zones in the primary region and use synchronous replication to disks. This protects against a zone/instance failure, but is not a second-region copy. [Cloud SQL high availability](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- **[Evidence — provider]** Cloud SQL is itself regional. Google documents a cross-region read replica for a secondary region and identifies backup/restore or export/import as alternatives with slower recovery characteristics. [Cloud SQL disaster recovery](https://docs.cloud.google.com/sql/docs/postgres/intro-to-cloud-sql-disaster-recovery)

### Amazon RDS for PostgreSQL

**Checked:** 2026-08-24.

- **[Evidence — provider]** AWS lists Asia Pacific (Sydney), `ap-southeast-2`, as an RDS Region. AWS also states that Regions are isolated and resources are not automatically replicated between Regions. [AWS Regions and Availability Zones for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html)
- **[Evidence — provider]** RDS for PostgreSQL documents managed PostgreSQL versions, automated/manual backups, snapshots, point-in-time restore, Multi-AZ deployments, read replicas, VPC operation, and standard SQL-client connectivity. [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- **[Evidence — provider]** A Multi-AZ DB instance has a synchronously replicated standby in a different Availability Zone. AWS describes this as high availability and data redundancy, not as a second-Region design. [Amazon RDS Multi-AZ deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html)

### Portability interpretation

- **[Inference — G-03]** The two services meet the narrow “managed PostgreSQL in Sydney” comparison requirement, but that does not establish interchangeable behavior. The application should constrain itself to supported PostgreSQL features, record the engine/version/extension matrix, keep migrations portable, and run tenant-isolation, transaction, backup-restore, and export tests against the selected implementation.
- **[Inference — G-03]** “High availability” should not be recorded as region-outage recovery. A G-03 decision needs a separately stated regional recovery posture, including where copies are stored, how a restore creates or promotes a database, and how the application handles the recovery event.

## 2. Private object storage and S3-compatible semantics

### Google Cloud Storage

**Checked:** 2026-08-24.

- **[Evidence — provider]** Cloud Storage states that a bucket’s location determines where object data is stored. Its current location table lists Sydney (`AUSTRALIA-SOUTHEAST1`), Melbourne (`AUSTRALIA-SOUTHEAST2`), and an `AU` configurable dual-region consisting of those two regions. [Cloud Storage bucket locations](https://docs.cloud.google.com/storage/docs/locations)
- **[Evidence — provider]** Public access prevention blocks access granted to `allUsers` and `allAuthenticatedUsers`; signed URLs are not disabled by that control. [Cloud Storage public access prevention](https://docs.cloud.google.com/storage/docs/public-access-prevention)
- **[Evidence — provider]** Uniform bucket-level access disables object ACLs and makes IAM the access-control mechanism for the bucket and its objects. [Uniform bucket-level access](https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access)
- **[Evidence — provider]** Google describes Cloud Storage interoperability as compatibility with *some* other platforms and says the XML API is interoperable with *some* tools and libraries that work with Amazon S3. It documents an XML endpoint and HMAC credentials for that interoperability path. [Cloud Storage interoperability](https://docs.cloud.google.com/storage/docs/interoperability)
- **[Evidence — provider]** Cloud Storage supports signed URLs for time-limited access, CRC32C/MD5 integrity validation, generation/metageneration preconditions, and strong consistency for object reads, writes, deletes, and listings. [Signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls), [data validation](https://docs.cloud.google.com/storage/docs/data-validation), [request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions), and [consistency](https://docs.cloud.google.com/storage/docs/consistency)
- **[Evidence — provider]** Cloud Storage documents soft delete and Object Versioning as separate recovery/protection mechanisms. [Soft delete](https://docs.cloud.google.com/storage/docs/soft-delete) and [Object Versioning](https://docs.cloud.google.com/storage/docs/object-versioning)

### Amazon S3

**Checked:** 2026-08-24.

- **[Evidence — provider]** S3 buckets are created in an AWS Region; AWS states that objects in a Region do not leave that Region unless the customer explicitly transfers or replicates them. S3 buckets and objects are private by default. [Amazon S3 overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- **[Evidence — provider]** S3 Block Public Access can be applied at organization, account, bucket, or access-point scope, with the most restrictive combination taking effect. [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- **[Evidence — provider]** S3 supports presigned URLs for time-limited object download or upload without changing the bucket policy; AWS describes them as bearer tokens whose access is limited by the generating principal and expiration. [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- **[Evidence — provider]** S3 Versioning retains multiple versions and can recover objects after an overwrite or delete. S3 also documents checksum validation during upload/download and checksum metadata for stored objects. [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) and [checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html)

### Storage semantics interpretation

- **[Inference — G-03]** GCS’s “some” S3 interoperability wording is not evidence of complete S3 API equivalence. The application should use an explicit storage port with contract tests rather than exposing provider-specific XML/HMAC, generation, or version-ID behavior to product code.
- **[Inference — G-03]** The minimum common contract should cover private object creation/read/delete, a content checksum, conditional create-only publishing for idempotent retries, short-lived scoped retrieval, and a clear version/recovery policy. GCS generation preconditions and S3 version IDs are implementation details that the adapter can normalize.
- **[Inference — G-03]** Soft delete, versioning, retention, and provider durability are not by themselves the product’s immutable report-revision or tenant-export contract. They should be treated as infrastructure recovery controls alongside application-level association, auditability, and tenant isolation.

## 3. Managed backup, recovery, and export primitives

### Google Cloud SQL and Cloud Storage

**Checked:** 2026-08-24.

- **[Evidence — provider]** Cloud SQL documents standard and enhanced backups. Standard backups support configurable locations and retention; enhanced backups use Backup and DR with centralized backup projects/vaults, schedules, retention enforcement, PITR, and final backups. [Cloud SQL backup options](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options)
- **[Evidence — provider]** If no custom Cloud SQL backup location is supplied, Google documents the closest multi-region as the default. The PostgreSQL FAQ identifies `asia` as the closest multi-region for `australia-southeast1`. [Cloud SQL backup options](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options) and [Cloud SQL PostgreSQL FAQ](https://docs.cloud.google.com/sql/docs/postgres/faq)
- **[Inference — G-03]** A Sydney Cloud SQL instance does not, by that fact alone, prove that every backup copy remains in Australia. If Australian-only storage is a requirement, the backup location must be explicitly configured, recorded, and verified; the chosen backup product and any copy/vault policy also need review.
- **[Evidence — provider]** Cloud SQL PITR uses transaction logs in addition to backups. The documented transaction-log retention is 1–7 days for Enterprise and 1–35 days for Enterprise Plus. [Configure point-in-time recovery](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr)
- **[Evidence — provider]** Cloud SQL SQL export writes a `pg_dump`-based export to Cloud Storage and requires the relevant Cloud Storage permissions. CSV export can target a database, table, or query and also writes to Cloud Storage. Google notes that exports can consume instance resources. [SQL import/export](https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-sql), [CSV import/export](https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-csv), and [Cloud SQL best practices](https://docs.cloud.google.com/sql/docs/postgres/best-practices)
- **[Evidence — provider]** Google’s PostgreSQL best-practices documentation distinguishes backups/PITR from exports: exports can survive instance deletion and can select a database/table, while backups do not provide the same selective export behavior. [Cloud SQL best practices](https://docs.cloud.google.com/sql/docs/postgres/best-practices)

### Amazon RDS, S3, and AWS Backup

**Checked:** 2026-08-24.

- **[Evidence — provider]** RDS automated backups and manual snapshots are maintained as separate mechanisms; AWS documents backup storage per AWS Region and says automated backups are stored in S3. [Working with automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)
- **[Evidence — provider]** Native RDS automated-backup retention is 0–35 days, with `0` disabling automated backups; manual snapshots are not governed by that same retention setting. [Backup retention period](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- **[Evidence — provider]** RDS PITR uploads transaction logs to S3 approximately every five minutes and restores to a new DB instance at a selected time within the retention window. [Restoring a DB instance to a specified time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)
- **[Evidence — provider]** RDS snapshot export runs in the background and writes selected database/schema/table data to S3 as compressed Apache Parquet. AWS states that exported snapshot data cannot be restored from S3 into RDS. The S3 destination must be in the same AWS Region as the snapshot. [Exporting a DB snapshot to Amazon S3](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html)
- **[Evidence — provider]** AWS’s current supported-region table lists Asia Pacific (Sydney) for RDS PostgreSQL snapshot export to S3. [RDS snapshot export supported Regions and DB engines](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.ExportSnapshotToS3.html)
- **[Evidence — provider]** AWS Backup documents continuous backup/PITR for supported S3 and RDS resources. For S3, the documented recovery point can be up to the most recent 15 minutes; cross-Region or cross-account copies become snapshots and do not retain PITR. The feature-availability table lists both S3 and RDS in Asia Pacific (Sydney). [AWS Backup point-in-time recovery](https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html) and [AWS Backup feature availability](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html)

### Backup/export interpretation

- **[Inference — G-03]** Cloud SQL and RDS both provide managed infrastructure recovery primitives, but their export formats and restore behavior differ materially. Cloud SQL’s SQL/CSV exports and RDS’s Parquet snapshot export are not a common tenant handover format.
- **[Inference — G-03]** The product should define an application-owned export package independently of either provider’s backup format. It should be able to include tenant-scoped relational records, associated photographs/object references, draft report revisions, audit events, jurisdiction (`NSW` or `Queensland`), a manifest, and checksums. The package should describe recorded outcomes and further assessment where applicable; it must not imply certification or automatic compliance.
- **[Inference — G-03]** G-03 evidence should separately demonstrate: backup scheduling and retention; a restore/recovery exercise; location/copy inventory; and a repeatable tenant export/import or handover exercise. A successful provider snapshot alone does not demonstrate the product export requirement.

## 4. Already-approved Cloud Run Sydney renderer boundary

### Repository boundary

- **[Evidence — repository]** D-024 and the current roadmap record an authorised, exercised, destroyed, and owner-approved Cloud Run Sydney candidate as the first managed renderer candidate. The same records keep authentication and the broader provider decision open, and the spike JSON still records `managedProviderApproved: false`. See [STAGE_2D_04_PROVIDER_COMPARISON.md](STAGE_2D_04_PROVIDER_COMPARISON.md), [STAGE_2D_04_PROVIDER_AUTH_PROOF.md](STAGE_2D_04_PROVIDER_AUTH_PROOF.md), and [CURRENT_STATUS.md](CURRENT_STATUS.md).
- **[Evidence — repository]** The bounded renderer proof uses the separate asynchronous renderer direction, private object storage, Cloud Tasks, and an initial 2 vCPU / 2 GiB / concurrency-1 shape. This is a renderer candidate boundary, not approval of Cloud SQL, Cloud Storage, or a production hosting provider.

### Official capability check

- **[Evidence — provider]** Cloud Run lists `australia-southeast1` (Sydney) as a supported region and states that each Cloud Run resource resides in its selected region. [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)
- **[Evidence — provider]** Cloud Tasks lists `australia-southeast1` (Sydney) as a queue location. [Cloud Tasks locations](https://docs.cloud.google.com/tasks/docs/locations)
- **[Evidence — provider]** Cloud Run documents configurable CPU, memory, and request concurrency. A 2-vCPU service and 2-GiB memory limit are within the documented ranges, and concurrency can be set to `1`; Google notes that lower concurrency can trade throughput for isolation/resource headroom. [Cloud Run CPU](https://docs.cloud.google.com/run/docs/configuring/services/cpu), [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits), and [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
- **[Evidence — provider]** Cloud Run supports requiring authentication, and Cloud Tasks can invoke a private Cloud Run handler using an OIDC/ID token with the Cloud Run Invoker permission. [Deploying services](https://docs.cloud.google.com/run/docs/deploying), [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service), and [authenticated HTTP targets for Cloud Tasks](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks)

### Boundary interpretation

- **[Inference — G-03]** The official documentation supports the already-proven Sydney renderer shape, but it does not expand D-024 into a database or object-storage decision. G-03 should preserve the renderer as a separately addressed, private, asynchronous component and avoid coupling provider-specific storage semantics into renderer/product code.
- **[Inference — G-03]** A production approval would still require the repository’s existing evidence obligations around authentication, tenant isolation, durable object association, retries/idempotency, auditability, report revisions, and operational ownership. This research does not claim those obligations are satisfied by the service documentation alone.

## Implications for G-03

1. **Keep provider choice open.** Cloud SQL/Sydney versus RDS/Sydney and GCS versus S3 are both documented capability candidates. This file supplies comparison evidence; it does not select one.
2. **Make location an explicit configuration and evidence item.** Record database region, object-bucket region, backup location/vault, and any cross-region/account copy. Do not infer Australian-only backup storage from an Australian database or renderer region.
3. **Retain two adapters.** Keep a PostgreSQL-compatible database boundary and an application-owned object-storage port. Add candidate-specific contract tests for private access, checksums, conditional create-only writes, short-lived access, object association, and recovery behavior.
4. **Separate recovery from export.** Provider backups/PITR are for restoring infrastructure. The product still needs a tenant-scoped, provider-independent export/handover package and a tested path to generate and verify it.
5. **Preserve the renderer decision boundary.** D-024’s Cloud Run Sydney candidate can remain the renderer reference while G-03 resolves database/storage/backup/export portability. No new cloud mutation or provider approval is implied.
6. **Do not close the gate on documentation alone.** The owner decision should be backed by the repository’s required portability, isolation, backup/restore, export, and audit evidence, with assumptions and open retention/deletion periods recorded separately from validated facts.

## Primary-source register

All provider links used in this document are first-party documentation current or available on the research date.

### Google Cloud

- [Cloud SQL PostgreSQL instance locations](https://docs.cloud.google.com/sql/docs/postgres/locations)
- [Cloud SQL PostgreSQL region availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview)
- [Cloud SQL high availability](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [Cloud SQL disaster recovery](https://docs.cloud.google.com/sql/docs/postgres/intro-to-cloud-sql-disaster-recovery)
- [Cloud SQL backup options](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options)
- [Cloud SQL PostgreSQL FAQ](https://docs.cloud.google.com/sql/docs/postgres/faq)
- [Cloud SQL point-in-time recovery](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr)
- [Cloud SQL SQL import/export](https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-sql)
- [Cloud SQL CSV import/export](https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-csv)
- [Cloud SQL best practices](https://docs.cloud.google.com/sql/docs/postgres/best-practices)
- [Cloud Storage bucket locations](https://docs.cloud.google.com/storage/docs/locations)
- [Cloud Storage public access prevention](https://docs.cloud.google.com/storage/docs/public-access-prevention)
- [Uniform bucket-level access](https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access)
- [Cloud Storage interoperability](https://docs.cloud.google.com/storage/docs/interoperability)
- [Cloud Storage signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls)
- [Cloud Storage data validation](https://docs.cloud.google.com/storage/docs/data-validation)
- [Cloud Storage request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions)
- [Cloud Storage consistency](https://docs.cloud.google.com/storage/docs/consistency)
- [Cloud Storage soft delete](https://docs.cloud.google.com/storage/docs/soft-delete)
- [Cloud Storage Object Versioning](https://docs.cloud.google.com/storage/docs/object-versioning)
- [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)
- [Cloud Run CPU configuration](https://docs.cloud.google.com/run/docs/configuring/services/cpu)
- [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits)
- [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
- [Cloud Run deployment and authentication](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Cloud Tasks locations](https://docs.cloud.google.com/tasks/docs/locations)
- [Authenticated HTTP targets for Cloud Tasks](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks)

### AWS

- [Amazon RDS Regions and Availability Zones](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html)
- [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Amazon RDS Multi-AZ deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html)
- [RDS automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)
- [RDS backup retention](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- [RDS point-in-time restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)
- [RDS snapshot export to S3](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html)
- [RDS snapshot export supported Regions and engines](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.ExportSnapshotToS3.html)
- [Amazon S3 overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [S3 object integrity checks](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html)
- [AWS Backup point-in-time recovery](https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html)
- [AWS Backup feature availability by Region](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html)
