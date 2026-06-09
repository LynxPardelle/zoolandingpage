import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_DRAFTS_ROOT = path.resolve('drafts');
const DEFAULT_AUTHORING_ENDPOINT = 'https://api.zoolandingpage.com.mx/config-authoring';
const DEFAULT_STAGE = 'published';
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_TIME_ZONE = 'America/Mexico_City';
const LOCAL_DRAFT_CONTEXT_FOLDERS = new Set(['ai_notes', 'findings', 'errors-reports']);
const DEFAULT_AUTHORING_ENDPOINT_FALLBACKS = new Map([
  [
    'https://api.zoolandingpage.com.mx/config-authoring',
    'https://2dvjmiwjod.execute-api.us-east-1.amazonaws.com/Prod/config-authoring',
  ],
]);

function parseArgs(rawArgs) {
  const parsed = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';

    if (key === 'domain') {
      parsed.domain = [...(parsed.domain ?? []), ...value.split(',').map(part => part.trim()).filter(Boolean)];
      continue;
    }

    parsed[key] = value;
  }

  return parsed;
}

function getIntegerArg(args, key, fallback) {
  const rawValue = Number.parseInt(String(args[key] ?? fallback), 10);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : fallback;
}

function normalizeEndpoint(endpoint) {
  return String(endpoint ?? '')
    .trim()
    .replace(/\/+$/, '');
}

function resolveFallbackEndpoint(endpoint, explicitFallbackEndpoint) {
  const explicit = normalizeEndpoint(explicitFallbackEndpoint);
  if (explicit) {
    return explicit;
  }

  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const override = normalizeEndpoint(
    process.env.ZOOLANDING_CONFIG_AUTHORING_RAW_ENDPOINT ?? process.env.CONFIG_AUTHORING_RAW_ENDPOINT
  );

  if (override && DEFAULT_AUTHORING_ENDPOINT_FALLBACKS.has(normalizedEndpoint)) {
    return override;
  }

  return DEFAULT_AUTHORING_ENDPOINT_FALLBACKS.get(normalizedEndpoint) ?? '';
}

function normalizeStage(stage) {
  const normalized = String(stage ?? DEFAULT_STAGE)
    .trim()
    .toLowerCase();

  if (!['draft', 'published'].includes(normalized)) {
    throw new Error(`Invalid stage '${stage}'. Expected 'draft' or 'published'.`);
  }

  return normalized;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatErrorSummary(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const summary = [error.message];
  const cause = error.cause;

  if ('statusCode' in error && Number.isFinite(error.statusCode)) {
    summary.push(`status ${error.statusCode}`);
  }

  if (cause && typeof cause === 'object') {
    if ('code' in cause && typeof cause.code === 'string') {
      summary.push(cause.code);
    }
    if ('message' in cause && typeof cause.message === 'string' && cause.message !== error.message) {
      summary.push(cause.message);
    }
  }

  return summary.filter(Boolean).join(' | ');
}

function isRetryableAuthoringError(error) {
  if (error instanceof Error && 'statusCode' in error) {
    const statusCode = Number(error.statusCode);
    if ([408, 425, 429, 500, 502, 503, 504].includes(statusCode)) {
      return true;
    }
  }

  const details = formatErrorSummary(error).toLowerCase();
  return [
    'fetch failed',
    'econnreset',
    'socket hang up',
    'timeout',
    'timed out',
    'abort',
    'eai_again',
    'enotfound',
    'econnrefused',
    'tls',
  ].some(token => details.includes(token));
}

function isMissingRemotePackageError(error) {
  if (error instanceof Error && 'statusCode' in error && Number(error.statusCode) === 404) {
    return true;
  }

  const details = formatErrorSummary(error).toLowerCase();
  return ['not found', 'not exist', 'missing site', 'unknown domain', 'no published'].some(token =>
    details.includes(token)
  );
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  return `{${keys
    .filter(key => value[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function normalizePackageFile(entry) {
  return {
    path: String(entry?.path ?? '').replace(/\\/g, '/'),
    kind: entry?.kind,
    pageId: entry?.pageId,
    lang: entry?.lang,
    content: entry?.content ?? null,
  };
}

function packageFileFingerprint(entry) {
  return sha256(normalizePackageFile(entry));
}

function indexPackageFiles(draftPackage) {
  const indexed = new Map();

  for (const rawEntry of draftPackage?.files ?? []) {
    const entry = normalizePackageFile(rawEntry);
    if (!entry.path) {
      throw new Error('Package contains a file entry without path.');
    }
    if (indexed.has(entry.path)) {
      throw new Error(`Package contains duplicate file path '${entry.path}'.`);
    }
    indexed.set(entry.path, {
      ...entry,
      fingerprint: packageFileFingerprint(entry),
    });
  }

  return indexed;
}

function extractVersionId(remotePackage) {
  return (
    remotePackage?.versionId ??
    remotePackage?.publishedVersionId ??
    remotePackage?.draftVersionId ??
    remotePackage?.metadata?.versionId ??
    remotePackage?.site?.versionId ??
    null
  );
}

function fileSetHash(indexedFiles) {
  return sha256(
    [...indexedFiles.values()]
      .map(file => ({ path: file.path, fingerprint: file.fingerprint }))
      .sort((left, right) => left.path.localeCompare(right.path))
  );
}

async function walkJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (LOCAL_DRAFT_CONTEXT_FOLDERS.has(entry.name)) {
        continue;
      }
      files.push(...(await walkJsonFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function inferKind(domain, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === `${domain}/site-config.json`) return 'site-config';
  if (normalized === `${domain}/components.json`) return 'shared-components';
  if (normalized === `${domain}/variables.json`) return 'shared-variables';
  if (normalized === `${domain}/angora-combos.json`) return 'shared-angora-combos';
  if (normalized.startsWith(`${domain}/i18n/`) && normalized.endsWith('.json')) return 'shared-i18n';
  if (normalized.endsWith('/page-config.json')) return 'page-config';
  if (normalized.endsWith('/components.json')) return 'page-components';
  if (normalized.endsWith('/variables.json')) return 'variables';
  if (normalized.endsWith('/angora-combos.json')) return 'angora-combos';
  if (normalized.includes('/i18n/') && normalized.endsWith('.json')) return 'i18n';
  return 'page-components';
}

function inferPageId(domain, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts[0] !== domain) return undefined;
  if (parts.length >= 3 && parts[1] !== 'i18n') return parts[1];
  return undefined;
}

function inferLang(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized.includes('/i18n/')) return undefined;
  const fileName = normalized.split('/').at(-1) ?? '';
  return fileName.endsWith('.json') ? fileName.slice(0, -5) : undefined;
}

export async function buildLocalDraftPackage({ domain, draftsRoot = DEFAULT_DRAFTS_ROOT, stage = 'draft' }) {
  const domainRoot = path.resolve(draftsRoot, domain);
  if (!existsSync(domainRoot)) {
    throw new Error(`Draft folder not found: ${domainRoot}`);
  }

  const files = await walkJsonFiles(domainRoot);
  const packageFiles = [];

  for (const filePath of files) {
    const relativePath = path.relative(draftsRoot, filePath).replace(/\\/g, '/');
    packageFiles.push({
      path: relativePath,
      kind: inferKind(domain, relativePath),
      pageId: inferPageId(domain, relativePath),
      lang: inferLang(relativePath),
      content: await readJson(filePath),
    });
  }

  return {
    version: 1,
    domain,
    stage,
    files: packageFiles,
  };
}

export function compareDraftPackages({ domain, localPackage, remotePackage }) {
  const localFiles = indexPackageFiles(localPackage);
  const remoteFiles = indexPackageFiles(remotePackage);
  const changed = [];
  const localOnly = [];
  const remoteOnly = [];
  let matched = 0;

  for (const [filePath, localFile] of localFiles.entries()) {
    const remoteFile = remoteFiles.get(filePath);
    if (!remoteFile) {
      localOnly.push(filePath);
      continue;
    }
    if (remoteFile.fingerprint !== localFile.fingerprint) {
      changed.push(filePath);
      continue;
    }
    matched += 1;
  }

  for (const filePath of remoteFiles.keys()) {
    if (!localFiles.has(filePath)) {
      remoteOnly.push(filePath);
    }
  }

  const sortPaths = values => values.sort((left, right) => left.localeCompare(right));
  const remoteMissing = !remotePackage || !Array.isArray(remotePackage.files);
  const needsUpload = remoteMissing || changed.length > 0 || localOnly.length > 0 || remoteOnly.length > 0;

  return {
    domain,
    status: remoteMissing ? 'not-uploaded' : needsUpload ? 'needs-upload' : 'uploaded',
    localHash: fileSetHash(localFiles),
    remoteHash: remoteMissing ? null : fileSetHash(remoteFiles),
    remoteStage: remotePackage?.stage ?? remotePackage?.sourceStage ?? null,
    remoteVersionId: extractVersionId(remotePackage),
    summary: {
      totalLocalFiles: localFiles.size,
      totalRemoteFiles: remoteFiles.size,
      matchedFiles: matched,
      changedFiles: changed.length,
      localOnlyFiles: localOnly.length,
      remoteOnlyFiles: remoteOnly.length,
    },
    files: {
      changed: sortPaths(changed),
      localOnly: sortPaths(localOnly),
      remoteOnly: sortPaths(remoteOnly),
    },
  };
}

export async function findLocalDraftDomains(draftsRoot = DEFAULT_DRAFTS_ROOT) {
  const entries = await readdir(draftsRoot, { withFileTypes: true });
  const domains = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) {
      continue;
    }
    const siteConfigPath = path.join(draftsRoot, entry.name, 'site-config.json');
    if (existsSync(siteConfigPath)) {
      domains.push(entry.name);
    }
  }

  return domains.sort((left, right) => left.localeCompare(right));
}

async function requestAuthoringEndpoint(endpoint, body, requestTimeoutMs) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  const rawText = await response.text();
  const parsed = rawText ? JSON.parse(rawText) : {};
  const normalized =
    parsed && typeof parsed === 'object' && 'statusCode' in parsed && 'body' in parsed
      ? { ...parsed, body: typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed.body }
      : { statusCode: response.status, body: parsed };

  if (normalized.statusCode >= 400) {
    const message = normalized.body?.error || `Request failed with status ${normalized.statusCode}`;
    const error = new Error(message);
    error.statusCode = normalized.statusCode;
    throw error;
  }

  return normalized.body;
}

async function fetchRemotePackage({
  endpoint,
  fallbackEndpoint,
  domain,
  stage,
  requestTimeoutMs,
  retryAttempts,
  retryDelayMs,
}) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedFallbackEndpoint = resolveFallbackEndpoint(normalizedEndpoint, fallbackEndpoint);
  const candidateEndpoints = [normalizedEndpoint];

  if (normalizedFallbackEndpoint && normalizedFallbackEndpoint !== normalizedEndpoint) {
    candidateEndpoints.push(normalizedFallbackEndpoint);
  }

  let primaryError = null;

  for (const [index, currentEndpoint] of candidateEndpoints.entries()) {
    const attemptsForEndpoint = index === 0 && candidateEndpoints.length > 1 ? 1 : Math.max(1, retryAttempts);

    for (let attempt = 1; attempt <= attemptsForEndpoint; attempt += 1) {
      try {
        return await requestAuthoringEndpoint(
          currentEndpoint,
          { action: 'getSite', domain, stage },
          requestTimeoutMs
        );
      } catch (error) {
        const retryableError = isRetryableAuthoringError(error);
        const canRetrySameEndpoint = retryableError && attempt < attemptsForEndpoint;
        const shouldRetryWithFallback = index === 0 && candidateEndpoints.length > 1 && retryableError;

        if (canRetrySameEndpoint) {
          process.stderr.write(
            `[getSite domain=${domain} stage=${stage}] Authoring endpoint failed (${formatErrorSummary(
              error
            )}). Retrying attempt ${attempt + 1}/${attemptsForEndpoint} in ${retryDelayMs}ms.\n`
          );
          await wait(retryDelayMs);
          continue;
        }

        if (shouldRetryWithFallback) {
          primaryError = error;
          process.stderr.write(
            `[getSite domain=${domain} stage=${stage}] Primary authoring endpoint failed (${formatErrorSummary(
              error
            )}). Retrying through fallback endpoint.\n`
          );
          break;
        }

        if (index > 0 && primaryError) {
          throw new Error(
            `[getSite domain=${domain} stage=${stage}] Primary authoring endpoint failed (${formatErrorSummary(
              primaryError
            )}); fallback endpoint failed (${formatErrorSummary(error)})`
          );
        }

        throw error;
      }
    }
  }

  throw primaryError ?? new Error('Authoring request failed.');
}

function formatCentralTimestamp(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
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
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} CT (${get(
    'timeZoneName'
  )})`;
}

export async function buildUploadStatusReport({
  domains,
  draftsRoot = DEFAULT_DRAFTS_ROOT,
  endpoint = DEFAULT_AUTHORING_ENDPOINT,
  fallbackEndpoint,
  stage = DEFAULT_STAGE,
  remotePackage,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  retryAttempts = DEFAULT_RETRY_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  timeZone = DEFAULT_TIME_ZONE,
}) {
  const normalizedStage = normalizeStage(stage);
  const resolvedDomains = domains?.length ? domains : await findLocalDraftDomains(draftsRoot);
  const results = [];

  if (remotePackage && resolvedDomains.length !== 1) {
    throw new Error('--remote-package can only be used with one --domain value.');
  }

  for (const domain of resolvedDomains) {
    const localPackage = await buildLocalDraftPackage({ domain, draftsRoot, stage: 'draft' });
    let currentRemotePackage = remotePackage;

    if (!currentRemotePackage) {
      try {
        currentRemotePackage = await fetchRemotePackage({
          endpoint,
          fallbackEndpoint,
          domain,
          stage: normalizedStage,
          requestTimeoutMs,
          retryAttempts,
          retryDelayMs,
        });
      } catch (error) {
        if (!isMissingRemotePackageError(error)) {
          throw error;
        }
        currentRemotePackage = null;
      }
    }

    results.push(compareDraftPackages({ domain, localPackage, remotePackage: currentRemotePackage }));
  }

  const summary = {
    totalDomains: results.length,
    uploaded: results.filter(result => result.status === 'uploaded').length,
    needsUpload: results.filter(result => result.status === 'needs-upload').length,
    notUploaded: results.filter(result => result.status === 'not-uploaded').length,
  };

  return {
    generatedAtCentral: formatCentralTimestamp(new Date(), timeZone),
    source: 'config-authoring getSite',
    stage: normalizedStage,
    summary,
    results,
  };
}

function renderTextReport(report, { includeFileDetails = false } = {}) {
  const lines = [
    `Draft upload status (${report.stage}) - ${report.generatedAtCentral}`,
    `Summary: ${report.summary.uploaded} uploaded, ${report.summary.needsUpload} need upload, ${report.summary.notUploaded} not uploaded, ${report.summary.totalDomains} total`,
    '',
  ];

  for (const result of report.results) {
    const details = [
      `${result.domain}: ${result.status}`,
      `local=${result.localHash.slice(0, 12)}`,
      `remote=${result.remoteHash ? result.remoteHash.slice(0, 12) : 'none'}`,
      `version=${result.remoteVersionId ?? 'unknown'}`,
      `changed=${result.summary.changedFiles}`,
      `localOnly=${result.summary.localOnlyFiles}`,
      `remoteOnly=${result.summary.remoteOnlyFiles}`,
    ];
    lines.push(`- ${details.join(' | ')}`);

    if (includeFileDetails && result.status !== 'uploaded') {
      for (const [label, paths] of Object.entries(result.files)) {
        if (paths.length === 0) continue;
        lines.push(`  ${label}:`);
        for (const filePath of paths) {
          lines.push(`    - ${filePath}`);
        }
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node tools/draft-upload-status.mjs [--all=true | --domain=example.com[,other.com]] [options]',
      '',
      'Checks whether local draft JSON packages match the uploaded S3-backed authoring state.',
      '',
      'Options:',
      `  --endpoint=${DEFAULT_AUTHORING_ENDPOINT}`,
      '  --fallback-endpoint=https://...',
      '  --stage=published|draft',
      '  --drafts-root=drafts',
      '  --remote-package=package.json   Offline comparison for one --domain',
      '  --format=text|json',
      '  --include-file-details=true',
      '  --fail-on-pending=true',
      '  --output=reports/draft-upload-status.json',
      '  --request-timeout-ms=20000',
      '  --retry-attempts=2',
      '  --retry-delay-ms=250',
    ].join('\n') + '\n'
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    printHelp();
    return;
  }

  const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
  const domains = args.all === 'true' ? await findLocalDraftDomains(draftsRoot) : args.domain ?? [];

  if (domains.length === 0) {
    throw new Error('Provide --domain=example.com or --all=true.');
  }

  const remotePackage = args['remote-package'] ? await readJson(path.resolve(args['remote-package'])) : null;
  const report = await buildUploadStatusReport({
    domains,
    draftsRoot,
    endpoint: args.endpoint ?? DEFAULT_AUTHORING_ENDPOINT,
    fallbackEndpoint: args['fallback-endpoint'],
    stage: args.stage ?? DEFAULT_STAGE,
    remotePackage,
    requestTimeoutMs: getIntegerArg(args, 'request-timeout-ms', DEFAULT_REQUEST_TIMEOUT_MS),
    retryAttempts: getIntegerArg(args, 'retry-attempts', DEFAULT_RETRY_ATTEMPTS),
    retryDelayMs: getIntegerArg(args, 'retry-delay-ms', DEFAULT_RETRY_DELAY_MS),
  });

  if (args.output) {
    await writeJson(path.resolve(args.output), report);
  }

  const format = String(args.format ?? 'text').toLowerCase();
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (format === 'text') {
    process.stdout.write(renderTextReport(report, { includeFileDetails: args['include-file-details'] === 'true' }));
  } else {
    throw new Error(`Invalid --format='${format}'. Expected 'text' or 'json'.`);
  }

  if (args['fail-on-pending'] === 'true' && report.summary.uploaded !== report.summary.totalDomains) {
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
