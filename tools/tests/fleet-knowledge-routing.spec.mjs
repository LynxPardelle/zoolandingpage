import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  applyRouting,
  auditRepository,
  buildInventory,
  parseArgs,
  readSatelliteRegistry,
  routingBlock,
  upsertManagedBlock,
} from '../fleet-knowledge-routing.mjs';

const execFileAsync = promisify(execFile);
const owner = 'LynxPardelle';

async function git(cwd, ...args) {
  return execFileAsync('git', args, { cwd, windowsHide: true });
}

async function createRepoFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-fleet-routing-'));
  const hubRoot = path.join(root, 'zoolandingpage');
  const repoPath = path.join(root, 'draft-example-com');
  await mkdir(path.join(hubRoot, 'docs'), { recursive: true });
  await mkdir(path.join(hubRoot, 'ai-notes', 'how-to'), { recursive: true });
  for (const relativePath of [
    'docs/11-draft-lifecycle.md',
    'docs/12-public-assets-and-file-uploads.md',
    'docs/13-managed-alias-front-door.md',
    'docs/repository-map.md',
    'ai-notes/how-to/create-secure-draft-repo.md',
  ]) {
    await writeFile(path.join(hubRoot, relativePath), '# fixture\n', 'utf8');
  }

  await mkdir(path.join(repoPath, '.github', 'workflows'), { recursive: true });
  await git(repoPath, 'init', '-b', 'dev');
  await git(repoPath, 'config', 'user.email', 'fixture@example.com');
  await git(repoPath, 'config', 'user.name', 'Fixture');
  await git(repoPath, 'remote', 'add', 'origin', `https://github.com/${owner}/draft-example-com.git`);
  for (const file of ['deploy-test.yml', 'deploy-production.yml', 'guard-pr-source.yml']) {
    await writeFile(path.join(repoPath, '.github', 'workflows', file), `name: ${file}\n`, 'utf8');
  }
  await writeFile(path.join(repoPath, 'README.md'), '# Custom draft\n\nKeep this introduction.\n', 'utf8');
  await writeFile(path.join(repoPath, 'AGENTS.md'), '# Custom agent rules\n\nKeep this safety rule.\n', 'utf8');
  await git(repoPath, 'add', '.');
  await git(repoPath, 'commit', '-m', 'fixture');
  await git(repoPath, 'update-ref', 'refs/remotes/origin/test', 'HEAD');
  await git(repoPath, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

  return { hubRoot, repoPath };
}

const definition = {
  type: 'draft',
  repo: 'draft-example-com',
  githubUrl: `https://github.com/${owner}/draft-example-com.git`,
  requiredBranches: ['dev', 'test', 'main'],
  requiredWorkflows: ['deploy-test.yml', 'deploy-production.yml', 'guard-pr-source.yml', 'pr-safety.yml'],
};

test('upsertManagedBlock preserves custom prose and is idempotent', () => {
  const original = '# Custom\n\nKeep this text.\n';
  const block = routingBlock(definition, 'agents');
  const once = upsertManagedBlock(original, block);
  const twice = upsertManagedBlock(once, block);

  assert.match(once, /Keep this text/);
  assert.match(once, /Create or bootstrap a draft/);
  assert.ok(once.indexOf('Zoolanding Knowledge Router') < once.indexOf('Keep this text'));
  assert.equal(twice, once);
});

test('applyRouting preserves local docs and a second apply is a no-op', async () => {
  const { hubRoot, repoPath } = await createRepoFixture();

  const first = await applyRouting(repoPath, definition, { hubRoot });
  const second = await applyRouting(repoPath, definition, { hubRoot, allowDirty: true });
  const postApplyAudit = await auditRepository(repoPath, definition, { hubRoot, allowDirty: true });
  const readme = await readFile(path.join(repoPath, 'README.md'), 'utf8');
  const agents = await readFile(path.join(repoPath, 'AGENTS.md'), 'utf8');

  assert.deepEqual(first.changed.sort(), [
    '.github/workflows/guard-pr-source.yml',
    '.github/workflows/pr-safety.yml',
    'AGENTS.md',
    'README.md',
  ]);
  assert.deepEqual(second.changed, []);
  assert.deepEqual(postApplyAudit.issues, []);
  assert.match(readme, /Keep this introduction/);
  assert.match(agents, /Keep this safety rule/);
  assert.match(
    await readFile(path.join(repoPath, '.github', 'workflows', 'guard-pr-source.yml'), 'utf8'),
    /HEAD_REF: \$\{\{ github\.head_ref \}\}/
  );
});

test('applyRouting rejects a mismatched origin before writing', async () => {
  const { hubRoot, repoPath } = await createRepoFixture();
  await git(repoPath, 'remote', 'set-url', 'origin', `https://github.com/${owner}/wrong-repo.git`);

  await assert.rejects(applyRouting(repoPath, definition, { hubRoot }), /origin remote mismatch/i);
  assert.doesNotMatch(await readFile(path.join(repoPath, 'README.md'), 'utf8'), /zoolanding-hub-routing:start/);
});

test('auditRepository validates routing, remote, branches, workflows, and hub link targets', async () => {
  const { hubRoot, repoPath } = await createRepoFixture();
  await applyRouting(repoPath, definition, { hubRoot });
  await git(repoPath, 'add', '.');
  await git(repoPath, 'commit', '-m', 'route knowledge');

  const clean = await auditRepository(repoPath, definition, { hubRoot });
  assert.deepEqual(clean.issues, []);

  await writeFile(path.join(repoPath, 'README.md'), '# drifted\n', 'utf8');
  const dirty = await auditRepository(repoPath, definition, { hubRoot });
  assert.ok(dirty.issues.includes('dirty worktree'));
  assert.ok(dirty.issues.includes('README.md routing block missing'));
});

test('readSatelliteRegistry rejects unsafe paths and missing routing contracts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-satellite-registry-'));
  const registryPath = path.join(root, 'satellites.json');
  const base = {
    version: 1,
    owner,
    satellites: [{
      repo: 'zoolanding-service',
      githubUrl: `https://github.com/${owner}/zoolanding-service.git`,
      localPath: '../zoolanding-service',
      requiredBranches: ['dev', 'test', 'main'],
      requiredWorkflows: ['ci.yml'],
      routes: [{ task: 'Shared contract', path: 'docs/11-draft-lifecycle.md' }],
    }],
  };

  await writeFile(registryPath, JSON.stringify(base), 'utf8');
  assert.equal((await readSatelliteRegistry(registryPath)).satellites.length, 1);

  await writeFile(registryPath, JSON.stringify({
    ...base,
    satellites: [{ ...base.satellites[0], localPath: '../../escape' }],
  }), 'utf8');
  await assert.rejects(readSatelliteRegistry(registryPath), /localPath/i);

  await writeFile(registryPath, JSON.stringify({
    ...base,
    satellites: [{ ...base.satellites[0], routes: [] }],
  }), 'utf8');
  await assert.rejects(readSatelliteRegistry(registryPath), /routes/i);

  await writeFile(registryPath, JSON.stringify({
    ...base,
    satellites: [{
      ...base.satellites[0],
      routes: [{ task: 'Escape', path: '../secret.md' }],
    }],
  }), 'utf8');
  await assert.rejects(readSatelliteRegistry(registryPath), /route path/i);

  await writeFile(registryPath, JSON.stringify({
    ...base,
    satellites: [{ ...base.satellites[0], requiredWorkflows: [] }],
  }), 'utf8');
  await assert.rejects(readSatelliteRegistry(registryPath), /requiredWorkflows/i);
});

test('buildInventory routes registered drafts and satellites from the hub', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-fleet-inventory-'));
  const hubRoot = path.join(root, 'zoolandingpage');
  await mkdir(path.join(hubRoot, 'docs'), { recursive: true });
  await writeFile(path.join(hubRoot, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    owner,
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl: `https://github.com/${owner}/draft-example-com.git`,
      localPath: 'drafts/example.com',
    }],
  }), 'utf8');
  await writeFile(path.join(hubRoot, 'docs', 'satellite-repositories.json'), JSON.stringify({
    version: 1,
    owner,
    satellites: [{
      repo: 'zoolanding-service',
      githubUrl: `https://github.com/${owner}/zoolanding-service.git`,
      localPath: '../zoolanding-service',
      requiredBranches: ['dev', 'test', 'main'],
      requiredWorkflows: ['ci.yml'],
      routes: [{ task: 'Shared contract', path: 'docs/11-draft-lifecycle.md' }],
    }],
  }), 'utf8');

  const inventory = await buildInventory(hubRoot);

  assert.deepEqual(inventory.map(item => item.repo), ['draft-example-com', 'zoolanding-service']);
  assert.equal(inventory[0].type, 'draft');
  assert.equal(inventory[0].repoPath, path.join(hubRoot, 'drafts', 'example.com'));
  assert.equal(inventory[1].type, 'satellite');
  assert.equal(inventory[1].repoPath, path.join(root, 'zoolanding-service'));

  const checkoutRoot = path.join(root, 'fleet-checkouts');
  const checkoutInventory = await buildInventory(hubRoot, { checkoutRoot });
  assert.equal(checkoutInventory[0].repoPath, path.join(checkoutRoot, 'draft-example-com'));
  assert.equal(checkoutInventory[1].repoPath, path.join(checkoutRoot, 'zoolanding-service'));
});

test('buildInventory keeps test-only drafts in knowledge audits without requiring production surfaces', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-fleet-test-only-'));
  const hubRoot = path.join(root, 'hub');
  await mkdir(path.join(hubRoot, 'docs'), { recursive: true });
  await writeFile(path.join(hubRoot, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 2,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'thehairnarrative.com',
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      githubUrl: 'https://github.com/Toydrum/draft-thehairnarrative-com.git',
      localPath: 'drafts/thehairnarrative.com',
      deploymentEnvironments: ['test'],
    }],
  }), 'utf8');
  await writeFile(path.join(hubRoot, 'docs', 'satellite-repositories.json'), JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    satellites: [{
      repo: 'zoolanding-service',
      githubUrl: 'https://github.com/LynxPardelle/zoolanding-service.git',
      localPath: '../zoolanding-service',
      requiredBranches: ['main'],
      requiredWorkflows: ['ci.yml'],
      routes: [{ task: 'Operate service', path: 'docs/README.md' }],
    }],
  }), 'utf8');

  const inventory = await buildInventory(hubRoot);
  const hair = inventory.find(item => item.repo === 'draft-thehairnarrative-com');
  assert.ok(hair);
  assert.deepEqual(hair.requiredBranches, ['dev', 'test']);
  assert.deepEqual(hair.requiredWorkflows, ['deploy-test.yml', 'guard-pr-source.yml', 'pr-safety.yml']);
});

test('parseArgs keeps apply explicit and accepts selected repositories', () => {
  assert.deepEqual(parseArgs(['--apply', '--repo=one,two', '--repo=three']), {
    apply: 'true',
    repo: ['one', 'two', 'three'],
  });
});
