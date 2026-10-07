import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  authenticateSession,
  toAuthHttpException,
} from '../identity/auth-http';
import { AuthService } from '../identity/auth-service';
import {
  RequestReportGenerationDto,
  ReportGenerationResponseDto,
  toReportGenerationResponse,
} from './report-generation.dto';
import { ReportGenerationFailure } from './report-generation.types';
import { ReportGenerationService } from './report-generation-service';

export function toReportGenerationHttpException(error: unknown): never {
  if (!(error instanceof ReportGenerationFailure)) {
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

@ApiTags('reports')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller('reports')
export class ReportGenerationController {
  constructor(
    private readonly authService: AuthService,
    private readonly reportService: ReportGenerationService,
  ) {}

  @Post('generations')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'requestDraftReportGeneration',
    summary:
      'Queue one deterministic draft report revision from an approved snapshot',
  })
  @ApiAcceptedResponse({ type: ReportGenerationResponseDto })
  async requestGeneration(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: RequestReportGenerationDto,
  ): Promise<ReportGenerationResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toReportGenerationResponse(
        await this.reportService.request(principal, input.snapshotId),
      );
    } catch (error) {
      return toReportGenerationHttpException(error);
    }
  }

  @Get('generations/:generationId')
  @ApiOperation({
    operationId: 'getDraftReportGeneration',
    summary: 'Read status for a tenant-scoped draft report generation',
  })
  @ApiOkResponse({ type: ReportGenerationResponseDto })
  async getGeneration(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('generationId') generationId: string,
  ): Promise<ReportGenerationResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toReportGenerationResponse(
        await this.reportService.getGeneration(principal, generationId),
      );
    } catch (error) {
      return toReportGenerationHttpException(error);
    }
  }

  @Get('generations/:generationId/file')
  @ApiOperation({
    operationId: 'downloadDraftReport',
    summary: 'Download one completed private draft report revision',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'A private draft report PDF',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async downloadReport(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('generationId') generationId: string,
  ): Promise<StreamableFile> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const file = await this.reportService.getFile(principal, generationId);
      return new StreamableFile(Buffer.from(file.bytes), {
        type: 'application/pdf',
        disposition: `attachment; filename="${file.filename}"`,
      });
    } catch (error) {
      return toReportGenerationHttpException(error);
    }
  }
}
