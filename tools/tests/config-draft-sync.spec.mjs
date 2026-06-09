import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
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
