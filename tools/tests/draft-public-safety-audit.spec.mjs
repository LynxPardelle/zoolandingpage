import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { auditRepo, matchesRules, parseArgs } from '../draft-public-safety-audit.mjs';

const execFileAsync = promisify(execFile);
const auditCliPath = fileURLToPath(new URL('../draft-public-safety-audit.mjs', import.meta.url));
const templateRoot = fileURLToPath(new URL('../templates/draft-repo/', import.meta.url));

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, windowsHide: true });
}

test('parseArgs accepts repeated repo flags and history flag', () => {
  const args = parseArgs(['--repo=one,two', '--repo=three', '--history=false']);

  assert.deepEqual(args.repo, ['one', 'two', 'three']);
  assert.equal(args.history, 'false');
});

test('matchesRules flags local-only and credential paths', () => {
  assert.deepEqual(matchesRules('ai_notes/private.md', [{ id: 'local', regex: /(^|[/\\])ai_notes([/\\]|$)/i }]), ['local']);
});

test('auditRepo blocks tracked local-only paths and secret assignments without echoing values', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-public-audit-'));
  const repoPath = path.join(root, 'draft-example-com');
  await mkdir(path.join(repoPath, 'CVs_N_photos'), { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  await writeFile(path.join(repoPath, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  await writeFile(path.join(repoPath, 'CVs_N_photos', 'private.txt'), 'private source\n', 'utf8');
  await writeFile(path.join(repoPath, 'deploy.txt'), 'api_key = "abcdef1234567890"\n', 'utf8'); // gitleaks:allow -- intentional scanner fixture
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);

  const result = await auditRepo(repoPath, { includeHistory: true });

  assert.equal(result.okToPublic, false);
  assert.equal(result.currentBlockedPaths.some(finding => finding.file === 'CVs_N_photos/private.txt'), true);
  assert.equal(result.currentSecretFindings.some(finding => finding.rule === 'generic-secret-assignment'), true);
  assert.equal(JSON.stringify(result).includes('abcdef1234567890'), false);
});

test('template security helpers do not self-trigger while literal secrets remain blocking', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-public-audit-template-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repoPath = path.join(root, 'draft-example-com');
  await mkdir(path.join(repoPath, 'tools', 'lib'), { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  await copyFile(
    path.join(templateRoot, 'tools', 'lib', 'sensitive-value-patterns.mjs'),
    path.join(repoPath, 'tools', 'lib', 'sensitive-value-patterns.mjs'),
  );
  await copyFile(
    path.join(templateRoot, 'tools', 'verify-promotion-commit.mjs'),
    path.join(repoPath, 'tools', 'verify-promotion-commit.mjs'),
  );
  await writeFile(
    path.join(repoPath, 'unsafe-fixture.mjs'),
    "export const config = { token: 'synthetic-placeholder-value' };\n", // gitleaks:allow -- intentional scanner fixture
    'utf8',
  );
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed scanner fixtures']);

  const result = await auditRepo(repoPath, { includeHistory: true });
  const currentGeneric = result.currentSecretFindings.filter(finding => finding.rule === 'generic-secret-assignment');
  const historyGeneric = result.historySecretFindings.filter(finding => finding.rule === 'generic-secret-assignment');

  assert.deepEqual(currentGeneric.map(finding => finding.file), ['unsafe-fixture.mjs']);
  assert.deepEqual(historyGeneric.map(finding => finding.file), ['unsafe-fixture.mjs']);
  assert.equal(result.okToPublic, false);
});

test('auditRepo scopes status and history when auditing an in-tree draft path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-in-tree-public-audit-'));
  const draftPath = path.join(root, 'drafts', 'example.com');
  await mkdir(path.join(root, 'logs'), { recursive: true });
  await mkdir(draftPath, { recursive: true });
  await git(root, ['init']);
  await git(root, ['config', 'user.email', 'test@example.com']);
  await git(root, ['config', 'user.name', 'Test User']);

  await writeFile(path.join(root, 'logs', 'old.log'), 'local-only root history\n', 'utf8');
  await git(root, ['add', 'logs/old.log']);
  await git(root, ['commit', '-m', 'root local history outside draft']);

  await writeFile(path.join(draftPath, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  await git(root, ['add', 'drafts/example.com/site-config.json']);
  await git(root, ['commit', '-m', 'add in-tree draft']);

  await writeFile(path.join(root, 'README.md'), 'dirty outside draft\n', 'utf8');

  const result = await auditRepo(draftPath, { includeHistory: true });

  assert.equal(result.status, 'clean');
  assert.equal(result.okToPublic, true);
  assert.deepEqual(result.currentBlockedPaths, []);
  assert.deepEqual(result.historyBlockedPaths, []);
  assert.deepEqual(result.currentSecretFindings, []);
  assert.deepEqual(result.historySecretFindings, []);
});

test('default CLI audits canonical localPath entries from the draft registry', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-public-audit-registry-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repoPath = path.join(root, 'drafts', 'example.com');
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(repoPath, { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  await git(repoPath, ['remote', 'add', 'origin', 'https://github.com/LynxPardelle/draft-example-com.git']);
  await writeFile(path.join(repoPath, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);
  await writeFile(
    path.join(root, 'docs', 'drafts-registry.json'),
    JSON.stringify({
      version: 1,
      owner: 'LynxPardelle',
      defaultBaseDir: 'drafts',
      drafts: [{
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
        localPath: 'drafts/example.com',
      }],
    }),
    'utf8'
  );

  const { stdout } = await execFileAsync(
    process.execPath,
    [auditCliPath, '--history=false', '--summary=true'],
    { cwd: root, windowsHide: true }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.repoCount, 1);
  assert.equal(report.results[0].repo, 'draft-example-com');
  assert.equal(report.results[0].domain, 'example.com');
  assert.equal(report.results[0].repoPath, repoPath);
});

test('registry audit fails closed with identifiable remote mismatch and missing repo results', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-public-audit-mismatch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const mismatchPath = path.join(root, 'drafts', 'mismatch.example.com');
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(mismatchPath, { recursive: true });
  await git(mismatchPath, ['init']);
  await git(mismatchPath, ['config', 'user.email', 'test@example.com']);
  await git(mismatchPath, ['config', 'user.name', 'Test User']);
  await git(mismatchPath, ['remote', 'add', 'origin', 'https://github.com/LynxPardelle/wrong-repo.git']);
  await writeFile(path.join(mismatchPath, 'site-config.json'), '{"domain":"mismatch.example.com"}\n', 'utf8');
  await git(mismatchPath, ['add', '.']);
  await git(mismatchPath, ['commit', '-m', 'seed']);
  await writeFile(
    path.join(root, 'docs', 'drafts-registry.json'),
    JSON.stringify({
      version: 1,
      owner: 'LynxPardelle',
      defaultBaseDir: 'drafts',
      drafts: [
        {
          domain: 'mismatch.example.com',
          repo: 'draft-mismatch-example-com',
          githubUrl: 'https://github.com/LynxPardelle/draft-mismatch-example-com.git',
          localPath: 'drafts/mismatch.example.com',
        },
        {
          domain: 'missing.example.com',
          repo: 'draft-missing-example-com',
          githubUrl: 'https://github.com/LynxPardelle/draft-missing-example-com.git',
          localPath: 'drafts/missing.example.com',
        },
      ],
    }),
    'utf8'
  );

  let stdout = '';
  await assert.rejects(async () => {
    try {
      await execFileAsync(
        process.execPath,
        [auditCliPath, '--history=false', '--summary=true'],
        { cwd: root, windowsHide: true }
      );
    } catch (error) {
      stdout = error.stdout;
      throw error;
    }
  });
  const report = JSON.parse(stdout);

  assert.equal(report.ok, false);
  assert.equal(report.blockingRepoCount, 2);
  assert.deepEqual(
    report.results.map(result => ({
      domain: result.domain,
      repo: result.repo,
      repoPath: result.repoPath,
      status: result.status,
      okToPublic: result.okToPublic,
    })),
    [
      {
        domain: 'mismatch.example.com',
        repo: 'draft-mismatch-example-com',
        repoPath: mismatchPath,
        status: 'remote-mismatch',
        okToPublic: false,
      },
      {
        domain: 'missing.example.com',
        repo: 'draft-missing-example-com',
        repoPath: path.join(root, 'drafts', 'missing.example.com'),
        status: 'missing',
        okToPublic: false,
      },
    ]
  );
});

test('registry audit reports an unregistered canonical draft directory as blocking', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-public-audit-unregistered-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const registeredPath = path.join(root, 'drafts', 'registered.example.com');
  const unregisteredPath = path.join(root, 'drafts', 'unregistered.example.com');
  await mkdir(path.join(root, 'docs'), { recursive: true });
  for (const [repoPath, remote] of [
    [registeredPath, 'https://github.com/LynxPardelle/draft-registered-example-com.git'],
    [unregisteredPath, 'https://github.com/LynxPardelle/draft-unregistered-example-com.git'],
  ]) {
    await mkdir(repoPath, { recursive: true });
    await git(repoPath, ['init']);
    await git(repoPath, ['config', 'user.email', 'test@example.com']);
    await git(repoPath, ['config', 'user.name', 'Test User']);
    await git(repoPath, ['remote', 'add', 'origin', remote]);
    await writeFile(path.join(repoPath, 'site-config.json'), '{}\n', 'utf8');
    await git(repoPath, ['add', '.']);
    await git(repoPath, ['commit', '-m', 'seed']);
  }
  await writeFile(path.join(root, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'registered.example.com',
      repo: 'draft-registered-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-registered-example-com.git',
      localPath: 'drafts/registered.example.com',
    }],
  }), 'utf8');

  let stdout = '';
  await assert.rejects(async () => {
    try {
      await execFileAsync(
        process.execPath,
        [auditCliPath, '--history=false', '--summary=true'],
        { cwd: root, windowsHide: true }
      );
    } catch (error) {
      stdout = error.stdout;
      throw error;
    }
  });
  const report = JSON.parse(stdout);
  const gap = report.results.find(result => result.repoPath === unregisteredPath);

  assert.equal(report.blockingRepoCount, 1);
  assert.equal(gap.status, 'unregistered');
  assert.equal(gap.okToPublic, false);
});
