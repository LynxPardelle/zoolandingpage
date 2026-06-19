import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authRegistrySchemaPath = new URL('../../docs/api-driven-config/schemas/auth-profile-registry.schema.json', import.meta.url);
const integrationsSchemaPath = new URL('../../docs/api-driven-config/schemas/integrations.schema.json', import.meta.url);
const protectedFeaturesSchemaPath = new URL('../../docs/api-driven-config/schemas/protected-features.schema.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

function resolveSchemaRef(root, ref) {
  assert.equal(ref.startsWith('#/'), true, `Unsupported schema ref: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((current, part) => current?.[part], root);
}

function validateSchema(schema, value, root = schema, path = '$') {
  if (schema.$ref) {
    return validateSchema(resolveSchemaRef(root, schema.$ref), value, root, path);
  }

  if (schema.const !== undefined && value !== schema.const) {
    return [`${path} must equal ${JSON.stringify(schema.const)}`];
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return [`${path} must be one of ${schema.enum.join(', ')}`];
  }

  if (schema.anyOf) {
    const anyOfErrors = schema.anyOf.map(option => validateSchema(option, value, root, path));
    if (!anyOfErrors.some(errors => errors.length === 0)) {
      return [`${path} must match one allowed schema`];
    }
  }

  if (schema.not) {
    const notErrors = validateSchema(schema.not, value, root, path);
    if (notErrors.length === 0) {
      return [`${path} must not match the disallowed schema`];
    }
  }

  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (allowedTypes.length > 0) {
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (!allowedTypes.includes(actualType)) {
      return [`${path} must be ${allowedTypes.join(' or ')}`];
    }
  }

  const errors = [];

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} is shorter than ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} is longer than ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push(`${path} does not match ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} is below ${schema.minimum}`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(`${path} must be greater than ${schema.exclusiveMinimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} needs at least ${schema.minItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, root, `${path}[${index}]`));
      });
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const requiredKey of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${path}.${requiredKey} is required`);
      }
    }

    const propertySchemas = schema.properties ?? {};
    for (const [key, item] of Object.entries(value)) {
      if (propertySchemas[key]) {
        errors.push(...validateSchema(propertySchemas[key], item, root, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validateSchema(schema.additionalProperties, item, root, `${path}.${key}`));
      }
    }
  }

  return errors;
}

function buildProtectedFeatureContractExample() {
  return {
    version: 1,
    features: [
      {
        id: 'client-blog',
        kind: 'blog',
        authProfileId: 'staff',
        status: 'planned',
        description: 'Private client blog editor and dashboard contract.',
        ownership: {
          domain: 'example.com',
          tenantId: 'tenant-example',
          isolationBoundary: 'auth-profile',
          environmentClaim: 'custom:zlp_env',
        },
        access: {
          model: 'groups-to-roles',
          defaultDecision: 'deny',
          roles: [
            {
              id: 'reader',
              groups: ['client'],
              permissions: ['blog:post:read'],
            },
            {
              id: 'editor',
              groups: ['admin'],
              permissions: ['blog:post:read', 'blog:post:write', 'upload:image:write'],
            },
          ],
        },
        resources: {
          dynamoTables: [
            {
              logicalName: 'posts',
              isolation: 'per-auth-profile-table',
              tableNamePattern: 'zlp-{stage}-{tenantId}-{featureId}',
              partitionKeyPrefix: 'TENANT#{tenantId}',
              sortKeyPrefixes: ['POST#', 'AUTHOR#'],
            },
          ],
          objectStores: [
            {
              logicalName: 'postImages',
              isolation: 'per-auth-profile-prefix',
              bucketNamePattern: 'zlp-{stage}-protected-assets',
              keyPrefix: 'TENANT#{tenantId}/FEATURE#{featureId}/',
              signedUrlPolicy: {
                maxTtlSeconds: 300,
                allowedMethods: ['PUT', 'GET'],
              },
            },
          ],
        },
        endpoints: {
          bff: {
            basePath: '/features/client-blog',
            sessionMode: 'server-cookie',
            csrfHeaderName: 'X-ZLP-CSRF',
          },
          apis: [
            {
              id: 'listPosts',
              method: 'GET',
              path: '/features/client-blog/posts',
              lambdaId: 'clientBlogRead',
              authorizer: {
                mode: 'bff-session',
                requireFreshAccountState: true,
              },
            },
            {
              id: 'createPost',
              method: 'POST',
              path: '/features/client-blog/posts',
              lambdaId: 'clientBlogWrite',
              authorizer: {
                mode: 'auth-profile-jwt',
                allowedTokenUses: ['access'],
                requireTenantClaim: true,
                requireEnvironmentClaim: true,
              },
            },
          ],
        },
        runtimeBindings: {
          routes: [
            {
              path: '/blog/admin',
              pageId: 'blog-admin',
              authRequired: true,
              dataSourceIds: ['blogPosts'],
              apiActionIds: ['createPost'],
            },
          ],
          dataSources: [
            {
              id: 'blogPosts',
              kind: 'auth-admin',
              target: 'remote.blog.posts',
            },
          ],
          apiActions: [
            {
              id: 'createPost',
              kind: 'auth-admin',
            },
          ],
        },
        draftConfigurability: {
          enabled: true,
          allowedPublicFields: ['routes', 'runtime.dataSources', 'runtime.apiActions', 'components'],
          forbiddenPublicFields: ['tenantId', 'tableNamePattern', 'bucketNamePattern', 'lambdaId', 'authorizer'],
        },
        audit: {
          required: true,
          sink: 'dynamodb',
          eventTypes: [
            {
              name: 'blog.post.write',
              decisions: ['allowed', 'denied'],
              includeRequestId: true,
            },
          ],
        },
        errors: {
          format: 'zlp-protected-feature-error-v1',
          response: {
            wrapper: 'error',
            fields: ['code', 'message', 'requestId', 'retryable'],
          },
          safeCodes: ['auth_required', 'forbidden', 'tenant_mismatch', 'validation_error', 'internal_error'],
        },
        serverOnly: {
          exposure: 'server-only',
          forbiddenBrowserKeys: ['tenantId', 'credentialRef', 'clientSecret', 'accessToken', 'refreshToken', 'tableNamePattern', 'bucketNamePattern'],
        },
        rollout: {
          promotion: 'dev-test-prod',
          applyMode: 'plan-only',
        },
      },
    ],
  };
}

test('auth profile registry schema documents server-only draft auth fields', async () => {
  const schema = await readJson(authRegistrySchemaPath);
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
  const schema = await readJson(authRegistrySchemaPath);
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
  const schema = await readJson(authRegistrySchemaPath);
  const profile = schema.definitions?.authProfile;
  const mfa = schema.definitions?.mfaPolicy;

  assert.equal(profile.properties.mfa.$ref, '#/definitions/mfaPolicy');
  assert.deepEqual(mfa.properties.mode.enum, ['off', 'optional', 'required']);
  assert.equal(mfa.properties.totp.$ref, '#/definitions/totpMfaPolicy');
  assert.equal(schema.definitions.totpMfaPolicy.properties.enabled.type, 'boolean');
});

test('auth profile registry schema documents the safe admin MFA reset path', async () => {
  const schema = await readJson(authRegistrySchemaPath);
  const admin = schema.definitions?.authAdminRuntime;

  assert.equal(admin.properties.resetUserMfaPathTemplate.$ref, '#/definitions/sameOriginPath');
});

test('integrations schema keeps user access separate from upstream auth credentials', async () => {
  const schema = await readJson(integrationsSchemaPath);
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
  const schema = await readJson(protectedFeaturesSchemaPath);
  const feature = schema.definitions?.protectedFeature;
  const ownership = schema.definitions?.resourceOwnership;
  const dynamo = schema.definitions?.dynamoTable;
  const objectStore = schema.definitions?.objectStore;
  const endpoint = schema.definitions?.apiEndpoint;
  const authorizer = schema.definitions?.authorizerPolicy;

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
    'runtimeBindings',
    'draftConfigurability',
    'audit',
    'errors',
    'serverOnly',
    'rollout',
  ]);
  assert.equal(feature.properties.authProfileId.$ref, '#/definitions/safeId');
  assert.equal(feature.properties.publicConfig, undefined);
  assert.deepEqual(ownership.properties.isolationBoundary.enum, ['draft', 'auth-profile', 'tenant']);
  assert.deepEqual(dynamo.properties.isolation.enum, ['per-draft-table', 'per-auth-profile-table', 'shared-table-with-tenant-key']);
  assert.deepEqual(objectStore.properties.isolation.enum, ['per-draft-bucket', 'per-auth-profile-prefix', 'shared-bucket-with-tenant-prefix']);
  assert.equal(endpoint.properties.authorizer.$ref, '#/definitions/authorizerPolicy');
  assert.deepEqual(authorizer.properties.mode.enum, ['bff-session', 'auth-profile-jwt']);
  assert.equal(feature.properties.runtimeBindings.$ref, '#/definitions/runtimeBindings');
  assert.equal(feature.properties.draftConfigurability.$ref, '#/definitions/draftConfigurability');
  assert.equal(feature.properties.serverOnly.$ref, '#/definitions/serverOnlyBoundary');
  assert.equal(schema.definitions.errorPolicy.properties.format.const, 'zlp-protected-feature-error-v1');
  assert.equal(schema.definitions.rolloutPolicy.properties.promotion.enum.includes('dev-test-prod'), true);
});

test('protected features schema validates the core protected blog/dashboard/upload contract', async () => {
  const schema = await readJson(protectedFeaturesSchemaPath);
  const example = buildProtectedFeatureContractExample();
  const errors = validateSchema(schema, example);

  assert.deepEqual(errors, []);
});

test('protected features schema rejects public config and server-only leakage', async () => {
  const schema = await readJson(protectedFeaturesSchemaPath);
  const leakedPublicConfig = buildProtectedFeatureContractExample();
  leakedPublicConfig.features[0].runtimeBindings.dataSources[0].credentialRef = 'server-only-secret-ref';
  leakedPublicConfig.features[0].runtimeBindings.apiActions[0].authorizer = { mode: 'auth-profile-jwt' };

  const leakedServerOnlyBoundary = buildProtectedFeatureContractExample();
  leakedServerOnlyBoundary.features[0].serverOnly.exposure = 'public';

  assert.match(validateSchema(schema, leakedPublicConfig).join('\n'), /credentialRef|authorizer/);
  assert.match(validateSchema(schema, leakedServerOnlyBoundary).join('\n'), /serverOnly\.exposure/);
});
