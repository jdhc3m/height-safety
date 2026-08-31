import { randomBytes } from 'node:crypto';

import type { AuthPrincipal, ProductRole } from '../identity/auth.types';

export const SUPPORTED_JURISDICTIONS = ['NSW', 'QLD'] as const;
export type SupportedJurisdiction = (typeof SUPPORTED_JURISDICTIONS)[number];

export const ANCHOR_TYPES = ['single_point'] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

export const REGISTER_STATUSES = ['active', 'inactive', 'archived'] as const;
export type RegisterStatus = (typeof REGISTER_STATUSES)[number];

export type SiteRegisterFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class SiteRegisterFailure extends Error {
  constructor(
    readonly code: SiteRegisterFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'SiteRegisterFailure';
  }
}

export interface ClientRecord {
  readonly companyId: string;
  readonly clientId: string;
  readonly name: string;
  readonly contactDetails: string | null;
  readonly externalReference: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SiteRecord {
  readonly companyId: string;
  readonly siteId: string;
  readonly clientId: string;
  readonly name: string;
  readonly address: string | null;
  readonly jurisdiction: SupportedJurisdiction;
  readonly accessNotes: string | null;
  readonly siteReference: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AnchorRecord {
  readonly companyId: string;
  readonly anchorId: string;
  readonly siteId: string;
  readonly label: string | null;
  readonly registerId: string | null;
  readonly location: string | null;
  readonly anchorType: AnchorType;
  readonly manufacturer: string | null;
  readonly model: string | null;
  readonly installContext: string | null;
  readonly registerStatus: RegisterStatus;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SiteRegisterStore {
  createClient(client: ClientRecord): void;
  getClient(companyId: string, clientId: string): ClientRecord | undefined;
  listClients(companyId: string): readonly ClientRecord[];
  updateClient(client: ClientRecord): void;

  createSite(site: SiteRecord): void;
  getSite(companyId: string, siteId: string): SiteRecord | undefined;
  listSites(companyId: string): readonly SiteRecord[];
  updateSite(site: SiteRecord): void;

  createAnchor(anchor: AnchorRecord): void;
  getAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): AnchorRecord | undefined;
  listAnchors(companyId: string, siteId: string): readonly AnchorRecord[];
  updateAnchor(anchor: AnchorRecord): void;
}

export interface SiteRegisterIdGenerator {
  createId(): string;
}

export interface SiteRegisterClock {
  now(): Date;
}

export interface SiteRegisterAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface SiteRegisterAuditSink {
  record(event: SiteRegisterAuditEvent): void;
}

export class NoopSiteRegisterAuditSink implements SiteRegisterAuditSink {
  record(_event: SiteRegisterAuditEvent): void {
    // The durable audit adapter remains unconfigured until runtime persistence
    // is selected. The service still emits application-owned audit events.
  }
}

export const secureSiteRegisterIdGenerator: SiteRegisterIdGenerator = {
  createId: () => randomBytes(16).toString('hex'),
};

export const systemSiteRegisterClock: SiteRegisterClock = {
  now: () => new Date(),
};

export function canManageSiteRegister(role: ProductRole): boolean {
  return role === 'administrator' || role === 'office_reviewer';
}

export function assertCanManageSiteRegister(principal: AuthPrincipal): void {
  if (!canManageSiteRegister(principal.role)) {
    throw new SiteRegisterFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}
