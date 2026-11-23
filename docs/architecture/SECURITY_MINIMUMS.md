# Security Minimums

- Enforce authorised `company_id` server-side on every tenant query/mutation.
- Test cross-tenant API, media, export and report access.
- Use a managed authentication provider, invitation-only accounts and verified
  email. Enforce company membership and product roles in the backend.
- Require MFA for Administrator accounts. MFA remains optional for Inspector
  and Office reviewer accounts during the prototype and must be reassessed with
  the design partner before live deployment.
- Download only claimed/assigned jobs; encrypt local storage and use platform secure
  storage for credentials and Keystore-protected database key material.
- Use device PIN/biometric authentication to reopen downloaded job data where
  supported. App locking does not delete local evidence.
- Do not rely on long-lived token claims alone: use short-lived access tokens
  and check current session, company and role state on every online request.
- A bounded offline-authorisation lease permits access to a downloaded job pack
  while disconnected. Central revocation cannot reach an offline device. Lease
  expiry, confirmed revocation, clock rollback or Keystore loss locks the app
  without deleting local evidence. A failed network refresh does not lock a
  still-valid lease. D-025 uses a 24-hour capture lease and a one-hour
  administrator upload-only recovery window; G-05 remains open for
  design-partner review.
- Normal logout/local-data cleanup is allowed only after the outbox is empty,
  required photos are uploaded, conflicts are resolved and the server has
  acknowledged the evidence. Otherwise block cleanup; any future destructive
  override must be explicit, connected, authorised and audited.
- Keep photographs and reports in private object storage with non-guessable
  unique keys and checksums; use least-privilege, short-lived access and no
  permanent public links.
- Keep secrets out of repository and logs; do not log sensitive inspection data.
- Record important actions in append-only audit events.
- Separate development, test and production configuration.
- Review retention, deletion, export, residency, subprocessors and incident
  response before partner data.

Prototype retention posture: do not automatically delete server inspection
evidence, reports or audit history. Permit administrator reset of fictional
demo data. For real partner data, agree retention/export/deletion terms before
ingestion. Material deletion is explicit, authorised and audited, with export
available first. Backup expiry and permanent-deletion periods remain open.

These are pilot minimums, not complete security or privacy compliance.
