import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import {
  AuthFailure,
  type IdentityProvider,
  type InvitationDelivery,
  type VerifiedIdentity,
  normalizeEmail,
  normalizeIdentitySubject,
} from './auth.types';
import {
  type InvitationDeliveryTransport,
  UnconfiguredInvitationDelivery,
} from './invitation-delivery';

const DEFAULT_EMAIL_CLAIM = 'email';
const DEFAULT_EMAIL_VERIFIED_CLAIM = 'email_verified';
const DEFAULT_MFA_CLAIM = 'https://height-safety.example/claims/mfa_satisfied';

export interface Auth0IdentityProviderConfig {
  readonly domain: string;
  readonly audience: string;
  readonly issuer?: string;
  readonly jwksUri?: string;
  readonly userInfoUri?: string;
  readonly emailClaim?: string;
  readonly emailVerifiedClaim?: string;
  readonly mfaClaim?: string;
  readonly useUserInfo?: boolean;
}

export interface Auth0HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type Auth0Fetcher = (
  input: string,
  init: { readonly headers: Readonly<Record<string, string>> },
) => Promise<Auth0HttpResponse>;

type Auth0Claims = JWTPayload & Readonly<Record<string, unknown>>;

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeDomain(domain: string): string {
  const normalized = domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  if (!normalized || normalized.includes('/')) {
    throw new Error('AUTH0_DOMAIN must be a hostname without a path');
  }
  return normalized;
}

function normalizeIssuer(issuer: string): string {
  const url = new URL(issuer);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Auth0 issuer must use HTTP(S)');
  }
  return url.toString().replace(/\/$/, '') + '/';
}

function booleanClaim(value: unknown): boolean {
  return value === true;
}

function mfaClaimSatisfied(value: unknown): boolean {
  if (booleanClaim(value)) {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string') &&
    value.includes('mfa')
  );
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJwksAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return new Set([
    'JWKSTimeout',
    'JWKSInvalid',
    'JWKSMultipleMatchingKeys',
  ]).has(error.name);
}

function providerUnavailable(message: string): AuthFailure {
  return new AuthFailure('IDENTITY_PROVIDER_UNAVAILABLE', message);
}

export function auth0IdentityProviderConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): Auth0IdentityProviderConfig | undefined {
  const domain = configuredValue(environment.AUTH0_DOMAIN);
  const audience = configuredValue(environment.AUTH0_API_AUDIENCE);

  if (!domain && !audience) {
    return undefined;
  }
  if (!domain || !audience) {
    throw new Error(
      'AUTH0_DOMAIN and AUTH0_API_AUDIENCE must be configured together',
    );
  }

  return {
    domain: normalizeDomain(domain),
    audience,
    emailClaim:
      configuredValue(environment.AUTH0_EMAIL_CLAIM) ?? DEFAULT_EMAIL_CLAIM,
    emailVerifiedClaim:
      configuredValue(environment.AUTH0_EMAIL_VERIFIED_CLAIM) ??
      DEFAULT_EMAIL_VERIFIED_CLAIM,
    mfaClaim: configuredValue(environment.AUTH0_MFA_CLAIM) ?? DEFAULT_MFA_CLAIM,
    useUserInfo: environment.AUTH0_USE_USERINFO !== 'false',
  };
}

/**
 * Auth0 is used only at the provider-to-application-session boundary.
 * Company membership, product role, offline lease and audit state remain
 * application-owned in AuthService.
 */
export class Auth0IdentityProvider implements IdentityProvider {
  private readonly issuer: string;
  private readonly userInfoUri: string;
  private readonly emailClaim: string;
  private readonly emailVerifiedClaim: string;
  private readonly mfaClaim: string;
  private readonly useUserInfo: boolean;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly fetcher: Auth0Fetcher;

  constructor(
    private readonly config: Auth0IdentityProviderConfig,
    fetcher: Auth0Fetcher = (input, init) => fetch(input, init),
    private readonly invitationDelivery: InvitationDeliveryTransport = new UnconfiguredInvitationDelivery(),
  ) {
    const domain = normalizeDomain(config.domain);
    this.issuer = normalizeIssuer(config.issuer ?? `https://${domain}/`);
    this.userInfoUri =
      config.userInfoUri ?? new URL('userinfo', this.issuer).toString();
    this.emailClaim = config.emailClaim ?? DEFAULT_EMAIL_CLAIM;
    this.emailVerifiedClaim =
      config.emailVerifiedClaim ?? DEFAULT_EMAIL_VERIFIED_CLAIM;
    this.mfaClaim = config.mfaClaim ?? DEFAULT_MFA_CLAIM;
    this.useUserInfo = config.useUserInfo ?? true;
    this.jwks = createRemoteJWKSet(
      new URL(
        config.jwksUri ??
          new URL('.well-known/jwks.json', this.issuer).toString(),
      ),
    );
    this.fetcher = fetcher;
  }

  async verifyAccessToken(accessToken: string): Promise<VerifiedIdentity> {
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'provider access token is required',
      );
    }

    let payload: Auth0Claims;
    try {
      const result = await jwtVerify(accessToken, this.jwks, {
        issuer: this.issuer,
        audience: this.config.audience,
        algorithms: ['RS256'],
        clockTolerance: 5,
      });
      payload = result.payload as Auth0Claims;
    } catch (error) {
      if (isJwksAvailabilityError(error)) {
        throw providerUnavailable('Auth0 signing keys are unavailable');
      }
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'provider access token is invalid',
      );
    }

    const subject = payload.sub;
    if (typeof subject !== 'string' || subject.trim().length === 0) {
      throw new AuthFailure('UNAUTHENTICATED', 'provider identity is missing');
    }

    let profile: Readonly<Record<string, unknown>> = payload;
    if (this.useUserInfo) {
      profile = await this.getUserInfo(accessToken);
    }

    if (profile.sub !== undefined && profile.sub !== subject) {
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'Auth0 profile does not match the validated identity',
      );
    }

    const email = profile[this.emailClaim] ?? payload[this.emailClaim];
    const emailVerified =
      profile[this.emailVerifiedClaim] ?? payload[this.emailVerifiedClaim];
    if (typeof email !== 'string' || !booleanClaim(emailVerified)) {
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'Auth0 profile does not contain a verified email',
      );
    }

    try {
      return {
        subject: normalizeIdentitySubject(subject),
        email: normalizeEmail(email),
        emailVerified: true,
        mfaSatisfied:
          mfaClaimSatisfied(profile[this.mfaClaim]) ||
          mfaClaimSatisfied(payload[this.mfaClaim]) ||
          mfaClaimSatisfied(profile.amr) ||
          mfaClaimSatisfied(payload.amr),
      };
    } catch (error) {
      if (error instanceof AuthFailure) {
        throw new AuthFailure('UNAUTHENTICATED', 'Auth0 profile is invalid');
      }
      throw error;
    }
  }

  async sendInvitation(invitation: InvitationDelivery): Promise<void> {
    await this.invitationDelivery.deliver(invitation);
  }

  private async getUserInfo(
    accessToken: string,
  ): Promise<Readonly<Record<string, unknown>>> {
    let response: Auth0HttpResponse;
    try {
      response = await this.fetcher(this.userInfoUri, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json',
        },
      });
    } catch {
      throw providerUnavailable('Auth0 profile service is unavailable');
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'Auth0 profile access was denied',
      );
    }
    if (!response.ok) {
      throw providerUnavailable('Auth0 profile service returned an error');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw providerUnavailable('Auth0 profile response is invalid');
    }
    if (!isObject(body)) {
      throw providerUnavailable('Auth0 profile response is invalid');
    }
    return body;
  }
}
