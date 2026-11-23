import { createHash } from 'node:crypto';

import type { AuthPrincipal } from '../identity/auth.types';
import type { ApprovedSnapshotService } from '../approved-snapshot/approved-snapshot-service';
import { ApprovedSnapshotFailure } from '../approved-snapshot/approved-snapshot.types';
import {
  ReportGenerationFailure,
  REPORT_TEMPLATE_VERSION,
  approvedSnapshotHasReportContext,
  assertCanGenerateReports,
  type ReportArtifactObjectStore,
  type ReportClock,
  type ReportGenerationRecord,
  type ReportGenerationStore,
  type ReportIdGenerator,
  type ReportRevisionRecord,
} from './report-generation.types';

const ID_MAX_LENGTH = 128;

export interface ReportGenerationServiceOptions {
  readonly snapshots: ApprovedSnapshotService;
  readonly store: ReportGenerationStore;
  readonly objects: ReportArtifactObjectStore;
  readonly clock: ReportClock;
  readonly idGenerator: ReportIdGenerator;
}

export interface ReportFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly revision: ReportRevisionRecord;
}

export class ReportGenerationService {
  constructor(private readonly options: ReportGenerationServiceOptions) {}

  /**
   * Company-scoped read of draft report generation revisions, optionally
   * filtered to one job. Newest revisions are returned first so the office
   * reports table and dashboard rail can show the latest revision directly.
   */
  async listGenerations(
    principal: AuthPrincipal,
    jobId?: string | null,
  ): Promise<readonly ReportGenerationRecord[]> {
    assertCanGenerateReports(principal);
    const filter = { jobId: optionalId(jobId, 'jobId') };
    const generations = await this.options.store.listGenerations(
      principal.companyId,
      filter,
    );
    return generations
      .filter((generation) => generation.companyId === principal.companyId)
      .map(copyGeneration);
  }

  async request(
    principal: AuthPrincipal,
    snapshotId: string,
  ): Promise<ReportGenerationRecord> {
    assertCanGenerateReports(principal);
    const normalizedSnapshotId = requiredId(snapshotId, 'snapshotId');
    let snapshot;
    try {
      snapshot = await this.options.snapshots.get(
        principal,
        normalizedSnapshotId,
      );
    } catch (error) {
      if (!(error instanceof ApprovedSnapshotFailure)) throw error;
      throw new ReportGenerationFailure(error.code, error.message);
    }
    if (!approvedSnapshotHasReportContext(snapshot)) {
      throw new ReportGenerationFailure(
        'CONFLICT',
        'approved snapshot does not contain frozen report inputs',
      );
    }

    const requestedAt = this.options.clock.now();
    if (Number.isNaN(requestedAt.getTime())) {
      throw new ReportGenerationFailure(
        'PERSISTENCE_UNAVAILABLE',
        'report generation clock returned an invalid time',
      );
    }

    const idempotencyKey = createHash('sha256')
      .update(
        `${principal.companyId}\u0000${snapshot.snapshotId}\u0000${REPORT_TEMPLATE_VERSION}`,
        'utf8',
      )
      .digest('hex');
    return this.options.store.enqueue({
      companyId: principal.companyId,
      generationId: requiredId(
        this.options.idGenerator.createId(),
        'generationId',
      ),
      idempotencyKey,
      reportId: requiredId(this.options.idGenerator.createId(), 'reportId'),
      reportRevisionId: requiredId(
        this.options.idGenerator.createId(),
        'reportRevisionId',
      ),
      snapshot,
      templateVersion: REPORT_TEMPLATE_VERSION,
      createdByUserId: principal.userId,
      reviewedByUserId: snapshot.approvedByUserId,
      requestedAt,
    });
  }

  async getGeneration(
    principal: AuthPrincipal,
    generationId: string,
  ): Promise<ReportGenerationRecord> {
    assertCanGenerateReports(principal);
    const normalizedGenerationId = requiredId(generationId, 'generationId');
    const record = await this.options.store.findGeneration(
      principal.companyId,
      normalizedGenerationId,
    );
    if (!record || record.companyId !== principal.companyId) {
      throw new ReportGenerationFailure(
        'NOT_FOUND',
        'report generation was not found',
      );
    }
    return record;
  }

  async getFile(
    principal: AuthPrincipal,
    generationId: string,
  ): Promise<ReportFile> {
    const generation = await this.getGeneration(principal, generationId);
    if (generation.status !== 'completed') {
      throw new ReportGenerationFailure(
        'CONFLICT',
        'draft report revision is not available yet',
      );
    }
    const revision = await this.options.store.findRevision(
      principal.companyId,
      generation.reportRevisionId,
    );
    if (!revision) {
      throw new ReportGenerationFailure(
        'PERSISTENCE_UNAVAILABLE',
        'completed report revision metadata is unavailable',
      );
    }
    const bytes = await this.options.objects.read(revision.objectKey);
    if (
      !bytes ||
      bytes.byteLength !== revision.byteSize ||
      createHash('sha256').update(bytes).digest('hex') !== revision.sha256
    ) {
      throw new ReportGenerationFailure(
        'PERSISTENCE_UNAVAILABLE',
        'private report bytes failed their stored integrity check',
      );
    }
    return {
      bytes,
      filename: `draft-inspection-${revision.reportRevisionId}.pdf`,
      revision,
    };
  }
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ReportGenerationFailure('INVALID_INPUT', `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > ID_MAX_LENGTH) {
    throw new ReportGenerationFailure(
      'INVALID_INPUT',
      `${field} must be between 1 and ${ID_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  return requiredId(value, field);
}

function copyGeneration(
  generation: ReportGenerationRecord,
): ReportGenerationRecord {
  return {
    ...generation,
    requestedAt: new Date(generation.requestedAt.getTime()),
    completedAt: generation.completedAt
      ? new Date(generation.completedAt.getTime())
      : null,
  };
}
