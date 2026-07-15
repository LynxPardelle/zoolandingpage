import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const schemaDir = path.join(repoRoot, 'docs', 'api-driven-config', 'schemas');
const fixtureRoot = path.join(repoRoot, 'tools', 'tests', 'fixtures', 'server-features', 'valid');
const schemaNames = [
  'data-spaces.schema.json',
  'commerce.schema.json',
  'integration-bindings.schema.json',
  'notification-policies.schema.json',
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function fixtureFiles(root = fixtureRoot) {
  const domain = 'example.com';
  const serverDir = path.join(root, domain, 'server');
  const names = await readdir(serverDir);
  return Promise.all(names.sort().map(async name => ({
    path: `${domain}/server/${name}`,
    content: await readJson(path.join(serverDir, name)),
  })));
}

async function readinessModule() {
  const moduleUrl = new URL('../draft-feature-readiness.mjs', import.meta.url);
  assert.equal(existsSync(moduleUrl), true, 'draft-feature-readiness.mjs must exist');
  return import(moduleUrl);
}

async function validatorModule() {
  const moduleUrl = new URL('../lib/server-feature-contract-validator.mjs', import.meta.url);
  assert.equal(existsSync(moduleUrl), true, 'server-feature-contract-validator.mjs must exist');
  return import(moduleUrl);
}

test('four server descriptor schemas are closed and bounded', async () => {
  for (const name of schemaNames) {
    const schemaPath = path.join(schemaDir, name);
    assert.equal(existsSync(schemaPath), true, `${name} must exist`);
    const schema = await readJson(schemaPath);
    assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.version, { const: 1 });
    assert.equal(schema.definitions.safeId.pattern, '^[a-z0-9][a-z0-9._-]{0,63}$');
    assert.equal(schema.definitions.safeId.maxLength, 64);
    assert.equal(JSON.stringify(schema).includes('maxItems'), true, `${name} needs bounded arrays`);
    assert.equal(JSON.stringify(schema).includes('maxLength'), true, `${name} needs bounded strings`);
  }
  const commerceSchema = await readJson(path.join(schemaDir, 'commerce.schema.json'));
  assert.equal(commerceSchema.definitions.fiscalEnabled.required.includes('disclosureId'), true);
  assert.equal(commerceSchema.definitions.fiscalEnabled.properties.disclosure, undefined);
  assert.equal(commerceSchema.definitions.fiscalEnabled.properties.disclosureId.const, 'manual-invoice-v1');
});

test('the dependency-free validator enforces every schema keyword in use', async () => {
  const { assertSupportedSchema, validateSchema } = await validatorModule();
  const keywordSchema = {
    type: 'object',
    required: ['id', 'count', 'values', 'mode'],
    properties: {
      id: { type: 'string', minLength: 2, maxLength: 4, pattern: '^[a-z]+$' },
      count: { type: 'integer', minimum: 1, maximum: 2 },
      values: { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true, items: { type: 'string' } },
      mode: { enum: ['on', 'off'] },
      detail: { type: 'string' },
    },
    maxProperties: 5,
    allOf: [{ if: { properties: { mode: { const: 'on' } }, required: ['mode'] }, then: { required: ['detail'] } }],
    additionalProperties: false,
  };

  assert.doesNotThrow(() => assertSupportedSchema(keywordSchema));
  assert.deepEqual(validateSchema(keywordSchema, { id: 'ab', count: 1, values: ['x'], mode: 'on', detail: 'ok' }), []);
  const errors = validateSchema(keywordSchema, {
    id: 'A', count: 2.5, values: ['x', 'x', 'z'], mode: 'on', extra: true, extraTwo: true,
  });
  const codes = new Set(errors.map(error => error.code));
  for (const code of ['string_min_length', 'string_pattern', 'integer_required', 'array_max_items', 'array_unique', 'required', 'object_max_properties', 'property_not_allowed']) {
    assert.equal(codes.has(code), true, `missing ${code}`);
  }
  assert.throws(
    () => assertSupportedSchema({ type: 'string', format: 'email' }),
    /unsupported_schema_keyword/,
  );
  for (const malformed of [
    { type: 'unknown' },
    { type: [] },
    { required: 'id' },
    { properties: [] },
    { anyOf: [] },
    { maxItems: '2' },
    { uniqueItems: 'true' },
    { enum: [] },
    { enum: ['duplicate', 'duplicate'] },
    { $ref: '#/definitions/missing' },
  ]) {
    assert.throws(() => assertSupportedSchema(malformed), /invalid_schema_keyword_shape|unresolved_schema_ref/);
  }
});

test('the validator enforces references, compositions, numeric bounds, property names, and error caps', async () => {
  const { validateSchema } = await validatorModule();
  const schema = {
    definitions: {
      shortCode: { type: 'string', pattern: '^[a-z]+$', maxLength: 4 },
    },
    type: 'object',
    minProperties: 11,
    propertyNames: { pattern: '^[a-z]+$' },
    required: ['code', 'exact', 'enumValue', 'emptyValues', 'min', 'max', 'exclusiveMin', 'exclusiveMax', 'choice', 'alternative', 'forbidden'],
    properties: {
      code: { $ref: '#/definitions/shortCode' },
      exact: { const: 'expected' },
      enumValue: { enum: ['allowed'] },
      emptyValues: { type: 'array', minItems: 1, items: { type: 'string' } },
      min: { type: 'number', minimum: 2 },
      max: { type: 'number', maximum: 2 },
      exclusiveMin: { type: 'number', exclusiveMinimum: 2 },
      exclusiveMax: { type: 'number', exclusiveMaximum: 2 },
      choice: { oneOf: [{ const: 'left' }, { const: 'right' }] },
      alternative: { anyOf: [{ const: 'one' }, { const: 'two' }] },
      forbidden: { not: { const: 'blocked' } },
    },
    additionalProperties: false,
  };
  const errors = validateSchema(schema, {
    code: 'TOO-LONG', exact: 'unexpected', enumValue: 'denied', emptyValues: [],
    min: 1, max: 3, exclusiveMin: 2, exclusiveMax: 2,
    choice: 'neither', alternative: 'neither', forbidden: 'blocked',
  });
  const codes = new Set(errors.map(error => error.code));
  for (const code of [
    'string_pattern', 'string_max_length', 'const_mismatch', 'enum_mismatch', 'array_min_items',
    'number_minimum', 'number_maximum',
    'number_exclusive_minimum', 'number_exclusive_maximum', 'one_of', 'any_of', 'not_allowed',
  ]) {
    assert.equal(codes.has(code), true, `missing ${code}`);
  }
  assert.equal(validateSchema(schema, {}, { maxErrors: 3 }).length, 3);
});

test('valid synthetic feature descriptors pass in test', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: await fixtureFiles(),
  });
  assert.equal(report.ok, true);
  assert.equal(report.blockingCount, 0);
  assert.equal(report.featureFileCount, 4);
});

test('legacy social IdP secret fields accept only opaque references', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const validFiles = await fixtureFiles();
  const validReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: validFiles,
  });
  assert.equal(validReport.findings.some(finding => finding.code === 'secret_value_forbidden'), false);

  const arnFiles = await fixtureFiles();
  const arnRegistry = arnFiles.find(file => file.path.endsWith('/auth-profile-registry.json')).content;
  arnRegistry.profiles[0].socialIdpSecretRefs.google.clientSecret =
    'arn:aws:secretsmanager:us-east-1:123456789012:secret:zoolanding-auth-google';
  const arnReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: arnFiles,
  });
  assert.equal(arnReport.findings.some(finding => finding.code === 'secret_value_forbidden'), false);
  const templateReadiness = await import('../templates/draft-repo/tools/draft-feature-readiness.mjs');
  const templateArnReport = await templateReadiness.validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: arnFiles,
  });
  assert.deepEqual(templateArnReport, arnReport);

  const rawFiles = await fixtureFiles();
  const registry = rawFiles.find(file => file.path.endsWith('/auth-profile-registry.json')).content;
  registry.profiles[0].socialIdpSecretRefs.google.clientSecret = 'raw-google-client-secret';
  const rawReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: rawFiles,
  });
  assert.equal(rawReport.findings.some(finding => finding.code === 'secret_value_forbidden'), true);

  const signedUrlFiles = await fixtureFiles();
  const signedUrlRegistry = signedUrlFiles.find(file => file.path.endsWith('/auth-profile-registry.json')).content;
  signedUrlRegistry.profiles[0].socialIdpSecretRefs.google.clientSecret =
    'https://example.invalid/file?X-Amz-Signature=SYNTHETIC';
  const signedUrlReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: signedUrlFiles,
  });
  assert.equal(signedUrlReport.findings.some(finding => finding.code === 'secret_value_forbidden'), true);
});

test('drafts without server integration descriptors remain valid', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com',
    environment: 'test',
    mode: 'test',
    files: [{ path: 'example.com/site-config.json', content: { version: 1 } }],
  });
  assert.equal(report.ok, true);
  assert.equal(report.featureFileCount, 0);
});

test('unknown properties, duplicate ids, and invalid combinations fail closed', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const dataSpaces = files.find(file => file.path.endsWith('/data-spaces.json'));
  const commerce = files.find(file => file.path.endsWith('/commerce.json'));
  dataSpaces.content.spaces.push(structuredClone(dataSpaces.content.spaces[0]));
  dataSpaces.content.unexpected = true;
  commerce.content.commerce.inventory.enabled = false;

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.ok, false);
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('schema_property_not_allowed'), true);
  assert.equal(codes.has('duplicate_id'), true);
  assert.equal(codes.has('physical_inventory_required'), true);
});

test('code-owned capabilities, fiscal disclosures, and notification contracts fail closed', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const dataSpace = files.find(file => file.path.endsWith('/data-spaces.json')).content.spaces[0];
  dataSpace.access.capabilities = ['data-space:root:all'];
  const commerce = files.find(file => file.path.endsWith('/commerce.json')).content.commerce;
  commerce.adminAccess.capabilities = ['commerce:root:all'];
  commerce.fiscal = {
    enabled: true,
    manual: true,
    disclosureId: 'unknown-disclosure',
    taxBehavior: 'exclusive',
    retentionDays: 90,
    requestWindowHours: 24,
  };
  const policy = files.find(file => file.path.endsWith('/notification-policies.json')).content.policies[0];
  policy.notificationTypes = ['arbitrary-event'];
  policy.templateIds = ['arbitrary-template'];

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  for (const code of [
    'data_space_capability_not_supported',
    'commerce_capability_not_supported',
    'unknown_fiscal_disclosure',
    'notification_type_not_supported',
    'notification_template_not_supported',
  ]) {
    assert.equal(codes.has(code), true, `missing ${code}`);
  }
});

test('subscription sellables require recurring payments', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  files.find(file => file.path.endsWith('/commerce.json')).content.commerce.payments.subscriptions = false;
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.findings.some(finding => finding.code === 'subscription_payments_required'), true);
});

test('notification secret references are bounded before any AWS lookup', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings.push({
    id: 'smtp-primary',
    provider: 'email.smtp',
    adapterVersion: 'v1',
    connectionId: 'billing-mailbox',
    status: 'active',
    mode: 'test',
    capabilities: ['send'],
  });
  const notificationDescriptor = files.find(file => file.path.endsWith('/notification-policies.json')).content;
  const basePolicy = notificationDescriptor.policies[0];
  notificationDescriptor.policies = Array.from({ length: 20 }, (_, index) => ({
    ...structuredClone(basePolicy),
    id: `billing-${index}`,
    status: 'active',
    recipientSets: [{
      id: `operators-${index}`,
      version: 1,
      members: [{ id: 'primary' }],
    }],
  }));

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.findings.some(finding => finding.code === 'notification_secret_limit_exceeded'), true);
});

test('secret-looking values are blocked and never echoed', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const sentinel = ['sk', 'live', 'do-not-echo'].join('_');
  files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings[0].unexpected = sentinel;
  files.push({ path: `example.com/server/${sentinel}.json`, content: {} });
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.ok, false);
  assert.equal(report.findings.some(finding => finding.code === 'secret_value_forbidden'), true);
  assert.equal(report.findings.some(finding => finding.code === 'unknown_server_descriptor'), true);
  assert.equal(JSON.stringify(report).includes(sentinel), false);
});

test('legacy server descriptors receive the same secret scan', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const sentinel = ['sk', 'live', 'legacy-do-not-echo'].join('_');
  files.push({
    path: 'example.com/server/integrations.json',
    content: {
      version: 1,
      sources: [{
        id: 'legacy-source',
        method: 'GET',
        url: 'https://content.example.invalid/items',
        headers: { Authorization: sentinel },
      }],
      actions: [],
    },
  });

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.findings.some(finding => finding.code === 'secret_value_forbidden'), true);
  assert.equal(JSON.stringify(report).includes(sentinel), false);
});

test('the server descriptor scanner covers shared secret, PII, and provider-resource patterns', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const sentinels = [
    ['rk', 'test', 'A'.repeat(20)].join('_'),
    ['gho', 'B'.repeat(40)].join('_'),
    `AIza${'C'.repeat(35)}`,
    `xoxb-${'D'.repeat(20)}`,
    ['password', 'synthetic-sensitive-value'].join('='),
    ['person', 'example.invalid'].join('@'),
  ];
  const binding = files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings[0];
  binding.unexpected = sentinels;
  binding.connectionId = ['acct', 'synthetic-resource'].join('_');
  binding.keySentinels = {
    [['sk', 'test', 'key-name'].join('_')]: 'redacted',
    ['https://example.invalid/file?X-Amz-Signature=SYNTHETIC']: 'redacted',
    ['person@example.invalid']: 'redacted',
    [['acct', 'key-resource'].join('_')]: 'redacted',
  };
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('secret_value_forbidden'), true);
  assert.equal(codes.has('pii_value_forbidden'), true);
  assert.equal(codes.has('provider_resource_id_forbidden'), true);
  for (const sentinel of sentinels) assert.equal(JSON.stringify(report).includes(sentinel), false);
});

test('non-JSON values fail closed even in legacy descriptors', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  files.find(file => file.path.endsWith('/auth-profile-registry.json')).content.profiles[0].nonJson = Number.NaN;
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.findings.some(finding => finding.code === 'non_json_value_forbidden'), true);
});

test('server descriptors must use the exact canonical domain path', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  files.push({
    path: 'example.com/nested/server/data-spaces.json',
    content: structuredClone(files.find(file => file.path.endsWith('/data-spaces.json')).content),
  });
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.findings.some(finding => finding.code === 'invalid_server_descriptor_path'), true);
});

test('alternate casing or encoding cannot turn a server descriptor into public payload', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const sentinel = ['sk', 'live', 'case-do-not-echo'].join('_');
  for (const segment of ['SERVER', '%73erver', '%2573erver']) {
    files.push({
      path: `example.com/${segment}/integration-bindings.json`,
      content: { version: 1, unexpected: sentinel },
    });
  }
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  assert.equal(report.ok, false);
  assert.equal(report.findings.filter(finding => finding.code === 'invalid_server_descriptor_path').length, 3);
  assert.equal(JSON.stringify(report).includes(sentinel), false);
});

test('environment and opaque connection binding mismatches are rejected', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  files.find(file => file.path.endsWith('/data-spaces.json')).content.scope.environment = 'production';
  files.find(file => file.path.endsWith('/commerce.json')).content.commerce.payments.bindingId = 'missing-binding';
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('environment_mismatch'), true);
  assert.equal(codes.has('binding_not_found'), true);
  await assert.rejects(
    validateDraftFeatureReadiness({
      domain: 'example.com', environment: 'production', mode: 'dev', files: await fixtureFiles(),
    }),
    /mode_environment_mismatch/,
  );
});

test('descriptor scopes agree and can be checked against server-controlled tenant and draft ids', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const inconsistent = await fixtureFiles();
  inconsistent.find(file => file.path.endsWith('/integration-bindings.json')).content.scope.tenantId = 'other-tenant';
  inconsistent.find(file => file.path.endsWith('/integration-bindings.json')).content.scope.draftId = 'other-draft';
  const inconsistentReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: inconsistent,
  });
  const inconsistentCodes = new Set(inconsistentReport.findings.map(finding => finding.code));
  assert.equal(inconsistentCodes.has('tenant_scope_mismatch'), true);
  assert.equal(inconsistentCodes.has('draft_scope_mismatch'), true);

  const authoritativeReport = await validateDraftFeatureReadiness({
    domain: 'example.com',
    environment: 'test',
    mode: 'test',
    expectedTenantId: 'authoritative-tenant',
    expectedDraftId: 'authoritative-draft',
    files: await fixtureFiles(),
  });
  const authoritativeCodes = new Set(authoritativeReport.findings.map(finding => finding.code));
  assert.equal(authoritativeCodes.has('tenant_scope_mismatch'), true);
  assert.equal(authoritativeCodes.has('draft_scope_mismatch'), true);
});

test('protected feature auth profiles must exist, be active, and match the tenant', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();

  const missingRegistryFiles = (await fixtureFiles()).filter(file => !file.path.endsWith('/auth-profile-registry.json'));
  const missingRegistryReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: missingRegistryFiles,
  });
  assert.equal(missingRegistryReport.findings.some(finding => finding.code === 'auth_profile_registry_required'), true);

  const invalidProfileFiles = await fixtureFiles();
  const registry = invalidProfileFiles.find(file => file.path.endsWith('/auth-profile-registry.json')).content;
  registry.profiles[0].status = 'suspended';
  registry.profiles[0].tenantId = 'other-tenant';
  const commerce = invalidProfileFiles.find(file => file.path.endsWith('/commerce.json')).content.commerce;
  commerce.adminAccess.authProfileId = 'missing-profile';
  const invalidProfileReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: invalidProfileFiles,
  });
  const codes = new Set(invalidProfileReport.findings.map(finding => finding.code));
  assert.equal(codes.has('auth_profile_not_found'), true);
  assert.equal(codes.has('auth_profile_inactive'), true);
  assert.equal(codes.has('auth_profile_scope_mismatch'), true);
});

test('test bindings cannot use live mode and active notifications require a matching email binding', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const bindings = files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings;
  bindings[0].mode = 'live';
  const notifications = files.find(file => file.path.endsWith('/notification-policies.json')).content.policies[0];
  notifications.status = 'active';

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('binding_mode_mismatch'), true);
  assert.equal(codes.has('notification_binding_not_found'), true);
});

test('provider-specific settings and commerce notification references fail closed', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const stripeBinding = files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings[0];
  delete stripeBinding.stripe;
  stripeBinding.status = 'disabled';
  stripeBinding.adapterVersion = 'v999';
  stripeBinding.capabilities.push('arbitrary-provider-operation');
  const commerce = files.find(file => file.path.endsWith('/commerce.json')).content.commerce;
  commerce.notificationPolicyIds = ['missing-policy'];

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('stripe_settings_required'), true);
  assert.equal(codes.has('binding_inactive'), true);
  assert.equal(codes.has('adapter_version_not_supported'), true);
  assert.equal(codes.has('provider_capability_not_supported'), true);
  assert.equal(codes.has('notification_policy_not_found'), true);
});

test('active notification bindings require the code-owned SMTP send capability', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  const bindings = files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings;
  bindings.push({
    id: 'smtp-primary',
    provider: 'email.smtp',
    adapterVersion: 'v1',
    connectionId: 'billing-mailbox',
    status: 'active',
    mode: 'test',
    capabilities: ['checkout'],
  });
  const policy = files.find(file => file.path.endsWith('/notification-policies.json')).content.policies[0];
  policy.status = 'active';
  policy.provider = 'email.smtp';
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('provider_capability_not_supported'), true);
  assert.equal(codes.has('notification_send_capability_required'), true);
});

test('commerce requires a Stripe binding with capabilities matching its enabled operations', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const missingCapabilityFiles = await fixtureFiles();
  const stripeBinding = missingCapabilityFiles
    .find(file => file.path.endsWith('/integration-bindings.json'))
    .content.bindings[0];
  stripeBinding.capabilities = stripeBinding.capabilities.filter(capability => capability !== 'checkout');
  const missingCapabilityReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: missingCapabilityFiles,
  });
  assert.equal(
    missingCapabilityReport.findings.some(finding => finding.code === 'commerce_provider_capability_required'),
    true,
  );

  const wrongProviderFiles = await fixtureFiles();
  const paymentBinding = wrongProviderFiles
    .find(file => file.path.endsWith('/integration-bindings.json'))
    .content.bindings[0];
  paymentBinding.provider = 'email.smtp';
  paymentBinding.capabilities = ['send'];
  delete paymentBinding.stripe;
  const wrongProviderReport = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'test', mode: 'test', files: wrongProviderFiles,
  });
  assert.equal(
    wrongProviderReport.findings.some(finding => finding.code === 'commerce_payment_provider_not_supported'),
    true,
  );
});

test('production fails closed on test mode and unresolved fiscal or notification approvals', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  for (const file of files) {
    if (file.content.scope) file.content.scope.environment = 'production';
  }
  const commerce = files.find(file => file.path.endsWith('/commerce.json')).content.commerce;
  commerce.fiscal = {
    enabled: true,
    manual: true,
    disclosureId: 'manual-invoice-v1',
    taxBehavior: 'exclusive',
    retentionDays: 1825,
    requestWindowHours: 24,
  };
  const notifications = files.find(file => file.path.endsWith('/notification-policies.json')).content.policies[0];
  notifications.status = 'active';
  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'production', mode: 'production', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  assert.equal(codes.has('live_binding_required'), true);
  assert.equal(codes.has('tax_configuration_unapproved'), true);
  assert.equal(codes.has('fiscal_approval_required'), true);
  assert.equal(codes.has('notification_transport_approval_required'), true);
});

test('draft-supplied approval ids and unknown providers cannot open live gates', async () => {
  const { validateDraftFeatureReadiness } = await readinessModule();
  const files = await fixtureFiles();
  for (const file of files) {
    if (file.content.scope) file.content.scope.environment = 'production';
  }

  const bindings = files.find(file => file.path.endsWith('/integration-bindings.json')).content.bindings;
  bindings[0].mode = 'live';
  bindings[0].stripe.taxMode = 'manual-rate';
  bindings[0].stripe.taxApprovalId = 'self-asserted';
  bindings.push({
    id: 'smtp-primary',
    provider: 'unknown-smtp',
    adapterVersion: 'v1',
    connectionId: 'billing-mailbox',
    status: 'active',
    mode: 'live',
    capabilities: ['send'],
  });

  const commerce = files.find(file => file.path.endsWith('/commerce.json')).content.commerce;
  commerce.fiscal = {
    enabled: true,
    manual: true,
    disclosureId: 'manual-invoice-v1',
    taxBehavior: 'exclusive',
    accountantApprovalId: 'self-asserted',
    retentionDays: 365,
    requestWindowHours: 24,
  };
  const policy = files.find(file => file.path.endsWith('/notification-policies.json')).content.policies[0];
  policy.status = 'active';
  policy.provider = 'unknown-smtp';
  policy.transportApprovalId = 'self-asserted';

  const report = await validateDraftFeatureReadiness({
    domain: 'example.com', environment: 'production', mode: 'production', files,
  });
  const codes = new Set(report.findings.map(finding => finding.code));
  for (const code of [
    'provider_not_supported',
    'stripe_tax_live_gate_pending',
    'fiscal_live_gate_pending',
    'notification_transport_live_gate_pending',
  ]) {
    assert.equal(codes.has(code), true, `missing ${code}`);
  }
  assert.equal(report.ok, false);
});

test('dev reports blockers without failing while test and production exit nonzero', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-readiness-'));
  try {
    const draftRoot = path.join(tempRoot, 'example.com');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(path.join(draftRoot, 'server'), { recursive: true }));
    await writeFile(path.join(draftRoot, 'server', 'integration-bindings.json'), JSON.stringify({ version: 1, leaked: true }));
    for (const mode of ['dev', 'test', 'production']) {
      const result = spawnSync(process.execPath, [
        path.join(repoRoot, 'tools', 'draft-feature-readiness.mjs'),
        `--domain=example.com`, `--draft-root=${tempRoot}`, `--mode=${mode}`,
      ], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env } });
      assert.equal(result.stdout.includes('"ok"'), true, result.stderr);
      assert.equal(result.status, mode === 'dev' ? 0 : 1);
      assert.equal(result.stdout.includes('leaked'), false);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('protected feature runtime kinds preserve existing bindings and require capabilities for new bindings', async () => {
  const schema = await readJson(path.join(schemaDir, 'protected-features.schema.json'));
  const dataSource = schema.definitions.runtimeDataSourceBinding;
  const action = schema.definitions.runtimeApiActionBinding;
  for (const kind of ['api-proxy', 'auth-admin', 'data-space', 'commerce', 'integrations']) {
    assert.equal(dataSource.properties.kind.enum.includes(kind), true);
    assert.equal(action.properties.kind.enum.includes(kind), true);
  }
  assert.equal(dataSource.properties.capability.$ref, '#/definitions/capability');
  assert.equal(action.properties.capability.$ref, '#/definitions/capability');
  assert.match(schema.definitions.capability.pattern, /\{1,2\}/);
});

test('template validate-only needs no AWS credentials and workflows validate before credentials', async () => {
  const deployScript = path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'deploy-draft.mjs');
  const result = spawnSync(process.execPath, [
    deployScript,
    '--domain=example.com',
    `--draft-root=${fixtureRoot}`,
    '--environment=test',
    '--validate-only=true',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AWS_') && key !== 'AUTHORING_ENDPOINT')),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).validatedOnly, true);

  for (const fileName of ['deploy-test.yml', 'deploy-production.yml']) {
    const workflow = await readFile(path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', fileName), 'utf8');
    assert.ok(workflow.indexOf('--validate-only=true') >= 0);
    assert.ok(workflow.indexOf('--validate-only=true') < workflow.indexOf('aws-actions/configure-aws-credentials'));
  }
  const guard = await readFile(path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', 'guard-pr-source.yml'), 'utf8');
  assert.match(guard, /--validate-only=true/);
});

test('template schemas are byte-for-byte copies of canonical schemas', async () => {
  const templateSchemaDir = path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'schemas');
  for (const name of schemaNames) {
    assert.equal(
      await readFile(path.join(templateSchemaDir, name), 'utf8'),
      await readFile(path.join(schemaDir, name), 'utf8'),
    );
  }
});
