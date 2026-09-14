import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { REVIEW_ISSUE_TYPES, type ReviewIssueType } from './review.types';

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
