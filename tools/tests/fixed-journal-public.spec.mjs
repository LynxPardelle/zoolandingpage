import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../../src/app/shared/utility/content-hub/fixed-journal-public.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const fields=(id,lang='en')=>({title:id,summary:'A summary',path:`/the-journal/${lang==='en'?'bridal-forms':'formas-nupciales'}/${id}`,
  publishedAt:'2026-08-01T12:00:00Z',updatedAt:'2026-08-02T12:00:00Z',categorySlug:lang==='en'?'bridal-forms':'formas-nupciales',
  imageSrc:`/features/content-hub-v2/public-media/${id}/${lang}/r1/cover/w1200`,imageAlt:'Hair'});
const article=id=>({articleId:id,locale:'en',status:'published',visibility:'public',...fields(id),localizations:{en:fields(id),es:fields(id,'es')}});
const hub=items=>({localePolicy:'published-only',defaultLocale:'en',routeBasePath:'/the-journal',publicArticles:items});
test('zero through five articles preserve empty state and latest three only',()=>{
  for(let count=0;count<=5;count++) {
    const view=api.journalView(hub(Array.from({length:count},(_,i)=>article('a'+i))),'/','en');
    assert.equal(view.empty,count===0);assert.equal(view.cards.length,Math.min(count,3));assert.equal(view.allCount,count);
  }
});
test('order uses publishedAt then articleId, never updatedAt',()=>{
  const a=article('a'),b=article('b');a.updatedAt='2030-01-01T00:00:00Z';
  assert.deepEqual(api.journalView(hub([b,a]),'/the-journal','en').cards.map(x=>x.articleId),['a','b']);
  b.localizations.en.publishedAt='2026-09-01T12:00:00Z';b.publishedAt=b.localizations.en.publishedAt;
  assert.deepEqual(api.journalView(hub([a,b]),'/the-journal','en').cards.map(x=>x.articleId),['b','a']);
});
test('untranslated, private, unpublished and incorrect series/path never leak',()=>{
  const es={...article('es'),locale:'es',...fields('es','es'),localizations:{es:fields('es','es')}};
  const items=[es,{...article('draft'),status:'draft'},{...article('private'),visibility:'private'}, {...article('wrong'),localizations:{en:{...fields('wrong'),path:'/blog/wrong'}}}];
  assert.equal(api.journalView(hub(items),'/the-journal','en').cards.length,0);
  assert.equal(api.journalView(hub([es]),'/the-journal/formas-nupciales/es','en').current,null);
});
test('language navigation uses the live sibling or Journal, with one language parameter',()=>{
  const a=article('a');
  const source='https://example.test/the-journal/bridal-forms/a?draftDomain=thehairnarrative.com&lang=en&lang=en';
  assert.equal(api.journalLanguageUrl(hub([a]),source,'es'), 'https://example.test/the-journal/formas-nupciales/a?draftDomain=thehairnarrative.com&lang=es');
  delete a.localizations.es;
  assert.equal(new URL(api.journalLanguageUrl(hub([a]),source,'es')).pathname,'/the-journal');
});
test('non opted-in configurations are unchanged',()=>{
  assert.equal(api.journalView({publicArticles:[article('a')]},'/the-journal','en'),null);
  assert.equal(api.journalLanguageUrl({},'https://example.test/blog/post?lang=en','es'),null);
});
