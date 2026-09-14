import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';

import { AuthFailure } from '../dist/identity/auth.types.js';
import {
  Auth0IdentityProvider,
  auth0IdentityProviderConfigFromEnvironment,
} from '../dist/identity/auth0-identity-provider.js';
import { HttpInvitationDelivery } from '../dist/identity/invitation-delivery.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const publicJwk = {
  ...publicKey.export({ format: 'jwk' }),
  alg: 'RS256',
  kid: 'auth0-test-key',
  use: 'sig',
};

function signToken(payload) {
  const header = { alg: 'RS256', kid: publicJwk.kid, typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .end()
    .sign(privateKey)
    .toString('base64url');
  return `${signingInput}.${signature}`;
}

function expectAuthFailure(action, code) {
  return assert.rejects(action, (error) => {
    assert.ok(error instanceof AuthFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('Auth0 configuration is fail-closed when partially supplied', () => {
  assert.equal(auth0IdentityProviderConfigFromEnvironment({}), undefined);
  assert.throws(
    () =>
      auth0IdentityProviderConfigFromEnvironment({
        AUTH0_DOMAIN: 'tenant.au.auth0.com',
      }),
    /must be configured together/,
  );

  const config = auth0IdentityProviderConfigFromEnvironment({
    AUTH0_DOMAIN: 'https://tenant.au.auth0.com/',
    AUTH0_API_AUDIENCE: 'https://api.example.test',
    AUTH0_USE_USERINFO: 'false',
  });
  assert.equal(config.domain, 'tenant.au.auth0.com');
  assert.equal(config.audience, 'https://api.example.test');
  assert.equal(config.useUserInfo, false);
});

test('Auth0 provider validates issuer/audience/signature and maps verified profile', async () => {
  let userInfo = {
    sub: 'auth0|inspector-a',
    email: 'Inspector@Example.Test',
    email_verified: true,
  };
  let server;
  server = createServer((request, response) => {
    if (request.url === '/jwks') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    if (request.url === '/userinfo') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(userInfo));
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const issuer = `${baseUrl}/`;
  const provider = new Auth0IdentityProvider({
    domain: 'tenant.au.auth0.com',
    audience: 'https://api.example.test',
    issuer,
    jwksUri: `${baseUrl}/jwks`,
    userInfoUri: `${baseUrl}/userinfo`,
  });

  try {
    const token = signToken({
      iss: issuer,
      sub: 'auth0|inspector-a',
      aud: 'https://api.example.test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      ['https://height-safety.example/claims/mfa_satisfied']: true,
    });
    const identity = await provider.verifyAccessToken(token);
    assert.deepEqual(identity, {
      subject: 'auth0|inspector-a',
      email: 'inspector@example.test',
      emailVerified: true,
      mfaSatisfied: true,
    });

    await expectAuthFailure(
      provider.verifyAccessToken(
        signToken({
          iss: issuer,
          sub: 'auth0|inspector-a',
          aud: 'wrong-audience',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
        }),
      ),
      'UNAUTHENTICATED',
    );

    userInfo = {
      sub: 'auth0|different-user',
      email: 'inspector@example.test',
      email_verified: true,
    };
    await expectAuthFailure(
      provider.verifyAccessToken(token),
      'UNAUTHENTICATED',
    );

    userInfo = {
      sub: 'auth0|inspector-a',
      email: 'inspector@example.test',
      email_verified: false,
    };
    await expectAuthFailure(
      provider.verifyAccessToken(token),
      'UNAUTHENTICATED',
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('configured invitation delivery sends the application token without storing it in Auth0', async () => {
  let request;
  const delivery = new HttpInvitationDelivery(
    'http://127.0.0.1/invitations',
    'delivery-secret',
    1_000,
    async (input, init) => {
      request = { input, init };
      return { ok: true, status: 202 };
    },
  );
  const provider = new Auth0IdentityProvider(
    {
      domain: 'tenant.au.auth0.com',
      audience: 'https://api.example.test',
      useUserInfo: false,
    },
    undefined,
    delivery,
  );
  const expiresAt = new Date('2026-09-14T00:00:00.000Z');

  await provider.sendInvitation({
    companyId: 'company-a',
    invitationId: 'invitation-a',
    email: 'inspector@example.test',
    role: 'inspector',
    invitationToken: 'one-time-token',
    expiresAt,
  });

  assert.equal(request.input, 'http://127.0.0.1/invitations');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.authorization, 'Bearer delivery-secret');
  assert.deepEqual(JSON.parse(request.init.body), {
    companyId: 'company-a',
    invitationId: 'invitation-a',
    email: 'inspector@example.test',
    role: 'inspector',
    invitationToken: 'one-time-token',
    expiresAt: expiresAt.toISOString(),
  });
});
