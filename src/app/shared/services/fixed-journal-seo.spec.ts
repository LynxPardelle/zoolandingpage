import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {ConfigStoreService} from './config-store.service';
import {DomainResolverService} from './domain-resolver.service';
import {RuntimeConfigService} from './runtime-config.service';
import {SeoMetadataService} from './seo-metadata.service';
import type {TDraftSiteConfigPayload} from '../types/config-payloads.types';

describe('fixed Journal published-language SEO', () => {
  it('does not advertise an unpublished English translation', () => {
    const doc=document.implementation.createHTMLDocument('journal');
    TestBed.configureTestingModule({providers:[
      {provide:DOCUMENT,useValue:doc},
      {provide:DomainResolverService,useValue:{resolveDomain:()=>({domain:'thehairnarrative.com'})}},
      {provide:RuntimeConfigService,useValue:{seoDefaults:()=>null,appName:()=>'',appDescription:()=>''}},
    ]});
    const store=TestBed.inject(ConfigStoreService);
    store.setSiteConfig({version:1,domain:'thehairnarrative.com',defaultPageId:'home',routes:[],
      site:{i18n:{defaultLanguage:'en',supportedLanguages:['en','es']}},
      runtime:{contentHubs:[{hubId:'journal',routeBasePath:'/the-journal',localePolicy:'published-only',publicArticles:[
        {articleId:'article-a',locale:'es',status:'published',title:'Forma',categorySlug:'forma-y-movimiento',
          path:'/the-journal/forma-y-movimiento/forma',publishedAt:'2026-09-08T00:00:00Z'},
      ]}]}} as unknown as TDraftSiteConfigPayload);
    store.setStage('done');
    TestBed.inject(SeoMetadataService).apply('es',{title:'Forma',canonical:'https://thehairnarrative.com/the-journal/forma-y-movimiento/forma?lang=es'});
    expect(doc.head.querySelector('[hreflang="en"]')).toBeNull();
    expect(doc.head.querySelector('[hreflang="es"]')?.getAttribute('href')).toBe('https://thehairnarrative.com/the-journal/forma-y-movimiento/forma?lang=es');
    expect(doc.head.querySelector('[hreflang="x-default"]')?.getAttribute('href')).toContain('lang=es');
  });
});
