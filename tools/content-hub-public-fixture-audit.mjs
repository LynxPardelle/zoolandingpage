#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://test.zoolandingpage.com.mx';
const DEFAULT_DOMAIN = 'zoositioweb.com.mx';
const DEFAULT_LANG = 'es';
const DEFAULT_TIMEOUT_MS = 20000;

const FIXTURE_PATTERNS = [
  [/QA Product Smoke/i, 'QA Product Smoke title'],
  [/QA Browser Body/i, 'QA Browser Body title'],
  [/QA E2E Content Hub/i, 'QA E2E Content Hub title'],
  [/qa-product-smoke/i, 'qa-product-smoke slug'],
  [/qa-browser-body/i, 'qa-browser-body slug'],
  [/qa-e2e-content-hub/i, 'qa-e2e-content-hub slug'],
  [/browser-smoke/i, 'browser-smoke tag'],
  [/product-smoke/i, 'product-smoke tag'],
  [/\/blog\/qa(?:\/|<|\?|#|"|'|\s|$)/i, '/blog/qa public route'],
];

function parseArgs(rawArgs) {
  const args = {};
  for (const rawArg of rawArgs) {
    if (!rawArg.startsWith('--')) continue;
    const [key, ...valueParts] = rawArg.slice(2).split('=');
    args[key] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function clean(value) {
  return String(value ?? '').trim();
}

function booleanArg(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(clean(value).toLowerCase());
}

function normalizeBaseUrl(value) {
  const baseUrl = clean(value) || DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

function buildAuditUrls({
  baseUrl = DEFAULT_BASE_URL,
  domain = DEFAULT_DOMAIN,
  lang = DEFAULT_LANG,
  sharedPreview = true,
  includeBlog = true,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const surfaces = [
    ['/content-hub-search.json', 'search'],
    ['/sitemap.xml', 'sitemap'],
    ['/feed.xml', 'feed'],
  ];
  if (includeBlog) {
    surfaces.push(['/blog', 'blog']);
  }

  return surfaces.map(([pathName, surface]) => {
    const url = new URL(pathName, normalizedBaseUrl);
    if (sharedPreview) {
      url.searchParams.set('draftDomain', clean(domain) || DEFAULT_DOMAIN);
    }
    url.searchParams.set('lang', clean(lang) || DEFAULT_LANG);
    url.searchParams.set('fixtureAudit', String(Date.now()));
    return { surface, url: url.toString() };
  });
}

function findTextLeaks(text) {
  const body = String(text ?? '');
  return FIXTURE_PATTERNS
    .filter(([pattern]) => pattern.test(body))
    .map(([, label]) => label);
}

function findSearchLeaks(payload) {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  const leaks = [];
  for (const article of articles) {
    const title = clean(article?.title);
    const pathName = clean(article?.path);
    const categorySlug = clean(article?.categorySlug);
    const tags = Array.isArray(article?.tags) ? article.tags.map(clean) : [];
    const text = JSON.stringify({
      articleId: clean(article?.articleId),
      title,
      path: pathName,
      categorySlug,
      tags,
    });
    const patternLeaks = findTextLeaks(text);
    if (categorySlug === 'qa') {
      patternLeaks.push('qa category');
    }
    if (patternLeaks.length > 0) {
      leaks.push({
        articleId: clean(article?.articleId),
        title,
        path: pathName,
        reasons: [...new Set(patternLeaks)].sort(),
      });
    }
  }
  return leaks;
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'cache-control': 'no-cache',
        'user-agent': 'zoolanding-content-hub-public-fixture-audit',
      },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runAudit(options = {}) {
  const urls = buildAuditUrls(options);
  const results = [];

  for (const target of urls) {
    const response = await fetchText(target.url, options.timeoutMs);
    const surfaceResult = {
      surface: target.surface,
      url: target.url.replace(/([?&])fixtureAudit=\d+(&?)/, '$1fixtureAudit=<ts>$2').replace(/[?&]$/, ''),
      status: response.status,
      ok: response.ok,
      leaks: [],
    };

    if (!response.ok) {
      surfaceResult.leaks.push({ reason: `HTTP ${response.status}` });
    } else if (target.surface === 'search') {
      try {
        surfaceResult.leaks.push(...findSearchLeaks(JSON.parse(response.text)));
      } catch {
        surfaceResult.leaks.push({ reason: 'search JSON is invalid' });
      }
    } else {
      surfaceResult.leaks.push(...findTextLeaks(response.text).map((reason) => ({ reason })));
    }

    results.push(surfaceResult);
  }

  return {
    ok: results.every((result) => result.ok && result.leaks.length === 0),
    checkedAt: new Date().toISOString(),
    results,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await runAudit({
    baseUrl: args['base-url'] || DEFAULT_BASE_URL,
    domain: args.domain || DEFAULT_DOMAIN,
    lang: args.lang || DEFAULT_LANG,
    timeoutMs: Number(args['timeout-ms'] || DEFAULT_TIMEOUT_MS),
    sharedPreview: booleanArg(args['shared-preview'], true),
    includeBlog: booleanArg(args['include-blog'], true),
  });

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
    process.exitCode = 1;
  });
}

export {
  buildAuditUrls,
  findSearchLeaks,
  findTextLeaks,
  parseArgs,
  runAudit,
};
