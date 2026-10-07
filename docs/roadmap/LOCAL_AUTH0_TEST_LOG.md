# Local Auth0 and Android verification

Verification date: **2026-09-14** (Australia/Brisbane)

This is a local development record for the owner-configured Auth0 tenant. It
does not demonstrate production readiness, tenant deployment, certification,
compliance or a completed field workflow.

## Decision boundary (D-046)

The owner accepts this US-5 tenant for synthetic/local development and
physical verification only. It must not receive real client data or be treated
as a production pilot. When a real client or controlled pilot is proposed,
review the Auth0 plan, contract, subprocessors, export/recovery and locality
terms. If AU locality remains required, consider the needed plan
upgrade/capacity, create/configure an AU tenant and complete an owner-approved
migration or reconfiguration before the pilot. This record does not close the
AU production-locality decision.

## Configuration exercised

- Auth0 domain: `dev-0s1f38muajhhcoiq.us.auth0.com`
- Custom API audience: `https://height-safety-api.local`
- Android package: `au.com.heightsafety.app`
- Android callback:
  `https://dev-0s1f38muajhhcoiq.us.auth0.com/android/au.com.heightsafety.app/callback`
- Local API base URL: `http://<computer-lan-ip>:3000/api/v1/`
- The Auth0 native application was granted access to the custom API. The
  Auth0 Management API was not used as the application audience.
- The API was run with Auth0 domain and audience settings, PostgreSQL enabled,
  and `HOST=0.0.0.0` so the phone could reach the computer over Wi-Fi.

Secrets, client secrets, passwords, provider tokens, and the user's exact
identity subject are intentionally not recorded here.

## Checks completed

1. PostgreSQL migrations `000`, `001` and `002` were applied locally.
2. Company `aaa` and an Inspector membership for the owner-configured Auth0
   identity were seeded in the local database.
3. The Android debug build was rebuilt with the computer's LAN address and the
   working Auth0 audience; it was installed on a physical Pixel device.
4. The phone reached `GET /api/v1/health` and received HTTP `200`.
5. Auth0 Universal Login opened on the phone with the configured native
   application and custom API audience.
6. The owner completed the Auth0 database login/password-reset flow.
7. The app returned from Auth0 and displayed the authenticated email and
   `Company: aaa` on the Inspector jobs screen.

These results establish that the Auth0 callback, provider login, API audience,
phone-to-computer network path, provider-token exchange and PostgreSQL
membership lookup reached the application session boundary.

## Known failure at the time of the first run

After authentication, the app displayed:

> Unable to sync jobs. Check connection and try again.

The phone could still reach the API health endpoint. The failure was caused by
the API's job workflow module still binding
`UnconfiguredJobWorkflowStore`, which returned persistence-unavailable for the
authorised-job list. This was the remaining failure in that 2026-09-14 run;
the local PostgreSQL job workflow adapter and seed fixture were wired in the
follow-up below.

## Not tested yet

- Fresh provider login after the follow-up rebuild (the native client ID is
  intentionally redacted from this workspace)
- Production Auth0 AU, database, cloud deployment, invitation provider or
  operational controls

## Follow-up local runtime verification

Verification date: **2026-09-15** (Australia/Brisbane)

The local API was rebuilt with PostgreSQL and the existing owner-configured
development Auth0 domain/audience. Using a short-lived local application
session for the seeded Inspector membership, the following checks passed:

- `/auth/me` revalidation and application-session renewal;
- authorised job listing and a durable versioned QLD job-pack read;
- one tenant-bound inspection mutation with evidence and photo metadata;
- identical mutation replay returning the original acknowledgement; and
- resumable photo upload, with `uploaded` database state and matching private
  object SHA-256.

The rebuilt debug APK installed and launched on the physical Pixel 10 Pro, and
the Inspector sign-in screen rendered. This follow-up does not claim a
production tenant, production storage, Administrator recovery upload or
provider invitation endpoint.

## Owner wizard configuration and office runtime verification

Verification date: **2026-10-07** (Australia/Brisbane)

The Auth0 owner wizard stages were completed for the existing US-5 dev tenant
(D-046) with browser-driven owner configuration. Non-secret configuration
facts:

- Tenant domain: the recorded US development tenant; custom API audience
  `https://height-safety-api.local`; web and Android callback/logout URLs set
  as the wizard specifies.
- A Post-Login Action (`Height Safety Post Login Claims`) is deployed and
  attached to the signup-and-login trigger. It writes the `mfa_satisfied`
  claim only when a real MFA method ran, and writes the D-049 office company
  claim for the mapped owner identity. No MFA factor can be enabled on the
  free plan, so the MFA claim is false in this tenant by design (D-050);
  administrator authentication is therefore not verifiable locally.
- Invitation delivery remains unconfigured and fail-closed (owner decision).
- Local secrets live in the ignored `.env.auth0.local`; API on port 3001,
  office web on port 3000, local PostgreSQL container for persistence.

Checks completed in the office web and on the physical device with the
tenant's verified Google social identity, holding an `inspector` membership
of the seeded test company (the tenant's database-connection identity from
September is stale; all working logins resolve to the Google identity):

- Auth0 Universal Login, consent and callback completed in the office web.
- The office web exchanged the provider token plus the configured company
  claim for an application-owned opaque session.
- The authorised job queue rendered the three seeded QLD jobs with their
  recorded workflow states and job-pack versions.

Physical Pixel verification (same date, USB install, device on the same
Wi-Fi): the inspector signed in on the device, the app displayed the seeded
company and job list, the job pack downloaded with a 24-hour offline lease,
and the pack view was gated by device authentication (D-025). Offline
restart after a device reboot was also verified: the restore preserved local
evidence and surfaced the cached pack's job with an honest sync-failure
marker, and a later online refresh cleared the device-lock state.

Two Android fixes were required and are covered by new domain and
view-model tests:

1. The offline-lease state machine threw `IllegalArgumentException` when a
   restore followed a device reboot plus wall-clock advance (the elapsed
   delta was negative and the rollback branch violated the monotonic-clock
   invariant instead of raising its lock). The rollback lock still raises
   and persists; the branch now also advances the wall-clock high-water
   mark and re-bases the elapsed accumulator to the current boot so the
   lock does not re-raise on every later tick. One online refresh clears
   it, as the specification requires.
2. The session-restore path required online revalidation unconditionally
   and showed an error offline, ignoring the valid offline lease. With the
   lease valid and a downloaded pack present, restore now serves the cached
   pack's job list offline (assignment details marked as not recorded until
   the next online refresh); the job-pack store gained a per-company
   listing used for this fallback.

One code fix was required: the office web called `POST /api/v1/sessions`
(the wording in D-049) while the implemented API contract is
`POST /api/v1/auth/sessions`; the web now calls the implemented path. The
API remains the authority for token verification and company membership.

Not covered here: the physical Pixel field test, report generation (the
office slice is read-only and does not wire report generation), administrator
flows (blocked by the free-plan MFA boundary, D-050), and any production
tenant or deployment.
