import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  authenticateSession,
  toAuthHttpException,
} from '../identity/auth-http';
import { AuthService } from '../identity/auth-service';
import {
  AnchorRecordedOutcomeDto,
  CreateReviewIssueDto,
  ResolveReviewIssueDto,
  ReviewActionResponseDto,
  ReviewIssueResolutionResponseDto,
  ReviewIssueResponseDto,
  SubmittedInspectionEvidenceResponseDto,
  toAnchorRecordedOutcomeResponse,
  toSubmittedInspectionEvidenceResponse,
} from './review.dto';
import { ReviewFailure } from './review.types';
import { ReviewService } from './review-service';

function toIssueResponse(
  issue: Awaited<ReturnType<ReviewService['createIssue']>>,
): ReviewIssueResponseDto {
  return {
    companyId: issue.companyId,
    reviewIssueId: issue.reviewIssueId,
    inspectionId: issue.inspectionId,
    anchorInspectionId: issue.anchorInspectionId,
    issueType: issue.issueType,
    status: issue.status,
    reviewerUserId: issue.reviewerUserId,
    reason: issue.reason,
    createdAt: issue.createdAt.toISOString(),
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
  };
}

function toActionResponse(
  action: Awaited<ReturnType<ReviewService['listActions']>>[number],
): ReviewActionResponseDto {
  return {
    companyId: action.companyId,
    reviewActionId: action.reviewActionId,
    reviewIssueId: action.reviewIssueId,
    reviewerUserId: action.reviewerUserId,
    action: action.action,
    reason: action.reason,
    createdAt: action.createdAt.toISOString(),
  };
}

export function toReviewHttpException(error: unknown): never {
  if (!(error instanceof ReviewFailure)) {
    return toAuthHttpException(error);
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      throw new BadRequestException(error.message);
    case 'NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'CONFLICT':
      throw new ConflictException(error.message);
    case 'ROLE_FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'PERSISTENCE_UNAVAILABLE':
      throw new ServiceUnavailableException();
  }

  throw new InternalServerErrorException();
}

@ApiTags('review')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly authService: AuthService,
    private readonly reviewService: ReviewService,
  ) {}

  @Post('issues')
  @ApiOperation({
    operationId: 'createReviewIssue',
    summary: 'Record an append-only office review issue or change request',
  })
  @ApiResponse({ status: 201, type: ReviewIssueResponseDto })
  async createIssue(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: CreateReviewIssueDto,
  ): Promise<ReviewIssueResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toIssueResponse(
        await this.reviewService.createIssue(principal, input),
      );
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Get('inspections/:inspectionId/issues')
  @ApiOperation({
    operationId: 'listReviewIssues',
    summary: 'List review issues for one submitted inspection revision',
  })
  @ApiOkResponse({ type: [ReviewIssueResponseDto] })
  async listIssues(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('inspectionId') inspectionId: string,
  ): Promise<readonly ReviewIssueResponseDto[]> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return (await this.reviewService.listIssues(principal, inspectionId)).map(
        toIssueResponse,
      );
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Get('inspections/:inspectionId/evidence')
  @ApiOperation({
    operationId: 'getSubmittedInspectionEvidence',
    summary:
      'Read one submitted inspection revision, its anchor evidence and photo metadata',
  })
  @ApiOkResponse({ type: SubmittedInspectionEvidenceResponseDto })
  async getEvidence(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('inspectionId') inspectionId: string,
  ): Promise<SubmittedInspectionEvidenceResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toSubmittedInspectionEvidenceResponse(
        await this.reviewService.getSubmittedEvidence(principal, inspectionId),
      );
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Get('anchors/:anchorId/recorded-outcomes')
  @ApiOperation({
    operationId: 'listAnchorRecordedOutcomes',
    summary:
      'List recorded outcomes for one register anchor across its submitted inspection revisions, newest first',
  })
  @ApiOkResponse({ type: [AnchorRecordedOutcomeDto] })
  async listAnchorRecordedOutcomes(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('anchorId') anchorId: string,
  ): Promise<readonly AnchorRecordedOutcomeDto[]> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return (
        await this.reviewService.listAnchorRecordedOutcomes(principal, anchorId)
      ).map(toAnchorRecordedOutcomeResponse);
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Get('anchor-inspections/:anchorInspectionId/previous-revision')
  @ApiOperation({
    operationId: 'getPreviousAnchorInspectionRevision',
    summary:
      'Read the submitted inspection revision recorded immediately before one anchor inspection',
  })
  @ApiOkResponse({ type: AnchorRecordedOutcomeDto })
  async getPreviousAnchorRevision(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('anchorInspectionId') anchorInspectionId: string,
  ): Promise<AnchorRecordedOutcomeDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toAnchorRecordedOutcomeResponse(
        await this.reviewService.getPreviousAnchorRevision(
          principal,
          anchorInspectionId,
        ),
      );
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Get('issues/:reviewIssueId/actions')
  @ApiOperation({
    operationId: 'listReviewActions',
    summary: 'List append-only actions for one review issue',
  })
  @ApiOkResponse({ type: [ReviewActionResponseDto] })
  async listActions(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('reviewIssueId') reviewIssueId: string,
  ): Promise<readonly ReviewActionResponseDto[]> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return (
        await this.reviewService.listActions(principal, reviewIssueId)
      ).map(toActionResponse);
    } catch (error) {
      return toReviewHttpException(error);
    }
  }

  @Post('issues/:reviewIssueId/resolve')
  @ApiOperation({
    operationId: 'resolveReviewIssue',
    summary: 'Record a reasoned resolution without changing inspector evidence',
  })
  @ApiResponse({ status: 201, type: ReviewIssueResolutionResponseDto })
  async resolveIssue(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('reviewIssueId') reviewIssueId: string,
    @Body() input: ResolveReviewIssueDto,
  ): Promise<ReviewIssueResolutionResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const result = await this.reviewService.resolveIssue(
        principal,
        reviewIssueId,
        input.reason,
      );
      return {
        issue: toIssueResponse(result.issue),
        replayed: result.replayed,
      };
    } catch (error) {
      return toReviewHttpException(error);
    }
  }
}
