import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const producer = new URL('../prepare-thn-admin-artifact.mjs', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
async function api() {
  assert.ok(existsSync(producer), 'the private artifact dependency-closure producer must exist');
  return import(producer.href);
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thn-admin-artifact-'));
  const browserRoot = path.join(root, 'browser'), serverRoot = path.join(root, 'server');
  const files = {
    'index.csr.html': '<base href="/"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="css/angora-styles.css"><script type="module" src="main-4LAYAEZF.js"></script>',
    'main-4LAYAEZF.js': 'import "./chunk-2ZPUOXRY.js"; import("./chunk-4RCU3HW5.js");',
    'chunk-2ZPUOXRY.js': 'export const editor = "fixed-article-v2 publicationAvailable";',
    'chunk-4RCU3HW5.js': 'export const lazy = true;',
    'css/angora-styles.css': '@import "./nested.css"; .icon{background:url(../icons/a.svg)}',
    'css/nested.css': '@font-face{font-family:body;src:url("../fonts/body.woff2")} .inline{background:url(data:image/gif;base64,AAAA)}',
    'fonts/body.woff2': 'synthetic-font', 'icons/a.svg': '<svg/>', 'favicon.svg': '<svg id="favicon"/>',
    'unused-DEADBEEF.js': 'export const unrelated = true;',
    'drafts/other.test/site-config.json': '{}',
  };
  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(browserRoot, name)), { recursive: true });
    await writeFile(path.join(browserRoot, name), text);
  }
  await mkdir(serverRoot);
  const routeManifest = JSON.parse(await readFile(new URL('../ops/thn-content-hub-v2-route-manifest.json', import.meta.url), 'utf8'));
  return { root, files, options: { browserRoot, serverRoot, siteConfig: { domain: 'thehairnarrative.com', site: { fonts: [{src:'/fonts/body.woff2'}] } },
    routeManifest, releaseId: 'a'.repeat(40), environment: 'test', enabled: true } };
}

test('private producer follows exact entry/import/CSS/font closure and leaves every public original unchanged', async () => {
  const { prepareThnAdminArtifact } = await api();
  const { options, files } = await fixture();
  const result = await prepareThnAdminArtifact(options);
  assert.deepEqual(Object.keys(result.release).sort(), ['environment', 'releaseId', 'staticAssetPaths', 'version']);
  assert.equal(result.release.environment, 'test');
  assert.equal(result.release.releaseId, options.releaseId);
  assert.ok(result.release.staticAssetPaths.includes('/browser/main-4LAYAEZF.js'));
  assert.ok(result.release.staticAssetPaths.includes('/browser/chunk-4RCU3HW5.js'));
  assert.ok(result.release.staticAssetPaths.every(file => !/unused|drafts|json|index/.test(file)));
  assert.equal(result.release.staticAssetPaths.length, 8);
  const bound = result.bindingPackage.binding;
  assert.equal(bound.origin, 'https://admin-test.thehairnarrative.com');
  assert.equal(bound.pageRoutes.length, 6);
  assert.deepEqual(bound.staticPaths, result.release.staticAssetPaths);
  assert.match(bound.assetUrls['/css/angora-styles.css'], /[a-f0-9]{16}\.angora-styles\.css$/);
  const copiedCss = await readFile(path.join(options.browserRoot, bound.assetUrls['/css/angora-styles.css'].slice('/browser/'.length)), 'utf8');
  assert.ok(copiedCss.includes(bound.assetUrls['/css/nested.css']));
  assert.ok(copiedCss.includes(bound.assetUrls['/icons/a.svg']));
  for (const [name, original] of Object.entries(files)) assert.equal(await readFile(path.join(options.browserRoot, name), 'utf8'), original, name);
  for (const file of result.release.staticAssetPaths) assert.equal(result.bindingPackage.assetHashes[file], hash(await readFile(path.join(options.browserRoot, file.slice('/browser/'.length)))));
  assert.ok(existsSync(path.join(options.serverRoot, 'thn-protected-origin-binding.json')));
  assert.equal((await readdir(options.browserRoot)).some(name => name.includes('binding')), false);
});

test('private producer is default-off, rejects production and never overwrites an existing private artifact', async () => {
  const { prepareThnAdminArtifact } = await api();
  const { options } = await fixture();
  assert.deepEqual(await prepareThnAdminArtifact({ ...options, enabled: false }), { enabled: false });
  assert.equal(existsSync(path.join(options.serverRoot, 'thn-protected-origin-binding.json')), false);
  await assert.rejects(() => prepareThnAdminArtifact({ ...options, environment: 'production' }), /TEST/);
  await prepareThnAdminArtifact(options);
  await assert.rejects(() => prepareThnAdminArtifact(options), /exist|stale/i);
});

test('private producer rejects unbounded imports, path escapes, remote resources, private files and linked ancestors', async () => {
  const { prepareThnAdminArtifact } = await api();
  for (const source of ['import("../../escape.js")', 'import("https://other.test/code.js")', 'import(variable)', 'import("./server/private.js")']) {
    const { options } = await fixture();
    await writeFile(path.join(options.browserRoot, 'main-4LAYAEZF.js'), source);
    await assert.rejects(() => prepareThnAdminArtifact(options), /private artifact/i);
  }
  for (const source of ['@import "https://other.test/font.css";', 'a{background:url(../../escape.svg)}', '@import "%2e%2e/private.css";', '@import "../server/private.css";']) {
    const { options } = await fixture();
    await writeFile(path.join(options.browserRoot, 'css/angora-styles.css'), source);
    await assert.rejects(() => prepareThnAdminArtifact(options), /private artifact/i);
  }
  const { options, root } = await fixture();
  const alias = path.join(root, 'linked');
  await symlink(options.browserRoot, alias, 'junction');
  await assert.rejects(() => prepareThnAdminArtifact({ ...options, browserRoot: alias }), /private artifact/i);
});

test('private producer rejects route/domain drift and metadata cannot select another release', async () => {
  const { prepareThnAdminArtifact } = await api();
  const { options } = await fixture();
  await assert.rejects(() => prepareThnAdminArtifact({ ...options, releaseId: '../other' }), /private artifact/i);
  await assert.rejects(() => prepareThnAdminArtifact({ ...options, siteConfig: { domain: 'other.test' } }), /private artifact/i);
  const routes = structuredClone(options.routeManifest); routes.origins.admin.pageRoutes[0].path = '/';
  await assert.rejects(() => prepareThnAdminArtifact({ ...options, routeManifest: routes }), /inventory|route/i);
});

test('the release build invokes the private producer before packaging and CI verifies its contracts', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts['package:ssr:lambda'].includes('node tools/prepare-thn-admin-artifact.mjs && node tools/package-ssr-lambda.mjs'));
  for (const name of ['angular-validate.yml', 'publish-ssr-artifact.yml']) {
    assert.ok((await readFile(new URL('../../.github/workflows/'+name, import.meta.url), 'utf8')).includes('tools/tests/thn-admin-artifact.spec.mjs'));
  }
  const workflow=await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml',import.meta.url),'utf8');
  const validate=workflow.split('  publish:')[0];
  assert.doesNotMatch(validate,/^    environment:/m);
  assert.match(workflow,/      thn_admin_artifact:\r?\n[\s\S]*?        type: boolean\r?\n        default: false/);
  assert.match(validate,/THN_ADMIN_ARTIFACT_ENABLED: \$\{\{ github.event_name == 'workflow_dispatch' && inputs.thn_admin_artifact && 'true' \|\| 'false' \}\}/);
  const packager=await readFile(new URL('../package-ssr-lambda.mjs',import.meta.url),'utf8');
  assert.ok(packager.indexOf('await verifyThnAdminArtifact(')>0);
  assert.ok(packager.indexOf('await verifyThnAdminArtifact(')<packager.indexOf('await rm(outputRoot'));
});

test('packaging rejects disabled leftovers, cross-release inventories and private map/byte drift',async()=>{
 const {prepareThnAdminArtifact,verifyThnAdminArtifact}=await api();
 assert.equal(typeof verifyThnAdminArtifact,'function');
 for(const mutation of ['disabled','release','manifest','binding','bytes']) {
  const {options}=await fixture();
  const generated=await prepareThnAdminArtifact(options);
  await verifyThnAdminArtifact(options);
  const selected={...options};
  if(mutation==='disabled')selected.enabled=false;
  if(mutation==='release')selected.releaseId='other-release';
  if(mutation==='manifest')await writeFile(path.join(path.dirname(options.browserRoot),'thn-admin-release.json'),JSON.stringify({...generated.release,privateBinding:true}));
  if(mutation==='binding')await writeFile(path.join(options.serverRoot,'thn-protected-origin-binding.json'),JSON.stringify({...generated.bindingPackage,releaseId:'other-release'}));
  if(mutation==='bytes')await writeFile(path.join(options.browserRoot,'main-4LAYAEZF.js'),'changed');
  await assert.rejects(()=>verifyThnAdminArtifact(selected),/private artifact/i);
 }
 const {options}=await fixture();
 assert.deepEqual(await verifyThnAdminArtifact({...options,enabled:false}),{enabled:false});
 await assert.rejects(()=>verifyThnAdminArtifact(options),/private artifact/i);
});

test('private producer CLI works in a clean checkout without any ignored draft and rejects font manifest drift',async()=>{
 const {options,root}=await fixture();
 const repoRoot=fileURLToPath(new URL('../..',import.meta.url));
 const clean=path.join(root,'clean-checkout');
 await cp(options.browserRoot,path.join(clean,'dist/zoolandingpage/browser'),{recursive:true});
 await mkdir(path.join(clean,'dist/zoolandingpage/server'),{recursive:true});
 const relative='public/assets/thehairnarrative.com/booksaw-20260827/asset-manifest.txt';
 const assetManifest=JSON.parse(await readFile(path.join(repoRoot,relative),'utf8'));
 await mkdir(path.dirname(path.join(clean,relative)),{recursive:true});
 await writeFile(path.join(clean,relative),JSON.stringify(assetManifest));
 for(const font of assetManifest.assets.filter(a=>a.contentType==='font/woff2')){
  const dest=path.join(clean,'dist/zoolandingpage/browser',font.publicPath.slice(1));
  await mkdir(path.dirname(dest),{recursive:true});await cp(path.join(repoRoot,'public',font.publicPath.slice(1)),dest);
 }
 assert.equal(existsSync(path.join(clean,'drafts/thehairnarrative.com/site-config.json')),false);
 const run=()=>spawnSync(process.execPath,[fileURLToPath(producer)],{cwd:clean,encoding:'utf8',windowsHide:true,
  env:{...process.env,THN_ADMIN_ARTIFACT_ENABLED:'true',DEPLOY_ENV:'test',RELEASE_ID:'clean-checkout-fixture'}});
 const result=run();assert.equal(result.status,0,result.stderr);
 const {thnFontSiteConfig}=await api();assert.equal(typeof thnFontSiteConfig,'function');
 const projected=await thnFontSiteConfig(assetManifest,path.join(clean,'dist/zoolandingpage/browser'));
 const localDraft=path.join(repoRoot,'drafts/thehairnarrative.com/site-config.json');
 if(existsSync(localDraft))assert.deepEqual(projected.site.fonts.map(f=>f.src).sort(),JSON.parse(await readFile(localDraft,'utf8')).site.fonts.map(f=>f.src).sort());
 for(const mutate of [m=>m.domain='other.test',m=>m.unreviewed=true,m=>m.assets.push({...m.assets.find(a=>a.contentType==='font/woff2'),file:'fonts/other.woff2'}),
  m=>m.assets.find(a=>a.contentType==='font/woff2').sha256='0'.repeat(64)]){
  const candidate=structuredClone(assetManifest);mutate(candidate);
  await assert.rejects(()=>thnFontSiteConfig(candidate,path.join(clean,'dist/zoolandingpage/browser')),/private artifact/i);
 }
});
