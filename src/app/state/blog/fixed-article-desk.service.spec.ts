import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { VariableStoreService } from '../../shared/services/variable-store.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { ProtectedOriginService } from '../../shared/services/protected-origin.service';
import { FixedArticleDeskService } from './fixed-article-desk.service';
import type { PrivateArticle } from './fixed-article-editor';
const origin='https://admin.example.test';
const makeArticle=(): PrivateArticle=>({articleId:'a1',concurrencyToken:'v1',seriesId:'form-movement',locales:{en:{state:'draft',package:{title:'First title',summary:'Summary',seriesId:'form-movement',tags:[],cover:null,delta:{ops:[{insert:'Body\n'}]}}}}});
describe('FixedArticleDeskService actual private transport',()=>{
  let vars: VariableStoreService, desk: FixedArticleDeskService, fetcher: jasmine.Spy;
  let article: PrivateArticle;
  const context=(path='/admin/journal/a1/edit')=>({domain:'example.test',pageId:'editor',path,route:{path,pageId:'editor',auth:{required:true}},originRole:'protected-admin' as const,routeParams:{articleId:'a1'},explicitPageId:false});
  beforeEach(()=>{
    spyOn(window,'confirm').and.returnValue(true);
    article=makeArticle();
    TestBed.configureTestingModule({providers:[{provide:PLATFORM_ID,useValue:'browser'},
      {provide:ProtectedOriginService,useValue:{origin,context:{origin,domain:'example.test',originRole:'protected-admin'}}},
      {provide:RuntimeConfigService,useValue:{authRemote:()=>({requiredOrigin:origin,authProfileId:'owner'}),auth:()=>({authProfileId:'owner',session:{csrfCookieName:'zlp_csrf_fixture'}})}}]});
    vars=TestBed.inject(VariableStoreService);
    vars.setPayload({version:1,domain:'example.test',pageId:'editor',variables:{journalDeskConfig:{template:'fixed-article-v2',hubId:'journal'}}});
    document.cookie='zlp_csrf_fixture=fixture; path=/';
    fetcher=spyOn(globalThis,'fetch').and.callFake(async (_url,options)=>{
      const payload=JSON.parse(String(options?.body)).input.contentHub;
      const operation=payload.read??payload.action;
      let data: unknown=article;
      if(operation==='articleList') data={items:[article]};
      if(operation==='updatePackage') { article={...article,concurrencyToken:'v2',locales:{...article.locales,[payload.data.locale]:{state:'draft',package:payload.data.package}}}; data=article; }
      if(operation==='publicBundlePreview') data={articleId:'a1',locale:'en',title:'First title',summary:'Summary',cover:null,articleContent:{html:'<p>Body</p>'}};
      return new Response(JSON.stringify({ok:true,data}),{status:200});
    });
    desk=TestBed.inject(FixedArticleDeskService);
  });
  afterEach(()=>{TestBed.resetTestingModule(); document.cookie='zlp_csrf_fixture=; Max-Age=0; path=/';});
  it('does not withdraw without explicit confirmation',async()=>{
    article.publicationAvailable=true;
    await desk.start(context());
    (window.confirm as jasmine.Spy).and.returnValue(false);
    fetcher.calls.reset();
    await desk.act('unpublish');
    expect(window.confirm).toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('loads into runtime fields and saves actual input changes through the v2 client',async()=>{
    await desk.start(context());
    expect(vars.get('journalDesk.editor.package.title')).toBe('First title');
    await desk.act('field',{fieldId:'title',value:'Edited title'},'valueChanged');
    await desk.act('field',{fieldId:'title'},'blurred');
    const write=fetcher.calls.allArgs().map(([,o])=>JSON.parse(String(o?.body)).input.contentHub).find(p=>p.action==='updatePackage');
    expect(write?.data.package.title).toBe('Edited title');
    expect(vars.get('journalDesk.editor.status')).toBe('saved');
  });
  it('only starts for opt-in protected pages and leaves unrelated drafts inert',async()=>{
    await desk.start({...context('/the-journal'),originRole:'public'});
    expect(fetcher).not.toHaveBeenCalled();
    vars.setPayload(null); await desk.start(context());
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('connects the article list and exposes both language states',async()=>{
    await desk.start(context('/admin/journal'));
    expect(vars.get('journalDesk.rows.0.enState')).toBe('Draft');
    expect(vars.get('journalDesk.rows.0.esState')).toBe('Not started');
    expect(vars.get('journalDesk.rows.0.title')).toBe('First title');
    vars.setRuntimeValue('journalDesk.uiLang','es');
    await desk.act('locale',{id:'es'});
    expect(vars.get('journalDesk.rows.0.stateLabel')).toBe('EN: Borrador · ES: Sin iniciar');
  });
  it('creates one identity and switches locale only after acknowledged saves',async()=>{
    await desk.start(context('/admin/journal/new')); await desk.start(context('/admin/journal/new'));
    expect(fetcher.calls.allArgs().filter(([,o])=>JSON.parse(String(o?.body)).input.contentHub.action==='createArticle').length).toBe(1);
    await desk.act('field',{fieldId:'title',value:'English changed'},'valueChanged');
    await desk.act('locale',{id:'es'});
    expect(vars.get('journalDesk.editor.locale')).toBe('es');
    expect(vars.get('journalDesk.editor.package.title')).toBe('');
    expect(article.locales.en?.package.title).toBe('English changed');
  });
  it('compiles a private preview and does not enable publishing prematurely',async()=>{
    await desk.start(context('/admin/journal/a1/preview'));
    expect(vars.get('journalDesk.preview.html')).toBe('<p>Body</p>');
    await desk.act('publish');
    expect(fetcher.calls.allArgs().some(([,o])=>JSON.parse(String(o?.body)).input.contentHub.action==='publish')).toBeFalse();
  });
  it('publishes only the saved active locale using server capability and updates the token',async()=>{
    article.publicationAvailable=true;article.locales.en!.workingRevisionId='r1';
    await desk.start(context());
    fetcher.and.callFake(async (_url,options)=>{
      const request=JSON.parse(String(options?.body)).input.contentHub;
      expect(request.action).toBe('publish');expect(request.data.revisionId).toBe('r1');
      expect(request.data.locale).toBe('en');expect(request.data.package).toBeUndefined();
      expect(request.data.idempotencyKey).toMatch(/^[a-f0-9]{32}$/);
      return new Response(JSON.stringify({ok:true,data:{articleId:'a1',locale:'en',state:'published',concurrencyToken:'v3'}}));
    });
    await desk.act('publish');
    expect(vars.get('journalDesk.editor.concurrencyToken')).toBe('v3');
    expect(vars.get('journalDesk.editor.localeStates.en.state')).toBe('published');
    expect(vars.get('journalDesk.publicationPending')).toBeFalse();
  });
  it('keeps one publication idempotency key after a lost response and blocks navigation',async()=>{
    article.publicationAvailable=true;article.locales.en!.workingRevisionId='r1';await desk.start(context());
    const bodies:unknown[]=[];let attempts=0;
    fetcher.and.callFake(async (_url,options)=>{
      bodies.push(JSON.parse(String(options?.body)));if(++attempts===1) throw new Error('offline');
      return new Response(JSON.stringify({ok:true,data:{articleId:'a1',locale:'en',state:'published',concurrencyToken:'v3'}}));
    });
    await desk.act('publish');expect(await desk.prepareNavigation()).toBeFalse();
    expect(vars.get('journalDesk.publicationPending')).toBeTrue();
    await desk.act('retryPublication');expect(bodies[0]).toEqual(bodies[1]);
    expect(vars.get('journalDesk.publicationPending')).toBeFalse();
  });
  it('withdraws only the selected live locale without losing its working copy',async()=>{
    article.publicationAvailable=true;article.locales.en!.workingRevisionId='r2';article.locales.en!.publishedRevisionId='r1';
    article.locales.en!.state='updates-pending';await desk.start(context());
    fetcher.and.callFake(async (_url,options)=>{
      expect(JSON.parse(String(options?.body)).input.contentHub.action).toBe('unpublishArticle');
      return new Response(JSON.stringify({ok:true,data:{articleId:'a1',locale:'en',state:'unpublished',concurrencyToken:'v3'}}));
    });
    await desk.act('unpublish');
    expect(vars.get('journalDesk.editor.localeStates.en.state')).toBe('unpublished');
    expect(vars.get('journalDesk.editor.package.title')).toBe('First title');
  });
  it('keeps a conflict snapshot when reloading and restores it only on explicit request',async()=>{
    await desk.start(context());
    await desk.act('field',{fieldId:'title',value:'My unsaved wording'},'valueChanged');
    fetcher.and.returnValue(Promise.resolve(new Response(JSON.stringify({ok:false,error:{code:'conflict'}}),{status:409})));
    await desk.act('save');
    expect(vars.get('journalDesk.editor.status')).toBe('conflict');
    fetcher.and.returnValue(Promise.resolve(new Response(JSON.stringify({ok:true,data:{...makeArticle(),concurrencyToken:'latest'}}),{status:200})));
    const revision=vars.get('journalDesk.valueRevision');
    await desk.act('reloadConflict');
    expect(vars.get('journalDesk.editor.package.title')).toBe('First title');
    expect(vars.get('journalDesk.recoveryText')).toContain('My unsaved wording');
    expect(vars.get('journalDesk.valueRevision')).not.toBe(revision);
    await desk.act('restoreConflict');
    expect(vars.get('journalDesk.editor.package.title')).toBe('My unsaved wording');
    expect(vars.get('journalDesk.editor.concurrencyToken')).toBe('latest');
  });
});
