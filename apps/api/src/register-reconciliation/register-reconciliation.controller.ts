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
  DecideReconciliationProposalDto,
  ReconciliationProposalDecisionResponseDto,
  ReconciliationProposalResponseDto,
  toReconciliationProposalDecisionResponse,
  toReconciliationProposalResponse,
} from './register-reconciliation.dto';
import { RegisterReconciliationFailure } from './register-reconciliation.types';
import { RegisterReconciliationService } from './register-reconciliation-service';

export function toRegisterReconciliationHttpException(error: unknown): never {
  if (!(error instanceof RegisterReconciliationFailure)) {
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

@ApiTags('register-reconciliation')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller()
export class RegisterReconciliationController {
  constructor(
    private readonly authService: AuthService,
    private readonly registerReconciliationService: RegisterReconciliationService,
  ) {}

  @Get('sites/:siteId/reconciliation-proposals')
  @ApiOperation({
    operationId: 'listReconciliationProposals',
    summary:
      'List open reconciliation proposals submitted for one site, newest first',
  })
  @ApiOkResponse({ type: [ReconciliationProposalResponseDto] })
  async listProposals(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
  ): Promise<readonly ReconciliationProposalResponseDto[]> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return (
        await this.registerReconciliationService.listOpenProposals(
          principal,
          siteId,
        )
      ).map(toReconciliationProposalResponse);
    } catch (error) {
      return toRegisterReconciliationHttpException(error);
    }
  }

  @Post('sites/:siteId/reconciliation-proposals/:proposalId/decision')
  @ApiOperation({
    operationId: 'decideReconciliationProposal',
    summary:
      'Record one accept or reject decision for a submitted reconciliation proposal',
  })
  @ApiResponse({ status: 201, type: ReconciliationProposalDecisionResponseDto })
  async decideProposal(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
    @Param('proposalId') proposalId: string,
    @Body() input: DecideReconciliationProposalDto,
  ): Promise<ReconciliationProposalDecisionResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const result = await this.registerReconciliationService.decideProposal(
        principal,
        siteId,
        proposalId,
        input,
      );
      return toReconciliationProposalDecisionResponse(
        result.decision,
        result.replayed,
      );
    } catch (error) {
      return toRegisterReconciliationHttpException(error);
    }
  }
}
