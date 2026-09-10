import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { link, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const toolUrl = new URL('../prepare-legacy-ssr-recovery.mjs', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const source = 'a'.repeat(40);
async function tool() {
  assert.equal(existsSync(toolUrl), true, 'legacy recovery bridge must exist');
  return import(toolUrl.href);
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'thn-legacy-recovery-'));
  const server = Buffer.from('exact legacy server bytes');
  const manifest = Buffer.from(JSON.stringify({schemaVersion:1,app:'zoolandingpage',environment:'test',releaseId:source,sourceCommit:source,
    browserPrefix:`frontend/angular-ssr/test/releases/${source}/browser`,serverBundleKey:`frontend/angular-ssr/test/releases/${source}/server/ssr-handler.zip`,checksums:{'server/ssr-handler.zip':hash(server)}}));
  const contents = {'manifest.json':manifest,'server/ssr-handler.zip':server,'browser/index.html':Buffer.from('<html lang="en"></html>'),'browser/main.abc123.js':Buffer.from('/* public fixture */')};
  const objects = [];
  for (const [name,bytes] of Object.entries(contents).sort(([a],[b])=>a.localeCompare(b))) {
    await mkdir(path.dirname(path.join(root,'payload',name)),{recursive:true});
    await writeFile(path.join(root,'payload',name),bytes);
    objects.push({path:name,bytes:bytes.length,sha256:hash(bytes),etagSha256:hash(`etag:${name}`),contentType:'application/octet-stream',cacheControl:'max-age=60',contentEncoding:''});
  }
  objects.sort((a,b)=>a.path<b.path?-1:1);
  const inventorySha256 = hash(JSON.stringify(objects.map(({path,bytes,etagSha256})=>({path,bytes,etagSha256}))));
  const observation = {releaseId:source,sourceCommit:source,manifestSha256:hash(manifest),serverSha256:hash(server),inventorySha256};
  const baseline = {schemaVersion:1,environment:'test',releaseId:source,sourceCommit:source,sourceRunId:'123',sourceRunAttempt:'1',manifestSha256:hash(manifest),serverSha256:hash(server)};
  const capture = {schemaVersion:1,mode:'read-only',capturedAt:'2026-09-07T18:00:00Z',
    sourceRun:{repository:'LynxPardelle/zoolandingpage',id:'123',attempt:'1',path:'.github/workflows/publish-ssr-artifact.yml',headSha:source,headBranch:'test',event:'push',status:'completed',conclusion:'success'},
    before:observation,after:{...observation},objects};
  return {root,baseline,capture,contents};
}

test('preserves exact legacy bytes and creates a distinct non-deployable recovery receipt', async()=>{
  const api=await tool(), f=await fixture();
  const {digest}=await api.prepareLegacyRecovery(f);
  const result=await api.verifyLegacyRecovery({root:f.root,baseline:f.baseline,digest});
  assert.equal(result.mode,'selection-only');
  assert.equal(result.activationAllowed,false);
  assert.equal(result.sourceClass,'deployed-legacy-snapshot');
  assert.equal(result.ciArtifactId,null);
  assert.equal(result.releaseId,source);
  assert.equal(existsSync(path.join(f.root,'delivery.json')),false);
  const modern=await import('../prepare-ssr-delivery.mjs');
  await assert.rejects(()=>modern.verifyDelivery({root:f.root,digest,environment:'test',releaseId:source,sourceCommit:source,runId:'123',runAttempt:'1'}));
  for(const [name,bytes] of Object.entries(f.contents)) assert.deepEqual(await readFile(path.join(f.root,'payload',name)),bytes);
  await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i);
});

test('rejects the wrong baseline, unsuccessful source run and changes during capture',async()=>{
  const api=await tool();
  for(const kind of ['production','source','manifest','server','run','branch','workflow','repository','failed','drift','inventory','extra-proof']) {
    const f=await fixture();
    if(kind==='production') f.baseline.environment='production';
    if(kind==='source') f.baseline.sourceCommit='b'.repeat(40);
    if(kind==='manifest') f.baseline.manifestSha256='b'.repeat(64);
    if(kind==='server') f.baseline.serverSha256='b'.repeat(64);
    if(kind==='run') f.capture.sourceRun.id='456';
    if(kind==='branch') f.capture.sourceRun.headBranch='main';
    if(kind==='workflow') f.capture.sourceRun.path='.github/workflows/validate-thn-candidate.yml';
    if(kind==='repository') f.capture.sourceRun.repository='someone/else';
    if(kind==='failed') f.capture.sourceRun.conclusion='failure';
    if(kind==='drift') f.capture.after.serverSha256='b'.repeat(64);
    if(kind==='inventory') f.capture.before.inventorySha256=f.capture.after.inventorySha256='b'.repeat(64);
    if(kind==='extra-proof') f.capture.rawSession='must not be accepted';
    await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i,kind);
    assert.equal(existsSync(path.join(f.root,'legacy-recovery.json')),false);
  }
});

test('rejects tampering, omitted or extra files, foreign paths and malformed headers',async()=>{
  const api=await tool();
  for(const kind of ['tamper','omit','extra','escape','private','header','duplicate','bytes']) {
    const f=await fixture();
    if(kind==='tamper') await writeFile(path.join(f.root,'payload/browser/index.html'),'changed');
    if(kind==='omit') f.capture.objects.pop();
    if(kind==='extra') await writeFile(path.join(f.root,'payload/browser/extra.js'),'extra');
    if(kind==='escape') f.capture.objects[0].path='../outside';
    if(kind==='private') {await mkdir(path.join(f.root,'payload/browser/server'));await writeFile(path.join(f.root,'payload/browser/server/private.json'),'{}');}
    if(kind==='header') f.capture.objects[0].contentType='text/html\r\nInjected: value';
    if(kind==='duplicate') f.capture.objects.push({...f.capture.objects[0]});
    if(kind==='bytes') f.capture.objects[0].bytes=-1;
    await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i,kind);
  }
});

test('rejects a root junction, a changed receipt and a wrong external digest',async()=>{
  const api=await tool(),f=await fixture();
  const parent=await mkdtemp(path.join(os.tmpdir(),'thn-legacy-link-')),link=path.join(parent,'linked');
  await symlink(f.root,link,process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>api.prepareLegacyRecovery({...f,root:link}),/legacy recovery/i);
  const {digest}=await api.prepareLegacyRecovery(f);
  await assert.rejects(()=>api.verifyLegacyRecovery({root:f.root,baseline:f.baseline,digest:'0'.repeat(64)}),/legacy recovery/i);
  const file=path.join(f.root,'legacy-recovery.json');
  const receipt=JSON.parse(await readFile(file,'utf8'));
  receipt.activationAllowed=true;
  await writeFile(file,JSON.stringify(receipt));
  const changedDigest=hash(await readFile(file));
  await assert.rejects(()=>api.verifyLegacyRecovery({root:f.root,baseline:f.baseline,digest:changedDigest}),/legacy recovery/i);
  assert.ok(digest);
});

test('the CLI rejects unrecognized modes and cannot accept an arbitrary baseline',async()=>{
  await tool();
  for(const args of [[],['--deploy'],['--verify','--baseline=other.json']]) {
    const result=spawnSync(process.execPath,[toolUrl.pathname.replace(/^\/(.:)/,'$1'),...args],{encoding:'utf8',windowsHide:true});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/legacy recovery/i);
  }
});

test('keeps the known legacy debug workspace in local recovery without permitting publication', async()=>{
  const api=await tool(),f=await fixture();
  const name='browser/drafts/_debug/debug-workspace/config.json', bytes=Buffer.from('{"schemaVersion":1}');
  await mkdir(path.dirname(path.join(f.root,'payload',name)),{recursive:true});
  await writeFile(path.join(f.root,'payload',name),bytes);
  f.capture.objects.push({path:name,bytes:bytes.length,sha256:hash(bytes),etagSha256:hash('debug-etag'),contentType:'application/json',cacheControl:'',contentEncoding:''});
  f.capture.objects.sort((a,b)=>a.path<b.path?-1:1);
  const inventory=hash(JSON.stringify(f.capture.objects.map(({path,bytes,etagSha256})=>({path,bytes,etagSha256}))));
  f.capture.before.inventorySha256=f.capture.after.inventorySha256=inventory;
  const {digest}=await api.prepareLegacyRecovery(f);
  const selection=await api.verifyLegacyRecovery({root:f.root,baseline:f.baseline,digest});
  assert.equal(selection.activationAllowed,false);
  assert.deepEqual(await readFile(path.join(f.root,'payload',name)),bytes);
});

test('rejects invalid calendar dates even when a JavaScript date parser normalizes them', async()=>{
  const api=await tool(),f=await fixture();
  f.capture.capturedAt='2026-02-30T18:00:00Z';
  await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i);
});

test('rejects hard links, nested junctions and extra root files', async()=>{
  const api=await tool();
  for (const kind of ['hard-link','nested-junction','extra-root']) {
    const f=await fixture();
    if(kind==='hard-link') await link(path.join(f.root,'payload/browser/index.html'),path.join(f.root,'payload/browser/linked.html'));
    if(kind==='nested-junction') await symlink(path.join(f.root,'payload/browser'),path.join(f.root,'payload/browser/linked'),process.platform==='win32'?'junction':'dir');
    if(kind==='extra-root') await writeFile(path.join(f.root,'foreign.json'),'{}');
    await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i,kind);
  }
});

test('rejects unknown nested proof fields and activation/source substitutions', async()=>{
  const api=await tool();
  for (const kind of ['run-field','observation-field','object-field','number-type','header-control','long-header','empty-objects','source-event','attempt']) {
    const f=await fixture();
    if(kind==='run-field') f.capture.sourceRun.secret='not accepted';
    if(kind==='observation-field') f.capture.after.status='accepted';
    if(kind==='object-field') f.capture.objects[0].signedUrl='not accepted';
    if(kind==='number-type') f.capture.objects[0].bytes=String(f.capture.objects[0].bytes);
    if(kind==='header-control') f.capture.objects[0].cacheControl='no-cache\u0000';
    if(kind==='long-header') f.capture.objects[0].cacheControl='a'.repeat(1025);
    if(kind==='empty-objects') f.capture.objects=[];
    if(kind==='source-event') f.capture.sourceRun.event='pull_request';
    if(kind==='attempt') f.capture.sourceRun.attempt='2';
    await assert.rejects(()=>api.prepareLegacyRecovery(f),/legacy recovery/i,kind);
  }
});
