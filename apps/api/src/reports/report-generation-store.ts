import { ReportGenerationFailure } from './report-generation.types';
import type {
  EnqueueReportGenerationInput,
  ReportArtifactMetadata,
  ReportGenerationClaim,
  ReportGenerationListFilter,
  ReportGenerationRecord,
  ReportGenerationStore,
  ReportRevisionRecord,
} from './report-generation.types';

export class UnconfiguredReportGenerationStore
  implements ReportGenerationStore
{
  private unavailable(): never {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report generation persistence is not configured',
    );
  }

  enqueue(
    _input: EnqueueReportGenerationInput,
  ): Promise<ReportGenerationRecord> {
    return Promise.reject(this.unavailable());
  }

  findGeneration(
    _companyId: string,
    _generationId: string,
  ): Promise<ReportGenerationRecord | undefined> {
    return Promise.reject(this.unavailable());
  }

  listGenerations(
    _companyId: string,
    _filter: ReportGenerationListFilter,
  ): Promise<readonly ReportGenerationRecord[]> {
    return Promise.reject(this.unavailable());
  }

  claimNext(
    _companyId: string,
    _now: Date,
    _leaseToken: string,
    _leaseDurationMs: number,
  ): Promise<ReportGenerationClaim | undefined> {
    return Promise.reject(this.unavailable());
  }

  complete(
    _claim: ReportGenerationClaim,
    _artifact: ReportArtifactMetadata,
    _completedAt: Date,
  ): Promise<ReportRevisionRecord | undefined> {
    return Promise.reject(this.unavailable());
  }

  fail(
    _claim: ReportGenerationClaim,
    _failureCode: string,
    _retryable: boolean,
    _at: Date,
  ): Promise<void> {
    return Promise.reject(this.unavailable());
  }

  findRevision(
    _companyId: string,
    _reportRevisionId: string,
  ): Promise<ReportRevisionRecord | undefined> {
    return Promise.reject(this.unavailable());
  }
}
