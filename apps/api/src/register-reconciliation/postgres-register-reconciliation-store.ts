import { randomBytes } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import type { AnchorRecord } from '../site-register/site-register.types';
import { RegisterReconciliationFailure } from './register-reconciliation.types';
import type {
  RegisterAnchorWrite,
  RegisterProposalAuditEvent,
  RegisterProposalDecisionRecord,
  RegisterProposalPhoto,
  RegisterReconciliationProposal,
  RegisterReconciliationStore,
} from './register-reconciliation.types';

interface ProposalRow extends Record<string, unknown> {
  readonly anchor_inspection_id: unknown;
  readonly inspection_id: unknown;
  readonly revision_number: unknown;
  readonly job_id: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly reconciliation_proposal: unknown;
  readonly provisional_anchor_id: unknown;
  readonly reconciliation_reference_id: unknown;
  readonly notes: unknown;
  readonly location: unknown;
  readonly recorded_outcome: unknown;
  readonly inspector_user_id: unknown;
  readonly submitted_at: unknown;
}

interface DecisionRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly proposal_decision_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly inspection_id: unknown;
  readonly site_id: unknown;
  readonly proposal_type: unknown;
  readonly decision: unknown;
  readonly decided_by_user_id: unknown;
  readonly register_anchor_id: unknown;
  readonly assigned_label: unknown;
  readonly assigned_location: unknown;
  readonly reason: unknown;
  readonly created_at: unknown;
}

interface PhotoRow extends Record<string, unknown> {
  readonly photo_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly local_id: unknown;
  readonly sha256: unknown;
  readonly capture_time: unknown;
  readonly upload_state: unknown;
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

const PROPOSAL_COLUMNS = `
  ai.anchor_inspection_id,
  ai.reconciliation_proposal,
  ai.provisional_anchor_id,
  ai.reconciliation_reference_id,
  ai.notes,
  ai.location,
  ai.recorded_outcome,
  ins.inspection_id,
  ins.revision_number,
  ins.job_id,
  ins.site_id,
  ins.jurisdiction,
  ins.inspector_user_id,
  ins.submitted_at
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function rowsAffected(result: SqlResult<Record<string, unknown>>): number {
  return result.rowCount ?? result.rows.length;
}

function storedFailure(message: string): RegisterReconciliationFailure {
  return new RegisterReconciliationFailure(
    'PERSISTENCE_UNAVAILABLE',
    `register reconciliation persistence returned invalid ${message}`,
  );
}

function storedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(field);
  }
  return value;
}

function storedNullableString(value: unknown, field: string): string | null {
  return value === null || value === undefined
    ? null
    : storedString(value, field);
}

function storedDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(field);
  }
  return date;
}

function storedNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw storedFailure(field);
  }
  return number;
}

function storedJurisdiction(value: unknown): string {
  if (value !== 'NSW' && value !== 'QLD') {
    throw storedFailure('jurisdiction');
  }
  return value;
}

function storedProposalType(value: unknown): string {
  if (
    value !== 'newly_discovered' &&
    value !== 'replacement' &&
    value !== 'duplicate'
  ) {
    throw storedFailure('reconciliation_proposal');
  }
  return value;
}

function storedOutcome(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    value !== 'serviceable' &&
    value !== 'defective' &&
    value !== 'not_inspected' &&
    value !== 'further_assessment_required'
  ) {
    throw storedFailure('recorded_outcome');
  }
  return value;
}

function storedUploadState(value: unknown): string {
  if (
    value !== 'pending_upload' &&
    value !== 'uploaded' &&
    value !== 'failed'
  ) {
    throw storedFailure('upload_state');
  }
  return value;
}

function parseProposal(
  row: ProposalRow,
  companyId: string,
): Omit<RegisterReconciliationProposal, 'photos'> {
  const rowCompanyCheck = storedString(row.site_id, 'site_id');
  if (rowCompanyCheck.length === 0) {
    throw storedFailure('site_id');
  }
  return {
    companyId,
    proposalId: storedString(row.anchor_inspection_id, 'anchor_inspection_id'),
    inspectionId: storedString(row.inspection_id, 'inspection_id'),
    revisionNumber: storedNumber(row.revision_number, 'revision_number'),
    jobId: storedString(row.job_id, 'job_id'),
    siteId: rowCompanyCheck,
    jurisdiction: storedJurisdiction(
      row.jurisdiction,
    ) as RegisterReconciliationProposal['jurisdiction'],
    proposalType: storedProposalType(
      row.reconciliation_proposal,
    ) as RegisterReconciliationProposal['proposalType'],
    provisionalAnchorId: storedNullableString(
      row.provisional_anchor_id,
      'provisional_anchor_id',
    ),
    reconciliationReferenceId: storedNullableString(
      row.reconciliation_reference_id,
      'reconciliation_reference_id',
    ),
    inspectorNote: storedNullableString(row.notes, 'notes'),
    recordedLocation: storedNullableString(row.location, 'location'),
    recordedOutcome: storedOutcome(
      row.recorded_outcome,
    ) as RegisterReconciliationProposal['recordedOutcome'],
    submittedByUserId: storedString(row.inspector_user_id, 'inspector_user_id'),
    submittedAt: storedDate(row.submitted_at, 'submitted_at'),
  } satisfies Omit<RegisterReconciliationProposal, 'photos'>;
}

function parseDecision(
  row: DecisionRow,
  companyId: string,
): RegisterProposalDecisionRecord {
  const rowCompanyId = storedString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new RegisterReconciliationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'register reconciliation persistence crossed company scope',
    );
  }
  return {
    companyId: rowCompanyId,
    proposalDecisionId: storedString(
      row.proposal_decision_id,
      'proposal_decision_id',
    ),
    proposalId: storedString(row.anchor_inspection_id, 'anchor_inspection_id'),
    inspectionId: storedString(row.inspection_id, 'inspection_id'),
    siteId: storedString(row.site_id, 'site_id'),
    proposalType: storedProposalType(
      row.proposal_type,
    ) as RegisterProposalDecisionRecord['proposalType'],
    decision: storedString(row.decision, 'decision') as 'accepted' | 'rejected',
    decidedByUserId: storedString(row.decided_by_user_id, 'decided_by_user_id'),
    decidedAt: storedDate(row.created_at, 'created_at'),
    registerAnchorId: storedNullableString(
      row.register_anchor_id,
      'register_anchor_id',
    ),
    assignedLabel: storedNullableString(row.assigned_label, 'assigned_label'),
    assignedLocation: storedNullableString(
      row.assigned_location,
      'assigned_location',
    ),
    reason: storedNullableString(row.reason, 'reason'),
  };
}

function parseAnchor(row: AnchorRow, companyId: string): AnchorRecord {
  const rowCompanyId = storedString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new RegisterReconciliationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'register reconciliation persistence crossed company scope',
    );
  }
  const anchorType = storedString(row.anchor_type, 'anchor_type');
  if (anchorType !== 'single_point') {
    throw storedFailure('anchor_type');
  }
  const registerStatus = storedString(row.register_status, 'register_status');
  if (
    registerStatus !== 'active' &&
    registerStatus !== 'inactive' &&
    registerStatus !== 'archived'
  ) {
    throw storedFailure('register_status');
  }
  return {
    companyId: rowCompanyId,
    anchorId: storedString(row.anchor_id, 'anchor_id'),
    siteId: storedString(row.site_id, 'site_id'),
    label: storedNullableString(row.label, 'label'),
    registerId: storedNullableString(row.register_id, 'register_id'),
    location: storedNullableString(row.location, 'location'),
    anchorType: 'single_point',
    manufacturer: storedNullableString(row.manufacturer, 'manufacturer'),
    model: storedNullableString(row.model, 'model'),
    installContext: storedNullableString(
      row.install_context,
      'install_context',
    ),
    registerStatus,
    notes: storedNullableString(row.notes, 'notes'),
    createdAt: storedDate(row.created_at, 'created_at'),
    updatedAt: storedDate(row.updated_at, 'updated_at'),
  };
}

/**
 * Tenant-bound persistence for register reconciliation decisions. Listing,
 * proposal lookup and decision lookup run read statements; one decision
 * writes the decision row, its register anchor change and the generic audit
 * event in the same transaction so a visible decision cannot exist without
 * its audit history.
 */
export class PostgresRegisterReconciliationStore
  implements RegisterReconciliationStore
{
  constructor(private readonly database: SqlDatabase) {}

  listOpenProposals(
    companyId: string,
    siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]> {
    return this.withTenant(companyId, async (transaction) => {
      await this.requireSite(transaction, companyId, siteId);
      const proposals = await this.readProposals(
        transaction,
        companyId,
        siteId,
      );
      return proposals;
    });
  }

  findProposal(
    companyId: string,
    siteId: string,
    proposalId: string,
  ): Promise<RegisterReconciliationProposal | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      await this.requireSite(transaction, companyId, siteId);
      const result = await transaction.query<ProposalRow>(
        `
          SELECT ${PROPOSAL_COLUMNS}
          FROM anchor_inspections ai
          JOIN inspections ins
            ON ins.company_id = ai.company_id
           AND ins.inspection_id = ai.inspection_id
          WHERE ai.company_id = $1
            AND ai.site_id = $2
            AND ai.anchor_inspection_id = $3
            AND ai.reconciliation_proposal IS NOT NULL
        `,
        [companyId, siteId, proposalId],
      );
      const row = firstRow(result);
      if (!row) return undefined;
      const proposal = parseProposal(row, companyId);
      const photos = await this.readProposalPhotos(transaction, companyId, [
        proposal.proposalId,
      ]);
      return { ...proposal, photos: photos.get(proposal.proposalId) ?? [] };
    });
  }

  findDecision(
    companyId: string,
    proposalId: string,
  ): Promise<RegisterProposalDecisionRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<DecisionRow>(
        `
          SELECT company_id, proposal_decision_id, anchor_inspection_id,
                 inspection_id, site_id, proposal_type, decision,
                 decided_by_user_id, register_anchor_id, assigned_label,
                 assigned_location, reason, created_at
          FROM register_reconciliation_decisions
          WHERE company_id = $1 AND anchor_inspection_id = $2
        `,
        [companyId, proposalId],
      );
      const row = firstRow(result);
      return row ? parseDecision(row, companyId) : undefined;
    });
  }

  findAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): Promise<AnchorRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<AnchorRow>(
        `
          SELECT company_id, anchor_id, site_id, label, register_id, location,
                 anchor_type, manufacturer, model, install_context,
                 register_status, notes, created_at, updated_at
          FROM anchors
          WHERE company_id = $1 AND site_id = $2 AND anchor_id = $3
        `,
        [companyId, siteId, anchorId],
      );
      const row = firstRow(result);
      return row ? parseAnchor(row, companyId) : undefined;
    });
  }

  decideProposal(
    proposal: RegisterReconciliationProposal,
    decision: RegisterProposalDecisionRecord,
    anchorWrite: RegisterAnchorWrite | null,
    auditEvent: RegisterProposalAuditEvent,
  ): Promise<boolean> {
    return this.withTenant(decision.companyId, async (transaction) => {
      const inserted = await transaction.query<Record<string, unknown>>(
        `
          INSERT INTO register_reconciliation_decisions (
            company_id, proposal_decision_id, anchor_inspection_id,
            inspection_id, site_id, proposal_type, decision,
            decided_by_user_id, register_anchor_id, assigned_label,
            assigned_location, reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (company_id, anchor_inspection_id) DO NOTHING
        `,
        [
          decision.companyId,
          decision.proposalDecisionId,
          decision.proposalId,
          decision.inspectionId,
          decision.siteId,
          decision.proposalType,
          decision.decision,
          decision.decidedByUserId,
          decision.registerAnchorId,
          decision.assignedLabel,
          decision.assignedLocation,
          decision.reason,
          decision.decidedAt,
        ],
      );
      if (rowsAffected(inserted) === 0) return false;

      if (anchorWrite) {
        if (anchorWrite.kind === 'create') {
          await this.insertAnchor(transaction, anchorWrite.anchor);
        } else {
          await this.updateAnchor(transaction, anchorWrite.anchor);
        }
      }
      await this.insertAuditEvent(transaction, auditEvent);
      return true;
    });
  }

  private async readProposals(
    transaction: SqlTransaction,
    companyId: string,
    siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]> {
    const result = await transaction.query<ProposalRow>(
      `
        SELECT ${PROPOSAL_COLUMNS}
        FROM anchor_inspections ai
        JOIN inspections ins
          ON ins.company_id = ai.company_id
         AND ins.inspection_id = ai.inspection_id
        LEFT JOIN register_reconciliation_decisions decision
          ON decision.company_id = ai.company_id
         AND decision.anchor_inspection_id = ai.anchor_inspection_id
        WHERE ai.company_id = $1
          AND ai.site_id = $2
          AND ai.reconciliation_proposal IS NOT NULL
          AND decision.proposal_decision_id IS NULL
        ORDER BY ins.submitted_at DESC, ai.anchor_inspection_id ASC
      `,
      [companyId, siteId],
    );
    const proposals = result.rows.map((row) => parseProposal(row, companyId));
    if (proposals.length === 0) return [];

    const photos = await this.readProposalPhotos(
      transaction,
      companyId,
      proposals.map((proposal) => proposal.proposalId),
    );
    return proposals.map((proposal) => ({
      ...proposal,
      photos: photos.get(proposal.proposalId) ?? [],
    }));
  }

  private async readProposalPhotos(
    transaction: SqlTransaction,
    companyId: string,
    anchorInspectionIds: readonly string[],
  ): Promise<Map<string, RegisterProposalPhoto[]>> {
    const result = await transaction.query<PhotoRow>(
      `
        SELECT p.photo_id, p.anchor_inspection_id, p.local_id, o.sha256,
               p.capture_time, p.upload_state
        FROM photos p
        JOIN object_references o
          ON o.company_id = p.company_id
         AND o.object_id = p.object_id
        WHERE p.company_id = $1
          AND p.anchor_inspection_id = ANY($2)
        ORDER BY p.created_at ASC, p.photo_id ASC
      `,
      [companyId, [...anchorInspectionIds]],
    );
    const photosByAnchor = new Map<string, RegisterProposalPhoto[]>();
    for (const row of result.rows) {
      const anchorInspectionId = storedString(
        row.anchor_inspection_id,
        'photo.anchor_inspection_id',
      );
      const captureTime =
        row.capture_time === null || row.capture_time === undefined
          ? null
          : storedDate(row.capture_time, 'photo.capture_time');
      const photo: RegisterProposalPhoto = {
        photoId: storedString(row.photo_id, 'photo.photo_id'),
        localId: storedString(row.local_id, 'photo.local_id'),
        checksum: storedNullableString(row.sha256, 'photo.sha256'),
        capturedAt: captureTime ? captureTime.toISOString() : null,
        uploadState: storedUploadState(
          row.upload_state,
        ) as RegisterProposalPhoto['uploadState'],
      };
      const existing = photosByAnchor.get(anchorInspectionId) ?? [];
      existing.push(photo);
      photosByAnchor.set(anchorInspectionId, existing);
    }
    return photosByAnchor;
  }

  private async requireSite(
    transaction: SqlTransaction,
    companyId: string,
    siteId: string,
  ): Promise<void> {
    const site = firstRow(
      await transaction.query<Record<string, unknown>>(
        `
          SELECT site_id
          FROM sites
          WHERE company_id = $1 AND site_id = $2
        `,
        [companyId, siteId],
      ),
    );
    if (!site) {
      throw new RegisterReconciliationFailure(
        'NOT_FOUND',
        'site was not found',
      );
    }
  }

  private async insertAnchor(
    transaction: SqlTransaction,
    anchor: AnchorRecord,
  ): Promise<void> {
    const result = await transaction.query<Record<string, unknown>>(
      `
        INSERT INTO anchors (
          company_id, anchor_id, site_id, label, register_id, location,
          anchor_type, manufacturer, model, install_context, register_status,
          notes, created_at, updated_at
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
    if (rowsAffected(result) !== 1) {
      throw new RegisterReconciliationFailure(
        'PERSISTENCE_UNAVAILABLE',
        'accept decision could not create the register anchor',
      );
    }
  }

  private async updateAnchor(
    transaction: SqlTransaction,
    anchor: AnchorRecord,
  ): Promise<void> {
    const result = await transaction.query<Record<string, unknown>>(
      `
        UPDATE anchors
        SET label = $3, location = $4, updated_at = $5
        WHERE company_id = $1 AND anchor_id = $2 AND site_id = $6
      `,
      [
        anchor.companyId,
        anchor.anchorId,
        anchor.label,
        anchor.location,
        anchor.updatedAt,
        anchor.siteId,
      ],
    );
    if (rowsAffected(result) !== 1) {
      throw new RegisterReconciliationFailure(
        'NOT_FOUND',
        'referenced register anchor was not found for the accept decision',
      );
    }
  }

  private async insertAuditEvent(
    transaction: SqlTransaction,
    event: RegisterProposalAuditEvent,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO audit_events (
          company_id, audit_event_id, actor_user_id, action, target_type,
          target_id, transition_metadata, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        event.companyId,
        randomBytes(16).toString('hex'),
        event.actorUserId,
        event.action,
        event.targetType,
        event.targetId,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.occurredAt,
      ],
    );
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new RegisterReconciliationFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }

    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof RegisterReconciliationFailure) throw error;
      switch (errorCode(error)) {
        case '23503':
          throw new RegisterReconciliationFailure(
            'NOT_FOUND',
            'reconciliation target or reviewer membership was not found',
          );
        case '23505':
          throw new RegisterReconciliationFailure(
            'CONFLICT',
            'reconciliation decision identity already exists',
          );
        case '23514':
          throw new RegisterReconciliationFailure(
            'INVALID_INPUT',
            'reconciliation decision violates a supported workflow constraint',
          );
        default:
          throw new RegisterReconciliationFailure(
            'PERSISTENCE_UNAVAILABLE',
            'register reconciliation persistence is unavailable',
          );
      }
    }
  }
}
