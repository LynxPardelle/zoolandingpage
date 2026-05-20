#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_CUSTOM_BASE_URL = 'https://api.zoolandingpage.com.mx';
const DEFAULT_RAW_BASE_URL = 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';
const DEFAULT_DOMAIN = 'zoolandingpage.com.mx';
const DEFAULT_PATH = '/';
const DEFAULT_LANG = 'es';
const DEFAULT_REQUESTS = 100;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_TIME_ZONE = 'America/Mexico_City';
const DEFAULT_CACHE_MODE = 'no-store';
const TARGETS = [
  { name: 'custom-domain', baseUrl: DEFAULT_CUSTOM_BASE_URL },
  { name: 'raw-api-gateway', baseUrl: DEFAULT_RAW_BASE_URL },
];
const VALID_CACHE_MODES = new Set(['default', 'no-store', 'reload', 'no-cache', 'force-cache']);

function parseArgs(rawArgs) {
  const args = { domain: [] };
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';

    if (key === 'domain') {
      args.domain.push(...splitList(value));
      continue;
    }

    args[key] = value;
  }
  return args;
}

function splitList(value) {
  return String(value ?? '')
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function integerArg(args, key, fallback, minimum = 1) {
  const parsed = Number.parseInt(String(args[key] ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`--${key} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function cacheModeArg(value) {
  const cacheMode = String(value ?? DEFAULT_CACHE_MODE).trim().toLowerCase();
  if (!VALID_CACHE_MODES.has(cacheMode)) {
    throw new Error(`--cache-mode must be one of: ${Array.from(VALID_CACHE_MODES).join(', ')}`);
  }
  return cacheMode;
}

function targetNamesArg(value) {
  const requested = splitList(value || 'all');
  if (requested.includes('all')) {
    return TARGETS.map(target => target.name);
  }

  const known = new Set(TARGETS.map(target => target.name));
  for (const name of requested) {
    if (!known.has(name)) {
      throw new Error(`--target must be all or one of: ${Array.from(known).join(', ')}`);
    }
  }
  return requested;
}

function normalizeBaseUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

function buildRuntimeUrl({ baseUrl, domain, pathName = DEFAULT_PATH, lang = DEFAULT_LANG }) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/runtime-bundle`);
  url.searchParams.set('domain', domain);
  url.searchParams.set('path', pathName);
  url.searchParams.set('lang', lang);
  return url.toString();
}

function formatErrorSummary(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const parts = [error.name === 'Error' ? error.message : `${error.name}: ${error.message}`];
  if (error.cause && typeof error.cause === 'object') {
    if ('code' in error.cause && error.cause.code) {
      parts.push(String(error.cause.code));
    }
    if ('message' in error.cause && error.cause.message && error.cause.message !== error.message) {
      parts.push(String(error.cause.message));
    }
  }
  return parts.filter(Boolean).join(' | ');
}

async function fetchProbe(url, { timeoutMs, cacheMode }) {
  const started = performance.now();
  try {
    const requestInit = {
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (cacheMode !== 'default') {
      requestInit.cache = cacheMode;
    }

    const response = await fetch(url, requestInit);
    const body = await response.text();
    let parsed = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      parsed = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Math.round((performance.now() - started) * 100) / 100,
      error: null,
      payloadOk: parsed?.ok ?? null,
      bytes: body.length,
      bodyPrefix: !response.ok || parsed?.ok === false ? body.slice(0, 300) : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Math.round((performance.now() - started) * 100) / 100,
      error: formatErrorSummary(error),
      payloadOk: null,
      bytes: 0,
      bodyPrefix: null,
    };
  }
}

async function runPool(total, concurrency, worker) {
  const results = [];
  let next = 0;

  async function runWorker() {
    while (next < total) {
      const index = next;
      next += 1;
      results[index] = await worker(index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))];
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summarizeSamples(samples) {
  const successes = samples.filter(sample => sample.ok && sample.payloadOk !== false);
  const failures = samples.filter(sample => !sample.ok || sample.payloadOk === false);
  const latencyValues = successes.map(sample => sample.latencyMs).sort((left, right) => left - right);
  return {
    total: samples.length,
    success: successes.length,
    failure: failures.length,
    failureRate: samples.length ? failures.length / samples.length : 0,
    statusCounts: countBy(samples.map(sample => sample.status ?? 'transport-error')),
    payloadOkCounts: countBy(samples.map(sample => sample.payloadOk ?? 'unknown')),
    errors: countBy(failures.map(sample => sample.error ?? `HTTP ${sample.status}`)),
    latencyMs: {
      min: latencyValues.length ? latencyValues[0] : null,
      p50: percentile(latencyValues, 50),
      p95: percentile(latencyValues, 95),
      max: latencyValues.length ? latencyValues.at(-1) : null,
    },
  };
}

function centralTimestamp(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} CT (${get('timeZoneName')})`;
}

async function probeTarget({ name, baseUrl, domains, pathName, lang, requests, concurrency, timeoutMs, cacheMode }) {
  const samples = await runPool(requests, concurrency, async index => {
    const domain = domains[index % domains.length];
    const url = buildRuntimeUrl({ baseUrl, domain, pathName, lang });
    return {
      target: name,
      domain,
      index,
      url,
      ...(await fetchProbe(url, { timeoutMs, cacheMode })),
    };
  });

  return {
    name,
    baseUrl,
    summary: summarizeSamples(samples),
    samples,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Runtime Front-Door Probe',
    '',
    `Date: ${report.generatedAtCentral} Central Time`,
    `Requests per target: ${report.requests}`,
    `Concurrency: ${report.concurrency}`,
    `Fetch cache mode: ${report.cacheMode}`,
    `Domains: ${report.domains.join(', ')}`,
    '',
    '| Target | Success | Failure | Failure rate | p50 ms | p95 ms | Errors |',
    '|---|---:|---:|---:|---:|---:|---|',
  ];

  for (const target of report.targets) {
    const summary = target.summary;
    const errors = Object.entries(summary.errors)
      .map(([error, count]) => `${error}=${count}`)
      .join('; ') || 'none';
    lines.push(
      `| ${target.name} | ${summary.success} | ${summary.failure} | ${(summary.failureRate * 100).toFixed(2)}% | ${summary.latencyMs.p50 ?? 'n/a'} | ${summary.latencyMs.p95 ?? 'n/a'} | ${errors.replace(/\|/g, '\\|')} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = process.env ?? {};
  const domains = args.domain.length ? args.domain : splitList(env.npm_config_domain).length ? splitList(env.npm_config_domain) : [DEFAULT_DOMAIN];
  const pathName = args.path ?? env.npm_config_path ?? DEFAULT_PATH;
  const lang = args.lang ?? env.npm_config_lang ?? DEFAULT_LANG;
  const requests = integerArg({ ...args, requests: args.requests ?? env.npm_config_requests }, 'requests', DEFAULT_REQUESTS);
  const concurrency = integerArg(
    { ...args, concurrency: args.concurrency ?? env.npm_config_concurrency },
    'concurrency',
    DEFAULT_CONCURRENCY,
  );
  const timeoutMs = integerArg(
    { ...args, 'timeout-ms': args['timeout-ms'] ?? env.npm_config_timeout_ms },
    'timeout-ms',
    DEFAULT_TIMEOUT_MS,
    1000,
  );
  const cacheMode = cacheModeArg(args['cache-mode'] ?? env.npm_config_cache_mode ?? DEFAULT_CACHE_MODE);
  const targetNames = targetNamesArg(args.target ?? env.npm_config_target ?? 'all');
  const customBaseUrl = normalizeBaseUrl(args['custom-base-url'] ?? env.ZOOLANDING_RUNTIME_BASE_URL ?? env.npm_config_custom_base_url ?? DEFAULT_CUSTOM_BASE_URL);
  const rawBaseUrl = normalizeBaseUrl(args['raw-base-url'] ?? env.ZOOLANDING_RUNTIME_RAW_BASE_URL ?? env.npm_config_raw_base_url ?? DEFAULT_RAW_BASE_URL);

  const targets = [];
  for (const target of [
    { name: 'custom-domain', baseUrl: customBaseUrl },
    { name: 'raw-api-gateway', baseUrl: rawBaseUrl },
  ].filter(target => targetNames.includes(target.name))) {
    targets.push(await probeTarget({
      ...target,
      domains,
      pathName,
      lang,
      requests,
      concurrency,
      timeoutMs,
      cacheMode,
    }));
  }

  const report = {
    generatedAtCentral: centralTimestamp(),
    requests,
    concurrency,
    timeoutMs,
    cacheMode,
    targetNames,
    domains,
    path: pathName,
    lang,
    targets,
  };

  const format = String(args.format ?? env.npm_config_format ?? 'json').toLowerCase();
  const rendered = format === 'markdown' ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`;

  const outputPath = args.output ?? env.npm_config_output;
  if (outputPath) {
    await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await writeFile(path.resolve(outputPath), rendered, 'utf8');
  }

  process.stdout.write(rendered);
  process.exitCode = targets.some(target => target.summary.failure > 0) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  buildRuntimeUrl,
  centralTimestamp,
  fetchProbe,
  formatErrorSummary,
  parseArgs,
  renderMarkdown,
  summarizeSamples,
  targetNamesArg,
};
