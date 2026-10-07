import {
  ApprovedSnapshotFailure,
  type ApprovedSnapshot,
  type ApprovedSnapshotAuditEvent,
  type ApprovedSnapshotDocument,
  type ApprovedSnapshotReportContext,
  type ApprovedSnapshotStateReader,
  type ApprovedSnapshotStore,
  type ApprovedSnapshotSubmissionState,
  type JobTransitionApprovalStore,
} from './approved-snapshot.types';
import type {
  SyncAnchorInspectionPayload,
  SyncInspectionPhotoPayload,
  SyncInspectionSubmissionPayload,
} from '../sync/sync.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
}

function copyPhoto(
  photo: SyncInspectionPhotoPayload,
): SyncInspectionPhotoPayload {
  return { ...photo };
}

function copyAnchorInspection(
  inspection: SyncAnchorInspectionPayload,
): SyncAnchorInspectionPayload {
  return {
    ...inspection,
    photos: inspection.photos.map(copyPhoto),
  };
}

export function copySubmissionPayload(
  payload: SyncInspectionSubmissionPayload,
): SyncInspectionSubmissionPayload {
  return {
    ...payload,
    anchorInspections: payload.anchorInspections.map(copyAnchorInspection),
  };
}

export function copyApprovedSnapshotReportContext(
  context: ApprovedSnapshotReportContext,
): ApprovedSnapshotReportContext {
  return {
    ...context,
    site: { ...context.site },
    expectedAnchors: context.expectedAnchors.map((anchor) => ({ ...anchor })),
    reviewIssues: context.reviewIssues.map((issue) => ({
      ...issue,
      actions: issue.actions.map((action) => ({ ...action })),
    })),
  };
}

function copyDocument(
  document: ApprovedSnapshotDocument,
): ApprovedSnapshotDocument {
  return {
    ...document,
    inspectionSubmission: copySubmissionPayload(document.inspectionSubmission),
    ...(document.reportContext
      ? {
          reportContext: copyApprovedSnapshotReportContext(
            document.reportContext,
          ),
        }
      : {}),
  };
}

export function copyApprovedSnapshot(
  snapshot: ApprovedSnapshot,
): ApprovedSnapshot {
  return {
    ...snapshot,
    approvedAt: new Date(snapshot.approvedAt.getTime()),
    document: copyDocument(snapshot.document),
  };
}

export interface RecordedJobTransition {
  readonly companyId: string;
  readonly jobId: string;
  readonly workflowStatus: string;
  readonly at: Date;
}

export class InMemoryApprovedSnapshotStore
  implements ApprovedSnapshotStore, JobTransitionApprovalStore
{
  private readonly snapshots = new Map<string, ApprovedSnapshot>();
  private readonly approvals = new Map<string, ApprovedSnapshot>();
  private readonly events: ApprovedSnapshotAuditEvent[] = [];
  private readonly transitions: RecordedJobTransition[] = [];

  get auditEvents(): readonly ApprovedSnapshotAuditEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  get jobTransitions(): readonly RecordedJobTransition[] {
    return this.transitions.map((transition) => ({
      ...transition,
      at: new Date(transition.at.getTime()),
    }));
  }

  async findById(
    companyId: string,
    snapshotId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    const snapshot = this.snapshots.get(key(companyId, snapshotId));
    return snapshot ? copyApprovedSnapshot(snapshot) : undefined;
  }

  async findByApprovalId(
    companyId: string,
    approvalId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    const snapshot = this.approvals.get(key(companyId, approvalId));
    return snapshot ? copyApprovedSnapshot(snapshot) : undefined;
  }

  async create(snapshot: ApprovedSnapshot): Promise<void> {
    const snapshotKey = key(snapshot.companyId, snapshot.snapshotId);
    if (this.snapshots.has(snapshotKey)) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot already exists',
      );
    }

    const approvalKey = key(snapshot.companyId, snapshot.approvalId);
    if (this.approvals.has(approvalKey)) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'review approval already has a snapshot',
      );
    }

    const stored = copyApprovedSnapshot(snapshot);
    this.snapshots.set(snapshotKey, stored);
    this.approvals.set(approvalKey, stored);
  }

  async createApprovalWithJobTransition(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void> {
    await this.create(snapshot);
    this.events.push({ ...event });
    this.transitions.push({
      companyId: snapshot.companyId,
      jobId: snapshot.jobId,
      workflowStatus: 'approved_for_report_generation',
      at: new Date(snapshot.approvedAt.getTime()),
    });
  }
}

/**
 * Provider-neutral reader for service tests and proofs. It holds durable
 * submission states as they would be read back from persistence; it performs
 * no gate computation of its own.
 */
export class InMemoryApprovedSnapshotStateReader
  implements ApprovedSnapshotStateReader
{
  private readonly states = new Map<string, ApprovedSnapshotSubmissionState>();

  put(companyId: string, state: ApprovedSnapshotSubmissionState): void {
    this.states.set(key(companyId, state.inspectionId), state);
  }

  async findSubmissionState(
    companyId: string,
    inspectionId: string,
  ): Promise<ApprovedSnapshotSubmissionState | undefined> {
    const found = this.states.get(key(companyId, inspectionId));
    if (!found) return undefined;
    return {
      ...found,
      submission: copySubmissionPayload(found.submission),
      reportContext: copyApprovedSnapshotReportContext(found.reportContext),
    };
  }
}
