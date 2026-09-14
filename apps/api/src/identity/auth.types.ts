import { createHash, randomBytes } from 'node:crypto';

export const PRODUCT_ROLES = [
  'administrator',
  'office_reviewer',
  'inspector',
] as const;

export type ProductRole = (typeof PRODUCT_ROLES)[number];

export type AuthFailureCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'EMAIL_NOT_VERIFIED'
  | 'MFA_REQUIRED'
  | 'IDENTITY_NOT_MEMBER'
  | 'IDENTITY_MISMATCH'
  | 'ACCOUNT_INACTIVE'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'INVITATION_DELIVERY_UNAVAILABLE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'ROLE_FORBIDDEN'
  | 'COMPANY_MISMATCH'
  | 'CONFLICT'
  | 'AUTH_PERSISTENCE_UNAVAILABLE'
  | 'IDENTITY_PROVIDER_UNAVAILABLE';

export class AuthFailure extends Error {
  constructor(
    readonly code: AuthFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthFailure';
  }
}

export interface VerifiedIdentity {
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly mfaSatisfied: boolean;
}

export interface UserRecord {
  readonly companyId: string;
  readonly userId: string;
  readonly identitySubject: string;
  readonly email: string;
  readonly role: ProductRole;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InvitationRecord {
  readonly companyId: string;
  readonly invitationId: string;
  readonly email: string;
  readonly role: ProductRole;
  readonly tokenHash: string;
  readonly invitedByUserId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface SessionRecord {
  readonly companyId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly identitySubject: string;
  readonly tokenHash: string;
  readonly mfaSatisfied: boolean;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly lastSeenAt: Date;
  readonly revokedAt: Date | null;
}

export interface AuthPrincipal {
  readonly companyId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly identitySubject: string;
  readonly email: string;
  readonly role: ProductRole;
  readonly mfaSatisfied: boolean;
  readonly authenticatedAt: Date;
  readonly sessionExpiresAt: Date;
}

export type AuthStoreResult<Value> = Value | Promise<Value>;

export interface AuthStore {
  createUser(user: UserRecord): AuthStoreResult<void>;
  getUser(
    companyId: string,
    userId: string,
  ): AuthStoreResult<UserRecord | undefined>;
  getUserByIdentity(
    companyId: string,
    identitySubject: string,
  ): AuthStoreResult<UserRecord | undefined>;
  getUserByEmail(
    companyId: string,
    email: string,
  ): AuthStoreResult<UserRecord | undefined>;
  updateUser(user: UserRecord): AuthStoreResult<void>;

  createInvitation(invitation: InvitationRecord): AuthStoreResult<void>;
  getInvitationByTokenHash(
    companyId: string,
    tokenHash: string,
  ): AuthStoreResult<InvitationRecord | undefined>;
  completeInvitation(
    companyId: string,
    tokenHash: string,
    user: UserRecord,
    acceptedAt: Date,
  ): AuthStoreResult<void>;
  revokeInvitation(
    companyId: string,
    invitationId: string,
    revokedAt: Date,
  ): AuthStoreResult<void>;

  createSession(session: SessionRecord): AuthStoreResult<void>;
  getSessionByTokenHash(
    companyId: string,
    tokenHash: string,
  ): AuthStoreResult<SessionRecord | undefined>;
  getSession(
    companyId: string,
    sessionId: string,
  ): AuthStoreResult<SessionRecord | undefined>;
  revokeSession(
    companyId: string,
    sessionId: string,
    revokedAt: Date,
  ): AuthStoreResult<void>;
  /** Rotates the expiry window only while the current opaque session is live. */
  renewSession(
    companyId: string,
    tokenHash: string,
    renewedAt: Date,
    expiresAt: Date,
  ): AuthStoreResult<SessionRecord | undefined>;
  /** Records server-side activity used by /auth/me revalidation. */
  touchSession?(
    companyId: string,
    sessionId: string,
    seenAt: Date,
  ): AuthStoreResult<void>;
}

export interface InvitationDelivery {
  readonly companyId: string;
  readonly invitationId: string;
  readonly email: string;
  readonly role: ProductRole;
  readonly invitationToken: string;
  readonly expiresAt: Date;
}

export interface IdentityProvider {
  verifyAccessToken(accessToken: string): Promise<VerifiedIdentity>;
  sendInvitation(invitation: InvitationDelivery): Promise<void>;
}

export interface AuthAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string | null;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface AuthAuditSink {
  record(event: AuthAuditEvent): void | Promise<void>;
}

export interface AuthClock {
  now(): Date;
}

export interface AuthTokenGenerator {
  createOpaqueToken(): string;
  createId(): string;
}

export interface AuthConfig {
  readonly sessionTtlMs: number;
}

export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') {
    throw new AuthFailure('INVALID_INPUT', 'email is required');
  }

  const normalized = email.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > 320 ||
    !normalized.includes('@')
  ) {
    throw new AuthFailure('INVALID_INPUT', 'email is invalid');
  }

  return normalized;
}

export function normalizeIdentitySubject(subject: string): string {
  if (typeof subject !== 'string' || subject.trim().length === 0) {
    throw new AuthFailure('INVALID_INPUT', 'identity subject is required');
  }

  return subject.trim();
}

export function hashSecret(secret: string): string {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new AuthFailure('UNAUTHENTICATED', 'credential is required');
  }

  // Invitation and session credentials are generated with high entropy. A
  // one-way SHA-256 digest is sufficient for lookup without storing the raw
  // opaque credential; password hashing is deliberately delegated to the
  // identity provider and is not part of this module.
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export const secureAuthTokenGenerator: AuthTokenGenerator = {
  createOpaqueToken: () => randomBytes(32).toString('base64url'),
  createId: () => randomBytes(16).toString('hex'),
};

export const systemAuthClock: AuthClock = {
  now: () => new Date(),
};

export class NoopAuthAuditSink implements AuthAuditSink {
  record(_event: AuthAuditEvent): void {
    // The production adapter writes append-only audit rows. The API scaffold
    // keeps that adapter unconfigured until the database runtime is selected.
  }
}

export class UnconfiguredIdentityProvider implements IdentityProvider {
  async verifyAccessToken(_accessToken: string): Promise<VerifiedIdentity> {
    throw new AuthFailure(
      'IDENTITY_PROVIDER_UNAVAILABLE',
      'identity provider adapter is not configured',
    );
  }

  async sendInvitation(_invitation: InvitationDelivery): Promise<void> {
    throw new AuthFailure(
      'INVITATION_DELIVERY_UNAVAILABLE',
      'identity provider invitation adapter is not configured',
    );
  }
}
