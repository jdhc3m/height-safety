import {
  ApprovedSnapshotFailure,
  type ApprovedSnapshot,
  type ApprovedSnapshotDocument,
  type ApprovedSnapshotStore,
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

function copyDocument(
  document: ApprovedSnapshotDocument,
): ApprovedSnapshotDocument {
  return {
    ...document,
    inspectionSubmission: copySubmissionPayload(document.inspectionSubmission),
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

export class InMemoryApprovedSnapshotStore implements ApprovedSnapshotStore {
  private readonly snapshots = new Map<string, ApprovedSnapshot>();
  private readonly approvals = new Map<string, ApprovedSnapshot>();

  findById(
    companyId: string,
    snapshotId: string,
  ): ApprovedSnapshot | undefined {
    const snapshot = this.snapshots.get(key(companyId, snapshotId));
    return snapshot ? copyApprovedSnapshot(snapshot) : undefined;
  }

  findByApprovalId(
    companyId: string,
    approvalId: string,
  ): ApprovedSnapshot | undefined {
    const snapshot = this.approvals.get(key(companyId, approvalId));
    return snapshot ? copyApprovedSnapshot(snapshot) : undefined;
  }

  create(snapshot: ApprovedSnapshot): void {
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
}
