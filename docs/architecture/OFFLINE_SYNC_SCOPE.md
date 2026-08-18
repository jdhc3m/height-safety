# Offline and Synchronisation Scope

Only claimed/assigned jobs download. An encrypted Room-based local job pack
stores notes, outcomes, defects, recommendations and durable photo references
through restart and temporary loss of connectivity. Database encryption key
material is protected through Android Keystore. D-023 selects and proves
maintained SQLCipher Android as the bounded Room candidate; production adoption
remains conditional on its documented exit triggers.

Each mutation has client-generated stable ID, operation, entity/version,
created time, device/session and retry state. Server idempotency prevents
duplicates. Expected versions and semantic conflict handling prevent silent
last-write-wins for evidence, outcomes, identity or review actions. Those
identity and conflict rules belong in the product Kotlin/JVM field domain
(D-026); WorkManager only drains the adapter queue.

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
offline device. Lease expiry, confirmed revocation, clock rollback or Keystore
loss locks the app and preserves queued evidence. A failed network refresh does
not lock a still-valid lease. Pending outbox/media cannot be acknowledged while
the server account is revoked except during a live administrator recovery
window. Owner-approved D-025 uses a 24-hour capture lease, elapsed runtime as
a second expiry clock, and a same-company administrator one-hour upload-only
recovery window that does not restore the revoked account. Permanent Keystore
loss stays fail closed and undecryptable. Temporary account restoration is not
assumed. G-05 remains open for design-partner review before a controlled pilot.

Validate with partner: offline duration/lease length, cache expiry/logout/device
loss, revoked-account evidence recovery, storage limits, photo volume, retry
policy and recovery after app termination.
