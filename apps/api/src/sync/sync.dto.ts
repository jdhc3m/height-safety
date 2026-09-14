import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  SYNC_DISPOSITIONS,
  SYNC_CONFLICT_REASONS,
  SYNC_EXCEPTION_REASONS,
  SYNC_JURISDICTIONS,
  SYNC_MUTATION_ENTITY_TYPES,
  SYNC_MUTATION_OPERATIONS,
  SYNC_MUTATION_STATES,
  SYNC_RECONCILIATION_PROPOSALS,
  SYNC_RECORDED_OUTCOMES,
  type SyncConflictReason,
  type SyncMutationEntityType,
  type SyncMutationOperation,
  type SyncMutationState,
} from './sync.types';

const OPTIONAL_TEXT_MAX_LENGTH = 10_000;

export class SyncInspectionPhotoPayloadDto {
  @ApiProperty({ example: 'photo-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  localId!: string;

  @ApiProperty({ example: 'anchor-photos/photo-001.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  storageReference!: string;

  @ApiProperty({ minimum: 0, example: 1_725_000_000_000 })
  @IsInt()
  @Min(0)
  capturedAtEpochMillis!: number;

  @ApiProperty({ example: 'sha256-photo-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  checksum!: string;

  @ApiPropertyOptional({ nullable: true, example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentType!: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, example: 2048 })
  @IsOptional()
  @IsInt()
  @Min(0)
  byteSize!: number | null;
}

export class SyncAnchorInspectionPayloadDto {
  @ApiProperty({ example: 'inspection-anchor-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  inspectionId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-001' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  expectedAnchorId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'provisional-001' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  provisionalAnchorId!: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  identityConfirmed!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  locationConfirmed!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'North roof' })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  location!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'No visible damage.' })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  observations!: string | null;

  @ApiPropertyOptional({ enum: SYNC_RECORDED_OUTCOMES, nullable: true })
  @IsOptional()
  @IsIn(SYNC_RECORDED_OUTCOMES)
  recordedOutcome!: string | null;

  @ApiPropertyOptional({ enum: SYNC_EXCEPTION_REASONS, nullable: true })
  @IsOptional()
  @IsIn(SYNC_EXCEPTION_REASONS)
  exceptionReason!: string | null;

  @ApiPropertyOptional({ enum: SYNC_RECONCILIATION_PROPOSALS, nullable: true })
  @IsOptional()
  @IsIn(SYNC_RECONCILIATION_PROPOSALS)
  reconciliationProposal!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'anchor-002' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  reconciliationReferenceId!: string | null;

  @ApiPropertyOptional({ enum: SYNC_DISPOSITIONS, nullable: true })
  @IsOptional()
  @IsIn(SYNC_DISPOSITIONS)
  disposition!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  defectDescription!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  recommendation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  proofTestLoad!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  proofTestHold!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  proofTestResult!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(OPTIONAL_TEXT_MAX_LENGTH)
  proofTestEquipmentReference!: string | null;

  @ApiProperty({ type: () => [SyncInspectionPhotoPayloadDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncInspectionPhotoPayloadDto)
  photos!: SyncInspectionPhotoPayloadDto[];
}

export class SyncInspectionSubmissionPayloadDto {
  @ApiProperty({ example: 'company-a' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  companyId!: string;

  @ApiProperty({ example: 'job-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  jobId!: string;

  @ApiProperty({ example: 'site-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  siteId!: string;

  @ApiProperty({ enum: SYNC_JURISDICTIONS, example: 'NSW' })
  @IsIn(SYNC_JURISDICTIONS)
  jurisdiction!: string;

  @ApiProperty({ example: 'submission-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  submissionId!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  jobPackVersion!: number;

  @ApiProperty({ type: () => [SyncAnchorInspectionPayloadDto] })
  @IsArray()
  @ArrayMaxSize(1_000)
  @ValidateNested({ each: true })
  @Type(() => SyncAnchorInspectionPayloadDto)
  anchorInspections!: SyncAnchorInspectionPayloadDto[];
}

export class SyncMutationRequestDto {
  @ApiProperty({ example: 'mutation-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  mutationId!: string;

  @ApiProperty({ example: 'mutation-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  @ApiProperty({ enum: SYNC_MUTATION_OPERATIONS, example: 'submit_inspection' })
  @IsIn(SYNC_MUTATION_OPERATIONS)
  operation!: SyncMutationOperation;

  @ApiProperty({
    enum: SYNC_MUTATION_ENTITY_TYPES,
    example: 'inspection_submission',
  })
  @IsIn(SYNC_MUTATION_ENTITY_TYPES)
  entityType!: SyncMutationEntityType;

  @ApiProperty({ example: 'submission-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  entityId!: string;

  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  expectedEntityVersion!: number;

  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  entityVersion!: number;

  @ApiPropertyOptional({
    type: () => SyncInspectionSubmissionPayloadDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncInspectionSubmissionPayloadDto)
  payload!: SyncInspectionSubmissionPayloadDto | null;
}

export class PhotoUploadChunkDto {
  @ApiProperty({ example: 'photo-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  mediaId!: string;

  @ApiProperty({ example: 'photo-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  localId!: string;

  @ApiProperty({ example: 'company-a/anchor-photos/photo-001.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  storageReference!: string;

  @ApiProperty({ example: 'sha256-photo-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  checksum!: string;

  @ApiPropertyOptional({ nullable: true, example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentType!: string | null;

  @ApiProperty({ minimum: 1, example: 2048 })
  @IsInt()
  @Min(1)
  totalBytes!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  offset!: number;

  @ApiProperty({ description: 'Base64 encoded bytes for this chunk.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700_000)
  bytesBase64!: string;
}

export class PhotoUploadChunkResponseDto {
  @ApiProperty({ example: 'photo-001' })
  mediaId!: string;

  @ApiProperty({ minimum: 0, example: 2048 })
  nextOffset!: number;

  @ApiProperty({ example: true })
  uploaded!: boolean;
}

export class SyncMutationConflictDto {
  @ApiProperty({ example: 'conflict-001' })
  conflictId!: string;

  @ApiProperty({
    enum: SYNC_CONFLICT_REASONS,
    example: 'expected_version_mismatch',
  })
  reason!: SyncConflictReason;

  @ApiProperty({ minimum: 0, example: 0 })
  expectedEntityVersion!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 0, example: 1 })
  currentEntityVersion!: number | null;

  @ApiProperty({
    example: 'Server entity version changed before this mutation was received.',
  })
  message!: string;
}

export class SyncMutationResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  mutationId!: string;

  @ApiProperty()
  idempotencyKey!: string;

  @ApiProperty({ enum: SYNC_MUTATION_STATES, example: 'synchronised' })
  state!: SyncMutationState;

  @ApiPropertyOptional({ nullable: true, minimum: 0, example: 1 })
  serverEntityVersion!: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  acknowledgedAt!: string | null;

  @ApiProperty({ example: true })
  payloadApplied!: boolean;

  @ApiProperty({ example: false })
  replayed!: boolean;

  @ApiPropertyOptional({ type: SyncMutationConflictDto, nullable: true })
  conflict!: SyncMutationConflictDto | null;
}
