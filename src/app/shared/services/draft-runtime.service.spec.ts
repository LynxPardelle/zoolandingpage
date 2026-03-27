import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ConfigSourceService } from './config-source.service';
import { DomainResolverService } from './domain-resolver.service';
import { DraftRegistryService } from './draft-registry.service';
import { DraftRuntimeService } from './draft-runtime.service';

describe('DraftRuntimeService', () => {
  const originalUrl = window.location.pathname + window.location.search + window.location.hash;
  let router: jasmine.SpyObj<Router>;

  const configure = (requestUrl: string, siteConfig: unknown = null, options?: { browserMode?: boolean }) => {
    const nextUrl = new URL(requestUrl);
    window.history.replaceState({}, '', `${ nextUrl.pathname }${ nextUrl.search }${ nextUrl.hash }`);
    const loadSiteConfig = jasmine.createSpy('loadSiteConfig').and.resolveTo(siteConfig);

    const providers: any[] = [
      DraftRuntimeService,
      DomainResolverService,
      {
        provide: Router,
        useValue: router,
      },
      {
        provide: DraftRegistryService,
        useValue: {
          listDrafts: () => of([]),
        },
      },
      {
        provide: ConfigSourceService,
        useValue: {
          loadSiteConfig,
        },
      },
    ];

    if (!options?.browserMode) {
      providers.splice(2, 0, {
        provide: REQUEST,
        useValue: new Request(requestUrl),
      });
    }

    TestBed.configureTestingModule({
      providers,
    });

    return {
      service: TestBed.inject(DraftRuntimeService),
      loadSiteConfig,
    };
  };

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    TestBed.resetTestingModule();
  });

  it('resolves the draft page from site-config routes when no explicit draftPageId is present', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/servicios?draftDomain=pamelabetancourt.preview',
      {
        version: 1,
        domain: 'pamelabetancourt.preview',
        defaultPageId: 'home',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('pamelabetancourt.preview');
    expect(context.pageId).toBe('servicios');
    expect(context.path).toBe('/servicios');
    expect(service.activeDraftPageId()).toBe('servicios');
  });

  it('does not consult site-config when draftPageId is explicitly provided', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/servicios?draftDomain=pamelabetancourt.preview&draftPageId=contactame',
      {
        version: 1,
        domain: 'pamelabetancourt.preview',
        defaultPageId: 'home',
        routes: [
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).not.toHaveBeenCalled();
    expect(context.pageId).toBe('contactame');
    expect(context.explicitPageId).toBeTrue();
    expect(service.activeDraftPageId()).toBe('contactame');
  });

  it('matches encoded route paths against unicode site-config entries', async () => {
    const { service } = configure(
      'https://example.test/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview',
      {
        version: 1,
        domain: 'pamelabetancourt.preview',
        defaultPageId: 'home',
        routes: [
          { path: '/contáctame', pageId: 'contactame' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.pageId).toBe('contactame');
    expect(context.path).toBe('/contáctame');
    expect(service.activeDraftPageId()).toBe('contactame');
  });

  it('uses Angular Router for draft selection on the client', () => {
    const { service } = configure(
      'https://example.test/home?draftDomain=pamelabetancourt.preview&debugWorkspace=true',
      {
        version: 1,
        domain: 'pamelabetancourt.preview',
        defaultPageId: 'home',
        routes: [
          { path: '/home', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
      { browserMode: true },
    );

    service.selectDraftByKey('pamelabetancourt.preview::servicios');

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home?draftDomain=pamelabetancourt.preview&debugWorkspace=true&draftPageId=servicios');
  });

  it('recomputes the active draft domain and page after client-side draft switching', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/home?draftDomain=pamelabetancourt.preview&draftPageId=home&debugWorkspace=true',
      {
        version: 1,
        domain: 'pamelabetancourt.preview',
        defaultPageId: 'home',
        routes: [
          { path: '/home', pageId: 'home' },
        ],
      },
      { browserMode: true },
    );

    await service.resolveActiveDraftContext();
    expect(service.activeDraftDomain()).toBe('pamelabetancourt.preview');
    expect(service.activeDraftPageId()).toBe('home');

    loadSiteConfig.and.resolveTo({
      version: 1,
      domain: 'music.lynxpardelle.com',
      defaultPageId: 'default',
      routes: [
        { path: '/home', pageId: 'default' },
      ],
    });
    window.history.replaceState({}, '', '/home?draftDomain=music.lynxpardelle.com&draftPageId=default&debugWorkspace=true');

    const nextContext = await service.resolveActiveDraftContext();

    expect(nextContext.domain).toBe('music.lynxpardelle.com');
    expect(nextContext.pageId).toBe('default');
    expect(service.activeDraftDomain()).toBe('music.lynxpardelle.com');
    expect(service.activeDraftPageId()).toBe('default');
  });

});
