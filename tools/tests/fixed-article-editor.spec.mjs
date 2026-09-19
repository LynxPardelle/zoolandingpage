import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/app/state/blog/fixed-article-editor.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { FixedArticleEditor, EditorRequestError } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

const pkg = title => ({ title, summary: '', seriesId: 'form-movement', tags: [], cover: null, delta: { ops: [{ insert: '\n' }] } });
const article = () => ({ articleId: 'a', concurrencyToken: 'v1', seriesId: 'form-movement', locales: { en: { package: pkg('English'), state: 'draft' }, es: { package: pkg('Español'), state: 'draft' } } });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('publication holds autosave/navigation and preserves typing after the acknowledged token', async () => {
  const h=harness(), record={...article(),publicationAvailable:true};
  record.locales.en.workingRevisionId='r1';h.editor.open(record,'en');
  const request=h.editor.beginPublication('publish');
  assert.equal(request.revisionId,'r1');
  h.editor.change({title:'Typing during publication'});await h.editor.flush();
  assert.equal(h.calls.length,0);assert.equal(await h.editor.canLeave(),false);
  h.editor.finishPublication({articleId:'a',locale:'en',state:'published',concurrencyToken:'v3'});
  assert.equal(h.editor.snapshot().package.title,'Typing during publication');
  assert.equal(h.editor.snapshot().localeStates.en.publishedRevisionId,'r1');
  assert.equal(h.editor.snapshot().seriesLocked,true);
  await h.editor.flush();assert.equal(h.calls[0].concurrencyToken,'v3');
});

test('publishing is denied without server capability or an acknowledged working revision', () => {
  const h=harness();assert.throws(()=>h.editor.beginPublication('publish'));
  h.editor.open({...article(),publicationAvailable:true},'en');
  assert.throws(()=>h.editor.beginPublication('publish'));
});

test('invalid publication acknowledgement preserves the exact pending request', () => {
  const h=harness(), record={...article(),publicationAvailable:true};record.locales.en.workingRevisionId='r1';
  h.editor.open(record,'en');h.editor.beginPublication('publish');
  assert.throws(()=>h.editor.finishPublication({articleId:'foreign',locale:'en',state:'published',concurrencyToken:'v3'}));
  assert.equal(h.editor.snapshot().publicationPending,true);
  h.editor.cancelPublication(409);assert.equal(h.editor.snapshot().status,'conflict');
});
function harness() {
  const jobs = new Map(), delays = [], calls = [];
  let id = 0;
  const api = { save: async data => { calls.push(structuredClone(data)); return { ...article(), concurrencyToken: 'v2', locales: { ...article().locales, [data.locale]: { package: data.package, state: 'draft' } } }; } };
  const clock = { schedule(fn, ms) { const key = ++id; jobs.set(key, fn); delays.push(ms); return key; }, cancel(key) { jobs.delete(key); } };
  const editor = new FixedArticleEditor(api, clock);
  editor.open(article(), 'en');
  return { editor, api, calls, jobs, delays, async tick() { const [key, fn] = jobs.entries().next().value; jobs.delete(key); fn(); await new Promise(r => setImmediate(r)); } };
}

test('debounces 1500ms, serializes saves, and flushes on blur', async () => {
  const h = harness();
  h.editor.change({ title: 'One' }); h.editor.change({ title: 'Two' });
  assert.equal(h.jobs.size, 1); assert.equal(h.delays.at(-1), 1500);
  await h.editor.flush();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].package.title, 'Two');
  assert.equal(h.editor.snapshot().status, 'saved'); assert.equal(h.editor.snapshot().dirty, false);
});

test('older response cannot overwrite typing while save is in flight', async () => {
  const h = harness(), d = deferred(); h.api.save = () => d.promise;
  h.editor.change({ title: 'Sent' }); const saving = h.editor.flush();
  h.editor.change({ title: 'Still typing' });
  d.resolve({ ...article(), concurrencyToken: 'v2' }); await saving;
  assert.equal(h.editor.snapshot().package.title, 'Still typing');
  assert.equal(h.editor.snapshot().dirty, true);
  h.api.save = async data => { h.calls.push(data); return { ...article(), concurrencyToken: 'v3' }; };
  await h.editor.flush(); assert.equal(h.calls[0].concurrencyToken, 'v2');
});

test('retries at 1, 3, 10 seconds then waits for manual retry', async () => {
  const h = harness(); let failures = 0;
  h.api.save = async () => { failures++; throw new Error('network'); };
  h.editor.change({ title: 'Unsaved' }); await h.editor.flush();
  assert.equal(h.delays.at(-1), 1000); await h.tick(); assert.equal(h.delays.at(-1), 3000);
  await h.tick(); assert.equal(h.delays.at(-1), 10000); await h.tick();
  assert.equal(failures, 4); assert.equal(h.jobs.size, 0); assert.equal(h.editor.snapshot().status, 'retry-required');
  assert.equal(h.editor.snapshot().package.title, 'Unsaved');
});

test('session expiry preserves text and blocks writes until explicit reauth', async () => {
  const h = harness(); h.api.save = async () => { throw new EditorRequestError(401, 'auth_required'); };
  h.editor.change({ title: 'Keep me' }); await h.editor.flush();
  assert.equal(h.editor.snapshot().status, 'auth-required'); assert.equal(h.jobs.size, 0);
  assert.equal(await h.editor.canLeave(), false);
  h.api.save = async () => ({ ...article(), concurrencyToken: 'v2' });
  await h.editor.resumeAfterAuthentication(); assert.equal(h.editor.snapshot().dirty, false);
  assert.equal(h.editor.snapshot().package.title, 'Keep me');
});

test('conflict preserves local text and cannot retry over a remote version', async () => {
  const h = harness(); h.api.save = async () => { throw new EditorRequestError(409, 'edit_conflict'); };
  h.editor.change({ title: 'Local draft' }); await h.editor.flush();
  assert.equal(h.editor.snapshot().status, 'conflict');
  await h.editor.retry(); assert.equal(h.editor.snapshot().status, 'conflict');
  assert.equal(h.editor.snapshot().package.title, 'Local draft');
  assert.throws(() => h.editor.open(article(), 'en'), /unsaved/);
});

test('locale change waits for save and never mixes EN and ES', async () => {
  const h = harness(); h.editor.change({ title: 'English edited' });
  assert.equal(await h.editor.switchLocale('es'), true);
  assert.equal(h.calls[0].locale, 'en'); assert.equal(h.editor.snapshot().package.title, 'Español');
  h.editor.change({ title: 'Español editado' }); await h.editor.flush();
  assert.equal(h.calls[1].locale, 'es'); assert.equal(h.calls[1].concurrencyToken, 'v2');
});

test('failed save prevents locale navigation; discard must be explicit', async () => {
  const h = harness(); h.api.save = async () => { throw new EditorRequestError(400, 'invalid_package'); };
  h.editor.change({ title: 'Do not lose' });
  assert.equal(await h.editor.switchLocale('es'), false); assert.equal(h.editor.snapshot().locale, 'en');
  assert.equal(h.editor.snapshot().status, 'validation-error');
  h.editor.discardAndOpen(article(), 'es'); assert.equal(h.editor.snapshot().locale, 'es');
});

test('late result after explicit discard cannot hydrate a different article', async () => {
  const h = harness(), d = deferred(); h.api.save = () => d.promise;
  h.editor.change({ title: 'Old' }); const saving = h.editor.flush();
  h.editor.discardAndOpen({ ...article(), articleId: 'b' }, 'es');
  d.resolve({ ...article(), concurrencyToken: 'old-result' }); await saving;
  assert.equal(h.editor.snapshot().articleId, 'b'); assert.equal(h.editor.snapshot().locale, 'es');
  assert.equal(h.editor.snapshot().concurrencyToken, 'v1');
});

test('published empty sibling locale starts blank without copying body', async () => {
  const h = harness(); const a = article(); delete a.locales.es; h.editor.open(a, 'en');
  assert.equal(await h.editor.switchLocale('es'), true); assert.equal(h.editor.snapshot().package.title, '');
});

test('real transport errors block retries for auth, conflicts and invalid data', async () => {
  const text = await readFile(new URL('../../src/app/shared/utility/content-hub/fixed-article-client.ts', import.meta.url), 'utf8');
  const javascript = ts.transpileModule(text, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  const { FixedArticleClient } = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
  for (const [status, expected] of [[401,'auth-required'],[409,'conflict'],[400,'validation-error']]) {
    const h = harness(); let requests = 0;
    const client = new FixedArticleClient({requiredOrigin:'https://admin.example.test',domain:'example.test',hubId:'journal',authProfileId:'owner',csrfCookieName:'zlp_csrf_fixture',basePath:'/features/content-hub-v2'},
      {origin:'https://admin.example.test',path:'/admin/journal/a/edit',surface:'protected-admin',cookie:()=> 'zlp_csrf_fixture=fixture'},
      async()=> {requests++; return {ok:false,status,json:async()=>({ok:false,code:'denied'})};});
    h.api.save = data => client.action('updatePackage', data);
    h.editor.change({title:'Preserved'}); await h.editor.flush();
    assert.equal(h.editor.snapshot().status, expected); assert.equal(h.jobs.size,0);
    await h.editor.canLeave(); assert.equal(requests,1);
  }
});

test('server shared-series metadata survives switching back to the sibling locale', async () => {
  const h = harness();
  h.api.save = async data => ({...article(),seriesId:'bridal-forms',concurrencyToken:'v2',locales:{
    en:{package:data.package,state:'draft'},es:{package:{...pkg('Español'),seriesId:'bridal-forms'},state:'draft'}}});
  h.editor.change({seriesId:'bridal-forms'}); await h.editor.flush(); await h.editor.switchLocale('es');
  assert.equal(h.editor.snapshot().package.seriesId,'bridal-forms');
});

test('synchronous transport failure cannot leave autosave stuck in-flight', async () => {
  const h = harness(); let requests=0;
  h.api.save = () => { requests++; throw new Error('unavailable'); };
  h.editor.change({title:'Keep'}); await h.editor.flush(); await h.tick();
  assert.equal(requests,2);
});

test('lost acknowledgement cannot silently drop a reversal to the old saved text', async () => {
  const h = harness(), d = deferred(); const sent=[]; let remote='English';
  h.api.save = data => {sent.push(structuredClone(data)); remote=data.package.title; return d.promise;};
  h.editor.change({title:'Intermediate'}); const saving=h.editor.flush();
  await Promise.resolve(); h.editor.change({title:'English'});
  d.reject(new Error('response lost after commit')); await saving;
  assert.equal(remote,'Intermediate'); assert.equal(h.editor.snapshot().dirty,true);
  assert.equal(await h.editor.canLeave(),false);
  assert.equal(h.editor.snapshot().package.title,'English');
  h.api.save = async data => {
    sent.push(structuredClone(data));
    if (data.concurrencyToken==='v1') {
      assert.equal(data.package.title,'Intermediate'); // exact idempotent replay first
      return {...article(),concurrencyToken:'v2'};
    }
    assert.equal(data.concurrencyToken,'v2'); remote=data.package.title;
    return {...article(),concurrencyToken:'v3'};
  };
  assert.equal(await h.editor.canLeave(),true);
  assert.equal(remote,'English'); assert.equal(h.editor.snapshot().dirty,false);
  assert.deepEqual(sent[1],sent[0]);
});

test('malformed or wrong-article acknowledgements stay unresolved', async () => {
  for (const response of [undefined, {...article(),articleId:'wrong'}, {...article(),concurrencyToken:''}]) {
    const h=harness(), d=deferred(); h.api.save=()=>d.promise;
    h.editor.change({title:'Intermediate'}); const saving=h.editor.flush();
    await Promise.resolve(); h.editor.change({title:'English'}); d.resolve(response); await saving;
    assert.equal(h.editor.snapshot().hasUnacknowledgedWrite,true);
    assert.equal(await h.editor.canLeave(),false);
    assert.equal(h.editor.snapshot().articleId,'a');
  }
});
