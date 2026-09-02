import type { AuthPrincipal } from '../identity/auth.types';
import { SiteRegisterFailure } from '../site-register/site-register.types';
import {
  assertCanManageJobs,
  assertInspector,
  JobWorkflowFailure,
  type JobAssignmentRecord,
  type JobRecord,
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

  createJob(principal: AuthPrincipal, input: CreateJobInput): JobRecord {
    assertCanManageJobs(principal);
    assertObjectInput(input, 'job');
    const siteId = requiredId(input.siteId, 'siteId');
    const site = this.requireSite(principal, siteId);
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

    this.options.store.createJob(job);
    this.recordAudit(principal, 'job.created', job.jobId, {
      jurisdiction: job.jurisdiction,
      jobPackVersion: job.jobPackVersion,
    });
    return copyJob(job);
  }

  listJobs(principal: AuthPrincipal): readonly JobBundle[] {
    const jobs = this.options.store.listJobs(principal.companyId);
    if (principal.role !== 'inspector') {
      assertCanManageJobs(principal);
      return jobs.map((job) => this.bundle(job));
    }

    return jobs
      .filter((job) => {
        const assignment = this.options.store.getPrimaryAssignment(
          principal.companyId,
          job.jobId,
        );
        return (
          job.workflowStatus === 'released' ||
          assignment?.inspectorUserId === principal.userId
        );
      })
      .map((job) => this.bundle(job));
  }

  getJob(principal: AuthPrincipal, jobId: string): JobBundle {
    const normalizedJobId = requiredId(jobId, 'jobId');
    const job = this.options.store.getJob(principal.companyId, normalizedJobId);
    if (!job) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    if (principal.role !== 'inspector') {
      assertCanManageJobs(principal);
      return this.bundle(job);
    }

    const assignment = this.options.store.getPrimaryAssignment(
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

  releaseJob(principal: AuthPrincipal, jobId: string): JobBundle {
    assertCanManageJobs(principal);
    const normalizedJobId = requiredId(jobId, 'jobId');
    const job = this.options.store.releaseJob(
      principal.companyId,
      normalizedJobId,
      this.now(),
    );
    this.recordAudit(principal, 'job.released', job.jobId, {
      jurisdiction: job.jurisdiction,
      jobPackVersion: job.jobPackVersion,
    });
    return this.bundle(job);
  }

  claimJob(principal: AuthPrincipal, jobId: string): JobBundle {
    assertInspector(principal);
    this.requireEligibleInspector(principal.companyId, principal.userId);
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
    const result = this.options.store.createPrimaryAssignment(
      principal.companyId,
      normalizedJobId,
      assignment,
      now,
    );
    if (!result.replayed) {
      this.recordAudit(principal, 'job.claimed', result.job.jobId, {
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

  assignJob(
    principal: AuthPrincipal,
    jobId: string,
    input: AssignJobInput,
  ): JobBundle {
    assertCanManageJobs(principal);
    assertObjectInput(input, 'assignment');
    const normalizedJobId = requiredId(jobId, 'jobId');
    const inspectorUserId = requiredId(
      input.inspectorUserId,
      'inspectorUserId',
    );
    this.requireEligibleInspector(principal.companyId, inspectorUserId);
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
    const result = this.options.store.createPrimaryAssignment(
      principal.companyId,
      normalizedJobId,
      assignment,
      now,
    );
    if (!result.replayed) {
      this.recordAudit(principal, 'job.assigned', result.job.jobId, {
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

  private bundle(job: JobRecord): JobBundle {
    return copyBundle({
      job,
      assignment:
        this.options.store.getPrimaryAssignment(job.companyId, job.jobId) ??
        null,
    });
  }

  private requireSite(principal: AuthPrincipal, siteId: string) {
    try {
      return this.options.siteDirectory.getSite(principal, siteId);
    } catch (error) {
      if (error instanceof SiteRegisterFailure) {
        throw new JobWorkflowFailure(error.code, error.message);
      }
      throw error;
    }
  }

  private requireEligibleInspector(companyId: string, userId: string): void {
    const member = this.options.memberDirectory.getMember(companyId, userId);
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

  private recordAudit(
    principal: AuthPrincipal,
    action: string,
    jobId: string,
    metadata: Readonly<Record<string, string | number | boolean>>,
  ): void {
    this.options.auditSink.record({
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
