import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isMissingPublishedContentHubArticlePath } from '@/app/shared/utility/content-hub/content-hub-public-route';
import { matchDraftRoute, normalizeDraftRoutePath } from '@/app/shared/utility/route-matching/draft-route-matching';

const browserDistFolder = join(import.meta.dirname, '../browser');
const DRAFTS_FOLDER_NAME = 'drafts';
const DEBUG_DRAFT_DIRECTORY = '_debug';
const DEFAULT_CONFIG_API_BASE_URL = 'https://api.zoolandingpage.com.mx';
const DEFAULT_CONFIG_API_RAW_RUNTIME_BASE_URL = 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';
const DEFAULT_CONFIG_API_URL = String(process.env['CONFIG_API_URL'] ?? DEFAULT_CONFIG_API_BASE_URL).trim();
const DEFAULT_CONFIG_API_SERVER_FALLBACK_URL = String(
  process.env['CONFIG_API_SERVER_FALLBACK_URL']
    ?? process.env['CONFIG_API_RUNTIME_FALLBACK_URL']
    ?? (DEFAULT_CONFIG_API_URL === DEFAULT_CONFIG_API_BASE_URL ? DEFAULT_CONFIG_API_RAW_RUNTIME_BASE_URL : ''),
).trim();
const LOCAL_NOTE_FOLDER_NAMES = new Set(['ai_notes', 'findings', 'errors-reports']);
const SERVER_ONLY_DRAFT_FOLDER_NAMES = new Set(['server']);
const SITE_CONFIG_CACHE_TTL_MS = 60_000;
const SITE_CONFIG_CACHE_MAX_SIZE = 200;
const RUNTIME_BUNDLE_FETCH_ATTEMPTS = 2;
const RUNTIME_BUNDLE_FETCH_RETRY_DELAY_MS = 150;
const CANONICAL_NOT_FOUND_DOMAIN = 'zoolandingpage.com.mx';
const RUNTIME_BUNDLE_BASE_URLS = [
  DEFAULT_CONFIG_API_SERVER_FALLBACK_URL,
  DEFAULT_CONFIG_API_URL,
]
  .map((baseUrl) => baseUrl.replace(/\/$/, ''))
  .filter((baseUrl, index, baseUrls) => baseUrl.length > 0 && baseUrls.indexOf(baseUrl) === index);
const AD_QUERY_PARAMS = new Set([
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);
const SENSITIVE_QUERY_PARAM_PATTERN = /(email|mail|phone|telefono|tel[eé]fono|whatsapp|address|direcci[oó]n|rfc|curp)/i;
const ROBOTS_DISALLOW_PATHS = [
  '/admin/',
  '/api/',
  '/api/debug/',
  '/debug-workspace/',
  '/runtime-bundle',
  '/drafts/',
];
const MANAGED_BROWSER_ICON_ATTR = 'data-zlp-browser-icon';
const DEFAULT_BROWSER_ICON_HREF = '/assets/brand/zoolandingpage-default-favicon.svg';
const STATIC_ALLOWED_HOST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '::1',
  'zoolandingpage.com.mx',
  'zoolandingpage.com',
  '*.zoolandingpage.com',
  'sulandingpage.com.mx',
  '*.sulandingpage.com.mx',
  'sulandingpage.com',
  '*.sulandingpage.com',
  'zoositioweb.com.mx',
  '*.zoositioweb.com.mx',
  'zoositioweb.com',
  '*.zoositioweb.com',
  'test.zoositioweb.com.mx',
  '*.zoolandingpage.com.mx',
  'lynxpardelle.com',
  '*.lynxpardelle.com',
];

type TRuntimeEnvironment = 'local' | 'test' | 'production';

type TEnvironmentGate = Partial<Record<TRuntimeEnvironment, boolean>>;

type TGoogleTagConfig = {
  readonly enabled?: boolean;
  readonly environments?: TEnvironmentGate;
  readonly measurementIds?: readonly string[];
  readonly ga4Ids?: readonly string[];
  readonly adsIds?: readonly string[];
  readonly gtmId?: string;
  readonly sendPageView?: boolean;
  readonly attribution?: Record<string, unknown>;
  readonly events?: Record<string, unknown>;
  readonly conversions?: Record<string, unknown>;
};

type TSearchConsoleConfig = {
  readonly googleSiteVerification?: string;
  readonly htmlFile?: {
    readonly path?: string;
    readonly content?: string;
  };
  readonly environments?: TEnvironmentGate;
};

type TSiteIconConfig = {
  readonly favicon?: string;
  readonly appleTouchIcon?: string;
  readonly maskIcon?: string;
  readonly maskIconColor?: string;
  readonly themeColor?: string;
  readonly manifest?: string;
};

type TSiteSeoConfig = {
  readonly siteName?: string;
  readonly title?: string;
  readonly description?: string;
  readonly robots?: unknown;
  readonly canonical?: string;
  readonly canonicalOrigin?: string;
  readonly enforceCanonicalHost?: boolean;
  readonly forceHttps?: boolean;
  readonly defaultImage?: string;
  readonly openGraph?: Record<string, unknown>;
  readonly twitter?: Record<string, unknown>;
};

type THostOverrideConfig = {
  readonly seo?: TSiteSeoConfig;
  readonly searchConsole?: TSearchConsoleConfig;
  readonly googleTag?: TGoogleTagConfig;
};

type TSiteEnvironmentConfig = {
  readonly aliases?: readonly string[];
};

type TSiteConfigCacheEntry = {
  readonly path: string | null;
  readonly expiresAt: number;
};

type TRuntimeSiteConfigCacheEntry = {
  readonly siteConfig: TLocalSiteConfig | null;
  readonly expiresAt: number;
};

type TDraftRegistryEntry = {
  readonly domain: string;
  readonly pageId: string;
};

type TSiteConfigRouteEntry = {
  readonly path?: string;
  readonly pageId?: string;
  readonly auth?: {
    readonly required?: boolean;
    readonly redirectTo?: string;
  };
};

type TLocalPageConfig = {
  readonly version?: number;
  readonly pageId?: string;
  readonly domain?: string;
  readonly rootIds?: readonly string[];
  readonly modalRootIds?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly seo?: TSiteSeoConfig;
  readonly structuredData?: {
    readonly entries?: readonly unknown[];
  } | unknown;
  readonly analytics?: unknown;
};

type TRuntimeBundlePayload = {
  readonly siteConfig?: unknown;
  readonly pageConfig?: unknown;
  readonly metadata?: unknown;
  readonly pageId?: unknown;
  readonly route?: unknown;
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
  readonly environments?: Record<string, TSiteEnvironmentConfig>;
  readonly defaultPageId?: string;
  readonly notFoundPageId?: string;
  readonly routes?: readonly TSiteConfigRouteEntry[];
  readonly sitemap?: {
    readonly urls?: readonly string[];
    readonly excludePaths?: readonly string[];
  };
  readonly published?: {
    readonly updatedAt?: string;
  };
  readonly draft?: {
    readonly updatedAt?: string;
  };
  readonly lifecycle?: unknown;
  readonly runtime?: {
    readonly auth?: {
      readonly loginPath?: string;
      readonly session?: {
        readonly mode?: string;
      };
    };
    readonly authRemote?: {
      readonly enabled?: boolean;
    };
    readonly contentHubs?: readonly TContentHubRuntimeConfig[];
    readonly analytics?: {
      readonly googleTag?: TGoogleTagConfig;
    };
  };
  readonly site?: {
    readonly appIdentity?: {
      readonly name?: string;
      readonly description?: string;
    };
    readonly i18n?: {
      readonly defaultLanguage?: string;
      readonly supportedLanguages?: readonly unknown[];
    };
    readonly seo?: TSiteSeoConfig;
    readonly icons?: TSiteIconConfig;
    readonly searchConsole?: TSearchConsoleConfig;
    readonly hostOverrides?: Record<string, THostOverrideConfig>;
  };
  readonly defaults?: Record<string, unknown>;
};

type TContentHubRuntimeConfig = {
  readonly hubId?: string;
  readonly routeBasePath?: string;
  readonly listPath?: string;
  readonly defaultLocale?: string;
  readonly publicArticles?: readonly TContentHubPublicArticle[];
  readonly publicTaxonomy?: readonly TContentHubPublicTaxonomy[];
};

type TContentHubPublicArticle = {
  readonly articleId?: string;
  readonly locale?: string;
  readonly status?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly path?: string;
  readonly categorySlug?: string;
  readonly tags?: readonly string[];
  readonly publishedAt?: string;
  readonly updatedAt?: string;
  readonly authorLabel?: string;
  readonly canonicalPath?: string;
  readonly robots?: string;
};

type TContentHubPublicTaxonomy = {
  readonly taxonomyId?: string;
  readonly kind?: string;
  readonly slug?: string;
  readonly label?: string;
  readonly locale?: string;
  readonly visible?: boolean;
  readonly path?: string;
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
const runtimeSiteConfigCache = new Map<string, TRuntimeSiteConfigCacheEntry>();
const AUTH_REDIRECT_STICKY_QUERY_PARAMS = ['draftDomain', 'debugWorkspace', 'lang'] as const;

function setCachedSiteConfigPath(domain: string, path: string | null): void {
  if (siteConfigPathCache.size >= SITE_CONFIG_CACHE_MAX_SIZE) {
    const oldestKey = siteConfigPathCache.keys().next().value;
    if (oldestKey !== undefined) {
      siteConfigPathCache.delete(oldestKey);
    }
  }
  siteConfigPathCache.set(domain, { path, expiresAt: Date.now() + SITE_CONFIG_CACHE_TTL_MS });
}

function setCachedRuntimeSiteConfig(domain: string, siteConfig: TLocalSiteConfig | null): void {
  if (runtimeSiteConfigCache.size >= SITE_CONFIG_CACHE_MAX_SIZE) {
    const oldestKey = runtimeSiteConfigCache.keys().next().value;
    if (oldestKey !== undefined) {
      runtimeSiteConfigCache.delete(oldestKey);
    }
  }

  runtimeSiteConfigCache.set(domain, { siteConfig, expiresAt: Date.now() + SITE_CONFIG_CACHE_TTL_MS });
}

function buildRuntimeSiteConfigCacheKey(domain: string, environment?: string): string {
  const normalizedEnvironment = cleanString(environment);
  return normalizedEnvironment ? `${ normalizedEnvironment }::${ domain }` : domain;
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
    .replace(/:\d+$/, '')
    .replace(/^\[(.*)\]$/, '$1');
}

function isLocalHost(value: unknown): boolean {
  const normalized = normalizeHost(value);
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isSharedTestingPreviewHost(value: unknown): boolean {
  return normalizeHost(value) === 'test.zoolandingpage.com.mx';
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRuntimeEnvironment(value: unknown): TRuntimeEnvironment | null {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'local' || normalized === 'test' || normalized === 'production') {
    return normalized;
  }

  return null;
}

function resolveRuntimeEnvironment(host: string): TRuntimeEnvironment {
  const explicit = normalizeRuntimeEnvironment(process.env['ZLP_RUNTIME_ENV']);
  if (explicit) {
    return explicit;
  }

  if (isLocalHost(host)) {
    return 'local';
  }

  const normalizedHost = normalizeHost(host);
  if (normalizedHost.startsWith('test.') || normalizedHost.includes('.test.')) {
    return 'test';
  }

  return 'production';
}

function isEnabledForEnvironment(environments: TEnvironmentGate | undefined, environment: TRuntimeEnvironment): boolean {
  return environments?.[environment] !== false;
}

function dedupeStrings(values: readonly unknown[], pattern?: RegExp): readonly string[] {
  return values
    .map((entry) => cleanString(entry))
    .filter((entry, index, entries) => entry.length > 0
      && entries.indexOf(entry) === index
      && (!pattern || pattern.test(entry)));
}

function listGoogleMeasurementIds(config: TGoogleTagConfig): readonly string[] {
  return dedupeStrings([...(config.measurementIds ?? []), ...(config.ga4Ids ?? [])], /^(?:G|GT)-[A-Z0-9_-]+$/);
}

function listGoogleAdsIds(config: TGoogleTagConfig): readonly string[] {
  return dedupeStrings(config.adsIds ?? [], /^AW-[A-Z0-9_-]+$/);
}

function mergeGoogleTagConfig(
  base: TGoogleTagConfig | null | undefined,
  override: TGoogleTagConfig | null | undefined,
): TGoogleTagConfig | null {
  if (!base && !override) {
    return null;
  }

  return {
    ...(base ?? {}),
    ...(override ?? {}),
    environments: {
      ...(base?.environments ?? {}),
      ...(override?.environments ?? {}),
    },
    attribution: {
      ...(base?.attribution ?? {}),
      ...(override?.attribution ?? {}),
    },
    events: {
      ...(base?.events ?? {}),
      ...(override?.events ?? {}),
    },
    conversions: {
      ...(base?.conversions ?? {}),
      ...(override?.conversions ?? {}),
    },
  };
}

function mergeSeoConfig(
  base: TSiteSeoConfig | null | undefined,
  override: TSiteSeoConfig | null | undefined,
): TSiteSeoConfig | null {
  if (!base && !override) {
    return null;
  }

  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

function resolveHostOverrideConfig(host: string, siteConfig: TLocalSiteConfig | null): THostOverrideConfig | null {
  const normalizedHost = normalizeHost(host);
  const overrides = siteConfig?.site?.hostOverrides;
  if (!normalizedHost || !overrides || !isRecord(overrides)) {
    return null;
  }

  return Object.entries(overrides).find(([entryHost]) => normalizeHost(entryHost) === normalizedHost)?.[1] ?? null;
}

function resolveEffectiveSeoConfig(host: string, siteConfig: TLocalSiteConfig | null): TSiteSeoConfig | null {
  return mergeSeoConfig(siteConfig?.site?.seo, resolveHostOverrideConfig(host, siteConfig)?.seo);
}

function isProductionAliasHost(host: string, siteConfig: TLocalSiteConfig | null): boolean {
  const normalizedHost = normalizeHost(host);
  const primaryDomain = normalizeHost(siteConfig?.domain);
  if (!normalizedHost || normalizedHost === primaryDomain) {
    return false;
  }

  const aliases = Array.isArray(siteConfig?.aliases) ? siteConfig.aliases : [];
  return aliases.map(normalizeHost).includes(normalizedHost);
}

function shouldEnforceCanonicalHost(
  host: string,
  siteConfig: TLocalSiteConfig | null,
  seo: TSiteSeoConfig | null,
): boolean {
  return seo?.enforceCanonicalHost === true
    || (
      siteConfig?.site?.seo?.enforceCanonicalHost === true
      && isProductionAliasHost(host, siteConfig)
    );
}

function resolveEffectiveGoogleTagConfig(host: string, siteConfig: TLocalSiteConfig | null): TGoogleTagConfig | null {
  return mergeGoogleTagConfig(siteConfig?.runtime?.analytics?.googleTag, resolveHostOverrideConfig(host, siteConfig)?.googleTag);
}

function resolveEffectiveSearchConsoleConfig(host: string, siteConfig: TLocalSiteConfig | null): TSearchConsoleConfig | null {
  return resolveHostOverrideConfig(host, siteConfig)?.searchConsole ?? siteConfig?.site?.searchConsole ?? null;
}

function resolveActiveGoogleTagConfig(host: string, siteConfig: TLocalSiteConfig | null): TGoogleTagConfig | null {
  const config = resolveEffectiveGoogleTagConfig(host, siteConfig);
  if (!config?.enabled || !isEnabledForEnvironment(config.environments, resolveRuntimeEnvironment(host))) {
    return null;
  }

  const hasDestination = listGoogleMeasurementIds(config).length > 0
    || listGoogleAdsIds(config).length > 0
    || /^GTM-[A-Z0-9_-]+$/.test(cleanString(config.gtmId));
  return hasDestination ? config : null;
}

function resolveActiveSearchConsoleConfig(host: string, siteConfig: TLocalSiteConfig | null): TSearchConsoleConfig | null {
  const config = resolveEffectiveSearchConsoleConfig(host, siteConfig);
  if (!config || !isEnabledForEnvironment(config.environments, resolveRuntimeEnvironment(host))) {
    return null;
  }

  return config;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function normalizeRoutePath(value: unknown): string {
  return normalizeDraftRoutePath(value);
}

function buildRuntimeBundleUrl(baseUrl: string, domain: string, routePath: string, environment?: string): string {
  const url = new URL('runtime-bundle', `${baseUrl.replace(/\/$/, '')}/`);
  url.searchParams.set('domain', domain);
  url.searchParams.set('path', normalizeRoutePath(routePath));
  const normalizedEnvironment = cleanString(environment);
  if (normalizedEnvironment) {
    url.searchParams.set('environment', normalizedEnvironment);
  }
  return url.toString();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRuntimeBundlePayload(
  baseUrl: string,
  domain: string,
  routePath: string,
  environment?: string,
): Promise<TRuntimeBundlePayload | null> {
  const url = buildRuntimeBundleUrl(baseUrl, domain, routePath, environment);

  for (let attempt = 1; attempt <= RUNTIME_BUNDLE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status >= 500 && attempt < RUNTIME_BUNDLE_FETCH_ATTEMPTS) {
          await wait(RUNTIME_BUNDLE_FETCH_RETRY_DELAY_MS * attempt);
          continue;
        }

        return null;
      }

      return await response.json() as TRuntimeBundlePayload;
    } catch {
      if (attempt >= RUNTIME_BUNDLE_FETCH_ATTEMPTS) {
        return null;
      }

      await wait(RUNTIME_BUNDLE_FETCH_RETRY_DELAY_MS * attempt);
    }
  }

  return null;
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectSiteConfigAliases(siteConfig: TLocalSiteConfig | null): readonly string[] {
  const aliases = Array.isArray(siteConfig?.aliases) ? siteConfig.aliases : [];
  const environments = siteConfig?.environments;
  const environmentAliases = isRecord(environments)
    ? Object.values(environments)
      .flatMap((environment) => Array.isArray(environment?.aliases) ? environment.aliases : [])
    : [];
  const hostOverrides = siteConfig?.site?.hostOverrides;
  const hostOverrideAliases = isRecord(hostOverrides)
    ? Object.keys(hostOverrides)
    : [];

  return dedupeStrings([
    ...aliases,
    ...environmentAliases,
    ...hostOverrideAliases,
  ]).map(normalizeHost).filter(Boolean);
}

function collectSiteConfigAllowedHosts(siteConfig: TLocalSiteConfig | null): readonly string[] {
  return dedupeStrings([
    siteConfig?.domain,
    ...collectSiteConfigAliases(siteConfig),
  ]).map(normalizeHost).filter(Boolean);
}

function isHostAllowedByPattern(host: string, allowedPattern: string): boolean {
  const normalizedHost = normalizeHost(host);
  const pattern = normalizeHost(allowedPattern);
  if (!normalizedHost || !pattern) {
    return false;
  }

  if (normalizedHost === pattern) {
    return true;
  }

  if (pattern.startsWith('*.')) {
    return normalizedHost.endsWith(pattern.slice(1));
  }

  return false;
}

function isStaticallyAllowedHost(host: string): boolean {
  return STATIC_ALLOWED_HOST_PATTERNS.some((pattern) => isHostAllowedByPattern(host, pattern));
}

function isSiteConfigAllowedHost(host: string, siteConfig: TLocalSiteConfig | null): boolean {
  const normalizedHost = normalizeHost(host);
  return !!normalizedHost && collectSiteConfigAllowedHosts(siteConfig).includes(normalizedHost);
}

async function isAllowedRequestHost(host: string): Promise<boolean> {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return false;
  }

  if (isStaticallyAllowedHost(normalizedHost)) {
    return true;
  }

  return isSiteConfigAllowedHost(normalizedHost, await loadSiteConfigForHost(normalizedHost));
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
    const aliases = collectSiteConfigAliases(siteConfig);

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

function resolveLocalPageConfigPath(domain: string, pageId: string): string | null {
  const normalizedPageId = String(pageId ?? '').trim();
  if (!normalizedPageId) {
    return null;
  }

  const siteConfigPath = resolveSiteConfigPath(domain);
  if (!siteConfigPath) {
    return null;
  }

  return join(dirname(siteConfigPath), normalizedPageId, 'page-config.json');
}

function loadLocalPageConfig(domain: string, pageId: string): TLocalPageConfig | null {
  const pageConfigPath = resolveLocalPageConfigPath(domain, pageId);
  if (!pageConfigPath) {
    return null;
  }

  return readJsonFile(pageConfigPath) as TLocalPageConfig | null;
}

function resolveFileUpdatedAt(filePath: string | null): string | undefined {
  if (!filePath) {
    return undefined;
  }

  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return undefined;
  }
}

function resolveLocalPageConfigUpdatedAt(domain: string, pageId: string): string | undefined {
  return resolveFileUpdatedAt(resolveLocalPageConfigPath(domain, pageId));
}

function resolveLocalSiteConfigUpdatedAt(domain: string): string | undefined {
  return resolveFileUpdatedAt(resolveSiteConfigPath(domain));
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

  return matchDraftRoute(routes, normalizedPath)?.route;
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
    if (isMissingPublishedContentHubArticlePath(opts.siteConfig.runtime?.contentHubs, normalizedPath)) {
      return resolveLocalNotFoundRuntimePage(opts.requestedDomain, opts.siteConfig, opts.requestedDomain);
    }

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

async function loadRuntimeSiteConfig(domain: string, environment?: string): Promise<TLocalSiteConfig | null> {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain || RUNTIME_BUNDLE_BASE_URLS.length === 0) {
    return null;
  }

  const cacheKey = buildRuntimeSiteConfigCacheKey(normalizedDomain, environment);
  const cached = runtimeSiteConfigCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.siteConfig;
  }

  for (const baseUrl of RUNTIME_BUNDLE_BASE_URLS) {
    const payload = await fetchRuntimeBundlePayload(baseUrl, normalizedDomain, '/', environment);
    if (isRecord(payload?.siteConfig)) {
      const siteConfig = payload.siteConfig as TLocalSiteConfig;
      setCachedRuntimeSiteConfig(cacheKey, siteConfig);
      return siteConfig;
    }
  }

  setCachedRuntimeSiteConfig(cacheKey, null);
  return null;
}

async function loadRuntimePageConfig(domain: string, path: string, environment?: string): Promise<TLocalPageConfig | null> {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain || RUNTIME_BUNDLE_BASE_URLS.length === 0) {
    return null;
  }

  for (const baseUrl of RUNTIME_BUNDLE_BASE_URLS) {
    const payload = await fetchRuntimeBundlePayload(baseUrl, normalizedDomain, path, environment);
    if (isRecord(payload?.pageConfig)) {
      return payload.pageConfig as TLocalPageConfig;
    }
  }

  return null;
}

async function loadRuntimeRouteStatus(domain: string, path: string, environment?: string): Promise<200 | 404 | null> {
  const normalizedDomain = normalizeHost(domain);
  if (!normalizedDomain || RUNTIME_BUNDLE_BASE_URLS.length === 0) {
    return null;
  }

  const normalizedPath = normalizeRoutePath(path);
  for (const baseUrl of RUNTIME_BUNDLE_BASE_URLS) {
    const payload = await fetchRuntimeBundlePayload(baseUrl, normalizedDomain, normalizedPath, environment);
    if (!payload) {
      continue;
    }

    const metadata = isRecord(payload.metadata) ? payload.metadata : {};
    const statusCode = Number(metadata['statusCode']);
    if (statusCode === 404 || metadata['notFound'] === true) {
      return 404;
    }

    const siteConfig = isRecord(payload.siteConfig) ? payload.siteConfig as TLocalSiteConfig : null;
    const route = isRecord(payload.route) ? payload.route : null;
    const routePath = normalizeRoutePath(route?.['path']);
    const pageId = String(payload.pageId ?? '').trim();
    const notFoundPageId = resolveLocalNotFoundPageId(siteConfig);
    if (routePath === '/404' || (!!notFoundPageId && pageId === notFoundPageId)) {
      return 404;
    }

    return 200;
  }

  return null;
}

async function loadPageConfigForRoute(
  domain: string,
  route: TSiteConfigRouteEntry,
  environment?: string,
): Promise<TLocalPageConfig | null> {
  const pageId = String(route.pageId ?? '').trim();
  const localPageConfig = pageId ? loadLocalPageConfig(domain, pageId) : null;
  if (localPageConfig) {
    return localPageConfig;
  }

  return loadRuntimePageConfig(domain, normalizeRoutePath(route.path), environment);
}

async function loadSiteConfigForHost(domain: string, environment?: string): Promise<TLocalSiteConfig | null> {
  return loadLocalSiteConfig(domain) ?? await loadRuntimeSiteConfig(domain, environment);
}

type THostHeaderValidationResult =
  | {
    readonly ok: true;
    readonly host: string;
    readonly allowedHosts?: readonly string[];
  }
  | {
    readonly ok: false;
    readonly message: string;
  };

const TRUST_PROXY_HEADERS = [
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-forwarded-prefix',
  'x-forwarded-server',
];
const angularAppEngines = new Map<string, AngularNodeAppEngine>();

function firstHeaderValue(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? '').split(',')[0].trim();
}

function validateHostHeaderValue(headerName: string, headerValue: string): THostHeaderValidationResult {
  const value = firstHeaderValue(headerValue);
  if (!value) {
    return { ok: false, message: `Header "${headerName}" is required.` };
  }

  const url = `http://${value}`;
  if (!URL.canParse(url)) {
    return { ok: false, message: `Header "${headerName}" contains an invalid value.` };
  }

  const parsed = new URL(url);
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    return { ok: false, message: `Header "${headerName}" contains characters that are not allowed.` };
  }

  const host = normalizeHost(parsed.hostname);
  if (!host) {
    return { ok: false, message: `Header "${headerName}" does not contain a hostname.` };
  }

  return { ok: true, host };
}

async function validateRequestAllowedHosts(req: express.Request): Promise<THostHeaderValidationResult> {
  const headerEntries = [
    ['host', firstHeaderValue(req.headers.host)],
    ['x-forwarded-host', firstHeaderValue(req.headers['x-forwarded-host'])],
  ] as const;

  const hosts = new Set<string>();
  for (const [headerName, headerValue] of headerEntries) {
    if (!headerValue && headerName !== 'host') {
      continue;
    }

    const validation = validateHostHeaderValue(headerName, headerValue);
    if (!validation.ok) {
      return validation;
    }

    hosts.add(validation.host);
  }

  for (const host of hosts) {
    if (!await isAllowedRequestHost(host)) {
      return { ok: false, message: `Header host "${host}" is not allowed.` };
    }
  }

  return { ok: true, host: Array.from(hosts)[0] ?? '', allowedHosts: Array.from(hosts) };
}

function resolveRequestAllowedHosts(res: express.Response): readonly string[] {
  const value = res.locals['allowedHosts'];
  return Array.isArray(value) ? value.map(normalizeHost).filter(Boolean) : [];
}

function getAngularAppEngine(allowedHosts: readonly string[]): AngularNodeAppEngine {
  const normalizedHosts = Array.from(new Set(allowedHosts.map(normalizeHost).filter(Boolean))).sort();
  const cacheKey = normalizedHosts.join(',');
  const cached = angularAppEngines.get(cacheKey);
  if (cached) {
    return cached;
  }

  const engine = new AngularNodeAppEngine({
    allowedHosts: normalizedHosts,
    trustProxyHeaders: TRUST_PROXY_HEADERS,
  });
  angularAppEngines.set(cacheKey, engine);
  return engine;
}

function resolveRequestHost(req: express.Request): string {
  const forwardedHost = String(req.headers['x-forwarded-host'] ?? '')
    .split(',')[0]
    .trim();
  return normalizeHost(forwardedHost || req.headers.host);
}

function resolveLocalRequestAuthority(req: express.Request, host: string): string {
  if (!isLocalHost(host)) {
    return host;
  }

  const rawHost = String(req.headers['host'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!rawHost || /[/\\\s\u0000-\u001F\u007F]/.test(rawHost)) {
    return host;
  }

  return normalizeHost(rawHost) === host ? rawHost : host;
}

function resolveNotFoundLookupDomain(req: express.Request, host: string): string {
  const draftDomain = normalizeHost(req.query['draftDomain']);
  if ((isLocalHost(host) || isSharedTestingPreviewHost(host)) && draftDomain) {
    return draftDomain;
  }

  return host;
}

function isSharedTestingDraftPreviewRequest(req: express.Request, host: string): boolean {
  return isSharedTestingPreviewHost(host) && Boolean(normalizeHost(req.query['draftDomain']));
}

function normalizeRuntimeLookupDomain(value: unknown): string {
  const normalized = normalizeHost(value);
  return normalized && !/[/\\\s\u0000-\u001F\u007F]/.test(normalized) ? normalized : '';
}

function resolveRuntimeStatusLookupDomain(
  req: express.Request,
  host: string,
  domain: string,
  siteConfig: TLocalSiteConfig | null,
): string {
  const normalizedDomain = normalizeRuntimeLookupDomain(domain);
  if (!isSharedTestingDraftPreviewRequest(req, host)) {
    return normalizedDomain;
  }

  const testAliases = Array.isArray(siteConfig?.environments?.['test']?.aliases)
    ? siteConfig.environments['test'].aliases
    : [];
  return testAliases
    .map(normalizeRuntimeLookupDomain)
    .find((alias) => alias && alias !== normalizedDomain)
    ?? normalizedDomain;
}

function resolveRequestProtocol(req: express.Request, host: string): string {
  const cloudFrontProtoValues = String(req.headers['cloudfront-forwarded-proto'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const forwardedProtoValues = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const forwardedPortValues = String(req.headers['x-forwarded-port'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const forwardedSslValues = String(req.headers['x-forwarded-ssl'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (
    cloudFrontProtoValues.includes('https')
    || forwardedProtoValues.includes('https')
    || forwardedPortValues.includes('443')
    || forwardedSslValues.includes('on')
  ) {
    return 'https';
  }

  if (cloudFrontProtoValues.length > 0) {
    return cloudFrontProtoValues[0];
  }

  if (forwardedProtoValues.length > 0) {
    return forwardedProtoValues[0];
  }

  if (forwardedPortValues.includes('80')) {
    return 'http';
  }

  if (forwardedSslValues.includes('off')) {
    return 'http';
  }

  if (req.secure) {
    return 'https';
  }

  return host === 'localhost' || host.startsWith('127.') ? 'http' : 'https';
}

function resolveRequestOrigin(req: express.Request, host: string): string {
  if (!host) {
    return 'https://localhost';
  }

  return `${resolveRequestProtocol(req, host)}://${resolveLocalRequestAuthority(req, host)}`;
}

function resolveCanonicalOrigin(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const configured = String(resolveEffectiveSeoConfig(host, siteConfig)?.canonicalOrigin ?? '').trim();
  return configured || resolveRequestOrigin(req, host);
}

function buildFrontDoorRedirectUrl(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string | null {
  if (!siteConfig || isLocalHost(host) || isSharedTestingDraftPreviewRequest(req, host)) {
    return null;
  }

  const seo = resolveEffectiveSeoConfig(host, siteConfig);
  const protocol = resolveRequestProtocol(req, host);
  const enforceCanonicalHost = shouldEnforceCanonicalHost(host, siteConfig, seo);
  let targetProtocol = protocol;
  let targetHost = host;

  if (seo?.forceHttps !== false && protocol !== 'https') {
    targetProtocol = 'https';
  }

  if (enforceCanonicalHost) {
    try {
      const canonical = new URL(resolveCanonicalOrigin(req, host, siteConfig));
      const canonicalHost = normalizeHost(canonical.host);
      if (canonicalHost) {
        targetHost = canonicalHost;
      }
      if (canonicalHost && canonicalHost !== host && canonical.protocol) {
        targetProtocol = canonical.protocol.replace(/:$/, '') || targetProtocol;
      }
    } catch {
      targetHost = host;
    }
  }

  if (targetProtocol === protocol && targetHost === host) {
    return null;
  }

  return new URL(req.originalUrl || req.url || '/', `${targetProtocol}://${targetHost}`).toString();
}

function cleanSameOriginPath(value: unknown): string {
  const path = cleanString(value);
  if (
    !path
    || !path.startsWith('/')
    || path.startsWith('//')
    || path.includes('\\')
    || /[\s\u0000-\u001F\u007F]/.test(path)
  ) {
    return '';
  }

  return path;
}

function firstQueryParam(value: unknown): string {
  const entry = Array.isArray(value) ? value[0] : value;
  return typeof entry === 'string' ? entry.trim() : '';
}

function resolveAuthRedirectUrl(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string | null {
  const route = resolveLocalRoute(siteConfig, req.path);
  if (route?.auth?.required !== true) {
    return null;
  }
  if (usesClientSideAuthRouteRevalidation(siteConfig)) {
    return null;
  }

  const redirectPath = cleanSameOriginPath(route.auth.redirectTo)
    || cleanSameOriginPath(siteConfig?.runtime?.auth?.loginPath);
  if (!redirectPath || normalizeRoutePath(redirectPath) === normalizeRoutePath(req.path)) {
    return null;
  }

  const redirectUrl = new URL(redirectPath, resolveRequestOrigin(req, host));
  AUTH_REDIRECT_STICKY_QUERY_PARAMS.forEach((key) => {
    if (redirectUrl.searchParams.has(key)) {
      return;
    }

    const value = firstQueryParam(req.query[key]);
    if (value) {
      redirectUrl.searchParams.set(key, value);
    }
  });

  return redirectUrl.toString();
}

function usesClientSideAuthRouteRevalidation(siteConfig: TLocalSiteConfig | null): boolean {
  const auth = siteConfig?.runtime?.auth;
  const session = isRecord(auth?.session) ? auth.session : null;
  if (cleanString(session?.['mode']).toLowerCase() === 'server-cookie') {
    return true;
  }

  const authRemote = siteConfig?.runtime?.authRemote;
  return authRemote?.enabled === true;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripAdQueryParamsFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    Array.from(url.searchParams.keys()).forEach((param) => {
      if (AD_QUERY_PARAMS.has(param) || SENSITIVE_QUERY_PARAM_PATTERN.test(param)) {
        url.searchParams.delete(param);
      }
    });
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function resolveEffectiveCanonicalUrl(
  rawUrl: string,
  origin: string,
  host: string,
  siteConfig: TLocalSiteConfig | null,
): string {
  const strippedUrl = stripAdQueryParamsFromUrl(rawUrl);
  const seo = resolveEffectiveSeoConfig(host, siteConfig);
  const canonicalOrigin = cleanString(seo?.canonicalOrigin);
  if (!shouldEnforceCanonicalHost(host, siteConfig, seo) || !canonicalOrigin) {
    return strippedUrl;
  }

  try {
    const targetOrigin = new URL(canonicalOrigin, origin);
    const parsedUrl = new URL(strippedUrl, targetOrigin);
    return new URL(`${parsedUrl.pathname}${parsedUrl.search}`, targetOrigin).toString();
  } catch {
    return strippedUrl;
  }
}

function buildRobotsTxt(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const sitemapUrl = `${origin}/sitemap.xml`;
  return [
    'User-agent: *',
    'Allow: /',
    ...ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`),
    `Sitemap: ${sitemapUrl}`,
  ].join('\n');
}

function resolveCanonicalSitemapUrl(
  origin: string,
  routePath: string,
  host: string,
  siteConfig: TLocalSiteConfig | null,
  pageConfig: TLocalPageConfig | null,
): string {
  const canonical = String(pageConfig?.seo?.canonical ?? '').trim();
  if (!canonical || canonical.includes('{{')) {
    return resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(routePath), origin).toString(), origin, host, siteConfig);
  }

  try {
    return resolveEffectiveCanonicalUrl(new URL(canonical, origin).toString(), origin, host, siteConfig);
  } catch {
    return resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(routePath), origin).toString(), origin, host, siteConfig);
  }
}

type TSitemapEntry = {
  readonly url: string;
  readonly lastmod?: string;
  readonly priority: string;
};

function resolveConfiguredSitemapUrls(
  origin: string,
  siteConfig: TLocalSiteConfig | null,
  domain: string,
  host: string,
): readonly TSitemapEntry[] {
  const configuredUrls = Array.isArray(siteConfig?.sitemap?.urls)
    ? siteConfig.sitemap.urls
    : [];

  return configuredUrls
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        return resolveEffectiveCanonicalUrl(new URL(entry, origin).toString(), origin, host, siteConfig);
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .map((url) => ({
      url,
      lastmod: resolveSiteLastModified(siteConfig, domain),
      priority: '0.7',
    }));
}

function readContentHubRuntimeConfigs(siteConfig: TLocalSiteConfig | null): readonly TContentHubRuntimeConfig[] {
  const hubs = siteConfig?.runtime?.contentHubs;
  return Array.isArray(hubs) ? hubs.filter(isRecord) as readonly TContentHubRuntimeConfig[] : [];
}

function readPublicContentHubArticles(
  siteConfig: TLocalSiteConfig | null,
  lang?: string,
): readonly TContentHubPublicArticle[] {
  const normalizedLang = normalizeLanguageCode(lang);
  return readContentHubRuntimeConfigs(siteConfig)
    .flatMap((hub) => Array.isArray(hub.publicArticles) ? hub.publicArticles : [])
    .filter((article) => article.status === 'published')
    .filter((article) => !normalizedLang || normalizeLanguageCode(article.locale) === normalizedLang)
    .filter((article) => normalizeRoutePath(article.path));
}

function readPublicContentHubTaxonomy(
  siteConfig: TLocalSiteConfig | null,
  lang?: string,
): readonly TContentHubPublicTaxonomy[] {
  const normalizedLang = normalizeLanguageCode(lang);
  return readContentHubRuntimeConfigs(siteConfig)
    .flatMap((hub) => Array.isArray(hub.publicTaxonomy) ? hub.publicTaxonomy : [])
    .filter((entry) => entry.visible !== false)
    .filter((entry) => !normalizedLang || normalizeLanguageCode(entry.locale) === normalizedLang)
    .filter((entry) => cleanString(entry.slug));
}

function buildContentHubSitemapEntries(
  origin: string,
  siteConfig: TLocalSiteConfig | null,
  host: string,
): readonly TSitemapEntry[] {
  const articleEntries = readPublicContentHubArticles(siteConfig)
    .filter((article) => !cleanString(article.robots).startsWith('noindex'))
    .map((article) => ({
      url: resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(article.canonicalPath || article.path), origin).toString(), origin, host, siteConfig),
      lastmod: resolveLastModifiedValue(article.updatedAt) ?? resolveLastModifiedValue(article.publishedAt),
      priority: '0.8',
    }));

  const taxonomyEntries = readPublicContentHubTaxonomy(siteConfig)
    .filter((entry) => cleanString(entry.kind) === 'category' && cleanString(entry.path))
    .map((entry) => ({
      url: resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(entry.path), origin).toString(), origin, host, siteConfig),
      lastmod: resolveSiteLastModified(siteConfig, normalizeHost(siteConfig?.domain)),
      priority: '0.6',
    }));

  return [...articleEntries, ...taxonomyEntries];
}

function resolveLastModifiedValue(value: unknown): string | undefined {
  const raw = cleanString(value);
  if (!raw) {
    return undefined;
  }

  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function resolvePageLastModified(
  pageConfig: TLocalPageConfig | null,
  siteConfig: TLocalSiteConfig | null,
  domain: string,
  pageId: string,
): string | undefined {
  const metadata = pageConfig?.metadata ?? {};
  return resolveLastModifiedValue(metadata['lastmod'])
    ?? resolveLastModifiedValue(metadata['lastModified'])
    ?? resolveLastModifiedValue(metadata['updatedAt'])
    ?? resolveLastModifiedValue(metadata['publishedAt'])
    ?? resolveLocalPageConfigUpdatedAt(domain, pageId)
    ?? resolveSiteLastModified(siteConfig, domain);
}

function resolveSiteLastModified(siteConfig: TLocalSiteConfig | null, domain: string): string | undefined {
  return resolveLastModifiedValue(siteConfig?.published?.updatedAt)
    ?? resolveLastModifiedValue(siteConfig?.draft?.updatedAt)
    ?? resolveLocalSiteConfigUpdatedAt(domain);
}

function buildSitemapEntryXml(entry: TSitemapEntry): string {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(entry.url)}</loc>`,
  ];
  if (entry.lastmod) {
    lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  }
  lines.push('    <changefreq>weekly</changefreq>');
  lines.push(`    <priority>${entry.priority}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
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
  const resolvedEntries = await Promise.all(sitemapRoutes.map(async (route) => {
    const pageConfig = sitemapDomain
      ? await loadPageConfigForRoute(sitemapDomain, route, resolveRuntimeEnvironment(host))
      : null;
    const routePath = normalizeRoutePath(route.path);
    const pageId = cleanString(route.pageId) || resolveLocalRuntimePageId(siteConfig, routePath);
    return {
      url: resolveCanonicalSitemapUrl(origin, routePath, host, siteConfig, pageConfig),
      lastmod: resolvePageLastModified(pageConfig, siteConfig, sitemapDomain, pageId),
      priority: routePath === '/' ? '1.0' : '0.7',
    };
  }));
  const entriesByUrl = new Map<string, TSitemapEntry>();
  [
    ...resolvedEntries,
    ...resolveConfiguredSitemapUrls(origin, siteConfig, sitemapDomain, host),
    ...buildContentHubSitemapEntries(origin, siteConfig, host),
  ].forEach((entry) => {
    if (!entriesByUrl.has(entry.url)) {
      entriesByUrl.set(entry.url, entry);
    }
  });
  const entries = Array.from(entriesByUrl.values())
    .map(buildSitemapEntryXml)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
  ].join('\n');
}

async function loadPageConfigForRequest(req: express.Request, domain: string, siteConfig: TLocalSiteConfig | null): Promise<TLocalPageConfig | null> {
  const routePath = normalizeRoutePath(req.path);
  const route = resolveLocalRoute(siteConfig, routePath);
  const environment = resolveRuntimeEnvironment(resolveRequestHost(req));
  if (route) {
    return loadPageConfigForRoute(domain, route, environment);
  }

  const pageId = routePath === '/'
    ? cleanString(siteConfig?.defaultPageId) || 'default'
    : resolveLocalNotFoundPageId(siteConfig);
  const localPageConfig = pageId ? loadLocalPageConfig(domain, pageId) : null;
  return localPageConfig ?? loadRuntimePageConfig(domain, routePath, environment);
}

function buildGoogleTagHeadHtml(host: string, siteConfig: TLocalSiteConfig | null): string {
  const config = resolveActiveGoogleTagConfig(host, siteConfig);
  if (!config) {
    return '';
  }

  const measurementIds = listGoogleMeasurementIds(config);
  const adsIds = listGoogleAdsIds(config);
  const gtagConfigIds = [...measurementIds, ...adsIds];
  const gtmId = cleanString(config.gtmId);
  const environment = resolveRuntimeEnvironment(host);
  const snippets: string[] = [
    `<script>window.__ZLP_RUNTIME_ENV__=${escapeScriptJson(environment)};window.dataLayer=window.dataLayer||[];</script>`,
  ];

  const primaryGtagId = gtagConfigIds[0];
  if (primaryGtagId) {
    const sendPageView = config.sendPageView === true;
    const configOptions = { send_page_view: sendPageView };
    snippets.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtmlAttribute(primaryGtagId)}"></script>`);
    snippets.push([
      '<script>',
      'window.dataLayer=window.dataLayer||[];',
      'function gtag(){dataLayer.push(arguments);}',
      "gtag('js',new Date());",
      ...gtagConfigIds.map((id) => `gtag('config',${escapeScriptJson(id)},${escapeScriptJson(configOptions)});`),
      '</script>',
    ].join(''));
  }

  if (/^GTM-[A-Z0-9_-]+$/.test(gtmId)) {
    snippets.push([
      '<script>',
      "window.dataLayer=window.dataLayer||[];",
      "window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
      '</script>',
      `<script async src="https://www.googletagmanager.com/gtm.js?id=${escapeHtmlAttribute(gtmId)}"></script>`,
    ].join(''));
  }

  return snippets.join('\n');
}

function buildSearchConsoleHeadHtml(host: string, siteConfig: TLocalSiteConfig | null): string {
  const config = resolveActiveSearchConsoleConfig(host, siteConfig);
  const token = cleanString(config?.googleSiteVerification);
  return token ? `<meta name="google-site-verification" content="${escapeHtmlAttribute(token)}">` : '';
}

function resolveBrowserIconHref(value: unknown): string {
  const href = cleanString(value);
  if (!href) {
    return '';
  }

  return href.startsWith('/') || /^https:\/\//i.test(href) ? href : '';
}

function resolveIconMimeType(value: string): string {
  const path = cleanString(value).split(/[?#]/)[0]?.toLowerCase() ?? '';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

function buildBrowserIconLink(rel: string, href: string, attributes: Record<string, string> = {}): string {
  if (!href) {
    return '';
  }

  const serializedAttributes = Object.entries(attributes)
    .filter(([, value]) => cleanString(value).length > 0)
    .map(([key, value]) => ` ${key}="${escapeHtmlAttribute(value)}"`)
    .join('');

  return `<link rel="${escapeHtmlAttribute(rel)}" href="${escapeHtmlAttribute(href)}"${serializedAttributes} ${MANAGED_BROWSER_ICON_ATTR}="true">`;
}

function buildBrowserIconsHeadHtml(siteConfig: TLocalSiteConfig | null): string {
  const icons: TSiteIconConfig = siteConfig?.site?.icons ?? {};
  const favicon = resolveBrowserIconHref(icons.favicon) || DEFAULT_BROWSER_ICON_HREF;
  const appleTouchIcon = resolveBrowserIconHref(icons.appleTouchIcon);
  const maskIcon = resolveBrowserIconHref(icons.maskIcon);
  const manifest = resolveBrowserIconHref(icons.manifest);
  const maskIconColor = cleanString(icons.maskIconColor) || cleanString(icons.themeColor);
  const themeColor = cleanString(icons.themeColor);
  const snippets = [
    buildBrowserIconLink('icon', favicon, { type: resolveIconMimeType(favicon) }),
    buildBrowserIconLink('apple-touch-icon', appleTouchIcon),
    buildBrowserIconLink('mask-icon', maskIcon, { color: maskIconColor }),
    buildBrowserIconLink('manifest', manifest),
    themeColor ? `<meta name="theme-color" content="${escapeHtmlAttribute(themeColor)}" ${MANAGED_BROWSER_ICON_ATTR}="true">` : '',
  ];

  return snippets.filter(Boolean).join('\n');
}

function readRecordEntry(source: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(source)) {
    return null;
  }

  const value = source[key];
  return isRecord(value) ? value : null;
}

function readStringEntry(source: unknown, key: string): string {
  if (!isRecord(source)) {
    return '';
  }

  return cleanString(source[key]);
}

function isSafeBootCurtainCssValue(value: string): boolean {
  return value.length > 0 && !/[;{}]/.test(value) && !/url\s*\(/i.test(value);
}

function resolveBootCurtainConfig(siteConfig: TLocalSiteConfig | null): Record<string, string> {
  const defaults = isRecord(siteConfig?.defaults) ? siteConfig.defaults : {};
  const site = isRecord(siteConfig?.site) ? siteConfig.site : {};
  const defaultUi = readRecordEntry(defaults, 'ui');
  const curtain = readRecordEntry(defaultUi, 'loadingCurtain') ?? {};
  const defaultBrand = readRecordEntry(defaults, 'brand');
  const appIdentity = readRecordEntry(site, 'appIdentity');
  const siteSeo = readRecordEntry(site, 'seo');
  const icons = readRecordEntry(site, 'icons');

  const title = readStringEntry(curtain, 'title')
    || readStringEntry(defaultBrand, 'displayName')
    || readStringEntry(appIdentity, 'name')
    || readStringEntry(siteSeo, 'siteName')
    || 'Zoo Landing Page';
  const subtitle = readStringEntry(curtain, 'subtitle')
    || cleanString(siteConfig?.domain)
    || 'zoolandingpage.com.mx';
  const logoUrl = resolveBrowserIconHref(readStringEntry(curtain, 'logoUrl'))
    || resolveBrowserIconHref(readStringEntry(defaultBrand, 'logoUrl'))
    || resolveBrowserIconHref(readStringEntry(icons, 'favicon'));

  return {
    title,
    subtitle,
    logoUrl,
    background: readStringEntry(curtain, 'background'),
    foreground: readStringEntry(curtain, 'foreground'),
    accent: readStringEntry(curtain, 'accent'),
  };
}

function setHtmlAttribute(tag: string, name: string, value: string): string {
  const withoutExisting = tag.replace(new RegExp(`\\s${name}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'), '');
  return withoutExisting.replace(/\s*\/?>$/, (ending) => ` ${name}="${escapeHtmlAttribute(value)}"${ending}`);
}

function removeHtmlAttribute(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s${name}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'), '');
}

function decorateBootCurtainHtml(html: string, siteConfig: TLocalSiteConfig | null): string {
  if (!html.includes('id="zlp-boot-curtain"')) {
    return html;
  }

  const config = resolveBootCurtainConfig(siteConfig);
  const styleEntries = [
    ['--zlp-boot-bg', config['background']],
    ['--zlp-boot-fg', config['foreground']],
    ['--zlp-boot-accent', config['accent']],
  ]
    .filter((entry): entry is [string, string] => isSafeBootCurtainCssValue(entry[1]))
    .map(([name, value]) => `${name}: ${value}`);

  return html
    .replace(
      /(<[^>]+data-zlp-boot-title[^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
      (_match, open: string, _content: string, close: string) => `${open}${escapeHtmlText(config['title'])}${close}`,
    )
    .replace(
      /(<[^>]+data-zlp-boot-subtitle[^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
      (_match, open: string, _content: string, close: string) => `${open}${escapeHtmlText(config['subtitle'])}${close}`,
    )
    .replace(/<img\b[^>]*data-zlp-boot-logo[^>]*>/i, (tag) => {
      if (!config['logoUrl']) {
        return setHtmlAttribute(tag, 'hidden', 'true');
      }

      return removeHtmlAttribute(setHtmlAttribute(tag, 'src', config['logoUrl']), 'hidden');
    })
    .replace(/<div\b[^>]*id=["']zlp-boot-curtain["'][^>]*>/i, (tag) => {
      if (styleEntries.length === 0) {
        return tag;
      }

      return setHtmlAttribute(tag, 'style', styleEntries.join('; '));
    });
}

function decorateProtectedSsrShellHtml(html: string, siteConfig: TLocalSiteConfig | null, path: string): string {
  if (!isProtectedRequestPath(siteConfig, path)) {
    return html;
  }

  return html.replace(/<app-root\b[^>]*>/i, (tag) => setHtmlAttribute(tag, 'data-zlp-protected-shell', 'true'));
}

function readStructuredDataEntries(pageConfig: TLocalPageConfig | null): readonly unknown[] {
  const structuredData = pageConfig?.structuredData;
  if (Array.isArray(structuredData)) {
    return structuredData;
  }

  if (isRecord(structuredData) && Array.isArray(structuredData['entries'])) {
    return structuredData['entries'];
  }

  return [];
}

function buildStructuredDataHeadHtml(pageConfig: TLocalPageConfig | null): string {
  const entries = readStructuredDataEntries(pageConfig);
  if (entries.length === 0) {
    return '';
  }

  return entries
    .map((entry) => `<script type="application/ld+json">${escapeScriptJson(entry)}</script>`)
    .join('\n');
}

function resolveRequestLanguage(req: express.Request, siteConfig: TLocalSiteConfig | null): string {
  const queryLang = firstQueryParam(req.query['lang']);
  if (queryLang) {
    return queryLang;
  }

  return normalizeLanguageCode(siteConfig?.site?.i18n?.defaultLanguage) || 'es';
}

function resolveLocalizedSeoString(value: unknown, lang: string): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (!isRecord(value)) {
    return '';
  }

  return cleanString(value[lang])
    || cleanString(value[normalizeLanguageCode(lang)])
    || cleanString(value['default'])
    || cleanString(value['es'])
    || cleanString(value['en']);
}

function isPathMatchedByPrefixRule(path: string, rulePath: string): boolean {
  const normalizedPath = normalizeRoutePath(path);
  const normalizedRulePath = normalizeRoutePath(rulePath);
  if (normalizedRulePath === '/') {
    return normalizedPath === '/';
  }
  if (normalizedRulePath.endsWith('/')) {
    const exactPath = normalizedRulePath.replace(/\/+$/, '') || '/';
    return normalizedPath === exactPath || normalizedPath.startsWith(normalizedRulePath);
  }

  return normalizedPath === normalizedRulePath;
}

function isPathExcludedFromSitemap(siteConfig: TLocalSiteConfig | null, path: string): boolean {
  const excludedPaths = Array.isArray(siteConfig?.sitemap?.excludePaths)
    ? siteConfig.sitemap.excludePaths
    : [];
  return excludedPaths.some((entry) => isPathMatchedByPrefixRule(path, entry));
}

function shouldForceNoindexForRequestPath(siteConfig: TLocalSiteConfig | null, path: string): boolean {
  const normalizedPath = normalizeRoutePath(path);
  const route = resolveLocalRoute(siteConfig, normalizedPath);
  return route?.auth?.required === true
    || isPathExcludedFromSitemap(siteConfig, normalizedPath)
    || ROBOTS_DISALLOW_PATHS.some((entry) => isPathMatchedByPrefixRule(normalizedPath, entry));
}

function isProtectedRequestPath(siteConfig: TLocalSiteConfig | null, path: string): boolean {
  const normalizedPath = normalizeRoutePath(path);
  return resolveLocalRoute(siteConfig, normalizedPath)?.auth?.required === true;
}

function addVaryHeader(headers: Headers, value: string): void {
  const normalizedValue = cleanString(value);
  if (!normalizedValue) {
    return;
  }

  const existing = cleanString(headers.get('vary'));
  const entries = existing
    ? existing.split(',').map((entry) => cleanString(entry)).filter(Boolean)
    : [];
  const hasEntry = entries.some((entry) => entry.toLowerCase() === normalizedValue.toLowerCase());
  if (!hasEntry) {
    entries.push(normalizedValue);
  }
  headers.set('Vary', entries.join(', '));
}

function applyProtectedHtmlCacheHeaders(headers: Headers, siteConfig: TLocalSiteConfig | null, path: string): void {
  if (!isProtectedRequestPath(siteConfig, path)) {
    return;
  }

  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  addVaryHeader(headers, 'Cookie');
}

function buildRobotsHeadHtml(
  req: express.Request,
  siteConfig: TLocalSiteConfig | null,
  pageConfig: TLocalPageConfig | null,
): string {
  const lang = resolveRequestLanguage(req, siteConfig);
  const routeRobots = shouldForceNoindexForRequestPath(siteConfig, req.path) ? 'noindex,nofollow' : '';
  const robots = routeRobots
    || resolveLocalizedSeoString(pageConfig?.seo?.robots, lang)
    || resolveLocalizedSeoString(siteConfig?.site?.seo?.robots, lang);

  return robots ? `<meta name="robots" content="${escapeHtmlAttribute(robots)}">` : '';
}

function normalizeLanguageCode(value: unknown): string {
  const raw = cleanString(value).replace(/_/g, '-');
  if (!raw) {
    return '';
  }

  const [base, ...rest] = raw.split('-').filter(Boolean);
  if (!base) {
    return '';
  }

  return [base.toLowerCase(), ...rest.map((part) => part.length === 2 ? part.toUpperCase() : part)].join('-');
}

function normalizeLanguageEntry(value: unknown): string {
  if (typeof value === 'string') {
    return normalizeLanguageCode(value);
  }

  if (isRecord(value)) {
    return normalizeLanguageCode(value['code'] ?? value['lang'] ?? value['locale']);
  }

  return '';
}

function addLangParam(rawUrl: string, lang: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('lang', lang);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function buildRequestCanonicalUrl(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  return stripAdQueryParamsFromUrl(new URL(req.originalUrl || req.url || '/', `${origin}/`).toString());
}

function buildCanonicalHeadHtml(
  req: express.Request,
  host: string,
  siteConfig: TLocalSiteConfig | null,
  pageConfig: TLocalPageConfig | null,
): string {
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const configuredCanonical = cleanString(pageConfig?.seo?.canonical);
  const rawCanonical = configuredCanonical && !configuredCanonical.includes('{{')
    ? new URL(configuredCanonical, `${origin}/`).toString()
    : new URL(req.originalUrl || req.url || '/', `${origin}/`).toString();
  const canonicalUrl = resolveEffectiveCanonicalUrl(rawCanonical, `${origin}/`, host, siteConfig);
  return `<link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}">`;
}

function buildHreflangHeadHtml(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const languages = dedupeStrings((siteConfig?.site?.i18n?.supportedLanguages ?? []).map(normalizeLanguageEntry));
  if (languages.length <= 1) {
    return '';
  }

  const defaultLanguage = normalizeLanguageCode(siteConfig?.site?.i18n?.defaultLanguage);
  const fallbackLanguage = languages.includes(defaultLanguage) ? defaultLanguage : languages[0];
  const canonicalUrl = buildRequestCanonicalUrl(req, host, siteConfig);
  return [
    ...languages.map((lang) => `<link rel="alternate" hreflang="${escapeHtmlAttribute(lang)}" href="${escapeHtmlAttribute(addLangParam(canonicalUrl, lang))}">`),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttribute(addLangParam(canonicalUrl, fallbackLanguage))}">`,
  ].join('\n');
}

function filterPublicContentHubArticles(
  articles: readonly TContentHubPublicArticle[],
  query: Record<string, unknown>,
): readonly TContentHubPublicArticle[] {
  const q = firstQueryParam(query['q']).toLowerCase();
  const category = (firstQueryParam(query['category']) || firstQueryParam(query['categorySlug'])).toLowerCase();
  const tag = (firstQueryParam(query['tag']) || firstQueryParam(query['tagSlug'])).toLowerCase();
  const author = firstQueryParam(query['author']).toLowerCase();
  const limit = Math.min(Math.max(Number.parseInt(firstQueryParam(query['limit']) || '20', 10) || 20, 1), 50);

  return articles
    .filter((article) => !q
      || cleanString(article.title).toLowerCase().includes(q)
      || cleanString(article.summary).toLowerCase().includes(q))
    .filter((article) => !category || cleanString(article.categorySlug).toLowerCase() === category)
    .filter((article) => !tag || (Array.isArray(article.tags) && article.tags.some((entry) => cleanString(entry).toLowerCase() === tag)))
    .filter((article) => !author || cleanString(article.authorLabel).toLowerCase().includes(author))
    .slice(0, limit);
}

function buildContentHubSearchPayload(
  req: express.Request,
  host: string,
  siteConfig: TLocalSiteConfig | null,
): Record<string, unknown> {
  const lang = normalizeLanguageCode(firstQueryParam(req.query['lang'])) || resolveRequestLanguage(req, siteConfig);
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const articles = filterPublicContentHubArticles(readPublicContentHubArticles(siteConfig, lang), req.query);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    domain: normalizeHost(siteConfig?.domain) || normalizeHost(host),
    lang,
    count: articles.length,
    articles: articles.map((article) => ({
      articleId: cleanString(article.articleId),
      title: cleanString(article.title),
      summary: cleanString(article.summary),
      path: normalizeRoutePath(article.path),
      url: resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(article.canonicalPath || article.path), `${origin}/`).toString(), `${origin}/`, host, siteConfig),
      categorySlug: cleanString(article.categorySlug),
      tags: Array.isArray(article.tags) ? article.tags.map(cleanString).filter(Boolean) : [],
      publishedAt: cleanString(article.publishedAt),
      updatedAt: cleanString(article.updatedAt),
      authorLabel: cleanString(article.authorLabel),
    })),
  };
}

function buildRssFeedXml(req: express.Request, host: string, siteConfig: TLocalSiteConfig | null): string {
  const lang = normalizeLanguageCode(firstQueryParam(req.query['lang'])) || resolveRequestLanguage(req, siteConfig);
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const siteName = cleanString(siteConfig?.site?.seo?.siteName)
    || cleanString(siteConfig?.site?.appIdentity?.name)
    || normalizeHost(siteConfig?.domain)
    || normalizeHost(host);
  const description = cleanString(siteConfig?.site?.seo?.description)
    || cleanString(siteConfig?.site?.appIdentity?.description)
    || siteName;
  const articles = readPublicContentHubArticles(siteConfig, lang)
    .filter((article) => !cleanString(article.robots).startsWith('noindex'))
    .slice(0, 50);
  const items = articles.map((article) => {
    const articleUrl = resolveEffectiveCanonicalUrl(new URL(normalizeRoutePath(article.canonicalPath || article.path), `${origin}/`).toString(), `${origin}/`, host, siteConfig);
    return [
      '    <item>',
      `      <title>${escapeXml(cleanString(article.title))}</title>`,
      `      <link>${escapeXml(articleUrl)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>`,
      `      <description>${escapeXml(cleanString(article.summary))}</description>`,
      `      <pubDate>${escapeXml(new Date(cleanString(article.publishedAt)).toUTCString())}</pubDate>`,
      '    </item>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(siteName)}</title>`,
    `    <link>${escapeXml(`${origin}/blog`)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <language>${escapeXml(lang)}</language>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');
}

function findContentHubArticleForRequest(
  req: express.Request,
  siteConfig: TLocalSiteConfig | null,
): TContentHubPublicArticle | undefined {
  const path = normalizeRoutePath(req.path);
  const lang = resolveRequestLanguage(req, siteConfig);
  return readPublicContentHubArticles(siteConfig, lang)
    .find((article) => normalizeRoutePath(article.path) === path)
    ?? readPublicContentHubArticles(siteConfig)
      .find((article) => normalizeRoutePath(article.path) === path);
}

function buildContentHubArticleStructuredData(
  req: express.Request,
  host: string,
  siteConfig: TLocalSiteConfig | null,
  article: TContentHubPublicArticle,
): Record<string, unknown> {
  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const canonicalUrl = resolveEffectiveCanonicalUrl(
    new URL(normalizeRoutePath(article.canonicalPath || article.path), `${origin}/`).toString(),
    `${origin}/`,
    host,
    siteConfig,
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: cleanString(article.title),
    description: cleanString(article.summary),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: cleanString(article.publishedAt),
    dateModified: cleanString(article.updatedAt) || cleanString(article.publishedAt),
    author: cleanString(article.authorLabel) ? { '@type': 'Organization', name: cleanString(article.authorLabel) } : undefined,
    articleSection: cleanString(article.categorySlug) || undefined,
    keywords: Array.isArray(article.tags) ? article.tags.map(cleanString).filter(Boolean).join(', ') || undefined : undefined,
  };
}

function withContentHubSeoPageConfig(
  req: express.Request,
  host: string,
  siteConfig: TLocalSiteConfig | null,
  pageConfig: TLocalPageConfig | null,
): TLocalPageConfig | null {
  const article = findContentHubArticleForRequest(req, siteConfig);
  if (!article) {
    return pageConfig;
  }

  const origin = resolveCanonicalOrigin(req, host, siteConfig).replace(/\/$/, '');
  const canonical = resolveEffectiveCanonicalUrl(
    new URL(normalizeRoutePath(article.canonicalPath || article.path), `${origin}/`).toString(),
    `${origin}/`,
    host,
    siteConfig,
  );
  return {
    ...(pageConfig ?? {}),
    seo: {
      ...(pageConfig?.seo ?? {}),
      title: cleanString(article.title) || pageConfig?.seo?.title,
      description: cleanString(article.summary) || pageConfig?.seo?.description,
      canonical,
      robots: cleanString(article.robots) || pageConfig?.seo?.robots,
    },
    structuredData: {
      entries: [
        ...readStructuredDataEntries(pageConfig),
        buildContentHubArticleStructuredData(req, host, siteConfig, article),
      ],
    },
  };
}

function injectHeadHtml(html: string, headHtml: string): string {
  if (!headHtml) {
    return html;
  }

  let sanitizedHtml = html;
  if (headHtml.includes('rel="canonical"')) {
    sanitizedHtml = sanitizedHtml.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  }
  if (headHtml.includes('name="robots"')) {
    sanitizedHtml = sanitizedHtml.replace(/<meta\s+[^>]*name=["']robots["'][^>]*>\s*/gi, '');
  }
  if (headHtml.includes(MANAGED_BROWSER_ICON_ATTR)) {
    sanitizedHtml = sanitizedHtml
      .replace(/<link\s+[^>]*rel=["'](?:icon|apple-touch-icon|mask-icon|manifest)["'][^>]*>\s*/gi, '')
      .replace(/<meta\s+[^>]*name=["']theme-color["'][^>]*>\s*/gi, '');
  }

  return sanitizedHtml.replace(/<\/head>/i, `${headHtml}\n</head>`);
}

async function decorateHtmlResponse(req: express.Request, response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const environment = resolveRuntimeEnvironment(host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, environment);
  const requestPageConfig = await loadPageConfigForRequest(req, lookupDomain, siteConfig);
  const pageConfig = response.status === 404
    ? requestPageConfig
    : withContentHubSeoPageConfig(req, lookupDomain, siteConfig, requestPageConfig);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  applyProtectedHtmlCacheHeaders(headers, siteConfig, req.path);

  const html = await response.text();
  const headHtml = [
    buildGoogleTagHeadHtml(lookupDomain, siteConfig),
    buildSearchConsoleHeadHtml(lookupDomain, siteConfig),
    buildBrowserIconsHeadHtml(siteConfig),
    buildRobotsHeadHtml(req, siteConfig, pageConfig),
    buildStructuredDataHeadHtml(pageConfig),
    buildCanonicalHeadHtml(req, lookupDomain, siteConfig, pageConfig),
    buildHreflangHeadHtml(req, lookupDomain, siteConfig),
  ].filter(Boolean).join('\n');

  const decoratedHtml = decorateProtectedSsrShellHtml(
    decorateBootCurtainHtml(injectHeadHtml(html, headHtml), siteConfig),
    siteConfig,
    req.path,
  );

  return new Response(decoratedHtml, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function shouldServeNotFoundDocument(req: express.Request): Promise<boolean> {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const normalizedPath = normalizeRoutePath(req.path);
  const environment = resolveRuntimeEnvironment(host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, environment);

  if (!siteConfig) {
    return (!isLocalHost(host) || lookupDomain !== host) && normalizedPath !== '/';
  }

  const route = resolveLocalRoute(siteConfig, normalizedPath);
  if (route) {
    if (isMissingPublishedContentHubArticlePath(siteConfig.runtime?.contentHubs, normalizedPath)) {
      const runtimeStatusDomain = resolveRuntimeStatusLookupDomain(req, host, lookupDomain, siteConfig);
      const runtimeRouteStatus = await loadRuntimeRouteStatus(runtimeStatusDomain || lookupDomain, normalizedPath, environment);
      if (runtimeRouteStatus === 200) {
        return false;
      }
      if (runtimeRouteStatus === 404) {
        return true;
      }

      return normalizedPath !== '/';
    }

    return false;
  }

  const runtimeStatusDomain = resolveRuntimeStatusLookupDomain(req, host, lookupDomain, siteConfig);
  const runtimeRouteStatus = await loadRuntimeRouteStatus(runtimeStatusDomain || lookupDomain, normalizedPath, environment);
  if (runtimeRouteStatus === 200) {
    return false;
  }

  if (runtimeRouteStatus === 404) {
    return normalizedPath !== '/';
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

app.use((req, res, next) => {
  validateRequestAllowedHosts(req)
    .then((validation) => {
      if (validation.ok) {
        res.locals['allowedHosts'] = validation.allowedHosts;
        next();
        return;
      }

      res
        .status(400)
        .type('text/plain')
        .set('Cache-Control', 'no-store')
        .send(`${validation.message}\n`);
    })
    .catch(next);
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

app.use((req, res, next) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host))
    .then((siteConfig) => {
      const redirectUrl = buildFrontDoorRedirectUrl(req, host, siteConfig);
      if (!redirectUrl) {
        next();
        return;
      }

      res.redirect(301, redirectUrl);
    })
    .catch(next);
});

app.get(/^\/google[^/]*\.html$/i, async (req, res, next) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host));
  const config = resolveActiveSearchConsoleConfig(lookupDomain, siteConfig);
  const configuredPath = normalizeRoutePath(config?.htmlFile?.path);
  const content = cleanString(config?.htmlFile?.content);

  if (!configuredPath || configuredPath.toLowerCase() !== normalizeRoutePath(req.path).toLowerCase() || !content) {
    next();
    return;
  }

  res
    .status(200)
    .type('text/html')
    .set('Cache-Control', 'no-store')
    .send(content);
});

app.get('/robots.txt', async (req, res) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host));
  res.type('text/plain').send(buildRobotsTxt(req, lookupDomain, siteConfig));
});

app.get('/sitemap.xml', async (req, res) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host));
  res.type('application/xml').send(await buildSitemapXml(req, lookupDomain, siteConfig));
});

app.get(['/feed.xml', '/rss.xml', '/atom.xml'], async (req, res) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host));
  res.type('application/rss+xml').send(buildRssFeedXml(req, lookupDomain, siteConfig));
});

app.get('/content-hub-search.json', async (req, res) => {
  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  const siteConfig = await loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host));
  res
    .status(200)
    .type('application/json')
    .set('Cache-Control', 'public, max-age=60')
    .json(buildContentHubSearchPayload(req, lookupDomain, siteConfig));
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const host = resolveRequestHost(req);
  const lookupDomain = resolveNotFoundLookupDomain(req, host);
  loadSiteConfigForHost(lookupDomain, resolveRuntimeEnvironment(host))
    .then((siteConfig) => {
      const redirectUrl = resolveAuthRedirectUrl(req, host, siteConfig);
      if (!redirectUrl) {
        next();
        return;
      }

      res
        .status(302)
        .set('Cache-Control', 'no-store')
        .set('Location', redirectUrl)
        .end();
    })
    .catch(next);
});

const draftsFolder = resolveDraftsFolder();

if (draftsFolder) {
  app.use('/drafts', (req, res, next) => {
    const segments = req.path.split('/').filter(Boolean);
    if (
      segments.some((segment) => LOCAL_NOTE_FOLDER_NAMES.has(segment) || SERVER_ONLY_DRAFT_FOLDER_NAMES.has(segment))
      || req.path.toLowerCase().endsWith('.md')
    ) {
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
  const angularApp = getAngularAppEngine(resolveRequestAllowedHosts(res));
  shouldServeNotFoundDocument(req)
    .then((notFoundDocument) => angularApp.handle(req)
      .then((response) => {
        if (!response) {
          next();
          return;
        }

        return decorateHtmlResponse(req, response)
          .then((decoratedResponse) => {
            if (!notFoundDocument) {
              writeResponseToNodeResponse(decoratedResponse, res);
              return;
            }

            writeResponseToNodeResponse(new Response(decoratedResponse.body, {
              headers: decoratedResponse.headers,
              status: 404,
              statusText: 'Not Found',
            }), res);
          });
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
