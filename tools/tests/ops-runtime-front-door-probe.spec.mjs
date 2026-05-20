import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeUrl,
  formatErrorSummary,
  parseArgs,
  summarizeSamples,
  targetNamesArg,
} from '../ops/probe-runtime-front-door.mjs';

test('parseArgs collects domains', () => {
  const args = parseArgs(['--domain=one.example,two.example', '--domain=three.example', '--requests=10']);

  assert.deepEqual(args.domain, ['one.example', 'two.example', 'three.example']);
  assert.equal(args.requests, '10');
});

test('buildRuntimeUrl preserves runtime query parameters', () => {
  const url = buildRuntimeUrl({
    baseUrl: 'https://api.example.com/',
    domain: 'desk.zoolandingpage.com.mx',
    pathName: '/ruta-inventada',
    lang: 'en',
  });

  assert.equal(
    url,
    'https://api.example.com/runtime-bundle?domain=desk.zoolandingpage.com.mx&path=%2Fruta-inventada&lang=en',
  );
});

test('summarizeSamples counts transport and payload failures', () => {
  const summary = summarizeSamples([
    { ok: true, payloadOk: true, status: 200, latencyMs: 10 },
    { ok: true, payloadOk: true, status: 200, latencyMs: 30 },
    { ok: false, payloadOk: null, status: null, latencyMs: 5, error: 'fetch failed | ECONNRESET' },
    { ok: true, payloadOk: false, status: 200, latencyMs: 20, error: null },
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.success, 2);
  assert.equal(summary.failure, 2);
  assert.equal(summary.statusCounts['transport-error'], 1);
  assert.equal(summary.errors['fetch failed | ECONNRESET'], 1);
  assert.equal(summary.errors['HTTP 200'], 1);
  assert.equal(summary.latencyMs.p50, 10);
  assert.equal(summary.latencyMs.p95, 30);
});

test('formatErrorSummary includes cause code when present', () => {
  const error = new TypeError('fetch failed', {
    cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
  });

  assert.equal(formatErrorSummary(error), 'TypeError: fetch failed | ECONNRESET | read ECONNRESET');
});

test('targetNamesArg supports all or one explicit target', () => {
  assert.deepEqual(targetNamesArg('all'), ['custom-domain', 'raw-api-gateway']);
  assert.deepEqual(targetNamesArg('custom-domain'), ['custom-domain']);
  assert.throws(() => targetNamesArg('unknown'), /--target must be all/);
});
