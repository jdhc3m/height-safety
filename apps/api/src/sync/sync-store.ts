import type { AuthPrincipal } from '../identity/auth.types';
import {
  SyncFailure,
  type SyncInspectionSubmissionPayload,
  type SyncMutationPayloadApplier,
  type SyncMutationRecord,
  type SyncMutationRequest,
  type SyncMutationStore,
} from './sync.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
}

function entityKey(
  companyId: string,
  entityType: string,
  entityId: string,
): string {
  return `${companyId}\u0000${entityType}\u0000${entityId}`;
}

function copyConflict(
  conflict: SyncMutationRecord['response']['conflict'],
): SyncMutationRecord['response']['conflict'] {
  return conflict ? { ...conflict } : null;
}

function copyPayload(
  payload: SyncInspectionSubmissionPayload | null,
): SyncInspectionSubmissionPayload | null {
  if (!payload) return null;
  return {
    ...payload,
    anchorInspections: payload.anchorInspections.map((inspection) => ({
      ...inspection,
      photos: inspection.photos.map((photo) => ({ ...photo })),
    })),
  };
}

function copyRequest(request: SyncMutationRequest): SyncMutationRequest {
  return {
    ...request,
    payload: copyPayload(request.payload),
  };
}

function copyResponse(
  response: SyncMutationRecord['response'],
): SyncMutationRecord['response'] {
  return {
    ...response,
    acknowledgedAt: response.acknowledgedAt
      ? new Date(response.acknowledgedAt.getTime())
      : null,
    conflict: copyConflict(response.conflict),
  };
}

function copyRecord(record: SyncMutationRecord): SyncMutationRecord {
  return {
    ...record,
    request: copyRequest(record.request),
    response: copyResponse(record.response),
  };
}

function payloadKey(companyId: string, submissionId: string): string {
  return `${companyId}\u0000${submissionId}`;
}

export class InMemorySyncMutationStore implements SyncMutationStore {
  private readonly records = new Map<string, SyncMutationRecord>();
  private readonly entityVersions = new Map<string, number>();

  findByMutationId(
    companyId: string,
    mutationId: string,
  ): SyncMutationRecord | undefined {
    const record = this.records.get(key(companyId, mutationId));
    return record ? copyRecord(record) : undefined;
  }

  findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
  ): SyncMutationRecord | undefined {
    for (const record of this.records.values()) {
      if (
        record.companyId === companyId &&
        record.request.idempotencyKey === idempotencyKey
      ) {
        return copyRecord(record);
      }
    }
    return undefined;
  }

  currentEntityVersion(
    companyId: string,
    entityType: string,
    entityId: string,
  ): number | undefined {
    return this.entityVersions.get(entityKey(companyId, entityType, entityId));
  }

  save(record: SyncMutationRecord): void {
    const mutationKey = key(record.companyId, record.request.mutationId);
    const existing = this.records.get(mutationKey);
    if (existing) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'mutation identity has already been recorded',
      );
    }
    this.records.set(mutationKey, copyRecord(record));
    if (record.response.state === 'synchronised') {
      this.entityVersions.set(
        entityKey(
          record.companyId,
          record.request.entityType,
          record.request.entityId,
        ),
        record.request.entityVersion,
      );
    }
  }

  /** Test-only seed for a server-side entity revision. */
  setCurrentEntityVersion(
    companyId: string,
    entityType: string,
    entityId: string,
    version: number,
  ): void {
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new RangeError('entity version must be a non-negative integer');
    }
    this.entityVersions.set(
      entityKey(companyId, entityType, entityId),
      version,
    );
  }
}

export class UnconfiguredSyncMutationStore implements SyncMutationStore {
  private unavailable(): never {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      'synchronisation persistence adapter is not configured',
    );
  }

  findByMutationId(
    _companyId: string,
    _mutationId: string,
  ): SyncMutationRecord | undefined {
    return this.unavailable();
  }

  findByIdempotencyKey(
    _companyId: string,
    _idempotencyKey: string,
  ): SyncMutationRecord | undefined {
    return this.unavailable();
  }

  currentEntityVersion(
    _companyId: string,
    _entityType: string,
    _entityId: string,
  ): number | undefined {
    return this.unavailable();
  }

  save(_record: SyncMutationRecord): void {
    this.unavailable();
  }
}

/**
 * Bounded payload application proof. Runtime persistence remains a separate
 * adapter decision; this adapter exists for protocol and service tests.
 */
export class InMemorySyncMutationPayloadApplier
  implements SyncMutationPayloadApplier
{
  private readonly payloads = new Map<
    string,
    SyncInspectionSubmissionPayload
  >();

  apply(
    principal: AuthPrincipal,
    request: SyncMutationRequest,
    _acknowledgedAt: Date,
  ): boolean {
    if (!request.payload) return false;
    this.payloads.set(
      payloadKey(principal.companyId, request.payload.submissionId),
      copyPayload(request.payload)!,
    );
    return true;
  }

  getPayload(
    companyId: string,
    submissionId: string,
  ): SyncInspectionSubmissionPayload | undefined {
    const payload = this.payloads.get(payloadKey(companyId, submissionId));
    return payload ? (copyPayload(payload) ?? undefined) : undefined;
  }
}
