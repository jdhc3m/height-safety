# Auth0 AU bounded setup

Status: implementation guide for D-042; no Auth0 tenant was created or
mutated by the agent.

This guide configures the provider boundary only. The application still owns
company membership, product roles, opaque application sessions, offline
authorisation leases, evidence recovery and audit records. Auth0 login does
not by itself grant access to a company.

## Create the tenant and applications

An owner must create an Auth0 tenant with the Australian (`AU`) locality and
confirm the applicable plan, contract, subprocessors, export and recovery
terms before a controlled pilot.

Create these applications and one API:

1. An Auth0 **API** with a stable identifier used as `AUTH0_API_AUDIENCE`.
2. A **Regular Web Application** for the Next.js office app.
3. A **Native Application** for the Android field app.

Enable verified email in the tenant's account workflow. Administrators must
use MFA. Inspector and Office reviewer MFA can remain optional during the
prototype, consistent with D-014; the API still enforces MFA for an
Administrator membership.

Auth0's [Next.js quickstart](https://auth0.com/docs/quickstart/webapp/nextjs)
and [Android quickstart](https://auth0.com/docs/quickstart/native/android)
describe the application types and callback setup.

## Web configuration

Set these values in the office web runtime secret/configuration store. Do not
commit `.env.local` or a client secret.

| Variable | Value |
| --- | --- |
| `AUTH0_DOMAIN` | Auth0 tenant hostname, for example `tenant.au.auth0.com` |
| `AUTH0_CLIENT_ID` | Regular Web Application client ID |
| `AUTH0_CLIENT_SECRET` | Regular Web Application client secret |
| `AUTH0_SECRET` | 32-byte hex secret used for encrypted session/transaction cookies |
| `APP_BASE_URL` | Office URL, for example `http://localhost:3000` during local work |
| `AUTH0_API_AUDIENCE` | The API identifier, if the office session will request an API token |

Register the following URLs in the Regular Web Application, replacing the
host with the deployed office URL:

- Allowed Callback URL: `http://localhost:3000/auth/callback`
- Allowed Logout URL: `http://localhost:3000`

The implementation mounts Auth0's `/auth/login`, `/auth/logout` and callback
boundary through `apps/web/src/middleware.ts`. `/office` checks the Auth0
browser session before rendering the office boundary. It does not yet fetch
jobs; that remains the review-workspace implementation.

Generate `AUTH0_SECRET` with a local secret manager or an equivalent command,
for example `openssl rand -hex 32`. Keep it out of source control and chat.

## Android configuration

The Android build uses only public native-app configuration. The Android APK
must never receive `AUTH0_CLIENT_SECRET`.

Register this App Link callback for the Native Application, replacing the
tenant hostname:

```text
https://tenant.au.auth0.com/android/au.com.heightsafety.app/callback
```

Build with the public values supplied through the local/deployment build
environment:

```text
bash apps/android/gradlew -p apps/android assembleDebug \
  -Pauth0Domain=tenant.au.auth0.com \
  -Pauth0ClientId=ANDROID_NATIVE_CLIENT_ID \
  -Pauth0ApiAudience=https://api.example.test
```

The app uses Auth0 Universal Login with the `https` App Link scheme and stores
provider credentials through Auth0's `SecureCredentialsManager`. The existing
encrypted application session store remains the credential used by the field
domain after the API exchange. Auth0 recommends App Links over custom URL
schemes for stronger callback protection; see the [Android callback
guidance](https://auth0.com/docs/quickstart/native/android).

## API configuration

Set these values in the NestJS API runtime configuration. Only the public
domain and API audience are needed for JWT verification; no Auth0 client
secret belongs in the API verifier.

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTH0_DOMAIN` | none | Auth0 tenant hostname |
| `AUTH0_API_AUDIENCE` | none | Required access-token audience |
| `AUTH0_EMAIL_CLAIM` | `email` | Access-token/user-info email claim name |
| `AUTH0_EMAIL_VERIFIED_CLAIM` | `email_verified` | Boolean verified-email claim |
| `AUTH0_MFA_CLAIM` | `https://height-safety.example/claims/mfa_satisfied` | Boolean custom access-token claim, or an array containing `mfa` |
| `AUTH0_USE_USERINFO` | `true` | Retrieve the profile from Auth0 `/userinfo` using the validated access token |

The adapter validates the JWT signature against the tenant JWKS, issuer,
audience, expiration and `RS256` algorithm before reading identity claims. It
does not accept an ID token as an API access token. It then requires a verified
email and maps MFA evidence from the configured claim or `amr` where present.
The API's existing company-scoped membership check and Administrator MFA rule
remain in force.

Auth0's [JWT claims guidance](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims),
[user-info endpoint](https://auth0.com/docs/api/authentication/user-profile/get-user-info)
and [step-up MFA guidance](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication/configure-step-up-authentication-for-web-apps)
describe these token/profile boundaries. Configure any custom MFA claim in an
Auth0 Post-Login Action and keep its namespace stable with the
`AUTH0_MFA_CLAIM` value.

## Invitation status

The provider adapter currently verifies Auth0 identities but deliberately does
not send invitations. The application invitation is a one-time digest-bound
token carrying the company and product role; an Auth0 Organization invitation
alone cannot replace that application control. The next invitation transport
must deliver the application token without putting it in logs or an
unvalidated provider claim, then retain the existing email-match, expiry,
one-time-use and tenant checks.

See Auth0's [organization invitation API](https://auth0.com/docs/api/management/v2/organizations/post-invitations)
when designing that separate adapter. It requires a protected Management API
client/token and must not be exercised from the browser or Android app.

## Values that remain open

- Auth0 tenant/application creation and secret storage are manual owner steps.
- Durable API `AuthStore` and append-only audit adapters are not yet wired to
  Cloud SQL.
- Web/Android Auth0 login is not a substitute for the API opaque application
  session exchange.
- Invitation-token delivery, session renewal/revalidation policy and
  authenticated recovery/upload transport remain later 3C/3D integration.
- No real customer data should be used until G-05 and the retention/recovery
  gates are closed.
