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
  ApproveInspectionDto,
  ApproveInspectionResponseDto,
  ApprovedSnapshotResponseDto,
} from './approved-snapshot.dto';
import { ApprovedSnapshotService } from './approved-snapshot-service';
import {
  ApprovedSnapshotFailure,
  type ApprovedSnapshot,
} from './approved-snapshot.types';

function toSnapshotResponse(
  snapshot: ApprovedSnapshot,
): ApprovedSnapshotResponseDto {
  return {
    companyId: snapshot.companyId,
    snapshotId: snapshot.snapshotId,
    approvalId: snapshot.approvalId,
    jobId: snapshot.jobId,
    siteId: snapshot.siteId,
    jurisdiction: snapshot.jurisdiction,
    sourceInspectionId: snapshot.sourceInspectionId,
    sourceInspectionRevision: snapshot.sourceInspectionRevision,
    sourceEvidenceVersion: snapshot.sourceEvidenceVersion,
    approvedByUserId: snapshot.approvedByUserId,
    approvedAt: snapshot.approvedAt.toISOString(),
    sourceIdentitySha256: snapshot.sourceIdentitySha256,
    sha256: snapshot.sha256,
  };
}

export function toApprovedSnapshotHttpException(error: unknown): never {
  if (!(error instanceof ApprovedSnapshotFailure)) {
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

@ApiTags('approvals')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller('approvals')
export class ApprovedSnapshotController {
  constructor(
    private readonly authService: AuthService,
    private readonly approvedSnapshotService: ApprovedSnapshotService,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'approveInspectionRevision',
    summary:
      'Freeze the exact submitted revision for draft report generation after review gates pass',
  })
  @ApiResponse({ status: 201, type: ApproveInspectionResponseDto })
  async approveInspectionRevision(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: ApproveInspectionDto,
  ): Promise<ApproveInspectionResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const result = await this.approvedSnapshotService.createApproved(
        principal,
        input,
      );
      return {
        snapshot: toSnapshotResponse(result.snapshot),
        replayed: result.replayed,
      };
    } catch (error) {
      return toApprovedSnapshotHttpException(error);
    }
  }

  @Get(':snapshotId')
  @ApiOperation({
    operationId: 'getApprovedSnapshot',
    summary: 'Read one frozen approved snapshot in the current company scope',
  })
  @ApiOkResponse({ type: ApprovedSnapshotResponseDto })
  async getApprovedSnapshot(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('snapshotId') snapshotId: string,
  ): Promise<ApprovedSnapshotResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toSnapshotResponse(
        await this.approvedSnapshotService.get(principal, snapshotId),
      );
    } catch (error) {
      return toApprovedSnapshotHttpException(error);
    }
  }
}
