import { randomBytes } from 'node:crypto';

import type { AuthPrincipal } from '../identity/auth.types';
import type {
  ApprovedSnapshot,
  ApprovedSnapshotDocument,
} from '../approved-snapshot/approved-snapshot.types';
import type { SyncInspectionPhotoPayload } from '../sync/sync.types';
import type { ReportRenderDeadline } from './report-render-deadline';

export const REPORT_TEMPLATE_VERSION = 'prototype-draft-v1';

export const REPORT_GENERATION_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'superseded',
] as const;
export type ReportGenerationStatus =
  (typeof REPORT_GENERATION_STATUSES)[number];

export type ReportGenerationFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class ReportGenerationFailure extends Error {
  constructor(
    readonly code: ReportGenerationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReportGenerationFailure';
  }
}

export class ReportRenderFailure extends Error {
  constructor(
    readonly failureCode:
      | 'APPROVED_SNAPSHOT_INVALID'
      | 'PHOTO_UNAVAILABLE'
      | 'PHOTO_CHECKSUM_MISMATCH'
      | 'UNSUPPORTED_PHOTO_TYPE'
      | 'RENDERER_UNAVAILABLE'
      | 'PDF_INVALID'
      | 'PDF_TOO_LARGE',
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ReportRenderFailure';
  }
}

export interface ReportGenerationRecord {
  readonly companyId: string;
  readonly generationId: string;
  readonly idempotencyKey: string;
  readonly reportId: string;
  readonly reportRevisionId: string;
  readonly snapshotId: string;
  readonly snapshotSha256: string;
  readonly jobId: string;
  readonly sourceInspectionId: string;
  readonly sourceInspectionRevision: number;
  readonly jurisdiction: 'NSW' | 'QLD';
  readonly templateVersion: string;
  readonly createdByUserId: string;
  readonly reviewedByUserId: string;
  readonly requestedAt: Date;
  readonly status: ReportGenerationStatus;
  readonly revisionNumber: number | null;
  readonly attemptCount: number;
  readonly lastFailureCode: string | null;
  readonly completedAt: Date | null;
}

export interface ReportGenerationClaim extends ReportGenerationRecord {
  readonly leaseToken: string;
}

export interface ReportRevisionRecord {
  readonly companyId: string;
  readonly reportRevisionId: string;
  readonly reportId: string;
  readonly jobId: string;
  readonly sourceInspectionId: string;
  readonly sourceInspectionRevision: number;
  readonly sourceSnapshotId: string;
  readonly jurisdiction: 'NSW' | 'QLD';
  readonly revisionNumber: number;
  readonly templateVersion: string;
  readonly idempotencyKey: string;
  readonly objectId: string;
  readonly objectKey: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly createdByUserId: string;
  readonly reviewedByUserId: string;
  readonly createdAt: Date;
  readonly supersededAt: Date | null;
}

export interface EnqueueReportGenerationInput {
  readonly companyId: string;
  readonly generationId: string;
  readonly idempotencyKey: string;
  readonly reportId: string;
  readonly reportRevisionId: string;
  readonly snapshot: ApprovedSnapshot;
  readonly templateVersion: string;
  readonly createdByUserId: string;
  readonly reviewedByUserId: string;
  readonly requestedAt: Date;
}

export interface ReportArtifactMetadata {
  readonly objectId: string;
  readonly objectKey: string;
  readonly sha256: string;
  readonly byteSize: number;
}

export interface ReportGenerationStore {
  enqueue(input: EnqueueReportGenerationInput): Promise<ReportGenerationRecord>;
  findGeneration(
    companyId: string,
    generationId: string,
  ): Promise<ReportGenerationRecord | undefined>;
  claimNext(
    companyId: string,
    now: Date,
    leaseToken: string,
    leaseDurationMs: number,
  ): Promise<ReportGenerationClaim | undefined>;
  complete(
    claim: ReportGenerationClaim,
    artifact: ReportArtifactMetadata,
    completedAt: Date,
  ): Promise<ReportRevisionRecord | undefined>;
  fail(
    claim: ReportGenerationClaim,
    failureCode: string,
    retryable: boolean,
    at: Date,
  ): Promise<void>;
  findRevision(
    companyId: string,
    reportRevisionId: string,
  ): Promise<ReportRevisionRecord | undefined>;
}

export interface ReportArtifactObjectStore {
  putIfAbsent(
    objectKey: string,
    bytes: Uint8Array,
    expectedSha256: string,
  ): Promise<void>;
  read(
    objectKey: string,
    signal?: AbortSignal,
  ): Promise<Uint8Array | undefined>;
}

export interface ReportPhotoReader {
  read(
    objectKey: string,
    signal?: AbortSignal,
  ): Promise<Uint8Array | undefined>;
}

export interface ReportPhoto {
  readonly localId: string;
  readonly contentType: string | null;
  readonly capturedAtEpochMillis: number;
  readonly checksum: string;
  readonly bytes: Uint8Array;
}

export interface ReportRenderInput {
  readonly document: ApprovedSnapshotDocument;
  readonly revisionNumber: number;
  readonly templateVersion: string;
  readonly generationAt: string;
  readonly photos: ReadonlyMap<string, ReportPhoto>;
  readonly renderDeadline: ReportRenderDeadline;
}

export interface ReportRenderer {
  render(input: ReportRenderInput): Promise<Uint8Array>;
}

export interface ReportClock {
  now(): Date;
}

export interface ReportIdGenerator {
  createId(): string;
}

export const secureReportIdGenerator: ReportIdGenerator = {
  createId: () => randomBytes(24).toString('hex'),
};

export const systemReportClock: ReportClock = {
  now: () => new Date(),
};

export function canGenerateReports(principal: AuthPrincipal): boolean {
  return (
    principal.role === 'administrator' || principal.role === 'office_reviewer'
  );
}

export function assertCanGenerateReports(principal: AuthPrincipal): void {
  if (!canGenerateReports(principal)) {
    throw new ReportGenerationFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}

export function generationPhotoObjectKey(
  companyId: string,
  photo: SyncInspectionPhotoPayload,
): string {
  const reference = photo.storageReference.replace(/^\/+/, '');
  if (
    reference.length === 0 ||
    reference.includes('\\') ||
    reference
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new ReportRenderFailure(
      'APPROVED_SNAPSHOT_INVALID',
      'approved photo reference is invalid',
      false,
    );
  }
  return reference.startsWith(`${companyId}/`)
    ? reference
    : `${companyId}/${reference}`;
}

export function approvedSnapshotHasReportContext(
  snapshot: ApprovedSnapshot,
): snapshot is ApprovedSnapshot & {
  readonly document: ApprovedSnapshotDocument & {
    readonly snapshotSchemaVersion: 2;
    readonly reportContext: NonNullable<
      ApprovedSnapshotDocument['reportContext']
    >;
  };
} {
  return (
    snapshot.document.snapshotSchemaVersion === 2 &&
    snapshot.document.reportContext !== undefined
  );
}
