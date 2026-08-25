import {
  AuthFailure,
  type AuthStore,
  type InvitationRecord,
  type SessionRecord,
  type UserRecord,
} from './auth.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function copyUser(user: UserRecord): UserRecord {
  return {
    ...user,
    createdAt: copyDate(user.createdAt),
    updatedAt: copyDate(user.updatedAt),
  };
}

function copyInvitation(invitation: InvitationRecord): InvitationRecord {
  return {
    ...invitation,
    expiresAt: copyDate(invitation.expiresAt),
    createdAt: copyDate(invitation.createdAt),
    acceptedAt: invitation.acceptedAt ? copyDate(invitation.acceptedAt) : null,
    revokedAt: invitation.revokedAt ? copyDate(invitation.revokedAt) : null,
  };
}

function copySession(session: SessionRecord): SessionRecord {
  return {
    ...session,
    issuedAt: copyDate(session.issuedAt),
    expiresAt: copyDate(session.expiresAt),
    lastSeenAt: copyDate(session.lastSeenAt),
    revokedAt: session.revokedAt ? copyDate(session.revokedAt) : null,
  };
}

export class InMemoryAuthStore implements AuthStore {
  private readonly users = new Map<string, UserRecord>();
  private readonly invitations = new Map<string, InvitationRecord>();
  private readonly sessions = new Map<string, SessionRecord>();

  createUser(user: UserRecord): void {
    const userKey = key(user.companyId, user.userId);
    if (this.users.has(userKey)) {
      throw new AuthFailure('CONFLICT', 'user already exists');
    }
    if (this.getUserByIdentity(user.companyId, user.identitySubject)) {
      throw new AuthFailure('CONFLICT', 'identity is already a member');
    }
    if (this.getUserByEmail(user.companyId, user.email)) {
      throw new AuthFailure('CONFLICT', 'email is already a member');
    }

    this.users.set(userKey, copyUser(user));
  }

  getUser(companyId: string, userId: string): UserRecord | undefined {
    const user = this.users.get(key(companyId, userId));
    return user ? copyUser(user) : undefined;
  }

  getUserByIdentity(
    companyId: string,
    identitySubject: string,
  ): UserRecord | undefined {
    for (const user of this.users.values()) {
      if (
        user.companyId === companyId &&
        user.identitySubject === identitySubject
      ) {
        return copyUser(user);
      }
    }
    return undefined;
  }

  getUserByEmail(companyId: string, email: string): UserRecord | undefined {
    for (const user of this.users.values()) {
      if (user.companyId === companyId && user.email === email) {
        return copyUser(user);
      }
    }
    return undefined;
  }

  updateUser(user: UserRecord): void {
    const userKey = key(user.companyId, user.userId);
    if (!this.users.has(userKey)) {
      throw new AuthFailure('CONFLICT', 'user does not exist');
    }

    this.users.set(userKey, copyUser(user));
  }

  createInvitation(invitation: InvitationRecord): void {
    const invitationKey = key(invitation.companyId, invitation.invitationId);
    if (this.invitations.has(invitationKey)) {
      throw new AuthFailure('CONFLICT', 'invitation already exists');
    }
    for (const existing of this.invitations.values()) {
      if (
        existing.companyId === invitation.companyId &&
        existing.tokenHash === invitation.tokenHash
      ) {
        throw new AuthFailure('CONFLICT', 'invitation token already exists');
      }
    }

    this.invitations.set(invitationKey, copyInvitation(invitation));
  }

  getInvitationByTokenHash(
    companyId: string,
    tokenHash: string,
  ): InvitationRecord | undefined {
    for (const invitation of this.invitations.values()) {
      if (
        invitation.companyId === companyId &&
        invitation.tokenHash === tokenHash
      ) {
        return copyInvitation(invitation);
      }
    }
    return undefined;
  }

  completeInvitation(
    companyId: string,
    tokenHash: string,
    user: UserRecord,
    acceptedAt: Date,
  ): void {
    const invitation = this.getInvitationByTokenHash(companyId, tokenHash);
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
    if (this.getUserByIdentity(companyId, user.identitySubject)) {
      throw new AuthFailure('CONFLICT', 'identity is already a member');
    }
    if (this.getUserByEmail(companyId, user.email)) {
      throw new AuthFailure('CONFLICT', 'email is already a member');
    }

    this.createUser(user);
    this.invitations.set(
      key(companyId, invitation.invitationId),
      copyInvitation({ ...invitation, acceptedAt: copyDate(acceptedAt) }),
    );
  }

  revokeInvitation(
    companyId: string,
    invitationId: string,
    revokedAt: Date,
  ): void {
    const invitation = this.invitations.get(key(companyId, invitationId));
    if (!invitation) {
      return;
    }

    this.invitations.set(
      key(companyId, invitationId),
      copyInvitation({ ...invitation, revokedAt: copyDate(revokedAt) }),
    );
  }

  createSession(session: SessionRecord): void {
    const sessionKey = key(session.companyId, session.sessionId);
    if (this.sessions.has(sessionKey)) {
      throw new AuthFailure('CONFLICT', 'session already exists');
    }
    for (const existing of this.sessions.values()) {
      if (
        existing.companyId === session.companyId &&
        existing.tokenHash === session.tokenHash
      ) {
        throw new AuthFailure('CONFLICT', 'session token already exists');
      }
    }

    this.sessions.set(sessionKey, copySession(session));
  }

  getSessionByTokenHash(
    companyId: string,
    tokenHash: string,
  ): SessionRecord | undefined {
    for (const session of this.sessions.values()) {
      if (session.companyId === companyId && session.tokenHash === tokenHash) {
        return copySession(session);
      }
    }
    return undefined;
  }

  getSession(companyId: string, sessionId: string): SessionRecord | undefined {
    const session = this.sessions.get(key(companyId, sessionId));
    return session ? copySession(session) : undefined;
  }

  revokeSession(companyId: string, sessionId: string, revokedAt: Date): void {
    const session = this.sessions.get(key(companyId, sessionId));
    if (!session) {
      throw new AuthFailure('SESSION_NOT_FOUND', 'session is invalid');
    }
    if (session.revokedAt) {
      return;
    }

    this.sessions.set(
      key(companyId, sessionId),
      copySession({ ...session, revokedAt: copyDate(revokedAt) }),
    );
  }
}

export class UnconfiguredAuthStore implements AuthStore {
  private unavailable(): never {
    throw new AuthFailure(
      'AUTH_PERSISTENCE_UNAVAILABLE',
      'identity persistence adapter is not configured',
    );
  }

  createUser(_user: UserRecord): void {
    this.unavailable();
  }

  getUser(_companyId: string, _userId: string): UserRecord | undefined {
    return this.unavailable();
  }

  getUserByIdentity(
    _companyId: string,
    _identitySubject: string,
  ): UserRecord | undefined {
    return this.unavailable();
  }

  getUserByEmail(_companyId: string, _email: string): UserRecord | undefined {
    return this.unavailable();
  }

  updateUser(_user: UserRecord): void {
    this.unavailable();
  }

  createInvitation(_invitation: InvitationRecord): void {
    this.unavailable();
  }

  getInvitationByTokenHash(
    _companyId: string,
    _tokenHash: string,
  ): InvitationRecord | undefined {
    return this.unavailable();
  }

  completeInvitation(
    _companyId: string,
    _tokenHash: string,
    _user: UserRecord,
    _acceptedAt: Date,
  ): void {
    this.unavailable();
  }

  revokeInvitation(
    _companyId: string,
    _invitationId: string,
    _revokedAt: Date,
  ): void {
    this.unavailable();
  }

  createSession(_session: SessionRecord): void {
    this.unavailable();
  }

  getSessionByTokenHash(
    _companyId: string,
    _tokenHash: string,
  ): SessionRecord | undefined {
    return this.unavailable();
  }

  getSession(
    _companyId: string,
    _sessionId: string,
  ): SessionRecord | undefined {
    return this.unavailable();
  }

  revokeSession(
    _companyId: string,
    _sessionId: string,
    _revokedAt: Date,
  ): void {
    this.unavailable();
  }
}
