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
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
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
  const category = 'qa';
  const expectedPath = `/blog/${category}/${slug}`;

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
      articleTags: 'qa, product-smoke, content-hub',
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
  const createResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(createPayload),
  }, timeoutMs);
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
      articleTags: 'qa, product-smoke, content-hub, edited',
      articleSummary: `Smoke editado ${token} para validar edición antes de publicación.`,
      articleSlug: slug,
      articleContent: {
        ops: [
          { insert: `Contenido editado por smoke ${token}.\n` },
        ],
      },
      editorNotes: `QA smoke ${token}`,
    },
  });
  const updateResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(updatePayload),
  }, timeoutMs);
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
  const revisionListResponse = await fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(revisionListPayload),
  }, timeoutMs);
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
  const previewResponse = await fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(previewPayload),
  }, timeoutMs);
  if (!hasNeedle(previewResponse, updatedRevisionId)) {
    throw new Error('Public bundle preview did not include the updated revision.');
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
  const validateResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(validatePayload),
  }, timeoutMs);
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
  await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(submitReviewPayload),
  }, timeoutMs);

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
  await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(approvePayload),
  }, timeoutMs);

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
  const publishResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(publishPayload),
  }, timeoutMs);
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
  const runtimeResponse = await fetchJson(runtimeUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, timeoutMs);
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
    { label: 'tag', query: 'product-smoke' },
  ].filter((entry, index, entries) => entry.query && entries.findIndex((candidate) => candidate.query === entry.query) === index);
  for (const check of searchChecks) {
    const searchUrl = buildPublicSearchUrl({
      baseUrl,
      domain,
      lang,
      query: check.query,
      sharedPreview,
    });
    const searchResponse = await fetchJson(searchUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, timeoutMs);
    const articles = Array.isArray(searchResponse?.articles) ? searchResponse.articles : [];
    const searchHasArticle = articles.some((article) => clean(article.articleId) === created.articleId
      || clean(article.path) === published.path
      || clean(article.title) === title);
    if (!searchHasArticle) {
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
  const publicArticleHtml = await fetchText(publicArticleUrl, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  }, timeoutMs);
  if (!publicArticleHtml.includes(title) && !publicArticleHtml.includes(published.path)) {
    throw new Error('Published public article HTML did not include the smoke article.');
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
  const scheduleResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(schedulePayload),
  }, timeoutMs);
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
  const scheduleListResponse = await fetchJson(endpoint('read'), {
    method: 'POST',
    headers,
    body: JSON.stringify(scheduleListPayload),
  }, timeoutMs);
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
  const cancelResponse = await fetchJson(endpoint('action'), {
    method: 'POST',
    headers: actionHeaders,
    body: JSON.stringify(cancelPayload),
  }, timeoutMs);
  if (clean(cancelResponse?.data?.schedule?.status) !== 'canceled') {
    throw new Error('Cancel schedule did not return canceled status.');
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
      updatePackage: true,
      revisionList: true,
      publicBundlePreview: true,
      validate: true,
      submitReview: true,
      approveArticle: true,
      publish: true,
      runtimeBundle: true,
      publicSearch: true,
      publicArticleHtml: true,
      scheduleList: true,
      cancelSchedule: true,
    },
  };
}

async function main(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const baseUrl = assertHttpsBaseUrl(args['base-url'] || process.env.ZLP_CONTENT_HUB_SMOKE_BASE_URL || DEFAULT_BASE_URL, '--base-url');
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
    baseUrl,
    runtimeBaseUrl,
    domain: clean(args.domain) || DEFAULT_DOMAIN,
    authProfileId: clean(args['auth-profile-id']) || DEFAULT_AUTH_PROFILE_ID,
    hubId: clean(args['hub-id']) || DEFAULT_HUB_ID,
    environment: clean(args.environment) || DEFAULT_ENVIRONMENT,
    lang: clean(args.lang) || DEFAULT_LANG,
    pageId: clean(args['page-id']) || DEFAULT_PAGE_ID,
    cookieHeader,
    csrf,
    timeoutMs,
    sharedPreview: booleanArg(args['shared-preview'], true),
  });

  process.stdout.write(`${JSON.stringify(redact(result, [cookieHeader, csrf]), null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const cookie = clean(process.env.ZLP_CONTENT_HUB_SMOKE_COOKIE);
    const csrf = clean(process.env.ZLP_CONTENT_HUB_SMOKE_CSRF) || cookieValue(cookie, DEFAULT_CSRF_COOKIE_NAME);
    const rawError = error instanceof Error ? error.message : String(error);
    const payload = redact({
      ok: false,
      error: /^HTTP \d{3}: /.test(rawError) ? rawError : safeSmokeErrorMessage(rawError),
    }, [cookie, csrf]);
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  });
}

export {
  buildContentHubPayload,
  buildPublicArticleUrl,
  buildPublicSearchUrl,
  buildRuntimeBundleUrl,
  cookieValue,
  extractCreateResult,
  parseArgs,
  redact,
  runSmoke,
  safeSmokeErrorMessage,
  slugify,
};
