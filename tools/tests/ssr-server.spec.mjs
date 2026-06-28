import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join, resolve } from 'node:path';
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

async function fetchStartedServer(url, init) {
  const deadline = Date.now() + 2_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (error?.cause?.code !== 'ECONNREFUSED') {
        throw error;
      }
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw lastError ?? new Error(`Timed out fetching ${url}`);
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

function assertNoSensitiveAuthSurface(body) {
  const forbiddenPatterns = [
    [/id[_-]?token/i, 'id token'],
    [/access[_-]?token/i, 'access token'],
    [/refresh[_-]?token/i, 'refresh token'],
    [/clientSecret/i, 'client secret'],
    [/Authorization/i, 'authorization header'],
    [/__Host-zlp_session/i, 'session cookie'],
    [/zlp_csrf/i, 'csrf cookie'],
    [/tenantId/i, 'tenant policy'],
    [/adminGroups/i, 'admin group policy'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(body, pattern, `protected SSR HTML must not expose ${label}`);
  }
}

function assertNoContentHubOperationalLeak(body) {
  const forbiddenPatterns = [
    [/credentialRef/i, 'credential reference'],
    [/serverOnly/i, 'server-only block'],
    [/allowedDraftDomains/i, 'draft sharing allowlist'],
    [/articleIds/i, 'server-side article id index'],
    [/"bucket"\s*:/i, 'storage bucket'],
    [/"prefix"\s*:/i, 'storage prefix'],
    [/"tableName"\s*:/i, 'table name'],
    [/tenantId/i, 'tenant policy'],
    [/accessToken/i, 'access token'],
    [/refreshToken/i, 'refresh token'],
    [/idToken/i, 'id token'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(body, pattern, `content hub public SEO output must not expose ${label}`);
  }
}

function extractJsonLd(html) {
  return Array.from(html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1])
    .join('\n');
}

function stripNonVisibleHtml(html) {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
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

test('production SSR shared preview decorates head with the test runtime environment', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    const environment = url.searchParams.get('environment') ?? '';
    requests.push({
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
      environment,
    });

    const brand = environment === 'test' ? 'Current Test Brand' : 'Old Production Brand';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      version: 1,
      domain: 'preview.example.com',
      pageId: 'default',
      sourceStage: 'published',
      generatedAt: '2026-06-16T00:00:00.000Z',
      route: { path: '/', pageId: 'default', label: 'Home' },
      siteConfig: {
        version: 1,
        domain: 'preview.example.com',
        defaultPageId: 'default',
        routes: [{ path: '/', pageId: 'default', label: 'Home' }],
        defaults: {
          brand: {
            displayName: brand,
          },
        },
        site: {
          seo: {
            siteName: brand,
            canonicalOrigin: 'https://preview.example.com',
          },
        },
      },
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: 'preview.example.com',
        rootIds: [],
        seo: {
          title: `${ brand } title`,
          description: `${ brand } description`,
        },
        structuredData: {
          entries: [
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: brand,
            },
          ],
        },
      },
      components: {
        version: 1,
        domain: 'preview.example.com',
        pageId: 'default',
        components: [],
      },
      metadata: {},
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=preview.example.com&debugWorkspace=false`, {
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Current Test Brand/);
  assert.doesNotMatch(body, /Old Production Brand/);
  assert.match(body, /data-zlp-boot-title="">Current Test Brand<\/strong>/);
  assert(requests.some((request) => request.environment === 'test'));
  assert.equal(getStderr(), '');
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

test('production SSR server does not self-redirect when CloudFront viewer proto is https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'CloudFront-Forwarded-Proto': 'https',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'cloudfront',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect when forwarded port is 443', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'cloudfront',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server redirects proxy-forwarded http to https', async (t) => {
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

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://test.zoolandingpage.com.mx/robots.txt');
  assert.equal(getStderr(), '');
});

test('production SSR server redirects primary canonical hosts from proxy-forwarded http to https', async (t) => {
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

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://zoolandingpage.com.mx/robots.txt');
  assert.equal(getStderr(), '');
});

test('production SSR exposes Zoosite content hub SEO sitemap feed and search', async (t) => {
  const siteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json'), 'utf8'));
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/runtime-bundle') {
      const path = url.searchParams.get('path') || '/';
      if (path === '/blog/web/missing-article') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'not-found',
          sourceStage: 'published',
          siteConfig,
          route: { path: '/404', pageId: 'not-found' },
          metadata: { statusCode: 404, notFound: true },
        }));
        return;
      }

      const pageId = url.searchParams.get('pageId') || 'contentHubArticle';
      const lang = url.searchParams.get('lang') || 'es';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: 1,
        domain: 'zoositioweb.com.mx',
        pageId,
        sourceStage: 'published',
        lang,
        siteConfig,
        pageConfig: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          rootIds: [],
        },
        components: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          components: [],
        },
        variables: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          variables: {},
        },
        i18n: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          lang,
          dictionary: {},
        },
        metadata: {},
      }));
      return;
    }

    if (url.pathname === '/site-config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(siteConfig));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const headers = {
    Host: 'zoositioweb.com.mx',
    'X-Forwarded-Host': 'zoositioweb.com.mx',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  };

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, { headers });
  const sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web<\/loc>/);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo<\/loc>/);
  assert.doesNotMatch(sitemap, /\/admin\/blog/);
  assertNoContentHubOperationalLeak(sitemap);

  const feedResponse = await fetch(`http://127.0.0.1:${port}/feed.xml?lang=es`, { headers });
  const feed = await feedResponse.text();
  assert.equal(feedResponse.status, 200);
  assert.match(feedResponse.headers.get('content-type') ?? '', /application\/rss\+xml/);
  assert.match(feed, /Cómo crear blogs visuales con Zoolandingpage/);
  assert.match(feed, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo/);
  assertNoContentHubOperationalLeak(feed);

  const searchResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&tag=seo&q=blogs`, { headers });
  const search = await searchResponse.json();
  assert.equal(searchResponse.status, 200);
  assert.equal(search.ok, true);
  assert.equal(search.count, 1);
  assert.equal(search.articles[0].path, '/blog/web/blog-builder-seo');
  assertNoContentHubOperationalLeak(JSON.stringify(search));

  const aliasFilterResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&categorySlug=web&tagSlug=seo`, { headers });
  const aliasFilterSearch = await aliasFilterResponse.json();
  assert.equal(aliasFilterResponse.status, 200);
  assert.equal(aliasFilterSearch.ok, true);
  assert.equal(aliasFilterSearch.count, 1);
  assert.equal(aliasFilterSearch.articles[0].categorySlug, 'web');
  assert.deepEqual(aliasFilterSearch.articles[0].tags, ['seo', 'builder', 'angora']);
  assertNoContentHubOperationalLeak(JSON.stringify(aliasFilterSearch));

  const previewHeaders = {
    ...headers,
    Host: 'test.zoolandingpage.com.mx',
    'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
  };
  const blogPreviewResponse = await fetch(
    `http://127.0.0.1:${port}/blog?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es`,
    { headers: previewHeaders },
  );
  const blogPreviewHtml = await blogPreviewResponse.text();
  assert.equal(blogPreviewResponse.status, 200);
  assert.match(blogPreviewHtml, /href="\/blog\/web\?draftDomain=zoositioweb\.com\.mx&amp;debugWorkspace=false&amp;lang=es"/);
  assert.match(blogPreviewHtml, /href="\/blog\/web\/blog-builder-seo\?draftDomain=zoositioweb\.com\.mx&amp;debugWorkspace=false&amp;lang=es"/);

  const articleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/blog-builder-seo?lang=es`, { headers });
  const articleHtml = await articleResponse.text();
  assert.equal(articleResponse.status, 200);
  assert.match(articleHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo">/);
  assert.match(articleHtml, /"@type":"BlogPosting"/);
  assert.match(articleHtml, /"articleSection":"web"/);
  assert.match(articleHtml, /"keywords":"seo, builder, angora"/);
  assert.match(articleHtml, /Cómo crear blogs visuales con Zoolandingpage/);
  assertNoContentHubOperationalLeak(extractJsonLd(articleHtml));

  const missingArticleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/missing-article?lang=es`, { headers });
  const missingArticleHtml = await missingArticleResponse.text();
  const missingArticleVisibleHtml = stripNonVisibleHtml(missingArticleHtml);
  assert.equal(missingArticleResponse.status, 404);
  assert.doesNotMatch(missingArticleHtml, /"@type":"BlogPosting"/);
  assert.doesNotMatch(missingArticleVisibleHtml, /Cómo crear blogs visuales con Zoolandingpage/);
  assert.match(missingArticleVisibleHtml, /Página no encontrada/);
  assertNoContentHubOperationalLeak(extractJsonLd(missingArticleHtml));
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
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle', '/Prod/runtime-bundle']);
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
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle', '/Prod/runtime-bundle', '/Prod/runtime-bundle']);
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

test('production SSR server renders a published canonical custom host from local config', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'erosbarajas.com',
      'X-Forwarded-Host': 'erosbarajas.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});

test('production SSR server allows a published runtime alias outside static host patterns', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'published-canonical.example.com',
        aliases: ['published-alias.example.com'],
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://published-canonical.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetchStartedServer(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'published-alias.example.com',
      'X-Forwarded-Host': 'published-alias.example.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/published-canonical\.example\.com\/sitemap\.xml/);
  assert.equal(requests[0].domain, 'published-alias.example.com');
  assert.equal(getStderr(), '');
});

test('production SSR server blocks unknown custom hosts before Angular SSR', async (t) => {
  const apiRequests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    apiRequests.push(req.url);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'unknown-custom.example.com',
      'X-Forwarded-Host': 'unknown-custom.example.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 400);
  assert.match(body, /not allowed/i);
  assert.deepEqual(apiRequests, ['/runtime-bundle?domain=unknown-custom.example.com&path=%2F']);
  assert.equal(getStderr(), '');
});

test('production SSR server supports test host draftDomain preview for a published custom host', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=erosbarajas.com&debugWorkspace=false`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});

test('production SSR server redirects protected draft preview routes to same-origin login', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'auth-preview.example.com',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/acceso', pageId: 'login' },
          {
            path: '/mi-cuenta',
            pageId: 'account',
            auth: {
              required: true,
              redirectTo: '/acceso',
              allowedGroups: ['client'],
            },
          },
        ],
        site: {
          seo: {
            canonicalOrigin: 'https://auth-preview.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/mi-cuenta?draftDomain=auth-preview.example.com&debugWorkspace=false&utm_source=google&lang=es`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://test.zoolandingpage.com.mx/acceso?draftDomain=auth-preview.example.com&debugWorkspace=false&lang=es',
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(requests[0], {
    pathname: '/runtime-bundle',
    domain: 'auth-preview.example.com',
    path: '/',
  });
  assert.equal(getStderr(), '');
});

test('production SSR server lets authRemote protected routes reach Angular for BFF revalidation', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'auth-preview.example.com',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/acceso', pageId: 'login' },
          {
            path: '/admin/usuarios',
            pageId: 'admin-users',
            auth: {
              required: true,
              redirectTo: '/acceso',
              allowedGroups: ['admin'],
            },
          },
        ],
        runtime: {
          authRemote: {
            enabled: true,
            authProfileId: 'staff',
            endpoint: '/auth/runtime-config',
          },
        },
        site: {
          seo: {
            canonicalOrigin: 'https://auth-preview.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'admin-users',
        rootIds: [],
      },
      components: {
        version: 1,
        domain: 'auth-preview.example.com',
        pageId: 'admin-users',
        components: [],
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/admin/usuarios?draftDomain=auth-preview.example.com&debugWorkspace=false&lang=es`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  assert.equal(response.headers.get('expires'), '0');
  assert.match(response.headers.get('vary') ?? '', /\bCookie\b/i);
  assert.match(body, /<app-root\b[^>]*data-zlp-protected-shell="true"/i);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /<meta name="robots" content="noindex,nofollow">/);
  assertNoSensitiveAuthSurface(body);
  assert.doesNotMatch(body, /Aprueba cuentas nuevas/i);
  assert.deepEqual(requests[0], {
    pathname: '/runtime-bundle',
    domain: 'auth-preview.example.com',
    path: '/',
  });
  assert.equal(getStderr(), '');
});

test('production SSR server preserves local port in protected-route redirects', async (t) => {
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'auth-preview.example.com',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/acceso', pageId: 'login' },
          {
            path: '/mi-cuenta',
            pageId: 'account',
            auth: {
              required: true,
              redirectTo: '/acceso',
              allowedGroups: ['client'],
            },
          },
        ],
        site: {
          seo: {
            canonicalOrigin: 'https://auth-preview.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/mi-cuenta?draftDomain=auth-preview.example.com&lang=es`, {
    redirect: 'manual',
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    `http://127.0.0.1:${port}/acceso?draftDomain=auth-preview.example.com&lang=es`,
  );
  assert.equal(getStderr(), '');
});

test('production SSR server ignores draftDomain query params on published custom hosts', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=zoolandingpage.com.mx&debugWorkspace=false`, {
    headers: {
      Host: 'erosbarajas.com',
      'X-Forwarded-Host': 'erosbarajas.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});
