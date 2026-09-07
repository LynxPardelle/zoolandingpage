import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('SSR packaging defaults to test and never to cloud dev', () => {
  const source = readFileSync(new URL('../package-ssr-lambda.mjs', import.meta.url), 'utf8');

  assert.match(source, /process\.env\.DEPLOY_ENV \|\| 'test'/);
  assert.doesNotMatch(source, /process\.env\.DEPLOY_ENV \|\| 'dev'/);
});

test('the generated Lambda ZIP uses relative POSIX paths on every build platform', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'thn-ssr-package-'));
  const root = path.join(temporary, "author's workspace");
  const fixtures = {
    'dist/zoolandingpage/browser/index.html': '<app-root></app-root>',
    'dist/zoolandingpage/browser/assets/nested/sample.txt': 'fixture',
    'dist/zoolandingpage/server/server.mjs': 'export const reqHandler = () => {};',
    'node_modules/serverless-http/package.json': '{"name":"serverless-http"}',
  };
  for (const [file, body] of Object.entries(fixtures)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), body);
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../package-ssr-lambda.mjs', import.meta.url))], {
    cwd: root, encoding: 'utf8', env: { ...process.env, RELEASE_ID: 'local-packaging-fixture', DEPLOY_ENV: 'test' },
  });
  assert.equal(result.status, 0, `Packaging failed: ${result.stderr}`);
  const bytes = readFileSync(path.join(root, 'dist/ssr-lambda/ssr-handler.zip'));
  // Read the central directory, not filename-looking bytes inside compressed data.
  let end = bytes.length - 22;
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, 'ZIP end record is missing');
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength);
    assert.doesNotMatch(name, /\\|^\/|(?:^|\/)\.\.(?:\/|$)|^[A-Za-z]:/, 'ZIP paths must be relative and POSIX');
    entries.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(new Set(entries).size, entries.length, 'ZIP paths must be unique');
  assert.deepEqual(entries.filter(name => !name.endsWith('/')).sort(), [
    'browser/assets/nested/sample.txt', 'browser/index.html', 'index.mjs',
    'node_modules/serverless-http/package.json', 'package.json', 'server/server.mjs',
  ]);
});

test('identical SSR inputs produce identical ZIP bytes regardless of source timestamps', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thn-ssr-repeatable-'));
  const fixtures = {
    'dist/zoolandingpage/browser/index.html': '<app-root></app-root>',
    'dist/zoolandingpage/server/server.mjs': 'export const reqHandler = () => {};',
    'node_modules/serverless-http/package.json': '{"name":"serverless-http"}',
  };
  for (const [file, body] of Object.entries(fixtures)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), body);
    await utimes(path.join(root, file), new Date('2001-01-01T00:00:00Z'), new Date('2001-01-01T00:00:00Z'));
  }
  const packageArtifact = () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../package-ssr-lambda.mjs', import.meta.url))], {
      cwd: root, encoding: 'utf8', env: { ...process.env, RELEASE_ID: 'repeatable-fixture', DEPLOY_ENV: 'test' },
    });
    assert.equal(result.status, 0, result.stderr);
    return createHash('sha256').update(readFileSync(path.join(root, 'dist/ssr-lambda/ssr-handler.zip'))).digest('hex');
  };
  const first = packageArtifact();
  for (const file of Object.keys(fixtures)) {
    await utimes(path.join(root, file), new Date('2030-06-15T12:34:56Z'), new Date('2030-06-15T12:34:56Z'));
  }
  assert.equal(packageArtifact(), first, 'Source mtimes must not change an immutable SSR artifact');
});
