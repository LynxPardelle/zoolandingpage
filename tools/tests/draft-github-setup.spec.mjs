import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  bootstrapFlags,
  inspectRegisteredRepo,
  preflightDraftSetups,
  repoNameForDomain,
  testAliasesFor,
} from '../draft-github-setup.mjs';

const execFileAsync = promisify(execFile);
const setupCliPath = fileURLToPath(new URL('../draft-github-setup.mjs', import.meta.url));

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, windowsHide: true });
}

test('repoNameForDomain maps domains to draft repo names', () => {
  assert.equal(repoNameForDomain('pamelabetancourt.com'), 'draft-pamelabetancourt-com');
  assert.equal(
    repoNameForDomain('pokeapi-demo.zoolandingpage.com.mx'),
    'draft-pokeapi-demo-zoolandingpage-com-mx',
  );
});

test('testAliasesFor does not create dedicated test aliases by default', () => {
  assert.deepEqual(testAliasesFor('pamelabetancourt.com', ['pamelabetancourt.zoolandingpage.com.mx']), [
  ]);
});

test('testAliasesFor keeps only explicitly configured test aliases', () => {
  assert.deepEqual(testAliasesFor('zoolandingpage.com.mx', ['test.zoolandingpage.com.mx', 'zoolandingpage.com']), [
    'test.zoolandingpage.com.mx',
  ]);
});

test('draft setup does not overwrite existing templates without explicit flags', () => {
  assert.deepEqual(bootstrapFlags({}), {
    force: false,
    forceTemplates: false,
    forceGitignore: false,
  });
  assert.deepEqual(bootstrapFlags({ 'force-templates': 'true', 'force-gitignore': 'true' }), {
    force: false,
    forceTemplates: true,
    forceGitignore: true,
  });
});

test('draft setup blocks unresolved domain-to-local-path transitions', async () => {
  const result = await inspectRegisteredRepo({
    domain: 'old.example.com',
    localPath: 'drafts/new.example.com',
    repoPath: path.resolve('drafts/new.example.com'),
  });

  assert.equal(result.repoStatus, 'domain-transition');
});

test('apply preflight reports every unsafe repo before setup can mutate any repo', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-setup-preflight-'));
  const drafts = [
    {
      domain: 'missing.example.com',
      repo: 'draft-missing-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-missing-example-com.git',
      localPath: 'drafts/missing.example.com',
      repoPath: path.join(root, 'drafts', 'missing.example.com'),
      registryRoot: root,
      defaultBaseDir: 'drafts',
    },
    {
      domain: 'old.example.com',
      repo: 'draft-new-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-new-example-com.git',
      localPath: 'drafts/new.example.com',
      repoPath: path.join(root, 'drafts', 'new.example.com'),
      registryRoot: root,
      defaultBaseDir: 'drafts',
    },
  ];

  await assert.rejects(
    preflightDraftSetups(drafts),
    /draft-missing-example-com:missing.*draft-new-example-com:domain-transition/s
  );
});

test('default dry run uses registered localPath and never creates drafts/_repos', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-github-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repoPath = path.join(root, 'drafts', 'example.com');
  const registryPath = path.join(root, 'docs', 'drafts-registry.json');
  const githubUrl = 'https://github.com/LynxPardelle/draft-example-com.git';
  await mkdir(path.dirname(registryPath), { recursive: true });
  await mkdir(repoPath, { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  await git(repoPath, ['remote', 'add', 'origin', githubUrl]);
  await writeFile(path.join(repoPath, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl,
      localPath: 'drafts/example.com',
    }],
  }), 'utf8');

  const { stdout } = await execFileAsync(
    process.execPath,
    [setupCliPath, `--registry=${registryPath}`],
    { cwd: root, windowsHide: true }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.results.length, 1);
  assert.equal(path.resolve(report.results[0].repoPath), path.resolve(repoPath));
  assert.equal(report.results[0].repoStatus, 'ready');
  assert.equal(existsSync(path.join(root, 'drafts', '_repos')), false);
});
