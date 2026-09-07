import { Auth0Client } from '@auth0/nextjs-auth0/server';

interface Auth0Environment {
  readonly domain: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly secret: string;
  readonly appBaseUrl?: string;
  readonly audience?: string;
}

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readAuth0Environment(): Auth0Environment | undefined {
  const domain = configuredValue(process.env.AUTH0_DOMAIN);
  const clientId = configuredValue(process.env.AUTH0_CLIENT_ID);
  const clientSecret = configuredValue(process.env.AUTH0_CLIENT_SECRET);
  const secret = configuredValue(process.env.AUTH0_SECRET);

  if (!domain && !clientId && !clientSecret && !secret) {
    return undefined;
  }
  if (!domain || !clientId || !clientSecret || !secret) {
    throw new Error(
      'AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET and AUTH0_SECRET must be configured together',
    );
  }

  return {
    domain,
    clientId,
    clientSecret,
    secret,
    appBaseUrl: configuredValue(process.env.APP_BASE_URL),
    audience: configuredValue(process.env.AUTH0_API_AUDIENCE),
  };
}

const environment = readAuth0Environment();

export const isAuth0Configured = environment !== undefined;

/**
 * The office web app owns its browser session. API calls still need to
 * exchange an Auth0 access token for the application-owned opaque session.
 */
export const auth0 = environment
  ? new Auth0Client({
      domain: environment.domain,
      clientId: environment.clientId,
      clientSecret: environment.clientSecret,
      secret: environment.secret,
      appBaseUrl: environment.appBaseUrl,
      authorizationParameters: {
        scope: 'openid profile email offline_access',
        ...(environment.audience ? { audience: environment.audience } : {}),
      },
    })
  : null;
