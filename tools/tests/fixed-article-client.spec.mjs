import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/app/shared/utility/content-hub/fixed-article-client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { FixedArticleClient } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const binding = { requiredOrigin: 'https://admin.example.test', domain: 'example.test', hubId: 'journal', authProfileId: 'owner', csrfCookieName: 'zlp_csrf_fixture', basePath: '/features/content-hub-v2' };
function harness(overrides={}) {
  const calls=[];
  const context = { origin: binding.requiredOrigin, path: '/admin/journal/a/edit', surface: 'protected-admin', cookie: () => 'zlp_csrf_fixture=fixture', ...overrides };
  const fetcher = async (...args) => { calls.push(args); return { ok: true, status: 200, json: async () => ({ok:true,data:{articleId:'a'}}) }; };
  return { calls, client: new FixedArticleClient(binding, context, fetcher) };
}
test('private request uses exact same-origin v2 endpoint, namespaced CSRF, never v1', async () => {
  const { calls, client } = harness(); await client.action('createArticle', {locale:'en'});
  const [url, options] = calls[0]; assert.equal(url, '/features/content-hub-v2/action');
  assert.equal(options.credentials, 'same-origin'); assert.equal(options.headers['X-ZLP-CSRF'], 'fixture');
  assert.deepEqual(JSON.parse(options.body), {domain:'example.test',input:{contentHub:{hubId:'journal',action:'createArticle',data:{locale:'en'}}}});
});
test('publication permits the bounded publisher response window without changing ordinary reads',async()=>{
  const original=globalThis.setTimeout,delays=[];
  globalThis.setTimeout=(callback,ms)=>{delays.push(ms);return original(callback,ms);};
  try {
    const h=harness(); await h.client.action('publish',{}); await h.client.action('unpublishArticle',{});await h.client.read('articleList',{});
    assert.deepEqual(delays,[120000,120000,15000]);
  } finally {globalThis.setTimeout=original;}
});
test('public/wrong host/untrusted SSR surface never performs a protected fetch', async () => {
  for (const context of [{origin:'https://public.example.test'}, {surface:'public'}, {path:'/the-journal'}, {origin:'http://admin.example.test'}, {path:'/admin/journal-evil'}]) {
    const { calls, client } = harness(context); await assert.rejects(client.read('articleList', {})); assert.equal(calls.length,0);
  }
});
test('unknown operations and cross-origin/protocol-relative endpoints fail without fallback', async () => {
  const h = harness(); await assert.rejects(h.client.action('archiveArticle', {})); assert.equal(h.calls.length,0);
  for (const basePath of ['https://evil.test/action','//evil.test','/features/content-hub','/features/content-hub-v2/../auth']) {
    const calls=[]; const client = new FixedArticleClient({...binding,basePath},{origin:binding.requiredOrigin,path:'/admin/journal',surface:'protected-admin',cookie:()=>''},(...args)=>{calls.push(args);});
    await assert.rejects(client.read('articleList',{})); assert.equal(calls.length,0);
  }
});
test('missing or duplicated CSRF cookie cannot send mutation', async () => {
  for (const cookie of ['', 'zlp_csrf_fixture=a; zlp_csrf_fixture=b']) {
    const h=harness({cookie:()=>cookie}); await assert.rejects(h.client.action('createArticle',{locale:'en'})); assert.equal(h.calls.length,0);
  }
});
test('ordinary article requests are bounded independently of the larger upload envelope', async () => {
  const h=harness(); await assert.rejects(h.client.action('updatePackage',{body:'a'.repeat(600001)})); assert.equal(h.calls.length,0);
});
test('private upload enforces metadata, decoded-byte and canonical-base64 bounds before fetch', async () => {
  for (const data of [{imageBase64:'?',contentType:'image/png'},
                     {imageBase64:'aW1hZ2U=',contentType:'image/svg+xml'},
                     {imageBase64:'aW1hZ2U=',contentType:'image/png',alt:'a'.repeat(65537)},
                     {imageBase64:Buffer.alloc(4194305).toString('base64'),contentType:'image/png'}]) {
    const h=harness();await assert.rejects(h.client.action('uploadAsset',data));assert.equal(h.calls.length,0);
  }
});
test('exact normalized-image limit is accepted without changing the v1 envelope',async()=>{
  const h=harness();
  await h.client.action('uploadAsset',{imageBase64:Buffer.alloc(4194304).toString('base64'),contentType:'image/png',alt:'Fixture'});
  assert.equal(h.calls.length,1);
});
test('preserves structured conflict/reauth codes without echoing server-private messages', async () => {
  for (const status of [401,409]) {
    const client=new FixedArticleClient(binding,{origin:binding.requiredOrigin,path:'/admin/journal',surface:'protected-admin',cookie:()=> 'zlp_csrf_fixture=a'},async()=>({ok:false,status,json:async()=>({ok:false,code:status===401?'auth_required':'edit_conflict',message:'private-server-details'})}));
    await assert.rejects(client.read('articleList',{}), error => error.status===status && !error.message.includes('private-server-details'));
  }
});
