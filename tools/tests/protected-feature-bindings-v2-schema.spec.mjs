import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const schemaPath = path.join(repoRoot, 'docs', 'api-driven-config', 'schemas', 'protected-feature-bindings-v2.schema.json');
const templateSchemaPath = path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'schemas', 'protected-feature-bindings-v2.schema.json');
const requiredOrigin = 'https://admin-test.thehairnarrative.com';
const descriptorFileName = 'protected-feature-bindings-v2.json';
const packageKind = 'server-protected-feature-bindings-v2';
const execFileAsync = promisify(execFile);

const exactBinding = Object.freeze({
  bindingId: 'journal-v2',
  domain: 'thehairnarrative.com',
  environment: 'test',
  authProfileId: 'journal-owner',
  featureId: 'journal',
  hubId: 'thehairnarrative-com-journal',
  serviceBindingId: 'thn-journal-test-v2',
  authBasePath: '/auth-v2',
  contentHubBasePath: '/features/content-hub-v2',
  status: 'active',
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function siteConfig(origin = requiredOrigin, domain = 'thehairnarrative.com') {
  const authRemote = {
    enabled: true,
    authProfileId: 'journal-owner',
    endpoint: '/auth-v2/runtime-config',
  };
  if (origin !== null) authRemote.requiredOrigin = origin;
  return {
    version: 1,
    domain,
    routes: [],
    runtime: { authRemote },
  };
}

function packageFiles(origin = requiredOrigin, domain = 'thehairnarrative.com') {
  return [
    {
      path: `${domain}/site-config.json`,
      kind: 'site-config',
      content: siteConfig(origin, domain),
    },
    {
      path: `${domain}/server/${descriptorFileName}`,
      kind: packageKind,
      content: { ...exactBinding },
    },
  ];
}

test('the THN v2 binding schema is one closed object with every REQ-014 value fixed', async () => {
  assert.equal(existsSync(schemaPath), true, 'canonical protected-feature-bindings-v2 schema must exist');
  const [{ validateSchema }, schema] = await Promise.all([
    import('../lib/server-feature-contract-validator.mjs'),
    readJson(schemaPath),
  ]);

  assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.minProperties, 10);
  assert.equal(schema.maxProperties, 10);
  assert.deepEqual(schema.required, Object.keys(exactBinding));
  assert.deepEqual(Object.keys(schema.properties), Object.keys(exactBinding));
  for (const [field, value] of Object.entries(exactBinding)) {
    assert.deepEqual(schema.properties[field], { const: value }, field);
  }
  assert.deepEqual(validateSchema(schema, exactBinding), []);

  for (const field of Object.keys(exactBinding)) {
    const missing = { ...exactBinding };
    delete missing[field];
    assert.notDeepEqual(validateSchema(schema, missing), [], `missing ${field}`);

    const changed = { ...exactBinding, [field]: `${exactBinding[field]}-changed` };
    assert.notDeepEqual(validateSchema(schema, changed), [], `changed ${field}`);
  }
  assert.notDeepEqual(validateSchema(schema, { ...exactBinding, unexpected: true }), []);
  assert.notDeepEqual(validateSchema(schema, [{ ...exactBinding }]), [], 'an array would permit more than one binding');
});

test('the package kind and closed schema registry stay synchronized in canonical and draft-template tooling', async () => {
  assert.equal(existsSync(templateSchemaPath), true, 'template schema copy must exist');
  const [canonicalKinds, templateKinds, canonicalValidator, templateValidator, canonicalSchema, templateSchema] = await Promise.all([
    import('../lib/server-descriptor-kinds.mjs'),
    import('../templates/draft-repo/tools/lib/server-descriptor-kinds.mjs'),
    import('../lib/server-feature-contract-validator.mjs'),
    import('../templates/draft-repo/tools/lib/server-feature-contract-validator.mjs'),
    readFile(schemaPath),
    readFile(templateSchemaPath),
  ]);

  assert.equal(canonicalKinds.SERVER_DESCRIPTOR_KINDS[descriptorFileName], packageKind);
  assert.equal(templateKinds.SERVER_DESCRIPTOR_KINDS[descriptorFileName], packageKind);
  assert.equal(
    canonicalKinds.inferServerDescriptorKind(
      'thehairnarrative.com',
      `thehairnarrative.com/server/${descriptorFileName}`,
    ),
    packageKind,
  );
  assert.deepEqual(templateKinds.SERVER_DESCRIPTOR_KINDS, canonicalKinds.SERVER_DESCRIPTOR_KINDS);

  const expectedContract = {
    packageKind,
    schemaFile: 'protected-feature-bindings-v2.schema.json',
    publicArtifact: false,
  };
  assert.deepEqual(canonicalValidator.SERVER_FEATURE_DESCRIPTOR_CONTRACTS[descriptorFileName], expectedContract);
  assert.deepEqual(templateValidator.SERVER_FEATURE_DESCRIPTOR_CONTRACTS, canonicalValidator.SERVER_FEATURE_DESCRIPTOR_CONTRACTS);
  assert.deepEqual(templateSchema, canonicalSchema);
});

test('Git preserves LF bytes for both protected binding schema copies', async () => {
  const schemaPaths = [
    'docs/api-driven-config/schemas/protected-feature-bindings-v2.schema.json',
    'tools/templates/draft-repo/tools/schemas/protected-feature-bindings-v2.schema.json',
  ];
  const { stdout } = await execFileAsync('git', ['check-attr', 'eol', '--', ...schemaPaths], { cwd: repoRoot });
  assert.deepEqual(
    stdout.trim().split(/\r?\n/),
    schemaPaths.map(filePath => `${filePath}: eol: lf`),
  );
});

test('THN binding readiness requires one descriptor and the exact browser-safe admin origin', async () => {
  const [{ validateDraftFeatureReadiness }, { validateSchema }] = await Promise.all([
    import('../draft-feature-readiness.mjs'),
    import('../lib/server-feature-contract-validator.mjs'),
  ]);
  const siteSchema = await readJson(path.join(repoRoot, 'docs', 'api-driven-config', 'schemas', 'site-config.schema.json'));
  const authRemoteSchema = {
    ...siteSchema.definitions.authRemoteRuntime,
    properties: {
      ...siteSchema.definitions.authRemoteRuntime.properties,
      endpoint: { type: 'string' },
    },
  };
  const validateAuthRemote = config => validateSchema(authRemoteSchema, config.runtime.authRemote);

  assert.deepEqual(validateAuthRemote(siteConfig()), []);
  const valid = await validateDraftFeatureReadiness({
    domain: 'thehairnarrative.com',
    environment: 'test',
    mode: 'test',
    files: packageFiles(),
  });
  assert.equal(valid.ok, true, JSON.stringify(valid.findings));
  assert.equal(valid.featureFileCount, 1);

  for (const origin of [
    null,
    'https://test.zoolandingpage.com.mx',
    'https://*.thehairnarrative.com',
    'https://admin-test.other.example.com',
    'http://admin-test.thehairnarrative.com',
    'https://admin-test.thehairnarrative.com/path',
    'https://admin-test.thehairnarrative.com?draft=other',
    'https://admin-test.thehairnarrative.com#fragment',
  ]) {
    assert.notDeepEqual(validateAuthRemote(siteConfig(origin)), [], `site schema accepted ${origin}`);
    const report = await validateDraftFeatureReadiness({
      domain: 'thehairnarrative.com',
      environment: 'test',
      mode: 'test',
      files: packageFiles(origin),
    });
    assert.equal(report.ok, false, `readiness accepted ${origin}`);
    assert.equal(
      report.findings.some(finding => finding.code === 'protected_feature_required_origin_mismatch'),
      true,
      JSON.stringify(report.findings),
    );
  }

  const duplicate = packageFiles();
  duplicate.push({ ...duplicate[1] });
  const duplicateReport = await validateDraftFeatureReadiness({
    domain: 'thehairnarrative.com',
    environment: 'test',
    mode: 'test',
    files: duplicate,
  });
  assert.equal(duplicateReport.ok, false);
  assert.equal(duplicateReport.findings.some(finding => finding.code === 'duplicate_path'), true);
});

test('THN binding readiness fails closed when the package domain or environment crosses the fixed binding scope', async () => {
  const readinessModules = await Promise.all([
    import('../draft-feature-readiness.mjs'),
    import('../templates/draft-repo/tools/draft-feature-readiness.mjs'),
  ]);

  for (const { validateDraftFeatureReadiness } of readinessModules) {
    const wrongDomain = await validateDraftFeatureReadiness({
      domain: 'evil.example',
      environment: 'test',
      mode: 'test',
      files: packageFiles(requiredOrigin, 'evil.example'),
    });
    assert.equal(wrongDomain.ok, false);
    assert.deepEqual(
      wrongDomain.findings.filter(finding => finding.code === 'domain_mismatch'),
      [{
        code: 'domain_mismatch',
        severity: 'blocking',
        file: `server/${descriptorFileName}`,
        pointer: '$/domain',
      }],
    );

    const wrongEnvironment = await validateDraftFeatureReadiness({
      domain: 'thehairnarrative.com',
      environment: 'production',
      mode: 'production',
      files: packageFiles(),
    });
    assert.equal(wrongEnvironment.ok, false);
    assert.deepEqual(
      wrongEnvironment.findings.filter(finding => finding.code === 'environment_mismatch'),
      [{
        code: 'environment_mismatch',
        severity: 'blocking',
        file: `server/${descriptorFileName}`,
        pointer: '$/environment',
      }],
    );
  }
});

test('journal-owner readiness fails closed when its protected binding descriptor is missing', async () => {
  const readinessModules = await Promise.all([
    import('../draft-feature-readiness.mjs'),
    import('../templates/draft-repo/tools/draft-feature-readiness.mjs'),
  ]);

  for (const { validateDraftFeatureReadiness } of readinessModules) {
    const report = await validateDraftFeatureReadiness({
      domain: 'thehairnarrative.com',
      environment: 'test',
      mode: 'test',
      files: [packageFiles()[0]],
    });
    assert.equal(report.ok, false);
    assert.deepEqual(
      report.findings.filter(finding => finding.code === 'protected_feature_binding_required'),
      [{
        code: 'protected_feature_binding_required',
        severity: 'blocking',
        file: `server/${descriptorFileName}`,
        pointer: '$/runtime/authRemote/authProfileId',
      }],
    );
  }
});

test('the descriptor is server-only in authoring packages and excluded from browser and SSR draft artifacts', async () => {
  const angular = await readJson(path.join(repoRoot, 'angular.json'));
  for (const target of ['build', 'test']) {
    const projections = angular.projects.zoolandingpage.architect[target].options.assets
      .filter(asset => typeof asset === 'object' && asset.input === 'drafts');
    assert.equal(projections.length, 1);
    assert.equal(projections[0].ignore.includes('**/server/**'), true);
    assert.equal(projections[0].glob.includes('server'), false);
  }

  const { SERVER_FEATURE_DESCRIPTOR_CONTRACTS } = await import('../lib/server-feature-contract-validator.mjs');
  assert.equal(SERVER_FEATURE_DESCRIPTOR_CONTRACTS[descriptorFileName].publicArtifact, false);
  assert.equal(packageFiles()[1].kind.startsWith('server-'), true);
});

test('the protected binding contract runs through the official readiness command and Angular validation job', async () => {
  const packageJson = await readJson(path.join(repoRoot, 'package.json'));
  assert.match(
    packageJson.scripts['test:draft-feature-readiness'],
    /(?:^|\s)tools\/tests\/protected-feature-bindings-v2-schema\.spec\.mjs(?:\s|$)/,
  );

  const workflow = await readFile(path.join(repoRoot, '.github', 'workflows', 'angular-validate.yml'), 'utf8');
  assert.match(workflow, /^\s*- run: npm run test:draft-feature-readiness\s*$/m);
});
