import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import {
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
