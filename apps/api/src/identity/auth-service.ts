import {
  AuthFailure,
  type AuthAuditEvent,
  type AuthAuditSink,
  type AuthClock,
  type AuthConfig,
  type AuthPrincipal,
  type AuthStore,
  type AuthTokenGenerator,
  type IdentityProvider,
  type InvitationRecord,
  type ProductRole,
  PRODUCT_ROLES,
  type SessionRecord,
  type UserRecord,
  type VerifiedIdentity,
  hashSecret,
  normalizeEmail,
  normalizeIdentitySubject,
  systemAuthClock,
  secureAuthTokenGenerator,
  NoopAuthAuditSink,
} from './auth.types';

export interface AuthServiceOptions {
  readonly store: AuthStore;
  readonly identityProvider: IdentityProvider;
  readonly auditSink?: AuthAuditSink;
  readonly clock?: AuthClock;
  readonly tokenGenerator?: AuthTokenGenerator;
  readonly config: AuthConfig;
}

export interface CreateInvitationInput {
  readonly email: string;
  readonly role: ProductRole;
  readonly expiresAt: Date;
}

export interface InvitationSummary {
  readonly companyId: string;
  readonly invitationId: string;
  readonly email: string;
  readonly role: ProductRole;
  readonly expiresAt: Date;
}

export interface SessionResult {
  readonly accessToken: string;
  readonly companyId: string;
  readonly expiresAt: Date;
  readonly user: {
    readonly userId: string;
    readonly email: string;
    readonly role: ProductRole;
  };
}

function assertProductRole(role: string): asserts role is ProductRole {
  if (!PRODUCT_ROLES.includes(role as ProductRole)) {
    throw new AuthFailure('INVALID_INPUT', 'role is invalid');
  }
}

function assertMfaPolicy(role: ProductRole, mfaSatisfied: boolean): void {
  if (role === 'administrator' && !mfaSatisfied) {
    throw new AuthFailure(
      'MFA_REQUIRED',
      'Administrator authentication requires MFA',
    );
  }
}

function assertVerifiedIdentity(identity: VerifiedIdentity): VerifiedIdentity {
  const subject = normalizeIdentitySubject(identity.subject);
  const email = normalizeEmail(identity.email);
  if (!identity.emailVerified) {
    throw new AuthFailure(
      'EMAIL_NOT_VERIFIED',
      'verified email is required before account access',
    );
  }

  return {
    subject,
    email,
    emailVerified: true,
    mfaSatisfied: identity.mfaSatisfied === true,
  };
}

function assertFutureDate(expiresAt: Date, now: Date): Date {
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
    throw new AuthFailure('INVALID_INPUT', 'expiry must be a valid date');
  }
  if (expiresAt.getTime() <= now.getTime()) {
    throw new AuthFailure('INVALID_INPUT', 'expiry must be in the future');
  }

  return new Date(expiresAt.getTime());
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

export class AuthService {
  private readonly auditSink: AuthAuditSink;
  private readonly clock: AuthClock;
  private readonly tokenGenerator: AuthTokenGenerator;

  constructor(private readonly options: AuthServiceOptions) {
    if (
      !Number.isFinite(options.config.sessionTtlMs) ||
      options.config.sessionTtlMs <= 0
    ) {
      throw new Error('sessionTtlMs must be a positive finite number');
    }

    this.auditSink = options.auditSink ?? new NoopAuthAuditSink();
    this.clock = options.clock ?? systemAuthClock;
    this.tokenGenerator = options.tokenGenerator ?? secureAuthTokenGenerator;
  }

  async createInvitation(
    actor: AuthPrincipal,
    input: CreateInvitationInput,
  ): Promise<InvitationSummary> {
    this.assertAdministrator(actor);
    assertProductRole(input.role);

    const now = this.clock.now();
    const email = normalizeEmail(input.email);
    const expiresAt = assertFutureDate(input.expiresAt, now);
    const invitationId = this.tokenGenerator.createId();
    const invitationToken = this.tokenGenerator.createOpaqueToken();
    const invitation: InvitationRecord = {
      companyId: actor.companyId,
      invitationId,
      email,
      role: input.role,
      tokenHash: hashSecret(invitationToken),
      invitedByUserId: actor.userId,
      expiresAt,
      createdAt: copyDate(now),
      acceptedAt: null,
      revokedAt: null,
    };

    this.options.store.createInvitation(invitation);
    try {
      await this.options.identityProvider.sendInvitation({
        companyId: actor.companyId,
        invitationId,
        email,
        role: input.role,
        invitationToken,
        expiresAt,
      });
    } catch (error) {
      this.options.store.revokeInvitation(actor.companyId, invitationId, now);
      if (error instanceof AuthFailure) {
        throw error;
      }
      throw new AuthFailure(
        'INVITATION_DELIVERY_UNAVAILABLE',
        'invitation delivery failed',
      );
    }

    this.recordAudit({
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: 'invitation.created',
      targetType: 'user_invitation',
      targetId: invitationId,
      occurredAt: now,
      metadata: { role: input.role },
    });

    return {
      companyId: actor.companyId,
      invitationId,
      email,
      role: input.role,
      expiresAt: copyDate(expiresAt),
    };
  }

  async createSessionFromProviderAccessToken(
    companyId: string,
    providerAccessToken: string,
  ): Promise<SessionResult> {
    const identity = await this.verifyProviderToken(providerAccessToken);
    return this.createSession(companyId, identity);
  }

  async acceptInvitationFromProviderAccessToken(
    companyId: string,
    invitationToken: string,
    providerAccessToken: string,
  ): Promise<SessionResult> {
    const identity = await this.verifyProviderToken(providerAccessToken);
    return this.acceptInvitation(companyId, invitationToken, identity);
  }

  acceptInvitation(
    companyId: string,
    invitationToken: string,
    identity: VerifiedIdentity,
  ): SessionResult {
    const verifiedIdentity = assertVerifiedIdentity(identity);
    const now = this.clock.now();
    const invitation = this.options.store.getInvitationByTokenHash(
      companyId,
      hashSecret(invitationToken),
    );
    if (!invitation) {
      throw new AuthFailure('INVITATION_NOT_FOUND', 'invitation is invalid');
    }
    if (invitation.acceptedAt) {
      throw new AuthFailure(
        'INVITATION_ALREADY_USED',
        'invitation has already been accepted',
      );
    }
    if (invitation.revokedAt) {
      throw new AuthFailure('INVITATION_REVOKED', 'invitation is revoked');
    }
    if (invitation.expiresAt.getTime() <= now.getTime()) {
      throw new AuthFailure('INVITATION_EXPIRED', 'invitation has expired');
    }
    if (invitation.email !== verifiedIdentity.email) {
      throw new AuthFailure(
        'INVITATION_EMAIL_MISMATCH',
        'invitation email does not match verified identity',
      );
    }
    assertMfaPolicy(invitation.role, verifiedIdentity.mfaSatisfied);

    const user: UserRecord = {
      companyId,
      userId: this.tokenGenerator.createId(),
      identitySubject: verifiedIdentity.subject,
      email: verifiedIdentity.email,
      role: invitation.role,
      active: true,
      createdAt: copyDate(now),
      updatedAt: copyDate(now),
    };
    this.options.store.completeInvitation(
      companyId,
      invitation.tokenHash,
      user,
      now,
    );
    this.recordAudit({
      companyId,
      actorUserId: user.userId,
      action: 'invitation.accepted',
      targetType: 'user_invitation',
      targetId: invitation.invitationId,
      occurredAt: now,
      metadata: { role: invitation.role },
    });

    return this.issueSession(user, verifiedIdentity.mfaSatisfied, now);
  }

  createSession(companyId: string, identity: VerifiedIdentity): SessionResult {
    const verifiedIdentity = assertVerifiedIdentity(identity);
    const now = this.clock.now();
    const user = this.options.store.getUserByIdentity(
      companyId,
      verifiedIdentity.subject,
    );
    if (!user) {
      throw new AuthFailure(
        'IDENTITY_NOT_MEMBER',
        'verified identity is not an active company member',
      );
    }
    if (!user.active) {
      throw new AuthFailure('ACCOUNT_INACTIVE', 'account is inactive');
    }
    if (user.email !== verifiedIdentity.email) {
      throw new AuthFailure(
        'IDENTITY_MISMATCH',
        'verified identity does not match company membership',
      );
    }
    assertMfaPolicy(user.role, verifiedIdentity.mfaSatisfied);

    return this.issueSession(user, verifiedIdentity.mfaSatisfied, now);
  }

  authenticateSession(companyId: string, accessToken: string): AuthPrincipal {
    const now = this.clock.now();
    const session = this.options.store.getSessionByTokenHash(
      companyId,
      hashSecret(accessToken),
    );
    if (!session) {
      throw new AuthFailure('SESSION_NOT_FOUND', 'session is invalid');
    }
    if (session.revokedAt) {
      throw new AuthFailure('SESSION_REVOKED', 'session has been revoked');
    }
    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new AuthFailure('SESSION_EXPIRED', 'session has expired');
    }

    const user = this.options.store.getUser(companyId, session.userId);
    if (!user || user.identitySubject !== session.identitySubject) {
      throw new AuthFailure('SESSION_INVALID', 'session membership is invalid');
    }
    if (!user.active) {
      throw new AuthFailure('ACCOUNT_INACTIVE', 'account is inactive');
    }
    // Role and active state are read from current membership, not trusted from
    // a long-lived token claim. A promotion to Administrator therefore cannot
    // bypass the MFA requirement on an older Inspector session.
    assertMfaPolicy(user.role, session.mfaSatisfied);

    return {
      companyId,
      sessionId: session.sessionId,
      userId: user.userId,
      identitySubject: user.identitySubject,
      email: user.email,
      role: user.role,
      mfaSatisfied: session.mfaSatisfied,
      authenticatedAt: copyDate(now),
      sessionExpiresAt: copyDate(session.expiresAt),
    };
  }

  revokeSession(actor: AuthPrincipal, targetSessionId = actor.sessionId): void {
    const target = this.options.store.getSession(
      actor.companyId,
      targetSessionId,
    );
    if (!target) {
      throw new AuthFailure('SESSION_NOT_FOUND', 'session is invalid');
    }
    if (target.userId !== actor.userId && actor.role !== 'administrator') {
      throw new AuthFailure(
        'ROLE_FORBIDDEN',
        'only an Administrator may revoke another user session',
      );
    }

    const now = this.clock.now();
    this.options.store.revokeSession(actor.companyId, targetSessionId, now);
    this.recordAudit({
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: 'session.revoked',
      targetType: 'user_session',
      targetId: targetSessionId,
      occurredAt: now,
    });
  }

  assertCanManageUsers(principal: AuthPrincipal): void {
    this.assertAdministrator(principal);
  }

  private async verifyProviderToken(
    providerAccessToken: string,
  ): Promise<VerifiedIdentity> {
    if (
      typeof providerAccessToken !== 'string' ||
      providerAccessToken.trim().length === 0
    ) {
      throw new AuthFailure(
        'UNAUTHENTICATED',
        'provider access token required',
      );
    }

    return this.options.identityProvider.verifyAccessToken(providerAccessToken);
  }

  private issueSession(
    user: UserRecord,
    mfaSatisfied: boolean,
    issuedAt: Date,
  ): SessionResult {
    const accessToken = this.tokenGenerator.createOpaqueToken();
    const expiresAt = new Date(
      issuedAt.getTime() + this.options.config.sessionTtlMs,
    );
    const session: SessionRecord = {
      companyId: user.companyId,
      sessionId: this.tokenGenerator.createId(),
      userId: user.userId,
      identitySubject: user.identitySubject,
      tokenHash: hashSecret(accessToken),
      mfaSatisfied,
      issuedAt: copyDate(issuedAt),
      expiresAt,
      lastSeenAt: copyDate(issuedAt),
      revokedAt: null,
    };
    this.options.store.createSession(session);
    this.recordAudit({
      companyId: user.companyId,
      actorUserId: user.userId,
      action: 'session.created',
      targetType: 'user_session',
      targetId: session.sessionId,
      occurredAt: issuedAt,
      metadata: { role: user.role, mfaSatisfied },
    });

    return {
      accessToken,
      companyId: user.companyId,
      expiresAt: copyDate(expiresAt),
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  private assertAdministrator(principal: AuthPrincipal): void {
    if (principal.role !== 'administrator') {
      throw new AuthFailure('ROLE_FORBIDDEN', 'Administrator role is required');
    }
  }

  private recordAudit(event: AuthAuditEvent): void {
    this.auditSink.record(event);
  }
}
