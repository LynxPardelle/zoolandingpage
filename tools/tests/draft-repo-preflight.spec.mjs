import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  discoverDraftRepos,
  ensureRegisteredDraftRepos,
  inspectRepo,
  inspectRegisteredDraftRepo,
  parseArgs,
  readDraftRegistry,
  registeredDraftRepoPath,
  resolveTargetRepos,
} from '../draft-repo-preflight.mjs';
import { bootstrapDraftRepo } from '../draft-repo-bootstrap.mjs';
import { collectJsonFiles, normalizeDomain, normalizeEnvironment } from '../templates/draft-repo/tools/deploy-draft.mjs';

const execFileAsync = promisify(execFile);

test('parseArgs accepts repeated repo flags', () => {
  const args = parseArgs(['--repo=one,two', '--repo=three', '--pull=false']);

  assert.deepEqual(args.repo, ['one', 'two', 'three']);
  assert.equal(args.pull, 'false');
});

test('discoverDraftRepos ignores non-draft folders', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-repos-'));
  await execFileAsync('git', ['init'], { cwd: root, windowsHide: true });
  await mkdir(path.join(root, 'unregistered.example.com'), { recursive: true });
  await mkdir(path.join(root, 'plain.example.com'), { recursive: true });
  await mkdir(path.join(root, 'not-a-draft'), { recursive: true });
  await execFileAsync('git', ['init'], { cwd: path.join(root, 'unregistered.example.com'), windowsHide: true });
  await execFileAsync('git', ['init'], { cwd: path.join(root, 'not-a-draft'), windowsHide: true });

  const repos = await discoverDraftRepos(root);

  assert.deepEqual(repos, [path.join(root, 'unregistered.example.com')]);
});

test('readDraftRegistry parses draft GitHub links', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-registry-'));
  const registryPath = path.join(root, 'drafts-registry.json');
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
        localPath: 'drafts/example.com',
      },
    ],
  }), 'utf8');

  const registry = await readDraftRegistry(registryPath);

  assert.equal(registry.drafts.length, 1);
  assert.equal(registry.drafts[0].domain, 'example.com');
  assert.equal(registry.drafts[0].githubUrl, 'https://github.com/LynxPardelle/draft-example-com.git');
});

test('readDraftRegistry permits a safe direct-child path during a documented domain transition', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-registry-transition-'));
  const registryPath = path.join(root, 'drafts-registry.json');
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'old.example.com',
      repo: 'draft-new-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-new-example-com.git',
      localPath: 'drafts/new.example.com',
    }],
  }), 'utf8');

  const registry = await readDraftRegistry(registryPath);
  assert.equal(registry.drafts[0].localPath, 'drafts/new.example.com');
});

test('readDraftRegistry rejects paths, duplicates, and remote identities outside the canonical contract', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-registry-invalid-'));
  const registryPath = path.join(root, 'drafts-registry.json');
  const base = {
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
  };
  const valid = {
    domain: 'example.com',
    repo: 'draft-example-com',
    githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
    localPath: 'drafts/example.com',
  };

  for (const localPath of ['../outside', 'drafts/../outside', 'C:/outside', '/outside']) {
    await writeFile(registryPath, JSON.stringify({ ...base, drafts: [{ ...valid, localPath }] }), 'utf8');
    await assert.rejects(readDraftRegistry(registryPath), /localPath/i);
  }

  await writeFile(registryPath, JSON.stringify({
    ...base,
    drafts: [valid, { ...valid, repo: 'draft-other', githubUrl: 'https://github.com/LynxPardelle/draft-other.git' }],
  }), 'utf8');
  await assert.rejects(readDraftRegistry(registryPath), /duplicate domain|duplicate localPath/i);

  await writeFile(registryPath, JSON.stringify({
    ...base,
    drafts: [{ ...valid, githubUrl: 'https://github.com/AnotherOwner/draft-example-com.git' }],
  }), 'utf8');
  await assert.rejects(readDraftRegistry(registryPath), /githubUrl/i);
});

test('registeredDraftRepoPath refuses to escape the canonical drafts root', () => {
  const root = path.resolve('workspace');
  assert.throws(
    () => registeredDraftRepoPath({ repo: 'draft-example', localPath: '../outside' }, root, 'drafts'),
    /localPath/i
  );
});

test('registered draft inspection rejects remote mismatch and junction escape', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-inspection-'));
  const draftsRoot = path.join(root, 'drafts');
  const repoPath = path.join(draftsRoot, 'example.com');
  await mkdir(repoPath, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: repoPath, windowsHide: true });
  await execFileAsync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/LynxPardelle/wrong-repo.git'],
    { cwd: repoPath, windowsHide: true }
  );
  const draft = {
    domain: 'example.com',
    repo: 'draft-example-com',
    githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
    localPath: 'drafts/example.com',
  };

  const mismatch = await inspectRegisteredDraftRepo(draft, { cwd: root, defaultBaseDir: 'drafts' });
  assert.equal(mismatch.status, 'remote-mismatch');

  const junctionRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-junction-'));
  const outsideRepo = path.join(junctionRoot, 'outside-repo');
  const hub = path.join(junctionRoot, 'hub');
  await mkdir(path.join(hub, 'drafts'), { recursive: true });
  await mkdir(outsideRepo, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: outsideRepo, windowsHide: true });
  await execFileAsync(
    'git',
    ['remote', 'add', 'origin', draft.githubUrl],
    { cwd: outsideRepo, windowsHide: true }
  );
  await symlink(outsideRepo, path.join(hub, 'drafts', 'example.com'), 'junction');

  const escaped = await inspectRegisteredDraftRepo(draft, { cwd: hub, defaultBaseDir: 'drafts' });
  assert.equal(escaped.status, 'path-escape');
});

test('unregistered draft inspection never pulls before ownership is classified', async t => {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-unregistered-pull-'));
  t.after(() => rm(repoPath, { recursive: true, force: true }));
  await execFileAsync('git', ['init'], { cwd: repoPath, windowsHide: true });

  const result = await inspectRepo(repoPath, { pull: true, unregistered: true });

  assert.equal(result.status, 'clean');
  assert.equal(result.pulled, false);
});

test('ensureRegisteredDraftRepos reports missing repos without cloning when disabled', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-missing-'));
  const registry = {
    defaultBaseDir: 'drafts',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
        localPath: 'drafts/example.com',
      },
    ],
  };

  const results = await ensureRegisteredDraftRepos(registry, { cwd: root, clone: false });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'missing');
  assert.equal(results[0].cloned, false);
});

test('resolveTargetRepos includes registered in-tree draft repos', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-resolve-'));
  const hub = path.join(workspace, 'zoolandingpage');
  const draft = path.join(hub, 'drafts', 'example.com');
  await mkdir(path.join(hub, 'docs'), { recursive: true });
  await mkdir(draft, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: draft, windowsHide: true });
  await execFileAsync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/LynxPardelle/draft-example-com.git'],
    { cwd: draft, windowsHide: true }
  );
  await writeFile(path.join(hub, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
        localPath: 'drafts/example.com',
      },
    ],
  }), 'utf8');

  const resolved = await resolveTargetRepos({ repo: [], clone: 'false' }, hub);

  assert.equal(resolved.registry.drafts.length, 1);
  assert.equal(resolved.registeredRepos[0].status, 'present');
  assert.deepEqual(resolved.repos, [draft, hub].sort());
  assert.deepEqual(resolved.unregisteredRepos, []);
});

test('resolveTargetRepos exposes unregistered domain repos as classification gaps', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-unregistered-'));
  const hub = path.join(workspace, 'zoolandingpage');
  const unregistered = path.join(hub, 'drafts', 'unregistered.example.com');
  await mkdir(path.join(hub, 'docs'), { recursive: true });
  await mkdir(unregistered, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: unregistered, windowsHide: true });
  await writeFile(path.join(hub, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'missing.example.com',
      repo: 'draft-missing-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-missing-example-com.git',
      localPath: 'drafts/missing.example.com',
    }],
  }), 'utf8');

  const resolved = await resolveTargetRepos({ repo: [], clone: 'false' }, hub);

  assert.deepEqual(resolved.unregisteredRepos, [unregistered]);
  assert.ok(resolved.repos.includes(unregistered));
});

test('deploy template normalizes domains and environments', () => {
  assert.equal(normalizeDomain('https://Example.com:443/'), 'example.com');
  assert.equal(normalizeEnvironment('main'), 'production');
  assert.equal(normalizeEnvironment('staging'), 'test');
});

test('collectJsonFiles prefixes root draft files and ignores local context', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-package-'));
  await writeFile(path.join(root, 'site-config.json'), '{"version":1}', 'utf8');
  await mkdir(path.join(root, 'default'), { recursive: true });
  await writeFile(path.join(root, 'default', 'page-config.json'), '{"rootIds":[]}', 'utf8');
  await mkdir(path.join(root, 'server'), { recursive: true });
  await writeFile(path.join(root, 'server', 'auth-profile-registry.json'), '{"version":1,"profiles":[]}', 'utf8');
  await writeFile(path.join(root, 'server', 'integrations.json'), '{"version":1,"sources":[],"actions":[]}', 'utf8');
  await mkdir(path.join(root, 'ai_notes'), { recursive: true });
  await writeFile(path.join(root, 'ai_notes', 'private.json'), '{"ignore":true}', 'utf8');

  const files = await collectJsonFiles(root, 'example.com');

  assert.deepEqual(files.map(file => file.path), [
    'example.com/default/page-config.json',
    'example.com/server/auth-profile-registry.json',
    'example.com/server/integrations.json',
    'example.com/site-config.json',
  ]);
  assert.deepEqual(
    files
      .filter(file => file.path.includes('/server/'))
      .map(file => ({ kind: file.kind, pageId: file.pageId })),
    [
      { kind: 'server-auth-profile-registry', pageId: undefined },
      { kind: 'server-integrations', pageId: undefined },
    ]
  );
});

test('bootstrapDraftRepo copies deploy templates and writes non-secret config', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-bootstrap-'));
  const repoPath = path.join(root, 'draft-example-com');

  const result = await bootstrapDraftRepo({
    repoPath,
    domain: 'example.com',
    authoringEndpoint: 'https://api.example.com/config-authoring',
    awsRegion: 'us-east-1',
  });

  assert.equal(result.domain, 'example.com');
  const config = JSON.parse(await import('node:fs/promises').then(fs => fs.readFile(path.join(repoPath, 'draft-repo.config.json'), 'utf8')));
  assert.equal(config.domain, 'example.com');
  assert.equal(config.authoringEndpoint, 'https://api.example.com/config-authoring');
  const agents = await import('node:fs/promises').then(fs => fs.readFile(path.join(repoPath, 'AGENTS.md'), 'utf8'));
  assert.match(agents, /dev -> test -> main/);
  assert.match(agents, /https:\/\/github\.com\/LynxPardelle\/zoolandingpage/);
  assert.match(agents, /Create or bootstrap a draft/i);
  assert.match(agents, /ai-notes\/how-to\/create-secure-draft-repo\.md/);
  assert.doesNotMatch(agents, /^\s*[-*]\s+20\d{2}-\d{2}-\d{2}\b/m);
  assert.ok(Buffer.byteLength(agents, 'utf8') <= 4 * 1024);

  const readme = await import('node:fs/promises').then(fs => fs.readFile(path.join(repoPath, 'README.md'), 'utf8'));
  assert.match(readme, /AGENTS\.md/);
  assert.match(readme, /Zoolandingpage documentation hub/i);

  const prSafety = await import('node:fs/promises').then(fs => fs.readFile(
    path.join(repoPath, '.github', 'workflows', 'pr-safety.yml'),
    'utf8'
  ));
  assert.match(prSafety, /LynxPardelle\/zoolandingpage\/.github\/workflows\/reusable-pr-safety\.yml@[0-9a-f]{40}/);
  assert.doesNotMatch(prSafety, /reusable-pr-safety\.yml@(?:main|dev|test)\b/);
  assert.match(prSafety, /pull_request:/);

  const promotionGuard = await import('node:fs/promises').then(fs => fs.readFile(
    path.join(repoPath, '.github', 'workflows', 'guard-pr-source.yml'),
    'utf8'
  ));
  assert.match(promotionGuard, /env:\s*\n\s+BASE_REF: \$\{\{ github\.base_ref \}\}\s*\n\s+HEAD_REF: \$\{\{ github\.head_ref \}\}/);
  assert.doesNotMatch(promotionGuard, /(?:base|head)="\$\{\{ github\.(?:base_ref|head_ref) \}\}"/);
});
