import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { createTenantContext } from '../database/tenant-context';
import { AuthFailure, type AuthPrincipal } from './auth.types';
import {
  AcceptInvitationDto,
  AuthMeResponseDto,
  AuthUserResponseDto,
  CreateInvitationDto,
  InvitationResponseDto,
  ProviderAccessTokenDto,
  SessionResponseDto,
  SessionRevokedResponseDto,
} from './auth.dto';
import { AuthService } from './auth-service';

function requireBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Bearer session token is required');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (token.length === 0) {
    throw new UnauthorizedException('Bearer session token is required');
  }
  return token;
}

function requireCompanyId(companyId: string | undefined): string {
  if (!companyId) {
    throw new BadRequestException('x-company-id header is required');
  }

  try {
    return createTenantContext(companyId).companyId;
  } catch {
    throw new BadRequestException('x-company-id header is invalid');
  }
}

function toHttpException(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }
  if (!(error instanceof AuthFailure)) {
    throw new InternalServerErrorException();
  }

  switch (error.code) {
    case 'INVALID_INPUT':
    case 'INVITATION_EMAIL_MISMATCH':
      throw new BadRequestException(error.message);
    case 'CONFLICT':
      throw new ConflictException(error.message);
    case 'FORBIDDEN':
    case 'MFA_REQUIRED':
    case 'ROLE_FORBIDDEN':
      throw new ForbiddenException(error.message);
    case 'AUTH_PERSISTENCE_UNAVAILABLE':
    case 'IDENTITY_PROVIDER_UNAVAILABLE':
    case 'INVITATION_DELIVERY_UNAVAILABLE':
      throw new ServiceUnavailableException();
    case 'UNAUTHENTICATED':
    case 'EMAIL_NOT_VERIFIED':
    case 'IDENTITY_NOT_MEMBER':
    case 'IDENTITY_MISMATCH':
    case 'ACCOUNT_INACTIVE':
    case 'INVITATION_NOT_FOUND':
    case 'INVITATION_EXPIRED':
    case 'INVITATION_ALREADY_USED':
    case 'INVITATION_REVOKED':
    case 'SESSION_NOT_FOUND':
    case 'SESSION_REVOKED':
    case 'SESSION_EXPIRED':
    case 'SESSION_INVALID':
    case 'COMPANY_MISMATCH':
      throw new UnauthorizedException('authentication is not valid');
  }
}

function toInvitationResponse(
  invitation: Awaited<ReturnType<AuthService['createInvitation']>>,
): InvitationResponseDto {
  return {
    companyId: invitation.companyId,
    invitationId: invitation.invitationId,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

function toSessionResponse(
  session: Awaited<ReturnType<AuthService['createSession']>>,
): SessionResponseDto {
  return {
    accessToken: session.accessToken,
    companyId: session.companyId,
    expiresAt: session.expiresAt.toISOString(),
    user: {
      userId: session.user.userId,
      email: session.user.email,
      role: session.user.role,
    },
  };
}

function toMeResponse(principal: AuthPrincipal): AuthMeResponseDto {
  return {
    userId: principal.userId,
    email: principal.email,
    role: principal.role,
    companyId: principal.companyId,
    sessionId: principal.sessionId,
    mfaSatisfied: principal.mfaSatisfied,
    sessionExpiresAt: principal.sessionExpiresAt.toISOString(),
  };
}

@ApiTags('identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invitations')
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'createInvitation',
    summary: 'Create an invitation for a company user',
  })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  async createInvitation(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() input: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    try {
      const companyId = requireCompanyId(companyIdHeader);
      const principal = this.authService.authenticateSession(
        companyId,
        requireBearerToken(authorization),
      );
      const invitation = await this.authService.createInvitation(principal, {
        email: input.email,
        role: input.role,
        expiresAt: new Date(input.expiresAt),
      });
      return toInvitationResponse(invitation);
    } catch (error) {
      return toHttpException(error);
    }
  }

  @Post('invitations/accept')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'acceptInvitation',
    summary: 'Accept an invitation using a verified provider identity',
  })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async acceptInvitation(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() input: AcceptInvitationDto,
  ): Promise<SessionResponseDto> {
    try {
      const session =
        await this.authService.acceptInvitationFromProviderAccessToken(
          requireCompanyId(companyIdHeader),
          input.invitationToken,
          input.providerAccessToken,
        );
      return toSessionResponse(session);
    } catch (error) {
      return toHttpException(error);
    }
  }

  @Post('sessions')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'createSession',
    summary: 'Create an application session from a provider access token',
  })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async createSession(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() input: ProviderAccessTokenDto,
  ): Promise<SessionResponseDto> {
    try {
      const session =
        await this.authService.createSessionFromProviderAccessToken(
          requireCompanyId(companyIdHeader),
          input.providerAccessToken,
        );
      return toSessionResponse(session);
    } catch (error) {
      return toHttpException(error);
    }
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'getCurrentAuth',
    summary: 'Read current session membership and role',
  })
  @ApiResponse({ status: 200, type: AuthMeResponseDto })
  async getCurrentAuth(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyIdHeader: string | undefined,
  ): Promise<AuthMeResponseDto> {
    try {
      const principal = this.authService.authenticateSession(
        requireCompanyId(companyIdHeader),
        requireBearerToken(authorization),
      );
      return toMeResponse(principal);
    } catch (error) {
      return toHttpException(error);
    }
  }

  @Post('sessions/revoke')
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'revokeCurrentSession',
    summary: 'Revoke the current application session',
  })
  @ApiResponse({ status: 201, type: SessionRevokedResponseDto })
  async revokeCurrentSession(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyIdHeader: string | undefined,
  ): Promise<SessionRevokedResponseDto> {
    try {
      const principal = this.authService.authenticateSession(
        requireCompanyId(companyIdHeader),
        requireBearerToken(authorization),
      );
      this.authService.revokeSession(principal);
      return { revoked: true };
    } catch (error) {
      return toHttpException(error);
    }
  }
}
