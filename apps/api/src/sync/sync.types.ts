import type { AuthPrincipal } from '../identity/auth.types';

export const SYNC_MUTATION_OPERATIONS = ['submit_inspection'] as const;
export type SyncMutationOperation = (typeof SYNC_MUTATION_OPERATIONS)[number];

export const SYNC_MUTATION_ENTITY_TYPES = ['inspection_submission'] as const;
export type SyncMutationEntityType =
  (typeof SYNC_MUTATION_ENTITY_TYPES)[number];

export const SYNC_MUTATION_STATES = ['synchronised', 'conflict'] as const;
export type SyncMutationState = (typeof SYNC_MUTATION_STATES)[number];

export const SYNC_CONFLICT_REASONS = [
  'expected_version_mismatch',
  'idempotency_key_reuse',
  'mutation_identity_mismatch',
] as const;
export type SyncConflictReason = (typeof SYNC_CONFLICT_REASONS)[number];

export const SYNC_JURISDICTIONS = ['NSW', 'QLD'] as const;
export type SyncJurisdiction = (typeof SYNC_JURISDICTIONS)[number];

export const SYNC_RECORDED_OUTCOMES = [
  'serviceable',
  'defective',
  'not_inspected',
  'further_assessment_required',
] as const;
export type SyncRecordedOutcome = (typeof SYNC_RECORDED_OUTCOMES)[number];

export const SYNC_EXCEPTION_REASONS = [
  'inaccessible',
  'unable_to_locate',
] as const;
export type SyncExceptionReason = (typeof SYNC_EXCEPTION_REASONS)[number];

export const SYNC_RECONCILIATION_PROPOSALS = [
  'newly_discovered',
  'replacement',
  'duplicate',
] as const;
export type SyncReconciliationProposal =
  (typeof SYNC_RECONCILIATION_PROPOSALS)[number];

export const SYNC_DISPOSITIONS = ['removed_from_service'] as const;
export type SyncDisposition = (typeof SYNC_DISPOSITIONS)[number];

export interface SyncInspectionPhotoPayload {
  readonly localId: string;
  readonly storageReference: string;
  readonly capturedAtEpochMillis: number;
  readonly checksum: string;
  readonly contentType: string | null;
  readonly byteSize: number | null;
}

export interface SyncAnchorInspectionPayload {
  readonly inspectionId: string;
  readonly expectedAnchorId: string | null;
  readonly provisionalAnchorId: string | null;
  readonly identityConfirmed: boolean;
  readonly locationConfirmed: boolean;
  readonly location: string | null;
  readonly observations: string | null;
  readonly recordedOutcome: SyncRecordedOutcome | null;
  readonly exceptionReason: SyncExceptionReason | null;
  readonly reconciliationProposal: SyncReconciliationProposal | null;
  readonly reconciliationReferenceId: string | null;
  readonly disposition: SyncDisposition | null;
  readonly notes: string | null;
  readonly defectDescription: string | null;
  readonly recommendation: string | null;
  readonly proofTestLoad: string | null;
  readonly proofTestHold: string | null;
  readonly proofTestResult: string | null;
  readonly proofTestEquipmentReference: string | null;
  readonly photos: readonly SyncInspectionPhotoPayload[];
}

export interface SyncInspectionSubmissionPayload {
  readonly companyId: string;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly submissionId: string;
  readonly jobPackVersion: number;
  readonly anchorInspections: readonly SyncAnchorInspectionPayload[];
}

/**
 * The client revision is the version being submitted. The expected version is
 * the server revision immediately before applying it. The server never infers
 * jurisdiction or a technical outcome from this envelope.
 */
export interface SyncMutationRequest {
  readonly mutationId: string;
  readonly idempotencyKey: string;
  readonly operation: SyncMutationOperation;
  readonly entityType: SyncMutationEntityType;
  readonly entityId: string;
  readonly expectedEntityVersion: number;
  readonly entityVersion: number;
  /** Optional during the envelope-only compatibility slice. */
  readonly payload: SyncInspectionSubmissionPayload | null;
}

export interface SyncMutationConflict {
  readonly conflictId: string;
  readonly reason: SyncConflictReason;
  readonly expectedEntityVersion: number;
  readonly currentEntityVersion: number | null;
  readonly message: string;
}

export interface SyncMutationResponse {
  readonly companyId: string;
  readonly mutationId: string;
  readonly idempotencyKey: string;
  readonly state: SyncMutationState;
  readonly serverEntityVersion: number | null;
  readonly acknowledgedAt: Date | null;
  readonly payloadApplied: boolean;
  readonly replayed: boolean;
  readonly conflict: SyncMutationConflict | null;
}

export interface SyncMutationRecord {
  readonly companyId: string;
  readonly request: SyncMutationRequest;
  readonly actorUserId: string;
  readonly requestSha256: string;
  readonly response: SyncMutationResponse;
}

export interface SyncMutationStore {
  findByMutationId(
    companyId: string,
    mutationId: string,
  ): SyncMutationRecord | undefined;
  findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
  ): SyncMutationRecord | undefined;
  currentEntityVersion(
    companyId: string,
    entityType: string,
    entityId: string,
  ): number | undefined;
  save(record: SyncMutationRecord): void;
}

export interface SyncMutationPayloadApplier {
  /** Applies payload only after the mutation version check succeeds. */
  apply(
    principal: AuthPrincipal,
    request: SyncMutationRequest,
    acknowledgedAt: Date,
  ): boolean;
}

export class NoopSyncMutationPayloadApplier
  implements SyncMutationPayloadApplier
{
  apply(
    _principal: AuthPrincipal,
    request: SyncMutationRequest,
    _acknowledgedAt: Date,
  ): boolean {
    if (request.payload) {
      throw new SyncFailure(
        'PERSISTENCE_UNAVAILABLE',
        'inspection payload application adapter is not configured',
      );
    }
    return false;
  }
}

export type SyncFailureCode =
  | 'INVALID_INPUT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class SyncFailure extends Error {
  constructor(
    readonly code: SyncFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'SyncFailure';
  }
}

export interface SyncClock {
  now(): Date;
}

export interface SyncIdGenerator {
  createId(): string;
}

export function assertInspector(principal: AuthPrincipal): void {
  if (principal.role !== 'inspector') {
    throw new SyncFailure('ROLE_FORBIDDEN', 'Inspector role is required');
  }
}
