import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContentHubPayload,
  buildPublicSearchUrl,
  buildRuntimeBundleUrl,
  cookieValue,
  extractCreateResult,
  parseArgs,
  redact,
  slugify,
} from '../content-hub-product-readiness-smoke.mjs';

test('parseArgs reads explicit smoke options', () => {
  const args = parseArgs([
    '--base-url=https://test.zoolandingpage.com.mx',
    '--runtime-base-url=https://runtime.example.com',
    '--domain=zoositioweb.com.mx',
    '--shared-preview=false',
  ]);

  assert.equal(args['base-url'], 'https://test.zoolandingpage.com.mx');
  assert.equal(args['runtime-base-url'], 'https://runtime.example.com');
  assert.equal(args.domain, 'zoositioweb.com.mx');
  assert.equal(args['shared-preview'], 'false');
});

test('cookieValue extracts csrf without exposing other cookies', () => {
  const cookie = '__Host-zlp_session=session.secret; zlp_csrf=csrf-secret; other=value';

  assert.equal(cookieValue(cookie, 'zlp_csrf'), 'csrf-secret');
  assert.equal(cookieValue(cookie, 'missing'), '');
});

test('buildRuntimeBundleUrl preserves environment and article path', () => {
  const url = buildRuntimeBundleUrl({
    runtimeBaseUrl: 'https://runtime.example.com/Prod',
    domain: 'zoositioweb.com.mx',
    pathName: '/blog/qa/product-smoke',
    lang: 'es',
    environment: 'test',
  });

  assert.equal(
    url,
    'https://runtime.example.com/Prod/runtime-bundle?domain=zoositioweb.com.mx&path=%2Fblog%2Fqa%2Fproduct-smoke&lang=es&environment=test',
  );
});

test('buildRuntimeBundleUrl accepts the full CloudFormation ApiUrl output without duplicating path', () => {
  const url = buildRuntimeBundleUrl({
    runtimeBaseUrl: 'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle',
    domain: 'zoositioweb.com.mx',
    pathName: '/blog/qa/product-smoke',
    lang: 'es',
    environment: 'test',
  });

  assert.equal(
    url,
    'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle?domain=zoositioweb.com.mx&path=%2Fblog%2Fqa%2Fproduct-smoke&lang=es&environment=test',
  );
});

test('buildPublicSearchUrl keeps shared preview draftDomain scoped', () => {
  const url = buildPublicSearchUrl({
    baseUrl: 'https://test.zoolandingpage.com.mx/',
    domain: 'zoositioweb.com.mx',
    lang: 'es',
    query: 'QA Product Smoke',
    sharedPreview: true,
  });

  assert.equal(
    url,
    'https://test.zoolandingpage.com.mx/content-hub-search.json?draftDomain=zoositioweb.com.mx&lang=es&q=QA+Product+Smoke',
  );
});

test('buildContentHubPayload includes contentHub binding and no session material', () => {
  const payload = buildContentHubPayload({
    domain: 'zoositioweb.com.mx',
    pageId: 'admin-blog-articulos',
    operationId: 'content_hub_create_article',
    hubId: 'zoosite-main',
    kind: 'action',
    input: {
      contentHub: { action: 'createArticle' },
      articleTitle: 'Smoke',
      cookie: 'must-not-pass',
      csrf: 'must-not-pass',
    },
  });

  assert.equal(payload.actionId, 'content_hub_create_article');
  assert.equal(payload.input.contentHub.action, 'createArticle');
  assert.equal(payload.input.contentHub.hubId, 'zoosite-main');
  assert.equal(payload.input.articleTitle, 'Smoke');
  assert.equal(payload.input.cookie, undefined);
  assert.equal(payload.input.csrf, undefined);
  assert.doesNotMatch(JSON.stringify(payload), /__Host-zlp_session|zlp_csrf/);
});

test('extractCreateResult supports current content hub response shape', () => {
  assert.deepEqual(
    extractCreateResult({
      ok: true,
      data: {
        article: {
          articleId: 'art_1',
          latestRevisionId: 'rev_001',
          path: '/blog/qa/smoke',
        },
        revision: {
          revisionId: 'rev_001',
        },
      },
    }),
    {
      articleId: 'art_1',
      revisionId: 'rev_001',
      path: '/blog/qa/smoke',
    },
  );
});

test('redact removes caller-supplied session values from structured output', () => {
  const safe = redact({
    ok: false,
    error: 'HTTP 403 for __Host-zlp_session=session.secret and csrf-secret',
  }, ['__Host-zlp_session=session.secret', 'csrf-secret']);

  assert.equal(safe.error, 'HTTP 403 for [REDACTED] and [REDACTED]');
});

test('slugify keeps article URLs deterministic and safe', () => {
  assert.equal(slugify('QA Product Smoke 2026: Español!'), 'qa-product-smoke-2026-espanol');
});
