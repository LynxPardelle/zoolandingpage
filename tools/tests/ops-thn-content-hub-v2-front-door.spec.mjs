import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const manifestPath = path.resolve(
  import.meta.dirname,
  '../ops/thn-content-hub-v2-route-manifest.json',
);
const toolPath = path.resolve(
  import.meta.dirname,
  '../ops/sync-thn-content-hub-v2-front-door.mjs',
);

async function readManifest() {
  assert.equal(existsSync(manifestPath), true, 'TASK-014 route manifest must exist');
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function loadTool() {
  assert.equal(existsSync(toolPath), true, 'TASK-014 sync tool must exist');
  return import(`${pathToFileURL(toolPath).href}?test=${Date.now()}`);
}

test('THN v2 manifest declares the exact closed public and admin inventories', async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 1);
  assert.equal(manifest.environment, 'test');
  assert.equal(manifest.domain, 'thehairnarrative.com');
  assert.equal(manifest.origins.public.host, 'test.zoolandingpage.com.mx');
  assert.equal(manifest.origins.public.originRole, 'public');
  assert.equal(manifest.origins.public.defaultDecision, 'pass-through');
  assert.equal(manifest.origins.admin.host, 'admin-test.thehairnarrative.com');
  assert.equal(manifest.origins.admin.originRole, 'protected-admin');
  assert.equal(manifest.origins.admin.defaultDecision, 'deny');
  assert.equal(manifest.origins.admin.staticAssets.mode, 'selected-release-manifest-only');

  assert.deepEqual(
    manifest.origins.admin.pageRoutes.map(({ path: routePath, methods }) => ({
      path: routePath,
      methods,
    })),
    [
      { path: '/admin/journal/access', methods: ['GET'] },
      { path: '/admin/journal/mfa', methods: ['GET'] },
      { path: '/admin/journal', methods: ['GET'] },
      { path: '/admin/journal/new', methods: ['GET'] },
      { path: '/admin/journal/:articleId/edit', methods: ['GET'] },
      { path: '/admin/journal/:articleId/preview', methods: ['GET'] },
    ],
  );

  assert.deepEqual(
    manifest.origins.admin.backendRoutes.map(({ path: routePath, methods }) => ({
      path: routePath,
      methods,
    })),
    [
      { path: '/auth-v2/runtime-config', methods: ['GET', 'POST'] },
      { path: '/auth-v2/session/signin', methods: ['POST'] },
      { path: '/auth-v2/session/challenge/respond', methods: ['POST'] },
      { path: '/auth-v2/session/mfa/setup', methods: ['POST'] },
      { path: '/auth-v2/session/mfa/verify', methods: ['POST'] },
      { path: '/auth-v2/session/me', methods: ['GET'] },
      { path: '/auth-v2/session/logout', methods: ['POST'] },
      { path: '/features/content-hub-v2/read', methods: ['POST'] },
      { path: '/features/content-hub-v2/action', methods: ['POST'] },
    ],
  );

  assert.deepEqual(
    manifest.origins.public.backendRoutes.map(({ path: routePath, methods }) => ({
      path: routePath,
      methods,
    })),
    [{
      path: '/features/content-hub-v2/public-media/:articleId/:locale/:revisionId/:assetId/:variantId',
      methods: ['GET'],
    }],
  );
});

test('THN v2 manifest rejects unknown fields and route ownership drift', async () => {
  const manifest = await readManifest();
  const { validateRouteManifest } = await loadTool();
  const mutations = [
    candidate => { candidate.debug = true; },
    candidate => { candidate.origins.preview = {}; },
    candidate => { candidate.origins.public.debug = true; },
    candidate => { candidate.origins.admin.debug = true; },
    candidate => { candidate.origins.admin.staticAssets.debug = true; },
    candidate => { candidate.origins.admin.backendRoutes[0].owner = 'thn-api-proxy-v3'; },
    candidate => { candidate.origins.public.backendRoutes[0].target = 'content-hub-v2-private-media'; },
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(manifest);
    mutate(candidate);
    assert.throws(
      () => validateRouteManifest(candidate),
      /unknown|exact|inventory|contract/i,
    );
  }
});

test('public origin passes existing traffic through but denies every private v2 namespace', async () => {
  const manifest = await readManifest();
  const { classifyRequest } = await loadTool();

  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'GET',
      pathname: '/features/content-hub-v2/public-media/article-1/en/rev-1/asset-1/card',
    }),
    { decision: 'allow', owner: 'thn-public-media-v2', statusCode: 200 },
  );
  assert.equal(classifyRequest({
    manifest,
    originRole: 'public',
    method: 'POST',
    pathname: '/features/content-hub-v2/public-media/article-1/en/rev-1/asset-1/card',
  }).statusCode, 405);

  for (const [method, pathname] of [
    ['GET', '/admin/journal'],
    ['GET', '/ADMIN/JOURNAL'],
    ['GET', '/admin/journal;foo'],
    ['GET', '/admin/journal.json'],
    ['GET', '/auth-v2/session/me'],
    ['GET', '/auth-v2%2Fsession%2Fme'],
    ['GET', '/auth-v2;foo'],
    ['POST', '/features/content-hub-v2/read'],
    ['GET', '/features/content-hub-v2.read'],
    ['POST', '/features/content-hub-v2/action'],
  ]) {
    assert.deepEqual(
      classifyRequest({ manifest, originRole: 'public', method, pathname }),
      { decision: 'deny', owner: null, statusCode: 404 },
    );
  }

  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'GET',
      pathname: '/',
    }),
    { decision: 'pass-through', owner: null, statusCode: null },
  );
  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'GET',
      pathname: '/the-journal',
    }),
    { decision: 'pass-through', owner: null, statusCode: null },
  );
  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'HEAD',
      pathname: '/the-journal',
    }),
    { decision: 'pass-through', owner: null, statusCode: null },
  );
  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'OPTIONS',
      pathname: '/auth/runtime-config',
    }),
    { decision: 'pass-through', owner: null, statusCode: null },
  );
  assert.deepEqual(
    classifyRequest({
      manifest,
      originRole: 'public',
      method: 'GET',
      pathname: '/auth/session/me',
    }),
    { decision: 'pass-through', owner: null, statusCode: null },
  );
});

test('admin origin allows only exact pages, APIs, and selected immutable assets', async () => {
  const manifest = await readManifest();
  const { classifyRequest, validateSelectedStaticAssets } = await loadTool();
  const selectedStaticAssets = validateSelectedStaticAssets([
    '/browser/main.1234abcd.js',
    '/browser/styles.abcdef12.css',
  ]);

  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'GET',
    pathname: '/admin/journal/article-1/edit',
    selectedStaticAssets,
  }).decision, 'allow');
  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'POST',
    pathname: '/admin/journal/article-1/edit',
    selectedStaticAssets,
  }).statusCode, 405);
  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'DELETE',
    pathname: '/auth-v2/session/me',
    selectedStaticAssets,
  }).statusCode, 405);
  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'GET',
    pathname: '/browser/main.1234abcd.js',
    selectedStaticAssets,
  }).owner, 'selected-frontend-release');
  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'GET',
    pathname: '/auth-v2/session/me',
    selectedStaticAssets,
  }).owner, 'thn-auth-admin-v2');
  assert.equal(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'POST',
    pathname: '/features/content-hub-v2/action',
    selectedStaticAssets,
  }).owner, 'thn-content-hub-v2-authoring');
  assert.deepEqual(classifyRequest({
    manifest,
    originRole: 'protected-admin',
    method: 'GET',
    pathname: '/features/content-hub-v2/public-media/article/en/rev/asset/card.1234abcd.js',
    selectedStaticAssets: [
      '/features/content-hub-v2/public-media/article/en/rev/asset/card.1234abcd.js',
    ],
  }), { decision: 'deny', owner: null, statusCode: 404 });

  for (const pathname of [
    '/',
    '/the-journal',
    '/runtime-bundle',
    '/features/content-hub-v2/public-media/article-1/en/rev-1/asset-1/card',
    '/browser/main.not-selected.js',
    '/admin/journal/article-1/edit/extra',
  ]) {
    assert.deepEqual(
      classifyRequest({
        manifest,
        originRole: 'protected-admin',
        method: 'GET',
        pathname,
        selectedStaticAssets,
      }),
      { decision: 'deny', owner: null, statusCode: 404 },
    );
  }
});

test('selected static assets must be exact absolute manifest-hashed paths', async () => {
  const { validateSelectedStaticAssets } = await loadTool();

  assert.deepEqual(
    validateSelectedStaticAssets([
      '/browser/styles.abcdef12.css',
      '/browser/main.1234abcd.js',
      '/browser/main.1234abcd.js',
    ]),
    ['/browser/main.1234abcd.js', '/browser/styles.abcdef12.css'],
  );
  for (const invalidPath of [
    'browser/main.1234abcd.js',
    '/browser/main.js',
    '/browser/../main.1234abcd.js',
    '/browser/main.1234abcd.js?token=value',
    '/browser//main.1234abcd.js',
    '/browser/./main.1234abcd.js',
    '/browser/main.1234abcd.js/',
    '/browser/main file.1234abcd.js',
    "/browser/main.1234abcd.js\nignored",
    '/browser/%2e%2e/main.1234abcd.js',
    '/features/content-hub-v2/public-media/article/en/rev/asset/card.1234abcd.js',
    '/main.1234abcd.js',
    'https://example.test/main.1234abcd.js',
  ]) {
    assert.throws(
      () => validateSelectedStaticAssets([invalidPath]),
      /static asset/i,
    );
  }
});

test('sync plan stays logical, TEST-only, default-off, and free of private policy', async () => {
  const manifest = await readManifest();
  const { buildSyncPlan } = await loadTool();
  const plan = buildSyncPlan({
    manifest,
    releaseId: 'frontend-release-0123456789abcdef',
    selectedStaticAssets: ['/browser/main.1234abcd.js'],
  });

  assert.equal(plan.environment, 'test');
  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.activationAllowed, false);
  assert.equal(plan.frontDoors.admin.host, 'admin-test.thehairnarrative.com');
  assert.deepEqual(plan.frontDoors.admin.staticAssetPaths, ['/browser/main.1234abcd.js']);
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /tenantId|writerMode|writerEpoch|serviceBindingId|cookie|secret/i);
  assert.doesNotMatch(serialized, /zoositioweb/);
  assert.doesNotMatch(serialized, /production|prod/i);
});

test('CLI writes only a dry-run sync plan and rejects apply in Workstream A', async () => {
  assert.equal(existsSync(toolPath), true, 'TASK-014 sync tool must exist');
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-thn-v2-front-door-'));
  const releaseManifestPath = path.join(root, 'release-manifest.json');
  const outputPath = path.join(root, 'front-door-plan.json');
  await writeFile(releaseManifestPath, JSON.stringify({
    version: 1,
    environment: 'test',
    releaseId: 'frontend-release-0123456789abcdef',
    staticAssetPaths: ['/browser/main.1234abcd.js'],
  }), 'utf8');

  const { spawnSync } = await import('node:child_process');
  const dryRun = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${releaseManifestPath}`,
    `--output=${outputPath}`,
  ], { encoding: 'utf8' });
  assert.equal(dryRun.status, 0, dryRun.stderr);
  const output = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(output.mode, 'dry-run');
  assert.equal(output.activationAllowed, false);

  const apply = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${releaseManifestPath}`,
    '--apply',
  ], { encoding: 'utf8' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /Workstream D/i);

  const applyFalse = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${releaseManifestPath}`,
    '--apply=false',
  ], { encoding: 'utf8' });
  assert.notEqual(applyFalse.status, 0);
  assert.match(applyFalse.stderr, /Workstream D/i);
});

test('CLI rejects unknown options and non-canonical release manifests', async () => {
  assert.equal(existsSync(toolPath), true, 'TASK-014 sync tool must exist');
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-thn-v2-front-door-invalid-'));
  const validReleaseManifestPath = path.join(root, 'valid-release-manifest.json');
  const invalidReleaseManifestPath = path.join(root, 'invalid-release-manifest.json');
  await writeFile(validReleaseManifestPath, JSON.stringify({
    version: 1,
    environment: 'test',
    releaseId: 'frontend-release-0123456789abcdef',
    staticAssetPaths: ['/browser/main.1234abcd.js'],
  }), 'utf8');
  await writeFile(invalidReleaseManifestPath, JSON.stringify({
    version: 1,
    environment: 'production',
    releaseId: 'frontend-release-0123456789abcdef',
    staticAssetPaths: ['/browser/main.1234abcd.js'],
  }), 'utf8');

  const { spawnSync } = await import('node:child_process');
  const unknownOption = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${validReleaseManifestPath}`,
    '--stage=prod',
  ], { encoding: 'utf8' });
  assert.notEqual(unknownOption.status, 0);
  assert.match(unknownOption.stderr, /unknown option/i);

  const prototypeOption = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${validReleaseManifestPath}`,
    '--__proto__=ignored',
  ], { encoding: 'utf8' });
  assert.notEqual(prototypeOption.status, 0);
  assert.match(prototypeOption.stderr, /unknown option/i);

  const duplicateOption = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${validReleaseManifestPath}`,
    `--release-manifest=${validReleaseManifestPath}`,
  ], { encoding: 'utf8' });
  assert.notEqual(duplicateOption.status, 0);
  assert.match(duplicateOption.stderr, /duplicate option/i);

  const invalidRelease = spawnSync(process.execPath, [
    toolPath,
    `--release-manifest=${invalidReleaseManifestPath}`,
  ], { encoding: 'utf8' });
  assert.notEqual(invalidRelease.status, 0);
  assert.match(invalidRelease.stderr, /release manifest/i);
});
