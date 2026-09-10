import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=new URL('../../drafts/thehairnarrative.com/',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));

test('all authoring and reading payloads satisfy the actual runtime validators',async()=>{
  const built=await build({entryPoints:[fileURLToPath(new URL('../../src/app/shared/utility/config-validation/config-payload.validators.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',alias:{'@':fileURLToPath(new URL('../../src',import.meta.url))}});
  const validators=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
  assert.equal(validators.isDraftSiteConfigPayload(read('site-config.json')),true,'site');
  for(const page of ['home','the-journal','the-journal-series','the-journal-article','admin-journal','admin-journal-access','admin-journal-mfa','admin-journal-new','admin-journal-edit','admin-journal-preview']) {
    for(const [file,validator] of [['components.json','isComponentsPayload'],['page-config.json','isPageConfigPayload'],['variables.json','isVariablesPayload'],['angora-combos.json','isAngoraCombosPayload'],['i18n/en.json','isI18nPayload'],['i18n/es.json','isI18nPayload']]) {
      const payload=read(page+'/'+file);
      assert.equal(validators[validator](payload),true,page+'/'+file);
    }
  }
});
test('Journal public routes are localized series/detail only and excluded from static sitemap',()=>{
  const site=read('site-config.json');
  for(const route of ['/the-journal/:seriesSlug','/the-journal/:seriesSlug/:articleSlug']) {
    assert.ok(site.routes.some(r=>r.path===route)); assert.ok(site.sitemap.excludePaths.includes(route));
  }
  assert.equal(site.runtime.contentHubs[0].localePolicy,'published-only');
  assert.deepEqual(site.runtime.contentHubs[0].publicArticles,[]);
  assert.equal(site.routes.some(r=>r.path.startsWith('/the-journal/tag')),false);
});
test('Home and Journal retain approved zero states alongside shared published projection',()=>{
  for(const page of ['home','the-journal']) {
    const components=read(page+'/components.json').components;
    assert.ok(components.some(c=>c.loopConfig?.path==='journalDelivery.cards'));
    assert.ok(components.some(c=>c.condition==='all:varEq,journalDelivery.empty,true'));
    if(page==='home') assert.deepEqual(components.find(c=>c.id==='homeJournalGrid').config.components,['homeJournalCard0','homeJournalCard1','homeJournalCard2']);
    else for(const id of ['purposeSection','letterContent']) assert.ok(components.some(c=>c.id===id));
  }
});
test('Article body is compiled HTML only, with Booksaw shell and bounded focal cover',()=>{
  const page=read('the-journal-article/page-config.json'),components=read('the-journal-article/components.json').components;
  assert.ok(page.rootIds.includes('siteHeader'));assert.ok(page.rootIds.includes('siteFooter'));
  assert.ok(components.some(c=>c.valueInstructions?.includes('journalDelivery.bodyHtml')));
  assert.ok(components.some(c=>c.valueInstructions?.includes('journalDelivery.coverStyle')));
  for(const locale of ['en','es']) for(const p of ['the-journal-series','the-journal-article']) {
    assert.ok(read(p+'/i18n/'+locale+'.json').dictionary.journalDelivery.back);
  }
});
