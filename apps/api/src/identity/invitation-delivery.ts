import { AuthFailure, type InvitationDelivery } from './auth.types';

export interface InvitationDeliveryTransport {
  deliver(invitation: InvitationDelivery): Promise<void>;
}

export type InvitationDeliveryFetcher = (
  input: string,
  init: {
    readonly method: 'POST';
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal: AbortSignal;
  },
) => Promise<{ readonly ok: boolean; readonly status: number }>;

/** Fail-closed default until an owner-configured delivery endpoint exists. */
export class UnconfiguredInvitationDelivery
  implements InvitationDeliveryTransport
{
  async deliver(_invitation: InvitationDelivery): Promise<void> {
    throw new AuthFailure(
      'INVITATION_DELIVERY_UNAVAILABLE',
      'application invitation delivery is not configured',
    );
  }
}

/**
 * Sends the application-owned, one-time invitation token to a private mail
 * or messaging adapter. The adapter receives the token only in the request
 * body; this service never logs or persists it.
 */
export class HttpInvitationDelivery implements InvitationDeliveryTransport {
  private readonly fetcher: InvitationDeliveryFetcher;

  constructor(
    private readonly endpoint: string,
    private readonly bearerToken: string,
    private readonly timeoutMs = 10_000,
    fetcher: InvitationDeliveryFetcher = (input, init) => fetch(input, init),
  ) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !isLoopbackHost(url.hostname)) {
      throw new Error(
        'INVITATION_DELIVERY_URL must use HTTPS outside a loopback development endpoint',
      );
    }
    if (!bearerToken.trim()) {
      throw new Error('INVITATION_DELIVERY_TOKEN is required');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error(
        'INVITATION_DELIVERY_TIMEOUT_MS must be a positive integer',
      );
    }
    this.fetcher = fetcher;
  }

  async deliver(invitation: InvitationDelivery): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.bearerToken}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          companyId: invitation.companyId,
          invitationId: invitation.invitationId,
          email: invitation.email,
          role: invitation.role,
          invitationToken: invitation.invitationToken,
          expiresAt: invitation.expiresAt.toISOString(),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AuthFailure(
          'INVITATION_DELIVERY_UNAVAILABLE',
          `invitation delivery endpoint returned HTTP ${response.status}`,
        );
      }
    } catch (error) {
      if (error instanceof AuthFailure) {
        throw error;
      }
      throw new AuthFailure(
        'INVITATION_DELIVERY_UNAVAILABLE',
        'invitation delivery endpoint could not be reached',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function invitationDeliveryFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): InvitationDeliveryTransport {
  const endpoint = configuredValue(environment.INVITATION_DELIVERY_URL);
  const token = configuredValue(environment.INVITATION_DELIVERY_TOKEN);
  if (!endpoint && !token) {
    return new UnconfiguredInvitationDelivery();
  }
  if (!endpoint || !token) {
    throw new Error(
      'INVITATION_DELIVERY_URL and INVITATION_DELIVERY_TOKEN must be configured together',
    );
  }

  const rawTimeout = configuredValue(
    environment.INVITATION_DELIVERY_TIMEOUT_MS,
  );
  const timeoutMs = rawTimeout === undefined ? 10_000 : Number(rawTimeout);
  return new HttpInvitationDelivery(endpoint, token, timeoutMs);
}

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
}
