import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const draftSyncCliPath = path.join(repoRoot, 'tools', 'config-draft-sync.mjs');
const builtServerPath = path.join(repoRoot, 'dist', 'zoolandingpage', 'server', 'server.mjs');

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Command failed with exit code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to determine a free port.')));
        return;
      }

      const { port } = address;
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the timeout expires.
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for server readiness at ${url}`);
}

async function stopServer(child) {
  if (child.killed || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for the draft test server to stop.'));
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

test('config-draft-sync excludes local-only folders and preserves them during clean unpack', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const draftsRoot = path.join(tempRoot, 'drafts');
  const domainRoot = path.join(draftsRoot, 'fixture.example.com');
  const packagePath = path.join(tempRoot, 'fixture-package.json');

  await writeJson(path.join(domainRoot, 'site-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
  });
  await writeJson(path.join(domainRoot, 'default', 'page-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    pageId: 'default',
    rootIds: ['hero'],
    modalRootIds: [],
  });
  await writeJson(path.join(domainRoot, 'ai_notes', 'keep.json'), { keep: 'ai-notes' });
  await writeJson(path.join(domainRoot, 'findings', 'keep.json'), { keep: 'findings' });
  await writeJson(path.join(domainRoot, 'errors-reports', 'keep.json'), { keep: 'errors-reports' });

  await runCommand(process.execPath, [
    draftSyncCliPath,
    'pack',
    '--domain=fixture.example.com',
    `--drafts-root=${draftsRoot}`,
    `--output=${packagePath}`,
  ]);

  const packaged = JSON.parse(await readFile(packagePath, 'utf8'));
  const packagedPaths = packaged.files.map(entry => entry.path).sort();

  assert.deepEqual(packagedPaths, [
    'fixture.example.com/default/page-config.json',
    'fixture.example.com/site-config.json',
  ]);

  await writeJson(path.join(domainRoot, 'default', 'stale.json'), { stale: true });

  await runCommand(process.execPath, [
    draftSyncCliPath,
    'unpack',
    `--input=${packagePath}`,
    `--drafts-root=${draftsRoot}`,
    '--clean-domain=true',
  ]);

  assert.equal(existsSync(path.join(domainRoot, 'default', 'page-config.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'default', 'stale.json')), false);
  assert.equal(existsSync(path.join(domainRoot, 'ai_notes', 'keep.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'findings', 'keep.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'errors-reports', 'keep.json')), true);
});

test('built SSR server hides local-only draft folders from registry and static serving', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-server-'));

  const domainRoot = path.join(workspaceRoot, 'drafts', 'fixture.example.com');
  await writeJson(path.join(domainRoot, 'site-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
  });
  await writeJson(path.join(domainRoot, 'default', 'page-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    pageId: 'default',
    rootIds: ['hero'],
    modalRootIds: [],
  });
  await writeJson(path.join(domainRoot, 'ai_notes', 'note.json'), { hidden: true });
  await writeJson(path.join(domainRoot, 'findings', 'note.json'), { hidden: true });
  await writeJson(path.join(domainRoot, 'errors-reports', 'note.json'), { hidden: true });

  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const registryResponse = await fetch(`http://127.0.0.1:${port}/api/debug/drafts`);
  assert.equal(registryResponse.ok, true, serverOutput);
  const registryPayload = await registryResponse.json();
  assert.deepEqual(registryPayload.drafts, [{ domain: 'fixture.example.com', pageId: 'default' }]);

  const pageConfigResponse = await fetch(
    `http://127.0.0.1:${port}/drafts/fixture.example.com/default/page-config.json`
  );
  assert.equal(pageConfigResponse.status, 200, serverOutput);

  const aiNotesResponse = await fetch(`http://127.0.0.1:${port}/drafts/fixture.example.com/ai_notes/note.json`);
  assert.equal(aiNotesResponse.status, 404, serverOutput);

  const findingsResponse = await fetch(`http://127.0.0.1:${port}/drafts/fixture.example.com/findings/note.json`);
  assert.equal(findingsResponse.status, 404, serverOutput);

  const errorsReportsResponse = await fetch(
    `http://127.0.0.1:${port}/drafts/fixture.example.com/errors-reports/note.json`
  );
  assert.equal(errorsReportsResponse.status, 404, serverOutput);
});
