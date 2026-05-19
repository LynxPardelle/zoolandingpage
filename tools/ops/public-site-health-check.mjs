#!/usr/bin/env node

import dns from 'node:dns/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_HOSTS = [
  'test.zoolandingpage.com.mx',
  'zoolandingpage.com.mx',
  'erosbarajas.zoolandingpage.com.mx',
  'alecfest-voliii.zoolandingpage.com.mx',
  'pamelabetancourt.zoolandingpage.com.mx',
];

const DEFAULT_RUNTIME_BASE = 'https://api.zoolandingpage.com.mx';
const DEFAULT_RUNTIME_FALLBACK_BASE = 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

function parseArgs(argv) {
  const env = process.env ?? {};
  const envHosts = env.ZOOLANDING_HEALTH_HOSTS ?? env.npm_config_hosts ?? '';

  const args = {
    hosts: envHosts ? splitHosts(envHosts) : DEFAULT_HOSTS,
    timeoutMs: Number(env.ZOOLANDING_HEALTH_TIMEOUT_MS ?? env.npm_config_timeout_ms ?? 20000),
    runtimeBaseUrl: env.ZOOLANDING_RUNTIME_BASE_URL ?? env.npm_config_runtime_base_url ?? DEFAULT_RUNTIME_BASE,
    runtimeFallbackUrl:
      env.ZOOLANDING_RUNTIME_FALLBACK_URL ??
      env.npm_config_runtime_fallback_url ??
      DEFAULT_RUNTIME_FALLBACK_BASE,
    skipHealth: truthy(env.ZOOLANDING_SKIP_HEALTH ?? env.npm_config_skip_health),
    failOnAaaa: truthy(env.ZOOLANDING_FAIL_ON_AAAA ?? env.npm_config_fail_on_aaaa),
    retryAttempts: Number(env.ZOOLANDING_HEALTH_RETRY_ATTEMPTS ?? env.npm_config_retry_attempts ?? 8),
    retryDelayMs: Number(env.ZOOLANDING_HEALTH_RETRY_DELAY_MS ?? env.npm_config_retry_delay_ms ?? 500),
    expectedIpv4: env.ZOOLANDING_EXPECTED_IPV4 ?? env.npm_config_expected_ipv4 ?? '',
    output: env.ZOOLANDING_HEALTH_OUTPUT ?? env.npm_config_output ?? '',
    markdown: truthy(env.ZOOLANDING_HEALTH_MARKDOWN ?? env.npm_config_markdown),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg.startsWith('--hosts=')) {
      args.hosts = splitHosts(arg.slice('--hosts='.length));
      continue;
    }

    if (arg === '--hosts' && next) {
      args.hosts = splitHosts(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--timeout-ms=')) {
      args.timeoutMs = Number(arg.slice('--timeout-ms='.length));
      continue;
    }

    if (arg === '--timeout-ms' && next) {
      args.timeoutMs = Number(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--runtime-base-url=')) {
      args.runtimeBaseUrl = arg.slice('--runtime-base-url='.length).replace(/\/$/, '');
      continue;
    }

    if (arg === '--runtime-base-url' && next) {
      args.runtimeBaseUrl = next.replace(/\/$/, '');
      index += 1;
      continue;
    }

    if (arg.startsWith('--runtime-fallback-url=')) {
      args.runtimeFallbackUrl = arg.slice('--runtime-fallback-url='.length).replace(/\/$/, '');
      continue;
    }

    if (arg === '--runtime-fallback-url' && next) {
      args.runtimeFallbackUrl = next.replace(/\/$/, '');
      index += 1;
      continue;
    }

    if (arg.startsWith('--expected-ipv4=')) {
      args.expectedIpv4 = arg.slice('--expected-ipv4='.length).trim();
      continue;
    }

    if (arg === '--expected-ipv4' && next) {
      args.expectedIpv4 = next.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--retry-attempts=')) {
      args.retryAttempts = Number(arg.slice('--retry-attempts='.length));
      continue;
    }

    if (arg === '--retry-attempts' && next) {
      args.retryAttempts = Number(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--retry-delay-ms=')) {
      args.retryDelayMs = Number(arg.slice('--retry-delay-ms='.length));
      continue;
    }

    if (arg === '--retry-delay-ms' && next) {
      args.retryDelayMs = Number(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      args.output = arg.slice('--output='.length);
      continue;
    }

    if (arg === '--output' && next) {
      args.output = next;
      index += 1;
      continue;
    }

    if (arg === '--skip-health') {
      args.skipHealth = true;
      continue;
    }

    if (arg === '--fail-on-aaaa') {
      args.failOnAaaa = true;
      continue;
    }

    if (arg === '--markdown') {
      args.markdown = true;
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1000) {
    throw new Error('--timeout-ms must be a number greater than or equal to 1000');
  }

  if (args.hosts.length === 0) {
    throw new Error('--hosts must include at least one hostname');
  }

  if (!Number.isInteger(args.retryAttempts) || args.retryAttempts < 1) {
    throw new Error('--retry-attempts must be an integer greater than or equal to 1');
  }

  if (!Number.isFinite(args.retryDelayMs) || args.retryDelayMs < 0) {
    throw new Error('--retry-delay-ms must be a number greater than or equal to 0');
  }

  args.runtimeBaseUrl = args.runtimeBaseUrl.replace(/\/$/, '');
  args.runtimeFallbackUrl = args.runtimeFallbackUrl.replace(/\/$/, '');

  return args;
}

function splitHosts(value) {
  return value.split(/[,\s]+/).map((host) => host.trim()).filter(Boolean);
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').toLowerCase());
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: 'no-store',
      redirect: 'manual',
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readText(response) {
  try {
    return await response.text();
  } catch (error) {
    return `<<failed to read response body: ${error.message}>>`;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchTextWithRetries(url, options, fetchOptions = {}) {
  const failures = [];

  for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options.timeoutMs, fetchOptions);
      const body = await readText(response);

      if (!isRetryableStatus(response.status) || attempt === options.retryAttempts) {
        return { response, body, attempts: attempt, failures };
      }

      failures.push(`attempt ${attempt}: HTTP ${response.status}`);
    } catch (error) {
      if (attempt === options.retryAttempts) {
        error.attempts = attempt;
        error.failures = failures;
        throw error;
      }

      failures.push(`attempt ${attempt}: ${error.message}`);
    }

    if (options.retryDelayMs > 0) {
      await sleep(options.retryDelayMs * attempt);
    }
  }

  throw new Error(`Unable to fetch ${url}`);
}

async function checkDns(host, options) {
  const check = {
    name: `dns:${host}`,
    host,
    category: 'dns',
    ok: true,
    details: {},
  };

  try {
    const lookup = await dns.lookup(host, { all: true, verbatim: true });
    check.details.ipv4 = lookup.filter((entry) => entry.family === 4).map((entry) => entry.address);
    check.details.ipv6 = lookup.filter((entry) => entry.family === 6).map((entry) => entry.address);

    if (options.expectedIpv4 && !check.details.ipv4.includes(options.expectedIpv4)) {
      check.ok = false;
      check.details.expectedIpv4 = options.expectedIpv4;
      check.details.reason = 'expected IPv4 is not present in DNS answers';
    }

    if (options.failOnAaaa && check.details.ipv6.length > 0) {
      check.ok = false;
      check.details.reason = 'AAAA records are present while --fail-on-aaaa is enabled';
    }

    if (!options.expectedIpv4 && check.details.ipv4.length === 0) {
      check.ok = false;
      check.details.reason = 'no IPv4 DNS answer returned';
    }
  } catch (error) {
    check.ok = false;
    check.details.reason = error.message;
  }

  return check;
}

async function checkPage(host, options) {
  const url = `https://${host}/`;
  const check = {
    name: `page:${host}`,
    host,
    category: 'page',
    ok: false,
    details: { url },
  };

  try {
    const { response, body, attempts, failures } = await fetchTextWithRetries(url, options);
    const title = body.match(/<title>(.*?)<\/title>/is)?.[1]?.trim() ?? '';
    const hasMain = /<main[\s>]/i.test(body);

    check.details.attempts = attempts;
    if (failures.length > 0) {
      check.details.transientFailures = failures.join(' | ');
    }
    check.details.status = response.status;
    check.details.title = title;
    check.details.hasMain = hasMain;
    check.details.bytes = body.length;

    check.ok = response.status >= 200 && response.status < 300 && title.length > 0 && hasMain;

    if (!check.ok) {
      check.details.reason = 'page did not return 2xx with title and main landmark';
    }
  } catch (error) {
    check.details.attempts = error.attempts ?? options.retryAttempts;
    if (Array.isArray(error.failures) && error.failures.length > 0) {
      check.details.transientFailures = error.failures.join(' | ');
    }
    check.details.reason = error.message;
  }

  return check;
}

async function checkHealth(host, options) {
  const url = `https://${host}/health`;
  const check = {
    name: `health:${host}`,
    host,
    category: 'health',
    ok: false,
    details: { url },
  };

  try {
    const { response, body: rawBody, attempts, failures } = await fetchTextWithRetries(url, options);
    const body = rawBody.trim();

    check.details.attempts = attempts;
    if (failures.length > 0) {
      check.details.transientFailures = failures.join(' | ');
    }
    check.details.status = response.status;
    check.details.body = body.slice(0, 120);
    check.ok = response.status === 200 && body === 'ok';

    if (!check.ok) {
      check.details.reason = 'health endpoint must return HTTP 200 and body "ok"';
    }
  } catch (error) {
    check.details.attempts = error.attempts ?? options.retryAttempts;
    if (Array.isArray(error.failures) && error.failures.length > 0) {
      check.details.transientFailures = error.failures.join(' | ');
    }
    check.details.reason = error.message;
  }

  return check;
}

async function checkRuntimeBundle(host, options) {
  const url = new URL(`${options.runtimeBaseUrl}/runtime-bundle`);
  url.searchParams.set('domain', host);
  url.searchParams.set('path', '/');
  url.searchParams.set('lang', 'es');

  const check = {
    name: `runtime:${host}`,
    host,
    category: 'runtime',
    ok: false,
    details: { url: url.toString() },
  };

  const fallbackUrl = options.runtimeFallbackUrl
    ? new URL(`${options.runtimeFallbackUrl}/runtime-bundle`)
    : null;

  if (fallbackUrl) {
    fallbackUrl.search = url.search;
  }

  try {
    let response;
    let body;
    let source = 'primary';

    try {
      const primary = await fetchTextWithRetries(url, options);
      response = primary.response;
      body = primary.body;
      check.details.attempts = primary.attempts;
      if (primary.failures.length > 0) {
        check.details.transientFailures = primary.failures.join(' | ');
      }
    } catch (error) {
      if (!fallbackUrl) {
        throw error;
      }

      check.details.primaryReason = error.message;
      check.details.primaryAttempts = error.attempts ?? options.retryAttempts;
      if (Array.isArray(error.failures) && error.failures.length > 0) {
        check.details.primaryTransientFailures = error.failures.join(' | ');
      }
      const fallback = await fetchTextWithRetries(fallbackUrl, options);
      response = fallback.response;
      body = fallback.body;
      check.details.attempts = fallback.attempts;
      if (fallback.failures.length > 0) {
        check.details.transientFailures = fallback.failures.join(' | ');
      }
      source = 'fallback';
    }

    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      payload = null;
    }

    check.details.status = response.status;
    check.details.source = source;
    check.details.fallbackUrl = source === 'fallback' ? fallbackUrl?.toString() : null;
    check.details.ok = payload?.ok ?? null;
    check.details.domain = payload?.domain ?? null;
    check.details.resolvedAlias = payload?.metadata?.resolvedAlias ?? null;
    check.details.versionId = payload?.versionId ?? null;

    check.ok = response.status === 200 && payload?.ok === true;

    if (!check.ok) {
      check.details.reason = 'runtime-bundle did not return HTTP 200 with ok=true';
      check.details.bodyPrefix = body.slice(0, 200);
    }
  } catch (error) {
    check.details.attempts = error.attempts ?? options.retryAttempts;
    if (Array.isArray(error.failures) && error.failures.length > 0) {
      check.details.transientFailures = error.failures.join(' | ');
    }
    check.details.reason = error.message;
  }

  return check;
}

function centralTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '');
}

function toMarkdown(result) {
  const lines = [
    '# Public Site Health Check',
    '',
    `Date: ${result.generatedAtCentral} Central Time`,
    `Status: ${result.ok ? 'PASS' : 'FAIL'}`,
    '',
    '| Check | Result | Details |',
    '|---|---:|---|',
  ];

  for (const check of result.checks) {
    const detail = Object.entries(check.details)
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
      .join('; ');
    lines.push(`| ${check.name} | ${check.ok ? 'PASS' : 'FAIL'} | ${detail.replace(/\|/g, '\\|')} |`);
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total checks: ${result.checks.length}`);
  lines.push(`- Failed checks: ${result.failed.length}`);
  lines.push(`- Hosts: ${result.hosts.join(', ')}`);

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = [];

  for (const host of options.hosts) {
    checks.push(await checkDns(host, options));
    checks.push(await checkPage(host, options));

    if (!options.skipHealth) {
      checks.push(await checkHealth(host, options));
    }

    checks.push(await checkRuntimeBundle(host, options));
  }

  const result = {
    ok: checks.every((check) => check.ok),
    generatedAtCentral: centralTimestamp(),
    hosts: options.hosts,
    checks,
    failed: checks.filter((check) => !check.ok),
  };

  const rendered = options.markdown ? toMarkdown(result) : `${JSON.stringify(result, null, 2)}\n`;

  if (options.output) {
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, rendered, 'utf8');
  }

  process.stdout.write(rendered);
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
