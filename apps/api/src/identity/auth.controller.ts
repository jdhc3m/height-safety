import { Controller, Get, Headers, Post, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { type AuthPrincipal } from './auth.types';
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
import {
  requireBearerToken,
  requireCompanyId,
  toAuthHttpException,
} from './auth-http';

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
      const principal = await this.authService.authenticateSession(
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
      return toAuthHttpException(error);
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
      return toAuthHttpException(error);
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
      return toAuthHttpException(error);
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
      const principal = await this.authService.authenticateSession(
        requireCompanyId(companyIdHeader),
        requireBearerToken(authorization),
      );
      return toMeResponse(principal);
    } catch (error) {
      return toAuthHttpException(error);
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
      const principal = await this.authService.authenticateSession(
        requireCompanyId(companyIdHeader),
        requireBearerToken(authorization),
      );
      await this.authService.revokeSession(principal);
      return { revoked: true };
    } catch (error) {
      return toAuthHttpException(error);
    }
  }

  @Post('sessions/renew')
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({
    operationId: 'renewSession',
    summary:
      'Renew a still-live application session after membership revalidation',
  })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async renewCurrentSession(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyIdHeader: string | undefined,
  ): Promise<SessionResponseDto> {
    try {
      const session = await this.authService.renewSession(
        requireCompanyId(companyIdHeader),
        requireBearerToken(authorization),
      );
      return toSessionResponse(session);
    } catch (error) {
      return toAuthHttpException(error);
    }
  }
}
