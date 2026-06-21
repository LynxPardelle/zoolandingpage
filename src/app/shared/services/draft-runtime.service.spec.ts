import { PLATFORM_ID, REQUEST } from '@angular/core';
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
  const nativeHistoryReplaceState = History.prototype.replaceState;

  const readSearchParam = (params: URLSearchParams, key: string): string => {
    const direct = String(params.get(key) ?? '').trim();
    if (direct.length > 0) {
      return direct;
    }

    for (const [entryKey] of params.entries()) {
      const normalizedKey = String(entryKey ?? '').trim();
      if (!normalizedKey.startsWith(`${ key }=`)) {
        continue;
      }

      const value = normalizedKey.slice(key.length + 1).trim();
      if (value.length > 0) {
        return value;
      }
    }

    return '';
  };

  const isLocalHost = (hostname: string): boolean => {
    const normalized = String(hostname ?? '').trim().toLowerCase();
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
  };

  const canUseDraftQueryParamsOnHost = (hostname: string): boolean => {
    const normalized = String(hostname ?? '').trim().toLowerCase();
    return isLocalHost(normalized) || normalized === 'test.zoolandingpage.com.mx';
  };

  const normalizePath = (path: string): string => {
    const trimmed = String(path ?? '').trim() || '/';
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  };

  const createDomainResolver = (requestUrl: () => URL) => ({
    canUseDraftQueryParamsOnHost,
    resolveDomain: () => {
      const url = requestUrl();
      const queryDomain = readSearchParam(url.searchParams, 'draftDomain');
      if (queryDomain && canUseDraftQueryParamsOnHost(url.hostname)) {
        return { domain: queryDomain, source: 'queryParam' as const };
      }

      if (url.hostname && !isLocalHost(url.hostname)) {
        return { domain: url.hostname, source: 'urlHost' as const };
      }

      return { domain: '', source: 'unresolved' as const };
    },
  });

  const setBrowserUrl = (requestUrl: string): void => {
    const nextUrl = new URL(requestUrl);
    nativeHistoryReplaceState.call(window.history, {}, '', `${ nextUrl.pathname }${ nextUrl.search }${ nextUrl.hash }`);
  };

  const validPageConfig = (domain: string, pageId: string) => ({
    version: 1,
    domain,
    pageId,
    rootIds: ['root'],
  });

  const validComponents = (domain: string, pageId: string) => ({
    version: 1,
    domain,
    pageId,
    components: [
      {
        id: 'root',
        type: 'container',
        config: {},
      },
    ],
  });

  const configure = (
    requestUrl: string,
    siteConfig: unknown = null,
    options?: {
      browserMode?: boolean;
      pageConfigByKey?: Record<string, unknown | null>;
      componentsByKey?: Record<string, unknown | null>;
    },
  ) => {
    let nextUrl = new URL(requestUrl);
    setBrowserUrl(requestUrl);
    const resolveSiteConfig = typeof siteConfig === 'function'
      ? siteConfig as (domain: string) => unknown
      : () => siteConfig;
    const loadSiteConfig = jasmine.createSpy('loadSiteConfig').and.callFake((domain: string) => Promise.resolve(resolveSiteConfig(domain)));
    const loadPageConfig = jasmine.createSpy('loadPageConfig').and.callFake((domain: string, pageId: string) => {
      const key = `${ domain }::${ pageId }`;
      if (options?.pageConfigByKey && key in options.pageConfigByKey) {
        return Promise.resolve(options.pageConfigByKey[key]);
      }

      return Promise.resolve(validPageConfig(domain, pageId));
    });
    const loadComponents = jasmine.createSpy('loadComponents').and.callFake((domain: string, pageId: string) => {
      const key = `${ domain }::${ pageId }`;
      if (options?.componentsByKey && key in options.componentsByKey) {
        return Promise.resolve(options.componentsByKey[key]);
      }

      return Promise.resolve(validComponents(domain, pageId));
    });

    const providers: any[] = [
      DraftRuntimeService,
      {
        provide: DomainResolverService,
        useValue: createDomainResolver(() => nextUrl),
      },
      {
        provide: PLATFORM_ID,
        useValue: options?.browserMode ? 'browser' : 'server',
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
          loadPageConfig,
          loadComponents,
        },
      },
    ];

    providers.splice(
      3,
      0,
      {
        provide: REQUEST,
        useValue: new Request(requestUrl),
      },
    );

    TestBed.configureTestingModule({
      providers,
    });

    const service = TestBed.inject(DraftRuntimeService);
    let setUrl = (url: string) => setBrowserUrl(url);
    if (options?.browserMode) {
      const resolveSearchParams = spyOn<any>(service, 'resolveSearchParams').and.returnValue(nextUrl.searchParams);
      const resolvePathname = spyOn<any>(service, 'resolvePathname').and.returnValue(normalizePath(nextUrl.pathname));
      const isLocalRuntimeHostSpy = spyOn<any>(service, 'isLocalRuntimeHost').and.returnValue(isLocalHost(nextUrl.hostname));
      const canUseDraftQueryParamsOnRuntimeHostSpy = spyOn<any>(service, 'canUseDraftQueryParamsOnRuntimeHost').and.returnValue(canUseDraftQueryParamsOnHost(nextUrl.hostname));
      setUrl = (url: string) => {
        nextUrl = new URL(url);
        setBrowserUrl(url);
        resolveSearchParams.and.returnValue(nextUrl.searchParams);
        resolvePathname.and.returnValue(normalizePath(nextUrl.pathname));
        isLocalRuntimeHostSpy.and.returnValue(isLocalHost(nextUrl.hostname));
        canUseDraftQueryParamsOnRuntimeHostSpy.and.returnValue(canUseDraftQueryParamsOnHost(nextUrl.hostname));
      };
    }

    return {
      service,
      loadSiteConfig,
      loadPageConfig,
      loadComponents,
      setUrl,
    };
  };

  afterEach(() => {
    (environment as { production: boolean; development: boolean }).production = originalProduction;
    (environment as { production: boolean; development: boolean }).development = originalDevelopment;
    (environment.drafts as { enabled: boolean }).enabled = originalDraftsEnabled;
    nativeHistoryReplaceState.call(window.history, {}, '', originalUrl);
    TestBed.resetTestingModule();
  });

  it('resolves the draft page from site-config routes when no explicit draftPageId is present', async () => {
    const { service, loadSiteConfig } = configure(
      'https://test.zoolandingpage.com.mx/servicios?draftDomain=pamelabetancourt.com',
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
      'https://test.zoolandingpage.com.mx/servicios?draftDomain=pamelabetancourt.com&draftPageId=contactame',
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
      'https://test.zoolandingpage.com.mx/cont%C3%A1ctame?draftDomain=pamelabetancourt.com',
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

  it('keeps the root route on the draft default page', async () => {
    const { service } = configure(
      'https://test.zoolandingpage.com.mx/?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        notFoundPageId: 'not-found',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/404', pageId: 'not-found' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.pageId).toBe('home');
    expect(context.path).toBe('/');
    expect(service.activeDraftPageId()).toBe('home');
  });

  it('uses the configured notFoundPageId when the current route is not mapped in site-config', async () => {
    const { service, loadPageConfig, loadComponents } = configure(
      'https://test.zoolandingpage.com.mx/no-existe?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        notFoundPageId: 'not-found',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
          { path: '/404', pageId: 'not-found' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.pageId).toBe('not-found');
    expect(context.path).toBe('/no-existe');
    expect(context.route?.path).toBe('/404');
    expect(service.activeDraftPageId()).toBe('not-found');
    expect(loadPageConfig).toHaveBeenCalledWith('pamelabetancourt.com', 'not-found');
    expect(loadComponents).toHaveBeenCalledWith('pamelabetancourt.com', 'not-found');
  });

  it('uses the /404 route as the draft not-found page when notFoundPageId is omitted', async () => {
    const { service } = configure(
      'https://test.zoolandingpage.com.mx/no-existe?draftDomain=pamelabetancourt.com',
      {
        version: 1,
        domain: 'pamelabetancourt.com',
        defaultPageId: 'home',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/servicios', pageId: 'servicios' },
          { path: '/404', pageId: 'not-found' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.pageId).toBe('not-found');
    expect(context.path).toBe('/no-existe');
    expect(service.activeDraftPageId()).toBe('not-found');
  });

  it('falls back to the canonical Zoolanding 404 when the draft cannot resolve a valid not-found page', async () => {
    const { service } = configure(
      'https://test.zoolandingpage.com.mx/no-existe?draftDomain=missing404.example.com',
      (domain: string) => {
        if (domain === 'missing404.example.com') {
          return {
            version: 1,
            domain,
            defaultPageId: 'home',
            routes: [
              { path: '/', pageId: 'home' },
            ],
          };
        }

        if (domain === 'zoolandingpage.com.mx') {
          return {
            version: 1,
            domain,
            defaultPageId: 'default',
            notFoundPageId: 'not-found',
            routes: [
              { path: '/', pageId: 'default' },
              { path: '/404', pageId: 'not-found' },
            ],
          };
        }

        return null;
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.domain).toBe('zoolandingpage.com.mx');
    expect(context.pageId).toBe('not-found');
    expect(context.path).toBe('/no-existe');
  });

  it('ignores cross-draft domain query params on branded production hosts', async () => {
    const { service, loadSiteConfig } = configure(
      'https://music.lynxpardelle.com/?draftDomain=zoolandingpage.com.mx&draftPageId=default',
      {
        version: 1,
        domain: 'music.lynxpardelle.com',
        defaultPageId: 'default',
        routes: [
          { path: '/', pageId: 'default' },
        ],
      },
    );

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('music.lynxpardelle.com');
    expect(context.domain).toBe('music.lynxpardelle.com');
    expect(context.pageId).toBe('default');
  });

  it('uses History API for draft selection on the client', () => {
    const initialUrl = 'http://localhost:4200/home?draftDomain=pamelabetancourt.com&debugWorkspace=true';
    const { service } = configure(
      initialUrl,
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
    setBrowserUrl(initialUrl);
    const pushState = spyOn(window.history, 'pushState').and.callThrough();

    service.selectDraftByKey('pamelabetancourt.com::servicios');

    const pushedPath = String(pushState.calls.mostRecent().args[2] ?? '');
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushedPath).toContain('draftDomain=pamelabetancourt.com');
    expect(pushedPath).toContain('draftPageId=servicios');
  });

  it('recomputes the active draft domain and page after client-side draft switching', async () => {
    const initialUrl = 'http://localhost:4200/home?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true';
    const { service, loadSiteConfig, setUrl } = configure(
      initialUrl,
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
    setBrowserUrl(initialUrl);

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
    setUrl('http://localhost:4200/home?draftDomain=music.lynxpardelle.com&draftPageId=default&debugWorkspace=true');

    const nextContext = await service.resolveActiveDraftContext();

    expect(nextContext.domain).toBe('music.lynxpardelle.com');
    expect(nextContext.pageId).toBe('default');
    expect(service.activeDraftDomain()).toBe('music.lynxpardelle.com');
    expect(service.activeDraftPageId()).toBe('default');
  });

  it('resolves parameterized draft routes for SEO article URLs', async () => {
    const { service } = configure(
      'https://test.zoolandingpage.com.mx/blog/web/blog-builder-seo?draftDomain=zoositioweb.com.mx&debugWorkspace=false',
      {
        version: 1,
        domain: 'zoositioweb.com.mx',
        defaultPageId: 'default',
        routes: [
          { path: '/', pageId: 'default' },
          { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
        ],
      },
      { browserMode: true },
    );

    const context = await service.resolveActiveDraftContext();

    expect(context.domain).toBe('zoositioweb.com.mx');
    expect(context.pageId).toBe('blog-article');
    expect(context.route?.path).toBe('/blog/:categorySlug/:articleSlug');
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
    const initialUrl = 'http://127.0.0.1:4200/servicios?draftDomain=pamelabetancourt.com&draftPageId=servicios';
    const { service } = configure(
      initialUrl,
      null,
      { browserMode: true },
    );
    setBrowserUrl(initialUrl);

    expect(service.hasResolvedActiveDraftIdentity()).toBeTrue();
    expect(service.hasDebugWorkspaceEnabled()).toBeTrue();
  });

  it('allows local visual QA to explicitly hide the debug workspace', () => {
    const initialUrl = 'http://127.0.0.1:4200/?draftDomain=music.lynxpardelle.com&draftPageId=default&debugWorkspace=false';
    const { service } = configure(
      initialUrl,
      null,
      { browserMode: true },
    );
    setBrowserUrl(initialUrl);

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

  it('keeps the debug workspace hidden on branded production hosts when debugWorkspace is present', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const { service } = configure(
      'https://pamelabetancourt.zoolandingpage.com.mx/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      null,
    );

    expect(service.hasDebugWorkspaceEnabled()).toBeFalse();
  });

  it('allows the debug workspace on the shared testing preview host when debugWorkspace is present', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const { service } = configure(
      'https://test.zoolandingpage.com.mx/?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true',
      null,
    );

    expect(service.hasDebugWorkspaceEnabled()).toBeTrue();
  });

  it('hides draft options and suppresses draft selection on non-local debug workspaces', () => {
    (environment as { production: boolean; development: boolean }).production = true;
    (environment as { production: boolean; development: boolean }).development = false;

    const initialUrl = 'https://test.zoolandingpage.com.mx/?draftDomain=pamelabetancourt.com&draftPageId=home&debugWorkspace=true';
    const { service } = configure(
      initialUrl,
      null,
    );
    setBrowserUrl(initialUrl);
    const pushState = spyOn(window.history, 'pushState').and.callThrough();

    service.availableDrafts.set([
      { domain: 'pamelabetancourt.com', pageId: 'home' },
      { domain: 'music.lynxpardelle.com', pageId: 'default' },
    ]);
    service.selectDraftByKey('music.lynxpardelle.com::default');

    expect(service.canShowDraftRegistry()).toBeFalse();
    expect(service.draftOptions()).toEqual([]);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('recovers malformed encoded draftDomain keys on the client and normalizes the URL', async () => {
    const initialUrl = 'http://localhost:4200/?debugWorkspace=true&draftDomain%3Dzoolandingpage.com.mx=&draftPageId=default';
    const { service, loadSiteConfig } = configure(
      initialUrl,
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
    setBrowserUrl(initialUrl);

    const context = await service.resolveActiveDraftContext();

    expect(loadSiteConfig).toHaveBeenCalledOnceWith('zoolandingpage.com.mx');
    expect(context.domain).toBe('zoolandingpage.com.mx');
    expect(context.pageId).toBe('default');
    expect(service.activeDraftDomain()).toBe('zoolandingpage.com.mx');
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
    const initialUrl = 'http://localhost:4200/?debugWorkspace=true&draftDomain=zoolandingpage.com.mx&draftPageId=default';
    const { service } = configure(
      initialUrl,
      null,
      { browserMode: true },
    );
    setBrowserUrl(initialUrl);
    const pushState = spyOn(window.history, 'pushState').and.callThrough();

    service.selectDraftByKey('_debug::debug-workspace');

    expect(pushState).not.toHaveBeenCalled();
  });

});
