# Authentication Provider Comparison

Status: **Auth0 selected; US-5 development tenant active; AU production locality deferred**
Checked: 2026-09-15

## Question

Which managed identity provider should supply login, invitations and MFA for
the bounded Android field app, office web app and NestJS API?

This provider would authenticate people. The application would still own
company membership, roles, session checks, offline leases, evidence recovery
and audit records. A provider cannot enforce the offline lease while a device
is disconnected.

## Recommendation

Use **Auth0** for the bounded authentication slice. The existing owner-
configured US-5 tenant is accepted for synthetic/local development and
physical verification only. Before a real client or controlled pilot, review
plan limits, recurring cost, contract, subprocessors, export/recovery and
locality terms. If AU locality remains required, consider the needed plan
upgrade/capacity and create/configure an AU tenant, then perform an
owner-approved migration or reconfiguration before real client data is used.
The original AU selection remains the production-locality option recorded in
D-042; D-046 documents the current development exception. This is a project
decision, not a legal conclusion.

Auth0 is the shortest path for this product because its Organizations feature
supports email invitations into a company with predefined organization roles,
its MFA Actions can apply different rules using organization or user context,
and its tenant setup supports an Australia locality. The existing API and
Android seams are already provider-neutral, so choosing Auth0 does not require
changing the product domain model.

## Shortlist

| Criterion | Auth0 AU | Amazon Cognito Sydney |
| --- | --- | --- |
| Invitation-only onboarding | Organization invitations can create or join a user and assign organization roles | Administrator-created users receive an invitation; self-registration can be disabled |
| Company membership | Organizations are a native concept | Company membership and most organization workflow stay application-owned |
| MFA | MFA can be required conditionally with Actions, including organization/user context | User-pool MFA supports required, optional and per-user configuration |
| Australian location | AU locality is available for public-cloud tenants | Sydney is `ap-southeast-2` |
| Session control | Refresh-token rotation is supported; application still owns its opaque session | Token revocation and global sign-out are supported; locally verified JWTs need application-side revocation handling |
| Prototype effort | Lower: invitation and organization concepts match the product directly | Higher: AWS configuration plus more application-owned invitation/membership logic |
| Main trade-off | Vendor plan/feature limits and recurring cost | More AWS-specific setup and implementation responsibility |

## Why not decide on cost alone

Both products have usage- and plan-dependent pricing, and email/SMS delivery
can be separate from identity pricing. The owner should confirm the actual
plan and written data-processing terms before a pilot. The prototype should
not treat a free tier or a displayed list price as a production cost estimate.

## Rejected for this step

Google Identity Platform/Firebase remains out of the shortlist until its
Australian data-processing position is clarified for the intended deployment.
The existing roadmap comparison records that unresolved residency question.

## Owner decision

The owner selected:

1. **Auth0 AU** — proceed with the bounded provider adapter and manual tenant
   setup.

For the current bounded prototype, the owner directs development and physical
verification to the existing US-5 tenant. This does not replace the AU
production-locality option; it defers the plan and AU-tenant review until a
real client or controlled pilot is proposed. Treat any AU move as a new-tenant
migration/reconfiguration rather than assuming an existing tenant can be
region-transferred.

Cognito Sydney remains the portability fallback if the owner later rejects
Auth0's plan, contract or data-processing terms. The repository does not
create or mutate the Auth0 tenant.

Do not send provider secrets through chat. The owner only needs to create the
selected tenant/application and provide non-secret configuration values through
the deployment secret path; never commit or send secrets through chat.

## First-party sources

- [Auth0 organization invitations](https://auth0.com/docs/manage-users/organizations/configure-organizations/invite-members)
- [Auth0 tenant regions and Australia locality](https://auth0.com/docs/get-started/auth0-overview/create-tenants)
- [Auth0 MFA policies and Actions](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa)
- [Auth0 refresh-token rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Auth0 pricing](https://auth0.com/pricing)
- [Amazon Cognito administrator-created users](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html)
- [Amazon Cognito MFA](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html)
- [Amazon Cognito regions](https://docs.aws.amazon.com/general/latest/gr/cognito.html)
- [Amazon Cognito token revocation](https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html)
- [Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/)
- [Firebase data-processing locations](https://firebase.google.com/support/privacy/)
