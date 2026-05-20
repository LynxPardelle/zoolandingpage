import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { resolve } from 'node:path';
import { test } from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const serverEntry = resolve(repoRoot, 'dist/zoolandingpage/server/server.mjs');

async function getAvailablePort() {
  const server = createNetServer();

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

async function startRuntimeApi(t, handler) {
  const server = createHttpServer(handler);

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  assert(address && typeof address === 'object');

  t.after(() => new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise());
  }));

  return `http://127.0.0.1:${address.port}`;
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

async function startProductionServer(t, extraEnv = {}) {
  const port = await getAvailablePort();
  const server = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
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

test('production SSR server does not self-redirect when proxy proto chain includes https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'http, https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect on proxy internal http', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect primary canonical hosts on proxy internal http', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server redirects public aliases to the primary canonical host', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/planes?gclid=test&utm_source=google`, {
    redirect: 'manual',
    headers: {
      Host: 'zoolandingpage.com',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'zoolandingpage.com',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get('location'),
    'https://zoolandingpage.com.mx/planes?gclid=test&utm_source=google',
  );
  assert.equal(getStderr(), '');
});

test('production SSR server prefers the server-only runtime fallback for auxiliary runtime reads', async (t) => {
  const fallbackRequests = [];
  const primaryRequests = [];
  const fallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    fallbackRequests.push(url.pathname);

    if (url.pathname !== '/Prod/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'runtime-fallback.example',
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://runtime-fallback.example',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const primaryBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    primaryRequests.push(url.pathname);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: `${fallbackBase}/Prod`,
    CONFIG_API_URL: primaryBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'runtime-fallback.example',
      'X-Forwarded-Host': 'runtime-fallback.example',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/runtime-fallback\.example\/sitemap\.xml/);
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle']);
  assert.deepEqual(primaryRequests, []);
  assert.equal(getStderr(), '');
});

test('production SSR server retries transient runtime fallback failures before custom domain', async (t) => {
  const fallbackRequests = [];
  const primaryRequests = [];
  const fallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    fallbackRequests.push(url.pathname);

    if (fallbackRequests.length === 1) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'runtime-retry.example',
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://runtime-retry.example',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const primaryBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    primaryRequests.push(url.pathname);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ siteConfig: { domain: 'primary.example' } }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: `${fallbackBase}/Prod`,
    CONFIG_API_URL: primaryBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'runtime-retry.example',
      'X-Forwarded-Host': 'runtime-retry.example',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/runtime-retry\.example\/sitemap\.xml/);
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle', '/Prod/runtime-bundle']);
  assert.deepEqual(primaryRequests, []);
  assert.equal(getStderr(), '');
});

test('production SSR server renders draft routes on aliased hosts', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/home`, {
    headers: {
      Host: 'pamelabetancourt.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'pamelabetancourt.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Pamela Betancourt/i);
  assert.doesNotMatch(body, /Cannot GET \/home/i);
  assert.equal(getStderr(), '');
});
