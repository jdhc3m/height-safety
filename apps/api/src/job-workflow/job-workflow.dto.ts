import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  ASSIGNMENT_TYPES,
  JOB_WORKFLOW_STATUSES,
  type AssignmentType,
  type JobWorkflowStatus,
} from './job-workflow.types';
import {
  AnchorResponseDto,
  SiteResponseDto,
} from '../site-register/site-register.dto';

export class CreateJobDto {
  @ApiProperty({ example: 'site-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  siteId!: string;

  @ApiProperty({ example: 'JOB-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  reference!: string;

  @ApiPropertyOptional({
    format: 'date',
    nullable: true,
    example: '2026-09-15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  plannedDate?: string | null;
}

export class AssignJobDto {
  @ApiProperty({ example: 'inspector-user-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  inspectorUserId!: string;
}

export class JobAssignmentResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  assignmentId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  inspectorUserId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  assignedByUserId!: string | null;

  @ApiProperty({ enum: ASSIGNMENT_TYPES })
  assignmentType!: AssignmentType;

  @ApiProperty({ example: true })
  isPrimary!: true;

  @ApiProperty({ format: 'date-time' })
  assignedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  claimedAt!: string | null;
}

export class JobResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  siteId!: string;

  @ApiProperty({ enum: ['NSW', 'QLD'] })
  jurisdiction!: 'NSW' | 'QLD';

  @ApiProperty()
  reference!: string;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  plannedDate!: string | null;

  @ApiProperty({ enum: JOB_WORKFLOW_STATUSES })
  workflowStatus!: JobWorkflowStatus;

  @ApiProperty({ example: 1 })
  jobPackVersion!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: JobAssignmentResponseDto,
  })
  assignment!: JobAssignmentResponseDto | null;
}

export class JobPackResponseDto {
  @ApiProperty({ type: JobResponseDto })
  job!: JobResponseDto;

  @ApiProperty({ type: SiteResponseDto })
  site!: SiteResponseDto;

  @ApiProperty({ type: [AnchorResponseDto] })
  anchors!: readonly AnchorResponseDto[];
}
