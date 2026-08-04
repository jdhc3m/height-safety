# Security Minimums

- Enforce authorised `company_id` server-side on every tenant query/mutation.
- Test cross-tenant API, media, export and report access.
- Download only assigned jobs; encrypt local storage and use platform secure
  storage for credentials/keys.
- Keep photographs and reports private; use least-privilege, short-lived access.
- Keep secrets out of repository and logs; do not log sensitive inspection data.
- Record important actions in append-only audit events.
- Separate development, test and production configuration.
- Review retention, deletion, export, residency, subprocessors and incident
  response before partner data.

These are pilot minimums, not complete security or privacy compliance.
