#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://test.zoolandingpage.com.mx';
const DEFAULT_DOMAIN = 'zoositioweb.com.mx';
const DEFAULT_AUTH_PROFILE_ID = 'staff';
const DEFAULT_HUB_ID = 'zoosite-main';
const DEFAULT_ENVIRONMENT = 'test';
const DEFAULT_LANG = 'es';
const DEFAULT_PAGE_ID = 'admin-blog-articulos';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_CSRF_COOKIE_NAME = 'zlp_csrf';
const SENSITIVE_INPUT_KEYS = new Set(['cookie', 'cookies', 'csrf', 'session', 'token', 'secret', 'authorization']);
const COMMON_FORBIDDEN_PUBLIC_RESPONSE_PATTERNS = [
  [/"pk"\s*:/i, 'partition key'],
  [/"sk"\s*:/i, 'sort key'],
  [/"hubId"\s*:/i, 'hub id'],
  [/"tenantId"\s*:/i, 'tenant policy'],
  [/"updatedBy"\s*:/i, 'updater identity'],
  [/"createdBy"\s*:/i, 'creator identity'],
  [/"createdByHash"\s*:/i, 'creator hash'],
  [/"bodyHash"\s*:/i, 'body hash'],
  [/"moderatedBy"\s*:/i, 'moderator identity'],
  [/"objectKey"\s*:/i, 'storage object key'],
  [/"bucket"\s*:/i, 'storage bucket'],
  [/"prefix"\s*:/i, 'storage prefix'],
  [/"tableName"\s*:/i, 'table name'],
  [/"metadata"\s*:/i, 'raw metadata'],
  [/"actorHash"\s*:/i, 'actor hash'],
  [/"actorId"\s*:/i, 'actor id'],
  [/"rawEvent/i, 'raw event payload'],
  [/credentialRef/i, 'credential reference'],
  [/__Host-zlp_session/i, 'session cookie'],
  [/zlp_csrf/i, 'csrf cookie'],
  [/X-Amz-Signature/i, 'signed storage URL'],
  [/X-Amz-Credential/i, 'signed storage credential'],
  [/content-hubs\//i, 'storage path'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, 'email address'],
  [/"phone(Number)?"\s*:/i, 'phone field'],
  [/"whatsapp"\s*:/i, 'whatsapp field'],
  [/accessToken/i, 'access token'],
  [/refreshToken/i, 'refresh token'],
  [/idToken/i, 'id token'],
];

function parseArgs(rawArgs) {
  const parsed = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
    parsed[key] = value;
  }
  return parsed;
}

function clean(value) {
  return String(value ?? '').trim();
}

function assertNoForbiddenPublicResponseFields(value, context, extraPatterns = []) {
  const raw = JSON.stringify(value ?? {});
  for (const [pattern, label] of [...COMMON_FORBIDDEN_PUBLIC_RESPONSE_PATTERNS, ...extraPatterns]) {
    if (pattern.test(raw)) {
      throw new Error(`${context} exposed ${label}.`);
    }
  }
}

function assertNoInternalTaxonomyFields(value, context) {
  assertNoForbiddenPublicResponseFields(value, context);
}

function assertTaxonomyRecord(record, expected, context) {
  assertNoInternalTaxonomyFields(record, context);
  const mismatches = [
    ['taxonomyId', clean(record?.taxonomyId), expected.taxonomyId],
    ['kind', clean(record?.kind), expected.kind],
    ['slug', clean(record?.slug), expected.slug],
    ['label', clean(record?.label), expected.label],
    ['description', clean(record?.description), expected.description],
    ['locale', clean(record?.locale), expected.locale],
    ['seoTitle', clean(record?.seoTitle), expected.seoTitle],
    ['seoDescription', clean(record?.seoDescription), expected.seoDescription],
    ['visible', Boolean(record?.visible), true],
  ].filter(([, actual, wanted]) => actual !== wanted);
  if (mismatches.length > 0 || !clean(record?.updatedAt)) {
    throw new Error(`Taxonomy ${context} did not match expected public fields.`);
  }
}

function assertNoInternalAssetFields(value, context) {
  assertNoForbiddenPublicResponseFields(value, context, [
    [/"grant"\s*:/i, 'upload grant'],
    [/"signedUrl"\s*:/i, 'signed storage URL'],
    [/"urlExpiresAt"\s*:/i, 'signed storage URL expiry'],
  ]);
}

function assertAssetRecord(record, expected, context) {
  assertNoInternalAssetFields(record, context);
  const mismatches = [
    ['assetId', clean(record?.assetId), expected.assetId],
    ['kind', clean(record?.kind), expected.kind],
    ['fileName', clean(record?.fileName), expected.fileName],
    ['mimeType', clean(record?.mimeType), expected.mimeType],
    ['bytes', Number(record?.bytes), expected.bytes],
    ['title', clean(record?.title), expected.title],
    ['alt', clean(record?.alt), expected.alt],
  ].filter(([, actual, wanted]) => actual !== wanted);
  if (mismatches.length > 0 || !clean(record?.createdAt)) {
    throw new Error(`Asset ${context} did not match expected public fields.`);
  }
}

function assertNoInternalModerationFields(value, context) {
  assertNoForbiddenPublicResponseFields(value, context, [
    [/"body"\s*:/i, 'raw comment body'],
    [/"rawBody"\s*:/i, 'raw comment body'],
    [/"authorEmail"\s*:/i, 'author email'],
    [/"authorPhone"\s*:/i, 'author phone'],
    [/"privateTail"\s*:/i, 'private moderation tail'],
  ]);
}

function assertModerationRecord(record, expected, context) {
  assertNoInternalModerationFields(record, context);
  const mismatches = [
    ['articleId', clean(record?.articleId), expected.articleId],
    ['commentId', clean(record?.commentId), expected.commentId],
    ['status', clean(record?.status), expected.status],
  ].filter(([, actual, wanted]) => actual !== wanted);
  if (mismatches.length > 0 || !hasNeedle(record?.bodyPreview, expected.previewNeedle) || !clean(record?.queuedAt)) {
    throw new Error(`Moderation ${context} did not match expected public fields.`);
  }
  if (expected.moderated && !clean(record?.moderatedAt)) {
    throw new Error(`Moderation ${context} did not include moderatedAt.`);
  }
}

function normalizeBaseUrl(value) {
  const baseUrl = clean(value);
  if (!baseUrl) return '';
  return baseUrl.replace(/\/+$/, '');
}

function urlWithPath(baseUrl, suffix) {
  const normalized = normalizeBaseUrl(baseUrl);
  const url = new URL(normalized);
  const currentPath = url.pathname.replace(/\/+$/, '');
  const suffixPath = `/${clean(suffix).replace(/^\/+/, '')}`;
  url.pathname = currentPath.endsWith(suffixPath)
    ? currentPath || '/'
    : `${currentPath}${suffixPath}`.replace(/\/{2,}/g, '/');
  return url;
}

function assertHttpsBaseUrl(value, flagName) {
  const baseUrl = normalizeBaseUrl(value);
  if (!baseUrl) {
    throw new Error(`${flagName} is required.`);
  }
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`${flagName} must use https unless it points to localhost.`);
  }
  return baseUrl;
}

function booleanArg(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(clean(value).toLowerCase());
}

function resolvePublicSmokeTarget(args, env = process.env) {
  const environment = clean(args.environment) || DEFAULT_ENVIRONMENT;
  const explicitBaseUrl = clean(args['base-url'] || env.ZLP_CONTENT_HUB_SMOKE_BASE_URL);
  const sharedPreview = booleanArg(args['shared-preview'], true);
  if (environment === 'production' && !explicitBaseUrl) {
    throw new Error('--base-url is required for production smoke.');
  }
  if (environment === 'production' && sharedPreview) {
    throw new Error('--shared-preview=false is required for production smoke.');
  }
  return {
    baseUrl: assertHttpsBaseUrl(explicitBaseUrl || DEFAULT_BASE_URL, '--base-url'),
    environment,
    sharedPreview,
  };
}

function cookieValue(cookieHeader, name) {
  const target = clean(name);
  return clean(cookieHeader)
    .split(';')
    .map((entry) => entry.trim())
    .map((entry) => {
      const separator = entry.indexOf('=');
      if (separator < 0) return [entry, ''];
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    })
    .find(([key]) => key === target)?.[1] ?? '';
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

function slugify(value) {
  const slug = clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `qa-smoke-${compactTimestamp()}`;
}

function futureIso(date = new Date(), minutes = 60) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildRuntimeBundleUrl({ runtimeBaseUrl, domain, pathName, lang, environment }) {
  const url = urlWithPath(runtimeBaseUrl, 'runtime-bundle');
  url.searchParams.set('domain', domain);
  url.searchParams.set('path', pathName);
  url.searchParams.set('lang', lang);
  if (environment) {
    url.searchParams.set('environment', environment);
  }
  return url.toString();
}

function buildPublicSearchUrl({ baseUrl, domain, lang, query, sharedPreview = true }) {
  const url = urlWithPath(baseUrl, 'content-hub-search.json');
  if (sharedPreview) {
    url.searchParams.set('draftDomain', domain);
  }
  url.searchParams.set('lang', lang);
  if (query) {
    url.searchParams.set('q', query);
  }
  return url.toString();
}

function buildPublicArticleUrl({ baseUrl, domain, pathName, lang, sharedPreview = true }) {
  const url = urlWithPath(baseUrl, pathName);
  if (sharedPreview) {
    url.searchParams.set('draftDomain', domain);
  }
  if (lang) {
    url.searchParams.set('lang', lang);
  }
  return url.toString();
}

function buildPublicXmlUrl({ baseUrl, domain, pathName, lang, sharedPreview = true }) {
  const url = urlWithPath(baseUrl, pathName);
  if (sharedPreview) {
    url.searchParams.set('draftDomain', domain);
  }
  if (lang) {
    url.searchParams.set('lang', lang);
  }
  return url.toString();
}

function publicCanonicalArticleUrl(domain, pathName) {
  return `https://${domain}${clean(pathName).startsWith('/') ? clean(pathName) : `/${clean(pathName)}`}`;
}

function buildContentHubPayload({ domain, pageId, operationId, hubId, kind, input = {} }) {
  const idKey = kind === 'read' ? 'sourceId' : 'actionId';
  const bindingKey = kind === 'read' ? 'read' : 'action';
  return {
    domain,
    pageId,
    [idKey]: operationId,
    input: {
      contentHub: {
        [bindingKey]: input.contentHub?.[bindingKey],
        hubId,
        ...(input.contentHub?.articleId ? { articleId: input.contentHub.articleId } : {}),
        ...(input.contentHub?.scheduleId ? { scheduleId: input.contentHub.scheduleId } : {}),
      },
      ...Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'contentHub' && !SENSITIVE_INPUT_KEYS.has(key.toLowerCase()))),
    },
  };
}

function hasNeedle(value, needle) {
  if (!needle) return true;
  if (value === needle) return true;
  if (typeof value === 'string') return value.includes(needle);
  if (Array.isArray(value)) return value.some((entry) => hasNeedle(entry, needle));
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => hasNeedle(entry, needle));
  }
  return false;
}

function redact(value, secrets) {
  const secretValues = Array.from(new Set(secrets.map(clean).filter(Boolean))).sort((left, right) => right.length - left.length);
  let raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  for (const secret of secretValues) {
    raw = raw.split(secret).join('[REDACTED]');
  }
  return typeof value === 'string' ? raw : JSON.parse(raw);
}

function safeSmokeErrorMessage(error, status = 0) {
  const raw = clean(error).toLowerCase();
  const prefix = status ? `HTTP ${status}: ` : '';
  if (raw.includes('--runtime-base-url') && raw.includes('required')) {
    return 'Runtime-read base URL is required. Pass --runtime-base-url or ZLP_RUNTIME_READ_BASE_URL.';
  }
  if (raw.includes('provide an authenticated cookie')) {
    return 'Authentication cookie is required. Sign in and pass --cookie-file or ZLP_CONTENT_HUB_SMOKE_COOKIE.';
  }
  if (raw.includes('csrf cookie') && raw.includes('not found')) {
    return 'CSRF cookie was not found in the provided session cookie. Sign in again and retry the smoke.';
  }
  if (status === 401 || raw.includes('auth_required') || raw.includes('unauthorized')) {
    return `${prefix}Authentication is required. Sign in again and retry the smoke.`;
  }
  if (status === 403 || raw.includes('forbidden') || raw.includes('csrf') || raw.includes('permission')) {
    return `${prefix}The signed-in user does not have permission for this content action.`;
  }
  if (
    status === 404
    || raw.includes('not_found')
    || raw.includes('invalid id')
    || raw.includes('invalid identifier')
    || raw.includes('articleid')
    || raw.includes('revisionid')
  ) {
    return `${prefix}The smoke could not identify the target article or revision. Open the action from the article list and retry.`;
  }
  if (status === 409 || raw.includes('conflict') || raw.includes('already exists') || raw.includes('slug')) {
    return `${prefix}The smoke found a conflicting URL, slug, or existing record.`;
  }
  if (status === 400 || raw.includes('validation') || raw.includes('invalid ') || raw.includes('required')) {
    return `${prefix}The smoke sent a value the content service could not accept. Check the article form inputs.`;
  }
  if (status === 429 || raw.includes('rate_limited') || raw.includes('too many')) {
    return `${prefix}The content service is rate limiting requests. Wait and retry.`;
  }
  if (
    status >= 500
    || raw.includes('timeout')
    || raw.includes('timed out')
    || raw.includes('upstream')
    || raw.includes('unavailable')
    || raw.includes('runtime bundle')
    || raw.includes('public search')
  ) {
    return `${prefix}A deployed content service did not respond as expected. Check the service logs and retry.`;
  }
  return `${prefix}The content-hub product smoke failed. Check the deployment logs and retry.`;
}

function extractCreateResult(response) {
  const data = response?.data ?? {};
  const article = data.article ?? {};
  const revision = data.revision ?? {};
  return {
    articleId: clean(data.articleId) || clean(article.articleId),
    revisionId: clean(data.revisionId) || clean(data.latestRevisionId) || clean(revision.revisionId) || clean(article.latestRevisionId),
    path: clean(data.path) || clean(article.path),
  };
}

function extractPublishResult(response, fallback = {}) {
  const data = response?.data ?? {};
  return {
    articleId: clean(data.articleId) || fallback.articleId,
    revisionId: clean(data.revisionId) || fallback.revisionId,
    path: clean(data.path) || fallback.path,
  };
}

function extractScheduleId(response) {
  return clean(response?.data?.schedule?.scheduleId) || clean(response?.data?.scheduleId);
}

function metricNumber(item, key) {
  const value = Number(item?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function findAnalyticsItem(response, articleId) {
  const items = Array.isArray(response?.data?.items) ? response.data.items : [];
  return items.find((item) => clean(item.articleId) === articleId) ?? null;
}

function publicSearchIncludesArticle(response, articleId, pathName, title) {
  const articles = Array.isArray(response?.articles) ? response.articles : [];
  return articles.some((article) => clean(article.articleId) === articleId
    || clean(article.path) === pathName
    || clean(article.title) === title);
}

function hasPublicInteractionMetrics(response, articleId) {
  const item = findAnalyticsItem(response, articleId);
  return !!item
    && metricNumber(item, 'readProgress') > 0
    && metricNumber(item, 'ctaClicks') > 0
    && metricNumber(item, 'reactions') > 0
    && metricNumber(item, 'shares') > 0
    && metricNumber(item, 'comments') > 0
    && metricNumber(item, 'assetDownloads') > 0
    && metricNumber(item, 'forms') > 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readSessionCookie(args) {
  if (args['cookie-file']) {
    return clean(await readFile(args['cookie-file'], 'utf8'));
  }
  return clean(process.env.ZLP_CONTENT_HUB_SMOKE_COOKIE);
}

async function fetchJson(url, init, timeoutMs) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok || parsed?.ok === false) {
    throw new Error(safeSmokeErrorMessage(parsed?.code || parsed?.error || raw.slice(0, 240) || 'Request failed', response.status));
  }
  return parsed ?? { ok: response.ok };
}

async function fetchText(url, init, timeoutMs) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(safeSmokeErrorMessage(raw.slice(0, 240) || 'Request failed', response.status));
  }
  return raw;
}

async function fetchTextResult(url, init, timeoutMs) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

async function smokeStep(step, operation) {
  try {
    return await operation();
  } catch (error) {
    if (error && typeof error === 'object' && !error.smokeStep) {
      error.smokeStep = step;
    }
    throw error;
  }
}

async function runSmoke(options) {
  const {
    baseUrl,
    runtimeBaseUrl,
    domain,
    authProfileId,
    hubId,
    environment,
    lang,
    pageId,
    cookieHeader,
    csrf,
    timeoutMs,
    sharedPreview,
    now = new Date(),
  } = options;

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
    'X-ZLP-Domain': domain,
    'X-ZLP-Auth-Profile-Id': authProfileId,
    'X-ZLP-Content-Hub-Id': hubId,
  };
  const actionHeaders = { ...headers, 'X-ZLP-CSRF': csrf };
  const endpoint = (kind) => `${baseUrl}/features/content-hub/${kind}`;
  const token = compactTimestamp(now);
  const title = `QA Product Smoke ${token}`;
  const slug = slugify(title);
  const category = `qa-${token}`;
  const taxonomyCategoryId = `qa_category_${token}`;
  const tag = `product-smoke-${token}`;
  const taxonomyTagId = `qa_tag_${token}`;
  const expectedPath = `/blog/${category}/${slug}`;
  const articleBodyNeedle = `Contenido editado por smoke ${token}`;
  const commentPreviewNeedle = `QA smoke moderated comment ${token}`;
  const asset = {
    assetId: `asset_${token}`,
    kind: 'document',
    fileName: `qa-smoke-${token}.txt`,
    mimeType: 'text/plain',
    bytes: Buffer.byteLength(`Smoke asset ${token}`, 'utf8'),
    title: `Smoke asset ${token}`,
    alt: `Archivo de prueba ${token}`,
  };

  const upsertTaxonomy = async ({ taxonomyKind, taxonomyId, taxonomySlug, label }) => {
    const expected = {
      taxonomyId,
      kind: taxonomyKind,
      slug: taxonomySlug,
      label,
      description: `QA taxonomy smoke ${token}`,
      locale: lang,
      seoTitle: label,
      seoDescription: `SEO QA taxonomy smoke ${token}`,
    };
    const payload = buildContentHubPayload({
      domain,
      pageId: taxonomyKind === 'category' ? 'admin-blog-categorias' : 'admin-blog-tags',
      operationId: 'content_hub_upsert_taxonomy',
      hubId,
      kind: 'action',
      input: {
        contentHub: { action: 'upsertTaxonomy' },
        taxonomyKind,
        taxonomyId,
        slug: taxonomySlug,
        translation: label,
        taxonomyDescription: expected.description,
        seoTitle: label,
        seoDescription: expected.seoDescription,
        visible: true,
      },
    });
    const response = await smokeStep(`upsertTaxonomy:${taxonomyKind}`, () => fetchJson(endpoint('action'), {
      method: 'POST',
      headers: actionHeaders,
      body: JSON.stringify(payload),
    }, timeoutMs));
    const taxonomy = response?.data?.taxonomy ?? {};
    assertTaxonomyRecord(taxonomy, expected, `${taxonomyKind} upsert`);
  };

  const readTaxonomy = async ({ taxonomyKind, taxonomyId, taxonomySlug, label }) => {
    const expected = {
      taxonomyId,
      kind: taxonomyKind,
      slug: taxonomySlug,
      label,
      description: `QA taxonomy smoke ${token}`,
      locale: lang,
      seoTitle: label,
      seoDescription: `SEO QA taxonomy smoke ${token}`,
    };
    const payload = buildContentHubPayload({
      domain,
      pageId: taxonomyKind === 'category' ? 'admin-blog-categorias' : 'admin-blog-tags',
      operationId: 'content_hub_taxonomy_list',
      hubId,
      kind: 'read',
      input: {
        contentHub: { read: 'taxonomyList' },
        taxonomyKind,
      },
    });
    const response = await smokeStep(`taxonomyList:${taxonomyKind}`, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }, timeoutMs));
    assertNoInternalTaxonomyFields(response?.data, `${taxonomyKind} list`);
    const items = taxonomyKind === 'category' ? response?.data?.categories : response?.data?.tags;
    const item = Array.isArray(items)
      ? items.find((candidate) => clean(candidate.taxonomyId) === taxonomyId && clean(candidate.slug) === taxonomySlug)
      : null;
    if (!item) {
      throw new Error(`Taxonomy ${taxonomyKind} list did not include the smoke record.`);
    }
    assertTaxonomyRecord(item, expected, `${taxonomyKind} list`);
  };

  await upsertTaxonomy({
    taxonomyKind: 'category',
    taxonomyId: taxonomyCategoryId,
    taxonomySlug: category,
    label: `QA ${token}`,
  });
  await upsertTaxonomy({
    taxonomyKind: 'tag',
    taxonomyId: taxonomyTagId,
    taxonomySlug: tag,
    label: `Product Smoke ${token}`,
  });
  await readTaxonomy({
    taxonomyKind: 'category',
    taxonomyId: taxonomyCategoryId,
    taxonomySlug: category,
    label: `QA ${token}`,
  });
  await readTaxonomy({
    taxonomyKind: 'tag',
    taxonomyId: taxonomyTagId,
    taxonomySlug: tag,
    label: `Product Smoke ${token}`,
  });

  const createPayload = buildContentHubPayload({
    domain,
    pageId,
    operationId: 'content_hub_create_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'createArticle' },
      articleTitle: title,
      articleLanguage: lang,
      articleCategory: category,
      articleTags: `qa, ${tag}, content-hub`,
      articleSummary: `Smoke público ${token} para validar publicación completa.`,
      articleSeoTitle: title,
      articleSeoDescription: `Validación automática redacted del content hub ${token}.`,
      articleSlug: slug,
      articleVisibility: 'public',
      articleCanonicalPolicy: 'host-adaptive',
      articleCommentPolicy: 'authenticated-moderated',
      articleContentSafetyPolicy: 'trusted-authors',
      articlePublishIntent: 'draft',
    },
  });
  const createResponse = await smokeStep('createArticle', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(createPayload),
  }, timeoutMs));
  const created = extractCreateResult(createResponse);
  if (!created.articleId || !created.revisionId) {
    throw new Error('Create response did not include articleId and revisionId.');
  }

  const updatedRevisionId = `rev_${token}`;
  const updatePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-editor',
    operationId: 'content_hub_update_package',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'updatePackage', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
      articleTitle: title,
      articleLanguage: lang,
      articleCategory: category,
      articleTags: `qa, ${tag}, content-hub, edited`,
      articleSummary: `Smoke editado ${token} para validar edición antes de publicación.`,
      articleSlug: slug,
      articleContent: {
        ops: [
          { insert: `${articleBodyNeedle}.\n` },
        ],
      },
      advancedMode: true,
      allowedComponentPreset: 'advanced',
      editorNotes: `QA smoke ${token}`,
    },
  });
  const updateResponse = await smokeStep('updatePackage', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(updatePayload),
  }, timeoutMs));
  const updated = extractCreateResult(updateResponse);
  if ((updated.revisionId || updatedRevisionId) !== updatedRevisionId) {
    throw new Error('Update package did not preserve the requested revisionId.');
  }

  const revisionListPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-versiones',
    operationId: 'content_hub_revision_list',
    hubId,
    kind: 'read',
    input: {
      contentHub: { read: 'revisionList', articleId: created.articleId },
      articleId: created.articleId,
    },
  });
  const revisionListResponse = await smokeStep('revisionList', () => fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(revisionListPayload),
  }, timeoutMs));
  if (!hasNeedle(revisionListResponse, updatedRevisionId)) {
    throw new Error('Revision list did not include the updated revision.');
  }

  const previewPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-preview',
    operationId: 'content_hub_public_bundle_preview',
    hubId,
    kind: 'read',
    input: {
      contentHub: { read: 'publicBundlePreview', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
    },
  });
  const previewResponse = await smokeStep('publicBundlePreview', () => fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(previewPayload),
  }, timeoutMs));
  if (!hasNeedle(previewResponse, updatedRevisionId)) {
    throw new Error('Public bundle preview did not include the updated revision.');
  }

  const restorePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-versiones',
    operationId: 'content_hub_restore_revision',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'restoreRevision', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
    },
  });
  const restoreResponse = await smokeStep('restoreRevision', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(restorePayload),
  }, timeoutMs));
  if (!hasNeedle(restoreResponse, updatedRevisionId)) {
    throw new Error('Restore revision did not return the restored revision.');
  }

  const uploadAssetPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-medios',
    operationId: 'content_hub_upload_asset',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'uploadAsset', articleId: created.articleId },
      articleId: created.articleId,
      assetId: asset.assetId,
      upload: {
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        dataBase64: Buffer.from(`Smoke asset ${token}`, 'utf8').toString('base64'),
        bytes: asset.bytes,
      },
      metadata: {
        alt: asset.alt,
      },
      title: asset.title,
    },
  });
  const uploadAssetResponse = await smokeStep('uploadAsset', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(uploadAssetPayload),
  }, timeoutMs));
  assertAssetRecord(uploadAssetResponse?.data?.asset ?? {}, asset, 'upload');

  for (const readCheck of [
    {
      label: 'asset list',
      pageId: 'admin-blog-medios',
      operationId: 'content_hub_asset_list',
      binding: { read: 'assetList', articleId: created.articleId },
    },
    {
      label: 'moderation queue',
      pageId: 'admin-blog-moderacion',
      operationId: 'content_hub_moderation_queue',
      binding: { read: 'moderationQueue' },
    },
    {
      label: 'analytics summary',
      pageId: 'admin-blog-analiticas',
      operationId: 'content_hub_analytics_summary',
      binding: { read: 'analyticsSummary' },
    },
  ]) {
    const payload = buildContentHubPayload({
      domain,
      pageId: readCheck.pageId,
      operationId: readCheck.operationId,
      hubId,
      kind: 'read',
      input: {
        contentHub: readCheck.binding,
        articleId: created.articleId,
      },
    });
    const response = await smokeStep(readCheck.operationId, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }, timeoutMs));
    if (!Array.isArray(response?.data?.items)) {
      throw new Error(`Content hub ${readCheck.label} did not return an item list.`);
    }
    if (readCheck.binding.read === 'assetList') {
      assertNoInternalAssetFields(response?.data, 'asset list');
      const uploadedAsset = response.data.items.find((item) => clean(item.assetId) === asset.assetId);
      if (!uploadedAsset) {
        throw new Error('Content hub asset list did not include the uploaded smoke asset.');
      }
      assertAssetRecord(uploadedAsset, asset, 'list');
    } else if (readCheck.binding.read === 'moderationQueue') {
      assertNoInternalModerationFields(response?.data, 'moderation queue');
    } else if (readCheck.binding.read === 'analyticsSummary') {
      assertNoForbiddenPublicResponseFields(response?.data, 'analytics summary');
    }
  }

  const validatePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-seo',
    operationId: 'content_hub_validate_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'validate', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
      validationScope: 'publish',
    },
  });
  const validateResponse = await smokeStep('validate', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(validatePayload),
  }, timeoutMs));
  if (validateResponse?.data?.valid === false) {
    throw new Error('Article validation failed before review.');
  }

  const submitReviewPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-seo',
    operationId: 'content_hub_submit_review_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'submitReview', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
      reviewMessage: `QA smoke ${token}`,
      validationState: 'valid',
    },
  });
  await smokeStep('submitReview', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(submitReviewPayload),
  }, timeoutMs));

  const approvePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-seo',
    operationId: 'content_hub_approve_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'approveArticle', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
    },
  });
  await smokeStep('approveArticle', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(approvePayload),
  }, timeoutMs));

  const publishPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-seo',
    operationId: 'content_hub_publish_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'publish', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
      seoTitle: title,
      seoDescription: `Validación automática redacted del content hub ${token}.`,
      renderDomain: domain,
    },
  });
  const publishResponse = await smokeStep('publish', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(publishPayload),
  }, timeoutMs));
  const published = extractPublishResult(publishResponse, { ...created, path: expectedPath });
  if (!published.path.startsWith('/blog/')) {
    throw new Error('Publish response did not include a public blog path.');
  }

  const runtimeUrl = buildRuntimeBundleUrl({
    runtimeBaseUrl,
    domain,
    pathName: published.path,
    lang,
    environment,
  });
  const runtimeResponse = await smokeStep('runtimeBundle', () => fetchJson(runtimeUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, timeoutMs));
  const runtimeHasArticle = hasNeedle(runtimeResponse, created.articleId)
    || hasNeedle(runtimeResponse, title)
    || hasNeedle(runtimeResponse, published.path);
  if (!runtimeHasArticle) {
    throw new Error('Runtime bundle did not include the published article.');
  }

  const searchChecks = [
    { label: 'title', query: title },
    { label: 'slug', query: slug },
    { label: 'path', query: published.path },
    { label: 'category', query: category },
    { label: 'tag', query: tag },
  ].filter((entry, index, entries) => entry.query && entries.findIndex((candidate) => candidate.query === entry.query) === index);
  for (const check of searchChecks) {
    const searchUrl = buildPublicSearchUrl({
      baseUrl,
      domain,
      lang,
      query: check.query,
      sharedPreview,
    });
    const searchResponse = await smokeStep(`publicSearch:${check.label}`, () => fetchJson(searchUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, timeoutMs));
    if (!publicSearchIncludesArticle(searchResponse, created.articleId, published.path, title)) {
      throw new Error(`Public content-hub search did not include the published article by ${check.label}.`);
    }
  }

  const publicArticleUrl = buildPublicArticleUrl({
    baseUrl,
    domain,
    pathName: published.path,
    lang,
    sharedPreview,
  });
  const publicArticleHtml = await smokeStep('publicArticleHtml', () => fetchText(publicArticleUrl, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  }, timeoutMs));
  if (!publicArticleHtml.includes(title) && !publicArticleHtml.includes(published.path)) {
    throw new Error('Published public article HTML did not include the smoke article.');
  }
  if (!publicArticleHtml.includes(articleBodyNeedle)) {
    throw new Error('Published public article HTML did not include the edited article body.');
  }

  for (const interaction of [
    { label: 'readProgress', eventType: 'readProgress', targetId: 'article_body', value: '75' },
    { label: 'cta', eventType: 'cta_click', targetId: 'primary_cta', value: 'lead' },
    { label: 'reaction', eventType: 'reaction', targetId: 'helpful', value: 'helpful' },
    { label: 'share', eventType: 'share', targetId: 'share_current_page', value: 'copy' },
    { label: 'assetDownload', eventType: 'assetDownload', targetId: asset.assetId, value: 'downloaded' },
    { label: 'form', eventType: 'form', targetId: 'lead_form', value: 'submitted' },
  ]) {
    const interactionPayload = buildContentHubPayload({
      domain,
      pageId: 'blog-article',
      operationId: 'content_hub_record_interaction',
      hubId,
      kind: 'action',
      input: {
        contentHub: { action: 'recordInteraction', articleId: created.articleId },
        articleId: created.articleId,
        eventType: interaction.eventType,
        targetId: interaction.targetId,
        value: interaction.value,
        path: published.path,
      },
    });
    await smokeStep(`recordInteraction:${interaction.label}`, () => fetchJson(endpoint('action'), {
      method: 'POST',
      headers: actionHeaders,
      body: JSON.stringify(interactionPayload),
    }, timeoutMs));
  }

  const commentPayload = buildContentHubPayload({
    domain,
    pageId: 'blog-article',
    operationId: 'content_hub_queue_comment',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'queueComment', articleId: created.articleId },
      articleId: created.articleId,
      commentBody: `QA smoke moderated comment ${token}`,
      commentPolicy: 'authenticated-moderation',
    },
  });
  const queueCommentResponse = await smokeStep('queueComment', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(commentPayload),
  }, timeoutMs));
  const commentId = clean(queueCommentResponse?.data?.comment?.commentId || queueCommentResponse?.data?.commentId);
  if (!commentId) {
    throw new Error('Queue comment response did not include a commentId.');
  }

  const readModerationQueue = async (status, label) => {
    const payload = buildContentHubPayload({
      domain,
      pageId: 'admin-blog-moderacion',
      operationId: 'content_hub_moderation_queue',
      hubId,
      kind: 'read',
      input: {
        contentHub: { read: 'moderationQueue' },
        articleId: created.articleId,
      },
    });
    const response = await smokeStep(`moderationQueue:${label}`, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }, timeoutMs));
    assertNoInternalModerationFields(response?.data, `moderation queue ${label}`);
    const item = Array.isArray(response?.data?.items)
      ? response.data.items.find((candidate) => clean(candidate.commentId) === commentId)
      : null;
    if (!item) {
      throw new Error(`Moderation queue did not include the ${label} smoke comment.`);
    }
    assertModerationRecord(item, {
      articleId: created.articleId,
      commentId,
      status,
      previewNeedle: commentPreviewNeedle,
      moderated: status !== 'queued',
    }, label);
  };

  await readModerationQueue('queued', 'queued');

  const moderateCommentPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-moderacion',
    operationId: 'content_hub_moderate_comment',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'moderateComment', commentId },
      commentId,
      decision: 'approved',
      reason: 'QA smoke approval',
    },
  });
  const moderateCommentResponse = await smokeStep('moderateComment', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(moderateCommentPayload),
  }, timeoutMs));
  assertModerationRecord(moderateCommentResponse?.data?.moderation ?? {}, {
    articleId: created.articleId,
    commentId,
    status: 'approved',
    previewNeedle: commentPreviewNeedle,
    moderated: true,
  }, 'approve');

  await readModerationQueue('approved', 'approved');

  const analyticsAfterInteractionsPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-analiticas',
    operationId: 'content_hub_analytics_summary',
    hubId,
    kind: 'read',
    input: {
      contentHub: { read: 'analyticsSummary' },
      articleId: created.articleId,
    },
  });
  let analyticsAfterInteractionsResponse = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    analyticsAfterInteractionsResponse = await smokeStep(`analyticsSummary:publicInteractions:${attempt}`, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(analyticsAfterInteractionsPayload),
    }, timeoutMs));
    assertNoForbiddenPublicResponseFields(analyticsAfterInteractionsResponse?.data, 'analytics summary');
    if (hasPublicInteractionMetrics(analyticsAfterInteractionsResponse, created.articleId)) {
      break;
    }
    if (attempt < 3) {
      await sleep(350);
    }
  }
  if (!hasPublicInteractionMetrics(analyticsAfterInteractionsResponse, created.articleId)) {
    throw new Error('Analytics summary did not include read-progress, CTA, reaction, share, asset-download, form, and comment counts for the published article.');
  }

  const canonicalArticleUrl = publicCanonicalArticleUrl(domain, published.path);
  for (const xmlCheck of [
    { label: 'sitemap', pathName: '/sitemap.xml', lang: '', root: '<urlset', needles: [`<loc>${canonicalArticleUrl}</loc>`] },
    { label: 'feed', pathName: '/feed.xml', lang, root: '<rss', needles: [`<link>${canonicalArticleUrl}</link>`, `<guid>${canonicalArticleUrl}</guid>`] },
  ]) {
    const xmlUrl = buildPublicXmlUrl({
      baseUrl,
      domain,
      pathName: xmlCheck.pathName,
      lang: xmlCheck.lang,
      sharedPreview,
    });
    const xmlText = await smokeStep(xmlCheck.label, () => fetchText(xmlUrl, {
      method: 'GET',
      headers: { Accept: 'application/xml,text/xml,*/*' },
    }, timeoutMs));
    if (!xmlText.includes(xmlCheck.root) || !xmlCheck.needles.some((needle) => xmlText.includes(needle))) {
      throw new Error(`Public ${xmlCheck.label} did not include the published article.`);
    }
  }

  const schedulePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-programados',
    operationId: 'content_hub_schedule_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'schedule', articleId: created.articleId },
      articleId: created.articleId,
      revisionId: updatedRevisionId,
      unpublishAt: futureIso(now, 120),
      timezone: 'America/Mexico_City',
      scheduleAction: 'unpublish',
      publishMessage: `QA smoke ${token}`,
    },
  });
  const scheduleResponse = await smokeStep('schedule', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(schedulePayload),
  }, timeoutMs));
  const scheduleId = extractScheduleId(scheduleResponse);
  if (!scheduleId) {
    throw new Error('Schedule response did not include scheduleId.');
  }

  const scheduleListPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-programados',
    operationId: 'content_hub_schedule_list',
    hubId,
    kind: 'read',
    input: {
      contentHub: { read: 'scheduleList', articleId: created.articleId },
      articleId: created.articleId,
    },
  });
  const scheduleListResponse = await smokeStep('scheduleList', () => fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(scheduleListPayload),
  }, timeoutMs));
  const scheduleItems = Array.isArray(scheduleListResponse?.data?.items) ? scheduleListResponse.data.items : [];
  if (!scheduleItems.some((item) => clean(item.scheduleId) === scheduleId)) {
    throw new Error('Schedule list did not include the created schedule.');
  }

  const cancelPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-programados',
    operationId: 'content_hub_cancel_schedule',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'cancelSchedule', articleId: created.articleId, scheduleId },
      articleId: created.articleId,
      scheduleId,
    },
  });
  const cancelResponse = await smokeStep('cancelSchedule', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(cancelPayload),
  }, timeoutMs));
  if (clean(cancelResponse?.data?.schedule?.status) !== 'canceled') {
    throw new Error('Cancel schedule did not return canceled status.');
  }

  const unpublishPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-programados',
    operationId: 'content_hub_unpublish_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'unpublishArticle', articleId: created.articleId },
      articleId: created.articleId,
      renderDomain: domain,
    },
  });
  const unpublishResponse = await smokeStep('unpublishArticle', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(unpublishPayload),
  }, timeoutMs));
  if (clean(unpublishResponse?.data?.status) !== 'unpublished') {
    throw new Error('Unpublish article did not return unpublished status.');
  }
  if (clean(unpublishResponse?.data?.articleId) !== created.articleId) {
    throw new Error('Unpublish article did not return the smoke article ID.');
  }
  if (clean(unpublishResponse?.data?.path) !== published.path) {
    throw new Error('Unpublish article did not return the published path.');
  }
  if (!clean(unpublishResponse?.data?.unpublishedAt)) {
    throw new Error('Unpublish article did not return unpublishedAt.');
  }

  const unpublishedDetailPayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulo-editor',
    operationId: 'content_hub_article_detail',
    hubId,
    kind: 'read',
    input: {
      contentHub: { read: 'articleDetail', articleId: created.articleId },
      articleId: created.articleId,
    },
  });
  let unpublishedDetail = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await smokeStep(`articleDetailAfterUnpublish:${attempt}`, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(unpublishedDetailPayload),
    }, timeoutMs));
    unpublishedDetail = response?.data?.item ?? null;
    if (clean(unpublishedDetail?.status) === 'unpublished' && clean(unpublishedDetail?.visibility) === 'private') {
      break;
    }
    if (attempt < 3) {
      await sleep(350);
    }
  }
  if (clean(unpublishedDetail?.status) !== 'unpublished' || clean(unpublishedDetail?.visibility) !== 'private') {
    throw new Error('Article detail did not show unpublished/private after unpublish.');
  }

  const publicAbsenceSearchUrl = buildPublicSearchUrl({
    baseUrl,
    domain,
    lang,
    query: slug,
    sharedPreview,
  });
  const publicAbsenceArticleUrl = buildPublicArticleUrl({
    baseUrl,
    domain,
    pathName: published.path,
    lang,
    sharedPreview,
  });
  const publicAbsenceSitemapUrl = buildPublicXmlUrl({
    baseUrl,
    domain,
    pathName: '/sitemap.xml',
    lang: '',
    sharedPreview,
  });
  const publicAbsenceFeedUrl = buildPublicXmlUrl({
    baseUrl,
    domain,
    pathName: '/feed.xml',
    lang,
    sharedPreview,
  });
  let publicAbsence = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const searchResponse = await smokeStep(`publicSearchAfterUnpublish:${attempt}`, () => fetchJson(publicAbsenceSearchUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, timeoutMs));
    const articleResponse = await smokeStep(`publicArticleAfterUnpublish:${attempt}`, () => fetchTextResult(publicAbsenceArticleUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    }, timeoutMs));
    const sitemapResponse = await smokeStep(`sitemapAfterUnpublish:${attempt}`, () => fetchTextResult(publicAbsenceSitemapUrl, {
      method: 'GET',
      headers: { Accept: 'application/xml,text/xml,*/*' },
    }, timeoutMs));
    const feedResponse = await smokeStep(`feedAfterUnpublish:${attempt}`, () => fetchTextResult(publicAbsenceFeedUrl, {
      method: 'GET',
      headers: { Accept: 'application/xml,text/xml,*/*' },
    }, timeoutMs));
    publicAbsence = {
      search: publicSearchIncludesArticle(searchResponse, created.articleId, published.path, title),
      article: articleResponse.ok && (
        articleResponse.text.includes(title)
        || articleResponse.text.includes(articleBodyNeedle)
        || articleResponse.text.includes(published.path)
      ),
      sitemap: sitemapResponse.ok && sitemapResponse.text.includes(canonicalArticleUrl),
      feed: feedResponse.ok && feedResponse.text.includes(canonicalArticleUrl),
    };
    if (!publicAbsence.search && !publicAbsence.article && !publicAbsence.sitemap && !publicAbsence.feed) {
      break;
    }
    if (attempt < 3) {
      await sleep(350);
    }
  }
  if (publicAbsence?.search) {
    throw new Error('Public search still includes the unpublished article.');
  }
  if (publicAbsence?.article) {
    throw new Error('Public article page still includes the unpublished article.');
  }
  if (publicAbsence?.sitemap) {
    throw new Error('Public sitemap still includes the unpublished article.');
  }
  if (publicAbsence?.feed) {
    throw new Error('Public feed still includes the unpublished article.');
  }

  const archivePayload = buildContentHubPayload({
    domain,
    pageId: 'admin-blog-articulos',
    operationId: 'content_hub_archive_article',
    hubId,
    kind: 'action',
    input: {
      contentHub: { action: 'archiveArticle', articleId: created.articleId },
      articleId: created.articleId,
      archiveReason: `QA smoke cleanup ${token}`,
    },
  });
  const archiveResponse = await smokeStep('archiveArticle', () => fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(archivePayload),
  }, timeoutMs));
  if (clean(archiveResponse?.data?.status) !== 'archived') {
    throw new Error('Archive article did not return archived status.');
  }

  let archivedDetail = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await smokeStep(`articleDetailAfterArchive:${attempt}`, () => fetchJson(endpoint('read'), {
      method: 'POST',
      headers,
      body: JSON.stringify(unpublishedDetailPayload),
    }, timeoutMs));
    archivedDetail = response?.data?.item ?? null;
    if (clean(archivedDetail?.status) === 'archived' && clean(archivedDetail?.visibility) === 'private') {
      break;
    }
    if (attempt < 3) {
      await sleep(350);
    }
  }
  if (clean(archivedDetail?.status) !== 'archived' || clean(archivedDetail?.visibility) !== 'private') {
    throw new Error('Article detail did not show archived/private after archive.');
  }

  return {
    ok: true,
    domain,
    environment,
    hubId,
    articleId: created.articleId,
    revisionId: updatedRevisionId,
    path: published.path,
    publicArticleUrl,
    scheduleId,
    checks: {
      createArticle: true,
      upsertCategory: true,
      upsertTag: true,
      taxonomyCategoryList: true,
      taxonomyTagList: true,
      uploadAsset: true,
      updatePackage: true,
      revisionList: true,
      publicBundlePreview: true,
      restoreRevision: true,
      assetList: true,
      moderationQueue: true,
      validate: true,
      submitReview: true,
      approveArticle: true,
      publish: true,
      recordInteractionReadProgress: true,
      recordInteractionCta: true,
      recordInteractionReaction: true,
      recordInteractionShare: true,
      recordInteractionAssetDownload: true,
      recordInteractionForm: true,
      queueComment: true,
      moderationQueueAfterComment: true,
      moderateComment: true,
      moderationQueueAfterModeration: true,
      publicInteractionAnalytics: true,
      runtimeBundle: true,
      publicSearch: true,
      publicArticleHtml: true,
      publicArticleBody: true,
      sitemap: true,
      feed: true,
      scheduleList: true,
      cancelSchedule: true,
      unpublishArticle: true,
      articleDetailAfterUnpublish: true,
      publicSearchAfterUnpublish: true,
      publicArticleAfterUnpublish: true,
      sitemapAfterUnpublish: true,
      feedAfterUnpublish: true,
      archiveArticle: true,
      articleDetailAfterArchive: true,
    },
  };
}

async function main(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const publicTarget = resolvePublicSmokeTarget(args);
  const runtimeBaseUrl = assertHttpsBaseUrl(args['runtime-base-url'] || process.env.ZLP_RUNTIME_READ_BASE_URL, '--runtime-base-url');
  const cookieHeader = await readSessionCookie(args);
  if (!cookieHeader) {
    throw new Error('Provide an authenticated cookie through --cookie-file or ZLP_CONTENT_HUB_SMOKE_COOKIE.');
  }
  const csrfCookieName = clean(args['csrf-cookie-name']) || DEFAULT_CSRF_COOKIE_NAME;
  const csrf = clean(process.env.ZLP_CONTENT_HUB_SMOKE_CSRF) || cookieValue(cookieHeader, csrfCookieName);
  if (!csrf) {
    throw new Error(`CSRF cookie '${csrfCookieName}' was not found in the provided cookie header.`);
  }

  const timeoutMs = Number.parseInt(clean(args['timeout-ms']) || String(DEFAULT_TIMEOUT_MS), 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error('--timeout-ms must be an integer >= 1000.');
  }

  const result = await runSmoke({
    baseUrl: publicTarget.baseUrl,
    runtimeBaseUrl,
    domain: clean(args.domain) || DEFAULT_DOMAIN,
    authProfileId: clean(args['auth-profile-id']) || DEFAULT_AUTH_PROFILE_ID,
    hubId: clean(args['hub-id']) || DEFAULT_HUB_ID,
    environment: publicTarget.environment,
    lang: clean(args.lang) || DEFAULT_LANG,
    pageId: clean(args['page-id']) || DEFAULT_PAGE_ID,
    cookieHeader,
    csrf,
    timeoutMs,
    sharedPreview: publicTarget.sharedPreview,
  });

  process.stdout.write(`${JSON.stringify(redact(result, [cookieHeader, csrf]), null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const cookie = clean(process.env.ZLP_CONTENT_HUB_SMOKE_COOKIE);
    const csrf = clean(process.env.ZLP_CONTENT_HUB_SMOKE_CSRF) || cookieValue(cookie, DEFAULT_CSRF_COOKIE_NAME);
    const rawError = error instanceof Error ? error.message : String(error);
    const step = error && typeof error === 'object' && typeof error.smokeStep === 'string'
      ? error.smokeStep
      : undefined;
    const payload = redact({
      ok: false,
      ...(step ? { step } : {}),
      error: /^HTTP \d{3}: /.test(rawError) ? rawError : safeSmokeErrorMessage(rawError),
    }, [cookie, csrf]);
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  });
}

export {
  assertNoForbiddenPublicResponseFields,
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
};
