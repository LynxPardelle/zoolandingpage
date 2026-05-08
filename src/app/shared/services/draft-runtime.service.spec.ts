import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { of } from 'rxjs';
import { ConfigSourceService } from './config-source.service';
import { DomainResolverService } from './domain-resolver.service';
import { DraftRegistryService } from './draft-registry.service';
import { DraftRuntimeService } from './draft-runtime.service';

describe('DraftRuntimeService', () => {
  const originalUrl = window.location.pathname + window.location.search + window.location.hash;
  const originalProduction = environment.production;
  const originalDevelopment = environment.development;
  const originalDraftsEnabled = environment.drafts.enabled;

  const configure = (requestUrl: string, siteConfig: unknown = null, options?: { browserMode?: boolean }) => {
    const nextUrl = new URL(requestUrl);
    window.history.replaceState({}, '', `${ nextUrl.pathname }${ nextUrl.search }${ nextUrl.hash }`);
    const loadSiteConfig = jasmine.createSpy('loadSiteConfig').and.resolveTo(siteConfig);

    const providers: any[] = [
      DraftRuntimeService,
      DomainResolverService,
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

  afterEach(() => {
    (environment as { production: boolean; development: boolean }).production = originalProduction;
    (environment as { production: boolean; development: boolean }).development = originalDevelopment;
    (environment.drafts as { enabled: boolean }).enabled = originalDraftsEnabled;
    window.history.replaceState({}, '', originalUrl);
    TestBed.resetTestingModule();
  });

  it('resolves the draft page from site-config routes when no explicit draftPageId is present', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/servicios?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('pamelabetancourt.com');
    expect(context.pageId).toBe('servicios');
    expect(context.path).toBe('/servicios');
    expect(service.activeDraftPageId()).toBe('servicios');
  });

  it('does not consult site-config when draftPageId is explicitly provided', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/servicios?draftDomain=pamelabetancourt.com&draftPageId=contactame',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        routes: [
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('pamelabetancourt.com');
    expect(context.pageId).toBe('contactame');
    expect(context.explicitPageId).toBeTrue();
    expect(service.activeDraftPageId()).toBe('contactame');
  });

  it('matches encoded route paths against unicode site-config entries', async () => {
    const { service } = configure(
      'https://example.test/cont%C3%A1ctame?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
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
      'https://example.test/no-existe?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
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

  it('uses History API for draft selection on the client', () => {
    const { service } = configure(
      'https://example.test/home?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        routes: [
          { path: '/home', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
        ],
      },
      { browserMode: true },
    );

    service.selectDraftByKey('pamelabetancourt.com::servicios');

    expect(window.location.pathname + window.location.search).toBe('/home?draftDomain=pamelabetancourt.com&debugWorkspace=true&draftPageId=servicios');
  });

  it('recomputes the active draft domain and page after client-side draft switching', async () => {
    const { service, loadSiteConfig } = configure(
      'https://example.test/home?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        routes: [
          { path: '/home', pageId: 'home' },
        ],
      },
      { browserMode: true },
    );

    await service.resolveActiveDraftContext();
    expect(service.activeDraftDomain()).toBe('pamelabetancourt.com');
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

  it('auto-enables the debug workspace on localhost when a draft identity is resolved', () => {
    const { service } = configure(
      'http://127.0.0.1:4200/servicios?draftDomain=pamelabetancourt.com&draftPageId=servicios',
      null,
      { browserMode: true },
    );

    expect(service.hasResolvedActiveDraftIdentity()).toBeTrue();
    expect(service.hasDebugWorkspaceEnabled()).toBeTrue();
  });

  it('allows local visual QA to explicitly hide the debug workspace', () => {
    const { service } = configure(
      'http://127.0.0.1:4200/?draftDomain=music.lynxpardelle.com&draftPageId=default&debugWorkspace=false',
      null,
      { browserMode: true },
    );

    expect(service.hasResolvedActiveDraftIdentity()).toBeTrue();
    expect(service.hasDebugWorkspaceEnabled()).toBeFalse();
  });

  it('keeps the debug workspace hidden on non-local production hosts without the query flag', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const { service } = configure(
      'https://pamelabetancourt.zoolandingpage.com.mx/servicios?draftDomain=pamelabetancourt.com',
      null,
    );

    expect(service.hasDebugWorkspaceEnabled()).toBeFalse();
  });

  it('allows the debug workspace on non-local hosts when debugWorkspace is present', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const { service } = configure(
      'https://pamelabetancourt.zoolandingpage.com.mx/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      null,
    );

    expect(service.hasDebugWorkspaceEnabled()).toBeTrue();
  });

  it('hides draft options and suppresses draft selection on non-local debug workspaces', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const { service } = configure(
      'https://test.zoolandingpage.com.mx/?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true',
      null,
    );

    service.availableDrafts.set([
      { domain: 'pamelabetancourt.com', pageId: 'home' },
      { domain: 'music.lynxpardelle.com', pageId: 'default' },
    ]);
    service.selectDraftByKey('music.lynxpardelle.com::default');

    expect(service.canShowDraftRegistry()).toBeFalse();
    expect(service.draftOptions()).toEqual([]);
    expect(window.location.pathname + window.location.search).toBe('/?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true');
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

    expect(window.location.pathname + window.location.search).toBe('/?debugWorkspace=true&draftDomain=zoolandingpage.com.mx&draftPageId=default');
  });

});
