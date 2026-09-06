import { createHash, randomBytes } from 'node:crypto';

import type { AuthPrincipal } from '../identity/auth.types';
import {
  SYNC_DISPOSITIONS,
  SYNC_EXCEPTION_REASONS,
  SYNC_JURISDICTIONS,
  SYNC_MUTATION_ENTITY_TYPES,
  SYNC_MUTATION_OPERATIONS,
  SYNC_RECONCILIATION_PROPOSALS,
  SYNC_RECORDED_OUTCOMES,
  NoopSyncMutationPayloadApplier,
  SyncFailure,
  assertInspector,
  type SyncClock,
  type SyncConflictReason,
  type SyncIdGenerator,
  type SyncInspectionPhotoPayload,
  type SyncInspectionSubmissionPayload,
  type SyncMutationRecord,
  type SyncMutationRequest,
  type SyncMutationResponse,
  type SyncMutationPayloadApplier,
  type SyncMutationStore,
} from './sync.types';

const ID_MAX_LENGTH = 128;

export interface SyncServiceOptions {
  readonly store: SyncMutationStore;
  readonly clock: SyncClock;
  readonly idGenerator: SyncIdGenerator;
  readonly payloadApplier?: SyncMutationPayloadApplier;
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new SyncFailure('INVALID_INPUT', `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > ID_MAX_LENGTH) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `${field} must be between 1 and ${ID_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function requiredInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `${field} must be a safe integer of at least ${minimum}`,
    );
  }
  return value as number;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new SyncFailure('INVALID_INPUT', `${field} must be a boolean`);
  }
  return value;
}

function optionalText(
  value: unknown,
  field: string,
  maximumLength = 10_000,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maximumLength) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `${field} must be null or a string of at most ${maximumLength} characters`,
    );
  }
  return value;
}

function requiredEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new SyncFailure('INVALID_INPUT', `${field} is not supported`);
  }
  return value as T[number];
}

function optionalEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] | null {
  if (value === undefined || value === null) return null;
  return requiredEnum(value, field, values);
}

function requiredArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new SyncFailure('INVALID_INPUT', `${field} must be an array`);
  }
  return value;
}

function normalizePhotoPayload(
  input: unknown,
  index: number,
): SyncInspectionPhotoPayload {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `payload.anchorInspections photo ${index} must be an object`,
    );
  }
  const candidate = input as Record<string, unknown>;
  const byteSize =
    candidate.byteSize === undefined || candidate.byteSize === null
      ? null
      : requiredInteger(
          candidate.byteSize,
          `payload photo ${index}.byteSize`,
          0,
        );
  return {
    localId: requiredId(candidate.localId, `payload photo ${index}.localId`),
    storageReference: requiredId(
      candidate.storageReference,
      `payload photo ${index}.storageReference`,
    ),
    capturedAtEpochMillis: requiredInteger(
      candidate.capturedAtEpochMillis,
      `payload photo ${index}.capturedAtEpochMillis`,
      0,
    ),
    checksum: requiredId(candidate.checksum, `payload photo ${index}.checksum`),
    contentType: optionalText(
      candidate.contentType,
      `payload photo ${index}.contentType`,
      128,
    ),
    byteSize,
  };
}

function normalizeAnchorInspectionPayload(
  input: unknown,
  index: number,
): SyncInspectionSubmissionPayload['anchorInspections'][number] {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `payload anchor inspection ${index} must be an object`,
    );
  }
  const candidate = input as Record<string, unknown>;
  const photos = requiredArray(
    candidate.photos,
    `payload anchor inspection ${index}.photos`,
  );
  if (photos.length > 100) {
    throw new SyncFailure(
      'INVALID_INPUT',
      `payload anchor inspection ${index}.photos cannot contain more than 100 photos`,
    );
  }
  return {
    inspectionId: requiredId(
      candidate.inspectionId,
      `payload anchor inspection ${index}.inspectionId`,
    ),
    expectedAnchorId: optionalText(
      candidate.expectedAnchorId,
      `payload anchor inspection ${index}.expectedAnchorId`,
      ID_MAX_LENGTH,
    ),
    provisionalAnchorId: optionalText(
      candidate.provisionalAnchorId,
      `payload anchor inspection ${index}.provisionalAnchorId`,
      ID_MAX_LENGTH,
    ),
    identityConfirmed: requiredBoolean(
      candidate.identityConfirmed,
      `payload anchor inspection ${index}.identityConfirmed`,
    ),
    locationConfirmed: requiredBoolean(
      candidate.locationConfirmed,
      `payload anchor inspection ${index}.locationConfirmed`,
    ),
    location: optionalText(
      candidate.location,
      `payload anchor inspection ${index}.location`,
    ),
    observations: optionalText(
      candidate.observations,
      `payload anchor inspection ${index}.observations`,
    ),
    recordedOutcome: optionalEnum(
      candidate.recordedOutcome,
      `payload anchor inspection ${index}.recordedOutcome`,
      SYNC_RECORDED_OUTCOMES,
    ),
    exceptionReason: optionalEnum(
      candidate.exceptionReason,
      `payload anchor inspection ${index}.exceptionReason`,
      SYNC_EXCEPTION_REASONS,
    ),
    reconciliationProposal: optionalEnum(
      candidate.reconciliationProposal,
      `payload anchor inspection ${index}.reconciliationProposal`,
      SYNC_RECONCILIATION_PROPOSALS,
    ),
    reconciliationReferenceId: optionalText(
      candidate.reconciliationReferenceId,
      `payload anchor inspection ${index}.reconciliationReferenceId`,
      ID_MAX_LENGTH,
    ),
    disposition: optionalEnum(
      candidate.disposition,
      `payload anchor inspection ${index}.disposition`,
      SYNC_DISPOSITIONS,
    ),
    notes: optionalText(
      candidate.notes,
      `payload anchor inspection ${index}.notes`,
    ),
    defectDescription: optionalText(
      candidate.defectDescription,
      `payload anchor inspection ${index}.defectDescription`,
    ),
    recommendation: optionalText(
      candidate.recommendation,
      `payload anchor inspection ${index}.recommendation`,
    ),
    proofTestLoad: optionalText(
      candidate.proofTestLoad,
      `payload anchor inspection ${index}.proofTestLoad`,
    ),
    proofTestHold: optionalText(
      candidate.proofTestHold,
      `payload anchor inspection ${index}.proofTestHold`,
    ),
    proofTestResult: optionalText(
      candidate.proofTestResult,
      `payload anchor inspection ${index}.proofTestResult`,
    ),
    proofTestEquipmentReference: optionalText(
      candidate.proofTestEquipmentReference,
      `payload anchor inspection ${index}.proofTestEquipmentReference`,
    ),
    photos: photos.map((photo, photoIndex) =>
      normalizePhotoPayload(photo, photoIndex),
    ),
  };
}

function normalizePayload(
  input: unknown,
): SyncInspectionSubmissionPayload | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new SyncFailure('INVALID_INPUT', 'payload must be an object or null');
  }
  const candidate = input as Record<string, unknown>;
  const anchorInspections = requiredArray(
    candidate.anchorInspections,
    'payload.anchorInspections',
  );
  if (anchorInspections.length > 1_000) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'payload.anchorInspections cannot contain more than 1000 inspections',
    );
  }
  return {
    companyId: requiredId(candidate.companyId, 'payload.companyId'),
    jobId: requiredId(candidate.jobId, 'payload.jobId'),
    siteId: requiredId(candidate.siteId, 'payload.siteId'),
    jurisdiction: requiredEnum(
      candidate.jurisdiction,
      'payload.jurisdiction',
      SYNC_JURISDICTIONS,
    ),
    submissionId: requiredId(candidate.submissionId, 'payload.submissionId'),
    jobPackVersion: requiredInteger(
      candidate.jobPackVersion,
      'payload.jobPackVersion',
      1,
    ),
    anchorInspections: anchorInspections.map((inspection, index) =>
      normalizeAnchorInspectionPayload(inspection, index),
    ),
  };
}

function normalizeRequest(input: unknown): SyncMutationRequest {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'synchronisation request is required',
    );
  }
  const candidate = input as Record<string, unknown>;
  const operation = requiredId(candidate.operation, 'operation');
  if (!SYNC_MUTATION_OPERATIONS.includes(operation as never)) {
    throw new SyncFailure('INVALID_INPUT', 'operation is not supported');
  }
  const entityType = requiredId(candidate.entityType, 'entityType');
  if (!SYNC_MUTATION_ENTITY_TYPES.includes(entityType as never)) {
    throw new SyncFailure('INVALID_INPUT', 'entityType is not supported');
  }
  const expectedEntityVersion = requiredInteger(
    candidate.expectedEntityVersion,
    'expectedEntityVersion',
    0,
  );
  const entityVersion = requiredInteger(
    candidate.entityVersion,
    'entityVersion',
    1,
  );
  if (entityVersion !== expectedEntityVersion + 1) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'entityVersion must be one greater than expectedEntityVersion',
    );
  }
  return {
    mutationId: requiredId(candidate.mutationId, 'mutationId'),
    idempotencyKey: requiredId(candidate.idempotencyKey, 'idempotencyKey'),
    operation: operation as SyncMutationRequest['operation'],
    entityType: entityType as SyncMutationRequest['entityType'],
    entityId: requiredId(candidate.entityId, 'entityId'),
    expectedEntityVersion,
    entityVersion,
    payload: normalizePayload(candidate.payload),
  };
}

function validatePayloadScope(
  principal: AuthPrincipal,
  request: SyncMutationRequest,
): void {
  const payload = request.payload;
  if (!payload) return;
  if (payload.companyId !== principal.companyId) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'payload.companyId must match company scope',
    );
  }
  if (payload.submissionId !== request.entityId) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'payload.submissionId must match entityId',
    );
  }
  if (payload.jobPackVersion !== request.entityVersion) {
    throw new SyncFailure(
      'INVALID_INPUT',
      'payload.jobPackVersion must match entityVersion',
    );
  }
}

function sameRequest(
  left: SyncMutationRequest,
  right: SyncMutationRequest,
): boolean {
  return (
    left.mutationId === right.mutationId &&
    left.idempotencyKey === right.idempotencyKey &&
    left.operation === right.operation &&
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.expectedEntityVersion === right.expectedEntityVersion &&
    left.entityVersion === right.entityVersion &&
    JSON.stringify(left.payload) === JSON.stringify(right.payload)
  );
}

function requestSha256(request: SyncMutationRequest): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

function copyResponse(
  response: SyncMutationResponse,
  replayed: boolean,
): SyncMutationResponse {
  return {
    ...response,
    replayed,
    acknowledgedAt: response.acknowledgedAt
      ? new Date(response.acknowledgedAt.getTime())
      : null,
    payloadApplied: response.payloadApplied,
    conflict: response.conflict ? { ...response.conflict } : null,
  };
}

export class SyncService {
  private readonly payloadApplier: SyncMutationPayloadApplier;

  constructor(private readonly options: SyncServiceOptions) {
    this.payloadApplier =
      options.payloadApplier ?? new NoopSyncMutationPayloadApplier();
  }

  submitMutation(
    principal: AuthPrincipal,
    input: unknown,
  ): SyncMutationResponse {
    assertInspector(principal);
    const request = normalizeRequest(input);
    validatePayloadScope(principal, request);
    const existingMutation = this.options.store.findByMutationId(
      principal.companyId,
      request.mutationId,
    );
    if (existingMutation) {
      if (sameRequest(existingMutation.request, request)) {
        return copyResponse(existingMutation.response, true);
      }
      return this.unpersistedConflict(
        principal.companyId,
        request,
        'mutation_identity_mismatch',
        'Mutation ID was already used for a different request.',
        existingMutation.response.serverEntityVersion,
      );
    }

    const existingKey = this.options.store.findByIdempotencyKey(
      principal.companyId,
      request.idempotencyKey,
    );
    if (existingKey) {
      if (sameRequest(existingKey.request, request)) {
        return copyResponse(existingKey.response, true);
      }
      return this.unpersistedConflict(
        principal.companyId,
        request,
        'idempotency_key_reuse',
        'Idempotency key was already used for a different request.',
        existingKey.response.serverEntityVersion,
      );
    }

    const currentEntityVersion = this.options.store.currentEntityVersion(
      principal.companyId,
      request.entityType,
      request.entityId,
    );
    const currentVersionForComparison = currentEntityVersion ?? 0;
    if (currentVersionForComparison !== request.expectedEntityVersion) {
      const response = this.conflictResponse(
        principal.companyId,
        request,
        'expected_version_mismatch',
        'Server entity version changed before this mutation was received.',
        currentEntityVersion ?? null,
      );
      this.options.store.save({
        companyId: principal.companyId,
        request,
        actorUserId: principal.userId,
        requestSha256: requestSha256(request),
        response,
      });
      return response;
    }

    const acknowledgedAt = this.now();
    const response: SyncMutationResponse = {
      companyId: principal.companyId,
      mutationId: request.mutationId,
      idempotencyKey: request.idempotencyKey,
      state: 'synchronised',
      serverEntityVersion: request.entityVersion,
      acknowledgedAt,
      payloadApplied: this.payloadApplier.apply(
        principal,
        request,
        acknowledgedAt,
      ),
      replayed: false,
      conflict: null,
    };
    this.options.store.save({
      companyId: principal.companyId,
      request,
      actorUserId: principal.userId,
      requestSha256: requestSha256(request),
      response,
    });
    return response;
  }

  private conflictResponse(
    companyId: string,
    request: SyncMutationRequest,
    reason: SyncConflictReason,
    message: string,
    currentEntityVersion: number | null,
  ): SyncMutationResponse {
    return {
      companyId,
      mutationId: request.mutationId,
      idempotencyKey: request.idempotencyKey,
      state: 'conflict',
      serverEntityVersion: currentEntityVersion,
      acknowledgedAt: null,
      payloadApplied: false,
      replayed: false,
      conflict: {
        conflictId: this.options.idGenerator.createId(),
        reason,
        expectedEntityVersion: request.expectedEntityVersion,
        currentEntityVersion,
        message,
      },
    };
  }

  private unpersistedConflict(
    companyId: string,
    request: SyncMutationRequest,
    reason: SyncConflictReason,
    message: string,
    currentEntityVersion: number | null,
  ): SyncMutationResponse {
    return this.conflictResponse(
      companyId,
      request,
      reason,
      message,
      currentEntityVersion,
    );
  }

  private now(): Date {
    const now = this.options.clock.now();
    if (Number.isNaN(now.getTime())) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'synchronisation clock is invalid',
      );
    }
    return new Date(now.getTime());
  }
}

export const secureSyncIdGenerator: SyncIdGenerator = {
  createId: () => randomBytes(16).toString('hex'),
};

export const systemSyncClock: SyncClock = {
  now: () => new Date(),
};
