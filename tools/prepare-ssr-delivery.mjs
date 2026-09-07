import { createHash } from 'node:crypto';
import { appendFile, lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateReleaseManifest, validateRouteManifest } from './ops/sync-thn-content-hub-v2-front-door.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = reason => { throw new Error(`SSR delivery rejected: ${reason}`); };
const privateSegments = new Set(['server', '.git', '.github', 'tools', 'node_modules', 'ai_notes', 'findings', 'errors-reports', 'devonly', 'logs', 'reports', '.superpowers']);
const adminAssetExtension = /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|ico)$/i;

function assertCoordinates(c) {
  if (!['test', 'production'].includes(c.environment)
    || !/^[a-f0-9]{40}$/.test(c.sourceCommit)
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(c.releaseId)
    || !/^[1-9][0-9]{0,19}$/.test(c.runId)
    || !/^[1-9][0-9]{0,9}$/.test(c.runAttempt)) fail('coordinates');
}

function safePath(value) {
  return typeof value === 'string' && value.length < 1024 && value.split('/').every(part => (
    /^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(part) && !part.includes('..')
    && !privateSegments.has(part.toLowerCase()) && part !== 'draft-repo.config.json'
  ));
}

async function regularFile(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('non-regular file');
  return readFile(file);
}

async function walk(root, prefix) {
  let parent = root;
  for (const segment of ['', ...prefix.split('/')]) {
    parent = path.join(parent, segment);
    const info = await lstat(parent);
    if (!info.isDirectory() || info.isSymbolicLink()) fail('linked directory');
  }
  const directory = path.join(root, prefix);
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) fail('linked directory');
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (!safePath(relative) || entry.isSymbolicLink()) fail('non-public path');
    if (entry.isDirectory()) files.push(...await walk(root, relative));
    else if (entry.isFile()) files.push(relative);
    else fail('non-regular entry');
  }
  return files.sort();
}

function assertSourceManifest(manifest, c, zipHash) {
  const prefix = `frontend/angular-ssr/${c.environment}/releases/${c.releaseId}`;
  if (manifest.schemaVersion !== 1 || manifest.app !== 'zoolandingpage'
    || manifest.environment !== c.environment || manifest.releaseId !== c.releaseId
    || manifest.sourceCommit !== c.sourceCommit || manifest.browserPrefix !== `${prefix}/browser`
    || manifest.serverBundleKey !== `${prefix}/server/ssr-handler.zip`
    || manifest.checksums?.['server/ssr-handler.zip'] !== zipHash) fail('source manifest');
}

export async function prepareDelivery({ root, routeManifest, adminEnabled = false, adminRelease, ...c }) {
  assertCoordinates(c);
  if (typeof adminEnabled !== 'boolean') fail('admin flag');
  if (adminEnabled && (c.environment !== 'test' || !adminRelease)) fail('admin manifest is required in TEST only');
  validateRouteManifest(routeManifest);
  const browserFiles = await walk(root, 'staging/browser');
  if (!browserFiles.length) fail('empty browser artifact');
  const zip = await regularFile(path.join(root, 'ssr-handler.zip'));
  const manifest = JSON.parse(await regularFile(path.join(root, 'manifest.json')));
  assertSourceManifest(manifest, c, sha256(zip));
  const files = ['manifest.json', 'ssr-handler.zip', ...browserFiles];
  let thnAdmin = { enabled: false };
  if (adminEnabled) {
    const release = validateReleaseManifest(adminRelease);
    if (release.releaseId !== c.releaseId || !release.staticAssetPaths.length) fail('admin release mismatch');
    for (const file of release.staticAssetPaths) {
      if (!adminAssetExtension.test(file) || !browserFiles.includes(`staging${file}`)) fail('admin asset is missing or not permitted');
    }
    await writeFile(path.join(root, 'thn-admin-release.json'), `${JSON.stringify(release, null, 2)}\n`, { flag: 'wx' });
    await writeFile(path.join(root, 'thn-route-manifest.json'), `${JSON.stringify(routeManifest, null, 2)}\n`, { flag: 'wx' });
    files.push('thn-admin-release.json', 'thn-route-manifest.json');
    thnAdmin = { enabled: true, origin: 'https://admin-test.thehairnarrative.com' };
  }
  const contract = { schemaVersion: 1, environment: c.environment, releaseId: c.releaseId, sourceCommit: c.sourceCommit,
    runId: c.runId, runAttempt: c.runAttempt, deployed: false, thnAdmin, files: [] };
  for (const file of files.sort()) {
    contract.files.push({ path: file, sha256: sha256(await regularFile(path.join(root, file))) });
  }
  const bytes = `${JSON.stringify(contract, null, 2)}\n`;
  await writeFile(path.join(root, 'delivery.json'), bytes, { flag: 'wx' });
  return { contract, digest: sha256(bytes) };
}

export async function verifyDelivery({ root, digest, ...c }) {
  try {
    assertCoordinates(c);
    const bytes = await regularFile(path.join(root, 'delivery.json'));
    if (!/^[a-f0-9]{64}$/.test(digest) || sha256(bytes) !== digest) fail('external digest');
    const contract = JSON.parse(bytes);
    if (Object.keys(contract).sort().join(',') !== 'deployed,environment,files,releaseId,runAttempt,runId,schemaVersion,sourceCommit,thnAdmin'
      || contract.schemaVersion !== 1 || contract.deployed !== false) fail('contract schema');
    for (const key of ['environment', 'releaseId', 'sourceCommit', 'runId', 'runAttempt']) {
      if (contract[key] !== c[key]) fail('source/run binding');
    }
    if (!Array.isArray(contract.files) || !contract.files.length) fail('empty inventory');
    const paths = contract.files.map(file => file.path);
    if (new Set(paths).size !== paths.length) fail('duplicate files');
    const expected = ['manifest.json', 'ssr-handler.zip', ...await walk(root, 'staging/browser')];
    if (contract.thnAdmin?.enabled === true) {
      if (c.environment !== 'test' || Object.keys(contract.thnAdmin).sort().join(',') !== 'enabled,origin'
        || contract.thnAdmin.origin !== 'https://admin-test.thehairnarrative.com') fail('admin origin');
      const routes = JSON.parse(await regularFile(path.join(root, 'thn-route-manifest.json')));
      validateRouteManifest(routes);
      const release = validateReleaseManifest(JSON.parse(await regularFile(path.join(root, 'thn-admin-release.json'))));
      if (release.releaseId !== c.releaseId || !release.staticAssetPaths.length) fail('admin release');
      for (const file of release.staticAssetPaths) {
        if (!adminAssetExtension.test(file) || !paths.includes(`staging${file}`)) fail('admin asset');
      }
      expected.push('thn-admin-release.json', 'thn-route-manifest.json');
    } else if (JSON.stringify(contract.thnAdmin) !== '{"enabled":false}') fail('admin schema');
    if (JSON.stringify(paths) !== JSON.stringify(expected.sort())) fail('complete inventory');
    const topLevel = ['delivery.json', 'manifest.json', 'ssr-handler.zip', 'staging'];
    if (contract.thnAdmin.enabled) topLevel.push('thn-admin-release.json', 'thn-route-manifest.json');
    if (JSON.stringify((await readdir(root)).sort()) !== JSON.stringify(topLevel.sort())
      || JSON.stringify(await readdir(path.join(root, 'staging'))) !== '["browser"]') fail('unexpected artifact entry');
    for (const file of contract.files) {
      if (Object.keys(file).sort().join(',') !== 'path,sha256' || !safePath(file.path)
        || !/^[a-f0-9]{64}$/.test(file.sha256)
        || sha256(await regularFile(path.join(root, file.path))) !== file.sha256) fail('file checksum');
    }
    assertSourceManifest(JSON.parse(await regularFile(path.join(root, 'manifest.json'))), c,
      sha256(await regularFile(path.join(root, 'ssr-handler.zip'))));
    return contract;
  } catch {
    fail('artifact verification');
  }
}

/** Validate downloaded, immutable TEST evidence; this never selects an infrastructure release. */
export async function prepareRollback({ sourceRun, artifact, expectedArtifactId, ...expected }) {
  try {
    const contract = await verifyDelivery(expected);
    if (contract.environment !== 'test' || !/^[1-9][0-9]{0,19}$/.test(expectedArtifactId)
      || String(artifact.id) !== expectedArtifactId || artifact.expired !== false
      || sourceRun.repository?.full_name !== 'LynxPardelle/zoolandingpage'
      || sourceRun.path !== '.github/workflows/publish-ssr-artifact.yml'
      || sourceRun.head_branch !== 'test' || sourceRun.head_sha !== contract.sourceCommit
      || String(sourceRun.id) !== contract.runId || String(sourceRun.run_attempt) !== contract.runAttempt
      || sourceRun.status !== 'completed' || sourceRun.conclusion !== 'success'
      || !['push', 'workflow_dispatch'].includes(sourceRun.event)
      || artifact.name !== `ssr-test-${contract.runId}-${contract.runAttempt}-${contract.sourceCommit}`
      || String(artifact.workflow_run?.id) !== contract.runId || artifact.workflow_run.head_sha !== contract.sourceCommit
      || artifact.workflow_run.head_branch !== 'test') fail('rollback source');
    return { schemaVersion: 1, mode: 'selection-only', activationAllowed: false, deployed: false,
      environment: 'test', releaseId: contract.releaseId, sourceCommit: contract.sourceCommit,
      runId: contract.runId, runAttempt: contract.runAttempt, artifactId: expectedArtifactId, deliverySha256: expected.digest };
  } catch { fail('rollback evidence'); }
}

async function main() {
  if (process.argv.length === 3 && process.argv[2] === '--rollback') {
    const result = await prepareRollback({ root: process.env.ROLLBACK_ARTIFACT_ROOT,
      digest: process.env.ROLLBACK_DELIVERY_SHA256, environment: 'test', releaseId: process.env.ROLLBACK_RELEASE_ID,
      sourceCommit: process.env.ROLLBACK_SOURCE_SHA, runId: process.env.ROLLBACK_SOURCE_RUN_ID,
      runAttempt: process.env.ROLLBACK_SOURCE_ATTEMPT, expectedArtifactId: process.env.ROLLBACK_ARTIFACT_ID,
      sourceRun: JSON.parse(await readFile(process.env.ROLLBACK_RUN_METADATA_PATH, 'utf8')),
      artifact: JSON.parse(await readFile(process.env.ROLLBACK_ARTIFACT_METADATA_PATH, 'utf8')) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (process.argv.length !== 2) fail('no CLI arguments are accepted');
  const flag = process.env.THN_ADMIN_ARTIFACT_ENABLED ?? 'false';
  if (!['true', 'false'].includes(flag)) fail('admin flag');
  const adminEnabled = flag === 'true';
  const root = path.resolve('dist/ssr-lambda');
  const routeManifest = JSON.parse(await readFile(new URL('./ops/thn-content-hub-v2-route-manifest.json', import.meta.url), 'utf8'));
  // Workstream B supplies this explicit closed inventory. Never guess admin access from all browser files.
  const adminRelease = adminEnabled ? JSON.parse(await readFile('dist/zoolandingpage/thn-admin-release.json', 'utf8')) : undefined;
  const result = await prepareDelivery({ root, routeManifest, adminEnabled, adminRelease,
    environment: process.env.DEPLOY_ENV, releaseId: process.env.RELEASE_ID, sourceCommit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `delivery_sha256=${result.digest}\n`);
  console.log(JSON.stringify({ ok: true, deliverySha256: result.digest, adminEnabled, deployed: false }));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error('SSR delivery preparation failed.'); process.exitCode = 1; });
}
