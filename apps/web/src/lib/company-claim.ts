/**
 * Reads the configured company claim out of an identity-provider token.
 *
 * This value is only used to select the tenant scope presented to the API. It
 * is never authorisation on its own: the API verifies the provider token and
 * checks company membership before any company-scoped read or write.
 */
export const DEFAULT_COMPANY_ID_CLAIM =
  'https://height-safety.example/claims/company_id';

export function decodeTokenPayload(
  token: string | undefined,
): Record<string, unknown> | undefined {
  if (!token) {
    return undefined;
  }

  const segments = token.split('.');
  if (segments.length !== 3 || segments[1].length === 0) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(segments[1], 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(decoded);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function readCompanyIdFromTokens(
  tokens: readonly (string | undefined)[],
  claimName: string = DEFAULT_COMPANY_ID_CLAIM,
): string | undefined {
  for (const token of tokens) {
    const claim = decodeTokenPayload(token)?.[claimName];
    if (typeof claim === 'string' && claim.trim().length > 0) {
      return claim.trim();
    }
  }

  return undefined;
}
