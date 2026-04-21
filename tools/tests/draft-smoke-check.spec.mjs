import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_VIEWPORTS, buildSmokeReport } from '../draft-smoke-check.mjs';

function createSummary(label) {
  return {
    title: `${label} title`,
    firstHeading: `${label} heading`,
    hasSearchButton: label.includes('desktop'),
    hasHamburgerButton: label.includes('mobile'),
    unresolvedDraft: false,
    bodySnippet: `${label} snippet`,
  };
}

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
