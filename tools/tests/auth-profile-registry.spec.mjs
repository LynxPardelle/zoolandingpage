import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authPolicyFromJwtClaims,
  buildCognitoProvisioningPlan,
  buildJwtVerificationConfig,
  buildPublicAuthRuntimeConfig,
  resolveAuthProfile,
  validateAuthProfileRegistry,
  validateServerIntegrations,
} from '../auth-profile-registry.mjs';

const zoositeRegistryPath = new URL('./fixtures/zoosite-auth-pilot/server/auth-profile-registry.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

const registry = {
  version: 1,
  profiles: [
    {
      authProfileId: 'client-cognito',
      tenantId: 'tenant-example',
      status: 'planned',
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
      tenantClaim: 'custom:tenant_id',
      socialIdpSecretRefs: {
        google: '/zoolanding/auth/example/google',
      },
    },
    {
      authProfileId: 'public-cognito',
      tenantId: 'tenant-other',
      status: 'active',
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_OTHER',
      clientId: 'other-public-client-id',
      audiences: ['other-public-client-id'],
      hostedUiDomain: 'https://auth.other.example',
      callbackUrls: ['https://other.example/auth/callback'],
      logoutUrls: ['https://other.example/auth/logout'],
      loginPath: '/login',
      logoutPath: '/auth/logout',
      allowedGroups: ['admin'],
    },
  ],
};

test('resolveAuthProfile reads the draft server-only profile by authProfileId', () => {
  const resolved = resolveAuthProfile(registry, 'example.com', 'client-cognito');

  assert.equal(resolved.tenantId, 'tenant-example');
  assert.equal(resolveAuthProfile(registry, 'example.com', 'missing'), null);
});

test('buildPublicAuthRuntimeConfig emits only safe browser metadata', () => {
  const profile = {
    ...resolveAuthProfile(registry, 'example.com', 'client-cognito'),
    status: 'active',
  };
  const runtime = buildPublicAuthRuntimeConfig(profile, {
    scopes: ['openid', 'email', 'profile'],
    redirectPath: '/auth/callback',
    logoutPath: '/auth/logout',
  });

  assert.deepEqual(runtime, {
    enabled: true,
    authProfileId: 'client-cognito',
    provider: 'cognito',
    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
    clientId: 'public-client-id',
    hostedUiDomain: 'https://auth.example.com',
    scopes: ['openid', 'email', 'profile'],
    redirectPath: '/auth/callback',
    logoutPath: '/auth/logout',
    loginPath: '/login',
    groupsClaim: 'cognito:groups',
    allowedGroups: ['owner', 'editor'],
  });
  assert.equal(JSON.stringify(runtime).includes('secret'), false);
});

test('buildPublicAuthRuntimeConfig keeps non-active profiles disabled and rejects unsafe optional paths', () => {
  const profile = resolveAuthProfile(registry, 'example.com', 'client-cognito');

  assert.equal(buildPublicAuthRuntimeConfig(profile).enabled, false);
  assert.throws(() => buildPublicAuthRuntimeConfig(profile, {
    postLoginPath: 'https://evil.example/callback',
  }), /postLoginPath/);
  assert.throws(() => buildPublicAuthRuntimeConfig(profile, {
    postLogoutPath: '//evil.example/logout',
  }), /postLogoutPath/);
});

test('validateAuthProfileRegistry rejects embedded secrets and unsafe urls', () => {
  const bad = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        hostedUiDomain: 'https://auth.example.com\\evil',
        clientSecret: 'x',
        socialIdpSecretRefs: {
          google: {
            clientSecret: 'raw-google-client-secret',
          },
        },
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(bad).valid, false);
  assert.match(validateAuthProfileRegistry(bad).errors.join('\n'), /hostedUiDomain/);
  assert.match(validateAuthProfileRegistry(bad).errors.join('\n'), /clientSecret/);
});

test('validateAuthProfileRegistry rejects unsafe callback and logout URLs', () => {
  const bad = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        callbackUrls: ['http://example.com/auth/callback'],
        logoutUrls: ['https://example.com/auth/logout\\x'],
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(bad).valid, false);
  assert.match(validateAuthProfileRegistry(bad).errors.join('\n'), /callbackUrls/);
  assert.match(validateAuthProfileRegistry(bad).errors.join('\n'), /logoutUrls/);
});

test('validateAuthProfileRegistry accepts stable social provider ids beyond google and facebook', () => {
  const customRegistry = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        socialIdpSecretRefs: {
          microsoft: '/zoolanding/auth/example/microsoft',
        },
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(customRegistry), { valid: true, errors: [] });
});

test('buildCognitoProvisioningPlan returns declarative operations without AWS calls or secret values', () => {
  const profile = resolveAuthProfile(registry, 'example.com', 'client-cognito');
  const plan = buildCognitoProvisioningPlan(profile);
  const socialOperation = plan.operations.find(operation => operation.action === 'configureHostedUiSocialProvider');

  assert.equal(plan.applyMode, 'plan-only');
  assert.equal(plan.operations.some(operation => operation.action === 'createOrUpdateUserPoolClient'), true);
  assert.equal(plan.operations.some(operation => operation.action === 'configureHostedUiSocialProvider'), true);
  assert.deepEqual(socialOperation.secretRefs, { credentialRef: '/zoolanding/auth/example/google' });
  assert.equal(JSON.stringify(plan).includes('google-secret'), false);
  assert.equal(plan.operations[0].tenantBoundary.authProfileId, 'client-cognito');
});

test('buildJwtVerificationConfig preserves the Cognito issuer path in the JWKS URI', () => {
  const profile = resolveAuthProfile(registry, 'example.com', 'client-cognito');
  const config = buildJwtVerificationConfig(profile);

  assert.equal(config.jwksUri, 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE/.well-known/jwks.json');
  assert.deepEqual(config.tenantBoundary, {
    tenantId: 'tenant-example',
    authProfileId: 'client-cognito',
  });
});

test('authPolicyFromJwtClaims authorizes only expected tenant, audience, issuer, and groups', () => {
  const profile = resolveAuthProfile(registry, 'example.com', 'client-cognito');

  assert.deepEqual(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['editor'],
  }), {
    authorized: true,
    subject: 'user-123',
    groups: ['editor'],
    reason: 'authorized',
  });

  assert.equal(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    client_id: profile.clientId,
    sub: 'user-123',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['editor'],
  }).authorized, true);

  assert.equal(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['viewer'],
  }).authorized, false);
});

test('validateServerIntegrations accepts user access policy separately from upstream auth credentials', () => {
  const integrations = {
    version: 1,
    sources: [
      {
        id: 'protectedBlogPosts',
        method: 'GET',
        url: 'https://content.example.com/posts',
        allowedInputFields: ['category'],
        response: {
          allowedFields: ['items.title', 'items.slug'],
          maxBytes: 524288,
        },
        access: {
          required: true,
          authProfileId: 'client-cognito',
          allowedGroups: ['editor'],
        },
      },
    ],
    actions: [
      {
        id: 'createPost',
        method: 'POST',
        url: 'https://content.example.com/posts',
        allowedInputFields: ['title', 'body'],
        credentialRef: 'zoolanding/upstream/content/oauth',
        auth: {
          type: 'oauth2-client-credentials',
        },
        access: {
          required: true,
          authProfileId: 'client-cognito',
          allowedGroups: ['editor'],
        },
      },
    ],
  };

  assert.deepEqual(validateServerIntegrations(integrations), { valid: true, errors: [] });
});

test('validateServerIntegrations rejects credentialRef nested inside upstream auth', () => {
  const integrations = {
    version: 1,
    sources: [],
    actions: [
      {
        id: 'badCredentialShape',
        method: 'POST',
        url: 'https://content.example.com/posts',
        auth: {
          type: 'bearer',
          credentialRef: 'zoolanding/upstream/content/oauth',
        },
      },
    ],
  };

  const result = validateServerIntegrations(integrations);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /credentialRef/);
});

test('validateServerIntegrations rejects unsafe user access and raw credential material', () => {
  const integrations = {
    version: 1,
    sources: [
      {
        id: 'badProtectedSource',
        method: 'GET',
        url: 'https://content.example.com/posts',
        allowedInputFields: ['category'],
        access: {
          required: true,
          allowedGroups: [''],
        },
        auth: {
          required: true,
          authProfileId: 'client-cognito',
        },
      },
    ],
    actions: [
      {
        id: 'badAction',
        method: 'POST',
        url: 'https://content.example.com/posts',
        allowedInputFields: ['title'],
        auth: {
          type: 'bearer',
          token: 'raw-token',
        },
      },
    ],
  };

  const result = validateServerIntegrations(integrations);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /access\.authProfileId/);
  assert.match(result.errors.join('\n'), /access\.allowedGroups/);
  assert.match(result.errors.join('\n'), /auth.*upstream credentials/);
  assert.match(result.errors.join('\n'), /token/);
});

test('Zoosite server-only auth registry fixture validates as plan-only without raw secrets', async () => {
  const zoositeRegistry = await readJson(zoositeRegistryPath);
  const validation = validateAuthProfileRegistry(zoositeRegistry);
  const profile = resolveAuthProfile(zoositeRegistry, 'zoositioweb.com.mx', 'staff');

  assert.deepEqual(validation, { valid: true, errors: [] });
  assert.equal(profile.domain, 'zoositioweb.com.mx');
  assert.equal(profile.tenantId, 'zoosite');
  assert.match(profile.status, /^(planned|provisioning)$/);
  assert.deepEqual(profile.allowedGroups, ['zoosite-client', 'zoosite-admin']);
  assert.deepEqual(profile.callbackUrls, [
    'https://zoositioweb.com.mx/auth/callback',
    'https://zoositioweb.com/auth/callback',
  ]);
  assert.deepEqual(profile.logoutUrls, [
    'https://zoositioweb.com.mx/acceso',
    'https://zoositioweb.com/acceso',
  ]);
  assert.deepEqual(profile.socialIdpSecretRefs, {
    google: '/zoolanding/auth/zoosite/staff/google',
    facebook: '/zoolanding/auth/zoosite/staff/facebook',
  });

  const registryText = JSON.stringify(zoositeRegistry);
  for (const forbidden of ['clientSecret', 'accessToken', 'refreshToken', 'raw-google', 'raw-facebook', 'ssm:/', 'secretsmanager:/']) {
    assert.equal(registryText.includes(forbidden), false, `${forbidden} must not be present in the Zoosite registry`);
  }

  const plan = buildCognitoProvisioningPlan(profile);
  const socialOperations = plan.operations.filter(operation => operation.action === 'configureHostedUiSocialProvider');
  const planText = JSON.stringify(plan);

  assert.equal(plan.applyMode, 'plan-only');
  assert.equal(plan.operations.some(operation => operation.action === 'createOrUpdateUserPool'), true);
  assert.equal(socialOperations.length, 2);
  assert.deepEqual(socialOperations.map(operation => operation.secretRefs.credentialRef).sort(), [
    '/zoolanding/auth/zoosite/staff/facebook',
    '/zoolanding/auth/zoosite/staff/google',
  ]);
  for (const forbidden of ['clientSecret', 'accessToken', 'refreshToken', 'raw-google', 'raw-facebook']) {
    assert.equal(planText.includes(forbidden), false, `${forbidden} must not be emitted by the Zoosite provisioning plan`);
  }
});
