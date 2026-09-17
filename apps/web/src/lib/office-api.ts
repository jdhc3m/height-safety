import { auth0 } from './auth0';
import { readCompanyIdFromTokens } from './company-claim';

const REQUEST_TIMEOUT_MS = 8_000;

export type OfficeApiFailureCode =
  | 'NOT_CONFIGURED'
  | 'NO_SESSION'
  | 'NO_COMPANY_CLAIM'
  | 'UPSTREAM';

export class OfficeApiFailure extends Error {
  constructor(
    readonly code: OfficeApiFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'OfficeApiFailure';
  }
}

export interface OfficeSession {
  readonly accessToken: string;
  readonly companyId: string;
  readonly expiresAt: string;
  readonly user: {
    readonly userId: string;
    readonly email: string;
    readonly role: string;
  };
}

export interface OfficeJob {
  readonly jobId: string;
  readonly siteId: string;
  readonly reference: string;
  readonly jurisdiction: 'NSW' | 'QLD';
  readonly workflowStatus: string;
  readonly jobPackVersion: number;
  readonly plannedDate: string | null;
  readonly updatedAt: string;
}

export type ReviewIssueType = 'blocker' | 'warning' | 'conflict' | 'change';

export interface ReviewIssue {
  readonly reviewIssueId: string;
  readonly inspectionId: string;
  readonly anchorInspectionId: string | null;
  readonly issueType: ReviewIssueType;
  readonly status: 'open' | 'resolved';
  readonly reviewerUserId: string;
  readonly reason: string;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export function isOfficeApiConfigured(): boolean {
  return Boolean(apiBaseUrl() && auth0);
}

function apiBaseUrl(): string | undefined {
  const configured = process.env.API_BASE_URL?.trim();
  return configured ? configured.replace(/\/+$/, '') : undefined;
}

function requireBaseUrl(): string {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    throw new OfficeApiFailure(
      'NOT_CONFIGURED',
      'the office API base URL is not configured',
    );
  }
  return baseUrl;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new OfficeApiFailure('UPSTREAM', `${label} is unavailable`);
  }

  if (!response.ok) {
    throw new OfficeApiFailure(
      'UPSTREAM',
      `${label} was refused with status ${response.status}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new OfficeApiFailure(
      'UPSTREAM',
      `${label} returned an unreadable body`,
    );
  }
}

/**
 * Exchanges the browser's identity-provider session for an application-owned
 * opaque session. The opaque token is kept in server memory for the request
 * only and is never sent to the browser.
 */
export async function openOfficeSession(): Promise<OfficeSession> {
  requireBaseUrl();
  if (!auth0) {
    throw new OfficeApiFailure(
      'NOT_CONFIGURED',
      'the office identity provider is not configured',
    );
  }

  const browserSession = await auth0.getSession();
  if (!browserSession) {
    throw new OfficeApiFailure('NO_SESSION', 'no office session is present');
  }

  const providerAccessToken = browserSession.tokenSet?.accessToken;
  if (!providerAccessToken) {
    throw new OfficeApiFailure(
      'NO_SESSION',
      'the office session has no provider access token',
    );
  }

  const companyId = readCompanyIdFromTokens(
    [providerAccessToken, browserSession.tokenSet?.idToken],
    process.env.AUTH0_COMPANY_ID_CLAIM,
  );
  if (!companyId) {
    throw new OfficeApiFailure(
      'NO_COMPANY_CLAIM',
      'the identity token does not carry the configured company claim',
    );
  }

  const session = await requestJson<OfficeSession>(
    '/sessions',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-company-id': companyId,
      },
      body: JSON.stringify({ providerAccessToken }),
    },
    'the application session exchange',
  );

  if (!session.accessToken || !session.companyId) {
    throw new OfficeApiFailure(
      'UPSTREAM',
      'the application session exchange returned an unexpected body',
    );
  }

  return session;
}

function authorisedHeaders(session: OfficeSession): Record<string, string> {
  return {
    authorization: `Bearer ${session.accessToken}`,
    'x-company-id': session.companyId,
  };
}

export function listJobs(
  session: OfficeSession,
): Promise<readonly OfficeJob[]> {
  return requestJson<readonly OfficeJob[]>(
    '/jobs',
    { headers: authorisedHeaders(session), method: 'GET' },
    'the job list',
  );
}

export function listReviewIssues(
  session: OfficeSession,
  inspectionId: string,
): Promise<readonly ReviewIssue[]> {
  return requestJson<readonly ReviewIssue[]>(
    `/reviews/inspections/${encodeURIComponent(inspectionId)}/issues`,
    { headers: authorisedHeaders(session), method: 'GET' },
    'the review issue list',
  );
}
