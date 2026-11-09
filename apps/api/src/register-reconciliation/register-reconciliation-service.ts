import type { AuthPrincipal } from '../identity/auth.types';
import type { AnchorRecord } from '../site-register/site-register.types';
import type {
  RegisterReconciliationClock,
  RegisterReconciliationIdGenerator,
  RegisterReconciliationStore,
} from './register-reconciliation.types';
import {
  RECONCILIATION_DECISION_ACTIONS,
  RegisterReconciliationFailure,
  assertCanDecideRegisterProposals,
  type ReconciliationDecisionAction,
  type RegisterAnchorWrite,
  type RegisterProposalDecisionRecord,
  type RegisterReconciliationProposal,
} from './register-reconciliation.types';

const ID_MAX_LENGTH = 128;
const LABEL_MAX_LENGTH = 128;
const LOCATION_MAX_LENGTH = 2000;
const REASON_MAX_LENGTH = 10_000;

export interface DecideRegisterProposalInput {
  readonly decision: ReconciliationDecisionAction;
  readonly assignedLabel?: string | null;
  readonly location?: string | null;
  readonly reason?: string;
}

export interface RegisterReconciliationServiceOptions {
  readonly store: RegisterReconciliationStore;
  readonly clock: RegisterReconciliationClock;
  readonly idGenerator: RegisterReconciliationIdGenerator;
}

export interface RegisterProposalDecisionResult {
  readonly decision: RegisterProposalDecisionRecord;
  readonly replayed: boolean;
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function copyProposal(
  proposal: RegisterReconciliationProposal,
): RegisterReconciliationProposal {
  return {
    ...proposal,
    submittedAt: copyDate(proposal.submittedAt),
    photos: proposal.photos.map((photo) => ({ ...photo })),
  };
}

function copyDecision(
  decision: RegisterProposalDecisionRecord,
): RegisterProposalDecisionRecord {
  return { ...decision, decidedAt: copyDate(decision.decidedAt) };
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `${field} is required`,
    );
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > ID_MAX_LENGTH) {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `${field} must be between 1 and ${ID_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function optionalAssignedText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `${field} must be text`,
    );
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized.length > 0 ? normalized : null;
}

function requiredReason(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      'reason is required',
    );
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > REASON_MAX_LENGTH) {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `reason must be between 1 and ${REASON_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function requiredDecisionAction(value: unknown): ReconciliationDecisionAction {
  if (
    typeof value !== 'string' ||
    !RECONCILIATION_DECISION_ACTIONS.includes(
      value as ReconciliationDecisionAction,
    )
  ) {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      'decision must be accept or reject',
    );
  }
  return value as ReconciliationDecisionAction;
}

function decisionForAction(
  action: ReconciliationDecisionAction,
): 'accepted' | 'rejected' {
  return action === 'accept' ? 'accepted' : 'rejected';
}

function rejectField(value: unknown, field: string): void {
  if (value !== undefined) {
    throw new RegisterReconciliationFailure(
      'INVALID_INPUT',
      `${field} is not part of this decision`,
    );
  }
}

export class RegisterReconciliationService {
  constructor(private readonly options: RegisterReconciliationServiceOptions) {}

  async listOpenProposals(
    principal: AuthPrincipal,
    siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]> {
    assertCanDecideRegisterProposals(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const proposals = await this.options.store.listOpenProposals(
      principal.companyId,
      normalizedSiteId,
    );
    return proposals.map(copyProposal);
  }

  async decideProposal(
    principal: AuthPrincipal,
    siteId: string,
    proposalId: string,
    input: DecideRegisterProposalInput,
  ): Promise<RegisterProposalDecisionResult> {
    assertCanDecideRegisterProposals(principal);
    const normalizedSiteId = requiredId(siteId, 'siteId');
    const normalizedProposalId = requiredId(proposalId, 'proposalId');

    const action = requiredDecisionAction(input?.decision);
    const reason = action === 'reject' ? requiredReason(input.reason) : null;
    if (action === 'accept') {
      rejectField(input.reason, 'reason');
    }
    const assignedLabel = optionalAssignedText(
      input.assignedLabel,
      'assignedLabel',
      LABEL_MAX_LENGTH,
    );
    const assignedLocation = optionalAssignedText(
      input.location,
      'location',
      LOCATION_MAX_LENGTH,
    );
    if (action === 'reject') {
      rejectField(assignedLabel, 'assignedLabel');
      rejectField(assignedLocation, 'location');
    }

    const existingDecision = await this.options.store.findDecision(
      principal.companyId,
      normalizedProposalId,
    );
    if (existingDecision) {
      this.rejectOtherDecision(existingDecision, action);
      return { decision: copyDecision(existingDecision), replayed: true };
    }

    const proposal = await this.options.store.findProposal(
      principal.companyId,
      normalizedSiteId,
      normalizedProposalId,
    );
    if (!proposal) {
      throw new RegisterReconciliationFailure(
        'NOT_FOUND',
        'reconciliation proposal was not found',
      );
    }

    const decidedAt = copyDate(this.options.clock.now());
    const proposalDecisionId = requiredId(
      this.options.idGenerator.createId(),
      'proposalDecisionId',
    );
    const anchorWrite = await this.buildAnchorWrite(
      principal,
      proposal,
      action,
      assignedLabel,
      assignedLocation,
    );

    const decision: RegisterProposalDecisionRecord = {
      companyId: principal.companyId,
      proposalDecisionId,
      proposalId: proposal.proposalId,
      inspectionId: proposal.inspectionId,
      siteId: proposal.siteId,
      proposalType: proposal.proposalType,
      decision: decisionForAction(action),
      decidedByUserId: principal.userId,
      decidedAt,
      registerAnchorId: anchorWrite ? anchorWrite.anchor.anchorId : null,
      assignedLabel: action === 'accept' ? (assignedLabel ?? null) : null,
      assignedLocation: action === 'accept' ? (assignedLocation ?? null) : null,
      reason,
    };
    const auditMetadata = auditMetadataFor(
      decision,
      proposal.provisionalAnchorId,
    );

    const applied = await this.options.store.decideProposal(
      proposal,
      decision,
      anchorWrite,
      {
        companyId: principal.companyId,
        actorUserId: principal.userId,
        action:
          action === 'accept'
            ? 'register.proposal_accepted'
            : 'register.proposal_rejected',
        targetType: 'register_proposal_decision',
        targetId: proposalDecisionId,
        occurredAt: decidedAt,
        metadata: auditMetadata,
      },
    );
    if (applied) {
      return { decision: copyDecision(decision), replayed: false };
    }

    const replayDecision = await this.options.store.findDecision(
      principal.companyId,
      normalizedProposalId,
    );
    if (!replayDecision) {
      throw new RegisterReconciliationFailure(
        'NOT_FOUND',
        'reconciliation proposal was not found',
      );
    }
    this.rejectOtherDecision(replayDecision, action);
    return { decision: copyDecision(replayDecision), replayed: true };
  }

  private rejectOtherDecision(
    existing: RegisterProposalDecisionRecord,
    action: ReconciliationDecisionAction,
  ): void {
    if (existing.decision !== decisionForAction(action)) {
      throw new RegisterReconciliationFailure(
        'CONFLICT',
        'proposal was already decided',
      );
    }
  }

  private async buildAnchorWrite(
    principal: AuthPrincipal,
    proposal: RegisterReconciliationProposal,
    action: ReconciliationDecisionAction,
    assignedLabel: string | null | undefined,
    assignedLocation: string | null | undefined,
  ): Promise<RegisterAnchorWrite | null> {
    if (action === 'reject') {
      return null;
    }

    if (proposal.proposalType === 'newly_discovered') {
      const anchorId = requiredId(
        this.options.idGenerator.createId(),
        'anchorId',
      );
      const createdAt = copyDate(this.options.clock.now());
      return {
        kind: 'create',
        anchor: {
          companyId: principal.companyId,
          anchorId,
          siteId: proposal.siteId,
          label: assignedLabel ?? null,
          registerId: null,
          location: assignedLocation ?? null,
          anchorType: 'single_point',
          manufacturer: null,
          model: null,
          installContext: null,
          registerStatus: 'active',
          notes: null,
          createdAt,
          updatedAt: copyDate(createdAt),
        },
      };
    }

    const referencedAnchorId = requiredId(
      proposal.reconciliationReferenceId,
      'reconciliationReferenceId',
    );
    const existing = await this.options.store.findAnchor(
      principal.companyId,
      proposal.siteId,
      referencedAnchorId,
    );
    if (!existing) {
      throw new RegisterReconciliationFailure(
        'NOT_FOUND',
        'referenced register anchor was not found',
      );
    }
    return {
      kind: 'update',
      anchor: {
        ...existing,
        label:
          assignedLabel === undefined
            ? existing.label
            : (assignedLabel ?? null),
        location:
          assignedLocation === undefined
            ? existing.location
            : (assignedLocation ?? null),
        updatedAt: copyDate(this.options.clock.now()),
      } satisfies AnchorRecord,
    };
  }
}

function auditMetadataFor(
  decision: RegisterProposalDecisionRecord,
  provisionalAnchorId: string | null,
): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {
    inspectionId: decision.inspectionId,
    proposalType: decision.proposalType,
    siteId: decision.siteId,
  };
  if (provisionalAnchorId) {
    metadata.provisionalAnchorId = provisionalAnchorId;
  }
  if (decision.registerAnchorId) {
    metadata.registerAnchorId = decision.registerAnchorId;
  }
  if (decision.assignedLabel) {
    metadata.assignedLabel = decision.assignedLabel;
  }
  if (decision.assignedLocation) {
    metadata.assignedLocation = decision.assignedLocation;
  }
  if (decision.reason) {
    metadata.reason = decision.reason;
  }
  return metadata;
}
