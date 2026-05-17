import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { discoverDraftRepos, parseArgs } from '../draft-repo-preflight.mjs';
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
  await mkdir(path.join(root, 'draft-example'), { recursive: true });
  await mkdir(path.join(root, 'not-a-draft'), { recursive: true });
  await execFileAsync('git', ['init'], { cwd: path.join(root, 'draft-example'), windowsHide: true });
  await execFileAsync('git', ['init'], { cwd: path.join(root, 'not-a-draft'), windowsHide: true });

  const repos = await discoverDraftRepos(root);

  assert.deepEqual(repos, [path.join(root, 'draft-example')]);
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
  await mkdir(path.join(root, 'ai_notes'), { recursive: true });
  await writeFile(path.join(root, 'ai_notes', 'private.json'), '{"ignore":true}', 'utf8');

  const files = await collectJsonFiles(root, 'example.com');

  assert.deepEqual(files.map(file => file.path), [
    'example.com/default/page-config.json',
    'example.com/site-config.json',
  ]);
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
});
