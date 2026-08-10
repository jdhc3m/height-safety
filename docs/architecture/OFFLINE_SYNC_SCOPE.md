# Offline and Synchronisation Scope

Only claimed/assigned jobs download. An encrypted Room-based local job pack
stores notes, outcomes, defects, recommendations and durable photo references
through restart and temporary loss of connectivity. Database encryption key
material is protected through Android Keystore; the exact encryption library
remains a Stage 2C implementation choice.

Each mutation has client-generated stable ID, operation, entity/version,
created time, device/session and retry state. Server idempotency prevents
duplicates. Expected versions and semantic conflict handling prevent silent
last-write-wins for evidence, outcomes, identity or review actions.

The durable local outbox and its business mutation are written consistently.
Persistent Android background work drains the queue when connectivity returns;
retries reuse the same stable mutation identity.

Visible states: local, pending, synchronising, synchronised, failed and
conflict for mutations; pending-upload, uploaded and failed for photos. Office
review cannot mark complete while required uploads or changes remain unresolved.
Final review/report generation requires connectivity.

App lock, account logout and local-data cleanup are separate operations. Locking
the app preserves the encrypted job pack. Normal logout/cleanup is blocked while
the outbox contains unsynchronised mutations, photos are pending/failed,
conflicts remain or the server has not acknowledged the submitted evidence.
The MVP does not offer an offline destructive override. A later override would
require explicit confirmation, online authorisation and a server audit event.

Downloaded job access uses a bounded offline-authorisation lease. Central
revocation takes effect immediately for server requests but cannot contact an
offline device. When the lease expires, token refresh fails or revocation is
confirmed, the app locks and preserves queued evidence rather than wiping it.
Recovery or authorised upload of evidence held by a revoked account must be
designed before partner data; temporary account restoration is not assumed.

Validate with partner: offline duration/lease length, cache expiry/logout/device
loss, revoked-account evidence recovery, storage limits, photo volume, retry
policy and recovery after app termination.
