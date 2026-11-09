import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  SYNC_JURISDICTIONS,
  SYNC_RECONCILIATION_PROPOSALS,
  SYNC_RECORDED_OUTCOMES,
} from '../sync/sync.types';
import {
  RECONCILIATION_DECISION_ACTIONS,
  type ReconciliationDecisionAction,
  type RegisterProposalDecisionRecord,
  type RegisterProposalPhoto,
  type RegisterReconciliationProposal,
} from './register-reconciliation.types';

export class DecideReconciliationProposalDto {
  @ApiProperty({ enum: RECONCILIATION_DECISION_ACTIONS, example: 'accept' })
  @IsString()
  @IsIn(RECONCILIATION_DECISION_ACTIONS)
  decision!: ReconciliationDecisionAction;

  @ApiPropertyOptional({ nullable: true, example: 'A-12' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignedLabel?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'North roof, plant room access',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  location?: string | null;

  @ApiPropertyOptional({ example: 'Duplicate of the existing A-05 record.' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  reason?: string;
}

export class ReconciliationProposalPhotoDto {
  @ApiProperty({ example: 'photo-001' })
  photoId!: string;

  @ApiProperty({ example: 'photo-001' })
  localId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'sha256-photo-001' })
  checksum!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  capturedAt!: string | null;

  @ApiProperty({
    enum: ['pending_upload', 'uploaded', 'failed'],
    example: 'uploaded',
  })
  uploadState!: RegisterProposalPhoto['uploadState'];
}

export class ReconciliationProposalResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ example: 'anchor-inspection-001' })
  proposalId!: string;

  @ApiProperty({ example: 'inspection-001' })
  inspectionId!: string;

  @ApiProperty({ minimum: 1, example: 2 })
  revisionNumber!: number;

  @ApiProperty({ example: 'job-001' })
  jobId!: string;

  @ApiProperty({ example: 'site-001' })
  siteId!: string;

  @ApiProperty({ enum: SYNC_JURISDICTIONS, example: 'NSW' })
  jurisdiction!: RegisterReconciliationProposal['jurisdiction'];

  @ApiProperty({
    enum: SYNC_RECONCILIATION_PROPOSALS,
    example: 'newly_discovered',
  })
  proposalType!: RegisterReconciliationProposal['proposalType'];

  @ApiPropertyOptional({ nullable: true, example: 'provisional-001' })
  provisionalAnchorId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-002' })
  reconciliationReferenceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  inspectorNote!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'North roof' })
  recordedLocation!: string | null;

  @ApiProperty({
    enum: SYNC_RECORDED_OUTCOMES,
    nullable: true,
    example: 'serviceable',
  })
  recordedOutcome!: RegisterReconciliationProposal['recordedOutcome'];

  @ApiProperty({ example: 'inspector-001' })
  submittedByUserId!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ type: () => [ReconciliationProposalPhotoDto] })
  photos!: ReconciliationProposalPhotoDto[];
}

export class ReconciliationProposalDecisionResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  proposalDecisionId!: string;

  @ApiProperty({ example: 'anchor-inspection-001' })
  proposalId!: string;

  @ApiProperty({ example: 'inspection-001' })
  inspectionId!: string;

  @ApiProperty({ example: 'site-001' })
  siteId!: string;

  @ApiProperty({
    enum: SYNC_RECONCILIATION_PROPOSALS,
    example: 'newly_discovered',
  })
  proposalType!: RegisterProposalDecisionRecord['proposalType'];

  @ApiProperty({ enum: ['accepted', 'rejected'], example: 'accepted' })
  decision!: RegisterProposalDecisionRecord['decision'];

  @ApiProperty()
  decidedByUserId!: string;

  @ApiProperty({ format: 'date-time' })
  decidedAt!: string;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-009' })
  registerAnchorId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'A-12' })
  assignedLabel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedLocation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reason!: string | null;

  @ApiProperty({ example: false })
  replayed!: boolean;
}

function toPhotoResponse(
  photo: RegisterProposalPhoto,
): ReconciliationProposalPhotoDto {
  return {
    photoId: photo.photoId,
    localId: photo.localId,
    checksum: photo.checksum,
    capturedAt: photo.capturedAt,
    uploadState: photo.uploadState,
  };
}

export function toReconciliationProposalResponse(
  proposal: RegisterReconciliationProposal,
): ReconciliationProposalResponseDto {
  return {
    companyId: proposal.companyId,
    proposalId: proposal.proposalId,
    inspectionId: proposal.inspectionId,
    revisionNumber: proposal.revisionNumber,
    jobId: proposal.jobId,
    siteId: proposal.siteId,
    jurisdiction: proposal.jurisdiction,
    proposalType: proposal.proposalType,
    provisionalAnchorId: proposal.provisionalAnchorId,
    reconciliationReferenceId: proposal.reconciliationReferenceId,
    inspectorNote: proposal.inspectorNote,
    recordedLocation: proposal.recordedLocation,
    recordedOutcome: proposal.recordedOutcome,
    submittedByUserId: proposal.submittedByUserId,
    submittedAt: proposal.submittedAt.toISOString(),
    photos: proposal.photos.map(toPhotoResponse),
  };
}

export function toReconciliationProposalDecisionResponse(
  decision: RegisterProposalDecisionRecord,
  replayed: boolean,
): ReconciliationProposalDecisionResponseDto {
  return {
    companyId: decision.companyId,
    proposalDecisionId: decision.proposalDecisionId,
    proposalId: decision.proposalId,
    inspectionId: decision.inspectionId,
    siteId: decision.siteId,
    proposalType: decision.proposalType,
    decision: decision.decision,
    decidedByUserId: decision.decidedByUserId,
    decidedAt: decision.decidedAt.toISOString(),
    registerAnchorId: decision.registerAnchorId,
    assignedLabel: decision.assignedLabel,
    assignedLocation: decision.assignedLocation,
    reason: decision.reason,
    replayed,
  };
}
