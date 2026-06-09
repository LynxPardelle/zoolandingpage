import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildLocalDraftPackage, compareDraftPackages } from '../draft-upload-status.mjs';

test('compareDraftPackages treats equivalent JSON content as uploaded', () => {
  const localPackage = {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [
      {
        path: 'example.com/site-config.json',
        kind: 'site-config',
        content: { version: 1, domain: 'example.com', site: { b: 2, a: 1 } },
      },
    ],
  };
  const remotePackage = {
    versionId: '20260515T000000Z-test',
    version: 1,
    domain: 'example.com',
    stage: 'published',
    files: [
      {
        path: 'example.com/site-config.json',
        kind: 'site-config',
        content: { site: { a: 1, b: 2 }, domain: 'example.com', version: 1 },
      },
    ],
  };

  const result = compareDraftPackages({ domain: 'example.com', localPackage, remotePackage });

  assert.equal(result.status, 'uploaded');
  assert.equal(result.remoteVersionId, '20260515T000000Z-test');
  assert.equal(result.summary.totalLocalFiles, 1);
  assert.equal(result.summary.changedFiles, 0);
  assert.deepEqual(result.files.localOnly, []);
  assert.deepEqual(result.files.remoteOnly, []);
});

test('compareDraftPackages reports local files that still need upload', () => {
  const localPackage = {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [
      {
        path: 'example.com/site-config.json',
        kind: 'site-config',
        content: { version: 1, domain: 'example.com', title: 'New title' },
      },
      {
        path: 'example.com/default/components.json',
        kind: 'page-components',
        pageId: 'default',
        content: { version: 1, components: [{ id: 'hero' }] },
      },
    ],
  };
  const remotePackage = {
    version: 1,
    domain: 'example.com',
    stage: 'published',
    files: [
      {
        path: 'example.com/site-config.json',
        kind: 'site-config',
        content: { version: 1, domain: 'example.com', title: 'Old title' },
      },
      {
        path: 'example.com/old/page-config.json',
        kind: 'page-config',
        pageId: 'old',
        content: { version: 1, pageId: 'old' },
      },
    ],
  };

  const result = compareDraftPackages({ domain: 'example.com', localPackage, remotePackage });

  assert.equal(result.status, 'needs-upload');
  assert.equal(result.summary.totalLocalFiles, 2);
  assert.equal(result.summary.changedFiles, 1);
  assert.equal(result.summary.localOnlyFiles, 1);
  assert.equal(result.summary.remoteOnlyFiles, 1);
  assert.deepEqual(result.files.changed, ['example.com/site-config.json']);
  assert.deepEqual(result.files.localOnly, ['example.com/default/components.json']);
  assert.deepEqual(result.files.remoteOnly, ['example.com/old/page-config.json']);
});

test('compareDraftPackages marks missing remote package as not uploaded', () => {
  const localPackage = {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [
      {
        path: 'example.com/site-config.json',
        kind: 'site-config',
        content: { version: 1, domain: 'example.com' },
      },
    ],
  };

  const result = compareDraftPackages({ domain: 'example.com', localPackage, remotePackage: null });

  assert.equal(result.status, 'not-uploaded');
  assert.equal(result.remoteHash, null);
  assert.equal(result.summary.localOnlyFiles, 1);
  assert.deepEqual(result.files.localOnly, ['example.com/site-config.json']);
});

test('buildLocalDraftPackage ignores local context folders and infers package metadata', async () => {
  const draftsRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-upload-status-'));
  const domainRoot = path.join(draftsRoot, 'example.com');
  await mkdir(path.join(domainRoot, 'default', 'i18n'), { recursive: true });
  await mkdir(path.join(domainRoot, 'server'), { recursive: true });
  await mkdir(path.join(domainRoot, 'ai_notes'), { recursive: true });
  await mkdir(path.join(domainRoot, 'findings'), { recursive: true });
  await writeFile(
    path.join(domainRoot, 'site-config.json'),
    JSON.stringify({ version: 1, domain: 'example.com' }),
    'utf8'
  );
  await writeFile(
    path.join(domainRoot, 'default', 'page-config.json'),
    JSON.stringify({ version: 1, domain: 'example.com', pageId: 'default' }),
    'utf8'
  );
  await writeFile(
    path.join(domainRoot, 'default', 'i18n', 'es.json'),
    JSON.stringify({ version: 1, hello: 'Hola' }),
    'utf8'
  );
  await writeFile(
    path.join(domainRoot, 'server', 'auth-profile-registry.json'),
    JSON.stringify({ version: 1, profiles: [] }),
    'utf8'
  );
  await writeFile(
    path.join(domainRoot, 'server', 'integrations.json'),
    JSON.stringify({ version: 1, sources: [], actions: [] }),
    'utf8'
  );
  await writeFile(path.join(domainRoot, 'ai_notes', 'private.md'), 'local only', 'utf8');
  await writeFile(path.join(domainRoot, 'findings', 'research.json'), '{"ignore":true}', 'utf8');

  const draftPackage = await buildLocalDraftPackage({ domain: 'example.com', draftsRoot });

  assert.deepEqual(
    draftPackage.files.map(file => file.path),
    [
      'example.com/default/i18n/es.json',
      'example.com/default/page-config.json',
      'example.com/server/auth-profile-registry.json',
      'example.com/server/integrations.json',
      'example.com/site-config.json',
    ]
  );
  assert.equal(draftPackage.files[0].kind, 'i18n');
  assert.equal(draftPackage.files[0].pageId, 'default');
  assert.equal(draftPackage.files[0].lang, 'es');
  assert.equal(draftPackage.files[1].kind, 'page-config');
  assert.equal(draftPackage.files[2].kind, 'server-auth-profile-registry');
  assert.equal(draftPackage.files[3].kind, 'server-integrations');
  assert.equal(draftPackage.files[4].kind, 'site-config');
});
