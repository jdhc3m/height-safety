import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Headers,
  InternalServerErrorException,
  Inject,
  NotFoundException,
  Post,
  Param,
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
import {
  PhotoUploadChunkDto,
  PhotoUploadChunkResponseDto,
  SyncMutationRequestDto,
  SyncMutationResponseDto,
} from './sync.dto';
import { PhotoUploadFailure, SyncFailure } from './sync.types';
import { SyncService } from './sync-service';
import {
  PHOTO_UPLOAD_SERVICE,
  PhotoUploadService,
  UnconfiguredPhotoUploadService,
  type PhotoUploadServiceLike,
} from './photo-upload-service';

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
  if (error instanceof PhotoUploadFailure) {
    switch (error.code) {
      case 'INVALID_INPUT':
        throw new BadRequestException(error.message);
      case 'ROLE_FORBIDDEN':
        throw new ForbiddenException(error.message);
      case 'NOT_FOUND':
        throw new NotFoundException(error.message);
      case 'CONFLICT':
        throw new ConflictException(error.message);
      case 'PERSISTENCE_UNAVAILABLE':
        throw new ServiceUnavailableException();
    }
  }
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
    @Inject(PHOTO_UPLOAD_SERVICE)
    private readonly photoUploadService: PhotoUploadServiceLike = new UnconfiguredPhotoUploadService(),
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
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toResponse(
        await this.syncService.submitMutation(principal, input),
      );
    } catch (error) {
      return toSyncHttpException(error);
    }
  }

  @Post('sync/photos/:mediaId/chunks')
  @ApiOperation({
    operationId: 'uploadPhotoChunk',
    summary: 'Upload one resumable evidence-photo chunk',
  })
  @ApiResponse({ status: 200, type: PhotoUploadChunkResponseDto })
  async uploadPhotoChunk(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('mediaId') mediaId: string,
    @Body() input: PhotoUploadChunkDto,
  ): Promise<PhotoUploadChunkResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      const result = await this.photoUploadService.uploadChunk(
        principal,
        mediaId,
        input,
      );
      return result;
    } catch (error) {
      return toSyncHttpException(error);
    }
  }

  @Post('sync/recovery/photos/:mediaId/chunks')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'uploadRecoveryPhotoChunk',
    summary: 'Upload one evidence-photo chunk during Administrator recovery',
  })
  @ApiResponse({ status: 200, type: PhotoUploadChunkResponseDto })
  async uploadRecoveryPhotoChunk(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('mediaId') mediaId: string,
    @Body() input: PhotoUploadChunkDto,
  ): Promise<PhotoUploadChunkResponseDto> {
    try {
      const principal = await authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return await this.photoUploadService.uploadChunk(
        principal,
        mediaId,
        input,
        true,
      );
    } catch (error) {
      return toSyncHttpException(error);
    }
  }
}
