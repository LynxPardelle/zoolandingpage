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
      allowedTokenUses: ['id', 'access'],
      adminGroups: ['owner'],
      manageableGroups: ['owner', 'editor'],
      defaultUserStatus: 'pending',
      adminGroupsAutoApproved: true,
      maxSessionSeconds: 43200,
      groupClaim: 'cognito:groups',
      tenantClaim: 'custom:tenant_id',
      session: {
        mode: 'server-cookie',
        signinPath: '/auth/session/signin',
        mePath: '/auth/session/me',
        logoutPath: '/auth/session/logout',
        csrfCookieName: 'zlp_csrf',
        csrfHeaderName: 'X-ZLP-CSRF',
        routeAccessCacheMs: 15000,
      },
      admin: {
        usersPath: '/auth/admin/users',
        approveUserPathTemplate: '/auth/admin/users/{subject}/approve',
        groupsPathTemplate: '/auth/admin/users/{subject}/groups',
        suspendUserPathTemplate: '/auth/admin/users/{subject}/suspend',
        reactivateUserPathTemplate: '/auth/admin/users/{subject}/reactivate',
        resetUserMfaPathTemplate: '/auth/admin/users/{subject}/mfa/reset',
      },
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
      allowedTokenUses: ['id'],
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
    session: {
      mode: 'server-cookie',
      signinPath: '/auth/session/signin',
      mePath: '/auth/session/me',
      logoutPath: '/auth/session/logout',
      csrfCookieName: 'zlp_csrf',
      csrfHeaderName: 'X-ZLP-CSRF',
      routeAccessCacheMs: 15000,
    },
    admin: {
      usersPath: '/auth/admin/users',
      approveUserPathTemplate: '/auth/admin/users/{subject}/approve',
      groupsPathTemplate: '/auth/admin/users/{subject}/groups',
      suspendUserPathTemplate: '/auth/admin/users/{subject}/suspend',
      reactivateUserPathTemplate: '/auth/admin/users/{subject}/reactivate',
      resetUserMfaPathTemplate: '/auth/admin/users/{subject}/mfa/reset',
    },
  });
  assert.equal(JSON.stringify(runtime).includes('secret'), false);
  assert.equal(runtime.adminGroups, undefined);
  assert.equal(runtime.manageableGroups, undefined);
  assert.equal(runtime.defaultUserStatus, undefined);
});

test('validateAuthProfileRegistry validates server-only auth-admin policy fields', () => {
  const good = validateAuthProfileRegistry({
    version: 1,
    profiles: [registry.profiles[0]],
  });
  assert.deepEqual(good, { valid: true, errors: [] });

  const bad = validateAuthProfileRegistry({
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        adminGroups: ['owner', 'super-admin'],
        manageableGroups: ['editor', 'outside-group'],
        defaultUserStatus: 'auto-approved',
        adminGroupsAutoApproved: 'yes',
        maxSessionSeconds: 0,
        allowedTokenUses: ['id', 'refresh', 'id'],
      },
    ],
  });

  assert.equal(bad.valid, false);
  assert.match(bad.errors.join('\n'), /allowedTokenUses/);
  assert.match(bad.errors.join('\n'), /adminGroups/);
  assert.match(bad.errors.join('\n'), /manageableGroups/);
  assert.match(bad.errors.join('\n'), /defaultUserStatus/);
  assert.match(bad.errors.join('\n'), /adminGroupsAutoApproved/);
  assert.match(bad.errors.join('\n'), /maxSessionSeconds/);

  const unsafeSessionCache = validateAuthProfileRegistry({
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        session: {
          ...registry.profiles[0].session,
          routeAccessCacheMs: 120000,
        },
      },
    ],
  });

  assert.equal(unsafeSessionCache.valid, false);
  assert.match(unsafeSessionCache.errors.join('\n'), /routeAccessCacheMs/);
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

test('validateAuthProfileRegistry validates optional custom auth form policy', () => {
  const customRegistry = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        customAuth: {
          signin: {
            enabled: true,
          },
          signup: {
            enabled: true,
            setTenantClaim: true,
            setEnvironmentClaim: true,
            defaultGroups: ['editor'],
          },
          passwordRecovery: {
            enabled: true,
          },
        },
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(customRegistry), { valid: true, errors: [] });

  const bad = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        customAuth: {
          signin: {
            enabled: 'yes',
            clientSecret: 'raw-secret',
          },
          signup: {
            enabled: true,
            defaultGroups: ['viewer'],
            password: 'raw-secret',
          },
          passwordRecovery: {
            enabled: 'yes',
          },
        },
      },
    ],
  };

  const result = validateAuthProfileRegistry(bad);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /customAuth\.signin\.enabled/);
  assert.match(result.errors.join('\n'), /customAuth\.signin\.clientSecret/);
  assert.match(result.errors.join('\n'), /customAuth\.signup\.defaultGroups/);
  assert.match(result.errors.join('\n'), /customAuth\.signup\.password/);
  assert.match(result.errors.join('\n'), /customAuth\.passwordRecovery\.enabled/);
});

test('validateAuthProfileRegistry validates optional TOTP MFA policy', () => {
  const customRegistry = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        mfa: {
          mode: 'optional',
          totp: { enabled: true },
        },
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(customRegistry), { valid: true, errors: [] });

  const bad = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        mfa: {
          mode: 'sometimes',
          totp: { enabled: 'yes' },
          clientSecret: 'raw-secret',
        },
      },
    ],
  };

  const result = validateAuthProfileRegistry(bad);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /mfa\.mode/);
  assert.match(result.errors.join('\n'), /mfa\.totp\.enabled/);
  assert.match(result.errors.join('\n'), /mfa\.clientSecret/);

  const disabledTotp = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        mfa: {
          mode: 'required',
          totp: { enabled: false },
        },
      },
    ],
  };

  const disabledTotpResult = validateAuthProfileRegistry(disabledTotp);
  assert.equal(disabledTotpResult.valid, false);
  assert.match(disabledTotpResult.errors.join('\n'), /mfa\.totp\.enabled must be true/);
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

test('buildCognitoProvisioningPlan includes optional TOTP MFA operation when declared', () => {
  const profile = {
    ...resolveAuthProfile(registry, 'example.com', 'client-cognito'),
    mfa: {
      mode: 'optional',
      totp: { enabled: true },
    },
  };

  const plan = buildCognitoProvisioningPlan(profile);
  const mfaOperation = plan.operations.find(operation => operation.action === 'configureTotpMfa');

  assert.deepEqual(mfaOperation.mfa, {
    mode: 'optional',
    totp: { enabled: true },
  });
  assert.deepEqual(mfaOperation.tenantBoundary, {
    tenantId: 'tenant-example',
    authProfileId: 'client-cognito',
  });
  assert.equal(JSON.stringify(plan).includes('raw-secret'), false);
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

test('validateAuthProfileRegistry accepts optional Cognito environment claim', () => {
  const customRegistry = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        environmentClaim: 'custom:zoolanding_env',
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(customRegistry), { valid: true, errors: [] });

  const bad = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        environmentClaim: 'zoolanding_env',
      },
    ],
  };

  const result = validateAuthProfileRegistry(bad);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /environmentClaim/);
});

test('validateAuthProfileRegistry accepts opt-in multi-environment claim mode', () => {
  const valid = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        environmentClaim: 'custom:zoolanding_env',
        environmentClaimMode: 'list',
      },
    ],
  };

  assert.deepEqual(validateAuthProfileRegistry(valid), { valid: true, errors: [] });

  const badMode = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        environmentClaim: 'custom:zoolanding_env',
        environmentClaimMode: 'wide-open',
      },
    ],
  };

  const badModeResult = validateAuthProfileRegistry(badMode);
  assert.equal(badModeResult.valid, false);
  assert.match(badModeResult.errors.join('\n'), /environmentClaimMode/);

  const missingClaim = {
    version: 1,
    profiles: [
      {
        ...registry.profiles[0],
        environmentClaimMode: 'list',
      },
    ],
  };
  delete missingClaim.profiles[0].environmentClaim;

  const missingClaimResult = validateAuthProfileRegistry(missingClaim);
  assert.equal(missingClaimResult.valid, false);
  assert.match(missingClaimResult.errors.join('\n'), /environmentClaimMode/);
});

test('authPolicyFromJwtClaims can require the stack runtime environment', () => {
  const profile = {
    ...resolveAuthProfile(registry, 'example.com', 'client-cognito'),
    environmentClaim: 'custom:zoolanding_env',
  };

  assert.equal(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'custom:zoolanding_env': 'test',
    'cognito:groups': ['editor'],
  }, { runtimeEnvironment: 'test' }).authorized, true);

  const denied = authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'custom:zoolanding_env': 'prod',
    'cognito:groups': ['editor'],
  }, { runtimeEnvironment: 'test' });

  assert.equal(denied.authorized, false);
  assert.equal(denied.reason, 'environment_mismatch');
});

test('authPolicyFromJwtClaims can opt in to comma-separated multi-environment claims', () => {
  const profile = {
    ...resolveAuthProfile(registry, 'example.com', 'client-cognito'),
    environmentClaim: 'custom:zoolanding_env',
    environmentClaimMode: 'list',
  };

  assert.equal(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'custom:zoolanding_env': 'prod,test',
    'cognito:groups': ['editor'],
  }, { runtimeEnvironment: 'test' }).authorized, true);

  const denied = authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'custom:zoolanding_env': 'prod',
    'cognito:groups': ['editor'],
  }, { runtimeEnvironment: 'test' });

  assert.equal(denied.authorized, false);
  assert.equal(denied.reason, 'environment_mismatch');
});

test('authPolicyFromJwtClaims keeps comma-separated environments strict by default', () => {
  const profile = {
    ...resolveAuthProfile(registry, 'example.com', 'client-cognito'),
    environmentClaim: 'custom:zoolanding_env',
  };

  const denied = authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'custom:zoolanding_env': 'prod,test',
    'cognito:groups': ['editor'],
  }, { runtimeEnvironment: 'test' });

  assert.equal(denied.authorized, false);
  assert.equal(denied.reason, 'environment_mismatch');
});

test('authPolicyFromJwtClaims authorizes only expected tenant, audience, issuer, and groups', () => {
  const profile = resolveAuthProfile(registry, 'example.com', 'client-cognito');

  assert.deepEqual(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
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
    token_use: 'access',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['editor'],
  }).authorized, true);

  assert.equal(authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    token_use: 'id',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['viewer'],
  }).authorized, false);

  const missingTokenUse = authPolicyFromJwtClaims(profile, {
    iss: profile.issuer,
    aud: profile.clientId,
    sub: 'user-123',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['editor'],
  });
  assert.equal(missingTokenUse.authorized, false);
  assert.equal(missingTokenUse.reason, 'token_use_mismatch');

  const accessDeniedForIdOnlyProfile = authPolicyFromJwtClaims({
    ...profile,
    allowedTokenUses: ['id'],
  }, {
    iss: profile.issuer,
    client_id: profile.clientId,
    sub: 'user-123',
    token_use: 'access',
    'custom:tenant_id': 'tenant-example',
    'cognito:groups': ['editor'],
  });
  assert.equal(accessDeniedForIdOnlyProfile.authorized, false);
  assert.equal(accessDeniedForIdOnlyProfile.reason, 'token_use_mismatch');
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
  assert.match(profile.status, /^(planned|provisioning|active)$/);
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

  assert.match(plan.applyMode, /^(plan-only|active)$/);
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
