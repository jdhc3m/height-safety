import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import {
  REPORT_GENERATION_STATUSES,
  type ReportGenerationRecord,
} from './report-generation.types';

export class RequestReportGenerationDto {
  @ApiProperty({ example: 'snapshot-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  snapshotId!: string;
}

export class ReportGenerationResponseDto {
  @ApiProperty()
  generationId!: string;

  @ApiProperty()
  reportRevisionId!: string;

  @ApiProperty()
  snapshotId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: ['NSW', 'QLD'] })
  jurisdiction!: 'NSW' | 'QLD';

  @ApiProperty()
  templateVersion!: string;

  @ApiProperty({ enum: REPORT_GENERATION_STATUSES })
  status!: ReportGenerationRecord['status'];

  @ApiPropertyOptional({ nullable: true })
  revisionNumber!: number | null;

  @ApiProperty()
  attemptCount!: number;

  @ApiPropertyOptional({ nullable: true })
  lastFailureCode!: string | null;

  @ApiProperty({ format: 'date-time' })
  requestedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completedAt!: string | null;
}

export function toReportGenerationResponse(
  generation: ReportGenerationRecord,
): ReportGenerationResponseDto {
  return {
    generationId: generation.generationId,
    reportRevisionId: generation.reportRevisionId,
    snapshotId: generation.snapshotId,
    jobId: generation.jobId,
    jurisdiction: generation.jurisdiction,
    templateVersion: generation.templateVersion,
    status: generation.status,
    revisionNumber: generation.revisionNumber,
    attemptCount: generation.attemptCount,
    lastFailureCode: generation.lastFailureCode,
    requestedAt: generation.requestedAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
  };
}
