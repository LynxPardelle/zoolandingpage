import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_VIEWPORTS,
  buildSmokeReport,
  inspectPageWithRetries,
  isExpectedBrowserConsoleError,
  resolveSmokeRoutePath,
  sanitizeBrowserFinding,
} from '../draft-smoke-check.mjs';

function createSummary(label, overrides = {}) {
  return {
    title: `${label} title`,
    description: `${label} description`,
    canonical: `https://example.test/${label}`,
    robots: 'index,follow,max-image-preview:large',
    keywords: `${label} keyword`,
    ogTitle: `${label} og title`,
    twitterCard: 'summary_large_image',
    firstHeading: `${label} heading`,
    hasSearchButton: label.includes('desktop'),
    hasHamburgerButton: label.includes('mobile'),
    unresolvedDraft: false,
    bodySnippet: `${label} snippet`,
    consoleErrors: [],
    pageErrors: [],
    horizontalOverflowPx: 0,
    brokenImages: [],
    unresolvedMaterialIcons: [],
    ...overrides,
  };
}

test('passes the configured timeout as Playwright waitForFunction options', async () => {
  const waitForFunctionCalls = [];
  const page = {
    on: () => {},
    goto: async () => {},
    waitForFunction: async (...args) => {
      waitForFunctionCalls.push(args);
    },
    waitForTimeout: async () => {},
    evaluate: async () => createSummary('runtime', {
      brokenImages: [{
        src: 'https://example.test/AKIAABCDEFGHIJKLMNOP/broken.png',
        alt: 'Contact person@example.test',
      }],
    }),
    close: async () => {},
  };
  const context = {
    newPage: async () => page,
  };

  const summary = await inspectPageWithRetries(context, 'http://127.0.0.1:4200/example', 1234, 1);

  assert.equal(waitForFunctionCalls.length, 1);
  assert.equal(waitForFunctionCalls[0][1], undefined);
  assert.deepEqual(waitForFunctionCalls[0][2], { timeout: 1234 });
  assert.deepEqual(summary.brokenImages, [{
    src: '[redacted-browser-finding]',
    alt: '[redacted-browser-finding]',
  }]);
});

test('ignores only the expected unauthenticated session probe console error', () => {
  const message = ({ text, url, type = 'error' }) => ({
    type: () => type,
    text: () => text,
    location: () => ({ url, lineNumber: 0, columnNumber: 0 }),
  });

  assert.equal(isExpectedBrowserConsoleError(message({
    text: 'Failed to load resource: the server responded with a status of 401 ()',
    url: 'https://test.zoolandingpage.com.mx/auth/session/me',
  }), 'https://test.zoolandingpage.com.mx/acceso'), true);
  assert.equal(isExpectedBrowserConsoleError(message({
    text: 'Failed to load resource: the server responded with a status of 401 ()',
    url: 'https://third-party.example/auth/session/me',
  }), 'https://test.zoolandingpage.com.mx/acceso'), false);
  assert.equal(isExpectedBrowserConsoleError(message({
    text: 'Failed to load resource: the server responded with a status of 401 ()',
    url: 'https://test.zoolandingpage.com.mx/admin/users',
  }), 'https://test.zoolandingpage.com.mx/acceso'), false);
  assert.equal(isExpectedBrowserConsoleError(message({
    text: 'Uncaught TypeError: failed',
    url: 'https://test.zoolandingpage.com.mx/auth/session/me',
  }), 'https://test.zoolandingpage.com.mx/acceso'), false);
});

test('redacts complete authorization credentials and standalone JWTs from browser findings', () => {
  const bearerFinding = sanitizeBrowserFinding(
    'Request failed Authorization: Bearer eyJheader.payload.signature token=secondary-secret'
  );
  const customSchemeFinding = sanitizeBrowserFinding('Authorization: ApiKey live-super-secret');
  const sigV4Finding = sanitizeBrowserFinding(
    'Authorization: AWS4-HMAC-SHA256 Credential=example/20260825/us-east-1/service/aws4_request, Signature=deadbeef'
  );
  const rawKeyFinding = sanitizeBrowserFinding('Request included AKIAABCDEFGHIJKLMNOP in an error');

  assert.equal(bearerFinding.includes('eyJheader.payload.signature'), false);
  assert.equal(bearerFinding.includes('secondary-secret'), false);
  assert.equal(bearerFinding, 'Request failed Authorization=[redacted]');
  assert.equal(customSchemeFinding, 'Authorization=[redacted]');
  assert.equal(sigV4Finding, 'Authorization=[redacted]');
  assert.equal(rawKeyFinding, '[redacted-browser-finding]');
});

test('redacts browser findings that still contain canonical PII patterns', () => {
  assert.equal(
    sanitizeBrowserFinding('Request failed for person@example.test'),
    '[redacted-browser-finding]'
  );
  assert.equal(
    sanitizeBrowserFinding('Callback failed for +52 55 1234 5678'),
    '[redacted-browser-finding]'
  );
});

test('resolves concrete smoke paths for dynamic content-hub and protected routes', () => {
  const siteConfig = {
    runtime: {
      contentHubs: [{
        publicArticles: [{
          path: '/blog/web/example-article',
          categorySlug: 'web',
          tags: ['seo'],
        }],
        publicTaxonomy: [
          { kind: 'category', slug: 'web' },
          { kind: 'tag', slug: 'seo' },
        ],
      }],
    },
  };

  assert.equal(resolveSmokeRoutePath('/blog/tag/:tagSlug', siteConfig), '/blog/tag/seo');
  assert.equal(resolveSmokeRoutePath('/blog/:categorySlug', siteConfig), '/blog/web');
  assert.equal(resolveSmokeRoutePath('/blog/:categorySlug/:articleSlug', siteConfig), '/blog/web/example-article');
  assert.equal(resolveSmokeRoutePath('/admin/articles/:id/edit', siteConfig), '/admin/articles/smoke-id/edit');
});

test('buildSmokeReport records desktop and mobile results per route', async () => {
  const calls = [];
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: 'example.zoolandingpage.com.mx',
        routes: [{ path: '/', pageId: 'default' }],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: true,
    liveScheme: 'https',
    inspectPageSummary: async ({ viewportId, surface, targetUrl }) => {
      calls.push({ viewportId, surface, targetUrl });
      return createSummary(viewportId);
    },
  });

  assert.equal(calls.length, 4);

  const route = report.results[0]?.routes[0];
  assert.deepEqual(Object.keys(route.viewports), ['desktop', 'mobile']);
  assert.equal(route.viewports.desktop.local.title, 'desktop title');
  assert.equal(route.viewports.mobile.local.title, 'mobile title');
  assert.equal(route.viewports.desktop.live.title, 'desktop title');
  assert.equal(route.viewports.mobile.live.title, 'mobile title');
  assert.equal(route.primaryViewport, 'desktop');
  assert.equal(route.local.title, 'desktop title');
  assert.equal(route.live.title, 'desktop title');
  assert.equal(report.summary.routeCount, 1);
  assert.equal(report.summary.localFailures, 0);
  assert.equal(report.summary.liveFailures, 0);
  assert.deepEqual(report.summary.localFailuresByViewport, { desktop: 0, mobile: 0 });
  assert.deepEqual(report.summary.liveFailuresByViewport, { desktop: 0, mobile: 0 });
});

test('buildSmokeReport tracks skipped live checks once per route and per viewport', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'local-only.example.com',
        managedAlias: null,
        routes: [{ path: '/contact', pageId: 'contact' }],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: true,
    liveScheme: 'https',
    inspectPageSummary: async ({ viewportId, surface }) => createSummary(`${surface}-${viewportId}`),
  });

  const route = report.results[0]?.routes[0];
  assert.equal(route.liveUrl, null);
  assert.equal(route.viewports.desktop.live, null);
  assert.equal(route.viewports.mobile.live, null);
  assert.equal(report.summary.skippedLiveRoutes, 1);
  assert.deepEqual(report.summary.skippedLiveRoutesByViewport, { desktop: 1, mobile: 1 });
});

test('buildSmokeReport carries and compares core SEO metadata fields', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'seo-example.com',
        managedAlias: 'seo-example.zoolandingpage.com.mx',
        routes: [{ path: '/contact', pageId: 'contact' }],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: true,
    liveScheme: 'https',
    inspectPageSummary: async ({ viewportId, surface }) => {
      if (surface === 'live') {
        return createSummary(viewportId, {
          canonical: 'https://seo-example.com/contact-live',
          keywords: 'live keyword',
        });
      }

      return createSummary(viewportId, {
        canonical: 'https://seo-example.com/contact',
        keywords: 'local keyword',
      });
    },
  });

  const route = report.results[0]?.routes[0];
  assert.equal(route.viewports.desktop.local.description, 'desktop description');
  assert.equal(route.viewports.desktop.local.robots, 'index,follow,max-image-preview:large');
  assert.equal(route.viewports.desktop.local.ogTitle, 'desktop og title');
  assert.equal(route.viewports.desktop.local.twitterCard, 'summary_large_image');
  assert.match(route.viewports.desktop.liveMismatches[0], /canonical:/);
  assert.match(route.viewports.desktop.liveMismatches[1], /keywords:/);
  assert.equal(report.summary.liveFailures, 2);
});

test('buildSmokeReport flags missing robots metadata as a local failure', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'robots-example.com',
        managedAlias: null,
        routes: [{ path: '/', pageId: 'default' }],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async () => createSummary('desktop', { robots: '' }),
  });

  const route = report.results[0]?.routes[0];
  assert.match(route.viewports.desktop.localProblems[0], /missing robots meta/);
  assert.equal(report.summary.localFailures, 2);
});

test('buildSmokeReport flags missing social metadata as local failures', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'social-example.com',
        managedAlias: null,
        routes: [{ path: '/', pageId: 'default' }],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async () => createSummary('desktop', { ogTitle: '', twitterCard: '' }),
  });

  const route = report.results[0]?.routes[0];
  assert.match(route.viewports.desktop.localProblems[0], /missing og:title meta/);
  assert.match(route.viewports.desktop.localProblems[1], /missing twitter:card meta/);
  assert.equal(report.summary.localFailures, 2);
});

test('flags multilingual draft not-found titles on ordinary routes but allows the declared /404 route', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: null,
        routes: [
          { path: '/servicios', pageId: 'servicios' },
          { path: '/zh', pageId: 'zh' },
          { path: '/404', pageId: 'not-found' },
        ],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async ({ route }) => route.path === '/zh'
      ? createSummary('fallback', {
          title: '页面未找到 | example.com',
          firstHeading: '此页面尚未发布。',
          bodySnippet: '页面未找到 此页面尚未发布。',
        })
      : createSummary('fallback', {
          title: 'Página no encontrada | example.com',
          firstHeading: 'Esta ruta no está publicada.',
          bodySnippet: 'Página no encontrada Esta ruta no está publicada.',
        }),
  });

  const [ordinaryRoute, chineseRoute, notFoundRoute] = report.results[0].routes;
  assert.match(ordinaryRoute.viewports.desktop.localProblems[0], /not-found title/);
  assert.match(chineseRoute.viewports.desktop.localProblems[0], /not-found title/);
  assert.deepEqual(notFoundRoute.viewports.desktop.localProblems, []);
  assert.equal(report.summary.localFailures, 4);
});

test('records a local inspection timeout and continues every remaining viewport and route', async () => {
  const calls = [];
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: null,
        routes: [
          { path: '/slow', pageId: 'slow' },
          { path: '/healthy', pageId: 'healthy' },
        ],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async ({ route, viewportId }) => {
      calls.push(`${route.path}:${viewportId}`);
      if (route.path === '/slow' && viewportId === 'desktop') {
        throw new Error('inspection timed out');
      }
      return createSummary(`${route.pageId}-${viewportId}`);
    },
  });

  assert.equal(calls.length, 4);
  const [slowRoute, healthyRoute] = report.results[0].routes;
  assert.equal(slowRoute.viewports.desktop.local, null);
  assert.match(slowRoute.viewports.desktop.localInspectionError, /inspection timed out/);
  assert.match(slowRoute.viewports.desktop.localProblems[0], /inspection failed/);
  assert.ok(slowRoute.viewports.mobile.local);
  assert.ok(healthyRoute.viewports.desktop.local);
  assert.ok(healthyRoute.viewports.mobile.local);
  assert.equal(report.summary.localFailures, 1);
  assert.deepEqual(report.summary.localFailuresByViewport, { desktop: 1, mobile: 0 });
});

test('records a live inspection timeout and continues later routes', async () => {
  const calls = [];
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: 'example.zoolandingpage.com.mx',
        routes: [
          { path: '/slow', pageId: 'slow' },
          { path: '/healthy', pageId: 'healthy' },
        ],
      },
    ],
    viewports: DEFAULT_VIEWPORTS,
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: true,
    liveScheme: 'https',
    inspectPageSummary: async ({ route, viewportId, surface }) => {
      calls.push(`${route.path}:${viewportId}:${surface}`);
      if (route.path === '/slow' && viewportId === 'desktop' && surface === 'live') {
        throw new Error('live inspection timed out');
      }
      return createSummary(`${route.pageId}-${viewportId}`);
    },
  });

  assert.equal(calls.length, 8);
  const [slowRoute, healthyRoute] = report.results[0].routes;
  assert.equal(slowRoute.viewports.desktop.live, null);
  assert.match(slowRoute.viewports.desktop.liveInspectionError, /live inspection timed out/);
  assert.match(slowRoute.viewports.desktop.liveMismatches[0], /inspection failed/);
  assert.ok(healthyRoute.viewports.desktop.live);
  assert.ok(healthyRoute.viewports.mobile.live);
  assert.equal(report.summary.liveFailures, 1);
  assert.deepEqual(report.summary.liveFailuresByViewport, { desktop: 1, mobile: 0 });
});

test('flags browser errors, horizontal overflow, broken images, and unresolved material icons as one failed viewport', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: null,
        routes: [{ path: '/', pageId: 'default' }],
      },
    ],
    viewports: [{ id: 'desktop', width: 1440, height: 900 }],
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async () => createSummary('runtime', {
      consoleErrors: ['console exploded'],
      pageErrors: ['uncaught exploded'],
      horizontalOverflowPx: 8,
      brokenImages: [{ src: 'https://example.com/broken.png', alt: 'Broken' }],
      unresolvedMaterialIcons: ['flight_land'],
    }),
  });

  const problems = report.results[0].routes[0].viewports.desktop.localProblems;
  assert.equal(problems.length, 5);
  assert.match(problems[0], /console error/);
  assert.match(problems[1], /uncaught page error/);
  assert.match(problems[2], /horizontal overflow/);
  assert.match(problems[3], /broken image/);
  assert.match(problems[4], /unresolved material icon: flight_land/);
  assert.equal(report.summary.localFailures, 1);
});

test('allows one-pixel layout rounding without runtime findings', async () => {
  const report = await buildSmokeReport({
    definitions: [
      {
        domain: 'example.com',
        managedAlias: null,
        routes: [{ path: '/', pageId: 'default' }],
      },
    ],
    viewports: [{ id: 'desktop', width: 1440, height: 900 }],
    localBaseUrl: 'http://127.0.0.1:4200',
    includeLive: false,
    liveScheme: 'https',
    inspectPageSummary: async () => createSummary('rounding', {
      horizontalOverflowPx: 1,
      brokenImages: [],
    }),
  });

  assert.equal(report.summary.localFailures, 0);
});
