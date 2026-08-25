import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

import { PRODUCT_ROLES, type ProductRole } from './auth.types';

export class CreateInvitationDto {
  @ApiProperty({ example: 'inspector@example.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: PRODUCT_ROLES, example: 'inspector' })
  @IsIn(PRODUCT_ROLES)
  role!: ProductRole;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsISO8601()
  expiresAt!: string;
}

export class ProviderAccessTokenDto {
  @ApiProperty({
    description:
      'Short-lived access token issued by the selected managed identity provider.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  providerAccessToken!: string;
}

export class AcceptInvitationDto extends ProviderAccessTokenDto {
  @ApiProperty({ description: 'One-time opaque invitation token.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  invitationToken!: string;
}

export class InvitationResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  invitationId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: PRODUCT_ROLES })
  role!: ProductRole;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class AuthUserResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: PRODUCT_ROLES })
  role!: ProductRole;
}

export class SessionResponseDto {
  @ApiProperty({
    description:
      'Opaque application session token. Store it in platform-secure client storage.',
  })
  accessToken!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}

export class AuthMeResponseDto extends AuthUserResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  mfaSatisfied!: boolean;

  @ApiProperty({ format: 'date-time' })
  sessionExpiresAt!: string;
}

export class SessionRevokedResponseDto {
  @ApiProperty({ example: true })
  revoked!: boolean;
}
