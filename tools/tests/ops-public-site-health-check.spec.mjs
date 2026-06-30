import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import {
  checkContentHubUnauthRoute,
  checkRuntimeBundle,
  parseArgs,
  parseExpectedRuntimeDomains,
} from '../ops/public-site-health-check.mjs';

async function withRuntimeServer(payload, callback) {
  const server = createServer((req, res) => {
    if (!req.url?.startsWith('/runtime-bundle')) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('parseArgs accepts expected runtime domain mappings', () => {
  const args = parseArgs([
    '--hosts=sitiosweb.zoolandingpage.com.mx',
    '--expected-runtime-domains=sitiosweb.zoolandingpage.com.mx=zoositioweb.com.mx',
  ]);

  assert.deepEqual(
    [...args.expectedRuntimeDomains.entries()],
    [['sitiosweb.zoolandingpage.com.mx', 'zoositioweb.com.mx']],
  );
});

test('parseArgs accepts Zoosite shared-preview preflight options', () => {
  const args = parseArgs([
    '--hosts=test.zoolandingpage.com.mx',
    '--draft-domain=zoositioweb.com.mx',
    '--page-path=/blog',
    '--runtime-environment=test',
    '--expected-runtime-version-id=ver_123',
    '--expect-content-hub',
    '--check-content-hub-unauth',
  ]);

  assert.equal(args.draftDomain, 'zoositioweb.com.mx');
  assert.equal(args.pagePath, '/blog');
  assert.equal(args.runtimeEnvironment, 'test');
  assert.equal(args.expectedRuntimeVersionId, 'ver_123');
  assert.equal(args.expectContentHub, true);
  assert.equal(args.checkContentHubUnauth, true);
});

test('parseExpectedRuntimeDomains rejects malformed entries', () => {
  assert.throws(() => parseExpectedRuntimeDomains('sitiosweb.zoolandingpage.com.mx'), /host=domain/);
});

test('checkRuntimeBundle fails when runtime resolves the wrong canonical domain', async () => {
  await withRuntimeServer({
    ok: true,
    domain: 'zoolandingpage.com.mx',
    metadata: { resolvedAlias: null },
    versionId: 'wrong',
  }, async (runtimeBaseUrl) => {
    const check = await checkRuntimeBundle('sitiosweb.zoolandingpage.com.mx', {
      runtimeBaseUrl,
      runtimeFallbackUrl: '',
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      expectedRuntimeDomains: new Map([
        ['sitiosweb.zoolandingpage.com.mx', 'zoositioweb.com.mx'],
      ]),
    });

    assert.equal(check.ok, false);
    assert.equal(check.details.reason, 'runtime-bundle resolved an unexpected canonical domain');
  });
});

test('checkRuntimeBundle validates draft domain, environment, version, and content-hub route', async () => {
  await withRuntimeServer({
    ok: true,
    domain: 'zoositioweb.com.mx',
    versionId: 'ver_123',
    siteConfig: {
      runtime: {
        contentHubs: [
          { publicApiBasePath: '/features/content-hub' },
        ],
      },
    },
  }, async (runtimeBaseUrl) => {
    const check = await checkRuntimeBundle('test.zoolandingpage.com.mx', {
      runtimeBaseUrl,
      runtimeFallbackUrl: '',
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      expectedRuntimeDomains: new Map(),
      draftDomain: 'zoositioweb.com.mx',
      pagePath: '/blog',
      runtimeEnvironment: 'test',
      expectedRuntimeVersionId: 'ver_123',
      expectContentHub: true,
    });

    assert.equal(check.ok, true);
    assert.match(check.details.url, /domain=zoositioweb\.com\.mx/);
    assert.match(check.details.url, /path=%2Fblog/);
    assert.match(check.details.url, /environment=test/);
    assert.equal(check.details.versionId, 'ver_123');
    assert.deepEqual(check.details.contentHubBasePaths, ['/features/content-hub']);
  });
});

test('checkRuntimeBundle fails on an unexpected runtime version', async () => {
  await withRuntimeServer({
    ok: true,
    domain: 'zoositioweb.com.mx',
    versionId: 'old_version',
    siteConfig: {
      runtime: {
        contentHubs: [
          { publicApiBasePath: '/features/content-hub' },
        ],
      },
    },
  }, async (runtimeBaseUrl) => {
    const check = await checkRuntimeBundle('test.zoolandingpage.com.mx', {
      runtimeBaseUrl,
      runtimeFallbackUrl: '',
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      expectedRuntimeDomains: new Map(),
      draftDomain: 'zoositioweb.com.mx',
      pagePath: '/blog',
      runtimeEnvironment: 'test',
      expectedRuntimeVersionId: 'ver_123',
      expectContentHub: true,
    });

    assert.equal(check.ok, false);
    assert.equal(check.details.reason, 'runtime-bundle versionId did not match expected value');
  });
});

test('checkContentHubUnauthRoute proves content-hub route denies missing session without secrets', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: false, error: 'auth_required' }), { status: 401 });
  };

  try {
    const check = await checkContentHubUnauthRoute('test.zoolandingpage.com.mx', {
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      draftDomain: 'zoositioweb.com.mx',
    });

    assert.equal(check.ok, true);
    assert.equal(check.details.status, 401);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://test.zoolandingpage.com.mx/features/content-hub/read');
    assert.equal(requests[0].init.headers.Cookie, undefined);
    assert.equal(JSON.parse(requests[0].init.body).domain, 'zoositioweb.com.mx');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('checkRuntimeBundle passes when runtime resolves expected domain and alias', async () => {
  await withRuntimeServer({
    ok: true,
    domain: 'zoositioweb.com.mx',
    metadata: { resolvedAlias: 'sitiosweb.zoolandingpage.com.mx' },
    versionId: 'correct',
  }, async (runtimeBaseUrl) => {
    const check = await checkRuntimeBundle('sitiosweb.zoolandingpage.com.mx', {
      runtimeBaseUrl,
      runtimeFallbackUrl: '',
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      expectedRuntimeDomains: new Map([
        ['sitiosweb.zoolandingpage.com.mx', 'zoositioweb.com.mx'],
      ]),
    });

    assert.equal(check.ok, true);
    assert.equal(check.details.domain, 'zoositioweb.com.mx');
    assert.equal(check.details.resolvedAlias, 'sitiosweb.zoolandingpage.com.mx');
  });
});

test('checkRuntimeBundle fails when expected alias resolution is missing', async () => {
  await withRuntimeServer({
    ok: true,
    domain: 'zoositioweb.com.mx',
    metadata: { resolvedAlias: null },
    versionId: 'missing-alias',
  }, async (runtimeBaseUrl) => {
    const check = await checkRuntimeBundle('sitiosweb.zoolandingpage.com.mx', {
      runtimeBaseUrl,
      runtimeFallbackUrl: '',
      timeoutMs: 1000,
      retryAttempts: 1,
      retryDelayMs: 0,
      expectedRuntimeDomains: new Map([
        ['sitiosweb.zoolandingpage.com.mx', 'zoositioweb.com.mx'],
      ]),
    });

    assert.equal(check.ok, false);
    assert.equal(check.details.reason, 'runtime-bundle did not report the expected resolved alias');
  });
});
