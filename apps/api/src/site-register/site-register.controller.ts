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
  Patch,
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
  AnchorResponseDto,
  ClientResponseDto,
  CreateAnchorDto,
  CreateClientDto,
  CreateSiteDto,
  SiteResponseDto,
  UpdateAnchorDto,
  UpdateClientDto,
  UpdateSiteDto,
} from './site-register.dto';
import { SiteRegisterFailure } from './site-register.types';
import { SiteRegisterService } from './site-register-service';

function toClientResponse(
  client: Awaited<ReturnType<SiteRegisterService['createClient']>>,
): ClientResponseDto {
  return {
    companyId: client.companyId,
    clientId: client.clientId,
    name: client.name,
    contactDetails: client.contactDetails,
    externalReference: client.externalReference,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

function toSiteResponse(
  site: Awaited<ReturnType<SiteRegisterService['createSite']>>,
): SiteResponseDto {
  return {
    companyId: site.companyId,
    siteId: site.siteId,
    clientId: site.clientId,
    name: site.name,
    address: site.address,
    jurisdiction: site.jurisdiction,
    accessNotes: site.accessNotes,
    siteReference: site.siteReference,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

function toAnchorResponse(
  anchor: Awaited<ReturnType<SiteRegisterService['createAnchor']>>,
): AnchorResponseDto {
  return {
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
  };
}

function toSiteRegisterHttpException(error: unknown): never {
  if (!(error instanceof SiteRegisterFailure)) {
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

@ApiTags('site-register')
@ApiBearerAuth('access-token')
@ApiHeader({ name: 'x-company-id', required: true })
@Controller()
export class SiteRegisterController {
  constructor(
    private readonly authService: AuthService,
    private readonly siteRegisterService: SiteRegisterService,
  ) {}

  @Post('clients')
  @ApiOperation({
    operationId: 'createClient',
    summary: 'Create a company client',
  })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  async createClient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: CreateClientDto,
  ): Promise<ClientResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toClientResponse(
        this.siteRegisterService.createClient(principal, input),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('clients')
  @ApiOperation({ operationId: 'listClients', summary: 'List company clients' })
  @ApiOkResponse({ type: [ClientResponseDto] })
  async listClients(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
  ): Promise<readonly ClientResponseDto[]> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return this.siteRegisterService
        .listClients(principal)
        .map(toClientResponse);
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('clients/:clientId')
  @ApiOperation({ operationId: 'getClient', summary: 'Read a company client' })
  @ApiOkResponse({ type: ClientResponseDto })
  async getClient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('clientId') clientId: string,
  ): Promise<ClientResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toClientResponse(
        this.siteRegisterService.getClient(principal, clientId),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Patch('clients/:clientId')
  @ApiOperation({
    operationId: 'updateClient',
    summary: 'Update a company client',
  })
  @ApiOkResponse({ type: ClientResponseDto })
  async updateClient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('clientId') clientId: string,
    @Body() input: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toClientResponse(
        this.siteRegisterService.updateClient(principal, clientId, input),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Post('sites')
  @ApiOperation({
    operationId: 'createSite',
    summary: 'Create a site with supported jurisdiction context',
  })
  @ApiResponse({ status: 201, type: SiteResponseDto })
  async createSite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() input: CreateSiteDto,
  ): Promise<SiteResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toSiteResponse(
        this.siteRegisterService.createSite(principal, input),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('sites')
  @ApiOperation({ operationId: 'listSites', summary: 'List company sites' })
  @ApiOkResponse({ type: [SiteResponseDto] })
  async listSites(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
  ): Promise<readonly SiteResponseDto[]> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return this.siteRegisterService.listSites(principal).map(toSiteResponse);
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('sites/:siteId')
  @ApiOperation({ operationId: 'getSite', summary: 'Read a company site' })
  @ApiOkResponse({ type: SiteResponseDto })
  async getSite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
  ): Promise<SiteResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toSiteResponse(
        this.siteRegisterService.getSite(principal, siteId),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Patch('sites/:siteId')
  @ApiOperation({ operationId: 'updateSite', summary: 'Update a company site' })
  @ApiOkResponse({ type: SiteResponseDto })
  async updateSite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
    @Body() input: UpdateSiteDto,
  ): Promise<SiteResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toSiteResponse(
        this.siteRegisterService.updateSite(principal, siteId, input),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Post('sites/:siteId/anchors')
  @ApiOperation({
    operationId: 'createAnchor',
    summary: 'Add a single-point anchor to a site register',
  })
  @ApiResponse({ status: 201, type: AnchorResponseDto })
  async createAnchor(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
    @Body() input: CreateAnchorDto,
  ): Promise<AnchorResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toAnchorResponse(
        this.siteRegisterService.createAnchor(principal, siteId, input),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('sites/:siteId/anchors')
  @ApiOperation({
    operationId: 'listAnchors',
    summary: 'List a site anchor register',
  })
  @ApiOkResponse({ type: [AnchorResponseDto] })
  async listAnchors(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
  ): Promise<readonly AnchorResponseDto[]> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return this.siteRegisterService
        .listAnchors(principal, siteId)
        .map(toAnchorResponse);
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Get('sites/:siteId/anchors/:anchorId')
  @ApiOperation({
    operationId: 'getAnchor',
    summary: 'Read a registered anchor',
  })
  @ApiOkResponse({ type: AnchorResponseDto })
  async getAnchor(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
    @Param('anchorId') anchorId: string,
  ): Promise<AnchorResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toAnchorResponse(
        this.siteRegisterService.getAnchor(principal, siteId, anchorId),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }

  @Patch('sites/:siteId/anchors/:anchorId')
  @ApiOperation({
    operationId: 'updateAnchor',
    summary: 'Update a registered anchor',
  })
  @ApiOkResponse({ type: AnchorResponseDto })
  async updateAnchor(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('siteId') siteId: string,
    @Param('anchorId') anchorId: string,
    @Body() input: UpdateAnchorDto,
  ): Promise<AnchorResponseDto> {
    try {
      const principal = authenticateSession(
        this.authService,
        authorization,
        companyId,
      );
      return toAnchorResponse(
        this.siteRegisterService.updateAnchor(
          principal,
          siteId,
          anchorId,
          input,
        ),
      );
    } catch (error) {
      return toSiteRegisterHttpException(error);
    }
  }
}
