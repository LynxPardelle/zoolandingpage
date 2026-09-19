import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../src/app/shared/utility/auth/protected-admin-origin.utility.ts',import.meta.url),'utf8').catch(()=> '');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const binding={origin:'https://admin.example.test',domain:'example.test',pagePrefix:'/admin/journal',
  pageRoutes:['/admin/journal','/admin/journal/access','/admin/journal/mfa','/admin/journal/new','/admin/journal/:articleId/edit','/admin/journal/:articleId/preview'],
  backendRoutes:[{path:'/auth-v2/session/signin',methods:['POST']},{path:'/auth-v2/session/me',methods:['GET']},{path:'/features/content-hub-v2/read',methods:['POST']}],
  backendPrefixes:['/auth-v2','/features/content-hub-v2/read','/features/content-hub-v2/action'],staticPaths:['/browser/main.abcdef012345.js']};
test('private inventory is explicit and cannot be selected by a draft query',()=>{
  assert.equal(typeof api.classifyProtectedOriginRequest,'function');
  const check=(path,method='GET',host='admin.example.test')=>api.classifyProtectedOriginRequest(host,path,method,binding);
  assert.equal(check('/admin/journal').kind,'page');
  assert.equal(check('/admin/journal/abc/edit?lang=es').kind,'page');
  for(const path of ['/','/the-journal','/admin/journal/nope','/admin/journal?draftDomain=other.test','/admin/journal?draftDomain','/admin/journal?draftDomain%3Dx','/runtime-bundle','/browser/other.js','/admin/journal/%2e%2e/edit','/admin/journal/../journal']) assert.equal(check(path).kind,'deny',path);
  assert.equal(check('/admin/journal','POST').kind,'deny');
  assert.equal(check('/auth-v2/session/signin','POST').kind,'backend');
  assert.equal(check('/auth-v2/session/signin').kind,'deny');
  assert.equal(check('/browser/main.abcdef012345.js').kind,'asset');
  for(const path of ['/admin/journal','/admin/journal/x/edit','/auth-v2/session/me','/features/content-hub-v2/read']) assert.equal(check(path,'GET','public.example.test').kind,'deny');
  assert.equal(check('/the-journal','GET','public.example.test').kind,'public');
});
test('lazy auth requires the route, exact HTTPS origin and trusted server role; omitted option keeps legacy',()=>{
  assert.equal(typeof api.canResolveProtectedAuth,'function');
  const context={path:'/admin/journal',route:{auth:{required:true}},originRole:'protected-admin'};
  assert.equal(api.canResolveProtectedAuth(binding.origin,binding.origin,context),true);
  for(const candidate of [{...context,originRole:'public'},{...context,path:'/the-journal'},{...context,route:{}}]) assert.equal(api.canResolveProtectedAuth(binding.origin,binding.origin,candidate),false);
  assert.equal(api.canResolveProtectedAuth(binding.origin,'https://public.example.test',context),false);
  assert.equal(api.canResolveProtectedAuth(undefined,'https://public.example.test',{}),true);
});
test('reserved private prefixes cannot be smuggled through encoding on a public host',()=>{
 for(const path of ['/admin/journal-extra','/%61dmin/journal','/%2561dmin/journal','/auth-v2-extra','/features/content-hub-v2/read-extra','/x/../admin/journal']) {
  assert.equal(api.classifyProtectedOriginRequest('public.example.test',path,'GET',binding).kind,'deny',path);
 }
 assert.equal(api.isProtectedOriginBinding({...binding,backendRoutes:[{path:'/unreserved',methods:['POST']}]}),false);
});

test('server-owned asset maps are exact, non-expansive and project only listed attributes',()=>{
 const assetUrls={'/main.js':'/browser/main.abcdef012345.js'};
 const mapped={...binding,assetUrls};
 assert.equal(api.isProtectedOriginBinding(mapped),true);
 for(const candidate of [ {'/main.js':'https://other.test/file.js'}, {'/main.js':'/browser/other.abcdef012345.js'},
   {'/../main.js':'/browser/main.abcdef012345.js'}, {'/__proto__':'/browser/main.abcdef012345.js'}, {'/main.js':'/browser/%2e%2e/file.js'}]) {
  assert.equal(api.isProtectedOriginBinding({...binding,assetUrls:candidate}),false);
 }
 assert.equal(typeof api.projectProtectedAssetAttributes,'function');
 const html='<script src="main.js"></script><a href="/admin/journal">Journal</a>';
 assert.equal(api.projectProtectedAssetAttributes(html,assetUrls),'<script src="/browser/main.abcdef012345.js"></script><a href="/admin/journal">Journal</a>');
 assert.equal(api.projectProtectedAssetAttributes(html,undefined),html);
 const context=api.classifyProtectedOriginRequest('admin.example.test','/admin/journal','GET',mapped).context;
 assert.deepEqual(context.assetUrls,assetUrls);
 assert.equal(api.classifyProtectedOriginRequest('admin.example.test.attacker.test','/admin/journal','GET',mapped).kind,'deny');
});

test('packaged bindings fail closed on integrity, release, host, route or manifest drift',()=>{
 assert.equal(typeof api.readPackagedProtectedOrigin,'function');
 const backendRoutes=[['/auth-v2/runtime-config',['GET','POST']],['/auth-v2/session/signin',['POST']],
  ['/auth-v2/session/challenge/respond',['POST']],['/auth-v2/session/mfa/setup',['POST']],
  ['/auth-v2/session/mfa/verify',['POST']],['/auth-v2/session/me',['GET']],['/auth-v2/session/logout',['POST']],
  ['/features/content-hub-v2/read',['POST']],['/features/content-hub-v2/action',['POST']]].map(([path,methods])=>({path,methods}));
 const packaged={version:1,environment:'test',releaseId:'a'.repeat(40),
  binding:{...binding,origin:'https://admin-test.thehairnarrative.com',domain:'thehairnarrative.com',backendRoutes,
    assetUrls:{'/main.js':binding.staticPaths[0]}},assetHashes:{[binding.staticPaths[0]]:'b'.repeat(64)}};
 const digest=()=> 'b'.repeat(64);
 assert.deepEqual(api.readPackagedProtectedOrigin(packaged,digest,'a'.repeat(40)),packaged.binding);
 assert.equal(api.readPackagedProtectedOrigin(packaged,digest,'c'.repeat(40)),null);
 assert.equal(api.readPackagedProtectedOrigin(packaged,()=> 'c'.repeat(64)),null);
 for(const mutate of [v=>v.environment='production',v=>v.binding.origin='https://admin-test.thehairnarrative.com.attacker.test',
   v=>v.binding.pageRoutes.push('/admin/journal/:id/delete'),v=>v.binding.backendRoutes.push({path:'/auth-v2/signup',methods:['POST']}),
   v=>v.assetHashes['/browser/extra.abcdef01.js']='b'.repeat(64),v=>v.unreviewed=true,
   v=>v.binding.staticPaths.push('/browser/extra.abcdef01.js')]) {
  const changed=structuredClone(packaged);mutate(changed);
  assert.equal(api.readPackagedProtectedOrigin(changed,digest),null);
 }
 assert.equal(api.readPackagedProtectedOrigin(undefined,digest),null);
});
