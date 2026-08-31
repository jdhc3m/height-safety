import {
  SiteRegisterFailure,
  type AnchorRecord,
  type ClientRecord,
  type SiteRecord,
  type SiteRegisterStore,
} from './site-register.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
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

export class InMemorySiteRegisterStore implements SiteRegisterStore {
  private readonly clients = new Map<string, ClientRecord>();
  private readonly sites = new Map<string, SiteRecord>();
  private readonly anchors = new Map<string, AnchorRecord>();

  createClient(client: ClientRecord): void {
    const clientKey = key(client.companyId, client.clientId);
    if (this.clients.has(clientKey)) {
      throw new SiteRegisterFailure('CONFLICT', 'client already exists');
    }
    this.assertClientExternalReferenceAvailable(client);
    this.clients.set(clientKey, copyClient(client));
  }

  getClient(companyId: string, clientId: string): ClientRecord | undefined {
    const client = this.clients.get(key(companyId, clientId));
    return client ? copyClient(client) : undefined;
  }

  listClients(companyId: string): readonly ClientRecord[] {
    return [...this.clients.values()]
      .filter((client) => client.companyId === companyId)
      .map(copyClient);
  }

  updateClient(client: ClientRecord): void {
    const clientKey = key(client.companyId, client.clientId);
    if (!this.clients.has(clientKey)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }
    this.assertClientExternalReferenceAvailable(client, client.clientId);
    this.clients.set(clientKey, copyClient(client));
  }

  createSite(site: SiteRecord): void {
    const siteKey = key(site.companyId, site.siteId);
    if (this.sites.has(siteKey)) {
      throw new SiteRegisterFailure('CONFLICT', 'site already exists');
    }
    if (!this.getClient(site.companyId, site.clientId)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }
    this.assertSiteReferenceAvailable(site);
    this.sites.set(siteKey, copySite(site));
  }

  getSite(companyId: string, siteId: string): SiteRecord | undefined {
    const site = this.sites.get(key(companyId, siteId));
    return site ? copySite(site) : undefined;
  }

  listSites(companyId: string): readonly SiteRecord[] {
    return [...this.sites.values()]
      .filter((site) => site.companyId === companyId)
      .map(copySite);
  }

  updateSite(site: SiteRecord): void {
    const siteKey = key(site.companyId, site.siteId);
    if (!this.sites.has(siteKey)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    if (!this.getClient(site.companyId, site.clientId)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
    }
    this.assertSiteReferenceAvailable(site, site.siteId);
    this.sites.set(siteKey, copySite(site));
  }

  createAnchor(anchor: AnchorRecord): void {
    const anchorKey = key(anchor.companyId, anchor.anchorId);
    if (this.anchors.has(anchorKey)) {
      throw new SiteRegisterFailure('CONFLICT', 'anchor already exists');
    }
    if (!this.getSite(anchor.companyId, anchor.siteId)) {
      throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
    }
    this.assertAnchorRegisterIdAvailable(anchor);
    this.anchors.set(anchorKey, copyAnchor(anchor));
  }

  getAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): AnchorRecord | undefined {
    const anchor = this.anchors.get(key(companyId, anchorId));
    if (!anchor || anchor.siteId !== siteId) {
      return undefined;
    }
    return copyAnchor(anchor);
  }

  listAnchors(companyId: string, siteId: string): readonly AnchorRecord[] {
    return [...this.anchors.values()]
      .filter(
        (anchor) => anchor.companyId === companyId && anchor.siteId === siteId,
      )
      .map(copyAnchor);
  }

  updateAnchor(anchor: AnchorRecord): void {
    const anchorKey = key(anchor.companyId, anchor.anchorId);
    const existing = this.anchors.get(anchorKey);
    if (!existing || existing.siteId !== anchor.siteId) {
      throw new SiteRegisterFailure('NOT_FOUND', 'anchor was not found');
    }
    this.assertAnchorRegisterIdAvailable(anchor, anchor.anchorId);
    this.anchors.set(anchorKey, copyAnchor(anchor));
  }

  private assertClientExternalReferenceAvailable(
    client: ClientRecord,
    ignoredClientId?: string,
  ): void {
    if (client.externalReference === null) {
      return;
    }
    for (const existing of this.clients.values()) {
      if (
        existing.companyId === client.companyId &&
        existing.clientId !== ignoredClientId &&
        existing.externalReference === client.externalReference
      ) {
        throw new SiteRegisterFailure(
          'CONFLICT',
          'client external reference already exists',
        );
      }
    }
  }

  private assertSiteReferenceAvailable(
    site: SiteRecord,
    ignoredSiteId?: string,
  ): void {
    if (site.siteReference === null) {
      return;
    }
    for (const existing of this.sites.values()) {
      if (
        existing.companyId === site.companyId &&
        existing.siteId !== ignoredSiteId &&
        existing.siteReference === site.siteReference
      ) {
        throw new SiteRegisterFailure(
          'CONFLICT',
          'site reference already exists',
        );
      }
    }
  }

  private assertAnchorRegisterIdAvailable(
    anchor: AnchorRecord,
    ignoredAnchorId?: string,
  ): void {
    if (anchor.registerId === null) {
      return;
    }
    for (const existing of this.anchors.values()) {
      if (
        existing.companyId === anchor.companyId &&
        existing.siteId === anchor.siteId &&
        existing.anchorId !== ignoredAnchorId &&
        existing.registerId === anchor.registerId
      ) {
        throw new SiteRegisterFailure(
          'CONFLICT',
          'anchor register ID already exists at site',
        );
      }
    }
  }
}

export class UnconfiguredSiteRegisterStore implements SiteRegisterStore {
  private unavailable(): never {
    throw new SiteRegisterFailure(
      'PERSISTENCE_UNAVAILABLE',
      'site and anchor register persistence adapter is not configured',
    );
  }

  createClient(_client: ClientRecord): void {
    this.unavailable();
  }

  getClient(_companyId: string, _clientId: string): ClientRecord | undefined {
    return this.unavailable();
  }

  listClients(_companyId: string): readonly ClientRecord[] {
    return this.unavailable();
  }

  updateClient(_client: ClientRecord): void {
    this.unavailable();
  }

  createSite(_site: SiteRecord): void {
    this.unavailable();
  }

  getSite(_companyId: string, _siteId: string): SiteRecord | undefined {
    return this.unavailable();
  }

  listSites(_companyId: string): readonly SiteRecord[] {
    return this.unavailable();
  }

  updateSite(_site: SiteRecord): void {
    this.unavailable();
  }

  createAnchor(_anchor: AnchorRecord): void {
    this.unavailable();
  }

  getAnchor(
    _companyId: string,
    _siteId: string,
    _anchorId: string,
  ): AnchorRecord | undefined {
    return this.unavailable();
  }

  listAnchors(_companyId: string, _siteId: string): readonly AnchorRecord[] {
    return this.unavailable();
  }

  updateAnchor(_anchor: AnchorRecord): void {
    this.unavailable();
  }
}
