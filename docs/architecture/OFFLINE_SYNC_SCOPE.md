# Offline and Synchronisation Scope

Only assigned jobs download. Encrypted local job pack stores notes, outcomes,
defects, recommendations and durable photo references through restart and
temporary loss of connectivity.

Each mutation has client-generated stable ID, operation, entity/version,
created time, device/session and retry state. Server idempotency prevents
duplicates. Expected versions and semantic conflict handling prevent silent
last-write-wins for evidence, outcomes, identity or review actions.

Visible states: local, pending, synchronising, synchronised, failed and
conflict for mutations; pending-upload, uploaded and failed for photos. Office
review cannot mark complete while required uploads or changes remain unresolved.
Final review/report generation requires connectivity.

Validate with partner: offline duration, cache expiry/logout/device loss,
storage limits, photo volume, retry policy and recovery after app termination.
