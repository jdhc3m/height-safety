import { randomBytes } from 'node:crypto';

import type { AuthPrincipal, ProductRole } from '../identity/auth.types';
import type {
  AnchorRecord,
  FieldRegisterReader,
  SiteRecord,
} from '../site-register/site-register.types';

export const JOB_WORKFLOW_STATUSES = [
  'draft',
  'released',
  'assigned',
  'in_progress',
  'submitted',
  'under_review',
  'changes_requested',
  'approved_for_report_generation',
  'report_generated',
] as const;
export type JobWorkflowStatus = (typeof JOB_WORKFLOW_STATUSES)[number];

export const ASSIGNMENT_TYPES = ['assigned', 'claimed'] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export type JobWorkflowFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export interface JobAssignmentRecord {
  readonly companyId: string;
  readonly assignmentId: string;
  readonly jobId: string;
  readonly inspectorUserId: string;
  readonly assignedByUserId: string | null;
  readonly assignmentType: AssignmentType;
  readonly isPrimary: true;
  readonly assignedAt: Date;
  readonly claimedAt: Date | null;
}

export class JobWorkflowFailure extends Error {
  constructor(
    readonly code: JobWorkflowFailureCode,
    message: string,
    readonly currentAssignment?: JobAssignmentRecord,
  ) {
    super(message);
    this.name = 'JobWorkflowFailure';
  }
}

export interface JobRecord {
  readonly companyId: string;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SiteRecord['jurisdiction'];
  readonly reference: string;
  readonly plannedDate: string | null;
  readonly workflowStatus: JobWorkflowStatus;
  readonly jobPackVersion: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface JobPackSnapshot {
  readonly companyId: string;
  readonly jobId: string;
  readonly jobPackVersion: number;
  readonly site: SiteRecord;
  readonly anchors: readonly AnchorRecord[];
}

export interface JobAssignmentResult {
  readonly job: JobRecord;
  readonly assignment: JobAssignmentRecord;
  readonly replayed: boolean;
}

export interface JobWorkflowStore {
  createJob(job: JobRecord): void | Promise<void>;
  getJob(
    companyId: string,
    jobId: string,
  ): JobRecord | undefined | Promise<JobRecord | undefined>;
  listJobs(
    companyId: string,
  ): readonly JobRecord[] | Promise<readonly JobRecord[]>;
  getPrimaryAssignment(
    companyId: string,
    jobId: string,
  ): JobAssignmentRecord | undefined | Promise<JobAssignmentRecord | undefined>;
  releaseJob(
    companyId: string,
    jobId: string,
    updatedAt: Date,
    packSnapshot?: JobPackSnapshot,
  ): JobRecord | Promise<JobRecord>;
  getJobPackSnapshot(
    companyId: string,
    jobId: string,
    jobPackVersion: number,
  ): JobPackSnapshot | undefined | Promise<JobPackSnapshot | undefined>;
  createPrimaryAssignment(
    companyId: string,
    jobId: string,
    assignment: JobAssignmentRecord,
    updatedAt: Date,
  ): JobAssignmentResult | Promise<JobAssignmentResult>;
}

export interface JobWorkflowMember {
  readonly companyId: string;
  readonly userId: string;
  readonly role: ProductRole;
  readonly active: boolean;
}

export interface JobWorkflowMemberDirectory {
  getMember(
    companyId: string,
    userId: string,
  ): JobWorkflowMember | undefined | Promise<JobWorkflowMember | undefined>;
}

export interface JobWorkflowSiteDirectory extends FieldRegisterReader {
  getSite(
    principal: AuthPrincipal,
    siteId: string,
  ): SiteRecord | Promise<SiteRecord>;
  listAnchors(
    principal: AuthPrincipal,
    siteId: string,
  ): readonly AnchorRecord[] | Promise<readonly AnchorRecord[]>;
}

export interface JobWorkflowClock {
  now(): Date;
}

export interface JobWorkflowIdGenerator {
  createId(): string;
}

export interface JobWorkflowAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface JobWorkflowAuditSink {
  record(event: JobWorkflowAuditEvent): void | Promise<void>;
}

export class NoopJobWorkflowAuditSink implements JobWorkflowAuditSink {
  record(_event: JobWorkflowAuditEvent): void {
    // The durable audit adapter remains unconfigured until runtime persistence
    // is selected. The service still emits application-owned audit events.
  }
}

export class UnconfiguredJobWorkflowMemberDirectory
  implements JobWorkflowMemberDirectory
{
  getMember(
    _companyId: string,
    _userId: string,
  ): JobWorkflowMember | undefined {
    throw new JobWorkflowFailure(
      'PERSISTENCE_UNAVAILABLE',
      'identity membership adapter is not configured',
    );
  }
}

export const secureJobWorkflowIdGenerator: JobWorkflowIdGenerator = {
  createId: () => randomBytes(16).toString('hex'),
};

export const systemJobWorkflowClock: JobWorkflowClock = {
  now: () => new Date(),
};

export function canManageJobs(role: ProductRole): boolean {
  return role === 'administrator' || role === 'office_reviewer';
}

export function assertCanManageJobs(principal: AuthPrincipal): void {
  if (!canManageJobs(principal.role)) {
    throw new JobWorkflowFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}

export function assertInspector(principal: AuthPrincipal): void {
  if (principal.role !== 'inspector') {
    throw new JobWorkflowFailure(
      'ROLE_FORBIDDEN',
      'Inspector role is required',
    );
  }
}
