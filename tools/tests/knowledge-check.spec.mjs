import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runKnowledgeCheck } from '../knowledge-check.mjs';

async function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function createHealthyFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-knowledge-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  await write(root, 'AGENTS.md', '# Agent router\n\nStart at [docs](./docs/README.md).\n');
  await write(root, 'Codex.md', '# Compatibility only\n');
  await write(
    root,
    'docs/README.md',
    '# Docs\n\nUse the [repository map](./repository-map.md) and [guide](./guide.md).\n'
  );
  await write(root, 'docs/guide.md', '# Guide\n');
  await write(
    root,
    'docs/repository-map.md',
    '# Map\n\nDrafts: [registry](./drafts-registry.json).\n'
  );
  await write(root, 'docs/drafts-registry.json', JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
      localPath: 'drafts/example.com',
    }],
  }));

  return root;
}

test('knowledge check accepts a small routed knowledge surface', async t => {
  const rootDir = await createHealthyFixture(t);
  const trackedFiles = [
    'AGENTS.md',
    'Codex.md',
    'docs/README.md',
    'docs/guide.md',
    'docs/repository-map.md',
    'docs/drafts-registry.json',
  ];

  const report = await runKnowledgeCheck({ rootDir, trackedFiles });

  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.inventory.secretScanning, 'not-verifiable-from-files');
});

test('knowledge check reports context, routing, and local-evidence regressions', async t => {
  const rootDir = await createHealthyFixture(t);
  await write(rootDir, 'AGENTS.md', `# Router\n${'x'.repeat(8 * 1024)}\n- 2026-07-11 old work\n`);
  await write(rootDir, 'Codex.md', `# Memory\n${'x'.repeat(4 * 1024)}\n- 2026-07-10 history\n`);
  await write(rootDir, 'docs/guide.md', 'Read Codex.md first.\nSee [.superpowers](../.superpowers/evidence.md).\n');
  await write(rootDir, 'docs/README.md', '# Docs\n\n[missing](./missing.md)\n');
  await write(rootDir, 'tools/example.mjs', "const root = 'drafts/_repos';\n");
  await write(rootDir, '.superpowers/spec.md', '# must stay untracked\n');

  const trackedFiles = [
    'AGENTS.md',
    'Codex.md',
    'docs/README.md',
    'docs/guide.md',
    'docs/repository-map.md',
    'docs/drafts-registry.json',
    'tools/example.mjs',
    '.superpowers/spec.md',
  ];

  const report = await runKnowledgeCheck({ rootDir, trackedFiles });
  const codes = [...report.errors, ...report.warnings].map(finding => finding.code);

  assert.ok(codes.includes('entrypoint-size'));
  assert.ok(codes.includes('entrypoint-history'));
  assert.ok(codes.includes('mandatory-codex-read'));
  assert.ok(codes.includes('broken-router-link'));
  assert.ok(codes.includes('tracked-local-evidence'));
  assert.ok(codes.includes('committed-local-evidence-link'));
  assert.ok(codes.includes('stale-draft-repo-root'));
});

test('knowledge check requires the repository map to route to the draft registry', async t => {
  const rootDir = await createHealthyFixture(t);
  await write(rootDir, 'docs/repository-map.md', '# Map without registry\n');

  const report = await runKnowledgeCheck({
    rootDir,
    trackedFiles: [
      'AGENTS.md',
      'Codex.md',
      'docs/README.md',
      'docs/guide.md',
      'docs/repository-map.md',
      'docs/drafts-registry.json',
    ],
  });

  assert.ok(report.errors.some(finding => finding.code === 'missing-registry-route'));
});

test('knowledge check rejects a required router that exists but is not tracked', async t => {
  const rootDir = await createHealthyFixture(t);

  const report = await runKnowledgeCheck({
    rootDir,
    trackedFiles: [
      'AGENTS.md',
      'Codex.md',
      'docs/README.md',
      'docs/guide.md',
      'docs/drafts-registry.json',
    ],
  });

  assert.ok(report.errors.some(finding => (
    finding.code === 'untracked-required-file'
      && finding.file === 'docs/repository-map.md'
  )));
});

test('knowledge check detects a split drafts/_repos default expression', async t => {
  const rootDir = await createHealthyFixture(t);
  await write(rootDir, 'tools/setup.mjs', "const root = path.resolve('drafts', '_repos');\n");

  const report = await runKnowledgeCheck({
    rootDir,
    trackedFiles: [
      'AGENTS.md',
      'Codex.md',
      'docs/README.md',
      'docs/guide.md',
      'docs/repository-map.md',
      'docs/drafts-registry.json',
      'tools/setup.mjs',
    ],
  });

  assert.ok(report.errors.some(finding => finding.code === 'stale-draft-repo-root'));
});

test('knowledge check allows its rule definitions and regression fixtures to name blocked patterns', async t => {
  const rootDir = await createHealthyFixture(t);
  await write(
    rootDir,
    'tools/tests/setup.spec.mjs',
    "assert.equal(existsSync('drafts/_repos'), false); // Read Codex.md; [.superpowers](../../.superpowers/evidence.md)\n"
  );
  await write(rootDir, 'tools/knowledge-check.mjs', "const retired = 'drafts/_repos';\n");

  const report = await runKnowledgeCheck({
    rootDir,
    trackedFiles: [
      'AGENTS.md',
      'Codex.md',
      'docs/README.md',
      'docs/guide.md',
      'docs/repository-map.md',
      'docs/drafts-registry.json',
      'tools/knowledge-check.mjs',
      'tools/tests/setup.spec.mjs',
    ],
  });

  for (const code of ['stale-draft-repo-root', 'mandatory-codex-read', 'committed-local-evidence-link']) {
    assert.equal(report.errors.some(finding => finding.code === code), false);
  }
});

test('knowledge check reports an invalid or escaping draft registry', async t => {
  const rootDir = await createHealthyFixture(t);
  await write(rootDir, 'docs/drafts-registry.json', JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
      localPath: '../outside',
    }],
  }));

  const report = await runKnowledgeCheck({
    rootDir,
    trackedFiles: [
      'AGENTS.md',
      'Codex.md',
      'docs/README.md',
      'docs/guide.md',
      'docs/repository-map.md',
      'docs/drafts-registry.json',
    ],
  });

  assert.ok(report.errors.some(finding => finding.code === 'invalid-draft-registry'));
});
