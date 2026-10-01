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
import {
  approveInspectionAction,
  requestChangesAction,
  resolveIssueAction,
} from './actions';

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

type Banner = { readonly tone: 'ok' | 'warn'; readonly text: string };

function resultBanner(
  searchParams: Record<string, string | string[] | undefined>,
): Banner | undefined {
  const status =
    typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const error =
    typeof searchParams.error === 'string' ? searchParams.error : undefined;
  const httpStatus =
    typeof searchParams.status === 'string'
      ? Number(searchParams.status)
      : undefined;

  if (status === 'resolved') {
    return {
      tone: 'ok',
      text: 'Review issue resolved with a recorded reason. Inspector evidence is unchanged.',
    };
  }
  if (status === 'change-requested') {
    return {
      tone: 'ok',
      text: 'Change requested. The job moves to changes requested; the inspector submits a new revision for review.',
    };
  }
  if (status === 'approved') {
    return {
      tone: 'ok',
      text: 'Snapshot approved. The exact submitted revision is frozen for draft report generation.',
    };
  }

  if (error === 'REASON_REQUIRED') {
    return {
      tone: 'warn',
      text: 'A recorded reason is required for this action.',
    };
  }
  if (error === 'INVALID_INPUT') {
    return {
      tone: 'warn',
      text: 'The request was incomplete and was not sent.',
    };
  }
  if (error === 'UPSTREAM' && httpStatus === 409) {
    return {
      tone: 'warn',
      text: 'Approval blocked: a hard blocker, open change request, unsynchronised evidence or a stale revision remains. Hard blockers cannot be waived.',
    };
  }
  if (error === 'UPSTREAM' && httpStatus === 403) {
    return {
      tone: 'warn',
      text: 'Your company role cannot perform this action.',
    };
  }
  if (error === 'UPSTREAM' && httpStatus === 404) {
    return {
      tone: 'warn',
      text: 'The inspection or review issue was not found.',
    };
  }
  if (error) {
    return {
      tone: 'warn',
      text: `The action was refused (${error}${httpStatus ? ` ${httpStatus}` : ''}).`,
    };
  }
  return undefined;
}

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
  searchParams,
}: {
  params: Promise<{ inspectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { inspectionId } = await params;
  const query = await searchParams;

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

  const banner = resultBanner(query);

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
          Actions are append-only and audited. Resolving or requesting changes
          never overwrites submitted evidence, and approval freezes the exact
          revision.
        </p>
      </section>

      {banner ? (
        <p
          className={`result-banner result-banner--${banner.tone}`}
          role={banner.tone === 'warn' ? 'alert' : 'status'}
        >
          {banner.text}
        </p>
      ) : null}

      <section className="preview" aria-labelledby="review-actions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reviewer actions</p>
            <h2 id="review-actions-title">Request changes or approve</h2>
          </div>
          <p className="section-copy">
            Approval is refused while any hard blocker, open change request or
            unsynchronised evidence remains.
          </p>
        </div>

        {isOfficeApiConfigured() && !failure ? (
          <div className="action-row">
            <form action={requestChangesAction} className="action-form">
              <input type="hidden" name="inspectionId" value={inspectionId} />
              <label className="action-form__label">
                Recorded reason for requesting changes
                <textarea
                  name="reason"
                  rows={2}
                  required
                  maxLength={10_000}
                  placeholder="Explain what the inspector must correct and where."
                />
              </label>
              <button className="action-button" type="submit">
                Request changes
              </button>
            </form>

            <form action={approveInspectionAction} className="action-form">
              <input type="hidden" name="inspectionId" value={inspectionId} />
              <p className="action-form__note">
                Approval freezes the exact submitted revision for draft report
                generation. It cannot be undone; a correction creates a new
                revision.
              </p>
              <button
                className="action-button action-button--primary"
                type="submit"
              >
                Approve snapshot
              </button>
            </form>
          </div>
        ) : null}
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

                  {issue.status === 'open' ? (
                    <form action={resolveIssueAction} className="action-form">
                      <input
                        type="hidden"
                        name="inspectionId"
                        value={inspectionId}
                      />
                      <input
                        type="hidden"
                        name="reviewIssueId"
                        value={issue.reviewIssueId}
                      />
                      <label className="action-form__label">
                        Recorded reason for resolving this issue
                        <textarea
                          name="reason"
                          rows={2}
                          required
                          maxLength={10_000}
                          placeholder="State why this issue is resolved."
                        />
                      </label>
                      <button className="action-button" type="submit">
                        Resolve issue
                      </button>
                    </form>
                  ) : null}
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
