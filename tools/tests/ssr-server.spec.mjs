import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { test } from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const serverEntry = resolve(repoRoot, 'dist/zoolandingpage/server/server.mjs');

async function getAvailablePort() {
  const server = createServer();

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise());
  });

  assert(address && typeof address === 'object');
  return address.port;
}

async function waitForOk(url) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function startProductionServer(t) {
  const port = await getAvailablePort();
  const server = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.setEncoding('utf8');
  server.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  t.after(() => {
    if (!server.killed) {
      server.kill();
    }
  });

  await waitForOk(`http://127.0.0.1:${port}/health`);

  return {
    port,
    getStderr: () => stderr,
  };
}

test('production SSR server exposes a lightweight health endpoint', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await waitForOk(`http://127.0.0.1:${port}/health`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/plain\b/);
  assert.equal(body, 'ok\n');
  assert.equal(getStderr(), '');
});

test('production SSR server renders behind Traefik forwarded headers', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<title>[^<]+<\/title>/i);
  assert.match(body, /<main[\s>]/i);
  assert.doesNotMatch(getStderr(), /trustProxyHeaders/i);
});
