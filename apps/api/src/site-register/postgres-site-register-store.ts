import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import {
  ANCHOR_TYPES,
  REGISTER_STATUSES,
  SUPPORTED_JURISDICTIONS,
  SiteRegisterFailure,
  type AnchorRecord,
  type AnchorType,
  type ClientRecord,
  type RegisterStatus,
  type SiteRecord,
  type SiteRegisterStore,
  type SupportedJurisdiction,
} from './site-register.types';

interface ClientRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly client_id: unknown;
  readonly name: unknown;
  readonly contact_details: unknown;
  readonly external_reference: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface SiteRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly site_id: unknown;
  readonly client_id: unknown;
  readonly name: unknown;
  readonly address: unknown;
  readonly jurisdiction: unknown;
  readonly access_notes: unknown;
  readonly site_reference: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface AnchorRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly anchor_id: unknown;
  readonly site_id: unknown;
  readonly label: unknown;
  readonly register_id: unknown;
  readonly location: unknown;
  readonly anchor_type: unknown;
  readonly manufacturer: unknown;
  readonly model: unknown;
  readonly install_context: unknown;
  readonly register_status: unknown;
  readonly notes: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

const CLIENT_COLUMNS = `
  company_id,
  client_id,
  name,
  contact_details,
  external_reference,
  created_at,
  updated_at
`;

const SITE_COLUMNS = `
  company_id,
  site_id,
  client_id,
  name,
  address,
  jurisdiction,
  access_notes,
  site_reference,
  created_at,
  updated_at
`;

const ANCHOR_COLUMNS = `
  company_id,
  anchor_id,
  site_id,
  label,
  register_id,
  location,
  anchor_type,
  manufacturer,
  model,
  install_context,
  register_status,
  notes,
  created_at,
  updated_at
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === '23505';
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function storedFailure(field: string): SiteRegisterFailure {
  return new SiteRegisterFailure(
    'PERSISTENCE_UNAVAILABLE',
    `site register persistence returned invalid ${field}`,
  );
}

function requiredStoredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(field);
  }
  return value;
}

function nullableStoredString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return requiredStoredString(value, field);
}

function requiredStoredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(field);
  }
  return date;
}

function storedJurisdiction(value: unknown): SupportedJurisdiction {
  if (!SUPPORTED_JURISDICTIONS.includes(value as SupportedJurisdiction)) {
    throw storedFailure('jurisdiction');
  }
  return value as SupportedJurisdiction;
}

function storedAnchorType(value: unknown): AnchorType {
  if (!ANCHOR_TYPES.includes(value as AnchorType)) {
    throw storedFailure('anchor_type');
  }
  return value as AnchorType;
}

function storedRegisterStatus(value: unknown): RegisterStatus {
  if (!REGISTER_STATUSES.includes(value as RegisterStatus)) {
    throw storedFailure('register_status');
  }
  return value as RegisterStatus;
}

function parseClient(row: ClientRow, companyId: string): ClientRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  return {
    companyId: rowCompanyId,
    clientId: requiredStoredString(row.client_id, 'client_id'),
    name: requiredStoredString(row.name, 'name'),
    contactDetails: nullableStoredString(
      row.contact_details,
      'contact_details',
    ),
    externalReference: nullableStoredString(
      row.external_reference,
      'external_reference',
    ),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
    updatedAt: requiredStoredDate(row.updated_at, 'updated_at'),
  };
}

function parseSite(row: SiteRow, companyId: string): SiteRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  return {
    companyId: rowCompanyId,
    siteId: requiredStoredString(row.site_id, 'site_id'),
    clientId: requiredStoredString(row.client_id, 'client_id'),
    name: requiredStoredString(row.name, 'name'),
    address: nullableStoredString(row.address, 'address'),
    jurisdiction: storedJurisdiction(row.jurisdiction),
    accessNotes: nullableStoredString(row.access_notes, 'access_notes'),
    siteReference: nullableStoredString(row.site_reference, 'site_reference'),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
    updatedAt: requiredStoredDate(row.updated_at, 'updated_at'),
  };
}

function parseAnchor(row: AnchorRow, companyId: string): AnchorRecord {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw storedFailure('company_id');
  }
  return {
    companyId: rowCompanyId,
    anchorId: requiredStoredString(row.anchor_id, 'anchor_id'),
    siteId: requiredStoredString(row.site_id, 'site_id'),
    label: nullableStoredString(row.label, 'label'),
    registerId: nullableStoredString(row.register_id, 'register_id'),
    location: nullableStoredString(row.location, 'location'),
    anchorType: storedAnchorType(row.anchor_type),
    manufacturer: nullableStoredString(row.manufacturer, 'manufacturer'),
    model: nullableStoredString(row.model, 'model'),
    installContext: nullableStoredString(
      row.install_context,
      'install_context',
    ),
    registerStatus: storedRegisterStatus(row.register_status),
    notes: nullableStoredString(row.notes, 'notes'),
    createdAt: requiredStoredDate(row.created_at, 'created_at'),
    updatedAt: requiredStoredDate(row.updated_at, 'updated_at'),
  };
}

export class PostgresSiteRegisterStore implements SiteRegisterStore {
  constructor(private readonly database: SqlDatabase) {}

  async createClient(client: ClientRecord): Promise<void> {
    await this.execute(
      client.companyId,
      async (transaction) => {
        await transaction.query(
          `
          INSERT INTO clients (
            company_id, client_id, name, contact_details,
            external_reference, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            client.companyId,
            client.clientId,
            client.name,
            client.contactDetails,
            client.externalReference,
            client.createdAt,
            client.updatedAt,
          ],
        );
      },
      'client create',
    );
  }

  async getClient(
    companyId: string,
    clientId: string,
  ): Promise<ClientRecord | undefined> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<ClientRow>(
          `SELECT ${CLIENT_COLUMNS} FROM clients WHERE company_id = $1 AND client_id = $2`,
          [companyId, clientId],
        );
        const row = firstRow(result);
        return row ? parseClient(row, companyId) : undefined;
      },
      'client read',
    );
  }

  async listClients(companyId: string): Promise<readonly ClientRecord[]> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<ClientRow>(
          `SELECT ${CLIENT_COLUMNS} FROM clients WHERE company_id = $1 ORDER BY client_id`,
          [companyId],
        );
        return result.rows.map((row) => parseClient(row, companyId));
      },
      'client list',
    );
  }

  async updateClient(client: ClientRecord): Promise<void> {
    await this.execute(
      client.companyId,
      async (transaction) => {
        const result = await transaction.query(
          `
          UPDATE clients
          SET name = $3,
              contact_details = $4,
              external_reference = $5,
              updated_at = $6
          WHERE company_id = $1 AND client_id = $2
        `,
          [
            client.companyId,
            client.clientId,
            client.name,
            client.contactDetails,
            client.externalReference,
            client.updatedAt,
          ],
        );
        if (result.rowCount !== 1) {
          throw new SiteRegisterFailure('NOT_FOUND', 'client was not found');
        }
      },
      'client update',
    );
  }

  async createSite(site: SiteRecord): Promise<void> {
    await this.execute(
      site.companyId,
      async (transaction) => {
        await transaction.query(
          `
          INSERT INTO sites (
            company_id, site_id, client_id, name, address, jurisdiction,
            access_notes, site_reference, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            site.companyId,
            site.siteId,
            site.clientId,
            site.name,
            site.address,
            site.jurisdiction,
            site.accessNotes,
            site.siteReference,
            site.createdAt,
            site.updatedAt,
          ],
        );
      },
      'site create',
    );
  }

  async getSite(
    companyId: string,
    siteId: string,
  ): Promise<SiteRecord | undefined> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<SiteRow>(
          `SELECT ${SITE_COLUMNS} FROM sites WHERE company_id = $1 AND site_id = $2`,
          [companyId, siteId],
        );
        const row = firstRow(result);
        return row ? parseSite(row, companyId) : undefined;
      },
      'site read',
    );
  }

  async listSites(companyId: string): Promise<readonly SiteRecord[]> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<SiteRow>(
          `SELECT ${SITE_COLUMNS} FROM sites WHERE company_id = $1 ORDER BY site_id`,
          [companyId],
        );
        return result.rows.map((row) => parseSite(row, companyId));
      },
      'site list',
    );
  }

  async updateSite(site: SiteRecord): Promise<void> {
    await this.execute(
      site.companyId,
      async (transaction) => {
        const result = await transaction.query(
          `
          UPDATE sites
          SET client_id = $3,
              name = $4,
              address = $5,
              jurisdiction = $6,
              access_notes = $7,
              site_reference = $8,
              updated_at = $9
          WHERE company_id = $1 AND site_id = $2
        `,
          [
            site.companyId,
            site.siteId,
            site.clientId,
            site.name,
            site.address,
            site.jurisdiction,
            site.accessNotes,
            site.siteReference,
            site.updatedAt,
          ],
        );
        if (result.rowCount !== 1) {
          throw new SiteRegisterFailure('NOT_FOUND', 'site was not found');
        }
      },
      'site update',
    );
  }

  async createAnchor(anchor: AnchorRecord): Promise<void> {
    await this.execute(
      anchor.companyId,
      async (transaction) => {
        await transaction.query(
          `
          INSERT INTO anchors (
            company_id, anchor_id, site_id, label, register_id, location,
            anchor_type, manufacturer, model, install_context,
            register_status, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
          [
            anchor.companyId,
            anchor.anchorId,
            anchor.siteId,
            anchor.label,
            anchor.registerId,
            anchor.location,
            anchor.anchorType,
            anchor.manufacturer,
            anchor.model,
            anchor.installContext,
            anchor.registerStatus,
            anchor.notes,
            anchor.createdAt,
            anchor.updatedAt,
          ],
        );
      },
      'anchor create',
    );
  }

  async getAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): Promise<AnchorRecord | undefined> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<AnchorRow>(
          `
            SELECT ${ANCHOR_COLUMNS}
            FROM anchors
            WHERE company_id = $1 AND site_id = $2 AND anchor_id = $3
          `,
          [companyId, siteId, anchorId],
        );
        const row = firstRow(result);
        return row ? parseAnchor(row, companyId) : undefined;
      },
      'anchor read',
    );
  }

  async listAnchors(
    companyId: string,
    siteId: string,
  ): Promise<readonly AnchorRecord[]> {
    return this.execute(
      companyId,
      async (transaction) => {
        const result = await transaction.query<AnchorRow>(
          `
            SELECT ${ANCHOR_COLUMNS}
            FROM anchors
            WHERE company_id = $1 AND site_id = $2
            ORDER BY anchor_id
          `,
          [companyId, siteId],
        );
        return result.rows.map((row) => parseAnchor(row, companyId));
      },
      'anchor list',
    );
  }

  async updateAnchor(anchor: AnchorRecord): Promise<void> {
    await this.execute(
      anchor.companyId,
      async (transaction) => {
        const result = await transaction.query(
          `
          UPDATE anchors
          SET label = $4,
              register_id = $5,
              location = $6,
              anchor_type = $7,
              manufacturer = $8,
              model = $9,
              install_context = $10,
              register_status = $11,
              notes = $12,
              updated_at = $13
          WHERE company_id = $1 AND site_id = $2 AND anchor_id = $3
        `,
          [
            anchor.companyId,
            anchor.siteId,
            anchor.anchorId,
            anchor.label,
            anchor.registerId,
            anchor.location,
            anchor.anchorType,
            anchor.manufacturer,
            anchor.model,
            anchor.installContext,
            anchor.registerStatus,
            anchor.notes,
            anchor.updatedAt,
          ],
        );
        if (result.rowCount !== 1) {
          throw new SiteRegisterFailure('NOT_FOUND', 'anchor was not found');
        }
      },
      'anchor update',
    );
  }

  private async execute<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
    operation: string,
  ): Promise<T> {
    try {
      return await this.database.transaction(async (transaction) => {
        const context = setTenantContextStatement(
          createTenantContext(companyId),
        );
        await transaction.query(context.text, context.values);
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof SiteRegisterFailure) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new SiteRegisterFailure(
          'CONFLICT',
          `${operation} conflicts with an existing record`,
        );
      }
      throw new SiteRegisterFailure(
        'PERSISTENCE_UNAVAILABLE',
        `site register ${operation} persistence is unavailable`,
      );
    }
  }
}
