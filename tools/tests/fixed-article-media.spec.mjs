import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const path = new URL('../../src/app/shared/utility/content-hub/fixed-article-media.ts', import.meta.url);
let media;
try {
  const source = await readFile(path, 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  media = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
} catch (error) { if (error.code !== 'ENOENT') throw error; }

function harness() {
  assert.ok(media, 'Private media workflow must be implemented');
  let snapshot = {articleId:'article-1',locale:'en',concurrencyToken:'token-1',package:{cover:null,delta:{ops:[{insert:'My letter\n'}]}}};
  const calls = [], changes = [];
  const editor = { snapshot:()=>structuredClone(snapshot), canLeave:async()=>true, change:patch=>{changes.push(patch);snapshot.package={...snapshot.package,...patch};},flush:async()=>{} };
  const client = {action:async(operation,data)=>{calls.push([operation,data]);return{asset:{assetId:'media-1',status:'ready',alt:'Hair',width:320,height:200}};},
    read:async()=>({items:[{assetId:'media-1',status:'ready',contentType:'image/png',imageBase64:'iVBORw0KGgo=',alt:'Hair'}]})};
  const normalize = async()=>({imageBase64:'iVBORw0KGgo=',contentType:'image/png'});
  return {editor,client,normalize,calls,changes,setSnapshot:value=>{snapshot={...snapshot,...value};}};
}

test('upload cover waits for saved revision and uses only private action then autosave', async()=>{
  const h=harness(); const workflow=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  await workflow.uploadCover({},'Hair');
  assert.equal(h.calls[0][0],'uploadAsset');
  assert.equal(h.calls[0][1].concurrencyToken,'token-1');
  assert.deepEqual(h.changes[0],{cover:{assetId:'media-1',alt:'Hair',focalX:50,focalY:50}});
  assert.equal(workflow.snapshot().status,'idle');
});
test('normalization never uploads from an unsaved/conflicted editor',async()=>{
  const h=harness(); h.editor.canLeave=async()=>false;
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  await assert.rejects(w.uploadCover({},'Hair'));
  assert.equal(h.calls.length,0); assert.equal(h.changes.length,0);
});
test('switching locale during image work does not overwrite other language',async()=>{
  const h=harness(); const upload=h.client.action;
  h.client.action=async(...args)=>{h.setSnapshot({locale:'es'});return upload(...args);};
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  await assert.rejects(w.uploadCover({},'Hair'),/editor_changed/);
  assert.equal(h.changes.length,0);
});
test('reauth or processing failure preserves existing text and cover',async()=>{
  const h=harness();h.client.action=async()=>{throw Object.assign(new Error('auth_required'),{status:401});};
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  await assert.rejects(w.uploadCover({},'Hair'),/auth_required/);assert.equal(h.changes.length,0);
});
test('inline images use asset references without public URLs and cap at twenty',async()=>{
  const h=harness();const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  await w.uploadInline({},'Hair');
  assert.deepEqual(h.changes[0].delta.ops.at(-2),{insert:{image:'media-1'}});
  const h2=harness();h2.setSnapshot({package:{cover:null,delta:{ops:Array.from({length:20},(_,i)=>({insert:{image:'m'+i}}))}}});
  const w2=new media.FixedArticleMedia(h2.client,h2.editor,h2.normalize);
  await assert.rejects(w2.uploadInline({},'Hair'),/image_limit/);assert.equal(h2.calls.length,0);
});
test('private previews use memory-only blob URLs and revoke them on exit',async()=>{
  const h=harness();const revoked=[];
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize,{create:()=> 'blob:private-preview',revoke:url=>revoked.push(url)});
  assert.equal(await w.preview('media-1'),'blob:private-preview');
  assert.equal(await w.preview('media-1'),'blob:private-preview');
  w.destroy();assert.deepEqual(revoked,['blob:private-preview']);
});
test('server returned foreign asset or SVG preview is never rendered',async()=>{
  for (const value of [{assetId:'foreign',contentType:'image/png',imageBase64:'iVBORw0KGgo='},{assetId:'media-1',contentType:'image/svg+xml',imageBase64:'PHN2Zz4='}]) {
    const h=harness();h.client.read=async()=>({items:[value]});
    const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize,{create:()=>{throw new Error('must-not-create');},revoke:()=>{}});
    await assert.rejects(w.preview('media-1'),/invalid_preview/);
  }
});
test('source limit and unsupported type fail before decoding',async()=>{
  assert.ok(media);
  for (const file of [{size:8388609,type:'image/jpeg'},{size:120,type:'image/svg+xml'}]) {
    await assert.rejects(media.preparePrivateImage(file),/invalid_source/);
  }
});
test('cancel leaves article untouched even if the processor finishes later',async()=>{
  const h=harness();let finish;
  h.client.action=()=>new Promise(resolve=>{finish=resolve;});
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  assert.equal(typeof w.cancel,'function');
  const pending=w.uploadCover({},'Hair');
  while (!finish) await Promise.resolve();
  w.cancel();finish({asset:{assetId:'media-1',status:'ready'}});
  await assert.rejects(pending,/editor_changed/);assert.equal(h.changes.length,0);
  assert.equal(w.snapshot().status,'idle');
});
test('a second upload cannot begin during the initial save wait',async()=>{
  const h=harness();let done;
  h.editor.canLeave=()=>new Promise(resolve=>{done=resolve;});
  const w=new media.FixedArticleMedia(h.client,h.editor,h.normalize);
  const first=w.uploadCover({},'Hair');
  await assert.rejects(w.uploadCover({},'Hair'),/upload_busy/);
  done(false);await assert.rejects(first,/save_required/);assert.equal(h.calls.length,0);
});
