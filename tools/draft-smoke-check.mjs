#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { REVIEW_PATTERN_DEFINITIONS, SECRET_PATTERN_DEFINITIONS } from './lib/sensitive-value-patterns.mjs';

const DEFAULT_DRAFTS_ROOT = path.resolve('drafts');
const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:4200';
const DEFAULT_LIVE_SCHEME = 'https';
const DEFAULT_BROWSER_TIMEOUT_MS = 20000;
const MAX_BROWSER_FINDINGS = 10;
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

function resolveSmokeRoutePath(routePath, siteConfig = {}) {
  const declaredPath = normalizeRoutePath(routePath);
  if (!/:([A-Za-z][A-Za-z0-9_]*)/.test(declaredPath)) {
    return declaredPath;
  }

  const contentHubs = Array.isArray(siteConfig?.runtime?.contentHubs)
    ? siteConfig.runtime.contentHubs
    : [];
  const publicArticles = contentHubs.flatMap(hub => Array.isArray(hub?.publicArticles) ? hub.publicArticles : []);
  const publicTaxonomy = contentHubs.flatMap(hub => Array.isArray(hub?.publicTaxonomy) ? hub.publicTaxonomy : []);
  const article = publicArticles.find(entry => typeof entry?.path === 'string' && entry.path.trim()) ?? null;
  const articlePathParts = normalizeRoutePath(article?.path ?? '/').split('/').filter(Boolean);
  const categorySlug = String(
    article?.categorySlug
      ?? publicTaxonomy.find(entry => entry?.kind === 'category')?.slug
      ?? 'smoke-category'
  ).trim();
  const tagSlug = String(
    publicTaxonomy.find(entry => entry?.kind === 'tag')?.slug
      ?? (Array.isArray(article?.tags) ? article.tags.find(Boolean) : '')
      ?? 'smoke-tag'
  ).trim();
  const articleSlug = articlePathParts.at(-1) || 'smoke-article';
  const replacements = {
    categorySlug,
    tagSlug,
    articleSlug,
  };

  return declaredPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, paramName) => {
    const replacement = replacements[paramName] || `smoke-${paramName.replace(/Slug$/, '').toLowerCase()}`;
    return encodeURIComponent(replacement);
  });
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
            smokePath: resolveSmokeRoutePath(route?.path, siteConfig),
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
    if (candidate.includes(path.sep)) {
      if (!existsSync(candidate)) {
        continue;
      }

      return candidate;
    }

    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate a supported Chromium-based browser. Pass --browser-path=... if needed.');
}

async function inspectPage(context, targetUrl, timeoutMs) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  const recordFinding = (collection, value) => {
    const normalized = sanitizeBrowserFinding(value);
    if (normalized && !collection.includes(normalized) && collection.length < MAX_BROWSER_FINDINGS) {
      collection.push(normalized);
    }
  };

  page.on('console', message => {
    if (message.type() === 'error' && !isExpectedBrowserConsoleError(message, page.url())) {
      recordFinding(consoleErrors, message.text());
    }
  });
  page.on('pageerror', error => recordFinding(pageErrors, error instanceof Error ? error.message : error));

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForFunction(
      () => {
        const title = document.title?.trim() || '';
        const bodyText = document.body?.innerText || '';
        return Boolean(title) && (Boolean(document.querySelector('h1, h2, h3')) || /Unresolved draft/i.test(bodyText));
      },
      undefined,
      { timeout: timeoutMs }
    );
    await page.waitForTimeout(500);

    const summary = await page.evaluate(({ consoleErrors, pageErrors, maxBrowserFindings }) => {
      const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const mainHeading = document.querySelector('main h1, main h2, main h3');
      const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
      const horizontalOverflowPx = Math.max(0, Math.ceil(documentWidth - document.documentElement.clientWidth));
      const brokenImages = Array.from(document.images)
        .filter(image => image.complete && Boolean(image.currentSrc) && image.naturalWidth === 0)
        .slice(0, maxBrowserFindings)
        .map(image => {
          let src = image.currentSrc;
          try {
            const parsed = new URL(src, window.location.href);
            parsed.search = '';
            parsed.hash = '';
            src = parsed.protocol === 'data:' ? '[inline-data]' : parsed.toString();
          } catch {
            src = '[unparseable-image-url]';
          }
          return {
            src,
            alt: (image.alt || '').trim().slice(0, 120),
          };
        });
      const unresolvedMaterialIcons = Array.from(document.querySelectorAll('span.material-icons'))
        .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, maxBrowserFindings);
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
        description: document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '',
        canonical: document.querySelector("link[rel='canonical']")?.getAttribute('href')?.trim() || '',
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')?.trim() || '',
        keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.trim() || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '',
        twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')?.trim() || '',
        firstHeading:
          mainHeading?.textContent?.trim() || document.querySelector('h1, h2, h3')?.textContent?.trim() || '',
        hasSearchButton,
        hasHamburgerButton,
        unresolvedDraft: /Unresolved draft/i.test(bodyText),
        bodySnippet: bodyText.slice(0, 220),
        consoleErrors,
        pageErrors,
        horizontalOverflowPx,
        brokenImages,
        unresolvedMaterialIcons,
      };
    }, {
      consoleErrors: consoleErrors.slice(0, MAX_BROWSER_FINDINGS),
      pageErrors: pageErrors.slice(0, MAX_BROWSER_FINDINGS),
      maxBrowserFindings: MAX_BROWSER_FINDINGS,
    });
    return {
      ...summary,
      brokenImages: (summary.brokenImages || []).map(image => ({
        src: sanitizeBrowserFinding(image.src),
        alt: sanitizeBrowserFinding(image.alt),
      })),
      unresolvedMaterialIcons: (summary.unresolvedMaterialIcons || []).map(sanitizeBrowserFinding),
    };
  } finally {
    await page.close();
  }
}

function isExpectedBrowserConsoleError(message, pageUrl) {
  if (message?.type?.() !== 'error') {
    return false;
  }

  if (!/Failed to load resource:.*status of 401\b/i.test(String(message.text?.() ?? ''))) {
    return false;
  }

  try {
    const resourceUrl = new URL(String(message.location?.()?.url ?? ''));
    const currentUrl = new URL(String(pageUrl ?? ''));
    return resourceUrl.origin === currentUrl.origin && resourceUrl.pathname === '/auth/session/me';
  } catch {
    return false;
  }
}

function sanitizeBrowserFinding(value) {
  const sanitized = String(value ?? '')
    .replace(/https?:\/\/[^\s)\]}]+/gi, rawUrl => {
      try {
        const parsed = new URL(rawUrl);
        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
      } catch {
        return '[redacted-url]';
      }
    })
    .replace(/\bauthorization\s*[:=]\s*[^\r\n]*/gi, 'Authorization=[redacted]')
    .replace(/\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi, '[redacted-credential]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\b(token|secret|api[-_]?key|access[-_]?key|credential|signature|session[-_]?token|pass(?:word|wd)?)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  return [...SECRET_PATTERN_DEFINITIONS, ...REVIEW_PATTERN_DEFINITIONS].some(rule => rule.regex.test(sanitized))
    ? '[redacted-browser-finding]'
    : sanitized;
}

function formatInspectionError(error) {
  return sanitizeBrowserFinding(error instanceof Error ? error.message : error) || 'Unknown browser inspection error.';
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

  if (localSummary.description !== liveSummary.description) {
    mismatches.push(`description: local='${localSummary.description}' live='${liveSummary.description}'`);
  }

  if (localSummary.canonical !== liveSummary.canonical) {
    mismatches.push(`canonical: local='${localSummary.canonical}' live='${liveSummary.canonical}'`);
  }

  if (localSummary.robots !== liveSummary.robots) {
    mismatches.push(`robots: local='${localSummary.robots}' live='${liveSummary.robots}'`);
  }

  if (localSummary.keywords !== liveSummary.keywords) {
    mismatches.push(`keywords: local='${localSummary.keywords}' live='${liveSummary.keywords}'`);
  }

  if (localSummary.ogTitle !== liveSummary.ogTitle) {
    mismatches.push(`ogTitle: local='${localSummary.ogTitle}' live='${liveSummary.ogTitle}'`);
  }

  if (localSummary.twitterCard !== liveSummary.twitterCard) {
    mismatches.push(`twitterCard: local='${localSummary.twitterCard}' live='${liveSummary.twitterCard}'`);
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

function validateRuntimeSignals(summary) {
  const problems = [];
  const consoleErrors = Array.isArray(summary?.consoleErrors) ? summary.consoleErrors : [];
  const pageErrors = Array.isArray(summary?.pageErrors) ? summary.pageErrors : [];
  const brokenImages = Array.isArray(summary?.brokenImages) ? summary.brokenImages : [];
  const unresolvedMaterialIcons = Array.isArray(summary?.unresolvedMaterialIcons)
    ? summary.unresolvedMaterialIcons
    : [];
  const horizontalOverflowPx = Number(summary?.horizontalOverflowPx ?? 0);

  if (consoleErrors.length > 0) problems.push(`console error: ${consoleErrors[0]}`);
  if (pageErrors.length > 0) problems.push(`uncaught page error: ${pageErrors[0]}`);
  if (Number.isFinite(horizontalOverflowPx) && horizontalOverflowPx > 1) {
    problems.push(`horizontal overflow: ${horizontalOverflowPx}px`);
  }
  if (brokenImages.length > 0) {
    problems.push(`broken image: ${brokenImages[0]?.src || 'unknown source'}`);
  }
  if (unresolvedMaterialIcons.length > 0) {
    problems.push(`unresolved material icon: ${unresolvedMaterialIcons[0]}`);
  }

  return problems;
}

function validateLocalSummary(summary, { declaredNotFoundRoute = false } = {}) {
  const problems = [];

  if (!summary.title) problems.push('missing title');
  if (!summary.description) problems.push('missing meta description');
  if (!summary.canonical) problems.push('missing canonical link');
  if (!summary.robots) problems.push('missing robots meta');
  if (!summary.ogTitle) problems.push('missing og:title meta');
  if (!summary.twitterCard) problems.push('missing twitter:card meta');
  if (!summary.firstHeading) problems.push('missing first heading');
  if (summary.unresolvedDraft) problems.push('page rendered unresolved draft fallback');
  if (/^(?:Página no encontrada|Page not found|页面未找到)(?:\s*\||$)/iu.test(summary.title?.trim() ?? '') && !declaredNotFoundRoute) {
    problems.push('page rendered a not-found title on an ordinary route');
  }
  problems.push(...validateRuntimeSignals(summary));

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
  const inspectSafely = async inspection => {
    try {
      return {
        summary: await inspectPageSummary(inspection),
        error: null,
      };
    } catch (error) {
      return {
        summary: null,
        error: formatInspectionError(error),
      };
    }
  };

  for (const definition of definitions) {
    const draftResult = {
      domain: definition.domain,
      managedAlias: definition.managedAlias,
      routes: [],
    };

    for (const route of definition.routes) {
      const smokePath = route.smokePath || route.path;
      const localUrl = buildLocalUrl(localBaseUrl, definition.domain, smokePath);
      const liveUrl =
        includeLive && definition.managedAlias ? buildLiveUrl(definition.managedAlias, smokePath, liveScheme) : null;
      const viewportResults = {};
      const declaredNotFoundRoute = route.path === '/404';

      for (const viewport of normalizedViewports) {
        const localInspection = await inspectSafely({
          definition,
          route,
          surface: 'local',
          targetUrl: localUrl,
          timeoutMs,
          viewport,
          viewportId: viewport.id,
          attempts: 2,
        });
        const localSummary = localInspection.summary;
        const localProblems = localInspection.error
          ? [`inspection failed: ${localInspection.error}`]
          : validateLocalSummary(localSummary, { declaredNotFoundRoute });

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
            details: `${localSummary?.title || ''} | ${localSummary?.firstHeading || ''}`,
          });
        }

        let liveSummary = null;
        let liveMismatches = [];
        let liveInspectionError = null;
        let liveComparisonSkipped = false;

        if (liveUrl) {
          const liveInspection = await inspectSafely({
            definition,
            route,
            surface: 'live',
            targetUrl: liveUrl,
            timeoutMs,
            viewport,
            viewportId: viewport.id,
            attempts: 3,
          });
          liveSummary = liveInspection.summary;
          liveInspectionError = liveInspection.error;
          if (liveInspectionError) {
            liveMismatches = [`inspection failed: ${liveInspectionError}`];
          } else {
            liveComparisonSkipped = !localSummary;
            const comparisonMismatches = localSummary ? compareSummaries(localSummary, liveSummary) : [];
            const liveProblems = validateLocalSummary(liveSummary, { declaredNotFoundRoute })
              .map(problem => `live ${problem}`);
            liveMismatches = [...new Set([...comparisonMismatches, ...liveProblems])];
          }

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
          localInspectionError: localInspection.error,
          live: liveSummary,
          liveMismatches,
          liveInspectionError,
          liveComparisonSkipped,
        };
      }

      if (includeLive && !liveUrl) {
        skippedLiveRoutes += 1;
      }

      const primaryResult = viewportResults[primaryViewportId] ?? Object.values(viewportResults)[0] ?? null;
      draftResult.routes.push({
        path: route.path,
        smokePath,
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
  isExpectedBrowserConsoleError,
  loadDraftDefinitions,
  normalizeViewportDefinitions,
  resolveSmokeRoutePath,
  runFromCli,
  sanitizeBrowserFinding,
  validateLocalSummary,
};
