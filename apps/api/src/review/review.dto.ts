import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  SYNC_DISPOSITIONS,
  SYNC_EXCEPTION_REASONS,
  SYNC_JURISDICTIONS,
  SYNC_RECORDED_OUTCOMES,
  SYNC_RECONCILIATION_PROPOSALS,
} from '../sync/sync.types';
import {
  REVIEW_ISSUE_TYPES,
  SUBMITTED_PHOTO_UPLOAD_STATES,
  type AnchorRecordedOutcome,
  type SubmittedEvidenceAnchor,
  type SubmittedEvidencePhotoMetadata,
  type SubmittedInspectionEvidence,
  type ReviewIssueType,
} from './review.types';

export class CreateReviewIssueDto {
  @ApiProperty({ example: 'inspection-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  inspectionId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-inspection-001' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  anchorInspectionId?: string | null;

  @ApiProperty({ enum: REVIEW_ISSUE_TYPES, example: 'change' })
  @IsString()
  @IsIn(REVIEW_ISSUE_TYPES)
  issueType!: ReviewIssueType;

  @ApiProperty({
    example: 'Please add the missing location evidence before approval.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  reason!: string;
}

export class ResolveReviewIssueDto {
  @ApiProperty({ example: 'Location evidence was added in the next revision.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  reason!: string;
}

export class ReviewIssueResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  reviewIssueId!: string;

  @ApiProperty()
  inspectionId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  anchorInspectionId!: string | null;

  @ApiProperty({ enum: REVIEW_ISSUE_TYPES })
  issueType!: ReviewIssueType;

  @ApiProperty({ enum: ['open', 'resolved'] })
  status!: 'open' | 'resolved';

  @ApiProperty()
  reviewerUserId!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  resolvedAt!: string | null;
}

export class ReviewActionResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  reviewActionId!: string;

  @ApiProperty()
  reviewIssueId!: string;

  @ApiProperty()
  reviewerUserId!: string;

  @ApiProperty({ enum: ['issue_created', 'changes_requested', 'resolved'] })
  action!: 'issue_created' | 'changes_requested' | 'resolved';

  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ReviewIssueResolutionResponseDto {
  @ApiProperty({ type: ReviewIssueResponseDto })
  issue!: ReviewIssueResponseDto;

  @ApiProperty({ example: false })
  replayed!: boolean;
}

export class SubmittedEvidencePhotoDto {
  @ApiProperty({ example: 'photo-001' })
  photoId!: string;

  @ApiProperty({ example: 'photo-001' })
  localId!: string;

  @ApiProperty({ example: 'sha256-photo-001' })
  checksum!: string;

  @ApiProperty({ format: 'date-time' })
  capturedAt!: string;

  @ApiProperty({ enum: SUBMITTED_PHOTO_UPLOAD_STATES, example: 'uploaded' })
  uploadState!: SubmittedEvidencePhotoMetadata['uploadState'];
}

export class SubmittedEvidenceAnchorDto {
  @ApiProperty({ example: 'inspection-anchor-001' })
  anchorInspectionId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-001' })
  expectedAnchorId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'provisional-001' })
  provisionalAnchorId!: string | null;

  @ApiProperty({ example: true })
  identityConfirmed!: boolean;

  @ApiProperty({ example: true })
  locationConfirmed!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'North roof' })
  location!: string | null;

  @ApiProperty({
    enum: SYNC_RECORDED_OUTCOMES,
    nullable: true,
    example: 'serviceable',
  })
  recordedOutcome!: SubmittedEvidenceAnchor['recordedOutcome'];

  @ApiProperty({
    enum: SYNC_EXCEPTION_REASONS,
    nullable: true,
    example: 'inaccessible',
  })
  exceptionReason!: SubmittedEvidenceAnchor['exceptionReason'];

  @ApiProperty({
    enum: SYNC_RECONCILIATION_PROPOSALS,
    nullable: true,
    example: 'newly_discovered',
  })
  reconciliationProposal!: SubmittedEvidenceAnchor['reconciliationProposal'];

  @ApiPropertyOptional({ nullable: true, example: 'anchor-002' })
  reconciliationReferenceId!: string | null;

  @ApiProperty({
    enum: SYNC_DISPOSITIONS,
    nullable: true,
    example: 'removed_from_service',
  })
  disposition!: SubmittedEvidenceAnchor['disposition'];

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  observations!: string | null;

  @ApiPropertyOptional({ nullable: true })
  defectDescription!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recommendation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  proofTestLoad!: string | null;

  @ApiPropertyOptional({ nullable: true })
  proofTestHold!: string | null;

  @ApiPropertyOptional({ nullable: true })
  proofTestResult!: string | null;

  @ApiPropertyOptional({ nullable: true })
  proofTestEquipmentReference!: string | null;

  @ApiProperty({ type: () => [SubmittedEvidencePhotoDto] })
  photos!: SubmittedEvidencePhotoDto[];
}

export class SubmittedInspectionEvidenceResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ example: 'inspection-001' })
  inspectionId!: string;

  @ApiProperty({ minimum: 1, example: 2 })
  revisionNumber!: number;

  @ApiProperty({ minimum: 1, example: 2 })
  latestRevisionNumber!: number;

  @ApiProperty({ enum: ['submitted'], example: 'submitted' })
  workflowStatus!: 'submitted';

  @ApiProperty({ example: 'job-001' })
  jobId!: string;

  @ApiProperty({ example: 'site-001' })
  siteId!: string;

  @ApiProperty({ enum: SYNC_JURISDICTIONS, example: 'NSW' })
  jurisdiction!: SubmittedInspectionEvidence['jurisdiction'];

  @ApiProperty({ minimum: 1, example: 1 })
  jobPackVersion!: number;

  @ApiProperty({ example: 'inspector-001' })
  inspectorUserId!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  evidenceVersion!: number;

  @ApiProperty({ example: true })
  evidenceSynchronised!: boolean;

  @ApiProperty({ minimum: 0, example: 0 })
  pendingPhotoCount!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  failedPhotoCount!: number;

  @ApiProperty({ minimum: 0, example: 32 })
  expectedAnchorCount!: number;

  @ApiProperty({ minimum: 0, example: 13 })
  accountedAnchorCount!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  openBlockerCount!: number;

  @ApiProperty({ minimum: 0, example: 1 })
  openWarningCount!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  openConflictCount!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  openChangeRequestCount!: number;

  @ApiProperty({ type: () => [SubmittedEvidenceAnchorDto] })
  anchors!: SubmittedEvidenceAnchorDto[];
}

export class AnchorRecordedOutcomeDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ example: 'anchor-inspection-001' })
  anchorInspectionId!: string;

  @ApiProperty({ example: 'inspection-001' })
  inspectionId!: string;

  @ApiProperty({ minimum: 1, example: 2 })
  revisionNumber!: number;

  @ApiProperty({ example: 'job-001' })
  jobId!: string;

  @ApiProperty({ example: 'JOB-2026-004' })
  jobReference!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({
    enum: SYNC_RECORDED_OUTCOMES,
    nullable: true,
    example: 'serviceable',
  })
  recordedOutcome!: AnchorRecordedOutcome['recordedOutcome'];

  @ApiProperty({
    enum: SYNC_EXCEPTION_REASONS,
    nullable: true,
    example: 'inaccessible',
  })
  exceptionReason!: AnchorRecordedOutcome['exceptionReason'];

  @ApiProperty({
    enum: SYNC_DISPOSITIONS,
    nullable: true,
    example: 'removed_from_service',
  })
  disposition!: AnchorRecordedOutcome['disposition'];

  @ApiProperty({ type: () => [SubmittedEvidencePhotoDto] })
  photos!: SubmittedEvidencePhotoDto[];
}

export function toAnchorRecordedOutcomeResponse(
  outcome: AnchorRecordedOutcome,
): AnchorRecordedOutcomeDto {
  return {
    companyId: outcome.companyId,
    anchorInspectionId: outcome.anchorInspectionId,
    inspectionId: outcome.inspectionId,
    revisionNumber: outcome.revisionNumber,
    jobId: outcome.jobId,
    jobReference: outcome.jobReference,
    submittedAt: outcome.submittedAt.toISOString(),
    recordedOutcome: outcome.recordedOutcome,
    exceptionReason: outcome.exceptionReason,
    disposition: outcome.disposition,
    photos: outcome.photos.map((photo) => ({ ...photo })),
  };
}

export function toSubmittedInspectionEvidenceResponse(
  evidence: SubmittedInspectionEvidence,
): SubmittedInspectionEvidenceResponseDto {
  return {
    companyId: evidence.companyId,
    inspectionId: evidence.inspectionId,
    revisionNumber: evidence.revisionNumber,
    latestRevisionNumber: evidence.latestRevisionNumber,
    workflowStatus: evidence.workflowStatus,
    jobId: evidence.jobId,
    siteId: evidence.siteId,
    jurisdiction: evidence.jurisdiction,
    jobPackVersion: evidence.jobPackVersion,
    inspectorUserId: evidence.inspectorUserId,
    submittedAt: evidence.submittedAt.toISOString(),
    evidenceVersion: evidence.evidenceVersion,
    evidenceSynchronised: evidence.evidenceSynchronised,
    pendingPhotoCount: evidence.pendingPhotoCount,
    failedPhotoCount: evidence.failedPhotoCount,
    expectedAnchorCount: evidence.expectedAnchorCount,
    accountedAnchorCount: evidence.accountedAnchorCount,
    openBlockerCount: evidence.openBlockerCount,
    openWarningCount: evidence.openWarningCount,
    openConflictCount: evidence.openConflictCount,
    openChangeRequestCount: evidence.openChangeRequestCount,
    anchors: evidence.anchors.map((anchor) => ({
      anchorInspectionId: anchor.anchorInspectionId,
      expectedAnchorId: anchor.expectedAnchorId,
      provisionalAnchorId: anchor.provisionalAnchorId,
      identityConfirmed: anchor.identityConfirmed,
      locationConfirmed: anchor.locationConfirmed,
      location: anchor.location,
      recordedOutcome: anchor.recordedOutcome,
      exceptionReason: anchor.exceptionReason,
      reconciliationProposal: anchor.reconciliationProposal,
      reconciliationReferenceId: anchor.reconciliationReferenceId,
      disposition: anchor.disposition,
      notes: anchor.notes,
      observations: anchor.observations,
      defectDescription: anchor.defectDescription,
      recommendation: anchor.recommendation,
      proofTestLoad: anchor.proofTestLoad,
      proofTestHold: anchor.proofTestHold,
      proofTestResult: anchor.proofTestResult,
      proofTestEquipmentReference: anchor.proofTestEquipmentReference,
      photos: anchor.photos.map((photo) => ({ ...photo })),
    })),
  };
}
