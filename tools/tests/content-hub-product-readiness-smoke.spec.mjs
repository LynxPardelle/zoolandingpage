import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContentHubPayload,
  buildPublicArticleUrl,
  buildPublicSearchUrl,
  buildRuntimeBundleUrl,
  cookieValue,
  extractCreateResult,
  parseArgs,
  redact,
  runSmoke,
  safeSmokeErrorMessage,
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
    runtimeBaseUrl: 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle',
    domain: 'zoositioweb.com.mx',
    pathName: '/blog/qa/product-smoke',
    lang: 'es',
    environment: 'test',
  });

  assert.equal(
    url,
    'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle?domain=zoositioweb.com.mx&path=%2Fblog%2Fqa%2Fproduct-smoke&lang=es&environment=test',
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

test('buildPublicArticleUrl preserves shared preview draft context', () => {
  const url = buildPublicArticleUrl({
    baseUrl: 'https://test.zoolandingpage.com.mx/',
    domain: 'zoositioweb.com.mx',
    pathName: '/blog/qa/product-smoke',
    lang: 'es',
    sharedPreview: true,
  });

  assert.equal(
    url,
    'https://test.zoolandingpage.com.mx/blog/qa/product-smoke?draftDomain=zoositioweb.com.mx&lang=es',
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

test('safeSmokeErrorMessage hides raw backend identity errors', () => {
  const message = safeSmokeErrorMessage('Invalid id: tableName=zoolanding-content payload secret-value', 400);

  assert.match(message, /^HTTP 400:/);
  assert.match(message, /could not identify the target article or revision/);
  assert.doesNotMatch(message, /Invalid id|tableName|secret-value/i);
});

test('safeSmokeErrorMessage keeps service failures actionable without raw payloads', () => {
  const message = safeSmokeErrorMessage('upstream timeout from https://private.internal/runtime-bundle', 503);

  assert.match(message, /^HTTP 503:/);
  assert.match(message, /deployed content service/);
  assert.doesNotMatch(message, /private\.internal|runtime-bundle/i);
});

test('slugify keeps article URLs deterministic and safe', () => {
  assert.equal(slugify('QA Product Smoke 2026: Español!'), 'qa-product-smoke-2026-espanol');
});

test('runSmoke fails when preview does not reflect the updated revision', async () => {
  const originalFetch = globalThis.fetch;
  const now = new Date('2026-06-30T04:00:00.000Z');
  const path = '/blog/qa/qa-product-smoke-20260630040000';

  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (parsed.pathname.endsWith('/features/content-hub/action')) {
      const action = body?.input?.contentHub?.action;
      if (action === 'createArticle') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            article: { articleId: 'art_smoke', latestRevisionId: 'rev_smoke', path },
            revision: { revisionId: 'rev_smoke' },
          },
        }), { status: 200 });
      }
      if (action === 'updatePackage') {
        return new Response(JSON.stringify({
          ok: true,
          data: { revision: { revisionId: 'rev_20260630040000' } },
        }), { status: 200 });
      }
      if (action === 'restoreRevision') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            articleId: 'art_smoke',
            revisionId: 'rev_20260630040000',
          },
        }), { status: 200 });
      }
    }
    if (parsed.pathname.endsWith('/features/content-hub/read')) {
      const read = body?.input?.contentHub?.read;
      if (read === 'revisionList') {
        return new Response(JSON.stringify({
          ok: true,
          data: { items: [{ revisionId: 'rev_20260630040000', articleId: 'art_smoke' }] },
        }), { status: 200 });
      }
      if (read === 'publicBundlePreview') {
        return new Response(JSON.stringify({
          ok: true,
          data: { item: { articleId: 'art_smoke', revisionId: 'rev_old' } },
        }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ ok: false, error: 'unexpected request' }), { status: 500 });
  };

  try {
    await assert.rejects(() => runSmoke({
      baseUrl: 'https://test.zoolandingpage.com.mx',
      runtimeBaseUrl: 'https://runtime.example.com/Prod',
      domain: 'zoositioweb.com.mx',
      authProfileId: 'staff',
      hubId: 'zoosite-main',
      environment: 'test',
      lang: 'es',
      pageId: 'admin-blog-articulos',
      cookieHeader: '__Host-zlp_session=session; zlp_csrf=csrf-token',
      csrf: 'csrf-token',
      timeoutMs: 1000,
      sharedPreview: true,
      now,
    }), /Public bundle preview did not include the updated revision/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runSmoke verifies public search by title, slug, path, category, and tag', async () => {
  const originalFetch = globalThis.fetch;
  const searchQueries = [];
  const actionSequence = [];
  const readSequence = [];
  const now = new Date('2026-06-30T04:00:00.000Z');
  const title = 'QA Product Smoke 20260630040000';
  const slug = 'qa-product-smoke-20260630040000';
  const path = `/blog/qa/${slug}`;

  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (parsed.pathname.endsWith('/features/content-hub/action')) {
      const action = body?.input?.contentHub?.action;
      actionSequence.push(action);
      if (action === 'createArticle') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            article: {
              articleId: 'art_smoke',
              latestRevisionId: 'rev_smoke',
              path,
            },
            revision: { revisionId: 'rev_smoke' },
          },
        }), { status: 200 });
      }
      if (action === 'publish') {
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            articleId: 'art_smoke',
            revisionId: 'rev_smoke',
            path,
          },
        }), { status: 200 });
      }
      if (action === 'approveArticle') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            articleId: 'art_smoke',
            status: 'approved',
          },
        }), { status: 200 });
      }
      if (action === 'updatePackage') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        assert.deepEqual(body.input.articleContent, {
          ops: [{ insert: 'Contenido editado por smoke 20260630040000.\n' }],
        });
        return new Response(JSON.stringify({
          ok: true,
          data: { revision: { revisionId: 'rev_20260630040000' } },
        }), { status: 200 });
      }
      if (action === 'validate') {
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        return new Response(JSON.stringify({
          ok: true,
          data: { valid: true, articleId: 'art_smoke', issues: [] },
        }), { status: 200 });
      }
      if (action === 'submitReview') {
        assert.equal(body.input.validationState, 'valid');
        return new Response(JSON.stringify({
          ok: true,
          data: { articleId: 'art_smoke', status: 'review' },
        }), { status: 200 });
      }
      if (action === 'restoreRevision') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            articleId: 'art_smoke',
            revisionId: 'rev_20260630040000',
          },
        }), { status: 200 });
      }
      if (action === 'schedule') {
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        assert.equal(body.input.scheduleAction, 'unpublish');
        assert.equal(typeof body.input.unpublishAt, 'string');
        assert.equal(body.input.publishAt, undefined);
        return new Response(JSON.stringify({
          ok: true,
          data: { schedule: { scheduleId: 'schedule_smoke' } },
        }), { status: 200 });
      }
      if (action === 'cancelSchedule') {
        return new Response(JSON.stringify({
          ok: true,
          data: { schedule: { scheduleId: 'schedule_smoke', status: 'canceled' } },
        }), { status: 200 });
      }
    }
    if (parsed.pathname.endsWith('/features/content-hub/read')) {
      const read = body?.input?.contentHub?.read;
      readSequence.push(read);
      if (read === 'revisionList') {
        assert.equal(body.input.articleId, 'art_smoke');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [
              { revisionId: 'rev_20260630040000', articleId: 'art_smoke' },
            ],
          },
        }), { status: 200 });
      }
      if (read === 'publicBundlePreview') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            item: {
              articleId: 'art_smoke',
              revisionId: 'rev_20260630040000',
              title,
            },
          },
        }), { status: 200 });
      }
      assert.equal(read, 'scheduleList');
      return new Response(JSON.stringify({
        ok: true,
        data: { items: [{ scheduleId: 'schedule_smoke' }] },
      }), { status: 200 });
    }
    if (parsed.pathname.endsWith('/runtime-bundle')) {
      return new Response(JSON.stringify({
        ok: true,
        runtime: { contentHubs: [{ publicArticles: [{ articleId: 'art_smoke', title, path }] }] },
      }), { status: 200 });
    }
    if (parsed.pathname.endsWith('/content-hub-search.json')) {
      searchQueries.push(parsed.searchParams.get('q'));
      return new Response(JSON.stringify({
        ok: true,
        articles: [{ articleId: 'art_smoke', title, path, category: 'qa', tags: ['product-smoke'] }],
      }), { status: 200 });
    }
    if (parsed.pathname === path) {
      assert.equal(parsed.searchParams.get('draftDomain'), 'zoositioweb.com.mx');
      return new Response(`<html><title>${title}</title><body>${title}</body></html>`, { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, error: 'unexpected request' }), { status: 500 });
  };

  try {
    await runSmoke({
      baseUrl: 'https://test.zoolandingpage.com.mx',
      runtimeBaseUrl: 'https://runtime.example.com/Prod',
      domain: 'zoositioweb.com.mx',
      authProfileId: 'staff',
      hubId: 'zoosite-main',
      environment: 'test',
      lang: 'es',
      pageId: 'admin-blog-articulos',
      cookieHeader: '__Host-zlp_session=session; zlp_csrf=csrf-token',
      csrf: 'csrf-token',
      timeoutMs: 1000,
      sharedPreview: true,
      now,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(searchQueries, [
    title,
    slug,
    path,
    'qa',
    'product-smoke',
  ]);
  assert.deepEqual(actionSequence, [
    'createArticle',
    'updatePackage',
    'restoreRevision',
    'validate',
    'submitReview',
    'approveArticle',
    'publish',
    'schedule',
    'cancelSchedule',
  ]);
  assert.deepEqual(readSequence, [
    'revisionList',
    'publicBundlePreview',
    'scheduleList',
  ]);
});
