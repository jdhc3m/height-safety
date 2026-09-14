import type { AuthPrincipal } from '../identity/auth.types';
import {
  SiteRegisterFailure,
  type AnchorRecord,
  type SiteRecord,
} from '../site-register/site-register.types';
import {
  assertCanManageJobs,
  assertInspector,
  JobWorkflowFailure,
  type JobAssignmentRecord,
  type JobRecord,
  type JobPackSnapshot,
  type JobWorkflowAuditSink,
  type JobWorkflowClock,
  type JobWorkflowIdGenerator,
  type JobWorkflowMemberDirectory,
  type JobWorkflowSiteDirectory,
  type JobWorkflowStore,
} from './job-workflow.types';

const REFERENCE_MAX_LENGTH = 128;
const ID_MAX_LENGTH = 128;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CreateJobInput {
  readonly siteId: string;
  readonly reference: string;
  readonly plannedDate?: string | null;
}

export interface AssignJobInput {
  readonly inspectorUserId: string;
}

export interface JobWorkflowServiceOptions {
  readonly store: JobWorkflowStore;
  readonly memberDirectory: JobWorkflowMemberDirectory;
  readonly siteDirectory: JobWorkflowSiteDirectory;
  readonly auditSink: JobWorkflowAuditSink;
  readonly clock: JobWorkflowClock;
  readonly idGenerator: JobWorkflowIdGenerator;
}

export interface JobBundle {
  readonly job: JobRecord;
  readonly assignment: JobAssignmentRecord | null;
}

export interface JobPackBundle extends JobBundle {
  readonly site: SiteRecord;
  readonly anchors: readonly AnchorRecord[];
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function copyJob(job: JobRecord): JobRecord {
  return {
    ...job,
    createdAt: copyDate(job.createdAt),
    updatedAt: copyDate(job.updatedAt),
  };
}

function copyAssignment(
  assignment: JobAssignmentRecord | null | undefined,
): JobAssignmentRecord | null {
  if (!assignment) {
    return null;
  }
  return {
    ...assignment,
    assignedAt: copyDate(assignment.assignedAt),
    claimedAt: assignment.claimedAt ? copyDate(assignment.claimedAt) : null,
  };
}

function copySite(site: SiteRecord): SiteRecord {
  return {
    ...site,
    createdAt: copyDate(site.createdAt),
    updatedAt: copyDate(site.updatedAt),
  };
}

function copyAnchor(anchor: AnchorRecord): AnchorRecord {
  return {
    ...anchor,
    createdAt: copyDate(anchor.createdAt),
    updatedAt: copyDate(anchor.updatedAt),
  };
}

function copyPackSnapshot(snapshot: JobPackSnapshot): JobPackSnapshot {
  return {
    ...snapshot,
    site: copySite(snapshot.site),
    anchors: snapshot.anchors.map(copyAnchor),
  };
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new JobWorkflowFailure('INVALID_INPUT', `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new JobWorkflowFailure('INVALID_INPUT', `${field} is required`);
  }
  if (normalized.length > maxLength) {
    throw new JobWorkflowFailure(
      'INVALID_INPUT',
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized;
}

function optionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new JobWorkflowFailure('INVALID_INPUT', `${field} must be a date`);
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new JobWorkflowFailure(
      'INVALID_INPUT',
      `${field} must use YYYY-MM-DD format`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new JobWorkflowFailure(
      'INVALID_INPUT',
      `${field} is not a valid date`,
    );
  }
  return value;
}

function requiredId(value: unknown, field: string): string {
  return requiredText(value, field, ID_MAX_LENGTH);
}

function assertObjectInput(
  input: unknown,
  resource: string,
): asserts input is Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new JobWorkflowFailure(
      'INVALID_INPUT',
      `${resource} request body is required`,
    );
  }
}

function copyBundle(bundle: JobBundle): JobBundle {
  return {
    job: copyJob(bundle.job),
    assignment: copyAssignment(bundle.assignment),
  };
}

export class JobWorkflowService {
  constructor(private readonly options: JobWorkflowServiceOptions) {}

  async createJob(
    principal: AuthPrincipal,
    input: CreateJobInput,
  ): Promise<JobRecord> {
    assertCanManageJobs(principal);
    assertObjectInput(input, 'job');
    const siteId = requiredId(input.siteId, 'siteId');
    const site = await this.requireSite(principal, siteId);
    const now = this.now();
    const job: JobRecord = {
      companyId: principal.companyId,
      jobId: this.options.idGenerator.createId(),
      siteId: site.siteId,
      jurisdiction: site.jurisdiction,
      reference: requiredText(
        input.reference,
        'reference',
        REFERENCE_MAX_LENGTH,
      ),
      plannedDate: optionalDate(input.plannedDate, 'plannedDate'),
      workflowStatus: 'draft',
      jobPackVersion: 1,
      createdAt: copyDate(now),
      updatedAt: copyDate(now),
    };

    await this.options.store.createJob(job);
    await this.recordAudit(principal, 'job.created', job.jobId, {
      jurisdiction: job.jurisdiction,
      jobPackVersion: job.jobPackVersion,
    });
    return copyJob(job);
  }

  async listJobs(principal: AuthPrincipal): Promise<readonly JobBundle[]> {
    const jobs = await this.options.store.listJobs(principal.companyId);
    if (principal.role !== 'inspector') {
      assertCanManageJobs(principal);
      return Promise.all(jobs.map((job) => this.bundle(job)));
    }

    const visible: JobBundle[] = [];
    for (const job of jobs) {
      const assignment = await this.options.store.getPrimaryAssignment(
        principal.companyId,
        job.jobId,
      );
      if (
        job.workflowStatus === 'released' ||
        assignment?.inspectorUserId === principal.userId
      ) {
        visible.push(await this.bundle(job));
      }
    }
    return visible;
  }

  async getJob(principal: AuthPrincipal, jobId: string): Promise<JobBundle> {
    const normalizedJobId = requiredId(jobId, 'jobId');
    const job = await this.options.store.getJob(
      principal.companyId,
      normalizedJobId,
    );
    if (!job) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    if (principal.role !== 'inspector') {
      assertCanManageJobs(principal);
      return this.bundle(job);
    }

    const assignment = await this.options.store.getPrimaryAssignment(
      principal.companyId,
      normalizedJobId,
    );
    if (
      job.workflowStatus !== 'released' &&
      assignment?.inspectorUserId !== principal.userId
    ) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    return { job: copyJob(job), assignment: copyAssignment(assignment) };
  }

  async getJobPack(
    principal: AuthPrincipal,
    jobId: string,
  ): Promise<JobPackBundle> {
    assertInspector(principal);
    const bundle = await this.getJob(principal, jobId);
    if (bundle.assignment?.inspectorUserId !== principal.userId) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    const snapshot = await this.options.store.getJobPackSnapshot(
      principal.companyId,
      bundle.job.jobId,
      bundle.job.jobPackVersion,
    );
    if (!snapshot) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'versioned job pack snapshot is unavailable',
      );
    }
    if (
      snapshot.companyId !== principal.companyId ||
      snapshot.jobId !== bundle.job.jobId ||
      snapshot.jobPackVersion !== bundle.job.jobPackVersion ||
      snapshot.site.companyId !== principal.companyId ||
      snapshot.site.siteId !== bundle.job.siteId ||
      snapshot.site.jurisdiction !== bundle.job.jurisdiction
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack snapshot does not match the released job',
      );
    }
    if (
      snapshot.anchors.some(
        (anchor) =>
          anchor.companyId !== principal.companyId ||
          anchor.siteId !== bundle.job.siteId,
      )
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack contains an anchor from another site',
      );
    }

    return {
      ...bundle,
      site: copySite(snapshot.site),
      anchors: snapshot.anchors.map(copyAnchor),
    };
  }

  async releaseJob(
    principal: AuthPrincipal,
    jobId: string,
  ): Promise<JobBundle> {
    assertCanManageJobs(principal);
    const normalizedJobId = requiredId(jobId, 'jobId');
    const existing = await this.options.store.getJob(
      principal.companyId,
      normalizedJobId,
    );
    const updatedAt = this.now();
    const job =
      existing?.workflowStatus === 'draft'
        ? await this.options.store.releaseJob(
            principal.companyId,
            normalizedJobId,
            updatedAt,
            await this.captureJobPackSnapshot(principal, existing),
          )
        : await this.options.store.releaseJob(
            principal.companyId,
            normalizedJobId,
            updatedAt,
          );
    await this.recordAudit(principal, 'job.released', job.jobId, {
      jurisdiction: job.jurisdiction,
      jobPackVersion: job.jobPackVersion,
    });
    return this.bundle(job);
  }

  async claimJob(principal: AuthPrincipal, jobId: string): Promise<JobBundle> {
    assertInspector(principal);
    await this.requireEligibleInspector(principal.companyId, principal.userId);
    const normalizedJobId = requiredId(jobId, 'jobId');
    const now = this.now();
    const assignment: JobAssignmentRecord = {
      companyId: principal.companyId,
      assignmentId: this.options.idGenerator.createId(),
      jobId: normalizedJobId,
      inspectorUserId: principal.userId,
      assignedByUserId: null,
      assignmentType: 'claimed',
      isPrimary: true,
      assignedAt: copyDate(now),
      claimedAt: copyDate(now),
    };
    const result = await this.options.store.createPrimaryAssignment(
      principal.companyId,
      normalizedJobId,
      assignment,
      now,
    );
    if (!result.replayed) {
      await this.recordAudit(principal, 'job.claimed', result.job.jobId, {
        assignmentId: result.assignment.assignmentId,
        assignmentType: result.assignment.assignmentType,
        inspectorUserId: result.assignment.inspectorUserId,
        jobPackVersion: result.job.jobPackVersion,
      });
    }
    return {
      job: copyJob(result.job),
      assignment: copyAssignment(result.assignment),
    };
  }

  async assignJob(
    principal: AuthPrincipal,
    jobId: string,
    input: AssignJobInput,
  ): Promise<JobBundle> {
    assertCanManageJobs(principal);
    assertObjectInput(input, 'assignment');
    const normalizedJobId = requiredId(jobId, 'jobId');
    const inspectorUserId = requiredId(
      input.inspectorUserId,
      'inspectorUserId',
    );
    await this.requireEligibleInspector(principal.companyId, inspectorUserId);
    const now = this.now();
    const assignment: JobAssignmentRecord = {
      companyId: principal.companyId,
      assignmentId: this.options.idGenerator.createId(),
      jobId: normalizedJobId,
      inspectorUserId,
      assignedByUserId: principal.userId,
      assignmentType: 'assigned',
      isPrimary: true,
      assignedAt: copyDate(now),
      claimedAt: null,
    };
    const result = await this.options.store.createPrimaryAssignment(
      principal.companyId,
      normalizedJobId,
      assignment,
      now,
    );
    if (!result.replayed) {
      await this.recordAudit(principal, 'job.assigned', result.job.jobId, {
        assignmentId: result.assignment.assignmentId,
        assignmentType: result.assignment.assignmentType,
        inspectorUserId: result.assignment.inspectorUserId,
        jobPackVersion: result.job.jobPackVersion,
      });
    }
    return {
      job: copyJob(result.job),
      assignment: copyAssignment(result.assignment),
    };
  }

  private async bundle(job: JobRecord): Promise<JobBundle> {
    return copyBundle({
      job,
      assignment:
        (await this.options.store.getPrimaryAssignment(
          job.companyId,
          job.jobId,
        )) ?? null,
    });
  }

  private async captureJobPackSnapshot(
    principal: AuthPrincipal,
    job: JobRecord,
  ): Promise<JobPackSnapshot> {
    let site: SiteRecord;
    let anchors: readonly AnchorRecord[];
    try {
      site = await this.options.siteDirectory.getSite(principal, job.siteId);
      anchors = await this.options.siteDirectory.listAnchors(
        principal,
        job.siteId,
      );
    } catch (error) {
      if (error instanceof SiteRegisterFailure) {
        throw new JobWorkflowFailure(error.code, error.message);
      }
      throw error;
    }

    if (
      site.companyId !== principal.companyId ||
      site.siteId !== job.siteId ||
      site.jurisdiction !== job.jurisdiction
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack site context does not match the job',
      );
    }
    if (
      anchors.some(
        (anchor) =>
          anchor.companyId !== principal.companyId ||
          anchor.siteId !== job.siteId,
      )
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack contains an anchor from another site',
      );
    }

    return copyPackSnapshot({
      companyId: principal.companyId,
      jobId: job.jobId,
      jobPackVersion: job.jobPackVersion,
      site,
      anchors,
    });
  }

  private async requireSite(
    principal: AuthPrincipal,
    siteId: string,
  ): Promise<SiteRecord> {
    try {
      return await this.options.siteDirectory.getSite(principal, siteId);
    } catch (error) {
      if (error instanceof SiteRegisterFailure) {
        throw new JobWorkflowFailure(error.code, error.message);
      }
      throw error;
    }
  }

  private async requireEligibleInspector(
    companyId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.options.memberDirectory.getMember(
      companyId,
      userId,
    );
    if (
      !member ||
      member.companyId !== companyId ||
      member.userId !== userId ||
      member.role !== 'inspector' ||
      !member.active
    ) {
      throw new JobWorkflowFailure(
        'NOT_FOUND',
        'eligible inspector was not found',
      );
    }
  }

  private now(): Date {
    const now = this.options.clock.now();
    if (Number.isNaN(now.getTime())) {
      throw new Error('job workflow clock returned invalid date');
    }
    return copyDate(now);
  }

  private async recordAudit(
    principal: AuthPrincipal,
    action: string,
    jobId: string,
    metadata: Readonly<Record<string, string | number | boolean>>,
  ): Promise<void> {
    await this.options.auditSink.record({
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action,
      targetType: 'job',
      targetId: jobId,
      occurredAt: this.now(),
      metadata,
    });
  }
}
