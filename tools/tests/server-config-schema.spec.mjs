import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authRegistrySchemaPath = new URL('../../docs/api-driven-config/schemas/auth-profile-registry.schema.json', import.meta.url);
const integrationsSchemaPath = new URL('../../docs/api-driven-config/schemas/integrations.schema.json', import.meta.url);

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
