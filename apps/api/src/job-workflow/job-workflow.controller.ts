import {
  BadRequestException,
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
  Body,
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
  AssignJobDto,
  CreateJobDto,
  JobAssignmentResponseDto,
  JobPackResponseDto,
  JobResponseDto,
} from './job-workflow.dto';
import { JobWorkflowFailure } from './job-workflow.types';
import { JobWorkflowService } from './job-workflow-service';

function toAssignmentResponse(
  assignment: NonNullable<
    Awaited<ReturnType<JobWorkflowService['claimJob']>>['assignment']
  >,
): JobAssignmentResponseDto {
  return {
    companyId: assignment.companyId,
    assignmentId: assignment.assignmentId,
    jobId: assignment.jobId,
    inspectorUserId: assignment.inspectorUserId,
    assignedByUserId: assignment.assignedByUserId,
    assignmentType: assignment.assignmentType,
    isPrimary: assignment.isPrimary,
    assignedAt: assignment.assignedAt.toISOString(),
    claimedAt: assignment.claimedAt?.toISOString() ?? null,
  };
}

function toJobResponse(
  bundle: Pick<
    Awaited<ReturnType<JobWorkflowService['claimJob']>>,
    'job' | 'assignment'
  >,
): JobResponseDto {
  return {
    companyId: bundle.job.companyId,
    jobId: bundle.job.jobId,
    siteId: bundle.job.siteId,
    jurisdiction: bundle.job.jurisdiction,
    reference: bundle.job.reference,
    plannedDate: bundle.job.plannedDate,
    workflowStatus: bundle.job.workflowStatus,
    jobPackVersion: bundle.job.jobPackVersion,
    createdAt: bundle.job.createdAt.toISOString(),
    updatedAt: bundle.job.updatedAt.toISOString(),
    assignment: bundle.assignment
      ? toAssignmentResponse(bundle.assignment)
      : null,
  };
}

function toJobPackResponse(
  pack: Awaited<ReturnType<JobWorkflowService['getJobPack']>>,
): JobPackResponseDto {
  return {
    job: toJobResponse(pack),
    site: {
      companyId: pack.site.companyId,
      siteId: pack.site.siteId,
      clientId: pack.site.clientId,
      name: pack.site.name,
      address: pack.site.address,
      jurisdiction: pack.site.jurisdiction,
      accessNotes: pack.site.accessNotes,
      siteReference: pack.site.siteReference,
      createdAt: pack.site.createdAt.toISOString(),
      updatedAt: pack.site.updatedAt.toISOString(),
    },
    anchors: pack.anchors.map((anchor) => ({
      companyId: anchor.companyId,
      anchorId: anchor.anchorId,
      siteId: anchor.siteId,
      label: anchor.label,
      registerId: anchor.registerId,
      location: anchor.location,
      anchorType: anchor.anchorType,
      manufacturer: anchor.manufacturer,
      model: anchor.model,
      installContext: anchor.installContext,
      registerStatus: anchor.registerStatus,
      notes: anchor.notes,
      createdAt: anchor.createdAt.toISOString(),
      updatedAt: anchor.updatedAt.toISOString(),
    })),
  };
}

function toJobWorkflowHttpException(error: unknown): never {
  if (!(error instanceof JobWorkflowFailure)) {
    return toAuthHttpException(error);
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      throw new BadRequestException(error.message);
    case 'NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'CONFLICT':
      throw new ConflictException({
        message: error.message,
        currentAssignment: error.currentAssignment
          ? toAssignmentResponse(error.currentAssignment)
          : undefined,
      });
    case 'ROLE_FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'PERSISTENCE_UNAVAILABLE':
      throw new ServiceUnavailableException();
  }

  throw new InternalServerErrorException();
}

@ApiTags('job-workflow')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller()
export class JobWorkflowController {
  constructor(
    private readonly authService: AuthService,
    private readonly jobWorkflowService: JobWorkflowService,
  ) {}

  @Post('jobs')
  @ApiOperation({ operationId: 'createJob', summary: 'Create a draft job' })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async createJob(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: CreateJobDto,
  ): Promise<JobResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const job = this.jobWorkflowService.createJob(principal, input);
      return toJobResponse({ job, assignment: null });
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Get('jobs')
  @ApiOperation({ operationId: 'listJobs', summary: 'List authorised jobs' })
  @ApiOkResponse({ type: [JobResponseDto] })
  async listJobs(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
  ): Promise<readonly JobResponseDto[]> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return this.jobWorkflowService.listJobs(principal).map(toJobResponse);
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Get('jobs/:jobId')
  @ApiOperation({ operationId: 'getJob', summary: 'Read an authorised job' })
  @ApiOkResponse({ type: JobResponseDto })
  async getJob(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('jobId') jobId: string,
  ): Promise<JobResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toJobResponse(this.jobWorkflowService.getJob(principal, jobId));
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Get('jobs/:jobId/pack')
  @ApiOperation({
    operationId: 'downloadJobPack',
    summary: 'Download an authorised versioned job pack',
  })
  @ApiOkResponse({ type: JobPackResponseDto })
  async downloadJobPack(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('jobId') jobId: string,
  ): Promise<JobPackResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toJobPackResponse(
        this.jobWorkflowService.getJobPack(principal, jobId),
      );
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Post('jobs/:jobId/release')
  @ApiOperation({ operationId: 'releaseJob', summary: 'Release a draft job' })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async releaseJob(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('jobId') jobId: string,
  ): Promise<JobResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toJobResponse(
        this.jobWorkflowService.releaseJob(principal, jobId),
      );
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Post('jobs/:jobId/claim')
  @ApiOperation({ operationId: 'claimJob', summary: 'Claim a released job' })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async claimJob(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('jobId') jobId: string,
  ): Promise<JobResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toJobResponse(this.jobWorkflowService.claimJob(principal, jobId));
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }

  @Post('jobs/:jobId/assignment')
  @ApiOperation({
    operationId: 'assignJob',
    summary: 'Assign a released job to an inspector',
  })
  @ApiResponse({ status: 201, type: JobResponseDto })
  async assignJob(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('jobId') jobId: string,
    @Body() input: AssignJobDto,
  ): Promise<JobResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toJobResponse(
        this.jobWorkflowService.assignJob(principal, jobId, input),
      );
    } catch (error) {
      return toJobWorkflowHttpException(error);
    }
  }
}
