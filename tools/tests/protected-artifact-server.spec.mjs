import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {cp,mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root=path.resolve(import.meta.dirname,'../..');
const site=JSON.parse(readFileSync(path.join(root,'drafts/thehairnarrative.com/site-config.json'),'utf8'));
test('the packaged private SSR loads its exact assets without an environment binding and leaves public HTML unprojected',async t=>{
 const api=createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  if(!['/runtime-bundle','/site-config'].includes(u.pathname)){res.writeHead(404);res.end('{}');return;}
  const p=u.searchParams.get('path')||'/',route=site.routes.find(r=>r.path===p)||site.routes[0],pageId=route.pageId;
  const value=u.pathname==='/site-config'?site:{version:1,domain:site.domain,pageId,lang:'en',sourceStage:'published',siteConfig:site,route,
   pageConfig:{version:1,domain:site.domain,pageId,rootIds:['fixture']},components:{version:1,domain:site.domain,pageId,components:[{id:'fixture',type:'text',config:{tag:'h1',text:'Local artifact check'}}]},
   variables:{version:1,domain:site.domain,pageId,variables:{}},i18n:{version:1,domain:site.domain,pageId,lang:'en',dictionary:{}}};
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(value));
 });
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>api.close(resolve)));
 const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const env={...process.env,PORT:String(port),CONFIG_API_URL:`http://127.0.0.1:${api.address().port}`,CONFIG_API_SERVER_FALLBACK_URL:''};
 delete env.PROTECTED_ORIGIN_BINDING_PATH;
 const processHandle=spawn(process.execPath,[path.join(root,'dist/zoolandingpage/server/server.mjs')],{cwd:root,env,stdio:'ignore',windowsHide:true});
 t.after(()=>{processHandle.kill();});
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)break;}catch{} await new Promise(resolve=>setTimeout(resolve,100));}
 const get=(host,p)=>fetch(`http://127.0.0.1:${port}${p}`,{headers:{host,'x-forwarded-host':host,'x-forwarded-proto':'https'}});
 const response=await get('admin-test.thehairnarrative.com','/admin/journal/access?lang=en');
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/src="\/browser\/main-[A-Z2-7]{8}\.js"/);
 assert.match(html,/href="\/browser\/thn-admin-assets\/[a-f0-9]{16}\.angora-styles\.css"/);
 assert.match(html,/"assetUrls":/);
 for(const p of ['/','/admin/journal?draftDomain=other.test','/runtime-bundle','/browser/unlisted.abcdef01.js'])assert.equal((await get('admin-test.thehairnarrative.com',p)).status,404,p);
 assert.notEqual((await get('admin-test.thehairnarrative.com.attacker.test','/admin/journal/access')).status,200);
 const publicHtml=await (await get('thehairnarrative.com','/')).text();
 assert.match(publicHtml,/href="css\/angora-styles\.css"/);
 assert.doesNotMatch(publicHtml,/"assetUrls":/);
});

test('missing or malformed packaged binding closes the admin host while public health stays available',async t=>{
 for(const candidate of [null,'{}','{"version":1,"environment":"production"}']) {
  const temp=await mkdtemp(path.join(os.tmpdir(),'thn-binding-denial-'));
  await cp(path.join(root,'dist/zoolandingpage/server'),path.join(temp,'server'),{recursive:true,filter:src=>!src.endsWith('thn-protected-origin-binding.json')});
  await mkdir(path.join(temp,'browser'));
  if(candidate!==null)await writeFile(path.join(temp,'server/thn-protected-origin-binding.json'),candidate);
  const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const env={...process.env,PORT:String(port)};delete env.PROTECTED_ORIGIN_BINDING_PATH;
  const server=spawn(process.execPath,[path.join(temp,'server/server.mjs')],{env,stdio:'ignore',windowsHide:true});t.after(()=>server.kill());
  let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(`http://127.0.0.1:${port}/health`)).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'public health unaffected');
  for(const p of ['/','/admin/journal','/admin/journal?debugWorkspace=true','/browser/main-KNMXU54M.js']){
   const response=await fetch(`http://127.0.0.1:${port}${p}`,{headers:{host:'admin-test.thehairnarrative.com','x-forwarded-host':'admin-test.thehairnarrative.com','x-forwarded-proto':'https'}});
   assert.equal(response.status,404,p);
  }
  server.kill();
 }
});
