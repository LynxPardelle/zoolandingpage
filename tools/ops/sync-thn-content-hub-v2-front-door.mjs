#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_MANIFEST_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'thn-content-hub-v2-route-manifest.json',
);

const EXPECTED_ADMIN_PAGES = [
  ['thn-admin-access', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal/access'],
  ['thn-admin-mfa', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal/mfa'],
  ['thn-admin-list', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal'],
  ['thn-admin-new', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal/new'],
  ['thn-admin-edit', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal/:articleId/edit'],
  ['thn-admin-preview', 'thn-protected-admin-app', 'angular-ssr-protected-admin', 'GET', '/admin/journal/:articleId/preview'],
];

const EXPECTED_ADMIN_BACKEND = [
  ['thn-auth-runtime-v2', 'thn-api-proxy-v2', 'api-proxy-auth-runtime-v2', 'GET|POST', '/auth-v2/runtime-config'],
  ['thn-auth-signin-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'POST', '/auth-v2/session/signin'],
  ['thn-auth-challenge-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'POST', '/auth-v2/session/challenge/respond'],
  ['thn-auth-mfa-setup-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'POST', '/auth-v2/session/mfa/setup'],
  ['thn-auth-mfa-verify-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'POST', '/auth-v2/session/mfa/verify'],
  ['thn-auth-session-me-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'GET', '/auth-v2/session/me'],
  ['thn-auth-logout-v2', 'thn-auth-admin-v2', 'auth-admin-v2', 'POST', '/auth-v2/session/logout'],
  ['thn-content-hub-read-v2', 'thn-content-hub-v2-authoring', 'content-hub-v2-authoring', 'POST', '/features/content-hub-v2/read'],
  ['thn-content-hub-action-v2', 'thn-content-hub-v2-authoring', 'content-hub-v2-authoring', 'POST', '/features/content-hub-v2/action'],
];

const EXPECTED_PUBLIC_BACKEND = [
  ['thn-public-media-v2', 'thn-public-media-v2', 'content-hub-v2-public-media', 'GET', '/features/content-hub-v2/public-media/:articleId/:locale/:revisionId/:assetId/:variantId'],
];

const SAFE_SEGMENT = '[A-Za-z0-9][A-Za-z0-9._~-]{0,127}';
const STATIC_ASSET_HASH = /(?:^|[._-])[a-f0-9]{8,64}(?=[._-])/i;
const ADMIN_DENY_PATH_PREFIXES = [
  '/runtime-bundle',
  '/features/content-hub-v2/public-media',
];

function parseArgs(rawArgs) {
  const args = Object.create(null);
  for (const rawArg of rawArgs) {
    if (!rawArg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = rawArg.slice(2).split('=');
    const key = rawKey.trim();
    if (Object.hasOwn(args, key)) throw new Error(`Duplicate option: --${key}`);
    args[key] = valueParts.length ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function canonicalRouteTuples(routes) {
  return routes.map(route => [
    route.id,
    route.owner,
    route.target,
    [...route.methods].sort().join('|'),
    route.path,
  ]);
}

function assertExactObjectKeys(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actualKeys = Object.keys(value).sort();
  const normalizedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(normalizedExpectedKeys)) {
    throw new Error(`${label} contains an unknown or missing field`);
  }
}

function assertExactRoutes(routes, expected, label) {
  if (!Array.isArray(routes)) throw new Error(`${label} must be an array`);
  const actualSerialized = JSON.stringify(canonicalRouteTuples(routes));
  const expectedSerialized = JSON.stringify(expected);
  if (actualSerialized !== expectedSerialized) {
    throw new Error(`${label} does not match the exact approved inventory`);
  }
}

function validateRoute(route, label) {
  const keys = Object.keys(route).sort();
  const expectedKeys = ['id', 'methods', 'owner', 'path', 'target'];
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`${label} contains an unknown or missing field`);
  }
  for (const key of ['id', 'owner', 'target']) {
    if (!/^[a-z][a-z0-9-]{2,80}$/.test(String(route[key] ?? ''))) {
      throw new Error(`${label}.${key} must be a safe code-owned identifier`);
    }
  }
  if (!isSafeAbsolutePathPattern(route.path)) {
    throw new Error(`${label}.path must be an exact safe absolute path pattern`);
  }
  if (
    !Array.isArray(route.methods)
    || route.methods.length === 0
    || route.methods.some(method => !['GET', 'POST'].includes(method))
    || new Set(route.methods).size !== route.methods.length
  ) {
    throw new Error(`${label}.methods contains an unsupported or duplicate method`);
  }
}

function validateRouteManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('THN route manifest must be an object');
  }
  assertExactObjectKeys(manifest, ['version', 'environment', 'domain', 'origins'], 'THN route manifest');
  assertExactObjectKeys(manifest.origins, ['public', 'admin'], 'THN route manifest origins');
  assertExactObjectKeys(
    manifest.origins.public,
    ['host', 'originRole', 'defaultDecision', 'denyPathPrefixes', 'backendRoutes'],
    'THN public origin',
  );
  assertExactObjectKeys(
    manifest.origins.admin,
    ['host', 'originRole', 'defaultDecision', 'pageRoutes', 'staticAssets', 'backendRoutes'],
    'THN protected admin origin',
  );
  assertExactObjectKeys(
    manifest.origins.admin.staticAssets,
    ['mode'],
    'THN protected admin static asset contract',
  );
  if (manifest.version !== 1 || manifest.environment !== 'test') {
    throw new Error('THN route manifest must be version 1 and TEST-only');
  }
  if (manifest.domain !== 'thehairnarrative.com') {
    throw new Error('THN route manifest domain must be exact');
  }
  const publicOrigin = manifest.origins?.public;
  const adminOrigin = manifest.origins?.admin;
  if (
    publicOrigin?.host !== 'test.zoolandingpage.com.mx'
    || publicOrigin?.originRole !== 'public'
    || publicOrigin?.defaultDecision !== 'pass-through'
  ) {
    throw new Error('THN public origin contract is not exact');
  }
  if (
    adminOrigin?.host !== 'admin-test.thehairnarrative.com'
    || adminOrigin?.originRole !== 'protected-admin'
    || adminOrigin?.defaultDecision !== 'deny'
    || adminOrigin?.staticAssets?.mode !== 'selected-release-manifest-only'
  ) {
    throw new Error('THN protected admin origin contract is not exact');
  }

  for (const [label, routes] of [
    ['public backend route', publicOrigin.backendRoutes],
    ['admin page route', adminOrigin.pageRoutes],
    ['admin backend route', adminOrigin.backendRoutes],
  ]) {
    if (!Array.isArray(routes)) throw new Error(`${label} must be an array`);
    routes.forEach((route, index) => validateRoute(route, `${label}[${index}]`));
    const identities = routes.flatMap(route => [route.id]);
    if (new Set(identities).size !== identities.length) {
      throw new Error(`${label} IDs must be unique`);
    }
  }

  assertExactRoutes(publicOrigin.backendRoutes, EXPECTED_PUBLIC_BACKEND, 'public backend routes');
  assertExactRoutes(adminOrigin.pageRoutes, EXPECTED_ADMIN_PAGES, 'admin page routes');
  assertExactRoutes(adminOrigin.backendRoutes, EXPECTED_ADMIN_BACKEND, 'admin backend routes');
  const expectedDenials = ['/admin/journal', '/auth-v2', '/features/content-hub-v2'];
  if (JSON.stringify(publicOrigin.denyPathPrefixes) !== JSON.stringify(expectedDenials)) {
    throw new Error('public deny prefixes do not match the exact approved inventory');
  }
  return manifest;
}

function isSafeAbsolutePathPattern(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('\\')) return false;
  if (value.includes('?') || value.includes('#') || value.includes('//')) return false;
  const segments = value.split('/').slice(1);
  if (!segments.length || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    return false;
  }
  return segments.every(segment => (
    segment.startsWith(':')
      ? /^:[A-Za-z][A-Za-z0-9]*$/.test(segment)
      : /^[A-Za-z0-9._~-]+$/.test(segment)
  ));
}

function normalizeRequestPath(value) {
  const pathname = String(value ?? '');
  if (!pathname.startsWith('/') || pathname.includes('?') || pathname.includes('#')) return null;
  if (pathname.includes('\\') || pathname.includes('//') || pathname.includes('%')) return null;
  if (pathname === '/') return pathname;
  const segments = pathname.split('/').slice(1);
  if (segments.some(segment => segment === '.' || segment === '..' || !segment)) return null;
  return pathname;
}

function compilePathPattern(pattern) {
  const escapedSegments = pattern.split('/').slice(1).map(segment => (
    segment.startsWith(':')
      ? `(?<${segment.slice(1)}>${SAFE_SEGMENT})`
      : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ));
  return new RegExp(`^/${escapedSegments.join('/')}$`);
}

function pathMatchesPrefix(pathname, prefix) {
  return pathname.startsWith(prefix);
}

function findRouteMatch(routes, pathname) {
  return routes.find(route => compilePathPattern(route.path).test(pathname)) ?? null;
}

function allow(owner) {
  return { decision: 'allow', owner, statusCode: 200 };
}

function deny(statusCode = 404) {
  return { decision: 'deny', owner: null, statusCode };
}

function classifyRequest({
  manifest,
  originRole,
  method,
  pathname,
  selectedStaticAssets = [],
}) {
  const validatedManifest = validateRouteManifest(manifest);
  const normalizedPath = normalizeRequestPath(pathname);
  const normalizedMethod = String(method ?? '').toUpperCase();
  if (!normalizedPath || !/^[A-Z]+$/.test(normalizedMethod)) {
    return deny(404);
  }

  if (originRole === 'public') {
    const publicOrigin = validatedManifest.origins.public;
    const route = findRouteMatch(publicOrigin.backendRoutes, normalizedPath);
    if (route) {
      return route.methods.includes(normalizedMethod) ? allow(route.owner) : deny(405);
    }
    const lowerPath = normalizedPath.toLowerCase();
    if (publicOrigin.denyPathPrefixes.some(prefix => pathMatchesPrefix(lowerPath, prefix))) {
      return deny(404);
    }
    return { decision: 'pass-through', owner: null, statusCode: null };
  }

  if (originRole !== 'protected-admin') return deny(404);
  const adminOrigin = validatedManifest.origins.admin;
  const route = findRouteMatch(
    [...adminOrigin.pageRoutes, ...adminOrigin.backendRoutes],
    normalizedPath,
  );
  if (route) {
    return route.methods.includes(normalizedMethod) ? allow(route.owner) : deny(405);
  }
  if (ADMIN_DENY_PATH_PREFIXES.some(prefix => pathMatchesPrefix(normalizedPath, prefix))) {
    return deny(404);
  }

  const selectedAssets = new Set(validateSelectedStaticAssets(selectedStaticAssets));
  if (selectedAssets.has(normalizedPath)) {
    return normalizedMethod === 'GET' ? allow('selected-frontend-release') : deny(405);
  }
  return deny(404);
}

function validateSelectedStaticAssets(paths) {
  if (!Array.isArray(paths)) throw new Error('Selected static assets must be an array');
  const normalized = paths.map(value => String(value ?? '').trim());
  for (const assetPath of normalized) {
    const segments = assetPath.split('/').slice(1);
    const hasSafeSegments = segments.length >= 2 && segments.every(segment => (
      segment !== '.'
      && segment !== '..'
      && /^[A-Za-z0-9._~-]+$/.test(segment)
    ));
    if (
      !assetPath.startsWith('/browser/')
      || assetPath.includes('\\')
      || assetPath.includes('//')
      || assetPath.includes('..')
      || assetPath.includes('%')
      || assetPath.includes('?')
      || assetPath.includes('#')
      || assetPath.includes('://')
      || !hasSafeSegments
      || !STATIC_ASSET_HASH.test(path.posix.basename(assetPath))
    ) {
      throw new Error(`Selected static asset path is not exact and manifest-hashed: ${assetPath}`);
    }
  }
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function validateReleaseManifest(releaseManifest) {
  assertExactObjectKeys(
    releaseManifest,
    ['version', 'environment', 'releaseId', 'staticAssetPaths'],
    'Selected frontend release manifest',
  );
  if (releaseManifest.version !== 1 || releaseManifest.environment !== 'test') {
    throw new Error('Selected frontend release manifest must be version 1 and TEST-only');
  }
  return {
    version: 1,
    environment: 'test',
    releaseId: releaseManifest.releaseId,
    staticAssetPaths: validateSelectedStaticAssets(releaseManifest.staticAssetPaths),
  };
}

function buildSyncPlan({ manifest, releaseId, selectedStaticAssets }) {
  const validatedManifest = validateRouteManifest(manifest);
  const normalizedReleaseId = String(releaseId ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/.test(normalizedReleaseId)) {
    throw new Error('Selected frontend release ID is invalid');
  }
  const staticAssetPaths = validateSelectedStaticAssets(selectedStaticAssets);
  return {
    version: 1,
    environment: 'test',
    mode: 'dry-run',
    activationAllowed: false,
    deploymentOwner: 'Workstream D',
    releaseId: normalizedReleaseId,
    frontDoors: {
      public: {
        host: validatedManifest.origins.public.host,
        originRole: validatedManifest.origins.public.originRole,
        defaultDecision: validatedManifest.origins.public.defaultDecision,
        denyPathPrefixes: [...validatedManifest.origins.public.denyPathPrefixes],
        backendRoutes: validatedManifest.origins.public.backendRoutes.map(route => ({ ...route })),
      },
      admin: {
        host: validatedManifest.origins.admin.host,
        originRole: validatedManifest.origins.admin.originRole,
        defaultDecision: validatedManifest.origins.admin.defaultDecision,
        pageRoutes: validatedManifest.origins.admin.pageRoutes.map(route => ({ ...route })),
        backendRoutes: validatedManifest.origins.admin.backendRoutes.map(route => ({ ...route })),
        staticAssetPaths,
      },
    },
  };
}

async function readJson(filePath, label) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path.resolve(filePath), 'utf8'));
  } catch (error) {
    throw new Error(`${label} must be readable JSON: ${error.message}`);
  }
  return parsed;
}

async function writeJson(filePath, value) {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function runCli(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const allowedArgs = new Set(['manifest', 'release-manifest', 'output', 'apply']);
  const unknownArgs = Object.keys(args).filter(key => !allowedArgs.has(key));
  if (unknownArgs.length > 0 || rawArgs.some(rawArg => !rawArg.startsWith('--'))) {
    throw new Error(`Unknown option: ${unknownArgs[0] ?? 'positional argument'}`);
  }
  if (Object.hasOwn(args, 'apply')) {
    throw new Error('Workstream A is build-only; only Workstream D may apply this front-door plan');
  }
  if (!args['release-manifest']) {
    throw new Error('--release-manifest is required');
  }
  const manifest = await readJson(args.manifest ?? DEFAULT_MANIFEST_PATH, 'THN route manifest');
  const releaseManifest = validateReleaseManifest(await readJson(
    args['release-manifest'],
    'Selected frontend release manifest',
  ));
  const plan = buildSyncPlan({
    manifest,
    releaseId: releaseManifest.releaseId,
    selectedStaticAssets: releaseManifest.staticAssetPaths,
  });
  if (args.output) {
    await writeJson(args.output, plan);
  } else {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  }
  return plan;
}

export {
  buildSyncPlan,
  classifyRequest,
  parseArgs,
  runCli,
  validateReleaseManifest,
  validateRouteManifest,
  validateSelectedStaticAssets,
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  runCli().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
