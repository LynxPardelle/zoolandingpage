import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
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
const CANONICAL_NOT_FOUND_DOMAIN = 'zoolandingpage.com.mx';

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
  readonly version?: number;
  readonly pageId?: string;
  readonly domain?: string;
  readonly rootIds?: readonly string[];
  readonly modalRootIds?: readonly string[];
  readonly seo?: {
    readonly canonical?: string;
  };
  readonly structuredData?: unknown;
  readonly analytics?: unknown;
};

type TRuntimeBundlePayload = {
  readonly siteConfig?: unknown;
  readonly pageConfig?: unknown;
};

type TLocalComponentsPayload = {
  readonly version?: number;
  readonly domain?: string;
  readonly pageId?: string;
  readonly components?: readonly Record<string, unknown>[];
};

type TLocalVariablesPayload = {
  readonly version?: number;
  readonly domain?: string;
  readonly pageId?: string;
  readonly variables?: Record<string, unknown>;
  readonly computed?: Record<string, unknown>;
};

type TLocalAngoraCombosPayload = {
  readonly version?: number;
  readonly domain?: string;
  readonly pageId?: string;
  readonly combos?: Record<string, readonly string[]>;
};

type TLocalI18nPayload = {
  readonly version?: number;
  readonly domain?: string;
  readonly pageId?: string;
  readonly lang?: string;
  readonly dictionary?: Record<string, unknown>;
};

type TLocalSiteConfig = Record<string, unknown> & {
  readonly domain?: string;
  readonly aliases?: readonly string[];
  readonly defaultPageId?: string;
  readonly notFoundPageId?: string;
  readonly routes?: readonly TSiteConfigRouteEntry[];
  readonly sitemap?: {
    readonly urls?: readonly string[];
    readonly excludePaths?: readonly string[];
  };
  readonly lifecycle?: unknown;
  readonly site?: {
    readonly seo?: {
      readonly canonicalOrigin?: string;
    };
  };
};

type TLocalRuntimeBundlePayload = {
  readonly version: number;
  readonly domain: string;
  readonly pageId: string;
  readonly sourceStage: 'draft';
  readonly lang?: string;
  readonly generatedAt: string;
  readonly route?: TSiteConfigRouteEntry | null;
  readonly lifecycle?: unknown;
  readonly siteConfig: TLocalSiteConfig;
  readonly pageConfig: TLocalPageConfig;
  readonly components: TLocalComponentsPayload;
  readonly variables?: TLocalVariablesPayload | null;
  readonly angoraCombos?: TLocalAngoraCombosPayload | null;
  readonly i18n?: TLocalI18nPayload | null;
  readonly metadata: Record<string, unknown>;
};

type TLocalRuntimePageResolution = {
  readonly requestedDomain: string;
  readonly loadDomain: string;
  readonly resolvedDomain: string;
  readonly pageId: string;
  readonly route: TSiteConfigRouteEntry | null;
  readonly siteConfig: TLocalSiteConfig;
  readonly statusCode: 200 | 404;
  readonly notFound: boolean;
  readonly fallbackFromDomain?: string;
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

function isLocalHost(value: unknown): boolean {
  const normalized = normalizeHost(value);
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
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

function resolveLocalDomainFolder(domain: string): string | null {
  const siteConfigPath = resolveSiteConfigPath(domain);
  return siteConfigPath ? dirname(siteConfigPath) : null;
}

function readLocalDraftJson<T>(domain: string, pageId: string | null, fileName: string): T | null {
  const domainFolder = resolveLocalDomainFolder(domain);
  if (!domainFolder) {
    return null;
  }

  const filePath = pageId
    ? join(domainFolder, pageId, fileName)
    : join(domainFolder, fileName);
  return readJsonFile(filePath) as T | null;
}

function deepMergeRecord(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    const existing = merged[key];
    if (isRecord(existing) && isRecord(value) && !Array.isArray(value)) {
      merged[key] = deepMergeRecord(existing, value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function mergeLocalComponents(
  domain: string,
  pageId: string,
  payloads: readonly (TLocalComponentsPayload | null)[],
): TLocalComponentsPayload | null {
  const entries = new Map<string, Record<string, unknown>>();

  payloads.forEach((payload) => {
    payload?.components?.forEach((component) => {
      const id = String(component?.['id'] ?? '').trim();
      if (!id) {
        return;
      }

      entries.set(id, {
        ...component,
        domain: String(component['domain'] ?? payload.domain ?? domain).trim() || domain,
        pageId: String(component['pageId'] ?? payload.pageId ?? pageId).trim() || pageId,
      });
    });
  });

  if (entries.size === 0) {
    return null;
  }

  return {
    version: payloads.find((payload) => payload?.version)?.version ?? 1,
    domain,
    pageId,
    components: Array.from(entries.values()),
  };
}

function mergeLocalVariables(
  domain: string,
  pageId: string,
  payloads: readonly (TLocalVariablesPayload | null)[],
): TLocalVariablesPayload | null {
  const availablePayloads = payloads.filter((payload): payload is TLocalVariablesPayload => !!payload);
  if (availablePayloads.length === 0) {
    return null;
  }

  return availablePayloads.reduce<TLocalVariablesPayload>((merged, payload) => ({
    version: payload.version ?? merged.version,
    domain,
    pageId,
    variables: deepMergeRecord(merged.variables ?? {}, isRecord(payload.variables) ? payload.variables : {}),
    computed: isRecord(merged.computed) || isRecord(payload.computed)
      ? deepMergeRecord(
        isRecord(merged.computed) ? merged.computed : {},
        isRecord(payload.computed) ? payload.computed : {},
      )
      : undefined,
  }), {
    version: availablePayloads[0].version ?? 1,
    domain,
    pageId,
    variables: {},
  });
}

function mergeLocalAngoraCombos(
  domain: string,
  pageId: string,
  payloads: readonly (TLocalAngoraCombosPayload | null)[],
): TLocalAngoraCombosPayload | null {
  const availablePayloads = payloads.filter((payload): payload is TLocalAngoraCombosPayload => !!payload);
  if (availablePayloads.length === 0) {
    return null;
  }

  return availablePayloads.reduce<TLocalAngoraCombosPayload>((merged, payload) => ({
    version: payload.version ?? merged.version,
    domain,
    pageId,
    combos: {
      ...merged.combos,
      ...(isRecord(payload.combos) ? payload.combos : {}),
    } as Record<string, readonly string[]>,
  }), {
    version: availablePayloads[0].version ?? 1,
    domain,
    pageId,
    combos: {},
  });
}

function mergeLocalI18n(
  domain: string,
  pageId: string,
  lang: string,
  payloads: readonly (TLocalI18nPayload | null)[],
): TLocalI18nPayload | null {
  const availablePayloads = payloads.filter((payload): payload is TLocalI18nPayload => !!payload);
  if (availablePayloads.length === 0) {
    return null;
  }

  return availablePayloads.reduce<TLocalI18nPayload>((merged, payload) => ({
    version: payload.version ?? merged.version,
    domain,
    pageId,
    lang: payload.lang || merged.lang,
    dictionary: deepMergeRecord(merged.dictionary ?? {}, isRecord(payload.dictionary) ? payload.dictionary : {}),
  }), {
    version: availablePayloads[0].version ?? 1,
    domain,
    pageId,
    lang,
    dictionary: {},
  });
}

function getLocaleCandidates(lang: string): readonly string[] {
  const normalized = String(lang ?? '').trim().toLowerCase();
  const candidates = new Set<string>();
  if (normalized) {
    candidates.add(normalized);
    const base = normalized.split('-')[0];
    if (base) {
      candidates.add(base);
    }
  }

  candidates.add('es');
  candidates.add('en');
  return Array.from(candidates);
}

function loadLocalComponents(domain: string, pageId: string): TLocalComponentsPayload | null {
  return mergeLocalComponents(domain, pageId, [
    readLocalDraftJson<TLocalComponentsPayload>(domain, null, 'components.json'),
    readLocalDraftJson<TLocalComponentsPayload>(domain, pageId, 'components.json'),
  ]);
}

function loadLocalVariables(domain: string, pageId: string): TLocalVariablesPayload | null {
  return mergeLocalVariables(domain, pageId, [
    readLocalDraftJson<TLocalVariablesPayload>(domain, null, 'variables.json'),
    readLocalDraftJson<TLocalVariablesPayload>(domain, pageId, 'variables.json'),
  ]);
}

function loadLocalAngoraCombos(domain: string, pageId: string): TLocalAngoraCombosPayload | null {
  return mergeLocalAngoraCombos(domain, pageId, [
    readLocalDraftJson<TLocalAngoraCombosPayload>(domain, null, 'angora-combos.json'),
    readLocalDraftJson<TLocalAngoraCombosPayload>(domain, pageId, 'angora-combos.json'),
  ]);
}

function loadLocalI18n(domain: string, pageId: string, lang: string): TLocalI18nPayload | null {
  const domainFolder = resolveLocalDomainFolder(domain);
  if (!domainFolder) {
    return null;
  }

  for (const candidate of getLocaleCandidates(lang)) {
    const sitePayload = readJsonFile(join(domainFolder, 'i18n', `${candidate}.json`)) as TLocalI18nPayload | null;
    const pagePayload = readJsonFile(join(domainFolder, pageId, 'i18n', `${candidate}.json`)) as TLocalI18nPayload | null;
    const merged = mergeLocalI18n(domain, pageId, candidate, [sitePayload, pagePayload]);
    if (merged) {
      return merged;
    }
  }

  return null;
}

function resolveLocalRoute(siteConfig: TLocalSiteConfig | null, path: string, pageId?: string): TSiteConfigRouteEntry | undefined {
  const routes = Array.isArray(siteConfig?.routes) ? siteConfig.routes : [];
  const normalizedPath = normalizeRoutePath(path);
  const normalizedPageId = String(pageId ?? '').trim();

  if (normalizedPageId) {
    return routes.find((route) => String(route.pageId ?? '').trim() === normalizedPageId);
  }

  return routes.find((route) => normalizeRoutePath(route.path) === normalizedPath);
}

function resolveLocalRuntimePageId(siteConfig: TLocalSiteConfig | null, path: string, pageId?: string): string {
  const explicitPageId = String(pageId ?? '').trim();
  if (explicitPageId) {
    return explicitPageId;
  }

  const route = resolveLocalRoute(siteConfig, path);
  return String(route?.pageId ?? siteConfig?.defaultPageId ?? 'default').trim() || 'default';
}

function resolveLocalNotFoundPageId(siteConfig: TLocalSiteConfig | null): string {
  const configured = String(siteConfig?.notFoundPageId ?? '').trim();
  if (configured) {
    return configured;
  }

  return String(resolveLocalRoute(siteConfig, '/404')?.pageId ?? '').trim();
}

function hasRenderableLocalPage(domain: string, pageId: string): boolean {
  const pageConfig = loadLocalPageConfig(domain, pageId);
  const components = loadLocalComponents(domain, pageId);
  return String(pageConfig?.pageId ?? '').trim() === pageId
    && Array.isArray(pageConfig?.rootIds)
    && pageConfig.rootIds.length > 0
    && String(components?.pageId ?? '').trim() === pageId
    && Array.isArray(components?.components)
    && components.components.length > 0;
}

function resolveLocalNotFoundRuntimePage(
  loadDomain: string,
  siteConfig: TLocalSiteConfig | null,
  requestedDomain: string,
  fallbackFromDomain?: string,
): TLocalRuntimePageResolution | null {
  const pageId = resolveLocalNotFoundPageId(siteConfig);
  if (!siteConfig || !pageId || !hasRenderableLocalPage(loadDomain, pageId)) {
    return null;
  }

  const resolvedDomain = String(siteConfig.domain ?? loadDomain).trim() || loadDomain;
  return {
    requestedDomain,
    loadDomain,
    resolvedDomain,
    pageId,
    route: resolveLocalRoute(siteConfig, '/404', pageId) ?? null,
    siteConfig,
    statusCode: 404,
    notFound: true,
    fallbackFromDomain,
  };
}

function resolveCanonicalLocalNotFoundRuntimePage(requestedDomain: string): TLocalRuntimePageResolution | null {
  const siteConfig = loadLocalSiteConfig(CANONICAL_NOT_FOUND_DOMAIN);
  return resolveLocalNotFoundRuntimePage(
    CANONICAL_NOT_FOUND_DOMAIN,
    siteConfig,
    requestedDomain,
    requestedDomain === CANONICAL_NOT_FOUND_DOMAIN ? undefined : requestedDomain,
  );
}

function resolveLocalRuntimePage(opts: {
  readonly requestedDomain: string;
  readonly siteConfig: TLocalSiteConfig;
  readonly path: string;
  readonly pageId?: string;
}): TLocalRuntimePageResolution | null {
  const explicitPageId = String(opts.pageId ?? '').trim();
  const normalizedPath = normalizeRoutePath(opts.path);
  const resolvedDomain = String(opts.siteConfig.domain ?? opts.requestedDomain).trim() || opts.requestedDomain;

  if (explicitPageId) {
    return {
      requestedDomain: opts.requestedDomain,
      loadDomain: opts.requestedDomain,
      resolvedDomain,
      pageId: explicitPageId,
      route: resolveLocalRoute(opts.siteConfig, normalizedPath, explicitPageId) ?? null,
      siteConfig: opts.siteConfig,
      statusCode: 200,
      notFound: false,
    };
  }

  const route = resolveLocalRoute(opts.siteConfig, normalizedPath);
  if (route) {
    const pageId = String(route.pageId ?? '').trim() || resolveLocalRuntimePageId(opts.siteConfig, normalizedPath);
    return {
      requestedDomain: opts.requestedDomain,
      loadDomain: opts.requestedDomain,
      resolvedDomain,
      pageId,
      route,
      siteConfig: opts.siteConfig,
      statusCode: 200,
      notFound: false,
    };
  }

  if (normalizedPath === '/') {
    return {
      requestedDomain: opts.requestedDomain,
      loadDomain: opts.requestedDomain,
      resolvedDomain,
      pageId: String(opts.siteConfig.defaultPageId ?? 'default').trim() || 'default',
      route: null,
      siteConfig: opts.siteConfig,
      statusCode: 200,
      notFound: false,
    };
  }

  return resolveLocalNotFoundRuntimePage(opts.requestedDomain, opts.siteConfig, opts.requestedDomain)
    ?? resolveCanonicalLocalNotFoundRuntimePage(opts.requestedDomain);
}

function loadLocalRuntimeBundle(opts: {
  readonly domain: string;
  readonly pageId?: string;
  readonly path?: string;
  readonly lang?: string;
}): TLocalRuntimeBundlePayload | null {
  const requestedDomain = normalizeHost(opts.domain);
  if (!requestedDomain) {
    return null;
  }

  const normalizedPath = normalizeRoutePath(opts.path);
  const siteConfig = loadLocalSiteConfig(requestedDomain);
  const resolution = siteConfig
    ? resolveLocalRuntimePage({
      requestedDomain,
      siteConfig,
      path: normalizedPath,
      pageId: opts.pageId,
    })
    : resolveCanonicalLocalNotFoundRuntimePage(requestedDomain);
  if (!resolution) {
    return null;
  }

  const pageId = resolution.pageId;
  const pageConfig = loadLocalPageConfig(resolution.loadDomain, pageId);
  const components = loadLocalComponents(resolution.loadDomain, pageId);
  if (!pageConfig || !components) {
    return null;
  }

  const resolvedDomain = resolution.resolvedDomain;
  const route = resolution.route;
  const lang = String(opts.lang ?? '').trim() || 'es';

  return {
    version: 1,
    domain: resolvedDomain,
    pageId,
    sourceStage: 'draft',
    lang,
    generatedAt: new Date().toISOString(),
    route,
    lifecycle: resolution.siteConfig.lifecycle,
    siteConfig: {
      ...resolution.siteConfig,
      domain: resolvedDomain,
    },
    pageConfig: {
      ...pageConfig,
      domain: resolvedDomain,
      pageId,
    },
    components: {
      ...components,
      domain: resolvedDomain,
      pageId,
    },
    variables: loadLocalVariables(resolution.loadDomain, pageId),
    angoraCombos: loadLocalAngoraCombos(resolution.loadDomain, pageId),
    i18n: loadLocalI18n(resolution.loadDomain, pageId, lang),
    metadata: {
      source: 'local-drafts',
      requestedDomain,
      loadDomain: resolution.loadDomain,
      resolvedPath: normalizedPath,
      statusCode: resolution.statusCode,
      notFound: resolution.notFound,
      fallbackFromDomain: resolution.fallbackFromDomain,
    },
  };
}

function loadLocalDebugWorkspacePayload(kind: string): Record<string, unknown> | null {
  const draftsFolder = resolveDraftsFolder();
  if (!draftsFolder) {
    return null;
  }

  const fileNameByKind: Record<string, string> = {
    'page-config': 'page-config.json',
    components: 'components.json',
    'angora-combos': 'angora-combos.json',
  };
  const fileName = fileNameByKind[kind];
  if (!fileName) {
    return null;
  }

  return readJsonFile(join(draftsFolder, DEBUG_DRAFT_DIRECTORY, 'debug-workspace', fileName));
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

function resolveNotFoundLookupDomain(req: express.Request, host: string): string {
  const draftDomain = normalizeHost(req.query['draftDomain']);
  if (isLocalHost(host) && draftDomain) {
    return draftDomain;
  }

  return host;
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
  if (!canonical || canonical.includes('{{')) {
    return new URL(normalizeRoutePath(routePath), origin).toString();
  }

  try {
    return new URL(canonical, origin).toString();
  } catch {
    return new URL(normalizeRoutePath(routePath), origin).toString();
  }
}

function resolveConfiguredSitemapUrls(origin: string, siteConfig: TLocalSiteConfig | null): readonly string[] {
  const configuredUrls = Array.isArray(siteConfig?.sitemap?.urls)
    ? siteConfig.sitemap.urls
    : [];

  return configuredUrls
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        return new URL(entry, origin).toString();
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

async function buildSitemapXml(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): Promise<string> {
  const origin = `${resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '')}/`;
  const excludedPaths = new Set(
    (Array.isArray(siteConfig?.sitemap?.excludePaths) ? siteConfig.sitemap.excludePaths : [])
      .map((entry) => normalizeRoutePath(entry)),
  );
  const notFoundPageId = resolveLocalNotFoundPageId(siteConfig);
  const rawRoutes = Array.isArray(siteConfig?.routes) && siteConfig.routes.length > 0
    ? siteConfig.routes
    : [{ path: '/' }];
  const sitemapRoutes = rawRoutes.filter((route) => {
    const routePath = normalizeRoutePath(route.path);
    const routePageId = String(route.pageId ?? '').trim();
    return !excludedPaths.has(routePath)
      && routePath !== '/404'
      && (!notFoundPageId || routePageId !== notFoundPageId);
  });
  const sitemapDomain = normalizeHost(host) || normalizeHost(siteConfig?.domain);
  const resolvedUrls = await Promise.all(sitemapRoutes.map(async (route) => {
    const pageConfig = sitemapDomain ? await loadPageConfigForRoute(sitemapDomain, route) : null;
    return resolveCanonicalSitemapUrl(origin, normalizeRoutePath(route.path), pageConfig);
  }));
  const urls = Array.from(new Set([
    ...resolvedUrls,
    ...resolveConfiguredSitemapUrls(origin, siteConfig),
  ]));
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

async function shouldServeNotFoundDocument(req: express.Request): Promise<boolean> {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const normalizedPath = normalizeRoutePath(req.path);
  const siteConfig = await loadSiteConfigForHost(lookupDomain);

  if (!siteConfig) {
    return (!isLocalHost(host) || lookupDomain !== host) && normalizedPath !== '/';
  }

  if (resolveLocalRoute(siteConfig, normalizedPath)) {
    return false;
  }

  return normalizedPath !== '/';
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
app.use(compression({ threshold: 1024 }));
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: [
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-port',
    'x-forwarded-proto',
    'x-forwarded-prefix',
    'x-forwarded-server',
  ],
});

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

app.get(['/health', '/healthz'], (_req, res) => {
  res
    .status(200)
    .type('text/plain')
    .set('Cache-Control', 'no-store')
    .send('ok\n');
});

app.get('/api/debug/drafts', (_req, res) => {
  res.json({ drafts: listDraftRegistryEntries() });
});

app.get('/runtime-bundle', (req, res, next) => {
  try {
    const payload = loadLocalRuntimeBundle({
      domain: String(req.query['domain'] ?? ''),
      pageId: String(req.query['pageId'] ?? ''),
      path: String(req.query['path'] ?? req.path ?? '/'),
      lang: String(req.query['lang'] ?? ''),
    });

    if (!payload) {
      next();
      return;
    }

    res
      .status(200)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/debug-workspace/:kind', (req, res, next) => {
  try {
    const payload = loadLocalDebugWorkspacePayload(String(req.params['kind'] ?? ''));
    if (!payload) {
      next();
      return;
    }

    res
      .status(200)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .json(payload);
  } catch (error) {
    next(error);
  }
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
  shouldServeNotFoundDocument(req)
    .then((notFoundDocument) => angularApp.handle(req)
      .then((response) => {
        if (!response) {
          next();
          return;
        }

        if (!notFoundDocument) {
          writeResponseToNodeResponse(response, res);
          return;
        }

        writeResponseToNodeResponse(new Response(response.body, {
          headers: response.headers,
          status: 404,
          statusText: 'Not Found',
        }), res);
      }))
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
