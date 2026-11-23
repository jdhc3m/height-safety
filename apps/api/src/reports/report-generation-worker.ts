import { createHash } from 'node:crypto';

import type {
  ApprovedSnapshot,
  ApprovedSnapshotStore,
} from '../approved-snapshot/approved-snapshot.types';
import {
  ReportGenerationFailure,
  ReportRenderFailure,
  type ReportArtifactObjectStore,
  type ReportClock,
  type ReportGenerationStore,
  type ReportIdGenerator,
  type ReportPhoto,
  type ReportPhotoReader,
  type ReportRenderer,
} from './report-generation.types';
import {
  assertReportRenderTimeRemaining,
  createReportRenderDeadline,
  withReportRenderDeadline,
} from './report-render-deadline';
import {
  approvedSnapshotHasReportContext,
  generationPhotoObjectKey,
} from './report-generation.types';

const REPORT_LEASE_MS = 180_000;
const MAX_REPORT_BYTES = 25 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ReportWorkerOutcome =
  | 'idle'
  | 'completed'
  | 'superseded'
  | 'failed'
  | 'retry_scheduled';

export interface ReportGenerationWorkerOptions {
  readonly store: ReportGenerationStore;
  readonly snapshots: ApprovedSnapshotStore;
  readonly photoReader: ReportPhotoReader;
  readonly objects: ReportArtifactObjectStore;
  readonly renderer: ReportRenderer;
  readonly clock: ReportClock;
  readonly idGenerator: ReportIdGenerator;
  /** A shorter limit is injectable for tests; production uses the spike's 60 seconds. */
  readonly renderTimeoutMs?: number;
}

export class ReportGenerationWorker {
  constructor(private readonly options: ReportGenerationWorkerOptions) {}

  async runOnce(companyId: string): Promise<ReportWorkerOutcome> {
    const claimed = await this.options.store.claimNext(
      companyId,
      this.options.clock.now(),
      this.options.idGenerator.createId(),
      REPORT_LEASE_MS,
    );
    if (!claimed) return 'idle';
    const renderDeadline = createReportRenderDeadline(
      this.options.renderTimeoutMs,
    );

    try {
      const snapshot = await withReportRenderDeadline(
        renderDeadline,
        'approved snapshot read',
        () =>
          this.options.snapshots.findById(
            claimed.companyId,
            claimed.snapshotId,
          ),
      );
      if (
        !snapshot ||
        snapshot.sha256 !== claimed.snapshotSha256 ||
        snapshot.jobId !== claimed.jobId ||
        snapshot.sourceInspectionId !== claimed.sourceInspectionId ||
        snapshot.sourceInspectionRevision !==
          claimed.sourceInspectionRevision ||
        snapshot.jurisdiction !== claimed.jurisdiction ||
        !approvedSnapshotHasReportContext(snapshot)
      ) {
        throw new ReportRenderFailure(
          'APPROVED_SNAPSHOT_INVALID',
          'queued report source does not match its approved snapshot',
          false,
        );
      }
      if (claimed.revisionNumber === null) {
        throw new ReportGenerationFailure(
          'PERSISTENCE_UNAVAILABLE',
          'report queue did not reserve a revision number',
        );
      }

      const photos = await this.readApprovedPhotos(snapshot, renderDeadline);
      assertReportRenderTimeRemaining(
        renderDeadline,
        'report input preparation',
      );
      const generationAt = claimed.requestedAt.toISOString();
      const pdf = await this.options.renderer.render({
        document: snapshot.document,
        revisionNumber: claimed.revisionNumber,
        templateVersion: claimed.templateVersion,
        generationAt,
        photos,
        renderDeadline,
      });
      if (pdf.byteLength === 0 || pdf.byteLength > MAX_REPORT_BYTES) {
        throw new ReportRenderFailure(
          pdf.byteLength === 0 ? 'PDF_INVALID' : 'PDF_TOO_LARGE',
          'rendered report size is outside the supported range',
          false,
        );
      }
      if (!Buffer.from(pdf).subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new ReportRenderFailure(
          'PDF_INVALID',
          'renderer did not return a PDF document',
          false,
        );
      }

      const sha256 = createHash('sha256').update(pdf).digest('hex');
      const objectId = `report-object-${claimed.reportRevisionId}`;
      const objectKey = `${claimed.companyId}/reports/${claimed.reportRevisionId}.pdf`;
      await this.options.objects.putIfAbsent(objectKey, pdf, sha256);
      const revision = await this.options.store.complete(
        claimed,
        { objectId, objectKey, sha256, byteSize: pdf.byteLength },
        this.options.clock.now(),
      );
      return !revision || revision.supersededAt ? 'superseded' : 'completed';
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'workerTerminationRequired' in error &&
        error.workerTerminationRequired === true
      ) {
        // A renderer process that cannot terminate must be killed by the
        // worker entry point; do not release its lease while Chromium may still
        // be producing output.
        throw error;
      }
      const failure = failureDetails(error);
      await this.options.store.fail(
        claimed,
        failure.code,
        failure.retryable,
        this.options.clock.now(),
      );
      return failure.retryScheduled ? 'retry_scheduled' : 'failed';
    }
  }

  private async readApprovedPhotos(
    snapshot: ApprovedSnapshot,
    renderDeadline: ReturnType<typeof createReportRenderDeadline>,
  ): Promise<ReadonlyMap<string, ReportPhoto>> {
    const photos = new Map<string, ReportPhoto>();
    for (const anchor of snapshot.document.inspectionSubmission
      .anchorInspections) {
      for (const photo of anchor.photos) {
        const objectKey = generationPhotoObjectKey(snapshot.companyId, photo);
        const bytes = await withReportRenderDeadline(
          renderDeadline,
          'approved photo read',
          (signal) => this.options.photoReader.read(objectKey, signal),
        );
        if (!bytes) {
          throw new ReportRenderFailure(
            'PHOTO_UNAVAILABLE',
            'an approved photo is missing from private storage',
            true,
          );
        }
        assertReportRenderTimeRemaining(renderDeadline, 'photo verification');
        const actualSha256 = createHash('sha256').update(bytes).digest('hex');
        if (actualSha256 !== photo.checksum) {
          throw new ReportRenderFailure(
            'PHOTO_CHECKSUM_MISMATCH',
            'an approved photo failed its checksum check',
            false,
          );
        }
        if (photo.byteSize !== null && bytes.byteLength !== photo.byteSize) {
          throw new ReportRenderFailure(
            'PHOTO_CHECKSUM_MISMATCH',
            'an approved photo size does not match its frozen metadata',
            false,
          );
        }
        const contentType = photo.contentType ?? 'image/jpeg';
        if (!ACCEPTED_PHOTO_TYPES.has(contentType)) {
          throw new ReportRenderFailure(
            'UNSUPPORTED_PHOTO_TYPE',
            'an approved photo uses an unsupported media type',
            false,
          );
        }
        photos.set(photo.localId, {
          localId: photo.localId,
          contentType,
          capturedAtEpochMillis: photo.capturedAtEpochMillis,
          checksum: photo.checksum,
          bytes,
        });
      }
    }
    return photos;
  }
}

function failureDetails(error: unknown): {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryScheduled: boolean;
} {
  if (error instanceof ReportRenderFailure) {
    return {
      code: error.failureCode,
      retryable: error.retryable,
      retryScheduled: error.retryable,
    };
  }
  if (error instanceof ReportGenerationFailure) {
    return {
      code: error.code,
      retryable: error.code === 'PERSISTENCE_UNAVAILABLE',
      retryScheduled: error.code === 'PERSISTENCE_UNAVAILABLE',
    };
  }
  return {
    code: 'RENDERER_UNAVAILABLE',
    retryable: true,
    retryScheduled: true,
  };
}
