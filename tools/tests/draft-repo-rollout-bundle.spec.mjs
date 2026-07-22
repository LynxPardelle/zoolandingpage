import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const templateRoot = path.join(repoRoot, 'tools', 'templates', 'draft-repo');
const auditorCommit = 'c8b04670b5cca800ccf0f723815813897e596600';
const promotionVerifierSha256 = '6a513e34b321dd7c5be200422bb01cd66987dc838cae1546a85de6d463eabc4f';
const rolloutClosure = Object.freeze([
  '.github/workflows/deploy-production.yml',
  '.github/workflows/deploy-test.yml',
  '.github/workflows/guard-pr-source.yml',
  '.github/workflows/pr-safety.yml',
  'tools/deploy-draft.mjs',
  'tools/draft-feature-readiness.mjs',
  'tools/lib/sensitive-value-patterns.mjs',
  'tools/lib/server-descriptor-kinds.mjs',
  'tools/lib/server-feature-contract-validator.mjs',
  'tools/lib/server-feature-runtime-config-guard.mjs',
  'tools/runtime-data-source-condition-guard.mjs',
  'tools/schemas/commerce.schema.json',
  'tools/schemas/data-spaces.schema.json',
  'tools/schemas/integration-bindings.schema.json',
  'tools/schemas/notification-policies.schema.json',
  'tools/verify-promotion-commit.mjs',
]);

async function fileHash(filePath) {
  try {
    return createHash('sha256').update(await readFile(filePath)).digest('hex');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function normalizedTextFileHash(filePath) {
  return createHash('sha256').update((await readFile(filePath, 'utf8')).replaceAll('\r\n', '\n')).digest('hex');
}

async function applyRolloutClosure(targetRoot) {
  const changedPaths = [];
  for (const relativePath of rolloutClosure) {
    const source = path.join(templateRoot, relativePath);
    const target = path.join(targetRoot, relativePath);
    const before = await fileHash(target);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    const after = await fileHash(target);
    assert.equal(after, await fileHash(source), `${relativePath} must be byte-identical to the template source`);
    if (before !== after) changedPaths.push(relativePath);
  }
  return { closureCount: rolloutClosure.length, changedPaths };
}

test('legacy rollout closure is self-contained and distinguishes closure from changed paths', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-rollout-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const genericRoot = path.join(root, 'generic');
  const zoositeRoot = path.join(root, 'zoosite');

  const generic = await applyRolloutClosure(genericRoot);
  assert.equal(generic.closureCount, 16);
  assert.equal(generic.changedPaths.length, 16);
  assert.equal(generic.changedPaths.includes('tools/verify-promotion-commit.mjs'), true);
  assert.equal(
    await normalizedTextFileHash(path.join(genericRoot, 'tools', 'verify-promotion-commit.mjs')),
    promotionVerifierSha256,
  );

  const existingGuard = 'tools/runtime-data-source-condition-guard.mjs';
  await mkdir(path.dirname(path.join(zoositeRoot, existingGuard)), { recursive: true });
  await copyFile(path.join(templateRoot, existingGuard), path.join(zoositeRoot, existingGuard));
  const zoosite = await applyRolloutClosure(zoositeRoot);
  assert.equal(zoosite.closureCount, 16);
  assert.equal(zoosite.changedPaths.length, 15);
  assert.equal(zoosite.changedPaths.includes(existingGuard), false);
  assert.equal(zoosite.changedPaths.includes('tools/verify-promotion-commit.mjs'), true);
  assert.equal(
    await normalizedTextFileHash(path.join(zoositeRoot, 'tools', 'verify-promotion-commit.mjs')),
    promotionVerifierSha256,
  );

  const draftRoot = path.join(zoositeRoot, 'example.com');
  await mkdir(draftRoot, { recursive: true });
  await writeFile(path.join(draftRoot, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  const safeEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => (
    name !== 'AUTHORING_ENDPOINT'
    && name !== 'GITHUB_TOKEN'
    && !name.startsWith('AWS_')
  )));
  const validation = spawnSync(process.execPath, [
    path.join(zoositeRoot, 'tools', 'deploy-draft.mjs'),
    '--domain=example.com',
    `--draft-root=${draftRoot}`,
    '--environment=test',
    '--validate-only=true',
  ], { cwd: zoositeRoot, encoding: 'utf8', env: safeEnvironment });
  assert.equal(validation.status, 0, `${validation.stdout}${validation.stderr}`);
  assert.deepEqual(JSON.parse(validation.stdout), {
    ok: true,
    domain: 'example.com',
    environment: 'test',
    fileCount: 1,
    validatedOnly: true,
  });
});

test('PR safety pins the corrected auditor commit and guards require no deployment authority', async () => {
  const prSafety = await readFile(path.join(templateRoot, '.github', 'workflows', 'pr-safety.yml'), 'utf8');
  assert.match(
    prSafety,
    new RegExp(`LynxPardelle/zoolandingpage/\\.github/workflows/reusable-pr-safety\\.yml@${auditorCommit}`),
  );
  assert.doesNotMatch(prSafety, /reusable-pr-safety\.yml@(?:main|dev|test)\b/);

  for (const workflowName of ['guard-pr-source.yml', 'pr-safety.yml']) {
    const workflow = await readFile(path.join(templateRoot, '.github', 'workflows', workflowName), 'utf8');
    assert.doesNotMatch(workflow, /^\s*environment:/m);
    assert.doesNotMatch(workflow, /id-token:\s*write/);
    assert.doesNotMatch(workflow, /\b(?:secrets|AUTHORING_ENDPOINT|AWS_ROLE_ARN)\b/);
  }

  const promotionVerifier = await readFile(path.join(templateRoot, 'tools', 'verify-promotion-commit.mjs'), 'utf8');
  assert.match(promotionVerifier, /tools\/lib\/server-feature-runtime-config-guard\.mjs/);
});
