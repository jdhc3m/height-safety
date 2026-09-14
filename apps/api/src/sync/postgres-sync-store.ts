import { createHash } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import type { AuthPrincipal } from '../identity/auth.types';
import {
  SyncFailure,
  type SyncInspectionPhotoPayload,
  type SyncInspectionSubmissionPayload,
  type SyncMutationAtomicProcessor,
  type SyncMutationRecord,
  type SyncMutationRequest,
  type SyncMutationResponse,
  type SyncMutationStore,
} from './sync.types';

interface MutationRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly mutation_id: unknown;
  readonly idempotency_key: unknown;
  readonly actor_user_id: unknown;
  readonly entity_type: unknown;
  readonly entity_id: unknown;
  readonly request_sha256: unknown;
  readonly state: unknown;
  readonly request_body: unknown;
  readonly response_body: unknown;
  readonly entity_version: unknown;
  readonly created_at: unknown;
  readonly completed_at: unknown;
}

interface EntityRow extends Record<string, unknown> {
  readonly entity_version: unknown;
}

const MUTATION_COLUMNS = `
  company_id,
  mutation_id,
  idempotency_key,
  actor_user_id,
  entity_type,
  entity_id,
  request_sha256,
  state,
  request_body,
  response_body,
  entity_version,
  created_at,
  completed_at
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

function storedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      `synchronisation persistence returned invalid ${field}`,
    );
  }
  return value;
}

function storedNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      `synchronisation persistence returned invalid ${field}`,
    );
  }
  return number;
}

function storedDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      `synchronisation persistence returned invalid ${field}`,
    );
  }
  return date;
}

function parseJson(value: unknown, field: string): unknown {
  if (typeof value !== 'string') {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      `synchronisation persistence returned invalid ${field}`,
    );
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      `synchronisation persistence returned invalid ${field}`,
    );
  }
}

function parseRequest(value: unknown): SyncMutationRequest {
  const parsed = parseJson(value, 'request_body');
  if (!isRecord(parsed)) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      'synchronisation request body is not an object',
    );
  }
  return parsed as unknown as SyncMutationRequest;
}

function parseResponse(value: unknown): SyncMutationResponse {
  const parsed = parseJson(value, 'response_body');
  if (!isRecord(parsed)) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      'synchronisation response body is not an object',
    );
  }
  const acknowledgedAt = parsed.acknowledgedAt;
  return {
    ...(parsed as unknown as SyncMutationResponse),
    acknowledgedAt:
      acknowledgedAt === null || acknowledgedAt === undefined
        ? null
        : storedDate(acknowledgedAt, 'acknowledgedAt'),
    replayed: false,
    conflict: parsed.conflict
      ? (parsed.conflict as SyncMutationResponse['conflict'])
      : null,
  };
}

function parseRecord(row: MutationRow, companyId: string): SyncMutationRecord {
  const rowCompanyId = storedString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new SyncFailure(
      'PERSISTENCE_UNAVAILABLE',
      'synchronisation persistence crossed company scope',
    );
  }
  return {
    companyId: rowCompanyId,
    request: parseRequest(row.request_body),
    actorUserId: storedString(row.actor_user_id, 'actor_user_id'),
    requestSha256: storedString(row.request_sha256, 'request_sha256'),
    response: parseResponse(row.response_body),
  };
}

function responseJson(response: SyncMutationResponse): string {
  return JSON.stringify({
    ...response,
    acknowledgedAt: response.acknowledgedAt?.toISOString() ?? null,
  });
}

function requestJson(request: SyncMutationRequest): string {
  return JSON.stringify(request);
}

function stableChildId(kind: string, companyId: string, value: string): string {
  return createHash('sha256')
    .update(`${kind}\u0000${companyId}\u0000${value}`, 'utf8')
    .digest('hex')
    .slice(0, 64);
}

function objectKey(companyId: string, storageReference: string): string {
  const normalized = storageReference.replace(/^\/+/, '');
  if (
    normalized.length === 0 ||
    normalized.includes('..') ||
    normalized.includes('\\') ||
    normalized.startsWith(`${companyId}/`)
  ) {
    if (
      normalized.startsWith(`${companyId}/`) &&
      !normalized.includes('..') &&
      !normalized.includes('\\')
    ) {
      return normalized;
    }
    throw new SyncFailure(
      'INVALID_INPUT',
      'photo storage reference is invalid',
    );
  }
  return `${companyId}/${normalized}`;
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
    conflict: response.conflict ? { ...response.conflict } : null,
  };
}

/**
 * PostgreSQL-backed sync processor. Mutation identity, version checks, frozen
 * inspection rows and evidence metadata are committed in one tenant-bound
 * transaction. Raw photo bytes are deliberately handled by the separate
 * object transport; this transaction records their stable object reference.
 */
export class PostgresSyncMutationStore
  implements SyncMutationStore, SyncMutationAtomicProcessor
{
  constructor(private readonly database: SqlDatabase) {}

  async findByMutationId(
    companyId: string,
    mutationId: string,
  ): Promise<SyncMutationRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<MutationRow>(
        `SELECT ${MUTATION_COLUMNS} FROM sync_mutations WHERE company_id = $1 AND mutation_id = $2`,
        [companyId, mutationId],
      );
      const row = firstRow(result);
      return row ? parseRecord(row, companyId) : undefined;
    });
  }

  async findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
  ): Promise<SyncMutationRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<MutationRow>(
        `SELECT ${MUTATION_COLUMNS} FROM sync_mutations WHERE company_id = $1 AND idempotency_key = $2`,
        [companyId, idempotencyKey],
      );
      const row = firstRow(result);
      return row ? parseRecord(row, companyId) : undefined;
    });
  }

  async currentEntityVersion(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<number | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<EntityRow>(
        `
          SELECT MAX(entity_version) AS entity_version
          FROM sync_mutations
          WHERE company_id = $1
            AND entity_type = $2
            AND entity_id = $3
            AND state = 'synchronised'
        `,
        [companyId, entityType, entityId],
      );
      const row = firstRow(result);
      if (
        !row ||
        row.entity_version === null ||
        row.entity_version === undefined
      )
        return undefined;
      return storedNumber(row.entity_version, 'entity_version');
    });
  }

  async save(record: SyncMutationRecord): Promise<void> {
    await this.withTenant(record.companyId, async (transaction) => {
      await this.insertMutation(transaction, record);
    });
  }

  async submitAtomically(
    principal: AuthPrincipal,
    request: SyncMutationRequest,
    requestSha256: string,
    acknowledgedAt: Date,
    createConflictId: () => string,
  ): Promise<SyncMutationResponse> {
    return this.withTenant(principal.companyId, async (transaction) => {
      // Serialise revisions for one company/entity while leaving unrelated
      // inspections concurrent.
      await transaction.query(
        `
          SELECT pg_advisory_xact_lock(
            hashtextextended(concat_ws(':', $1::text, $2::text, $3::text), 0)
          )
        `,
        [principal.companyId, request.entityType, request.entityId],
      );

      const existingMutation = await this.selectMutation(
        transaction,
        principal.companyId,
        'mutation_id',
        request.mutationId,
      );
      if (existingMutation) {
        return this.replayOrConflict(
          existingMutation,
          request,
          requestSha256,
          principal.companyId,
          createConflictId,
          'mutation_identity_mismatch',
          'Mutation ID was already used for a different request.',
        );
      }

      const existingKey = await this.selectMutation(
        transaction,
        principal.companyId,
        'idempotency_key',
        request.idempotencyKey,
      );
      if (existingKey) {
        return this.replayOrConflict(
          existingKey,
          request,
          requestSha256,
          principal.companyId,
          createConflictId,
          'idempotency_key_reuse',
          'Idempotency key was already used for a different request.',
        );
      }

      const currentResult = await transaction.query<EntityRow>(
        `
          SELECT MAX(entity_version) AS entity_version
          FROM sync_mutations
          WHERE company_id = $1
            AND entity_type = $2
            AND entity_id = $3
            AND state = 'synchronised'
        `,
        [principal.companyId, request.entityType, request.entityId],
      );
      const currentRow = firstRow(currentResult);
      const currentEntityVersion =
        currentRow?.entity_version === null ||
        currentRow?.entity_version === undefined
          ? undefined
          : storedNumber(currentRow.entity_version, 'entity_version');
      const currentForComparison = currentEntityVersion ?? 0;
      if (currentForComparison !== request.expectedEntityVersion) {
        const response: SyncMutationResponse = {
          companyId: principal.companyId,
          mutationId: request.mutationId,
          idempotencyKey: request.idempotencyKey,
          state: 'conflict',
          serverEntityVersion: currentEntityVersion ?? null,
          acknowledgedAt: null,
          payloadApplied: false,
          replayed: false,
          conflict: {
            conflictId: createConflictId(),
            reason: 'expected_version_mismatch',
            expectedEntityVersion: request.expectedEntityVersion,
            currentEntityVersion: currentEntityVersion ?? null,
            message:
              'Server entity version changed before this mutation was received.',
          },
        };
        await this.insertMutation(transaction, {
          companyId: principal.companyId,
          request,
          actorUserId: principal.userId,
          requestSha256,
          response,
        });
        return response;
      }

      const payloadApplied = request.payload
        ? await this.applyInspectionPayload(
            transaction,
            principal,
            request,
            request.payload,
            acknowledgedAt,
          )
        : false;
      const response: SyncMutationResponse = {
        companyId: principal.companyId,
        mutationId: request.mutationId,
        idempotencyKey: request.idempotencyKey,
        state: 'synchronised',
        serverEntityVersion: request.entityVersion,
        acknowledgedAt,
        payloadApplied,
        replayed: false,
        conflict: null,
      };
      await this.insertMutation(transaction, {
        companyId: principal.companyId,
        request,
        actorUserId: principal.userId,
        requestSha256,
        response,
      });
      return response;
    });
  }

  private async replayOrConflict(
    existing: SyncMutationRecord,
    request: SyncMutationRequest,
    requestSha256: string,
    companyId: string,
    createConflictId: () => string,
    reason: 'mutation_identity_mismatch' | 'idempotency_key_reuse',
    message: string,
  ): Promise<SyncMutationResponse> {
    if (existing.requestSha256 === requestSha256) {
      return copyResponse(existing.response, true);
    }
    return {
      companyId,
      mutationId: request.mutationId,
      idempotencyKey: request.idempotencyKey,
      state: 'conflict',
      serverEntityVersion: existing.response.serverEntityVersion,
      acknowledgedAt: null,
      payloadApplied: false,
      replayed: false,
      conflict: {
        conflictId: createConflictId(),
        reason,
        expectedEntityVersion: request.expectedEntityVersion,
        currentEntityVersion: existing.response.serverEntityVersion,
        message,
      },
    };
  }

  private async selectMutation(
    transaction: SqlTransaction,
    companyId: string,
    column: 'mutation_id' | 'idempotency_key',
    value: string,
  ): Promise<SyncMutationRecord | undefined> {
    const result = await transaction.query<MutationRow>(
      `SELECT ${MUTATION_COLUMNS} FROM sync_mutations WHERE company_id = $1 AND ${column} = $2`,
      [companyId, value],
    );
    const row = firstRow(result);
    return row ? parseRecord(row, companyId) : undefined;
  }

  private async insertMutation(
    transaction: SqlTransaction,
    record: SyncMutationRecord,
  ): Promise<void> {
    const response = record.response;
    await transaction.query(
      `
        INSERT INTO sync_mutations (
          company_id, mutation_id, idempotency_key, actor_user_id,
          entity_type, entity_id, request_sha256, state, request_body,
          response_body, entity_version, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        record.companyId,
        record.request.mutationId,
        record.request.idempotencyKey,
        record.actorUserId,
        record.request.entityType,
        record.request.entityId,
        record.requestSha256,
        response.state,
        requestJson(record.request),
        responseJson(response),
        response.state === 'synchronised' ? record.request.entityVersion : 0,
        response.acknowledgedAt ?? new Date(),
        response.acknowledgedAt,
      ],
    );
  }

  private async applyInspectionPayload(
    transaction: SqlTransaction,
    principal: AuthPrincipal,
    request: SyncMutationRequest,
    payload: SyncInspectionSubmissionPayload,
    acknowledgedAt: Date,
  ): Promise<boolean> {
    const jobResult = await transaction.query<Record<string, unknown>>(
      `
        SELECT j.job_id, j.site_id, j.jurisdiction, j.job_pack_version,
               a.inspector_user_id
        FROM jobs j
        JOIN job_assignments a
          ON a.company_id = j.company_id
         AND a.job_id = j.job_id
         AND a.is_primary = TRUE
        WHERE j.company_id = $1
          AND j.job_id = $2
          AND a.inspector_user_id = $3
      `,
      [principal.companyId, payload.jobId, principal.userId],
    );
    const job = firstRow(jobResult);
    if (!job) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'inspection submission job is not assigned to the authenticated inspector',
      );
    }
    if (
      job.site_id !== payload.siteId ||
      job.jurisdiction !== payload.jurisdiction ||
      Number(job.job_pack_version) !== payload.jobPackVersion
    ) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'inspection submission does not match the released job pack',
      );
    }

    const existingInspection = await transaction.query<Record<string, unknown>>(
      `SELECT inspection_id FROM inspections WHERE company_id = $1 AND inspection_id = $2`,
      [principal.companyId, payload.submissionId],
    );
    if (firstRow(existingInspection)) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'inspection submission identity already exists',
      );
    }

    await transaction.query(
      `
        INSERT INTO inspections (
          company_id, inspection_id, job_id, site_id, jurisdiction,
          revision_number, inspector_user_id, workflow_status,
          submission_intent, started_at, submitted_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', TRUE, $8, $8, $8, $8)
      `,
      [
        principal.companyId,
        payload.submissionId,
        payload.jobId,
        payload.siteId,
        payload.jurisdiction,
        request.entityVersion,
        principal.userId,
        acknowledgedAt,
      ],
    );

    for (const inspection of payload.anchorInspections) {
      const anchorInspectionId = inspection.inspectionId;
      await transaction.query(
        `
          INSERT INTO anchor_inspections (
            company_id, anchor_inspection_id, inspection_id, site_id,
            anchor_id, provisional_anchor_id, identity_confirmation,
            location_confirmed, location, recorded_outcome, exception_reason,
            reconciliation_proposal, disposition, notes,
            proof_test_load, proof_test_hold, proof_test_result,
            proof_test_equipment_reference, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $19
          )
        `,
        [
          principal.companyId,
          anchorInspectionId,
          payload.submissionId,
          payload.siteId,
          inspection.expectedAnchorId,
          inspection.provisionalAnchorId,
          inspection.identityConfirmed ? 'confirmed' : 'not_confirmed',
          inspection.locationConfirmed,
          inspection.location,
          inspection.recordedOutcome,
          inspection.exceptionReason,
          inspection.reconciliationProposal,
          inspection.disposition,
          inspection.notes,
          inspection.proofTestLoad,
          inspection.proofTestHold,
          inspection.proofTestResult,
          inspection.proofTestEquipmentReference,
          acknowledgedAt,
        ],
      );

      if (inspection.observations?.trim()) {
        await transaction.query(
          `
            INSERT INTO observations (
              company_id, observation_id, anchor_inspection_id,
              entered_by_user_id, body, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            principal.companyId,
            stableChildId(
              'observation',
              principal.companyId,
              anchorInspectionId,
            ),
            anchorInspectionId,
            principal.userId,
            inspection.observations,
            acknowledgedAt,
          ],
        );
      }
      if (inspection.defectDescription?.trim()) {
        await transaction.query(
          `
            INSERT INTO defects (
              company_id, defect_id, anchor_inspection_id, description, created_at
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            principal.companyId,
            stableChildId('defect', principal.companyId, anchorInspectionId),
            anchorInspectionId,
            inspection.defectDescription,
            acknowledgedAt,
          ],
        );
      }
      if (inspection.recommendation?.trim()) {
        await transaction.query(
          `
            INSERT INTO recommendations (
              company_id, recommendation_id, anchor_inspection_id,
              action, created_at
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            principal.companyId,
            stableChildId(
              'recommendation',
              principal.companyId,
              anchorInspectionId,
            ),
            anchorInspectionId,
            inspection.recommendation,
            acknowledgedAt,
          ],
        );
      }
      for (const photo of inspection.photos) {
        await this.insertPhotoReference(
          transaction,
          principal.companyId,
          anchorInspectionId,
          photo,
          acknowledgedAt,
        );
      }
    }

    await transaction.query(
      `
        UPDATE jobs
        SET workflow_status = CASE
              WHEN workflow_status IN ('assigned', 'in_progress') THEN 'submitted'
              ELSE workflow_status
            END,
            updated_at = $3
        WHERE company_id = $1 AND job_id = $2
      `,
      [principal.companyId, payload.jobId, acknowledgedAt],
    );
    return true;
  }

  private async insertPhotoReference(
    transaction: SqlTransaction,
    companyId: string,
    anchorInspectionId: string,
    photo: SyncInspectionPhotoPayload,
    acknowledgedAt: Date,
  ): Promise<void> {
    const key = objectKey(companyId, photo.storageReference);
    const objectId = stableChildId('object', companyId, photo.localId);
    const photoId = stableChildId('photo', companyId, photo.localId);
    const byteSize = photo.byteSize ?? 0;
    await transaction.query(
      `
        INSERT INTO object_references (
          company_id, object_id, object_key, content_type, byte_size,
          sha256, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (company_id, object_key) DO NOTHING
      `,
      [
        companyId,
        objectId,
        key,
        photo.contentType ?? 'application/octet-stream',
        byteSize,
        photo.checksum,
        acknowledgedAt,
      ],
    );
    const objectResult = await transaction.query<Record<string, unknown>>(
      `
        SELECT object_id, content_type, byte_size, sha256
        FROM object_references
        WHERE company_id = $1 AND object_key = $2
      `,
      [companyId, key],
    );
    const object = firstRow(objectResult);
    if (
      !object ||
      object.object_id !== objectId ||
      object.content_type !==
        (photo.contentType ?? 'application/octet-stream') ||
      Number(object.byte_size) !== byteSize ||
      object.sha256 !== photo.checksum
    ) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'photo object reference conflicts with existing evidence',
      );
    }

    await transaction.query(
      `
        INSERT INTO photos (
          company_id, photo_id, anchor_inspection_id, object_id, local_id,
          capture_time, upload_state, metadata_policy, created_at
        ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), 'pending_upload', $7, $8)
        ON CONFLICT (company_id, local_id) DO NOTHING
      `,
      [
        companyId,
        photoId,
        anchorInspectionId,
        objectId,
        photo.localId,
        photo.capturedAtEpochMillis,
        JSON.stringify({ captureMetadataVersion: 1 }),
        acknowledgedAt,
      ],
    );
    const photoResult = await transaction.query<Record<string, unknown>>(
      `
        SELECT photo_id, anchor_inspection_id, object_id
        FROM photos
        WHERE company_id = $1 AND local_id = $2
      `,
      [companyId, photo.localId],
    );
    const storedPhoto = firstRow(photoResult);
    if (
      !storedPhoto ||
      storedPhoto.photo_id !== photoId ||
      storedPhoto.anchor_inspection_id !== anchorInspectionId ||
      storedPhoto.object_id !== objectId
    ) {
      throw new SyncFailure(
        'INVALID_INPUT',
        'photo identity conflicts with existing evidence',
      );
    }
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new SyncFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }
    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof SyncFailure) throw error;
      if (isUniqueViolation(error)) {
        throw new SyncFailure(
          'INVALID_INPUT',
          'synchronisation identity conflicts with an existing record',
        );
      }
      throw new SyncFailure(
        'PERSISTENCE_UNAVAILABLE',
        'synchronisation persistence is unavailable',
      );
    }
  }
}
