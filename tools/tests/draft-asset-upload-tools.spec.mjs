import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildGrantRequest,
  domainSlug,
  splitList,
} from '../issue-upload-grant.mjs';
import {
  buildUploadRequest,
  contentTypeForFile,
  loadGrant,
  normalizeDomain,
  parseEnvContent,
  sanitizeAssetId,
} from '../upload-draft-asset.mjs';

test('upload helper normalizes domains, ids, and MIME types', () => {
  assert.equal(normalizeDomain('https://PamelaBetancourt.com/path'), 'pamelabetancourt.com');
  assert.equal(sanitizeAssetId(' hero principal @ 2026 '), 'hero-principal-2026');
  assert.equal(contentTypeForFile('cover.JPG'), 'image/jpeg');
  assert.equal(contentTypeForFile('cover.svg'), 'image/svg+xml');
});

test('env parser and grant loader support token files without printing token', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zlp-upload-tool-'));
  try {
    const tokenFile = path.join(tempDir, 'grant.token');
    await writeFile(tokenFile, 'secret-token\n', 'utf8');
    const parsed = parseEnvContent(`ZLP_UPLOAD_GRANT_FILE=${tokenFile}\n`);
    assert.equal(parsed.ZLP_UPLOAD_GRANT_FILE, tokenFile);
    assert.equal(await loadGrant({}, {
      ZLP_UPLOAD_GRANT: 'inline-token',
    }), 'inline-token');
    assert.equal(await loadGrant({ 'grant-file': tokenFile }, {}), 'secret-token');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('buildUploadRequest sends small images as direct base64 payloads', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zlp-upload-tool-'));
  try {
    const file = path.join(tempDir, 'hero.gif');
    await writeFile(file, Buffer.from('gif-bytes'));
    const request = await buildUploadRequest({
      domain: 'pamelabetancourt.com',
      page: 'shared',
      kind: 'images',
      id: 'hero principal',
      file,
      grant: 'grant-token',
    }, {});
    assert.equal(request.payload.domain, 'pamelabetancourt.com');
    assert.equal(request.payload.assetId, 'hero-principal');
    assert.equal(request.payload.contentType, 'image/gif');
    assert.equal(request.payload.contentLength, 9);
    assert.equal(request.payload.imageBase64, Buffer.from('gif-bytes').toString('base64'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('grant request builder uses limited defaults', () => {
  const request = buildGrantRequest({
    domain: 'PamelaBetancourt.com',
    'usage-limit': '3',
    kinds: 'images,hero-images',
  }, {
    ZLP_UPLOAD_GRANT_ISSUED_BY: 'test-admin',
  });
  assert.equal(request.action, 'issueUploadGrant');
  assert.equal(request.domain, 'pamelabetancourt.com');
  assert.equal(request.usageLimit, 3);
  assert.deepEqual(request.allowedAssetKinds, ['images', 'hero-images']);
  assert.equal(request.allowOverwrite, false);
  assert.equal(request.allowPresignedPut, false);
  assert.equal(request.issuedBy, 'test-admin');
});

test('issue helper slug and splitList are stable', () => {
  assert.equal(domainSlug('PokeAPI-Demo.zoolandingpage.com.mx'), 'pokeapi-demo-zoolandingpage-com-mx');
  assert.deepEqual(splitList('images, logos ', ['fallback']), ['images', 'logos']);
  assert.deepEqual(splitList('', ['fallback']), ['fallback']);
});
