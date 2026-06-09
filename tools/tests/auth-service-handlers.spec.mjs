import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthServiceHandlers } from '../auth-service-handlers.mjs';

const registry = {
  version: 1,
  profiles: [
    {
      domain: 'example.com',
      authProfileId: 'client-cognito',
      tenantId: 'tenant-example',
      status: 'active',
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
      clientId: 'public-client-id',
      audiences: ['public-client-id'],
      hostedUiDomain: 'https://auth.example.com',
      callbackUrls: ['https://example.com/auth/callback'],
      logoutUrls: ['https://example.com/auth/logout'],
      loginPath: '/login',
      logoutPath: '/auth/logout',
      allowedGroups: ['owner', 'editor'],
      groupClaim: 'cognito:groups',
      socialIdpSecretRefs: {
        google: '/zlp/auth/example/google',
      },
    },
  ],
};

function apiEvent({ method = 'GET', path = '/auth/runtime-config', query = {}, headers = {}, body } = {}) {
  return {
    rawPath: path,
    path,
    headers,
    queryStringParameters: query,
    requestContext: {
      http: { method, path },
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function parseResponse(response) {
  return JSON.parse(response.body);
}

test('runtime auth endpoint emits only public auth metadata for a draft profile', async () => {
  const { handler } = createAuthServiceHandlers({
    loadRegistry: async () => registry,
  });

  const response = await handler(apiEvent({
    query: {
      domain: 'example.com',
      authProfileId: 'client-cognito',
      loginPath: '/login',
    },
  }));
  const body = parseResponse(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.runtimeAuth.enabled, true);
  assert.equal(body.runtimeAuth.authProfileId, 'client-cognito');
  assert.equal(body.runtimeAuth.loginPath, '/login');
  assert.equal(JSON.stringify(body).includes('tenant-example'), false);
  assert.equal(JSON.stringify(body).includes('socialProviders'), false);
  assert.equal(JSON.stringify(body).includes('clientSecretRef'), false);
});

test('runtime auth endpoint rejects browser-supplied secret or policy fields', async () => {
  const { handler } = createAuthServiceHandlers({
    loadRegistry: async () => registry,
  });

  const response = await handler(apiEvent({
    method: 'POST',
    body: {
      domain: 'example.com',
      authProfileId: 'client-cognito',
      clientSecret: 'x',
    },
  }));

  assert.equal(response.statusCode, 400);
  assert.match(parseResponse(response).error, /unsupported runtime auth option/i);
  assert.equal(response.body.includes('clientSecret'), false);
});

test('provisioning plan endpoint is denied unless a trusted server-side caller is present', async () => {
  const untrusted = createAuthServiceHandlers({
    loadRegistry: async () => registry,
  });

  const denied = await untrusted.handler(apiEvent({
    method: 'POST',
    path: '/auth/provisioning-plan',
    body: {
      domain: 'example.com',
      authProfileId: 'client-cognito',
    },
  }));

  assert.equal(denied.statusCode, 403);

  const trusted = createAuthServiceHandlers({
    loadRegistry: async () => registry,
    isTrustedServerRequest: () => true,
  });
  const allowed = await trusted.handler(apiEvent({
    method: 'POST',
    path: '/auth/provisioning-plan',
    body: {
      domain: 'example.com',
      authProfileId: 'client-cognito',
    },
  }));
  const body = parseResponse(allowed);

  assert.equal(allowed.statusCode, 200);
  assert.equal(body.plan.applyMode, 'plan-only');
  assert.equal(body.plan.operations.some(operation => operation.action === 'configureHostedUiSocialProvider'), true);
  assert.equal(JSON.stringify(body).includes('google-client-secret-value'), false);
});

test('jwt authorizer verifies tokens through injected verifier and enforces registry policy', async () => {
  const verifierCalls = [];
  const { jwtAuthorizerHandler } = createAuthServiceHandlers({
    loadRegistry: async () => registry,
    verifyJwt: async (token, config) => {
      verifierCalls.push({ token, config });
      return {
        iss: config.issuer,
        client_id: config.audience,
        sub: 'user-123',
        'cognito:groups': ['editor'],
      };
    },
  });

  const response = await jwtAuthorizerHandler(apiEvent({
    headers: {
      authorization: 'Bearer test-token',
      'x-zlp-domain': 'example.com',
      'x-zlp-auth-profile-id': 'client-cognito',
    },
  }));

  assert.equal(response.isAuthorized, true);
  assert.equal(response.context.tenantId, 'tenant-example');
  assert.equal(response.context.subject, 'user-123');
  assert.equal(verifierCalls[0].token, 'test-token');
  assert.equal(verifierCalls[0].config.jwksUri, 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE/.well-known/jwks.json');
});

test('jwt authorizer denies mismatched groups without echoing bearer tokens', async () => {
  const { jwtAuthorizerHandler } = createAuthServiceHandlers({
    loadRegistry: async () => registry,
    verifyJwt: async (_token, config) => ({
      iss: config.issuer,
      aud: config.audience,
      sub: 'user-123',
      'cognito:groups': ['viewer'],
    }),
  });

  const response = await jwtAuthorizerHandler(apiEvent({
    headers: {
      authorization: 'Bearer sensitive-token',
      'x-zlp-domain': 'example.com',
      'x-zlp-auth-profile-id': 'client-cognito',
    },
  }));

  assert.equal(response.isAuthorized, false);
  assert.equal(response.context.reason, 'group_mismatch');
  assert.equal(JSON.stringify(response).includes('sensitive-token'), false);
});
