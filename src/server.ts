import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const DRAFTS_FOLDER_NAME = 'drafts';
const DEBUG_DRAFT_DIRECTORY = '_debug';
const DEFAULT_CONFIG_API_URL = String(process.env['CONFIG_API_URL'] ?? 'https://api.zoolandingpage.com.mx').trim();
const LOCAL_NOTE_FOLDER_NAMES = new Set(['ai_notes', 'findings', 'errors-reports']);
const SITE_CONFIG_CACHE_TTL_MS = 60_000;
const SITE_CONFIG_CACHE_MAX_SIZE = 200;

type TSiteConfigCacheEntry = {
  readonly path: string | null;
  readonly expiresAt: number;
};

type TDraftRegistryEntry = {
  readonly domain: string;
  readonly pageId: string;
};

type TSiteConfigRouteEntry = {
  readonly path?: string;
  readonly pageId?: string;
};

type TLocalPageConfig = {
  readonly seo?: {
    readonly canonical?: string;
  };
};

type TRuntimeBundlePayload = {
  readonly siteConfig?: unknown;
  readonly pageConfig?: unknown;
};

type TLocalSiteConfig = {
  readonly domain?: string;
  readonly aliases?: readonly string[];
  readonly routes?: readonly TSiteConfigRouteEntry[];
  readonly site?: {
    readonly seo?: {
      readonly canonicalOrigin?: string;
    };
  };
};

const siteConfigPathCache = new Map<string, TSiteConfigCacheEntry>();

function setCachedSiteConfigPath(domain: string, path: string | null): void {
  if (siteConfigPathCache.size >= SITE_CONFIG_CACHE_MAX_SIZE) {
    const oldestKey = siteConfigPathCache.keys().next().value;
    if (oldestKey !== undefined) {
      siteConfigPathCache.delete(oldestKey);
    }
  }
  siteConfigPathCache.set(domain, { path, expiresAt: Date.now() + SITE_CONFIG_CACHE_TTL_MS });
}

function isDirectory(path: string): boolean {
  try {
    return readdirSync(path, { withFileTypes: true }).length >= 0;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function resolveDraftsFolder(): string | null {
  const candidates = [
    join(process.cwd(), DRAFTS_FOLDER_NAME),
    join(browserDistFolder, DRAFTS_FOLDER_NAME),
  ];

  return candidates.find((candidate) => existsSync(candidate) && isDirectory(candidate)) ?? null;
}

function normalizeHost(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function normalizeRoutePath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '/') {
    return '/';
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveSiteConfigPath(domain: string): string | null {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain) {
    return null;
  }

  const cached = siteConfigPathCache.get(normalizedDomain);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.path;
  }

  const draftsFolder = resolveDraftsFolder();
  if (!draftsFolder) {
    setCachedSiteConfigPath(normalizedDomain, null);
    return null;
  }

  const directPath = join(draftsFolder, normalizedDomain, 'site-config.json');
  if (existsSync(directPath)) {
    setCachedSiteConfigPath(normalizedDomain, directPath);
    return directPath;
  }

  const entries = readdirSync(draftsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name !== DEBUG_DRAFT_DIRECTORY);

  for (const entry of entries) {
    const siteConfigPath = join(draftsFolder, entry.name, 'site-config.json');
    if (!existsSync(siteConfigPath)) {
      continue;
    }

    const siteConfig = readJsonFile(siteConfigPath) as TLocalSiteConfig | null;
    const aliases = Array.isArray(siteConfig?.aliases)
      ? siteConfig.aliases.map((alias) => normalizeHost(alias)).filter(Boolean)
      : [];

    if (aliases.includes(normalizedDomain)) {
      setCachedSiteConfigPath(normalizedDomain, siteConfigPath);
      return siteConfigPath;
    }
  }

  setCachedSiteConfigPath(normalizedDomain, null);
  return null;
}

function loadLocalSiteConfig(domain: string): TLocalSiteConfig | null {
  const siteConfigPath = resolveSiteConfigPath(domain);
  if (!siteConfigPath) {
    return null;
  }

  return readJsonFile(siteConfigPath) as TLocalSiteConfig | null;
}

function loadLocalPageConfig(domain: string, pageId: string): TLocalPageConfig | null {
  const normalizedPageId = String(pageId ?? '').trim();
  if (!normalizedPageId) {
    return null;
  }

  const siteConfigPath = resolveSiteConfigPath(domain);
  if (!siteConfigPath) {
    return null;
  }

  return readJsonFile(join(dirname(siteConfigPath), normalizedPageId, 'page-config.json')) as TLocalPageConfig | null;
}

async function loadRuntimeSiteConfig(domain: string): Promise<TLocalSiteConfig | null> {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain || !DEFAULT_CONFIG_API_URL) {
    return null;
  }

  try {
    const url = new URL('/runtime-bundle', `${DEFAULT_CONFIG_API_URL.replace(/\/$/, '')}/`);
    url.searchParams.set('domain', normalizedDomain);
    url.searchParams.set('path', '/');

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as TRuntimeBundlePayload;
    return isRecord(payload?.siteConfig) ? payload.siteConfig as TLocalSiteConfig : null;
  } catch {
    return null;
  }
}

async function loadRuntimePageConfig(domain: string, path: string): Promise<TLocalPageConfig | null> {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain || !DEFAULT_CONFIG_API_URL) {
    return null;
  }

  try {
    const url = new URL('/runtime-bundle', `${DEFAULT_CONFIG_API_URL.replace(/\/$/, '')}/`);
    url.searchParams.set('domain', normalizedDomain);
    url.searchParams.set('path', normalizeRoutePath(path));

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as TRuntimeBundlePayload;
    return isRecord(payload?.pageConfig) ? payload.pageConfig as TLocalPageConfig : null;
  } catch {
    return null;
  }
}

async function loadPageConfigForRoute(domain: string, route: TSiteConfigRouteEntry): Promise<TLocalPageConfig | null> {
  const pageId = String(route.pageId ?? '').trim();
  const localPageConfig = pageId ? loadLocalPageConfig(domain, pageId) : null;
  if (localPageConfig) {
    return localPageConfig;
  }

  return loadRuntimePageConfig(domain, normalizeRoutePath(route.path));
}

async function loadSiteConfigForHost(domain: string): Promise<TLocalSiteConfig | null> {
  return loadLocalSiteConfig(domain) ?? await loadRuntimeSiteConfig(domain);
}

function resolveRequestHost(req: express.Request): string {
  const forwardedHost = String(req.headers['x-forwarded-host'] ?? '')
    .split(',')[0]
    .trim();
  return normalizeHost(forwardedHost || req.headers.host);
}

function resolveRequestProtocol(req: express.Request, host: string): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (forwardedProto) {
    return forwardedProto;
  }

  return host === 'localhost' || host.startsWith('127.') ? 'http' : 'https';
}

function resolveRequestOrigin(req: express.Request, host: string): string {
  if (!host) {
    return 'https://localhost';
  }

  return `${resolveRequestProtocol(req, host)}://${host}`;
}

function resolveCanonicalOrigin(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const configured = String(siteConfig?.site?.seo?.canonicalOrigin ?? '').trim();
  return configured || resolveRequestOrigin(req, host);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRobotsTxt(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const sitemapUrl = `${origin}/sitemap.xml`;
  return ['User-agent: *', 'Allow: /', `Sitemap: ${sitemapUrl}`].join('\n');
}

function resolveCanonicalSitemapUrl(origin: string, routePath: string, pageConfig: TLocalPageConfig | null): string {
  const canonical = String(pageConfig?.seo?.canonical ?? '').trim();
  if (!canonical) {
    return new URL(normalizeRoutePath(routePath), origin).toString();
  }

  try {
    return new URL(canonical, origin).toString();
  } catch {
    return new URL(normalizeRoutePath(routePath), origin).toString();
  }
}

async function buildSitemapXml(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): Promise<string> {
  const origin = `${resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '')}/`;
  const rawRoutes = Array.isArray(siteConfig?.routes) && siteConfig.routes.length > 0
    ? siteConfig.routes
    : [{ path: '/' }];
  const sitemapDomain = normalizeHost(host) || normalizeHost(siteConfig?.domain);
  const resolvedUrls = await Promise.all(rawRoutes.map(async (route) => {
    const pageConfig = sitemapDomain ? await loadPageConfigForRoute(sitemapDomain, route) : null;
    return resolveCanonicalSitemapUrl(origin, normalizeRoutePath(route.path), pageConfig);
  }));
  const urls = Array.from(new Set(resolvedUrls));
  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
  ].join('\n');
}

function listDraftRegistryEntries(): readonly TDraftRegistryEntry[] {
  const draftsFolder = resolveDraftsFolder();
  if (!draftsFolder) {
    return [];
  }

  const domains = readdirSync(draftsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return domains.flatMap((domain) => {
    const domainFolder = join(draftsFolder, domain);
    return readdirSync(domainFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !LOCAL_NOTE_FOLDER_NAMES.has(entry.name))
      .filter((entry) => existsSync(join(domainFolder, entry.name, 'page-config.json')))
      .map((entry) => ({
        domain,
        pageId: entry.name,
      }))
      .sort((left, right) => left.pageId.localeCompare(right.pageId));
  });
}

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

app.get('/api/debug/drafts', (_req, res) => {
  res.json({ drafts: listDraftRegistryEntries() });
});

app.get('/robots.txt', async (req, res) => {
  const host = resolveRequestHost(req);
  const siteConfig = await loadSiteConfigForHost(host);
  res.type('text/plain').send(buildRobotsTxt(req, host, siteConfig));
});

app.get('/sitemap.xml', async (req, res) => {
  const host = resolveRequestHost(req);
  const siteConfig = await loadSiteConfigForHost(host);
  res.type('application/xml').send(await buildSitemapXml(req, host, siteConfig));
});

const draftsFolder = resolveDraftsFolder();

if (draftsFolder) {
  app.use('/drafts', (req, res, next) => {
    const segments = req.path.split('/').filter(Boolean);
    if (segments.some((segment) => LOCAL_NOTE_FOLDER_NAMES.has(segment)) || req.path.toLowerCase().endsWith('.md')) {
      res.sendStatus(404);
      return;
    }

    next();
  }, express.static(draftsFolder, {
    maxAge: '0',
    index: false,
    redirect: false,
  }));
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${ port }`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
