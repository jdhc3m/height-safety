'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  OfficeApiFailure,
  approveInspection,
  createReviewIssue,
  openOfficeSession,
  resolveReviewIssue,
} from '../../../../lib/office-api';

function reviewPath(inspectionId: string): string {
  return `/office/reviews/${encodeURIComponent(inspectionId)}`;
}

function reviewRedirect(
  inspectionId: string,
  params: Record<string, string>,
): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${reviewPath(inspectionId)}?${query}`);
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

function redirectFailure(
  inspectionId: string,
  code: string,
  status?: number,
): never {
  const params: Record<string, string> = { error: code };
  if (status !== undefined) {
    params.status = String(status);
  }
  reviewRedirect(inspectionId, params);
}

function redirectApiFailure(inspectionId: string, error: unknown): never {
  if (error instanceof OfficeApiFailure) {
    redirectFailure(inspectionId, error.code, error.status);
  }
  throw error;
}

/**
 * Records a reasoned resolution of one review issue. The API appends the
 * action and never mutates the inspector's submitted evidence.
 */
export async function resolveIssueAction(formData: FormData): Promise<void> {
  const inspectionId = field(formData, 'inspectionId');
  const reviewIssueId = field(formData, 'reviewIssueId');
  const reason = field(formData, 'reason');

  if (!inspectionId || !reviewIssueId) {
    redirectFailure(inspectionId, 'INVALID_INPUT');
  }
  if (!reason) {
    redirectFailure(inspectionId, 'REASON_REQUIRED');
  }

  try {
    await resolveReviewIssue(await openOfficeSession(), reviewIssueId, reason);
  } catch (error) {
    redirectApiFailure(inspectionId, error);
  }

  revalidatePath(reviewPath(inspectionId));
  reviewRedirect(inspectionId, { status: 'resolved' });
}

/**
 * Requests a change against the submitted revision. This records a `change`
 * review issue; it does not rewrite what the inspector submitted and does not
 * approve anything.
 */
export async function requestChangesAction(formData: FormData): Promise<void> {
  const inspectionId = field(formData, 'inspectionId');
  const reason = field(formData, 'reason');

  if (!inspectionId) {
    redirectFailure(inspectionId, 'INVALID_INPUT');
  }
  if (!reason) {
    redirectFailure(inspectionId, 'REASON_REQUIRED');
  }

  try {
    await createReviewIssue(await openOfficeSession(), {
      inspectionId,
      issueType: 'change',
      reason,
    });
  } catch (error) {
    redirectApiFailure(inspectionId, error);
  }

  revalidatePath(reviewPath(inspectionId));
  reviewRedirect(inspectionId, { status: 'change-requested' });
}

/**
 * Freezes the exact submitted revision for draft report generation. The API
 * refuses with 409 while a hard blocker, open change request or unsynchronised
 * evidence remains.
 */
export async function approveInspectionAction(
  formData: FormData,
): Promise<void> {
  const inspectionId = field(formData, 'inspectionId');
  if (!inspectionId) {
    redirectFailure(inspectionId, 'INVALID_INPUT');
  }

  try {
    await approveInspection(await openOfficeSession(), inspectionId);
  } catch (error) {
    redirectApiFailure(inspectionId, error);
  }

  revalidatePath(reviewPath(inspectionId));
  reviewRedirect(inspectionId, { status: 'approved' });
}
