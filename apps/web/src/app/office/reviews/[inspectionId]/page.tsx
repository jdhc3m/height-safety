import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth0, isAuth0Configured } from '../../../../lib/auth0';
import {
  OfficeApiFailure,
  isOfficeApiConfigured,
  listReviewIssues,
  openOfficeSession,
  type ReviewIssue,
  type ReviewIssueType,
} from '../../../../lib/office-api';

export const dynamic = 'force-dynamic';

const ISSUE_LABEL: Record<ReviewIssueType, string> = {
  blocker: 'Blocker',
  warning: 'Warning',
  conflict: 'Conflict',
  change: 'Requested change',
};

const ISSUE_TONE: Record<ReviewIssueType, string> = {
  blocker: 'chip--blocker',
  warning: 'chip--warn',
  conflict: 'chip--neutral',
  change: 'chip--warn',
};

function countOpen(
  issues: readonly ReviewIssue[],
  issueType: ReviewIssueType,
): number {
  return issues.filter(
    (issue) => issue.issueType === issueType && issue.status === 'open',
  ).length;
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ inspectionId: string }>;
}) {
  const { inspectionId } = await params;

  if (!isAuth0Configured || !auth0) {
    return (
      <main className="shell">
        <section className="hero" aria-labelledby="review-title">
          <div>
            <p className="eyebrow">Height Safety / Office review</p>
            <h1 id="review-title">Office access is not configured.</h1>
            <p className="hero-copy">
              Configure the Auth0 AU office application before reading a
              submitted inspection revision.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect(
      `/auth/login?returnTo=/office/reviews/${encodeURIComponent(inspectionId)}`,
    );
  }

  let issues: readonly ReviewIssue[] | undefined;
  let failure: OfficeApiFailure | undefined;
  if (isOfficeApiConfigured()) {
    try {
      issues = await listReviewIssues(await openOfficeSession(), inspectionId);
    } catch (error) {
      if (error instanceof OfficeApiFailure) {
        failure = error;
      } else {
        throw error;
      }
    }
  }

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="review-title">
        <div>
          <p className="eyebrow">Height Safety / Office review</p>
          <h1 id="review-title">Submitted review issues.</h1>
          <p className="hero-copy">
            Inspection revision <span className="mono">{inspectionId}</span>.
            Issues record what a reviewer raised; they never rewrite the
            inspector&apos;s submitted evidence.
          </p>
        </div>
        <p className="notice" role="note">
          Read-only. Resolving an issue, requesting changes or approving a
          snapshot are not available in this prototype.
        </p>
      </section>

      <section className="preview" aria-labelledby="review-issues-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Issues</p>
            <h2 id="review-issues-title">Open and resolved</h2>
          </div>
          <p className="section-copy">
            Hard blockers cannot be waived. A warning needs a recorded reason
            before it can be resolved.
          </p>
        </div>

        {!isOfficeApiConfigured() ? (
          <p className="disclaimer" role="note">
            The office API is not configured, so no review issue is shown.
          </p>
        ) : failure ? (
          <p className="disclaimer" role="alert">
            Review issues could not be read from the office API ({failure.code}
            ). Nothing is displayed rather than showing unverified state.
          </p>
        ) : !issues || issues.length === 0 ? (
          <p className="disclaimer" role="note">
            No review issue is recorded against this inspection revision.
          </p>
        ) : (
          <>
            <div className="chip-row">
              <span className="chip chip--blocker">
                Blocker {countOpen(issues, 'blocker')}
              </span>
              <span className="chip chip--warn">
                Warning {countOpen(issues, 'warning')}
              </span>
              <span className="chip chip--neutral">
                Conflict {countOpen(issues, 'conflict')}
              </span>
              <span className="chip chip--warn">
                Requested change {countOpen(issues, 'change')}
              </span>
            </div>

            <ul className="issue-list">
              {issues.map((issue) => (
                <li className="issue-card" key={issue.reviewIssueId}>
                  <div className="issue-card__head">
                    <span className={`chip ${ISSUE_TONE[issue.issueType]}`}>
                      {ISSUE_LABEL[issue.issueType]}
                    </span>
                    <span
                      className={`chip ${
                        issue.status === 'open' ? 'chip--info' : 'chip--ok'
                      }`}
                    >
                      {issue.status}
                    </span>
                    {issue.anchorInspectionId ? (
                      <span className="mono issue-card__ref">
                        {issue.anchorInspectionId}
                      </span>
                    ) : null}
                  </div>
                  <p className="issue-card__reason">{issue.reason}</p>
                  <p className="issue-card__meta">
                    Reviewed by {issue.reviewerUserId} ·{' '}
                    {new Date(issue.createdAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace('T', ' ')}
                    {issue.resolvedAt
                      ? ` · resolved ${new Date(issue.resolvedAt)
                          .toISOString()
                          .slice(0, 16)
                          .replace('T', ' ')}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="preview">
        <p className="disclaimer">
          Prototype workflow awaiting professional validation. Recorded
          inspection outcomes, technical decisions and report approval remain
          the responsibility of the inspecting organisation and its authorised
          personnel. This view does not certify an anchor or determine
          compliance.
        </p>
        <p>
          <Link className="quiet-link" href="/office">
            Back to authorised jobs
          </Link>
        </p>
      </section>
    </main>
  );
}
