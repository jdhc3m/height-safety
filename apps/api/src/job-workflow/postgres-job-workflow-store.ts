import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import { PRODUCT_ROLES, type ProductRole } from '../identity/auth.types';
import {
  ANCHOR_TYPES,
  REGISTER_STATUSES,
  SUPPORTED_JURISDICTIONS,
  type AnchorRecord,
  type AnchorType,
  type RegisterStatus,
  type SiteRecord,
  type SupportedJurisdiction,
} from '../site-register/site-register.types';
import {
  ASSIGNMENT_TYPES,
  JOB_WORKFLOW_STATUSES,
  JobWorkflowFailure,
  type AssignmentType,
  type JobAssignmentRecord,
  type JobAssignmentResult,
  type JobPackSnapshot,
  type JobRecord,
  type JobWorkflowMember,
  type JobWorkflowMemberDirectory,
  type JobWorkflowStore,
  type JobWorkflowStatus,
} from './job-workflow.types';

interface JobRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly job_id: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly reference: unknown;
  readonly planned_date: unknown;
  readonly workflow_status: unknown;
  readonly job_pack_version: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface AssignmentRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly assignment_id: unknown;
  readonly job_id: unknown;
  readonly inspector_user_id: unknown;
  readonly assigned_by_user_id: unknown;
  readonly assignment_type: unknown;
  readonly is_primary: unknown;
  readonly assigned_at: unknown;
  readonly claimed_at: unknown;
}

interface SnapshotRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly job_id: unknown;
  readonly job_pack_version: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly site_document: unknown;
  readonly anchors_document: unknown;
  readonly created_at: unknown;
}

interface MemberRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly user_id: unknown;
  readonly role: unknown;
  readonly active: unknown;
}

const JOB_COLUMNS = `
  company_id,
  job_id,
  site_id,
  jurisdiction,
  reference,
  planned_date,
  workflow_status,
  job_pack_version,
  created_at,
  updated_at
`;

const ASSIGNMENT_COLUMNS = `
  company_id,
  assignment_id,
  job_id,
  inspector_user_id,
  assigned_by_user_id,
  assignment_type,
  is_primary,
  assigned_at,
  claimed_at
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === '23505';
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function storedFailure(field: string): JobWorkflowFailure {
  return new JobWorkflowFailure(
    'PERSISTENCE_UNAVAILABLE',
    `job workflow persistence returned invalid ${field}`,
  );
}

function requiredStoredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(field);
  }
  return value;
}

function nullableStoredString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return requiredStoredString(value, field);
}

function requiredStoredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw storedFailure(field);
  }
  return value;
}

function requiredStoredNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw storedFailure(field);
  }
  return number;
}

function requiredStoredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(field);
  }
  return date;
}

function nullableStoredDate(value: unknown, field: string): Date | null {
  return value === null || value === undefined
    ? null
    : requiredStoredDate(value, field);
}

function nullableStoredPlannedDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw storedFailure('planned_date');
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  throw storedFailure('planned_date');
}

function storedJurisdiction(value: unknown): SupportedJurisdiction {
  if (!SUPPORTED_JURISDICTIONS.includes(value as SupportedJurisdiction)) {
    throw storedFailure('jurisdiction');
  }
  return value as SupportedJurisdiction;
}

function storedJobStatus(value: unknown): JobWorkflowStatus {
  if (!JOB_WORKFLOW_STATUSES.includes(value as JobWorkflowStatus)) {
    throw storedFailure('workflow_status');
  }
  return value as JobWorkflowStatus;
}

function storedAssignmentType(value: unknown): AssignmentType {
  if (!ASSIGNMENT_TYPES.includes(value as AssignmentType)) {
    throw storedFailure('assignment_type');
  }
  return value as AssignmentType;
}

function storedRole(value: unknown): ProductRole {
  if (!PRODUCT_ROLES.includes(value as ProductRole)) {
    throw storedFailure('role');
  }
  return value as ProductRole;
}

function storedAnchorType(value: unknown): AnchorType {
  if (!ANCHOR_TYPES.includes(value as AnchorType)) {
    throw storedFailure('anchor_type');
  }
  return value as AnchorType;
}

function storedRegisterStatus(value: unknown): RegisterStatus {
  if (!REGISTER_STATUSES.includes(value as RegisterStatus)) {
    throw storedFailure('register_status');
  }
  return value as RegisterStatus;
}

function parseJob(row: JobRow, companyId: string): JobRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  const plannedDate = nullableStoredPlannedDate(row.planned_date);
  return {
    companyId: rowCompanyId,
    jobId: requiredStoredString(row.job_id, 'job_id'),
    siteId: requiredStoredString(row.site_id, 'site_id'),
    jurisdiction: storedJurisdiction(row.jurisdiction),
    reference: requiredStoredString(row.reference, 'reference'),
    plannedDate,
    workflowStatus: storedJobStatus(row.workflow_status),
    jobPackVersion: requiredStoredNumber(
      row.job_pack_version,
      'job_pack_version',
    ),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
    updatedAt: requiredStoredDate(row.updated_at, 'updated_at'),
  };
}

function parseAssignment(
  row: AssignmentRow,
  companyId: string,
): JobAssignmentRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  if (!requiredStoredBoolean(row.is_primary, 'is_primary')) {
    throw storedFailure('is_primary');
  }
  return {
    companyId: rowCompanyId,
    assignmentId: requiredStoredString(row.assignment_id, 'assignment_id'),
    jobId: requiredStoredString(row.job_id, 'job_id'),
    inspectorUserId: requiredStoredString(
      row.inspector_user_id,
      'inspector_user_id',
    ),
    assignedByUserId: nullableStoredString(
      row.assigned_by_user_id,
      'assigned_by_user_id',
    ),
    assignmentType: storedAssignmentType(row.assignment_type),
    isPrimary: true,
    assignedAt: requiredStoredDate(row.assigned_at, 'assigned_at'),
    claimedAt: nullableStoredDate(row.claimed_at, 'claimed_at'),
  };
}

function parseJsonDocument(value: unknown, field: string): unknown {
  if (typeof value !== 'string') {
    throw storedFailure(field);
  }
  try {
    return JSON.parse(value);
  } catch {
    throw storedFailure(field);
  }
}

function parseSiteDocument(value: unknown, companyId: string): SiteRecord {
  if (!isRecord(value)) {
    throw storedFailure('site_document');
  }
  const rowCompanyId = requiredStoredString(value.companyId, 'site.companyId');
  if (rowCompanyId !== companyId) {
    throw storedFailure('site.companyId');
  }
  return {
    companyId: rowCompanyId,
    siteId: requiredStoredString(value.siteId, 'site.siteId'),
    clientId: requiredStoredString(value.clientId, 'site.clientId'),
    name: requiredStoredString(value.name, 'site.name'),
    address: nullableStoredString(value.address, 'site.address'),
    jurisdiction: storedJurisdiction(value.jurisdiction),
    accessNotes: nullableStoredString(value.accessNotes, 'site.accessNotes'),
    siteReference: nullableStoredString(
      value.siteReference,
      'site.siteReference',
    ),
    createdAt: requiredStoredDate(value.createdAt, 'site.createdAt'),
    updatedAt: requiredStoredDate(value.updatedAt, 'site.updatedAt'),
  };
}

function parseAnchorDocument(value: unknown, companyId: string): AnchorRecord {
  if (!isRecord(value)) {
    throw storedFailure('anchors_document');
  }
  const rowCompanyId = requiredStoredString(
    value.companyId,
    'anchor.companyId',
  );
  if (rowCompanyId !== companyId) {
    throw storedFailure('anchor.companyId');
  }
  return {
    companyId: rowCompanyId,
    anchorId: requiredStoredString(value.anchorId, 'anchor.anchorId'),
    siteId: requiredStoredString(value.siteId, 'anchor.siteId'),
    label: nullableStoredString(value.label, 'anchor.label'),
    registerId: nullableStoredString(value.registerId, 'anchor.registerId'),
    location: nullableStoredString(value.location, 'anchor.location'),
    anchorType: storedAnchorType(value.anchorType),
    manufacturer: nullableStoredString(
      value.manufacturer,
      'anchor.manufacturer',
    ),
    model: nullableStoredString(value.model, 'anchor.model'),
    installContext: nullableStoredString(
      value.installContext,
      'anchor.installContext',
    ),
    registerStatus: storedRegisterStatus(value.registerStatus),
    notes: nullableStoredString(value.notes, 'anchor.notes'),
    createdAt: requiredStoredDate(value.createdAt, 'anchor.createdAt'),
    updatedAt: requiredStoredDate(value.updatedAt, 'anchor.updatedAt'),
  };
}

function parseSnapshot(row: SnapshotRow, companyId: string): JobPackSnapshot {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  const site = parseSiteDocument(
    parseJsonDocument(row.site_document, 'site_document'),
    companyId,
  );
  const anchorsDocument = parseJsonDocument(
    row.anchors_document,
    'anchors_document',
  );
  if (!Array.isArray(anchorsDocument)) {
    throw storedFailure('anchors_document');
  }
  return {
    companyId: rowCompanyId,
    jobId: requiredStoredString(row.job_id, 'job_id'),
    jobPackVersion: requiredStoredNumber(
      row.job_pack_version,
      'job_pack_version',
    ),
    site,
    anchors: anchorsDocument.map((anchor) =>
      parseAnchorDocument(anchor, companyId),
    ),
  };
}

function parseMember(row: MemberRow, companyId: string): JobWorkflowMember {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  return {
    companyId: rowCompanyId,
    userId: requiredStoredString(row.user_id, 'user_id'),
    role: storedRole(row.role),
    active: requiredStoredBoolean(row.active, 'active'),
  };
}

async function inTenantTransaction<T>(
  database: SqlDatabase,
  companyId: string,
  work: (transaction: SqlTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    const context = setTenantContextStatement(createTenantContext(companyId));
    await transaction.query(context.text, context.values);
    return work(transaction);
  });
}

export class PostgresJobWorkflowStore implements JobWorkflowStore {
  constructor(private readonly database: SqlDatabase) {}

  async createJob(job: JobRecord): Promise<void> {
    await this.execute(
      job.companyId,
      async (transaction) => {
        await transaction.query(
          `
          INSERT INTO jobs (
            company_id, job_id, site_id, jurisdiction, reference,
            planned_date, workflow_status, job_pack_version,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            job.companyId,
            job.jobId,
            job.siteId,
            job.jurisdiction,
            job.reference,
            job.plannedDate,
            job.workflowStatus,
            job.jobPackVersion,
            job.createdAt,
            job.updatedAt,
          ],
        );
      },
      'job create',
    );
  }

  async getJob(
    companyId: string,
    jobId: string,
  ): Promise<JobRecord | undefined> {
    return this.execute(
      companyId,
      async (transaction) => this.selectJob(transaction, companyId, jobId),
      'job read',
    );
  }

  async listJobs(companyId: string): Promise<readonly JobRecord[]> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<JobRow>(
          `SELECT ${JOB_COLUMNS} FROM jobs WHERE company_id = $1 ORDER BY created_at, job_id`,
          [companyId],
        );
        return result.rows.map((row) => parseJob(row, companyId));
      },
      'job list',
    );
  }

  async getPrimaryAssignment(
    companyId: string,
    jobId: string,
  ): Promise<JobAssignmentRecord | undefined> {
    return this.execute(
      companyId,
      async (transaction) =>
        this.selectPrimaryAssignment(transaction, companyId, jobId),
      'assignment read',
    );
  }

  async releaseJob(
    companyId: string,
    jobId: string,
    updatedAt: Date,
    packSnapshot?: JobPackSnapshot,
  ): Promise<JobRecord> {
    return this.execute(
      companyId,
      async (transaction) => {
        const existing = await this.selectJob(
          transaction,
          companyId,
          jobId,
          true,
        );
        if (!existing) {
          throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
        }
        if (existing.workflowStatus === 'released') {
          return existing;
        }
        if (existing.workflowStatus !== 'draft') {
          throw new JobWorkflowFailure(
            'CONFLICT',
            'only draft jobs can be released',
            await this.selectPrimaryAssignment(transaction, companyId, jobId),
          );
        }
        if (!packSnapshot) {
          throw new JobWorkflowFailure(
            'CONFLICT',
            'released jobs require a versioned job pack snapshot',
          );
        }
        this.assertSnapshotMatchesJob(packSnapshot, existing);

        const result = await transaction.query<JobRow>(
          `
            UPDATE jobs
            SET workflow_status = 'released', updated_at = $3
            WHERE company_id = $1 AND job_id = $2
            RETURNING ${JOB_COLUMNS}
          `,
          [companyId, jobId, updatedAt],
        );
        const released = firstRow(result);
        if (!released) {
          throw new JobWorkflowFailure(
            'PERSISTENCE_UNAVAILABLE',
            'released job was not returned by persistence',
          );
        }
        await transaction.query(
          `
            INSERT INTO job_pack_snapshots (
              company_id, job_id, job_pack_version, site_id, jurisdiction,
              site_document, anchors_document, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            companyId,
            jobId,
            packSnapshot.jobPackVersion,
            packSnapshot.site.siteId,
            packSnapshot.site.jurisdiction,
            JSON.stringify(packSnapshot.site),
            JSON.stringify(packSnapshot.anchors),
            updatedAt,
          ],
        );
        return parseJob(released, companyId);
      },
      'job release',
    );
  }

  async getJobPackSnapshot(
    companyId: string,
    jobId: string,
    jobPackVersion: number,
  ): Promise<JobPackSnapshot | undefined> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<SnapshotRow>(
          `
            SELECT company_id, job_id, job_pack_version, site_id,
                   jurisdiction, site_document, anchors_document, created_at
            FROM job_pack_snapshots
            WHERE company_id = $1 AND job_id = $2 AND job_pack_version = $3
          `,
          [companyId, jobId, jobPackVersion],
        );
        const row = firstRow(result);
        return row ? parseSnapshot(row, companyId) : undefined;
      },
      'job pack snapshot read',
    );
  }

  async createPrimaryAssignment(
    companyId: string,
    jobId: string,
    assignment: JobAssignmentRecord,
    updatedAt: Date,
  ): Promise<JobAssignmentResult> {
    return this.execute(
      companyId,
      async (transaction) => {
        const existingJob = await this.selectJob(
          transaction,
          companyId,
          jobId,
          true,
        );
        if (!existingJob) {
          throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
        }
        const existingAssignment = await this.selectPrimaryAssignment(
          transaction,
          companyId,
          jobId,
        );
        if (existingAssignment) {
          if (
            assignment.assignmentType === 'claimed' &&
            existingAssignment.assignmentType === 'claimed' &&
            existingAssignment.inspectorUserId === assignment.inspectorUserId
          ) {
            return {
              job: existingJob,
              assignment: existingAssignment,
              replayed: true,
            };
          }
          throw new JobWorkflowFailure(
            'CONFLICT',
            'job already has a primary inspector',
            existingAssignment,
          );
        }
        if (existingJob.workflowStatus !== 'released') {
          throw new JobWorkflowFailure(
            'CONFLICT',
            'only released jobs can be assigned',
          );
        }

        const updatedJobResult = await transaction.query<JobRow>(
          `
            UPDATE jobs
            SET workflow_status = 'assigned', updated_at = $3
            WHERE company_id = $1 AND job_id = $2
            RETURNING ${JOB_COLUMNS}
          `,
          [companyId, jobId, updatedAt],
        );
        const updatedJob = firstRow(updatedJobResult);
        if (!updatedJob) {
          throw new JobWorkflowFailure(
            'PERSISTENCE_UNAVAILABLE',
            'assigned job was not returned by persistence',
          );
        }

        const assignmentResult = await transaction.query<AssignmentRow>(
          `
            INSERT INTO job_assignments (
              company_id, assignment_id, job_id, inspector_user_id,
              assigned_by_user_id, assignment_type, is_primary,
              assigned_at, claimed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING ${ASSIGNMENT_COLUMNS}
          `,
          [
            companyId,
            assignment.assignmentId,
            jobId,
            assignment.inspectorUserId,
            assignment.assignedByUserId,
            assignment.assignmentType,
            assignment.isPrimary,
            assignment.assignedAt,
            assignment.claimedAt,
          ],
        );
        const insertedAssignment = firstRow(assignmentResult);
        if (!insertedAssignment) {
          throw new JobWorkflowFailure(
            'PERSISTENCE_UNAVAILABLE',
            'assignment was not returned by persistence',
          );
        }
        return {
          job: parseJob(updatedJob, companyId),
          assignment: parseAssignment(insertedAssignment, companyId),
          replayed: false,
        };
      },
      'assignment create',
    );
  }

  private async selectJob(
    transaction: SqlTransaction,
    companyId: string,
    jobId: string,
    forUpdate = false,
  ): Promise<JobRecord | undefined> {
    const result = await transaction.query<JobRow>(
      `
        SELECT ${JOB_COLUMNS}
        FROM jobs
        WHERE company_id = $1 AND job_id = $2
        ${forUpdate ? 'FOR UPDATE' : ''}
      `,
      [companyId, jobId],
    );
    const row = firstRow(result);
    return row ? parseJob(row, companyId) : undefined;
  }

  private async selectPrimaryAssignment(
    transaction: SqlTransaction,
    companyId: string,
    jobId: string,
  ): Promise<JobAssignmentRecord | undefined> {
    const result = await transaction.query<AssignmentRow>(
      `
        SELECT ${ASSIGNMENT_COLUMNS}
        FROM job_assignments
        WHERE company_id = $1 AND job_id = $2 AND is_primary = TRUE
      `,
      [companyId, jobId],
    );
    const row = firstRow(result);
    return row ? parseAssignment(row, companyId) : undefined;
  }

  private assertSnapshotMatchesJob(
    snapshot: JobPackSnapshot,
    job: JobRecord,
  ): void {
    if (
      snapshot.companyId !== job.companyId ||
      snapshot.jobId !== job.jobId ||
      snapshot.jobPackVersion !== job.jobPackVersion ||
      snapshot.site.companyId !== job.companyId ||
      snapshot.site.siteId !== job.siteId ||
      snapshot.site.jurisdiction !== job.jurisdiction ||
      snapshot.anchors.some(
        (anchor) =>
          anchor.companyId !== job.companyId || anchor.siteId !== job.siteId,
      )
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack snapshot does not match the job',
      );
    }
  }

  private async execute<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
    operation: string,
  ): Promise<T> {
    try {
      return await inTenantTransaction(this.database, companyId, work);
    } catch (error) {
      if (error instanceof JobWorkflowFailure) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new JobWorkflowFailure(
          'CONFLICT',
          `${operation} conflicts with an existing record`,
        );
      }
      throw new JobWorkflowFailure(
        'PERSISTENCE_UNAVAILABLE',
        `job workflow ${operation} persistence is unavailable`,
      );
    }
  }
}

export class PostgresJobWorkflowMemberDirectory
  implements JobWorkflowMemberDirectory
{
  constructor(private readonly database: SqlDatabase) {}

  async getMember(
    companyId: string,
    userId: string,
  ): Promise<JobWorkflowMember | undefined> {
    try {
      return await inTenantTransaction(
        this.database,
        companyId,
        async (transaction) => {
          const result = await transaction.query<MemberRow>(
            `
              SELECT company_id, user_id, role, active
              FROM users
              WHERE company_id = $1 AND user_id = $2
            `,
            [companyId, userId],
          );
          const row = firstRow(result);
          return row ? parseMember(row, companyId) : undefined;
        },
      );
    } catch (error) {
      if (error instanceof JobWorkflowFailure) {
        throw error;
      }
      throw new JobWorkflowFailure(
        'PERSISTENCE_UNAVAILABLE',
        'identity membership persistence is unavailable',
      );
    }
  }
}
