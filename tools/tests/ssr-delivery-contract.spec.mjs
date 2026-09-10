import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const toolPath = new URL('../prepare-ssr-delivery.mjs', import.meta.url);
const routePath = new URL('../ops/thn-content-hub-v2-route-manifest.json', import.meta.url);
const sha = 'a'.repeat(40);
const coords = { environment: 'test', releaseId: sha, sourceCommit: sha, runId: '123', runAttempt: '1' };
const hash = value => createHash('sha256').update(value).digest('hex');

async function tool() {
  assert.equal(existsSync(toolPath), true, 'the SSR delivery verifier must exist');
  return import(toolPath.href);
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thn-delivery-'));
  await mkdir(path.join(root, 'staging/browser'), { recursive: true });
  await writeFile(path.join(root, 'staging/browser/main.abcdef12.js'), 'export const value = 1;');
  await writeFile(path.join(root, 'staging/browser/index.html'), '<app-root></app-root>');
  await writeFile(path.join(root, 'ssr-handler.zip'), 'synthetic-zip');
  const prefix = `frontend/angular-ssr/test/releases/${sha}`;
  const manifest = { schemaVersion: 1, app: 'zoolandingpage', environment: 'test', releaseId: sha,
    sourceCommit: sha, browserPrefix: `${prefix}/browser`, serverBundleKey: `${prefix}/server/ssr-handler.zip`,
    checksums: { 'server/ssr-handler.zip': hash('synthetic-zip') } };
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return { root, manifest, routes: JSON.parse(await readFile(routePath, 'utf8')) };
}

test('delivery binds every browser file and the server to full source/run coordinates', async () => {
  const api = await tool();
  const { root, routes } = await fixture();
  const result = await api.prepareDelivery({ root, ...coords, routeManifest: routes });
  assert.equal(result.contract.sourceCommit, sha);
  assert.equal(result.contract.runId, '123');
  assert.equal(result.contract.deployed, false);
  assert.deepEqual(result.contract.thnAdmin, { enabled: false });
  assert.deepEqual(result.contract.files.map(file => file.path), [
    'manifest.json', 'ssr-handler.zip', 'staging/browser/index.html', 'staging/browser/main.abcdef12.js',
  ]);
  assert.equal(result.digest, hash(await readFile(path.join(root, 'delivery.json'))));
  await api.verifyDelivery({ root, digest: result.digest, ...coords });
});

for (const mutation of ['tampered-browser', 'extra-file', 'extra-root', 'missing-file', 'wrong-source', 'wrong-run', 'wrong-digest']) {
  test(`delivery rejects ${mutation}`, async () => {
    const api = await tool();
    const { root, routes } = await fixture();
    const { digest } = await api.prepareDelivery({ root, ...coords, routeManifest: routes });
    const expected = { root, digest, ...coords };
    if (mutation === 'tampered-browser') await writeFile(path.join(root, 'staging/browser/main.abcdef12.js'), 'altered');
    if (mutation === 'extra-file') await writeFile(path.join(root, 'staging/browser/private.json'), '{}');
    if (mutation === 'extra-root') await writeFile(path.join(root, 'unexpected.sh'), 'exit 0');
    if (mutation === 'missing-file') {
      const { unlink } = await import('node:fs/promises');
      await unlink(path.join(root, 'staging/browser/main.abcdef12.js'));
    }
    if (mutation === 'wrong-source') expected.sourceCommit = 'b'.repeat(40);
    if (mutation === 'wrong-run') expected.runId = '124';
    if (mutation === 'wrong-digest') expected.digest = '0'.repeat(64);
    await assert.rejects(() => api.verifyDelivery(expected), /delivery/i);
  });
}

test('admin is opt-in, TEST only, with exact routes and an explicit existing asset inventory', async () => {
  const api = await tool();
  const { root, routes } = await fixture();
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true }), /admin/i);
  const adminRelease = { version: 1, environment: 'test', releaseId: sha, staticAssetPaths: ['/browser/main.abcdef12.js'] };
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, environment: 'production', routeManifest: routes, adminEnabled: true, adminRelease }), /admin/i);
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true, adminRelease: { ...adminRelease, releaseId: 'b'.repeat(40) } }), /admin/i);
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true, adminRelease: { ...adminRelease, staticAssetPaths: ['/browser/missing.abcdef12.js'] } }), /admin/i);
  const badRoutes = structuredClone(routes);
  badRoutes.origins.admin.host = 'other.example.com';
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: badRoutes }), /origin|inventory/i);
  const result = await api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true, adminRelease });
  assert.equal(result.contract.thnAdmin.enabled, true);
  assert.equal(result.contract.thnAdmin.origin, 'https://admin-test.thehairnarrative.com');
  assert.equal(result.contract.files.some(file => file.path === 'thn-admin-release.json'), true);
  assert.equal(result.contract.files.some(file => file.path === 'thn-route-manifest.json'), true);
  await api.verifyDelivery({ root, digest: result.digest, ...coords });
});

test('packaging rejects a linked staging ancestor', async () => {
  const api = await tool();
  const { root, routes } = await fixture();
  const linked = await mkdtemp(path.join(os.tmpdir(), 'thn-delivery-link-'));
  for (const name of ['manifest.json', 'ssr-handler.zip']) await writeFile(path.join(linked, name), await readFile(path.join(root, name)));
  await symlink(path.join(root, 'staging'), path.join(linked, 'staging'), 'junction');
  await assert.rejects(() => api.prepareDelivery({ root: linked, ...coords, routeManifest: routes }), /delivery/i);
});

test('the actual credential-job verifier accepts sealed files and denies extra files', async () => {
  const api = await tool();
  const workflow = await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml', import.meta.url), 'utf8');
  const script = workflow.match(/python3 - <<'PY'\r?\n([\s\S]*?)\r?\n          PY/)[1].replace(/^          /gm, '');
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'thn-inline-verifier-'));
  const { root, routes } = await fixture();
  const { digest } = await api.prepareDelivery({ root, ...coords, routeManifest: routes });
  const { cp } = await import('node:fs/promises');
  await cp(root, path.join(workspace, 'dist/ssr-lambda'), { recursive: true });
  const run = () => spawnSync('python', ['-c', script], { cwd: workspace, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, EXPECTED_DELIVERY_SHA256: digest, DEPLOY_ENV: 'test', RELEASE_ID: sha, GITHUB_SHA: sha,
      GITHUB_RUN_ID: '123', EXPECTED_SOURCE_ATTEMPT: '1',EXPECTED_THN_ADMIN_ENABLED:'false' } });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  await writeFile(path.join(workspace, 'dist/ssr-lambda/extra.json'), '{}');
  result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SSR delivery verification failed/);
});

test('the actual credential-job verifier accepts only sealed Angular base32 admin assets', async () => {
  const api = await tool();
  const workflow = await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml', import.meta.url), 'utf8');
  const script = workflow.match(/python3 - <<'PY'\r?\n([\s\S]*?)\r?\n          PY/)[1].replace(/^          /gm, '');
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'thn-inline-admin-verifier-'));
  const { root, routes } = await fixture();
  await writeFile(path.join(root, 'staging/browser/main-4LAYAEZF.js'), 'export const editor = "fixed-article-v2";');
  const adminRelease = { version: 1, environment: 'test', releaseId: sha, staticAssetPaths: ['/browser/main-4LAYAEZF.js'] };
  const { digest } = await api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true, adminRelease });
  await api.verifyDelivery({ root, digest, ...coords });
  const { cp } = await import('node:fs/promises');
  await cp(root, path.join(workspace, 'dist/ssr-lambda'), { recursive: true });
  const run = (extra={}) => spawnSync('python', ['-c', script], { cwd: workspace, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, EXPECTED_DELIVERY_SHA256: digest, DEPLOY_ENV: 'test', RELEASE_ID: sha, GITHUB_SHA: sha,
      GITHUB_RUN_ID: '123', EXPECTED_SOURCE_ATTEMPT: '1', EXPECTED_THN_ADMIN_ENABLED:'true',THN_ADMIN_ARTIFACT_ALLOWED:'true',...extra } });
  assert.equal(run().status, 0);
  for(const extra of [{EXPECTED_THN_ADMIN_ENABLED:'false'},{THN_ADMIN_ARTIFACT_ALLOWED:'false'},
    {THN_ADMIN_ARTIFACT_ALLOWED:''},{DEPLOY_ENV:'production'}])assert.notEqual(run(extra).status,0,JSON.stringify(extra));
  await writeFile(path.join(workspace, 'dist/ssr-lambda/staging/browser/main-4LAYAEZF.js'), 'tampered');
  assert.notEqual(run().status, 0);
});

test('packaging refuses private, encoded, linked, and executable admin-document paths', async () => {
  const api = await tool();
  for (const name of ['server/binding.json', '.env', 'drafts/example.com/server/binding.json', '%73erver/x.json',
    'thn-protected-origin-binding.json','assets/thn-protected-origin-binding.json',
    'drafts/_unexpected/components.json','drafts/other.test/_debug/keep.json']) {
    const { root, routes } = await fixture();
    const file = path.join(root, 'staging/browser', name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, '{}');
    await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: routes }), /delivery/i);
  }
  const { root, routes } = await fixture();
  await writeFile(path.join(root, 'staging/browser/private.abcdef12.json'), '{}');
  await assert.rejects(() => api.prepareDelivery({ root, ...coords, routeManifest: routes, adminEnabled: true,
    adminRelease: { version: 1, environment: 'test', releaseId: sha, staticAssetPaths: ['/browser/private.abcdef12.json'] } }), /admin/i);
});

test('SSR workflow binds artifact ID and external digest before OIDC and publishes without overwriting', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml', import.meta.url), 'utf8');
  assert.match(workflow, /artifact-ids: \$\{\{ needs.validate.outputs.artifact_id \}\}/);
  assert.match(workflow, /EXPECTED_DELIVERY_SHA256:/);
  assert.match(workflow, /prepare-ssr-delivery\.mjs/);
  assert.match(workflow, /verify-promotion-commit\.mjs/);
  assert.match(workflow, /--if-none-match '\*'/);
  assert.doesNotMatch(workflow, /aws s3 cp/);
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /THN_ADMIN_ARTIFACT_ENABLED:.*'false'/);
  assert.ok(workflow.indexOf("selected = os.environ['EXPECTED_THN_ADMIN_ENABLED']")<workflow.indexOf('- uses: aws-actions/configure-aws-credentials'));
  assert.match(workflow,/THN_ADMIN_ARTIFACT_ALLOWED: \$\{\{ vars.THN_ADMIN_ARTIFACT_ENABLED \|\| 'false' \}\}/);
  const validation = await readFile(new URL('../../.github/workflows/angular-validate.yml', import.meta.url), 'utf8');
  assert.equal(validation.includes('tools/tests/ssr-delivery-contract.spec.mjs'), true, 'PR validation must run delivery contracts');
});

test('normal push/default-off TEST and production deliveries retain the baseline without any THN variable',async()=>{
 const api=await tool();
 const workflow=await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml',import.meta.url),'utf8');
 const script=workflow.match(/python3 - <<'PY'\r?\n([\s\S]*?)\r?\n          PY/)[1].replace(/^          /gm,'');
 for(const environment of ['test','production']) {
  const {root,routes,manifest}=await fixture();
  const prefix=`frontend/angular-ssr/${environment}/releases/${sha}`;
  await writeFile(path.join(root,'manifest.json'),JSON.stringify({...manifest,environment,browserPrefix:`${prefix}/browser`,serverBundleKey:`${prefix}/server/ssr-handler.zip`}));
  const {digest}=await api.prepareDelivery({root,...coords,environment,routeManifest:routes});
  const workspace=await mkdtemp(path.join(os.tmpdir(),'thn-baseline-push-'));
  const {cp}=await import('node:fs/promises');await cp(root,path.join(workspace,'dist/ssr-lambda'),{recursive:true});
  const env={...process.env,EXPECTED_DELIVERY_SHA256:digest,DEPLOY_ENV:environment,RELEASE_ID:sha,GITHUB_SHA:sha,
   GITHUB_RUN_ID:'123',EXPECTED_SOURCE_ATTEMPT:'1',EXPECTED_THN_ADMIN_ENABLED:'false'};
  delete env.THN_ADMIN_ARTIFACT_ALLOWED;
  const run=()=>spawnSync('python',['-c',script],{cwd:workspace,env,encoding:'utf8',windowsHide:true});
  assert.equal(run().status,0,environment);
  env.THN_ADMIN_ARTIFACT_ALLOWED='true';
  assert.equal(run().status===0,environment==='production',environment+' no downgrade');
  delete env.THN_ADMIN_ARTIFACT_ALLOWED;
  env.EXPECTED_THN_ADMIN_ENABLED='true';assert.notEqual(run().status,0,environment+' mismatch');
 }
});

test('SSR rollback requires a successful source run and one matching immutable artifact', async () => {
  const api = await tool();
  assert.equal(typeof api.prepareRollback, 'function', 'SSR rollback evidence verifier must exist');
  const { root, routes } = await fixture();
  const { digest } = await api.prepareDelivery({ root, ...coords, routeManifest: routes });
  const input = { root, digest, ...coords, expectedArtifactId: '456',
    sourceRun: { id: 123, run_attempt: 1, head_sha: sha, head_branch: 'test', path: '.github/workflows/publish-ssr-artifact.yml',
      repository: { full_name: 'LynxPardelle/zoolandingpage' }, status: 'completed', conclusion: 'success', event: 'push' },
    artifact: { id: 456, expired: false, name: `ssr-test-123-1-${sha}`, workflow_run: { id: 123, head_sha: sha, head_branch: 'test' } } };
  const result = await api.prepareRollback(input);
  assert.equal(result.releaseId, sha);
  assert.equal(result.activationAllowed, false);
  for (const mutation of ['failed', 'wrong-repo', 'wrong-sha', 'wrong-branch', 'wrong-artifact', 'expired', 'wrong-attempt']) {
    const changed = structuredClone(input);
    if (mutation === 'failed') changed.sourceRun.conclusion = 'failure';
    if (mutation === 'wrong-repo') changed.sourceRun.repository.full_name = 'other/repo';
    if (mutation === 'wrong-sha') changed.sourceRun.head_sha = 'b'.repeat(40);
    if (mutation === 'wrong-branch') changed.sourceRun.head_branch = 'dev';
    if (mutation === 'wrong-artifact') changed.expectedArtifactId = '789';
    if (mutation === 'expired') changed.artifact.expired = true;
    if (mutation === 'wrong-attempt') changed.sourceRun.run_attempt = 2;
    await assert.rejects(() => api.prepareRollback(changed), /rollback/i);
  }
});
