import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  InternalServerErrorException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  authenticateSession,
  toAuthHttpException,
} from '../identity/auth-http';
import { AuthService } from '../identity/auth-service';
import { SyncMutationRequestDto, SyncMutationResponseDto } from './sync.dto';
import { SyncFailure } from './sync.types';
import { SyncService } from './sync-service';

function toResponse(
  response: Awaited<ReturnType<SyncService['submitMutation']>>,
): SyncMutationResponseDto {
  return {
    companyId: response.companyId,
    mutationId: response.mutationId,
    idempotencyKey: response.idempotencyKey,
    state: response.state,
    serverEntityVersion: response.serverEntityVersion,
    acknowledgedAt: response.acknowledgedAt?.toISOString() ?? null,
    payloadApplied: response.payloadApplied,
    replayed: response.replayed,
    conflict: response.conflict,
  };
}

function toSyncHttpException(error: unknown): never {
  if (!(error instanceof SyncFailure)) {
    return toAuthHttpException(error);
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      throw new BadRequestException(error.message);
    case 'ROLE_FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'PERSISTENCE_UNAVAILABLE':
      throw new ServiceUnavailableException();
  }

  throw new InternalServerErrorException();
}

@ApiTags('synchronisation')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller()
export class SyncController {
  constructor(
    private readonly authService: AuthService,
    private readonly syncService: SyncService,
  ) {}

  @Post('sync/mutations')
  @ApiOperation({
    operationId: 'submitSyncMutation',
    summary: 'Submit one idempotent mutation envelope',
  })
  @ApiResponse({ status: 200, type: SyncMutationResponseDto })
  async submitMutation(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: SyncMutationRequestDto,
  ): Promise<SyncMutationResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toResponse(this.syncService.submitMutation(principal, input));
    } catch (error) {
      return toSyncHttpException(error);
    }
  }
}
