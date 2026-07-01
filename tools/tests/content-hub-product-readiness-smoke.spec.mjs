import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildContentHubPayload,
  buildPublicArticleUrl,
  buildPublicSearchUrl,
  buildPublicXmlUrl,
  buildRuntimeBundleUrl,
  cookieValue,
  extractCreateResult,
  parseArgs,
  publicCanonicalArticleUrl,
  redact,
  resolvePublicSmokeTarget,
  runSmoke,
  safeSmokeErrorMessage,
  smokeStep,
  slugify,
} from '../content-hub-product-readiness-smoke.mjs';

const smokeCliPath = fileURLToPath(new URL('../content-hub-product-readiness-smoke.mjs', import.meta.url));

function runSmokeCli(args = [], env = {}) {
  const cleanEnv = { ...process.env, ...env };
  delete cleanEnv.ZLP_RUNTIME_READ_BASE_URL;
  delete cleanEnv.ZLP_CONTENT_HUB_SMOKE_COOKIE;
  delete cleanEnv.ZLP_CONTENT_HUB_SMOKE_CSRF;
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete cleanEnv[key];
    } else {
      cleanEnv[key] = value;
    }
  }
  return spawnSync(process.execPath, [smokeCliPath, ...args], {
    encoding: 'utf8',
    env: cleanEnv,
  });
}

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

test('buildPublicXmlUrl preserves shared preview context without changing canonical article URLs', () => {
  const url = buildPublicXmlUrl({
    baseUrl: 'https://test.zoolandingpage.com.mx/',
    domain: 'zoositioweb.com.mx',
    pathName: '/feed.xml',
    lang: 'es',
    sharedPreview: true,
  });

  assert.equal(
    url,
    'https://test.zoolandingpage.com.mx/feed.xml?draftDomain=zoositioweb.com.mx&lang=es',
  );
  assert.equal(
    publicCanonicalArticleUrl('zoositioweb.com.mx', '/blog/qa/product-smoke'),
    'https://zoositioweb.com.mx/blog/qa/product-smoke',
  );
});

test('resolvePublicSmokeTarget requires explicit production host and disables shared preview', () => {
  assert.throws(
    () => resolvePublicSmokeTarget({ environment: 'production' }, {}),
    /--base-url is required for production smoke/,
  );
  assert.throws(
    () => resolvePublicSmokeTarget({ environment: 'production', 'base-url': 'https://zoositioweb.com.mx' }, {}),
    /--shared-preview=false is required for production smoke/,
  );
  assert.deepEqual(
    resolvePublicSmokeTarget({
      environment: 'production',
      'base-url': 'https://zoositioweb.com.mx/',
      'shared-preview': 'false',
    }, {}),
    {
      baseUrl: 'https://zoositioweb.com.mx',
      environment: 'production',
      sharedPreview: false,
    },
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

test('safeSmokeErrorMessage keeps local smoke setup errors distinct', () => {
  assert.equal(
    safeSmokeErrorMessage('--runtime-base-url is required.'),
    'Runtime-read base URL is required. Pass --runtime-base-url or ZLP_RUNTIME_READ_BASE_URL.',
  );
  assert.equal(
    safeSmokeErrorMessage('Provide an authenticated cookie through --cookie-file or ZLP_CONTENT_HUB_SMOKE_COOKIE.'),
    'Authentication cookie is required. Sign in and pass --cookie-file or ZLP_CONTENT_HUB_SMOKE_COOKIE.',
  );
  assert.equal(
    safeSmokeErrorMessage("CSRF cookie 'zlp_csrf' was not found in the provided cookie header."),
    'CSRF cookie was not found in the provided session cookie. Sign in again and retry the smoke.',
  );
});

test('cli reports missing runtime base URL as local smoke setup', () => {
  const result = runSmokeCli();

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Runtime-read base URL is required/);
  assert.doesNotMatch(result.stderr, /content service could not accept|deployment logs/i);
});

test('cli reports missing authenticated cookie as local smoke setup', () => {
  const result = runSmokeCli(['--runtime-base-url=https://runtime.example.com/Prod']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Authentication cookie is required/);
  assert.doesNotMatch(result.stderr, /deployment logs|permission/i);
});

test('cli reports missing csrf as local smoke setup', () => {
  const result = runSmokeCli(['--runtime-base-url=https://runtime.example.com/Prod'], {
    ZLP_CONTENT_HUB_SMOKE_COOKIE: '__Host-zlp_session=session-only',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /CSRF cookie was not found/);
  assert.doesNotMatch(result.stderr, /permission|deployment logs/i);
});

test('smokeStep tags failures without changing the safe message', async () => {
  await assert.rejects(
    smokeStep('publicBundlePreview', () => {
      throw new Error('HTTP 404: The smoke could not identify the target article or revision.');
    }),
    (error) => error?.smokeStep === 'publicBundlePreview'
      && error?.message === 'HTTP 404: The smoke could not identify the target article or revision.',
  );
});

test('slugify keeps article URLs deterministic and safe', () => {
  assert.equal(slugify('QA Product Smoke 2026: Español!'), 'qa-product-smoke-2026-espanol');
});

test('runSmoke fails when preview does not reflect the updated revision', async () => {
  const originalFetch = globalThis.fetch;
  const now = new Date('2026-06-30T04:00:00.000Z');
  const path = '/blog/qa-20260630040000/qa-product-smoke-20260630040000';
  const taxonomyDescription = 'QA taxonomy smoke 20260630040000';
  const taxonomySeoDescription = 'SEO QA taxonomy smoke 20260630040000';

  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (parsed.pathname.endsWith('/features/content-hub/action')) {
      const action = body?.input?.contentHub?.action;
      if (action === 'upsertTaxonomy') {
        const kind = body.input.taxonomyKind;
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            taxonomy: {
              taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
              kind,
              slug: kind === 'category' ? 'qa-20260630040000' : 'product-smoke-20260630040000',
              label,
              description: taxonomyDescription,
              locale: 'es',
              seoTitle: label,
              seoDescription: taxonomySeoDescription,
              visible: true,
              updatedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
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
      if (read === 'taxonomyList') {
        const kind = body.input.taxonomyKind;
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        const item = {
          taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
          kind,
          slug: kind === 'category' ? 'qa-20260630040000' : 'product-smoke-20260630040000',
          label,
          description: taxonomyDescription,
          locale: 'es',
          seoTitle: label,
          seoDescription: taxonomySeoDescription,
          visible: true,
          updatedAt: '2026-06-30T04:00:00Z',
        };
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [item],
            categories: kind === 'category' ? [item] : [],
            tags: kind === 'tag' ? [item] : [],
          },
        }), { status: 200 });
      }
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

test('runSmoke fails when asset upload exposes internal storage metadata', async () => {
  const originalFetch = globalThis.fetch;
  const now = new Date('2026-06-30T04:00:00.000Z');
  const path = '/blog/qa-20260630040000/qa-product-smoke-20260630040000';

  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (parsed.pathname.endsWith('/features/content-hub/action')) {
      const action = body?.input?.contentHub?.action;
      if (action === 'upsertTaxonomy') {
        const kind = body.input.taxonomyKind;
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            taxonomy: {
              taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
              kind,
              slug: kind === 'category' ? 'qa-20260630040000' : 'product-smoke-20260630040000',
              label,
              description: 'QA taxonomy smoke 20260630040000',
              locale: 'es',
              seoTitle: label,
              seoDescription: 'SEO QA taxonomy smoke 20260630040000',
              visible: true,
              updatedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
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
        return new Response(JSON.stringify({
          ok: true,
          data: { articleId: 'art_smoke', revisionId: 'rev_20260630040000' },
        }), { status: 200 });
      }
      if (action === 'uploadAsset') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            asset: {
              assetId: 'asset_20260630040000',
              kind: 'document',
              fileName: 'qa-smoke-20260630040000.txt',
              mimeType: 'text/plain',
              bytes: Buffer.byteLength('Smoke asset 20260630040000', 'utf8'),
              title: 'Smoke asset 20260630040000',
              alt: 'Archivo de prueba 20260630040000',
              objectKey: 'content-hubs/test/zoosite-main/assets/asset_20260630040000/original/qa-smoke-20260630040000.txt',
              createdAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
    }
    if (parsed.pathname.endsWith('/features/content-hub/read')) {
      const read = body?.input?.contentHub?.read;
      if (read === 'taxonomyList') {
        const kind = body.input.taxonomyKind;
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        const item = {
          taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
          kind,
          slug: kind === 'category' ? 'qa-20260630040000' : 'product-smoke-20260630040000',
          label,
          description: 'QA taxonomy smoke 20260630040000',
          locale: 'es',
          seoTitle: label,
          seoDescription: 'SEO QA taxonomy smoke 20260630040000',
          visible: true,
          updatedAt: '2026-06-30T04:00:00Z',
        };
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [item],
            categories: kind === 'category' ? [item] : [],
            tags: kind === 'tag' ? [item] : [],
          },
        }), { status: 200 });
      }
      if (read === 'revisionList') {
        return new Response(JSON.stringify({
          ok: true,
          data: { items: [{ revisionId: 'rev_20260630040000', articleId: 'art_smoke' }] },
        }), { status: 200 });
      }
      if (read === 'publicBundlePreview') {
        return new Response(JSON.stringify({
          ok: true,
          data: { item: { articleId: 'art_smoke', revisionId: 'rev_20260630040000' } },
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
    }), /upload exposed internal asset metadata/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runSmoke verifies public search by title, slug, path, category, and tag', async () => {
  const originalFetch = globalThis.fetch;
  const searchQueries = [];
  const actionSequence = [];
  const readSequence = [];
  const xmlPaths = [];
  const interactionEvents = [];
  let queuedComments = 0;
  let moderationStatus = 'none';
  const now = new Date('2026-06-30T04:00:00.000Z');
  const title = 'QA Product Smoke 20260630040000';
  const slug = 'qa-product-smoke-20260630040000';
  const category = 'qa-20260630040000';
  const tag = 'product-smoke-20260630040000';
  const taxonomyDescription = 'QA taxonomy smoke 20260630040000';
  const taxonomySeoDescription = 'SEO QA taxonomy smoke 20260630040000';
  const asset = {
    assetId: 'asset_20260630040000',
    kind: 'document',
    fileName: 'qa-smoke-20260630040000.txt',
    mimeType: 'text/plain',
    bytes: Buffer.byteLength('Smoke asset 20260630040000', 'utf8'),
    title: 'Smoke asset 20260630040000',
    alt: 'Archivo de prueba 20260630040000',
  };
  const path = `/blog/${category}/${slug}`;
  const articleBody = 'Contenido editado por smoke 20260630040000';
  let unpublished = false;

  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (parsed.pathname.endsWith('/features/content-hub/action')) {
      const action = body?.input?.contentHub?.action;
      actionSequence.push(action);
      if (action === 'upsertTaxonomy') {
        const kind = body.input.taxonomyKind;
        assert.ok(['category', 'tag'].includes(kind));
        const taxonomyId = kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000';
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        const taxonomySlug = kind === 'category' ? category : tag;
        assert.equal(body.input.taxonomyId, taxonomyId);
        assert.equal(body.input.slug, taxonomySlug);
        assert.equal(body.input.translation, label);
        assert.equal(body.input.taxonomyDescription, taxonomyDescription);
        assert.equal(body.input.seoTitle, label);
        assert.equal(body.input.seoDescription, taxonomySeoDescription);
        assert.equal(body.input.visible, true);
        return new Response(JSON.stringify({
          ok: true,
          data: {
            taxonomy: {
              taxonomyId,
              kind,
              slug: taxonomySlug,
              label,
              description: taxonomyDescription,
              locale: 'es',
              seoTitle: label,
              seoDescription: taxonomySeoDescription,
              visible: true,
              updatedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'createArticle') {
        assert.equal(body.input.articleCategory, category);
        assert.equal(body.input.articleTags, `qa, ${tag}, content-hub`);
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
        assert.equal(body.input.advancedMode, true);
        assert.equal(body.input.allowedComponentPreset, 'advanced');
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
      if (action === 'uploadAsset') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.assetId, asset.assetId);
        assert.equal(body.input.upload.fileName, asset.fileName);
        assert.equal(body.input.upload.mimeType, asset.mimeType);
        assert.equal(body.input.upload.bytes, asset.bytes);
        assert.equal(body.input.upload.dataBase64, Buffer.from('Smoke asset 20260630040000', 'utf8').toString('base64'));
        assert.equal(body.input.metadata.alt, asset.alt);
        assert.equal(body.input.title, asset.title);
        return new Response(JSON.stringify({
          ok: true,
          data: {
            asset: {
              ...asset,
              publicUrl: '',
              createdAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'recordInteraction') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.path, path);
        assert.ok(['readProgress', 'cta_click', 'reaction', 'share', 'assetDownload', 'form'].includes(body.input.eventType));
        interactionEvents.push(body.input.eventType);
        return new Response(JSON.stringify({
          ok: true,
          data: { articleId: 'art_smoke', eventType: body.input.eventType },
        }), { status: 200 });
      }
      if (action === 'queueComment') {
        assert.equal(body.input.articleId, 'art_smoke');
        assert.equal(body.input.commentPolicy, 'authenticated-moderation');
        assert.match(body.input.commentBody, /^QA smoke moderated comment /);
        queuedComments += 1;
        moderationStatus = 'queued';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            comment: {
              articleId: 'art_smoke',
              commentId: 'comment_smoke',
              status: 'queued',
              bodyPreview: 'QA smoke moderated comment 20260630040000',
              queuedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'moderateComment') {
        assert.equal(body.input.commentId, 'comment_smoke');
        assert.equal(body.input.decision, 'approved');
        assert.equal(body.input.reason, 'QA smoke approval');
        moderationStatus = 'approved';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            moderation: {
              articleId: 'art_smoke',
              commentId: 'comment_smoke',
              status: 'approved',
              bodyPreview: 'QA smoke moderated comment 20260630040000',
              queuedAt: '2026-06-30T04:00:00Z',
              moderatedAt: '2026-06-30T04:05:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'schedule') {
        assert.equal(body.input.revisionId, 'rev_20260630040000');
        assert.equal(body.input.scheduleAction, 'unpublish');
        assert.equal(typeof body.input.unpublishAt, 'string');
        assert.match(body.input.unpublishAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
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
      if (action === 'unpublishArticle') {
        assert.equal(body.input.articleId, 'art_smoke');
        unpublished = true;
        return new Response(JSON.stringify({
          ok: true,
          data: {
            articleId: 'art_smoke',
            status: 'unpublished',
            path,
            unpublishedAt: '2026-06-30T05:00:00Z',
          },
        }), { status: 200 });
      }
    }
    if (parsed.pathname.endsWith('/features/content-hub/read')) {
      const read = body?.input?.contentHub?.read;
      readSequence.push(read);
      if (read === 'taxonomyList') {
        const kind = body.input.taxonomyKind;
        assert.ok(['category', 'tag'].includes(kind));
        const label = kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000';
        const item = {
          taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
          kind,
          slug: kind === 'category' ? category : tag,
          label,
          description: taxonomyDescription,
          locale: 'es',
          seoTitle: label,
          seoDescription: taxonomySeoDescription,
          visible: true,
          updatedAt: '2026-06-30T04:00:00Z',
        };
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [item],
            categories: kind === 'category' ? [item] : [],
            tags: kind === 'tag' ? [item] : [],
          },
        }), { status: 200 });
      }
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
      if (read === 'assetList') {
        assert.equal(body.input.articleId, 'art_smoke');
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [{
              ...asset,
              publicUrl: '',
              createdAt: '2026-06-30T04:00:00Z',
            }],
          },
        }), { status: 200 });
      }
      if (read === 'moderationQueue') {
        const items = moderationStatus === 'none'
          ? []
          : [{
            articleId: 'art_smoke',
            commentId: 'comment_smoke',
            status: moderationStatus,
            bodyPreview: 'QA smoke moderated comment 20260630040000',
            queuedAt: '2026-06-30T04:00:00Z',
            ...(moderationStatus === 'approved' ? { moderatedAt: '2026-06-30T04:05:00Z' } : {}),
          }];
        return new Response(JSON.stringify({
          ok: true,
          data: { items },
        }), { status: 200 });
      }
      if (read === 'analyticsSummary') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [{
              articleId: 'art_smoke',
              views: 1,
              readProgress: interactionEvents.includes('readProgress') ? 1 : 0,
              ctaClicks: interactionEvents.includes('cta_click') ? 1 : 0,
              reactions: interactionEvents.includes('reaction') ? 1 : 0,
              shares: interactionEvents.includes('share') ? 1 : 0,
              comments: queuedComments,
              assetDownloads: interactionEvents.includes('assetDownload') ? 1 : 0,
              forms: interactionEvents.includes('form') ? 1 : 0,
            }],
          },
        }), { status: 200 });
      }
      if (read === 'articleDetail') {
        assert.equal(unpublished, true);
        assert.equal(body.input.articleId, 'art_smoke');
        return new Response(JSON.stringify({
          ok: true,
          data: { item: { articleId: 'art_smoke', status: 'unpublished', visibility: 'private' } },
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
      if (unpublished) {
        return new Response(JSON.stringify({ ok: true, articles: [] }), { status: 200 });
      }
      searchQueries.push(parsed.searchParams.get('q'));
      return new Response(JSON.stringify({
        ok: true,
        articles: [{ articleId: 'art_smoke', title, path, category, tags: [tag] }],
      }), { status: 200 });
    }
    if (parsed.pathname === path) {
      assert.equal(parsed.searchParams.get('draftDomain'), 'zoositioweb.com.mx');
      if (unpublished) {
        return new Response('not found', { status: 404 });
      }
      return new Response(`<html><title>${title}</title><body>${title}<article>${articleBody}.</article></body></html>`, { status: 200 });
    }
    if (parsed.pathname === '/sitemap.xml') {
      assert.equal(parsed.searchParams.get('draftDomain'), 'zoositioweb.com.mx');
      if (unpublished) {
        return new Response('<urlset></urlset>', { status: 200 });
      }
      xmlPaths.push(parsed.pathname);
      return new Response(`<urlset><url><loc>https://zoositioweb.com.mx${path}</loc></url></urlset>`, { status: 200 });
    }
    if (parsed.pathname === '/feed.xml') {
      assert.equal(parsed.searchParams.get('draftDomain'), 'zoositioweb.com.mx');
      assert.equal(parsed.searchParams.get('lang'), 'es');
      if (unpublished) {
        return new Response('<rss><channel></channel></rss>', { status: 200 });
      }
      xmlPaths.push(parsed.pathname);
      return new Response(`<rss><channel><item><link>https://zoositioweb.com.mx${path}</link><guid>https://zoositioweb.com.mx${path}</guid></item></channel></rss>`, { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, error: 'unexpected request' }), { status: 500 });
  };

  let result = null;
  try {
    result = await runSmoke({
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
    category,
    tag,
  ]);
  assert.deepEqual(actionSequence, [
    'upsertTaxonomy',
    'upsertTaxonomy',
    'createArticle',
    'updatePackage',
    'restoreRevision',
    'uploadAsset',
    'validate',
    'submitReview',
    'approveArticle',
    'publish',
    'recordInteraction',
    'recordInteraction',
    'recordInteraction',
    'recordInteraction',
    'recordInteraction',
    'recordInteraction',
    'queueComment',
    'moderateComment',
    'schedule',
    'cancelSchedule',
    'unpublishArticle',
  ]);
  assert.deepEqual(interactionEvents.sort(), ['assetDownload', 'cta_click', 'form', 'reaction', 'readProgress', 'share']);
  assert.equal(queuedComments, 1);
  assert.deepEqual(readSequence, [
    'taxonomyList',
    'taxonomyList',
    'revisionList',
    'publicBundlePreview',
    'assetList',
    'moderationQueue',
    'analyticsSummary',
    'moderationQueue',
    'moderationQueue',
    'analyticsSummary',
    'scheduleList',
    'articleDetail',
  ]);
  assert.deepEqual(xmlPaths, [
    '/sitemap.xml',
    '/feed.xml',
  ]);
  assert.equal(result?.checks?.upsertCategory, true);
  assert.equal(result?.checks?.upsertTag, true);
  assert.equal(result?.checks?.taxonomyCategoryList, true);
  assert.equal(result?.checks?.taxonomyTagList, true);
  assert.equal(result?.checks?.uploadAsset, true);
  assert.equal(result?.checks?.recordInteractionReadProgress, true);
  assert.equal(result?.checks?.recordInteractionCta, true);
  assert.equal(result?.checks?.recordInteractionReaction, true);
  assert.equal(result?.checks?.recordInteractionShare, true);
  assert.equal(result?.checks?.recordInteractionAssetDownload, true);
  assert.equal(result?.checks?.recordInteractionForm, true);
  assert.equal(result?.checks?.queueComment, true);
  assert.equal(result?.checks?.moderationQueueAfterComment, true);
  assert.equal(result?.checks?.moderateComment, true);
  assert.equal(result?.checks?.moderationQueueAfterModeration, true);
  assert.equal(result?.checks?.publicInteractionAnalytics, true);
  assert.equal(result?.checks?.unpublishArticle, true);
  assert.equal(result?.checks?.articleDetailAfterUnpublish, true);
});

test('runSmoke fails when unpublished articles remain publicly visible', async () => {
  const originalFetch = globalThis.fetch;
  const now = new Date('2026-06-30T04:00:00.000Z');
  const title = 'QA Product Smoke 20260630040000';
  const slug = 'qa-product-smoke-20260630040000';
  const category = 'qa-20260630040000';
  const path = `/blog/${category}/${slug}`;
  let unpublished = false;
  let moderationStatus = 'none';

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
        return new Response(JSON.stringify({ ok: true, data: { revision: { revisionId: 'rev_20260630040000' } } }), { status: 200 });
      }
      if (action === 'uploadAsset') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            asset: {
              assetId: 'asset_20260630040000',
              kind: 'document',
              fileName: 'qa-smoke-20260630040000.txt',
              mimeType: 'text/plain',
              bytes: Buffer.byteLength('Smoke asset 20260630040000', 'utf8'),
              title: 'Smoke asset 20260630040000',
              alt: 'Archivo de prueba 20260630040000',
              createdAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'validate') {
        return new Response(JSON.stringify({ ok: true, data: { valid: true } }), { status: 200 });
      }
      if (action === 'approveArticle' || action === 'submitReview' || action === 'restoreRevision') {
        return new Response(JSON.stringify({ ok: true, data: { articleId: 'art_smoke', revisionId: 'rev_20260630040000' } }), { status: 200 });
      }
      if (action === 'publish') {
        return new Response(JSON.stringify({ ok: true, data: { articleId: 'art_smoke', revisionId: 'rev_20260630040000', path } }), { status: 200 });
      }
      if (action === 'recordInteraction') {
        return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
      }
      if (action === 'queueComment') {
        moderationStatus = 'queued';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            comment: {
              articleId: 'art_smoke',
              commentId: 'comment_smoke',
              status: 'queued',
              bodyPreview: 'QA smoke moderated comment 20260630040000',
              queuedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'moderateComment') {
        moderationStatus = 'approved';
        return new Response(JSON.stringify({
          ok: true,
          data: {
            moderation: {
              articleId: 'art_smoke',
              commentId: 'comment_smoke',
              status: 'approved',
              bodyPreview: 'QA smoke moderated comment 20260630040000',
              queuedAt: '2026-06-30T04:00:00Z',
              moderatedAt: '2026-06-30T04:05:00Z',
            },
          },
        }), { status: 200 });
      }
      if (action === 'schedule') {
        return new Response(JSON.stringify({ ok: true, data: { schedule: { scheduleId: 'schedule_smoke' } } }), { status: 200 });
      }
      if (action === 'cancelSchedule') {
        return new Response(JSON.stringify({ ok: true, data: { schedule: { scheduleId: 'schedule_smoke', status: 'canceled' } } }), { status: 200 });
      }
      if (action === 'unpublishArticle') {
        unpublished = true;
        return new Response(JSON.stringify({
          ok: true,
          data: { articleId: 'art_smoke', status: 'unpublished', path, unpublishedAt: '2026-06-30T05:00:00Z' },
        }), { status: 200 });
      }
      if (action === 'upsertTaxonomy') {
        const kind = body.input.taxonomyKind;
        return new Response(JSON.stringify({
          ok: true,
          data: {
            taxonomy: {
              taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
              kind,
              slug: kind === 'category' ? category : 'product-smoke-20260630040000',
              label: kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000',
              description: 'QA taxonomy smoke 20260630040000',
              locale: 'es',
              seoTitle: kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000',
              seoDescription: 'SEO QA taxonomy smoke 20260630040000',
              visible: true,
              updatedAt: '2026-06-30T04:00:00Z',
            },
          },
        }), { status: 200 });
      }
    }
    if (parsed.pathname.endsWith('/features/content-hub/read')) {
      const read = body?.input?.contentHub?.read;
      if (read === 'taxonomyList') {
        const kind = body.input.taxonomyKind;
        const item = {
          taxonomyId: kind === 'category' ? 'qa_category_20260630040000' : 'qa_tag_20260630040000',
          kind,
          slug: kind === 'category' ? category : 'product-smoke-20260630040000',
          label: kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000',
          description: 'QA taxonomy smoke 20260630040000',
          locale: 'es',
          seoTitle: kind === 'category' ? 'QA 20260630040000' : 'Product Smoke 20260630040000',
          seoDescription: 'SEO QA taxonomy smoke 20260630040000',
          visible: true,
          updatedAt: '2026-06-30T04:00:00Z',
        };
        return new Response(JSON.stringify({ ok: true, data: { categories: kind === 'category' ? [item] : [], tags: kind === 'tag' ? [item] : [] } }), { status: 200 });
      }
      if (read === 'revisionList') {
        return new Response(JSON.stringify({ ok: true, data: { items: [{ revisionId: 'rev_20260630040000' }] } }), { status: 200 });
      }
      if (read === 'publicBundlePreview') {
        return new Response(JSON.stringify({ ok: true, data: { item: { articleId: 'art_smoke', revisionId: 'rev_20260630040000', title } } }), { status: 200 });
      }
      if (read === 'assetList') {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            items: [{
              assetId: 'asset_20260630040000',
              kind: 'document',
              fileName: 'qa-smoke-20260630040000.txt',
              mimeType: 'text/plain',
              bytes: Buffer.byteLength('Smoke asset 20260630040000', 'utf8'),
              title: 'Smoke asset 20260630040000',
              alt: 'Archivo de prueba 20260630040000',
              createdAt: '2026-06-30T04:00:00Z',
            }],
          },
        }), { status: 200 });
      }
      if (read === 'moderationQueue') {
        const items = moderationStatus === 'none'
          ? []
          : [{
            articleId: 'art_smoke',
            commentId: 'comment_smoke',
            status: moderationStatus,
            bodyPreview: 'QA smoke moderated comment 20260630040000',
            queuedAt: '2026-06-30T04:00:00Z',
            ...(moderationStatus === 'approved' ? { moderatedAt: '2026-06-30T04:05:00Z' } : {}),
          }];
        return new Response(JSON.stringify({
          ok: true,
          data: { items },
        }), { status: 200 });
      }
      if (read === 'analyticsSummary') {
        return new Response(JSON.stringify({
          ok: true,
          data: { items: [{ articleId: 'art_smoke', readProgress: 1, ctaClicks: 1, reactions: 1, shares: 1, comments: 1, assetDownloads: 1, forms: 1 }] },
        }), { status: 200 });
      }
      if (read === 'articleDetail') {
        return new Response(JSON.stringify({ ok: true, data: { item: { articleId: 'art_smoke', status: 'unpublished', visibility: 'private' } } }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, data: { items: [{ scheduleId: 'schedule_smoke' }] } }), { status: 200 });
    }
    if (parsed.pathname.endsWith('/runtime-bundle')) {
      return new Response(JSON.stringify({ ok: true, runtime: { contentHubs: [{ publicArticles: [{ articleId: 'art_smoke', title, path }] }] } }), { status: 200 });
    }
    if (parsed.pathname.endsWith('/content-hub-search.json')) {
      return new Response(JSON.stringify({ ok: true, articles: [{ articleId: 'art_smoke', title, path, category, tags: ['product-smoke-20260630040000'] }] }), { status: 200 });
    }
    if (parsed.pathname === path) {
      return new Response(`<html><title>${title}</title><body>${title}<article>Contenido editado por smoke 20260630040000.</article></body></html>`, { status: 200 });
    }
    if (parsed.pathname === '/sitemap.xml') {
      return new Response(`<urlset><url><loc>https://zoositioweb.com.mx${path}</loc></url></urlset>`, { status: 200 });
    }
    if (parsed.pathname === '/feed.xml') {
      return new Response(`<rss><channel><item><link>https://zoositioweb.com.mx${path}</link><guid>https://zoositioweb.com.mx${path}</guid></item></channel></rss>`, { status: 200 });
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
    }), /Public search still includes the unpublished article/);
    assert.equal(unpublished, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
