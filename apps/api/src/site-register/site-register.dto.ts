import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  ANCHOR_TYPES,
  REGISTER_STATUSES,
  SUPPORTED_JURISDICTIONS,
  type AnchorType,
  type RegisterStatus,
  type SupportedJurisdiction,
} from './site-register.types';

export class CreateClientDto {
  @ApiProperty({ example: 'Fictional Facilities Pty Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactDetails?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalReference?: string | null;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ example: 'Updated Facilities Pty Ltd' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactDetails?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalReference?: string | null;
}

export class CreateSiteDto {
  @ApiProperty({ example: 'client-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientId!: string;

  @ApiProperty({ example: 'Warehouse One' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string | null;

  @ApiProperty({ enum: SUPPORTED_JURISDICTIONS, example: 'NSW' })
  @IsIn(SUPPORTED_JURISDICTIONS)
  jurisdiction!: SupportedJurisdiction;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessNotes?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  siteReference?: string | null;
}

export class UpdateSiteDto {
  @ApiPropertyOptional({ example: 'client-id' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientId?: string;

  @ApiPropertyOptional({ example: 'Updated Warehouse One' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string | null;

  @ApiPropertyOptional({ enum: SUPPORTED_JURISDICTIONS })
  @IsOptional()
  @IsIn(SUPPORTED_JURISDICTIONS)
  jurisdiction?: SupportedJurisdiction;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessNotes?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  siteReference?: string | null;
}

export class CreateAnchorDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  registerId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  location?: string | null;

  @ApiPropertyOptional({ enum: ANCHOR_TYPES, default: 'single_point' })
  @IsOptional()
  @IsIn(ANCHOR_TYPES)
  anchorType?: AnchorType;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  manufacturer?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  model?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  installContext?: string | null;

  @ApiPropertyOptional({ enum: REGISTER_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(REGISTER_STATUSES)
  registerStatus?: RegisterStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateAnchorDto extends CreateAnchorDto {}

export class ClientResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  contactDetails!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externalReference!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class SiteResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  siteId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ enum: SUPPORTED_JURISDICTIONS })
  jurisdiction!: SupportedJurisdiction;

  @ApiPropertyOptional({ nullable: true, type: String })
  accessNotes!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  siteReference!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AnchorResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  anchorId!: string;

  @ApiProperty()
  siteId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  label!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  registerId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  location!: string | null;

  @ApiProperty({ enum: ANCHOR_TYPES })
  anchorType!: AnchorType;

  @ApiPropertyOptional({ nullable: true, type: String })
  manufacturer!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  model!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  installContext!: string | null;

  @ApiProperty({ enum: REGISTER_STATUSES })
  registerStatus!: RegisterStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
