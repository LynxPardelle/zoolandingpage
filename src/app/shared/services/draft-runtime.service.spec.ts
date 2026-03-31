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

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('pamelabetancourt.preview');
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

  it('falls back to defaultPageId when the current route is not mapped in site-config', async () => {
    const { service } = configure(
      'https://example.test/no-existe?draftDomain=pamelabetancourt.preview',
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

    expect(context.pageId).toBe('home');
    expect(context.path).toBe('/no-existe');
    expect(service.activeDraftPageId()).toBe('home');
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

  it('auto-enables the debug workspace on localhost when no draft identity is resolved', () => {
    const { service } = configure(
      'http://localhost:4200/',
      null,
      { browserMode: true },
    );

    expect(service.hasResolvedActiveDraftIdentity()).toBeFalse();
    expect(service.hasDebugWorkspaceEnabled()).toBeTrue();
  });

  it('recovers malformed encoded draftDomain keys on the client and normalizes the URL', async () => {
    const { service, loadSiteConfig } = configure(
      'http://localhost:4200/?debugWorkspace=true&draftDomain%3Dzoolandingpage.com.mx=&draftPageId=default',
      {
        version: 1,
        domain: 'zoolandingpage.com.mx',
        defaultPageId: 'default',
        routes: [
          { path: '/', pageId: 'default' },
        ],
      },
      { browserMode: true },
    );

    const context = await service.resolveActiveDraftContext();
    const params = new URLSearchParams(window.location.search);

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('zoolandingpage.com.mx');
    expect(context.domain).toBe('zoolandingpage.com.mx');
    expect(context.pageId).toBe('default');
    expect(service.activeDraftDomain()).toBe('zoolandingpage.com.mx');
    expect(params.get('draftDomain')).toBe('zoolandingpage.com.mx');
    expect(Array.from(params.keys()).some((key) => key.startsWith('draftDomain='))).toBeFalse();
  });

  it('ignores the internal debug workspace payload when it appears as the active draft identity', async () => {
    const { service, loadSiteConfig } = configure(
      'http://localhost:4200/?debugWorkspace=true&draftDomain=_debug&draftPageId=debug-workspace',
      null,
      { browserMode: true },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).not.toHaveBeenCalled();
    expect(context.domain).toBe('');
    expect(context.pageId).toBe('');
    expect(service.activeDraftDomain()).toBe('');
    expect(service.activeDraftPageId()).toBe('');
    expect(service.hasResolvedActiveDraftIdentity()).toBeFalse();
  });

  it('filters the internal debug workspace payload out of draft options', () => {
    const { service } = configure(
      'http://localhost:4200/?debugWorkspace=true&draftDomain=zoolandingpage.com.mx&draftPageId=default',
      null,
      { browserMode: true },
    );

    service.availableDrafts.set([
      { domain: '_debug', pageId: 'debug-workspace' },
      { domain: 'zoolandingpage.com.mx', pageId: 'default' },
      { domain: 'music.lynxpardelle.com', pageId: 'default' },
    ]);

    expect(service.draftOptions().map((entry) => entry.key)).toEqual([
      'music.lynxpardelle.com::default',
      'zoolandingpage.com.mx::default',
    ]);
  });

  it('does not navigate when asked to select the internal debug workspace payload', () => {
    const { service } = configure(
      'http://localhost:4200/?debugWorkspace=true&draftDomain=zoolandingpage.com.mx&draftPageId=default',
      null,
      { browserMode: true },
    );

    service.selectDraftByKey('_debug::debug-workspace');

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

});
