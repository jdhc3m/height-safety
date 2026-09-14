# Local Auth0 and Android verification

Verification date: **2026-09-14** (Australia/Brisbane)

This is a local development record for the owner-configured Auth0 tenant. It
does not demonstrate production readiness, tenant deployment, certification,
compliance or a completed field workflow.

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

## Known remaining failure

After authentication, the app displayed:

> Unable to sync jobs. Check connection and try again.

The phone could still reach the API health endpoint. The failure was caused by
the API's job workflow module still binding
`UnconfiguredJobWorkflowStore`, which returns persistence-unavailable for the
authorised-job list. PostgreSQL job workflow persistence and a seeded released
or assigned job are the next implementation boundary.

## Not tested yet

- A successful authorised-job list from PostgreSQL
- Downloading a durable release-time job-pack snapshot
- Offline capture, mutation acknowledgement, photo upload or conflict
  handling against the running API
- Production Auth0, database, cloud deployment, invitation delivery or
  operational controls
