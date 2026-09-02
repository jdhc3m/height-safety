import type { AuthPrincipal } from '../identity/auth.types';
import {
  ANCHOR_TYPES,
  REGISTER_STATUSES,
  SUPPORTED_JURISDICTIONS,
  SiteRegisterFailure,
  assertCanManageSiteRegister,
  type AnchorRecord,
  type AnchorType,
  type ClientRecord,
  type RegisterStatus,
  type SiteRecord,
  type SiteRegisterAuditSink,
  type SiteRegisterClock,
  type SiteRegisterIdGenerator,
  type SiteRegisterStore,
  type SupportedJurisdiction,
} from './site-register.types';

const NAME_MAX_LENGTH = 200;
const REFERENCE_MAX_LENGTH = 128;
const TEXT_MAX_LENGTH = 2000;

export interface CreateClientInput {
  readonly name: string;
  readonly contactDetails?: string | null;
  readonly externalReference?: string | null;
}

export interface UpdateClientInput {
  readonly name?: string;
  readonly contactDetails?: string | null;
  readonly externalReference?: string | null;
}

export interface CreateSiteInput {
  readonly clientId: string;
  readonly name: string;
  readonly address?: string | null;
  readonly jurisdiction: string;
  readonly accessNotes?: string | null;
  readonly siteReference?: string | null;
}

export interface UpdateSiteInput {
  readonly clientId?: string;
  readonly name?: string;
  readonly address?: string | null;
  readonly jurisdiction?: string;
  readonly accessNotes?: string | null;
  readonly siteReference?: string | null;
}

export interface CreateAnchorInput {
  readonly label?: string | null;
  readonly registerId?: string | null;
  readonly location?: string | null;
  readonly anchorType?: string;
  readonly manufacturer?: string | null;
  readonly model?: string | null;
  readonly installContext?: string | null;
  readonly registerStatus?: string;
  readonly notes?: string | null;
}

export interface UpdateAnchorInput {
  readonly label?: string | null;
  readonly registerId?: string | null;
  readonly location?: string | null;
  readonly anchorType?: string;
  readonly manufacturer?: string | null;
  readonly model?: string | null;
  readonly installContext?: string | null;
  readonly registerStatus?: string;
  readonly notes?: string | null;
}

export interface SiteRegisterServiceOptions {
  readonly store: SiteRegisterStore;
  readonly auditSink: SiteRegisterAuditSink;
  readonly clock: SiteRegisterClock;
  readonly idGenerator: SiteRegisterIdGenerator;
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function copyClient(client: ClientRecord): ClientRecord {
  return {
    ...client,
    createdAt: copyDate(client.createdAt),
    updatedAt: copyDate(client.updatedAt),
  };
}

function copySite(site: SiteRecord): SiteRecord {
  return {
    ...site,
    createdAt: copyDate(site.createdAt),
    updatedAt: copyDate(site.updatedAt),
  };
}

function copyAnchor(anchor: AnchorRecord): AnchorRecord {
  return {
    ...anchor,
    createdAt: copyDate(anchor.createdAt),
    updatedAt: copyDate(anchor.updatedAt),
  };
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new SiteRegisterFailure('INVALID_INPUT', `${field} is required`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new SiteRegisterFailure('INVALID_INPUT', `${field} is required`);
  }
  if (normalized.length > maxLength) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new SiteRegisterFailure('INVALID_INPUT', `${field} must be text`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized.length > 0 ? normalized : null;
}

function patchTextOrExisting(
  value: unknown,
  existing: string | null,
  field: string,
  maxLength: number,
): string | null {
  return value === undefined ? existing : optionalText(value, field, maxLength);
}

function assertObjectInput(
  input: unknown,
  resource: string,
): asserts input is Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      `${resource} request body is required`,
    );
  }
}

function changedFields<T extends object>(
  existing: T,
  updated: T,
  fields: readonly (keyof T)[],
): string {
  return fields
    .filter((field) => existing[field] !== updated[field])
    .map(String)
    .join(',');
}

function requiredId(value: unknown, field: string): string {
  return requiredText(value, field, REFERENCE_MAX_LENGTH);
}

function supportedJurisdiction(value: unknown): SupportedJurisdiction {
  if (!SUPPORTED_JURISDICTIONS.includes(value as SupportedJurisdiction)) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      'jurisdiction must be NSW or QLD',
    );
  }
  return value as SupportedJurisdiction;
}

function anchorType(value: unknown): AnchorType {
  if (!ANCHOR_TYPES.includes(value as AnchorType)) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      'anchorType must be single_point',
    );
  }
  return value as AnchorType;
}

function registerStatus(value: unknown): RegisterStatus {
  if (!REGISTER_STATUSES.includes(value as RegisterStatus)) {
    throw new SiteRegisterFailure(
      'INVALID_INPUT',
      'registerStatus must be active, inactive or archived',
    );
  }
  return value as RegisterStatus;
}

export class SiteRegisterService {
  constructor(private readonly options: SiteRegisterServiceOptions) {}

  createClient(
    principal: AuthPrincipal,
    input: CreateClientInput,
  ): ClientRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'client');
    const now = this.now();
    const client: ClientRecord = {
      companyId: principal.companyId,
      clientId: this.options.idGenerator.createId(),
      name: requiredText(input.name, 'name', NAME_MAX_LENGTH),
      contactDetails: optionalText(
        input.contactDetails,
        'contactDetails',
        TEXT_MAX_LENGTH,
      ),
      externalReference: optionalText(
        input.externalReference,
        'externalReference',
        REFERENCE_MAX_LENGTH,
      ),
      createdAt: copyDate(now),
      updatedAt: copyDate(now),
    };

    this.options.store.createClient(client);
    this.recordAudit(principal, 'client.created', 'client', client.clientId);
    return copyClient(client);
  }

  listClients(principal: AuthPrincipal): readonly ClientRecord[] {
    this.assertManager(principal);
    return this.options.store.listClients(principal.companyId).map(copyClient);
  }

  getClient(principal: AuthPrincipal, clientId: string): ClientRecord {
    this.assertManager(principal);
    const client = this.options.store.getClient(
      principal.companyId,
      requiredId(clientId, 'clientId'),
    );
    if (!client) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }
    return copyClient(client);
  }

  updateClient(
    principal: AuthPrincipal,
    clientId: string,
    input: UpdateClientInput,
  ): ClientRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'client');
    const normalizedClientId = requiredId(clientId, 'clientId');
    const existing = this.options.store.getClient(
      principal.companyId,
      normalizedClientId,
    );
    if (!existing) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }

    const client: ClientRecord = {
      ...existing,
      name:
        input.name === undefined
          ? existing.name
          : requiredText(input.name, 'name', NAME_MAX_LENGTH),
      contactDetails:
        input.contactDetails === undefined
          ? existing.contactDetails
          : optionalText(
              input.contactDetails,
              'contactDetails',
              TEXT_MAX_LENGTH,
            ),
      externalReference:
        input.externalReference === undefined
          ? existing.externalReference
          : optionalText(
              input.externalReference,
              'externalReference',
              REFERENCE_MAX_LENGTH,
            ),
      updatedAt: this.now(),
    };

    this.options.store.updateClient(client);
    this.recordAudit(principal, 'client.updated', 'client', client.clientId, {
      changedFields: changedFields(existing, client, [
        'name',
        'contactDetails',
        'externalReference',
      ]),
    });
    return copyClient(client);
  }

  createSite(principal: AuthPrincipal, input: CreateSiteInput): SiteRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'site');
    const clientId = requiredId(input.clientId, 'clientId');
    this.requireClient(principal.companyId, clientId);
    const now = this.now();
    const site: SiteRecord = {
      companyId: principal.companyId,
      siteId: this.options.idGenerator.createId(),
      clientId,
      name: requiredText(input.name, 'name', NAME_MAX_LENGTH),
      address: optionalText(input.address, 'address', TEXT_MAX_LENGTH),
      jurisdiction: supportedJurisdiction(input.jurisdiction),
      accessNotes: optionalText(
        input.accessNotes,
        'accessNotes',
        TEXT_MAX_LENGTH,
      ),
      siteReference: optionalText(
        input.siteReference,
        'siteReference',
        REFERENCE_MAX_LENGTH,
      ),
      createdAt: copyDate(now),
      updatedAt: copyDate(now),
    };

    this.options.store.createSite(site);
    this.recordAudit(principal, 'site.created', 'site', site.siteId, {
      jurisdiction: site.jurisdiction,
    });
    return copySite(site);
  }

  listSites(principal: AuthPrincipal): readonly SiteRecord[] {
    this.assertManager(principal);
    return this.options.store.listSites(principal.companyId).map(copySite);
  }

  getSite(principal: AuthPrincipal, siteId: string): SiteRecord {
    this.assertManager(principal);
    const site = this.options.store.getSite(
      principal.companyId,
      requiredId(siteId, 'siteId'),
    );
    if (!site) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    return copySite(site);
  }

  updateSite(
    principal: AuthPrincipal,
    siteId: string,
    input: UpdateSiteInput,
  ): SiteRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'site');
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const existing = this.options.store.getSite(
      principal.companyId,
      normalizedSiteId,
    );
    if (!existing) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }

    const clientId =
      input.clientId === undefined
        ? existing.clientId
        : requiredId(input.clientId, 'clientId');
    this.requireClient(principal.companyId, clientId);
    const site: SiteRecord = {
      ...existing,
      clientId,
      name:
        input.name === undefined
          ? existing.name
          : requiredText(input.name, 'name', NAME_MAX_LENGTH),
      address:
        input.address === undefined
          ? existing.address
          : optionalText(input.address, 'address', TEXT_MAX_LENGTH),
      jurisdiction:
        input.jurisdiction === undefined
          ? existing.jurisdiction
          : supportedJurisdiction(input.jurisdiction),
      accessNotes:
        input.accessNotes === undefined
          ? existing.accessNotes
          : optionalText(input.accessNotes, 'accessNotes', TEXT_MAX_LENGTH),
      siteReference:
        input.siteReference === undefined
          ? existing.siteReference
          : optionalText(
              input.siteReference,
              'siteReference',
              REFERENCE_MAX_LENGTH,
            ),
      updatedAt: this.now(),
    };

    this.options.store.updateSite(site);
    this.recordAudit(principal, 'site.updated', 'site', site.siteId, {
      jurisdiction: site.jurisdiction,
      changedFields: changedFields(existing, site, [
        'clientId',
        'name',
        'address',
        'jurisdiction',
        'accessNotes',
        'siteReference',
      ]),
    });
    return copySite(site);
  }

  createAnchor(
    principal: AuthPrincipal,
    siteId: string,
    input: CreateAnchorInput,
  ): AnchorRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'anchor');
    const normalizedSiteId = requiredId(siteId, 'siteId');
    this.requireSite(principal.companyId, normalizedSiteId);
    const now = this.now();
    const anchor: AnchorRecord = {
      companyId: principal.companyId,
      anchorId: this.options.idGenerator.createId(),
      siteId: normalizedSiteId,
      label: optionalText(input.label, 'label', REFERENCE_MAX_LENGTH),
      registerId: optionalText(
        input.registerId,
        'registerId',
        REFERENCE_MAX_LENGTH,
      ),
      location: optionalText(input.location, 'location', TEXT_MAX_LENGTH),
      anchorType: anchorType(input.anchorType ?? 'single_point'),
      manufacturer: optionalText(
        input.manufacturer,
        'manufacturer',
        REFERENCE_MAX_LENGTH,
      ),
      model: optionalText(input.model, 'model', REFERENCE_MAX_LENGTH),
      installContext: optionalText(
        input.installContext,
        'installContext',
        TEXT_MAX_LENGTH,
      ),
      registerStatus: registerStatus(input.registerStatus ?? 'active'),
      notes: optionalText(input.notes, 'notes', TEXT_MAX_LENGTH),
      createdAt: copyDate(now),
      updatedAt: copyDate(now),
    };

    this.options.store.createAnchor(anchor);
    this.recordAudit(principal, 'anchor.created', 'anchor', anchor.anchorId, {
      registerStatus: anchor.registerStatus,
    });
    return copyAnchor(anchor);
  }

  listAnchors(
    principal: AuthPrincipal,
    siteId: string,
  ): readonly AnchorRecord[] {
    this.assertManager(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    this.requireSite(principal.companyId, normalizedSiteId);
    return this.options.store
      .listAnchors(principal.companyId, normalizedSiteId)
      .map(copyAnchor);
  }

  getFieldSite(principal: AuthPrincipal, siteId: string): SiteRecord {
    this.assertFieldReader(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const site = this.options.store.getSite(
      principal.companyId,
      normalizedSiteId,
    );
    if (!site) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    return copySite(site);
  }

  listFieldAnchors(
    principal: AuthPrincipal,
    siteId: string,
  ): readonly AnchorRecord[] {
    this.assertFieldReader(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    if (!this.options.store.getSite(principal.companyId, normalizedSiteId)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    return this.options.store
      .listAnchors(principal.companyId, normalizedSiteId)
      .map(copyAnchor);
  }

  getAnchor(
    principal: AuthPrincipal,
    siteId: string,
    anchorId: string,
  ): AnchorRecord {
    this.assertManager(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const normalizedAnchorId = requiredId(anchorId, 'anchorId');
    this.requireSite(principal.companyId, normalizedSiteId);
    const anchor = this.options.store.getAnchor(
      principal.companyId,
      normalizedSiteId,
      normalizedAnchorId,
    );
    if (!anchor) {
      throw new SiteRegisterFailure('NOT_FOUND', 'anchor was not found');
    }
    return copyAnchor(anchor);
  }

  updateAnchor(
    principal: AuthPrincipal,
    siteId: string,
    anchorId: string,
    input: UpdateAnchorInput,
  ): AnchorRecord {
    this.assertManager(principal);
    assertObjectInput(input, 'anchor');
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const normalizedAnchorId = requiredId(anchorId, 'anchorId');
    this.requireSite(principal.companyId, normalizedSiteId);
    const existing = this.options.store.getAnchor(
      principal.companyId,
      normalizedSiteId,
      normalizedAnchorId,
    );
    if (!existing) {
      throw new SiteRegisterFailure('NOT_FOUND', 'anchor was not found');
    }

    const anchor: AnchorRecord = {
      ...existing,
      label: patchTextOrExisting(
        input.label,
        existing.label,
        'label',
        REFERENCE_MAX_LENGTH,
      ),
      registerId: patchTextOrExisting(
        input.registerId,
        existing.registerId,
        'registerId',
        REFERENCE_MAX_LENGTH,
      ),
      location: patchTextOrExisting(
        input.location,
        existing.location,
        'location',
        TEXT_MAX_LENGTH,
      ),
      anchorType:
        input.anchorType === undefined
          ? existing.anchorType
          : anchorType(input.anchorType),
      manufacturer: patchTextOrExisting(
        input.manufacturer,
        existing.manufacturer,
        'manufacturer',
        REFERENCE_MAX_LENGTH,
      ),
      model: patchTextOrExisting(
        input.model,
        existing.model,
        'model',
        REFERENCE_MAX_LENGTH,
      ),
      installContext: patchTextOrExisting(
        input.installContext,
        existing.installContext,
        'installContext',
        TEXT_MAX_LENGTH,
      ),
      registerStatus:
        input.registerStatus === undefined
          ? existing.registerStatus
          : registerStatus(input.registerStatus),
      notes: patchTextOrExisting(
        input.notes,
        existing.notes,
        'notes',
        TEXT_MAX_LENGTH,
      ),
      updatedAt: this.now(),
    };

    this.options.store.updateAnchor(anchor);
    this.recordAudit(principal, 'anchor.updated', 'anchor', anchor.anchorId, {
      registerStatus: anchor.registerStatus,
      changedFields: changedFields(existing, anchor, [
        'label',
        'registerId',
        'location',
        'anchorType',
        'manufacturer',
        'model',
        'installContext',
        'registerStatus',
        'notes',
      ]),
    });
    return copyAnchor(anchor);
  }

  private assertManager(principal: AuthPrincipal): void {
    assertCanManageSiteRegister(principal);
  }

  private assertFieldReader(principal: AuthPrincipal): void {
    if (principal.role !== 'inspector') {
      throw new SiteRegisterFailure(
        'ROLE_FORBIDDEN',
        'Inspector role is required',
      );
    }
  }

  private requireClient(companyId: string, clientId: string): ClientRecord {
    const client = this.options.store.getClient(companyId, clientId);
    if (!client) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }
    return client;
  }

  private requireSite(companyId: string, siteId: string): SiteRecord {
    const site = this.options.store.getSite(companyId, siteId);
    if (!site) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    return site;
  }

  private now(): Date {
    const now = this.options.clock.now();
    if (Number.isNaN(now.getTime())) {
      throw new Error('site register clock returned invalid date');
    }
    return copyDate(now);
  }

  private recordAudit(
    principal: AuthPrincipal,
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Readonly<Record<string, string | number | boolean>>,
  ): void {
    this.options.auditSink.record({
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action,
      targetType,
      targetId,
      occurredAt: this.now(),
      metadata,
    });
  }
}
