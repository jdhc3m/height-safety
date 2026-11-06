import { redirect } from 'next/navigation';

import { auth0, isAuth0Configured } from '../../../lib/auth0';
import {
  OfficeApiFailure,
  isOfficeApiConfigured,
  listJobs,
  openOfficeSession,
  type OfficeJob,
} from '../../../lib/office-api';
import { StatusPill } from '../../../components/StatusPill';

export const dynamic = 'force-dynamic';

function JurisdictionChip({ jurisdiction }: { jurisdiction: 'NSW' | 'QLD' }) {
  return (
    <span className="chip chip--neutral">
      Jurisdiction recorded: {jurisdiction}
    </span>
  );
}

async function loadJobs(): Promise<
  { jobs: readonly OfficeJob[] } | { failure: OfficeApiFailure }
> {
  try {
    return { jobs: await listJobs(await openOfficeSession()) };
  } catch (error) {
    if (error instanceof OfficeApiFailure) {
      return { failure: error };
    }
    throw error;
  }
}

export default async function OfficePage() {
  if (!isAuth0Configured || !auth0) {
    return (
      <div className="page-stack">
        <section className="hero" aria-labelledby="office-title">
          <div>
            <p className="eyebrow">Height Safety / Office workspace</p>
            <h1 id="office-title">Office access is not configured.</h1>
            <p className="hero-copy">
              Configure the Auth0 AU office application before connecting an
              authenticated office session.
            </p>
          </div>
          <p className="notice" role="note">
            This boundary does not expose customer data or bypass API
            authorisation.
          </p>
        </section>
      </div>
    );
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect('/auth/login?returnTo=/office');
  }

  const result = isOfficeApiConfigured() ? await loadJobs() : undefined;

  return (
    <div className="page-stack">
      <section className="hero" aria-labelledby="office-title">
        <div>
          <p className="eyebrow">Height Safety / Office workspace</p>
          <h1 id="office-title">Authorised jobs.</h1>
          <p className="hero-copy">
            Signed in as {session.user.email ?? 'the current Auth0 user'}.
            Company membership, product role and API session exchange remain
            authoritative at the NestJS API.
          </p>
        </div>
        <p className="notice" role="note">
          This view is read-only. It records no outcome, approves nothing and
          makes no compliance decision.
        </p>
      </section>

      <section className="preview" aria-labelledby="office-jobs-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Jobs</p>
            <h2 id="office-jobs-title">Authorised job queue</h2>
          </div>
          <p className="section-copy">
            Recorded jurisdiction is shown as context only. It does not select
            required fields, intervals, authority or a compliance result.
          </p>
        </div>

        {!isOfficeApiConfigured() ? (
          <p className="disclaimer" role="note">
            The office API is not configured, so no job is shown. Configure the
            API base URL and the identity company claim to connect this view.
          </p>
        ) : !result || 'failure' in result ? (
          <p className="disclaimer" role="alert">
            Jobs could not be read from the office API
            {result && 'failure' in result ? ` (${result.failure.code})` : ''}.
            Nothing is displayed rather than showing unverified state.
          </p>
        ) : result.jobs.length === 0 ? (
          <p className="disclaimer" role="note">
            No authorised job is available in this company yet.
          </p>
        ) : (
          <div
            className="office-table"
            role="table"
            aria-label="Authorised jobs"
          >
            <div className="office-table__head" role="row">
              <span role="columnheader">Job</span>
              <span role="columnheader">Jurisdiction</span>
              <span role="columnheader">Workflow state</span>
              <span role="columnheader">Job pack</span>
              <span role="columnheader">Updated</span>
            </div>
            {result.jobs.map((job) => (
              <div className="office-table__row" role="row" key={job.jobId}>
                <span className="mono" role="cell">
                  {job.reference}
                </span>
                <span role="cell">
                  <JurisdictionChip jurisdiction={job.jurisdiction} />
                </span>
                <span role="cell">
                  <StatusPill kind="workflow" value={job.workflowStatus} />
                </span>
                <span role="cell">v{job.jobPackVersion}</span>
                <span role="cell">
                  {new Date(job.updatedAt).toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="preview" aria-labelledby="office-review-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Review</p>
            <h2 id="office-review-title">Submitted review issues</h2>
          </div>
          <p className="section-copy">
            Open one submitted inspection revision at
            <span className="mono"> /office/reviews/&lt;inspectionId&gt; </span>
            to read its blockers, warnings, conflicts and requested changes.
          </p>
        </div>
        <p className="disclaimer">
          Review issues are append-only. Reading them changes nothing, and this
          prototype does not imply that office review or reporting is complete.
          Approval, change requests and report generation are not wired here.
        </p>
      </section>
    </div>
  );
}
