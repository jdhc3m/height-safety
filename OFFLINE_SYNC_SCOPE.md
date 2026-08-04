# Compatibility copy — canonical: [docs/architecture/OFFLINE_SYNC_SCOPE.md](docs/architecture/OFFLINE_SYNC_SCOPE.md)

# Limited Offline Sync Scope

Only assigned jobs are downloadable. The mobile app stores a bounded job pack
in an encrypted local database and secure platform storage. Local notes,
outcomes, defects, recommendations and photograph references must be durable
without connectivity.

Each mutation has a stable client-generated ID, operation type, entity version
and creation time. The server processes retries idempotently. The UI exposes
pending, synchronising, failed and synchronised states for mutations and local,
pending-upload, uploaded and failed states for photographs.

Important conflicts are surfaced for review; last-write-wins is not used to
silently resolve evidence or outcomes. The MVP assumes one primary inspector
edits an assigned job. It does not provide unrestricted offline collaboration.

Office review cannot treat a job as complete while required changes or photos
are unsynchronised. Final report approval initially requires internet access.
Expiry, logout, device loss, local-data deletion, retry limits and the minimum
offline duration remain design-partner validation items.
