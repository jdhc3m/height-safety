import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import {
  AuthFailure,
  PRODUCT_ROLES,
  type AuthStore,
  type InvitationRecord,
  type ProductRole,
  type SessionRecord,
  type UserRecord,
} from './auth.types';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';

interface UserRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly user_id: unknown;
  readonly identity_subject: unknown;
  readonly email: unknown;
  readonly role: unknown;
  readonly active: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface InvitationRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly invitation_id: unknown;
  readonly email: unknown;
  readonly role: unknown;
  readonly token_hash: unknown;
  readonly invited_by_user_id: unknown;
  readonly expires_at: unknown;
  readonly accepted_at: unknown;
  readonly revoked_at: unknown;
  readonly created_at: unknown;
}

interface SessionRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly session_id: unknown;
  readonly user_id: unknown;
  readonly identity_subject: unknown;
  readonly token_hash: unknown;
  readonly mfa_satisfied: unknown;
  readonly issued_at: unknown;
  readonly expires_at: unknown;
  readonly last_seen_at: unknown;
  readonly revoked_at: unknown;
}

const USER_COLUMNS = `
  company_id,
  user_id,
  identity_subject,
  email,
  role,
  active,
  created_at,
  updated_at
`;

const INVITATION_COLUMNS = `
  company_id,
  invitation_id,
  email,
  role,
  token_hash,
  invited_by_user_id,
  expires_at,
  accepted_at,
  revoked_at,
  created_at
`;

const SESSION_COLUMNS = `
  company_id,
  session_id,
  user_id,
  identity_subject,
  token_hash,
  mfa_satisfied,
  issued_at,
  expires_at,
  last_seen_at,
  revoked_at
`;

const INSERT_USER_SQL = `
  INSERT INTO users (
    company_id,
    user_id,
    identity_subject,
    email,
    role,
    active,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`;

const SELECT_INVITATION_FOR_UPDATE_SQL = `
  SELECT ${INVITATION_COLUMNS}
  FROM user_invitations
  WHERE company_id = $1 AND token_hash = $2
  FOR UPDATE
`;

const COMPLETE_INVITATION_SQL = `
  UPDATE user_invitations
  SET accepted_at = $3
  WHERE company_id = $1
    AND token_hash = $2
    AND accepted_at IS NULL
    AND revoked_at IS NULL
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === '23505';
}

function storedFailure(): AuthFailure {
  return new AuthFailure(
    'AUTH_PERSISTENCE_UNAVAILABLE',
    'identity persistence is unavailable',
  );
}

function requiredStoredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AuthFailure(
      'AUTH_PERSISTENCE_UNAVAILABLE',
      `identity persistence returned invalid ${field}`,
    );
  }
  return value;
}

function requiredStoredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new AuthFailure(
      'AUTH_PERSISTENCE_UNAVAILABLE',
      `identity persistence returned invalid ${field}`,
    );
  }
  return value;
}

function requiredStoredRole(value: unknown): ProductRole {
  if (
    typeof value !== 'string' ||
    !PRODUCT_ROLES.includes(value as ProductRole)
  ) {
    throw new AuthFailure(
      'AUTH_PERSISTENCE_UNAVAILABLE',
      'identity persistence returned invalid role',
    );
  }
  return value as ProductRole;
}

function requiredStoredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AuthFailure(
      'AUTH_PERSISTENCE_UNAVAILABLE',
      `identity persistence returned invalid ${field}`,
    );
  }
  return date;
}

function nullableStoredDate(value: unknown, field: string): Date | null {
  return value === null || value === undefined
    ? null
    : requiredStoredDate(value, field);
}

function parseUser(row: UserRow, companyId: string): UserRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) throw storedFailure();
  return {
    companyId: rowCompanyId,
    userId: requiredStoredString(row.user_id, 'user_id'),
    identitySubject: requiredStoredString(
      row.identity_subject,
      'identity_subject',
    ),
    email: requiredStoredString(row.email, 'email'),
    role: requiredStoredRole(row.role),
    active: requiredStoredBoolean(row.active, 'active'),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
    updatedAt: requiredStoredDate(row.updated_at, 'updated_at'),
  };
}

function parseInvitation(
  row: InvitationRow,
  companyId: string,
): InvitationRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) throw storedFailure();
  return {
    companyId: rowCompanyId,
    invitationId: requiredStoredString(row.invitation_id, 'invitation_id'),
    email: requiredStoredString(row.email, 'email'),
    role: requiredStoredRole(row.role),
    tokenHash: requiredStoredString(row.token_hash, 'token_hash'),
    invitedByUserId: requiredStoredString(
      row.invited_by_user_id,
      'invited_by_user_id',
    ),
    expiresAt: requiredStoredDate(row.expires_at, 'expires_at'),
    acceptedAt: nullableStoredDate(row.accepted_at, 'accepted_at'),
    revokedAt: nullableStoredDate(row.revoked_at, 'revoked_at'),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
  };
}

function parseSession(row: SessionRow, companyId: string): SessionRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) throw storedFailure();
  return {
    companyId: rowCompanyId,
    sessionId: requiredStoredString(row.session_id, 'session_id'),
    userId: requiredStoredString(row.user_id, 'user_id'),
    identitySubject: requiredStoredString(
      row.identity_subject,
      'identity_subject',
    ),
    tokenHash: requiredStoredString(row.token_hash, 'token_hash'),
    mfaSatisfied: requiredStoredBoolean(row.mfa_satisfied, 'mfa_satisfied'),
    issuedAt: requiredStoredDate(row.issued_at, 'issued_at'),
    expiresAt: requiredStoredDate(row.expires_at, 'expires_at'),
    lastSeenAt: requiredStoredDate(row.last_seen_at, 'last_seen_at'),
    revokedAt: nullableStoredDate(row.revoked_at, 'revoked_at'),
  };
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

export class PostgresAuthStore implements AuthStore {
  constructor(private readonly database: SqlDatabase) {}

  async createUser(user: UserRecord): Promise<void> {
    try {
      await this.withTenant(user.companyId, async (transaction) => {
        await transaction.query(INSERT_USER_SQL, [
          user.companyId,
          user.userId,
          user.identitySubject,
          user.email,
          user.role,
          user.active,
          user.createdAt,
          user.updatedAt,
        ]);
      });
    } catch (error) {
      this.rethrowStoreError(error, 'user already exists');
    }
  }

  async getUser(
    companyId: string,
    userId: string,
  ): Promise<UserRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<UserRow>(
        `SELECT ${USER_COLUMNS} FROM users WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId],
      );
      const row = firstRow(result);
      return row ? parseUser(row, companyId) : undefined;
    });
  }

  async getUserByIdentity(
    companyId: string,
    identitySubject: string,
  ): Promise<UserRecord | undefined> {
    return this.findUser(companyId, 'identity_subject', identitySubject);
  }

  async getUserByEmail(
    companyId: string,
    email: string,
  ): Promise<UserRecord | undefined> {
    return this.findUser(companyId, 'email', email);
  }

  async updateUser(user: UserRecord): Promise<void> {
    try {
      await this.withTenant(user.companyId, async (transaction) => {
        const result = await transaction.query(
          `
            UPDATE users
            SET identity_subject = $3,
                email = $4,
                role = $5,
                active = $6,
                updated_at = $7
            WHERE company_id = $1 AND user_id = $2
          `,
          [
            user.companyId,
            user.userId,
            user.identitySubject,
            user.email,
            user.role,
            user.active,
            user.updatedAt,
          ],
        );
        if (result.rowCount !== 1) {
          throw new AuthFailure('CONFLICT', 'user does not exist');
        }
      });
    } catch (error) {
      this.rethrowStoreError(error, 'user update conflicted');
    }
  }

  async createInvitation(invitation: InvitationRecord): Promise<void> {
    try {
      await this.withTenant(invitation.companyId, async (transaction) => {
        await transaction.query(
          `
            INSERT INTO user_invitations (
              company_id,
              invitation_id,
              email,
              role,
              token_hash,
              invited_by_user_id,
              expires_at,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            invitation.companyId,
            invitation.invitationId,
            invitation.email,
            invitation.role,
            invitation.tokenHash,
            invitation.invitedByUserId,
            invitation.expiresAt,
            invitation.createdAt,
          ],
        );
      });
    } catch (error) {
      this.rethrowStoreError(error, 'invitation already exists');
    }
  }

  async getInvitationByTokenHash(
    companyId: string,
    tokenHash: string,
  ): Promise<InvitationRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<InvitationRow>(
        `
          SELECT ${INVITATION_COLUMNS}
          FROM user_invitations
          WHERE company_id = $1 AND token_hash = $2
        `,
        [companyId, tokenHash],
      );
      const row = firstRow(result);
      return row ? parseInvitation(row, companyId) : undefined;
    });
  }

  async completeInvitation(
    companyId: string,
    tokenHash: string,
    user: UserRecord,
    acceptedAt: Date,
  ): Promise<void> {
    try {
      await this.withTenant(companyId, async (transaction) => {
        const result = await transaction.query<InvitationRow>(
          SELECT_INVITATION_FOR_UPDATE_SQL,
          [companyId, tokenHash],
        );
        const row = firstRow(result);
        if (!row) {
          throw new AuthFailure(
            'INVITATION_NOT_FOUND',
            'invitation is invalid',
          );
        }
        const invitation = parseInvitation(row, companyId);
        if (invitation.acceptedAt) {
          throw new AuthFailure(
            'INVITATION_ALREADY_USED',
            'invitation has already been accepted',
          );
        }
        if (invitation.revokedAt) {
          throw new AuthFailure('INVITATION_REVOKED', 'invitation is revoked');
        }

        const identityResult = await transaction.query<UserRow>(
          `
            SELECT ${USER_COLUMNS}
            FROM users
            WHERE company_id = $1 AND identity_subject = $2
            LIMIT 1
          `,
          [companyId, user.identitySubject],
        );
        if (firstRow(identityResult)) {
          throw new AuthFailure('CONFLICT', 'identity is already a member');
        }

        const emailResult = await transaction.query<UserRow>(
          `
            SELECT ${USER_COLUMNS}
            FROM users
            WHERE company_id = $1 AND email = $2
            LIMIT 1
          `,
          [companyId, user.email],
        );
        if (firstRow(emailResult)) {
          throw new AuthFailure('CONFLICT', 'email is already a member');
        }

        await transaction.query(INSERT_USER_SQL, [
          user.companyId,
          user.userId,
          user.identitySubject,
          user.email,
          user.role,
          user.active,
          user.createdAt,
          user.updatedAt,
        ]);
        const completed = await transaction.query(COMPLETE_INVITATION_SQL, [
          companyId,
          tokenHash,
          acceptedAt,
        ]);
        if (completed.rowCount !== 1) {
          throw new AuthFailure(
            'INVITATION_ALREADY_USED',
            'invitation has already been accepted',
          );
        }
      });
    } catch (error) {
      this.rethrowStoreError(error, 'invitation completion conflicted');
    }
  }

  async revokeInvitation(
    companyId: string,
    invitationId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.withTenant(companyId, async (transaction) => {
      await transaction.query(
        `
          UPDATE user_invitations
          SET revoked_at = $3
          WHERE company_id = $1 AND invitation_id = $2
        `,
        [companyId, invitationId, revokedAt],
      );
    });
  }

  async createSession(session: SessionRecord): Promise<void> {
    try {
      await this.withTenant(session.companyId, async (transaction) => {
        await transaction.query(
          `
            INSERT INTO user_sessions (
              company_id,
              session_id,
              user_id,
              identity_subject,
              token_hash,
              mfa_satisfied,
              issued_at,
              expires_at,
              last_seen_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            session.companyId,
            session.sessionId,
            session.userId,
            session.identitySubject,
            session.tokenHash,
            session.mfaSatisfied,
            session.issuedAt,
            session.expiresAt,
            session.lastSeenAt,
          ],
        );
      });
    } catch (error) {
      this.rethrowStoreError(error, 'session already exists');
    }
  }

  async getSessionByTokenHash(
    companyId: string,
    tokenHash: string,
  ): Promise<SessionRecord | undefined> {
    return this.findSession(companyId, 'token_hash', tokenHash);
  }

  async getSession(
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<SessionRow>(
        `
          SELECT ${SESSION_COLUMNS}
          FROM user_sessions
          WHERE company_id = $1 AND session_id = $2
        `,
        [companyId, sessionId],
      );
      const row = firstRow(result);
      return row ? parseSession(row, companyId) : undefined;
    });
  }

  async revokeSession(
    companyId: string,
    sessionId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<SessionRow>(
        `
          SELECT ${SESSION_COLUMNS}
          FROM user_sessions
          WHERE company_id = $1 AND session_id = $2
          FOR UPDATE
        `,
        [companyId, sessionId],
      );
      const row = firstRow(result);
      if (!row) {
        throw new AuthFailure('SESSION_NOT_FOUND', 'session is invalid');
      }
      const session = parseSession(row, companyId);
      if (session.revokedAt) return;
      await transaction.query(
        `
          UPDATE user_sessions
          SET revoked_at = $3
          WHERE company_id = $1 AND session_id = $2
        `,
        [companyId, sessionId, revokedAt],
      );
    });
  }

  async renewSession(
    companyId: string,
    tokenHash: string,
    renewedAt: Date,
    expiresAt: Date,
  ): Promise<SessionRecord | undefined> {
    try {
      return await this.withTenant(companyId, async (transaction) => {
        const result = await transaction.query<SessionRow>(
          `
            UPDATE user_sessions
            SET expires_at = $3,
                last_seen_at = GREATEST(last_seen_at, $4)
            WHERE company_id = $1
              AND token_hash = $2
              AND revoked_at IS NULL
              AND expires_at > $4
            RETURNING ${SESSION_COLUMNS}
          `,
          [companyId, tokenHash, expiresAt, renewedAt],
        );
        const row = firstRow(result);
        return row ? parseSession(row, companyId) : undefined;
      });
    } catch (error) {
      this.rethrowStoreError(error, 'session renewal failed');
    }
  }

  async touchSession(
    companyId: string,
    sessionId: string,
    seenAt: Date,
  ): Promise<void> {
    try {
      await this.withTenant(companyId, async (transaction) => {
        await transaction.query(
          `
            UPDATE user_sessions
            SET last_seen_at = GREATEST(last_seen_at, $3)
            WHERE company_id = $1
              AND session_id = $2
              AND revoked_at IS NULL
          `,
          [companyId, sessionId, seenAt],
        );
      });
    } catch (error) {
      this.rethrowStoreError(error, 'session activity update failed');
    }
  }

  private async findUser(
    companyId: string,
    column: 'identity_subject' | 'email',
    value: string,
  ): Promise<UserRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<UserRow>(
        `SELECT ${USER_COLUMNS} FROM users WHERE company_id = $1 AND ${column} = $2 LIMIT 1`,
        [companyId, value],
      );
      const row = firstRow(result);
      return row ? parseUser(row, companyId) : undefined;
    });
  }

  private async findSession(
    companyId: string,
    column: 'token_hash',
    value: string,
  ): Promise<SessionRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE company_id = $1 AND ${column} = $2 LIMIT 1`,
        [companyId, value],
      );
      const row = firstRow(result);
      return row ? parseSession(row, companyId) : undefined;
    });
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new AuthFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }

    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return work(transaction);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw error;
      this.rethrowStoreError(error, 'identity persistence is unavailable');
    }
  }

  private rethrowStoreError(error: unknown, conflictMessage: string): never {
    if (error instanceof AuthFailure) throw error;
    if (isUniqueViolation(error)) {
      throw new AuthFailure('CONFLICT', conflictMessage);
    }
    throw storedFailure();
  }
}
