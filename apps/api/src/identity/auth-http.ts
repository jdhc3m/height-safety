import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { createTenantContext } from '../database/tenant-context';
import { AuthFailure, type AuthPrincipal } from './auth.types';
import type { AuthService } from './auth-service';

export function requireBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Bearer session token is required');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (token.length === 0) {
    throw new UnauthorizedException('Bearer session token is required');
  }
  return token;
}

export function requireCompanyId(companyId: string | undefined): string {
  if (!companyId) {
    throw new BadRequestException('x-company-id header is required');
  }

  try {
    return createTenantContext(companyId).companyId;
  } catch {
    throw new BadRequestException('x-company-id header is invalid');
  }
}

export function authenticateSession(
  authService: AuthService,
  authorization: string | undefined,
  companyIdHeader: string | undefined,
): AuthPrincipal {
  return authService.authenticateSession(
    requireCompanyId(companyIdHeader),
    requireBearerToken(authorization),
  );
}

export function toAuthHttpException(error: unknown): never {
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
