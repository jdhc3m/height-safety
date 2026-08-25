# G-03 Provider Portability

Status: **Done — owner approved as D-027**, 2026-08-24

## Gate boundary

G-03 is the provider-portability gate required before production
infrastructure and before `3A-02` proceeds. It does not select a production
cloud provider, authentication vendor or backup retention schedule.

The evidence uses only fictional NSW and Queensland fixture data. No cloud
resource was created or changed. D-024 remains the separate owner-approved
Cloud Run Sydney draft-renderer candidate; this gate does not extend that
approval to a database, object-storage provider or production deployment.

## Recorded decisions carried into the proof

- D-013: use a PostgreSQL-compatible relational database and private object
  storage while deferring provider selection.
- D-017: keep PostgreSQL portable and use S3-compatible object semantics or a
  tested provider adapter boundary.
- D-018: preserve server evidence during the prototype, make export available
  before authorised deletion, and leave real-data retention/backup expiry
  periods open pending pilot review.
- D-024: retain Cloud Run in `australia-southeast1` as the first managed
  renderer candidate at the already-approved bounded shape.

## Evidence completed

### Australian-region provider comparison

[G-03_PROVIDER_RESEARCH.md](G-03_PROVIDER_RESEARCH.md) records point-in-time
first-party evidence checked on 2026-08-24 for:

- Cloud SQL for PostgreSQL in Sydney (`australia-southeast1`) and Amazon RDS
  for PostgreSQL in Sydney (`ap-southeast-2`), including the distinction
  between zonal high availability and regional disaster recovery.
- Private Cloud Storage and Amazon S3 controls, including scoped access,
  checksums, conditional writes, version/recovery controls and the limits of
  GCS S3 interoperability.
- Cloud SQL and RDS managed backup, point-in-time recovery and export
  primitives, including the fact that provider export formats are not a
  common tenant handover format.
- The already-approved private Cloud Run/Cloud Tasks Sydney renderer
  boundary.

This is comparison evidence, not a provider selection. The research records
inferences separately from provider facts and does not claim Australian legal
residency, compliance or certification.

### Portable PostgreSQL contract

`infra/provider-portability/postgresql-schema.sql` is a bounded contract
schema, not the product migration set. It uses ordinary PostgreSQL types and
constraints without extensions, row-security policies, provider-specific
functions or generated columns. It demonstrates:

- tenant-owned composite keys;
- site/evidence foreign keys that include `company_id`;
- tenant-scoped object references; and
- a private-object key prefix constraint.

`tools/provider-portability/postgresql-check.sh` executed this schema against
a disposable PostgreSQL 17 container on 2026-08-24. The test inserted two
fictional companies and verified that an evidence write using one company’s
ID and another company’s site was rejected by the composite foreign key.

The check is repeatable with a disposable PostgreSQL URL:

```sh
HEIGHT_SAFETY_POSTGRES_URL='postgresql://...' \
  tools/provider-portability/postgresql-check.sh
```

The product migrations and complete tenant-isolation API tests remain the
scope of `3A-02`; this proof does not claim that ticket is implemented.

### Application-owned object-storage boundary

`tools/provider-portability/check.mjs` runs the same contract against a
memory adapter and a filesystem adapter. The contract covers:

- tenant-prefixed keys;
- private company-scoped reads;
- checksum verification;
- create-only retry of identical bytes;
- rejection of a different payload at an existing key;
- rejection of cross-tenant reads; and
- short-lived scoped-access shape without permanent public URLs.

The adapter contract is the portability boundary. A future Cloud Storage or
S3 implementation must pass this contract, with provider SDKs kept below the
application-owned port. No live provider adapter was exercised in this
evidence-only pass.

### Backup and export path

The same check creates and verifies a deterministic fictional backup containing
both tenant exports, writes a SHA-256 sidecar, restores the backup into a new
object-store adapter and verifies recovered object bytes. It also creates a
NSW-only tenant export and asserts that Queensland records and objects are not
included.

The export proof includes the shape required for a later product contract:
tenant-scoped records, associated private object keys and bytes, content types,
checksums, a version, a manifest and restore validation. It is an application
export/restore proof, not a claim that Cloud SQL, RDS, Cloud Storage or S3
native backup has been configured.

Run the deterministic local proof with:

```sh
pnpm run provider-portability:check
```

The checked-in machine-readable result is
[G-03_PROVIDER_PORTABILITY_EVIDENCE.json](G-03_PROVIDER_PORTABILITY_EVIDENCE.json).

## Limitations and open decisions

- No production database or object-storage provider is selected.
- No production cloud resource was deployed; cloud mutation remains an
  explicitly authorised action.
- Provider-native backup location, cross-region copy, backup expiry, recovery
  point objective and recovery time objective remain open.
- The strict residency requirement for backups, logs, support systems and
  subprocessors is not inferred from an Australian service region and needs
  explicit owner/legal/privacy review before real partner data.
- The exact production export archive format and operational schedule remain
  open, while the tenant-scoped content and checksum boundary is proven.
- Real-data retention and deletion remain behind G-06 and must not be
  invented for this prototype proof.

## Owner approval

The owner approved G-03 as a **provider-portability evidence gate** on
2026-08-24 (D-027). Production provider selection, native backup
configuration, concrete retention/RPO/RTO and strict backup/log/subprocessor
residency remain deferred. `3A-02` is unblocked and may use portable
PostgreSQL migrations and the tested application-owned storage/export
boundaries; it must add the complete product schema and cross-tenant API tests.
