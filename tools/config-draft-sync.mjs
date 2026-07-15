import { existsSync, lstatSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertValidRuntimeDataSourceConditionReferences } from './runtime-data-source-condition-guard.mjs';
import { inferServerDescriptorKind, isLocalOnlyDraftDirectoryName } from './lib/server-descriptor-kinds.mjs';

const DEFAULT_DRAFTS_ROOT = path.resolve('drafts');
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const MAX_HOSTNAME_LENGTH = 253;
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const WINDOWS_INVALID_PATH_CHARACTER_PATTERN = /[<>:"|?*]/;
const WINDOWS_RESERVED_PATH_BASENAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])$/i;
const UNSAFE_UNICODE_PATH_CHARACTER_PATTERN = /[\p{Cc}\p{Cf}]/u;
const LOCAL_DRAFT_CONTEXT_FOLDERS = new Set(['ai_notes', 'findings', 'errors-reports']);
const LOCAL_DRAFT_CONTEXT_FILES = new Set(['draft-repo.config.json']);
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
    const value = valueParts.length > 0 ? valueParts.join('=') : 'true';
    parsed[key] = key === 'domain' ? value : value.trim();
  }

  return parsed;
}

function getRequiredArg(args, key) {
  const value = String(args[key] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function getRequiredDomainArg(args) {
  const value = args.domain;
  if (typeof value !== 'string' || !value) {
    throw new Error('Missing required argument --domain');
  }
  return assertSafeDraftDomain(value);
}

function getIntegerArg(args, key, fallback) {
  const rawValue = Number.parseInt(String(args[key] ?? fallback), 10);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : fallback;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeStage(stage) {
  const normalized = String(stage ?? 'draft')
    .trim()
    .toLowerCase();
  if (!['draft', 'published'].includes(normalized)) {
    throw new Error(`Invalid stage '${stage}'. Expected 'draft' or 'published'.`);
  }
  return normalized;
}

function normalizeEndpoint(endpoint) {
  return String(endpoint ?? '')
    .trim()
    .replace(/\/+$/, '');
}

function normalizeEnvironment(environment) {
  const normalized = String(environment ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return undefined;
  if (['production', 'test', 'dev'].includes(normalized)) return normalized;
  throw new Error(`Invalid environment '${environment}'. Expected 'production', 'test', or 'dev'.`);
}

function normalizeRemoteEnvironment(environment, { allowDevRead = false } = {}) {
  const normalized = normalizeEnvironment(environment);
  if (normalized !== 'dev') return normalized;
  if (allowDevRead) return 'test';
  throw new Error('dev environment is local-only; use test for remote mutations.');
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

function describeRequestContext(body) {
  const action = String(body?.action ?? 'unknown').trim() || 'unknown';
  const domain = String(body?.domain ?? 'unknown').trim() || 'unknown';
  return `action=${action} domain=${domain}`;
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

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function walkJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (LOCAL_DRAFT_CONTEXT_FOLDERS.has(entry.name.toLowerCase()) || isLocalOnlyDraftDirectoryName(entry.name)) {
        continue;
      }
      files.push(...(await walkJsonFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      if (LOCAL_DRAFT_CONTEXT_FILES.has(entry.name.toLowerCase())) {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function cleanAuthoredDraftFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return;
  }

  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (LOCAL_DRAFT_CONTEXT_FOLDERS.has(entry.name.toLowerCase()) || isLocalOnlyDraftDirectoryName(entry.name)) {
        continue;
      }

      await cleanAuthoredDraftFiles(fullPath);

      const remainingEntries = await readdir(fullPath, { withFileTypes: true });
      if (remainingEntries.length === 0) {
        await rm(fullPath, { recursive: true, force: true });
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      if (LOCAL_DRAFT_CONTEXT_FILES.has(entry.name.toLowerCase())) {
        continue;
      }
      await rm(fullPath, { force: true });
    }
  }
}

function assertSafeDraftDomain(domain) {
  if (typeof domain !== 'string') {
    throw new Error('Refusing to use unsafe domain');
  }

  const labels = domain.split('.');
  if (
    !domain ||
    domain.length > MAX_HOSTNAME_LENGTH ||
    domain !== domain.trim() ||
    labels.some(label => !HOSTNAME_LABEL_PATTERN.test(label)) ||
    isWindowsReservedPathSegment(domain)
  ) {
    throw new Error('Refusing to use unsafe domain');
  }
  return domain;
}

function isWindowsReservedPathSegment(segment) {
  const baseName = segment.split('.')[0].replace(/[ .]+$/g, '');
  return WINDOWS_RESERVED_PATH_BASENAME_PATTERN.test(baseName);
}

function assertSafeExistingPathComponents(domainRoot, targetPath, targetKind) {
  const relativeToDomain = path.relative(domainRoot, targetPath);
  const components = relativeToDomain ? relativeToDomain.split(path.sep) : [];
  let currentPath = domainRoot;

  for (const [index, component] of ['', ...components].entries()) {
    if (component) {
      currentPath = path.join(currentPath, component);
    }

    try {
      const stats = lstatSync(currentPath);
      const isTarget = index === components.length;
      if (
        stats.isSymbolicLink() ||
        (!isTarget && !stats.isDirectory()) ||
        (isTarget && targetKind === 'directory' && !stats.isDirectory()) ||
        (isTarget && targetKind === 'file' && (!stats.isFile() || stats.nlink > 1))
      ) {
        throw new Error('Refusing to use unsafe path');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }
}

function resolveContainedDraftFile(draftsRoot, domainRoot, domain, relativePath) {
  if (typeof relativePath !== 'string') {
    throw new Error('Refusing to write unsafe path');
  }
  const segments = relativePath.split('/');
  const isUnsafe =
    !relativePath ||
    relativePath !== relativePath.trim() ||
    relativePath !== relativePath.normalize('NFC') ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    WINDOWS_INVALID_PATH_CHARACTER_PATTERN.test(relativePath) ||
    UNSAFE_UNICODE_PATH_CHARACTER_PATTERN.test(relativePath) ||
    !relativePath.endsWith('.json') ||
    segments.length < 2 ||
    segments[0] !== domain ||
    segments
      .slice(1)
      .some(segment => {
        try {
          return isLocalOnlyDraftDirectoryName(segment)
            || LOCAL_DRAFT_CONTEXT_FILES.has(segment.toLowerCase());
        } catch {
          return true;
        }
      }) ||
    segments.some(
      segment =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        /[. ]$/.test(segment) ||
        isWindowsReservedPathSegment(segment)
    );

  if (isUnsafe) {
    throw new Error('Refusing to write unsafe path');
  }

  const resolved = path.resolve(draftsRoot, ...segments);
  const relativeToDomain = path.relative(domainRoot, resolved);
  if (
    !relativeToDomain ||
    relativeToDomain === '..' ||
    relativeToDomain.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToDomain)
  ) {
    throw new Error('Refusing to write unsafe path');
  }

  assertSafeExistingPathComponents(domainRoot, resolved, 'file');
  return resolved;
}

function inferKind(domain, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const serverKind = inferServerDescriptorKind(domain, normalized);
  if (serverKind) return serverKind;
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
  if (parts[1] === 'server') return undefined;
  if (parts.length >= 3 && parts[1] !== 'i18n') return parts[1];
  return undefined;
}

function inferLang(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized.includes('/i18n/')) return undefined;
  const fileName = normalized.split('/').at(-1) ?? '';
  return fileName.endsWith('.json') ? fileName.slice(0, -5) : undefined;
}

async function buildDraftPackage({ domain, draftsRoot, stage }) {
  const safeDomain = assertSafeDraftDomain(domain);
  const domainRoot = path.resolve(draftsRoot, safeDomain);
  assertSafeExistingPathComponents(domainRoot, domainRoot, 'directory');
  if (!existsSync(domainRoot)) {
    throw new Error(`Draft folder not found: ${domainRoot}`);
  }

  const files = await walkJsonFiles(domainRoot);
  const packageFiles = [];

  for (const filePath of files) {
    const relativePath = path.relative(draftsRoot, filePath).replace(/\\/g, '/');
    assertSafeExistingPathComponents(domainRoot, filePath, 'file');
    packageFiles.push({
      path: relativePath,
      kind: inferKind(safeDomain, relativePath),
      pageId: inferPageId(safeDomain, relativePath),
      lang: inferLang(relativePath),
      content: await readJson(filePath),
    });
  }

  const draftPackage = {
    version: 1,
    domain: safeDomain,
    stage,
    files: packageFiles,
  };

  assertValidRuntimeDataSourceConditionReferences(draftPackage);
  return draftPackage;
}

async function unpackDraftPackage(draftPackage, draftsRoot, { cleanDomain = false } = {}) {
  const rawDomain = draftPackage?.domain;
  if (rawDomain === undefined || rawDomain === null || rawDomain === '') {
    throw new Error('Draft package is missing domain');
  }
  if (!Array.isArray(draftPackage.files)) {
    throw new Error('Draft package is missing files');
  }

  const domain = assertSafeDraftDomain(rawDomain);
  const domainRoot = path.resolve(draftsRoot, domain);
  assertSafeExistingPathComponents(domainRoot, domainRoot, 'directory');
  const files = draftPackage.files.map(entry => {
    const relativePath = entry?.path;
    const filePath = resolveContainedDraftFile(draftsRoot, domainRoot, domain, relativePath);
    if (!entry?.content || typeof entry.content !== 'object' || Array.isArray(entry.content)) {
      throw new Error(`File '${relativePath}' does not contain a JSON object`);
    }
    return { content: entry.content, filePath };
  });

  if (cleanDomain && existsSync(domainRoot)) {
    await cleanAuthoredDraftFiles(domainRoot);
  }

  for (const file of files) {
    await writeJson(file.filePath, file.content);
  }
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

async function callAuthoringEndpoint(
  endpoint,
  body,
  {
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    fallbackEndpoint,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  } = {}
) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedFallbackEndpoint = resolveFallbackEndpoint(normalizedEndpoint, fallbackEndpoint);
  const candidateEndpoints = [normalizedEndpoint];
  const requestContext = describeRequestContext(body);

  if (normalizedFallbackEndpoint && normalizedFallbackEndpoint !== normalizedEndpoint) {
    candidateEndpoints.push(normalizedFallbackEndpoint);
  }

  let primaryError = null;

  for (const [index, currentEndpoint] of candidateEndpoints.entries()) {
    const attemptsForEndpoint = index === 0 && candidateEndpoints.length > 1 ? 1 : Math.max(1, retryAttempts);

    for (let attempt = 1; attempt <= attemptsForEndpoint; attempt += 1) {
      try {
        return await requestAuthoringEndpoint(currentEndpoint, body, requestTimeoutMs);
      } catch (error) {
        const retryableError = isRetryableAuthoringError(error);
        const canRetrySameEndpoint = retryableError && attempt < attemptsForEndpoint;
        const shouldRetryWithFallback = index === 0 && candidateEndpoints.length > 1 && retryableError;

        if (canRetrySameEndpoint) {
          process.stderr.write(
            `[${requestContext}] Authoring endpoint failed on ${currentEndpoint} (${formatErrorSummary(
              error
            )}). Retrying attempt ${attempt + 1}/${attemptsForEndpoint} in ${retryDelayMs}ms.\n`
          );
          await wait(retryDelayMs);
          continue;
        }

        if (shouldRetryWithFallback) {
          primaryError = error;
          process.stderr.write(
            `[${requestContext}] Primary authoring endpoint failed (${formatErrorSummary(
              error
            )}). Retrying through fallback endpoint: ${normalizedFallbackEndpoint}\n`
          );
          break;
        }

        if (index > 0 && primaryError) {
          throw new Error(
            `[${requestContext}] Primary authoring endpoint failed (${formatErrorSummary(
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

async function writeOutput(outputPath, payload) {
  if (!outputPath) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  await writeJson(path.resolve(outputPath), payload);
}

async function ensureFile(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const fileStats = await stat(resolved);
  if (!fileStats.isFile()) {
    throw new Error(`Expected a file: ${resolved}`);
  }
  return resolved;
}

async function main() {
  const [command = 'help', ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (command === 'help') {
    process.stdout.write(
      [
        'Usage: node tools/config-draft-sync.mjs <command> [--key=value]',
        'Commands:',
        '  pack    --domain=example.com [--drafts-root=drafts] [--stage=draft] [--output=package.json]',
        '  unpack  --input=package.json [--drafts-root=drafts] [--clean-domain=true]',
        '  pull    --endpoint=https://... --domain=example.com --environment=test|production|dev [--stage=draft] [--drafts-root=drafts] [--clean-domain=true] [--request-timeout-ms=20000] [--fallback-endpoint=https://...] [--retry-attempts=2] [--retry-delay-ms=250]',
        '          dev is read-only and maps explicitly to test; dev never has its own remote environment.',
        '  push    --endpoint=https://... --domain=example.com --environment=production|test [--drafts-root=drafts] [--updated-by=name] [--request-timeout-ms=20000] [--fallback-endpoint=https://...] [--retry-attempts=2] [--retry-delay-ms=250]',
        '  create  --endpoint=https://... --domain=newsite.example --environment=production|test [--drafts-root=drafts] [--publish-on-create=true] [--request-timeout-ms=20000] [--fallback-endpoint=https://...] [--retry-attempts=2] [--retry-delay-ms=250]',
        '  publish --endpoint=https://... --domain=example.com --environment=production|test [--version-id=...] [--request-timeout-ms=20000] [--fallback-endpoint=https://...] [--retry-attempts=2] [--retry-delay-ms=250]',
      ].join('\n') + '\n'
    );
    return;
  }

  if (command === 'pack') {
    const domain = getRequiredDomainArg(args);
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const stage = normalizeStage(args.stage);
    const draftPackage = await buildDraftPackage({ domain, draftsRoot, stage });
    await writeOutput(args.output, draftPackage);
    return;
  }

  if (command === 'unpack') {
    const inputPath = await ensureFile(getRequiredArg(args, 'input'));
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const draftPackage = await readJson(inputPath);
    await unpackDraftPackage(draftPackage, draftsRoot, {
      cleanDomain: String(args['clean-domain'] ?? 'false') === 'true',
    });
    process.stdout.write(`Unpacked ${draftPackage.files.length} files into ${draftsRoot}\n`);
    return;
  }

  if (command === 'pull') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredDomainArg(args);
    const stage = normalizeStage(args.stage);
    const environment = normalizeRemoteEnvironment(getRequiredArg(args, 'environment'), { allowDevRead: true });
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const response = await callAuthoringEndpoint(
      endpoint,
      { action: 'getSite', domain, stage, environment },
      {
        requestTimeoutMs: getIntegerArg(args, 'request-timeout-ms', DEFAULT_REQUEST_TIMEOUT_MS),
        fallbackEndpoint: args['fallback-endpoint'],
        retryAttempts: getIntegerArg(args, 'retry-attempts', DEFAULT_RETRY_ATTEMPTS),
        retryDelayMs: getIntegerArg(args, 'retry-delay-ms', DEFAULT_RETRY_DELAY_MS),
      }
    );
    if (response?.domain !== domain || response?.stage !== stage || response?.environment !== environment) {
      throw new Error('Authoring response scope mismatch.');
    }
    await unpackDraftPackage(response, draftsRoot, { cleanDomain: String(args['clean-domain'] ?? 'true') === 'true' });
    process.stdout.write(`Pulled ${response.files.length} files for ${domain} (${stage}) into ${draftsRoot}\n`);
    return;
  }

  if (command === 'push' || command === 'create') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredDomainArg(args);
    const environment = normalizeRemoteEnvironment(getRequiredArg(args, 'environment'));
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const stage = normalizeStage(args.stage);
    const draftPackage = await buildDraftPackage({ domain, draftsRoot, stage });
    const action = command === 'create' ? 'createSite' : 'upsertDraft';
    const response = await callAuthoringEndpoint(
      endpoint,
      {
        action,
        domain,
        environment,
        files: draftPackage.files,
        updatedBy: args['updated-by'],
        publishOnCreate: String(args['publish-on-create'] ?? 'false') === 'true',
        allowOverwrite: String(args['allow-overwrite'] ?? 'false') === 'true',
      },
      {
        requestTimeoutMs: getIntegerArg(args, 'request-timeout-ms', DEFAULT_REQUEST_TIMEOUT_MS),
        fallbackEndpoint: args['fallback-endpoint'],
        retryAttempts: getIntegerArg(args, 'retry-attempts', DEFAULT_RETRY_ATTEMPTS),
        retryDelayMs: getIntegerArg(args, 'retry-delay-ms', DEFAULT_RETRY_DELAY_MS),
      }
    );
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  if (command === 'publish') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredDomainArg(args);
    const environment = normalizeRemoteEnvironment(getRequiredArg(args, 'environment'));
    const response = await callAuthoringEndpoint(
      endpoint,
      {
        action: 'publishDraft',
        domain,
        environment,
        versionId: args['version-id'],
        updatedBy: args['updated-by'],
      },
      {
        requestTimeoutMs: getIntegerArg(args, 'request-timeout-ms', DEFAULT_REQUEST_TIMEOUT_MS),
        fallbackEndpoint: args['fallback-endpoint'],
        retryAttempts: getIntegerArg(args, 'retry-attempts', DEFAULT_RETRY_ATTEMPTS),
        retryDelayMs: getIntegerArg(args, 'retry-delay-ms', DEFAULT_RETRY_DELAY_MS),
      }
    );
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command '${command}'. Run with 'help' for usage.`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
