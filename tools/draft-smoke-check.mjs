#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const DEFAULT_DRAFTS_ROOT = path.resolve('drafts');
const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:4200';
const DEFAULT_LIVE_SCHEME = 'https';
const DEFAULT_BROWSER_TIMEOUT_MS = 20000;
const MANAGED_ALIAS_SUFFIX = '.zoolandingpage.com.mx';
const DEBUG_DRAFT_DIRECTORY = '_debug';

const DEFAULT_VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop', width: 1440, height: 900 }),
  Object.freeze({ id: 'mobile', width: 390, height: 844 }),
]);

function parseArgs(rawArgs) {
  const parsed = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;

    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
    const previous = parsed[key];

    if (previous === undefined) {
      parsed[key] = value;
      continue;
    }

    parsed[key] = Array.isArray(previous) ? previous.concat(value) : [previous, value];
  }

  return parsed;
}

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getBooleanArg(args, key, fallback = false) {
  const fallbackValue = fallback ? 'true' : 'false';
  const raw = String(args[key] ?? fallbackValue)
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function getIntegerArg(args, key, fallback) {
  const raw = Number.parseInt(String(args[key] ?? fallback), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function normalizeRoutePath(routePath) {
  const raw = String(routePath ?? '').trim();
  if (!raw || raw === '/') {
    return '/';
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter(route => {
    const key = `${route.path}::${route.pageId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeViewportDefinitions(viewports) {
  const source = Array.isArray(viewports) && viewports.length > 0 ? viewports : DEFAULT_VIEWPORTS;
  const seen = new Set();

  return source.map((viewport, index) => {
    const id = String(viewport?.id ?? `viewport-${index + 1}`).trim();
    const width = Number.parseInt(String(viewport?.width ?? ''), 10);
    const height = Number.parseInt(String(viewport?.height ?? ''), 10);

    if (!id) {
      throw new Error('Each viewport definition requires a non-empty id.');
    }

    if (seen.has(id)) {
      throw new Error(`Duplicate viewport id: ${id}`);
    }

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error(`Viewport '${id}' requires positive width and height values.`);
    }

    seen.add(id);
    return { id, width, height };
  });
}

function createViewportCounts(viewports) {
  return Object.fromEntries(viewports.map(viewport => [viewport.id, 0]));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function loadDraftDefinitions(draftsRoot, requestedDomains) {
  const entries = await readdir(draftsRoot, { withFileTypes: true });
  const domainsFilter = new Set(requestedDomains);
  const definitions = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === DEBUG_DRAFT_DIRECTORY) continue;
    if (domainsFilter.size > 0 && !domainsFilter.has(entry.name)) continue;

    const siteConfigPath = path.join(draftsRoot, entry.name, 'site-config.json');
    if (!existsSync(siteConfigPath)) continue;

    const siteConfig = await readJson(siteConfigPath);
    const routes =
      Array.isArray(siteConfig.routes) && siteConfig.routes.length > 0
        ? siteConfig.routes.map(route => ({
            path: normalizeRoutePath(route?.path),
            pageId: String(route?.pageId ?? siteConfig.defaultPageId ?? 'default').trim() || 'default',
          }))
        : [
            {
              path: '/',
              pageId: String(siteConfig.defaultPageId ?? 'default').trim() || 'default',
            },
          ];

    definitions.push({
      domain: entry.name,
      defaultPageId: String(siteConfig.defaultPageId ?? 'default').trim() || 'default',
      managedAlias: Array.isArray(siteConfig.aliases)
        ? siteConfig.aliases.find(alias => String(alias).trim().toLowerCase().endsWith(MANAGED_ALIAS_SUFFIX)) ?? null
        : null,
      routes: dedupeRoutes(routes),
    });
  }

  if (definitions.length === 0 && requestedDomains.length > 0) {
    throw new Error(`No draft folders matched: ${requestedDomains.join(', ')}`);
  }

  return definitions.sort((left, right) => left.domain.localeCompare(right.domain));
}

function buildLocalUrl(localBaseUrl, domain, routePath) {
  const url = new URL(normalizeRoutePath(routePath), localBaseUrl);
  url.searchParams.set('draftDomain', domain);
  return url.toString();
}

function buildLiveUrl(alias, routePath, liveScheme) {
  return new URL(normalizeRoutePath(routePath), `${liveScheme}://${alias}`).toString();
}

async function canExecute(command) {
  return new Promise(resolve => {
    const child = spawn(command, ['--version'], { stdio: 'ignore', windowsHide: true });
    child.on('error', () => resolve(false));
    child.on('exit', code => resolve(code === 0));
  });
}

async function resolveBrowserCommand(explicitBrowserPath) {
  const candidates = [
    explicitBrowserPath,
    process.env.DRAFT_SMOKE_BROWSER_PATH,
    process.env.BROWSER_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
    process.platform === 'darwin' ? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' : null,
    process.platform === 'linux' ? '/usr/bin/google-chrome' : null,
    process.platform === 'linux' ? '/usr/bin/microsoft-edge' : null,
    process.platform === 'linux' ? '/usr/bin/chromium-browser' : null,
    'msedge',
    'chrome',
    'google-chrome',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !existsSync(candidate)) {
      continue;
    }

    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate a supported Chromium-based browser. Pass --browser-path=... if needed.');
}

async function inspectPage(context, targetUrl, timeoutMs) {
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForFunction(
      () => {
        const title = document.title?.trim() || '';
        const bodyText = document.body?.innerText || '';
        return (
          Boolean(title) &&
          (Boolean(document.querySelector('main h1, main h2, main h3')) || /Unresolved draft/i.test(bodyText))
        );
      },
      { timeout: timeoutMs }
    );
    await page.waitForTimeout(500);

    return await page.evaluate(() => {
      const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const mainHeading = document.querySelector('main h1, main h2, main h3');
      const hasSearchButton = Boolean(
        Array.from(document.querySelectorAll('button, [role="button"], a')).find(element => {
          const text = element.textContent || '';
          const ariaLabel = element.getAttribute('aria-label') || '';
          return /búsqueda del sitio|search/i.test(text) || /búsqueda del sitio|search/i.test(ariaLabel);
        })
      );
      const hasHamburgerButton = Boolean(
        Array.from(document.querySelectorAll('button')).find(element => {
          const text = element.textContent || '';
          const ariaLabel = element.getAttribute('aria-label') || '';
          return /Abrir navegación principal/i.test(text) || /Abrir navegación principal/i.test(ariaLabel);
        })
      );

      return {
        title: document.title?.trim() || '',
        firstHeading:
          mainHeading?.textContent?.trim() || document.querySelector('h1, h2, h3')?.textContent?.trim() || '',
        hasSearchButton,
        hasHamburgerButton,
        unresolvedDraft: /Unresolved draft/i.test(bodyText),
        bodySnippet: bodyText.slice(0, 220),
      };
    });
  } finally {
    await page.close();
  }
}

async function inspectPageWithRetries(context, targetUrl, timeoutMs, attempts = 3) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await inspectPage(context, targetUrl, timeoutMs);
    } catch (error) {
      lastError = error;
      if (index === attempts - 1) {
        break;
      }
    }
  }

  throw lastError;
}

function compareSummaries(localSummary, liveSummary) {
  const mismatches = [];

  if (localSummary.title !== liveSummary.title) {
    mismatches.push(`title: local='${localSummary.title}' live='${liveSummary.title}'`);
  }

  if (localSummary.firstHeading !== liveSummary.firstHeading) {
    mismatches.push(`firstHeading: local='${localSummary.firstHeading}' live='${liveSummary.firstHeading}'`);
  }

  if (localSummary.hasSearchButton !== liveSummary.hasSearchButton) {
    mismatches.push(`hasSearchButton: local=${localSummary.hasSearchButton} live=${liveSummary.hasSearchButton}`);
  }

  if (localSummary.hasHamburgerButton !== liveSummary.hasHamburgerButton) {
    mismatches.push(
      `hasHamburgerButton: local=${localSummary.hasHamburgerButton} live=${liveSummary.hasHamburgerButton}`
    );
  }

  return mismatches;
}

function validateLocalSummary(summary) {
  const problems = [];

  if (!summary.title) problems.push('missing title');
  if (!summary.firstHeading) problems.push('missing first heading');
  if (summary.unresolvedDraft) problems.push('page rendered unresolved draft fallback');

  return problems;
}

async function writeOutput(outputPath, payload) {
  if (!outputPath) {
    return;
  }

  const resolved = path.resolve(outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function printRouteStatus({ prefix, viewportId, domain, routePath, details }) {
  process.stdout.write(`${prefix}[${viewportId}] ${domain} ${routePath} ${details}\n`);
}

async function buildSmokeReport({
  definitions,
  inspectPageSummary,
  viewports = DEFAULT_VIEWPORTS,
  localBaseUrl,
  includeLive = true,
  liveScheme = DEFAULT_LIVE_SCHEME,
  primaryViewport,
  timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS,
  onStatus,
}) {
  if (typeof inspectPageSummary !== 'function') {
    throw new Error('buildSmokeReport requires an inspectPageSummary callback.');
  }

  const normalizedViewports = normalizeViewportDefinitions(viewports);
  const requestedPrimaryViewport = String(primaryViewport ?? normalizedViewports[0]?.id ?? '').trim();
  const primaryViewportId = normalizedViewports.some(viewport => viewport.id === requestedPrimaryViewport)
    ? requestedPrimaryViewport
    : normalizedViewports[0]?.id || null;
  const localFailuresByViewport = createViewportCounts(normalizedViewports);
  const liveFailuresByViewport = createViewportCounts(normalizedViewports);
  const skippedLiveRoutesByViewport = createViewportCounts(normalizedViewports);
  const report = {
    generatedAt: new Date().toISOString(),
    localBaseUrl,
    includeLive,
    liveScheme,
    primaryViewport: primaryViewportId,
    viewports: normalizedViewports.map(viewport => ({ ...viewport })),
    results: [],
  };

  let localFailures = 0;
  let liveFailures = 0;
  let skippedLiveRoutes = 0;

  for (const definition of definitions) {
    const draftResult = {
      domain: definition.domain,
      managedAlias: definition.managedAlias,
      routes: [],
    };

    for (const route of definition.routes) {
      const localUrl = buildLocalUrl(localBaseUrl, definition.domain, route.path);
      const liveUrl =
        includeLive && definition.managedAlias ? buildLiveUrl(definition.managedAlias, route.path, liveScheme) : null;
      const viewportResults = {};

      for (const viewport of normalizedViewports) {
        const localSummary = await inspectPageSummary({
          definition,
          route,
          surface: 'local',
          targetUrl: localUrl,
          timeoutMs,
          viewport,
          viewportId: viewport.id,
          attempts: 2,
        });
        const localProblems = validateLocalSummary(localSummary);

        if (localProblems.length > 0) {
          localFailures += 1;
          localFailuresByViewport[viewport.id] += 1;
          onStatus?.({
            prefix: '[local fail]',
            viewportId: viewport.id,
            domain: definition.domain,
            routePath: route.path,
            details: localProblems.join('; '),
          });
        } else {
          onStatus?.({
            prefix: '[local ok]',
            viewportId: viewport.id,
            domain: definition.domain,
            routePath: route.path,
            details: `${localSummary.title} | ${localSummary.firstHeading}`,
          });
        }

        let liveSummary = null;
        let liveMismatches = [];

        if (liveUrl) {
          liveSummary = await inspectPageSummary({
            definition,
            route,
            surface: 'live',
            targetUrl: liveUrl,
            timeoutMs,
            viewport,
            viewportId: viewport.id,
            attempts: 3,
          });
          liveMismatches = compareSummaries(localSummary, liveSummary);

          if (liveMismatches.length > 0) {
            liveFailures += 1;
            liveFailuresByViewport[viewport.id] += 1;
            onStatus?.({
              prefix: '[live drift]',
              viewportId: viewport.id,
              domain: definition.domain,
              routePath: route.path,
              details: liveMismatches.join('; '),
            });
          } else {
            onStatus?.({
              prefix: '[live ok]',
              viewportId: viewport.id,
              domain: definition.domain,
              routePath: route.path,
              details: `${definition.managedAlias}`,
            });
          }
        } else if (includeLive) {
          skippedLiveRoutesByViewport[viewport.id] += 1;
          onStatus?.({
            prefix: '[live skip]',
            viewportId: viewport.id,
            domain: definition.domain,
            routePath: route.path,
            details: 'no managed .zoolandingpage.com.mx alias',
          });
        }

        viewportResults[viewport.id] = {
          viewport: { ...viewport },
          local: localSummary,
          localProblems,
          live: liveSummary,
          liveMismatches,
        };
      }

      if (includeLive && !liveUrl) {
        skippedLiveRoutes += 1;
      }

      const primaryResult = viewportResults[primaryViewportId] ?? Object.values(viewportResults)[0] ?? null;
      draftResult.routes.push({
        path: route.path,
        pageId: route.pageId,
        localUrl,
        liveUrl,
        primaryViewport: primaryViewportId,
        viewports: viewportResults,
        local: primaryResult?.local ?? null,
        localProblems: primaryResult?.localProblems ?? [],
        live: primaryResult?.live ?? null,
        liveMismatches: primaryResult?.liveMismatches ?? [],
      });
    }

    report.results.push(draftResult);
  }

  report.summary = {
    draftCount: report.results.length,
    routeCount: report.results.reduce((total, draft) => total + draft.routes.length, 0),
    viewportCount: normalizedViewports.length,
    localFailures,
    liveFailures,
    skippedLiveRoutes,
    localFailuresByViewport,
    liveFailuresByViewport,
    skippedLiveRoutesByViewport,
  };

  return report;
}

async function createBrowserInspector(browser, viewports) {
  const contexts = new Map();

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true,
    });
    contexts.set(viewport.id, context);
  }

  return {
    async inspectPageSummary({ viewportId, targetUrl, timeoutMs, attempts }) {
      const context = contexts.get(viewportId);
      if (!context) {
        throw new Error(`Unknown viewport id: ${viewportId}`);
      }

      return inspectPageWithRetries(context, targetUrl, timeoutMs, attempts);
    },
    async close() {
      for (const context of contexts.values()) {
        await context.close();
      }
    },
  };
}

async function runFromCli(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const requestedDomains = toArray(args.domain)
    .map(value => String(value).trim())
    .filter(Boolean);
  const draftsRoot = path.resolve(String(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT));
  const localBaseUrl = String(args['local-base-url'] ?? DEFAULT_LOCAL_BASE_URL).trim();
  const liveScheme = String(args['live-scheme'] ?? DEFAULT_LIVE_SCHEME).trim() || DEFAULT_LIVE_SCHEME;
  const includeLive = getBooleanArg(args, 'include-live', true);
  const timeoutMs = getIntegerArg(args, 'timeout-ms', DEFAULT_BROWSER_TIMEOUT_MS);
  const viewports = normalizeViewportDefinitions(DEFAULT_VIEWPORTS);
  const browserCommand = await resolveBrowserCommand(String(args['browser-path'] ?? '').trim() || null);
  const definitions = await loadDraftDefinitions(draftsRoot, requestedDomains);
  const browser = await chromium.launch({ executablePath: browserCommand, headless: true });
  const inspector = await createBrowserInspector(browser, viewports);

  try {
    const report = await buildSmokeReport({
      definitions,
      inspectPageSummary: inspector.inspectPageSummary,
      viewports,
      localBaseUrl,
      includeLive,
      liveScheme,
      timeoutMs,
      onStatus: printRouteStatus,
    });

    report.browserCommand = browserCommand;
    report.draftsRoot = draftsRoot;

    await writeOutput(String(args.output ?? '').trim(), report);

    process.stdout.write(
      `\nSummary: ${report.summary.routeCount} routes across ${report.summary.draftCount} drafts and ${report.summary.viewportCount} viewports. Local failures: ${report.summary.localFailures}. Live mismatches: ${report.summary.liveFailures}. Skipped live routes: ${report.summary.skippedLiveRoutes}.\n`
    );

    if (report.summary.localFailures > 0 || report.summary.liveFailures > 0) {
      process.exitCode = 1;
    }

    return report;
  } finally {
    await inspector.close();
    await browser.close();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (invokedPath && import.meta.url === invokedPath) {
  runFromCli().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_VIEWPORTS,
  buildSmokeReport,
  compareSummaries,
  inspectPageWithRetries,
  loadDraftDefinitions,
  normalizeViewportDefinitions,
  runFromCli,
  validateLocalSummary,
};
