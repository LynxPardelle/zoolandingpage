import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const deployScript = path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'deploy-draft.mjs');

test('template packages only known server descriptors with exact kinds', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-kinds-'));
  try {
    const draftRoot = path.join(tempRoot, 'example.com');
    const serverRoot = path.join(draftRoot, 'server');
    await mkdir(serverRoot, { recursive: true });
    await mkdir(path.join(tempRoot, 'tools', 'schemas'), { recursive: true });
    const expectedKinds = {
      'auth-profile-registry.json': 'server-auth-profile-registry',
      'integrations.json': 'server-integrations',
      'data-spaces.json': 'server-data-spaces',
      'commerce.json': 'server-commerce',
      'integration-bindings.json': 'server-integration-bindings',
      'notification-policies.json': 'server-notification-policies',
    };
    for (const name of Object.keys(expectedKinds)) await writeFile(path.join(serverRoot, name), '{}');
    await writeFile(path.join(draftRoot, 'draft-repo.config.json'), '{}');
    await writeFile(path.join(tempRoot, 'tools', 'schemas', 'commerce.schema.json'), '{}');

    const { collectJsonFiles } = await import(pathToFileURL(deployScript).href);
    const files = await collectJsonFiles(tempRoot, 'example.com');
    assert.equal(files.some(file => file.path.endsWith('/draft-repo.config.json')), false);
    assert.equal(files.some(file => file.path.includes('/tools/')), false);
    assert.deepEqual(Object.fromEntries(files.map(file => [path.basename(file.path), file.kind])), expectedKinds);

    await writeFile(path.join(serverRoot, 'unknown.json'), '{}');
    await assert.rejects(() => collectJsonFiles(tempRoot, 'example.com'), /unknown_server_descriptor/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template server kind map stays synchronized with the canonical map', async () => {
  const canonical = await import('../lib/server-descriptor-kinds.mjs');
  const template = await import('../templates/draft-repo/tools/lib/server-descriptor-kinds.mjs');
  assert.deepEqual(template.SERVER_DESCRIPTOR_KINDS, canonical.SERVER_DESCRIPTOR_KINDS);
  for (const candidate of [
    'example.com/SERVER/commerce.json',
    'example.com/%73erver/commerce.json',
    'example.com/%2573erver/commerce.json',
    'example.com/nested/server/commerce.json',
  ]) {
    assert.throws(() => canonical.inferServerDescriptorKind('example.com', candidate), /invalid_server_descriptor_path/);
    assert.throws(() => template.inferServerDescriptorKind('example.com', candidate), /invalid_server_descriptor_path/);
  }
});

test('new protected binding kinds require a bounded capability', async () => {
  const schema = JSON.parse(await readFile(path.join(repoRoot, 'docs', 'api-driven-config', 'schemas', 'protected-features.schema.json'), 'utf8'));
  for (const binding of [schema.definitions.runtimeDataSourceBinding, schema.definitions.runtimeApiActionBinding]) {
    assert.deepEqual(binding.allOf[0].then.required, ['capability']);
    assert.equal(binding.properties.capability.$ref, '#/definitions/capability');
  }
  assert.equal(schema.definitions.capability.maxLength, 128);
});

test('template validation fails closed without echoing secret-looking values', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-readiness-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'template-do-not-echo'].join('_');
    await writeFile(path.join(serverRoot, 'integration-bindings.json'), JSON.stringify({ version: 1, unexpected: sentinel }));
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_feature_readiness_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template scans legacy server descriptors without echoing values', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-legacy-readiness-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'legacy-template-do-not-echo'].join('_');
    await writeFile(path.join(serverRoot, 'integrations.json'), JSON.stringify({
      version: 1,
      sources: [{ id: 'source', method: 'GET', url: 'https://example.invalid', headers: { Authorization: sentinel } }],
      actions: [],
    }));
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_feature_readiness_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template never echoes malformed JSON or upstream error text', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-malformed-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'malformed-do-not-echo'].join('_');
    await writeFile(
      path.join(serverRoot, 'integration-bindings.json'),
      `{"version":1,"unexpected":"${sentinel}`,
    );
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_deploy_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('PR validation reads its non-secret domain without environment-scoped variables', async () => {
  const workflow = await readFile(path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', 'guard-pr-source.yml'), 'utf8');
  assert.match(workflow, /draft-repo\.config\.json/);
  assert.doesNotMatch(workflow, /vars\.DRAFT_DOMAIN/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name/);
  assert.match(workflow, /github\.repository/);
});

test('manual template deploys enforce the protected branch and promotion ancestry', async () => {
  for (const [name, branch] of [['deploy-test.yml', 'test'], ['deploy-production.yml', 'main']]) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    assert.match(workflow, new RegExp(`refs/heads/${branch}`));
    assert.match(workflow, /github\.ref/);
    assert.doesNotMatch(workflow, /if:\s*github\.event_name == 'push'/);
    assert.match(workflow, /node tools\/verify-promotion-commit\.mjs/);
    assert.match(workflow, /pull-requests:\s*read/);
    const topLevelPermissions = workflow.slice(
      workflow.indexOf('permissions:'),
      workflow.indexOf('\njobs:'),
    );
    assert.doesNotMatch(topLevelPermissions, /id-token:\s*write/);
    assert.match(workflow, /validate:[\s\S]*deploy:/);
    assert.match(workflow, /deploy:[\s\S]*needs:\s*validate/);
    assert.match(workflow, /deploy:[\s\S]*permissions:[\s\S]*id-token:\s*write/);
    assert.match(workflow, /ref:\s*\$\{\{ github\.sha \}\}/);
    assert.match(workflow, /persist-credentials:\s*false/);
    assert.match(workflow, /DRAFT_DOMAIN:\s*\$\{\{ needs\.validate\.outputs\.draft_domain \}\}/);
  }
});
