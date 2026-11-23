import { randomBytes } from 'node:crypto';

import type { AuthPrincipal, ProductRole } from '../identity/auth.types';
import type { AnchorRecord } from '../site-register/site-register.types';
import type {
  SyncJurisdiction,
  SyncReconciliationProposal,
  SyncRecordedOutcome,
} from '../sync/sync.types';
import type { SubmittedPhotoUploadState } from '../review/review.types';

export const RECONCILIATION_DECISIONS = ['accepted', 'rejected'] as const;
export type ReconciliationDecision = (typeof RECONCILIATION_DECISIONS)[number];

/** The one decision action a caller can request for a proposal. */
export const RECONCILIATION_DECISION_ACTIONS = ['accept', 'reject'] as const;
export type ReconciliationDecisionAction =
  (typeof RECONCILIATION_DECISION_ACTIONS)[number];

/** Photo reference for one proposal. Bytes stay private and are not read here. */
export interface RegisterProposalPhoto {
  readonly photoId: string;
  readonly localId: string;
  readonly checksum: string | null;
  readonly capturedAt: string | null;
  readonly uploadState: SubmittedPhotoUploadState;
}

/**
 * One open reconciliation proposal as the office can read it. Values are
 * recorded outcomes copied from the submitted anchor inspection; this
 * boundary derives no jurisdiction rule and rewrites no submitted evidence.
 */
export interface RegisterReconciliationProposal {
  readonly companyId: string;
  readonly proposalId: string;
  readonly inspectionId: string;
  readonly revisionNumber: number;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly proposalType: SyncReconciliationProposal;
  readonly provisionalAnchorId: string | null;
  readonly reconciliationReferenceId: string | null;
  readonly inspectorNote: string | null;
  readonly recordedLocation: string | null;
  readonly recordedOutcome: SyncRecordedOutcome | null;
  readonly submittedByUserId: string;
  readonly submittedAt: Date;
  readonly photos: readonly RegisterProposalPhoto[];
}

/**
 * One recorded office decision for a submitted proposal. Accept decisions
 * carry the register anchor that was created or updated; reject decisions
 * carry the recorded reason and touch no register anchor.
 */
export interface RegisterProposalDecisionRecord {
  readonly companyId: string;
  readonly proposalDecisionId: string;
  readonly proposalId: string;
  readonly inspectionId: string;
  readonly siteId: string;
  readonly proposalType: SyncReconciliationProposal;
  readonly decision: ReconciliationDecision;
  readonly decidedByUserId: string;
  readonly decidedAt: Date;
  readonly registerAnchorId: string | null;
  readonly assignedLabel: string | null;
  readonly assignedLocation: string | null;
  readonly reason: string | null;
}

export interface RegisterProposalAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string;
  readonly action: 'register.proposal_accepted' | 'register.proposal_rejected';
  readonly targetType: 'register_proposal_decision';
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/** The register anchor change that one accept decision performs. */
export type RegisterAnchorWrite =
  | { readonly kind: 'create'; readonly anchor: AnchorRecord }
  | { readonly kind: 'update'; readonly anchor: AnchorRecord };

export type RegisterReconciliationFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class RegisterReconciliationFailure extends Error {
  constructor(
    readonly code: RegisterReconciliationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'RegisterReconciliationFailure';
  }
}

export interface RegisterReconciliationStore {
  listOpenProposals(
    companyId: string,
    siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]>;

  findProposal(
    companyId: string,
    siteId: string,
    proposalId: string,
  ): Promise<RegisterReconciliationProposal | undefined>;

  findDecision(
    companyId: string,
    proposalId: string,
  ): Promise<RegisterProposalDecisionRecord | undefined>;

  findAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): Promise<AnchorRecord | undefined>;

  /**
   * Persists one decision, its register anchor change and the audit event in
   * the same tenant-bound transaction. Returns false when the proposal
   * already carries a decision. A reject decision passes no anchor write.
   */
  decideProposal(
    proposal: RegisterReconciliationProposal,
    decision: RegisterProposalDecisionRecord,
    anchorWrite: RegisterAnchorWrite | null,
    auditEvent: RegisterProposalAuditEvent,
  ): Promise<boolean>;
}

export interface RegisterReconciliationClock {
  now(): Date;
}

export interface RegisterReconciliationIdGenerator {
  createId(): string;
}

export function canDecideRegisterProposals(role: ProductRole): boolean {
  return role === 'administrator' || role === 'office_reviewer';
}

export function assertCanDecideRegisterProposals(
  principal: AuthPrincipal,
): void {
  if (!canDecideRegisterProposals(principal.role)) {
    throw new RegisterReconciliationFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}

export const secureRegisterReconciliationIdGenerator: RegisterReconciliationIdGenerator =
  {
    createId: () => randomBytes(16).toString('hex'),
  };

export const systemRegisterReconciliationClock: RegisterReconciliationClock = {
  now: () => new Date(),
};

export class UnconfiguredRegisterReconciliationStore
  implements RegisterReconciliationStore
{
  private unavailable(): never {
    throw new RegisterReconciliationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'register reconciliation persistence adapter is not configured',
    );
  }

  listOpenProposals(
    _companyId: string,
    _siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]> {
    return this.unavailable();
  }

  findProposal(
    _companyId: string,
    _siteId: string,
    _proposalId: string,
  ): Promise<RegisterReconciliationProposal | undefined> {
    return this.unavailable();
  }

  findDecision(
    _companyId: string,
    _proposalId: string,
  ): Promise<RegisterProposalDecisionRecord | undefined> {
    return this.unavailable();
  }

  findAnchor(
    _companyId: string,
    _siteId: string,
    _anchorId: string,
  ): Promise<AnchorRecord | undefined> {
    return this.unavailable();
  }

  decideProposal(
    _proposal: RegisterReconciliationProposal,
    _decision: RegisterProposalDecisionRecord,
    _anchorWrite: RegisterAnchorWrite | null,
    _auditEvent: RegisterProposalAuditEvent,
  ): Promise<boolean> {
    return this.unavailable();
  }
}
