import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('config-draft-sync packs server-only draft files without page ids', async () => {
  const draftsRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-'));
  const domainRoot = path.join(draftsRoot, 'example.com');
  await mkdir(path.join(domainRoot, 'server'), { recursive: true });
  await writeFile(path.join(domainRoot, 'site-config.json'), '{"version":1}', 'utf8');
  await writeFile(path.join(domainRoot, 'draft-repo.config.json'), '{"domain":"example.com"}', 'utf8');
  await writeFile(path.join(domainRoot, 'server', 'auth-profile-registry.json'), '{"version":1,"profiles":[]}', 'utf8');
  await writeFile(path.join(domainRoot, 'server', 'integrations.json'), '{"version":1,"sources":[],"actions":[]}', 'utf8');

  const outputPath = path.join(draftsRoot, 'package.json');
  await execFileAsync(
    process.execPath,
    [
      'tools/config-draft-sync.mjs',
      'pack',
      '--domain=example.com',
      `--drafts-root=${draftsRoot}`,
      `--output=${outputPath}`,
    ],
    { cwd: path.resolve('.'), windowsHide: true }
  );

  const draftPackage = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(
    draftPackage.files.some(file => file.path === 'example.com/draft-repo.config.json'),
    false
  );
  assert.deepEqual(
    draftPackage.files
      .filter(file => file.path.includes('/server/'))
      .map(file => ({ path: file.path, kind: file.kind, pageId: file.pageId })),
    [
      {
        path: 'example.com/server/auth-profile-registry.json',
        kind: 'server-auth-profile-registry',
        pageId: undefined,
      },
      {
        path: 'example.com/server/integrations.json',
        kind: 'server-integrations',
        pageId: undefined,
      },
    ]
  );
});

test('config-draft-sync publish forwards explicit environment', async t => {
  let capturedBody = null;
  const server = http.createServer((request, response) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      raw += chunk;
    });
    request.on('end', () => {
      capturedBody = JSON.parse(raw);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, environment: capturedBody.environment }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const endpoint = `http://127.0.0.1:${server.address().port}/config-authoring`;
  await execFileAsync(
    process.execPath,
    [
      'tools/config-draft-sync.mjs',
      'publish',
      `--endpoint=${endpoint}`,
      '--domain=example.com',
      '--environment=test',
      '--version-id=version-1',
    ],
    { cwd: path.resolve('.'), windowsHide: true }
  );

  assert.equal(capturedBody.action, 'publishDraft');
  assert.equal(capturedBody.domain, 'example.com');
  assert.equal(capturedBody.environment, 'test');
  assert.equal(capturedBody.versionId, 'version-1');
});
