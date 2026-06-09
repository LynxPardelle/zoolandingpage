import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { auditRepo, matchesRules, parseArgs } from '../draft-public-safety-audit.mjs';

const execFileAsync = promisify(execFile);

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
  await writeFile(path.join(repoPath, 'deploy.txt'), 'api_key = "abcdef1234567890"\n', 'utf8');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);

  const result = await auditRepo(repoPath, { includeHistory: true });

  assert.equal(result.okToPublic, false);
  assert.equal(result.currentBlockedPaths.some(finding => finding.file === 'CVs_N_photos/private.txt'), true);
  assert.equal(result.currentSecretFindings.some(finding => finding.rule === 'generic-secret-assignment'), true);
  assert.equal(JSON.stringify(result).includes('abcdef1234567890'), false);
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
