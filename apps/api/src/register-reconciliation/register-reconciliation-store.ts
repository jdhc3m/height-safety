import type { AnchorRecord } from '../site-register/site-register.types';
import type {
  RegisterAnchorWrite,
  RegisterProposalAuditEvent,
  RegisterProposalDecisionRecord,
  RegisterReconciliationProposal,
  RegisterReconciliationStore,
} from './register-reconciliation.types';

function key(companyId: string, id: string): string {
  return `${companyId}:${id}`;
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

/**
 * In-memory proof for service and controller protocol tests. It mirrors the
 * durable adapter contract: one decision per proposal, the register anchor
 * change and the audit event are recorded together.
 */
export class InMemoryRegisterReconciliationStore
  implements RegisterReconciliationStore
{
  readonly proposals: RegisterReconciliationProposal[] = [];
  readonly anchors: AnchorRecord[] = [];
  readonly decisions: RegisterProposalDecisionRecord[] = [];
  readonly auditEvents: RegisterProposalAuditEvent[] = [];

  constructor(
    proposals: readonly RegisterReconciliationProposal[] = [],
    anchors: readonly AnchorRecord[] = [],
  ) {
    this.proposals.push(...proposals.map(copyProposal));
    this.anchors.push(...anchors.map((anchor) => ({ ...anchor })));
  }

  seedProposals(proposals: readonly RegisterReconciliationProposal[]): void {
    this.proposals.push(...proposals.map(copyProposal));
  }

  seedAnchors(anchors: readonly AnchorRecord[]): void {
    this.anchors.push(...anchors.map((anchor) => ({ ...anchor })));
  }

  async listOpenProposals(
    companyId: string,
    siteId: string,
  ): Promise<readonly RegisterReconciliationProposal[]> {
    const decided = new Set(
      this.decisions
        .filter((decision) => decision.companyId === companyId)
        .map((decision) => decision.proposalId),
    );
    return this.proposals
      .filter(
        (proposal) =>
          proposal.companyId === companyId &&
          proposal.siteId === siteId &&
          !decided.has(proposal.proposalId),
      )
      .sort((left, right) => {
        const time = right.submittedAt.getTime() - left.submittedAt.getTime();
        return time !== 0
          ? time
          : left.proposalId.localeCompare(right.proposalId);
      })
      .map(copyProposal);
  }

  async findProposal(
    companyId: string,
    siteId: string,
    proposalId: string,
  ): Promise<RegisterReconciliationProposal | undefined> {
    const proposal = this.proposals.find(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.siteId === siteId &&
        candidate.proposalId === proposalId,
    );
    return proposal ? copyProposal(proposal) : undefined;
  }

  async findDecision(
    companyId: string,
    proposalId: string,
  ): Promise<RegisterProposalDecisionRecord | undefined> {
    const decision = this.decisions.find(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.proposalId === proposalId,
    );
    return decision ? copyDecision(decision) : undefined;
  }

  async findAnchor(
    companyId: string,
    siteId: string,
    anchorId: string,
  ): Promise<AnchorRecord | undefined> {
    const anchor = this.anchors.find(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.siteId === siteId &&
        candidate.anchorId === anchorId,
    );
    return anchor ? { ...anchor } : undefined;
  }

  async decideProposal(
    proposal: RegisterReconciliationProposal,
    decision: RegisterProposalDecisionRecord,
    anchorWrite: RegisterAnchorWrite | null,
    auditEvent: RegisterProposalAuditEvent,
  ): Promise<boolean> {
    if (
      this.decisions.some(
        (candidate) =>
          key(candidate.companyId, candidate.proposalId) ===
          key(decision.companyId, decision.proposalId),
      )
    ) {
      return false;
    }
    this.decisions.push(copyDecision(decision));
    if (anchorWrite) {
      const anchor = { ...anchorWrite.anchor };
      const existingIndex = this.anchors.findIndex(
        (candidate) =>
          candidate.companyId === anchor.companyId &&
          candidate.anchorId === anchor.anchorId,
      );
      if (anchorWrite.kind === 'create') {
        if (existingIndex >= 0) {
          throw new Error('in-memory anchor identity already exists');
        }
        this.anchors.push(anchor);
      } else {
        if (existingIndex < 0) {
          throw new Error('in-memory anchor identity was not found');
        }
        this.anchors[existingIndex] = anchor;
      }
    }
    this.auditEvents.push({ ...auditEvent });
    return true;
  }
}
