import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
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

test('config-draft-sync pull retries through a fallback endpoint after a reset primary connection', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-fallback-'));
  const draftsRoot = path.join(tempRoot, 'drafts');
  const primaryPort = await getFreePort();
  const fallbackPort = await getFreePort();

  const primaryServer = http.createServer((req, _res) => {
    req.socket.destroy();
  });
  await new Promise((resolve, reject) => {
    primaryServer.once('error', reject);
    primaryServer.listen(primaryPort, '127.0.0.1', resolve);
  });

  const fallbackServer = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(payload.action, 'getSite');
    assert.equal(payload.domain, 'fixture.example.com');
    assert.equal(payload.stage, 'published');

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        version: 1,
        domain: 'fixture.example.com',
        stage: 'published',
        files: [
          {
            path: 'fixture.example.com/site-config.json',
            kind: 'site-config',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              defaultPageId: 'default',
              routes: [{ path: '/', pageId: 'default' }],
              site: {
                appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
                theme: { defaultMode: 'light', palettes: {} },
                i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
              },
            },
          },
          {
            path: 'fixture.example.com/default/page-config.json',
            kind: 'page-config',
            pageId: 'default',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              pageId: 'default',
              rootIds: ['hero'],
              modalRootIds: [],
            },
          },
        ],
      })
    );
  });
  await new Promise((resolve, reject) => {
    fallbackServer.once('error', reject);
    fallbackServer.listen(fallbackPort, '127.0.0.1', resolve);
  });

  t.after(async () => {
    await new Promise((resolve, reject) => primaryServer.close(error => (error ? reject(error) : resolve())));
    await new Promise((resolve, reject) => fallbackServer.close(error => (error ? reject(error) : resolve())));
    await rm(tempRoot, { recursive: true, force: true });
  });

  const result = await runCommand(process.execPath, [
    draftSyncCliPath,
    'pull',
    '--domain=fixture.example.com',
    '--stage=published',
    `--drafts-root=${draftsRoot}`,
    `--endpoint=http://127.0.0.1:${primaryPort}/config-authoring`,
    `--fallback-endpoint=http://127.0.0.1:${fallbackPort}/config-authoring`,
  ]);

  assert.match(result.stdout, /Pulled 2 files for fixture\.example\.com \(published\)/);
  assert.match(result.stderr, /Retrying through fallback endpoint/);
  assert.equal(existsSync(path.join(draftsRoot, 'fixture.example.com', 'site-config.json')), true);
  assert.equal(existsSync(path.join(draftsRoot, 'fixture.example.com', 'default', 'page-config.json')), true);
});

test('config-draft-sync pull retries a transient fallback failure and logs action/domain context', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-fallback-retry-'));
  const draftsRoot = path.join(tempRoot, 'drafts');
  const primaryPort = await getFreePort();
  const fallbackPort = await getFreePort();
  let fallbackRequests = 0;

  const primaryServer = http.createServer((req, _res) => {
    req.socket.destroy();
  });
  await new Promise((resolve, reject) => {
    primaryServer.once('error', reject);
    primaryServer.listen(primaryPort, '127.0.0.1', resolve);
  });

  const fallbackServer = http.createServer(async (req, res) => {
    fallbackRequests += 1;

    if (fallbackRequests === 1) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'temporary authoring outage' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(payload.action, 'getSite');
    assert.equal(payload.domain, 'fixture.example.com');
    assert.equal(payload.stage, 'published');

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        version: 1,
        domain: 'fixture.example.com',
        stage: 'published',
        files: [
          {
            path: 'fixture.example.com/site-config.json',
            kind: 'site-config',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              defaultPageId: 'default',
              routes: [{ path: '/', pageId: 'default' }],
              site: {
                appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
                theme: { defaultMode: 'light', palettes: {} },
                i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
              },
            },
          },
        ],
      })
    );
  });
  await new Promise((resolve, reject) => {
    fallbackServer.once('error', reject);
    fallbackServer.listen(fallbackPort, '127.0.0.1', resolve);
  });

  t.after(async () => {
    await new Promise((resolve, reject) => primaryServer.close(error => (error ? reject(error) : resolve())));
    await new Promise((resolve, reject) => fallbackServer.close(error => (error ? reject(error) : resolve())));
    await rm(tempRoot, { recursive: true, force: true });
  });

  const result = await runCommand(process.execPath, [
    draftSyncCliPath,
    'pull',
    '--domain=fixture.example.com',
    '--stage=published',
    `--drafts-root=${draftsRoot}`,
    `--endpoint=http://127.0.0.1:${primaryPort}/config-authoring`,
    `--fallback-endpoint=http://127.0.0.1:${fallbackPort}/config-authoring`,
    '--retry-attempts=2',
    '--retry-delay-ms=1',
  ]);

  assert.equal(fallbackRequests, 2);
  assert.match(result.stdout, /Pulled 1 files for fixture\.example\.com \(published\)/);
  assert.match(result.stderr, /action=getSite/);
  assert.match(result.stderr, /domain=fixture\.example\.com/);
  assert.match(result.stderr, /Retrying attempt 2\/2/);
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

  const robotsResponse = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      'x-forwarded-host': 'fixture.example.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(robotsResponse.status, 200, serverOutput);
  const robotsText = await robotsResponse.text();
  assert.match(robotsText, /Sitemap: https:\/\/fixture\.example\.com\/sitemap\.xml/);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, {
    headers: {
      'x-forwarded-host': 'fixture.example.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/fixture\.example\.com\/<\/loc>/);
});

test('built SSR server can derive sitemap routes from the runtime bundle when local drafts are missing', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const apiPort = await getFreePort();
  const apiServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        version: 1,
        domain: 'runtime-only.example.com',
        pageId: 'default',
        sourceStage: 'published',
        siteConfig: {
          version: 1,
          domain: 'runtime-only.example.com',
          defaultPageId: 'default',
          routes: [
            { path: '/', pageId: 'default' },
            { path: '/contact', pageId: 'contact' },
          ],
          site: {
            seo: {
              canonicalOrigin: 'https://runtime-only.example.com',
            },
          },
        },
        pageConfig: {
          version: 1,
          domain: 'runtime-only.example.com',
          pageId: 'default',
          rootIds: ['hero'],
        },
        components: {
          version: 1,
          domain: 'runtime-only.example.com',
          pageId: 'default',
          components: [],
        },
      })
    );
  });
  await new Promise((resolve, reject) => {
    apiServer.once('error', reject);
    apiServer.listen(apiPort, '127.0.0.1', resolve);
  });

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-runtime-sitemap-'));
  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
      CONFIG_API_URL: `http://127.0.0.1:${apiPort}`,
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
    await new Promise((resolve, reject) => apiServer.close(error => (error ? reject(error) : resolve())));
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, {
    headers: {
      'x-forwarded-host': 'runtime-only.example.com',
      'x-forwarded-proto': 'https',
    },
  });

  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/runtime-only\.example\.com\/<\/loc>/);
  assert.match(sitemapXml, /<loc>https:\/\/runtime-only\.example\.com\/contact<\/loc>/);
});
