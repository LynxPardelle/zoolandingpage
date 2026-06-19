import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authRegistrySchemaPath = new URL('../../docs/api-driven-config/schemas/auth-profile-registry.schema.json', import.meta.url);
const integrationsSchemaPath = new URL('../../docs/api-driven-config/schemas/integrations.schema.json', import.meta.url);
const protectedFeaturesSchemaPath = new URL('../../docs/api-driven-config/schemas/protected-features.schema.json', import.meta.url);

test('auth profile registry schema documents server-only draft auth fields', async () => {
  const schema = JSON.parse(await readFile(authRegistrySchemaPath, 'utf8'));
  const profile = schema.definitions?.authProfile;

  assert.deepEqual(profile.required, [
    'authProfileId',
    'tenantId',
    'status',
    'issuer',
    'hostedUiDomain',
    'clientId',
    'audiences',
    'callbackUrls',
    'logoutUrls',
    'loginPath',
    'logoutPath',
  ]);
  assert.equal(profile.properties.clientSecret, undefined);
  assert.equal(profile.properties.socialIdpSecretRefs.additionalProperties.anyOf.length, 2);
});

test('auth profile registry schema documents optional custom auth form policies', async () => {
  const schema = JSON.parse(await readFile(authRegistrySchemaPath, 'utf8'));
  const profile = schema.definitions?.authProfile;
  const customAuth = schema.definitions?.customAuth;

  assert.equal(profile.properties.customAuth.$ref, '#/definitions/customAuth');
  assert.equal(customAuth.properties.signin.$ref, '#/definitions/customSigninPolicy');
  assert.equal(customAuth.properties.signup.$ref, '#/definitions/customSignupPolicy');
  assert.equal(customAuth.properties.passwordRecovery.$ref, '#/definitions/customPasswordRecoveryPolicy');
  assert.equal(schema.definitions.customSigninPolicy.properties.enabled.type, 'boolean');
  assert.deepEqual(schema.definitions.customSignupPolicy.properties.defaultGroups.items, { type: 'string', minLength: 1 });
  assert.equal(schema.definitions.customSignupPolicy.properties.setTenantClaim.type, 'boolean');
  assert.equal(schema.definitions.customPasswordRecoveryPolicy.properties.enabled.type, 'boolean');
});

test('auth profile registry schema documents optional TOTP MFA policy', async () => {
  const schema = JSON.parse(await readFile(authRegistrySchemaPath, 'utf8'));
  const profile = schema.definitions?.authProfile;
  const mfa = schema.definitions?.mfaPolicy;

  assert.equal(profile.properties.mfa.$ref, '#/definitions/mfaPolicy');
  assert.deepEqual(mfa.properties.mode.enum, ['off', 'optional', 'required']);
  assert.equal(mfa.properties.totp.$ref, '#/definitions/totpMfaPolicy');
  assert.equal(schema.definitions.totpMfaPolicy.properties.enabled.type, 'boolean');
});

test('auth profile registry schema documents the safe admin MFA reset path', async () => {
  const schema = JSON.parse(await readFile(authRegistrySchemaPath, 'utf8'));
  const admin = schema.definitions?.authAdminRuntime;

  assert.equal(admin.properties.resetUserMfaPathTemplate.$ref, '#/definitions/sameOriginPath');
});

test('integrations schema keeps user access separate from upstream auth credentials', async () => {
  const schema = JSON.parse(await readFile(integrationsSchemaPath, 'utf8'));
  const access = schema.definitions?.accessPolicy;
  const upstreamAuth = schema.definitions?.upstreamAuth;
  const source = schema.definitions?.integrationSource;

  assert.equal(access.if.properties.required.const, true);
  assert.deepEqual(access.then.required, ['authProfileId']);
  assert.equal(upstreamAuth.properties.authProfileId, undefined);
  assert.equal(upstreamAuth.properties.credentialRef, undefined);
  assert.equal(source.properties.credentialRef.$ref, '#/definitions/secretRef');
  assert.equal(source.properties.access.$ref, '#/definitions/accessPolicy');
  assert.equal(source.properties.auth.$ref, '#/definitions/upstreamAuth');
});

test('protected features schema documents server-only feature boundaries', async () => {
  const schema = JSON.parse(await readFile(protectedFeaturesSchemaPath, 'utf8'));
  const feature = schema.definitions?.protectedFeature;
  const ownership = schema.definitions?.resourceOwnership;
  const dynamo = schema.definitions?.dynamoTable;
  const endpoint = schema.definitions?.apiEndpoint;

  assert.deepEqual(schema.required, ['version', 'features']);
  assert.deepEqual(feature.required, [
    'id',
    'kind',
    'authProfileId',
    'status',
    'ownership',
    'access',
    'resources',
    'endpoints',
    'audit',
    'errors',
    'rollout',
  ]);
  assert.equal(feature.properties.authProfileId.$ref, '#/definitions/safeId');
  assert.equal(feature.properties.publicConfig, undefined);
  assert.deepEqual(ownership.properties.isolationBoundary.enum, ['draft', 'auth-profile', 'tenant']);
  assert.deepEqual(dynamo.properties.isolation.enum, ['per-draft-table', 'per-auth-profile-table', 'shared-table-with-tenant-key']);
  assert.deepEqual(endpoint.properties.authorizer.enum, ['bff-session', 'auth-profile-jwt']);
  assert.equal(schema.definitions.errorPolicy.properties.format.const, 'zlp-protected-feature-error-v1');
  assert.equal(schema.definitions.rolloutPolicy.properties.promotion.enum.includes('dev-test-prod'), true);
});
