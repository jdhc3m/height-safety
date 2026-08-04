# Security Minimums

- Scope every server query and mutation to the authorised company; never trust
  a client-supplied tenant identifier.
- Keep photographs and reports private by default with least-privilege access.
- Record important actions in append-only audit events.
- Protect mobile data using platform secure storage and download only assigned jobs.
- Do not log sensitive inspection data or secrets; separate development, test
  and production configuration and keep secrets out of the repository.
- Add automated cross-tenant access tests for API, media, exports and reports
  when implementation exists.

These are pilot minimums, not an enterprise security programme. Retention,
residency, incident response and contractual privacy obligations require review
before partner data is used.
