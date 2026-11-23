import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApproveInspectionDto {
  @ApiProperty({ example: 'inspection-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  inspectionId!: string;
}

export class ApprovedSnapshotResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  snapshotId!: string;

  @ApiProperty()
  approvalId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  siteId!: string;

  @ApiProperty({ enum: ['NSW', 'QLD'] })
  jurisdiction!: 'NSW' | 'QLD';

  @ApiProperty()
  sourceInspectionId!: string;

  @ApiProperty()
  sourceInspectionRevision!: number;

  @ApiProperty()
  sourceEvidenceVersion!: number;

  @ApiProperty()
  approvedByUserId!: string;

  @ApiProperty({ format: 'date-time' })
  approvedAt!: string;

  @ApiProperty()
  sourceIdentitySha256!: string;

  @ApiProperty()
  sha256!: string;
}

export class ApproveInspectionResponseDto {
  @ApiProperty({ type: ApprovedSnapshotResponseDto })
  snapshot!: ApprovedSnapshotResponseDto;

  @ApiProperty({ example: false })
  replayed!: boolean;
}
