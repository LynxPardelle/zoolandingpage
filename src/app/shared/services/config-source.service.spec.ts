import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeBundlePayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { TestBed } from '@angular/core/testing';
import { ConfigApiService } from './config-api.service';
import { ConfigSourceService } from './config-source.service';
import { ConfigStoreService } from './config-store.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { LanguageService } from './language.service';

const nativeHistoryReplaceState = History.prototype.replaceState;
const setBrowserUrl = (url: string): void => {
    nativeHistoryReplaceState.call(window.history, {}, '', url);
};

describe('ConfigSourceService', () => {
    let originalDraftsEnabled: boolean;

    const themePalette = {
        bgColor: '#ffffff',
        textColor: '#111111',
        titleColor: '#111111',
        linkColor: '#0055ff',
        accentColor: '#22aa55',
        secondaryBgColor: '#f4f4f4',
        secondaryTextColor: '#222222',
        secondaryTitleColor: '#111111',
        secondaryLinkColor: '#6633ff',
        secondaryAccentColor: '#ff9933',
        successColor: '#198754',
        onSuccessColor: '#ffffff',
        errorColor: '#dc3545',
        onErrorColor: '#ffffff',
        warningColor: '#f5b942',
        onWarningColor: '#111111',
        infoColor: '#0d6efd',
        onInfoColor: '#ffffff',
    };

    const siteConfigPayload: TDraftSiteConfigPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        aliases: ['alecfest-voliii.zoolandingpage.com.mx'],
        defaultPageId: 'default',
        routes: [{ path: '/', pageId: 'default', label: 'Home' }],
        site: {
            appIdentity: {
                identifier: 'alecfestvoliiicom',
                name: 'Alecfest',
            },
            theme: {
                palettes: {
                    light: themePalette,
                    dark: themePalette,
                },
            },
            i18n: {
                defaultLanguage: 'es',
                supportedLanguages: ['es'],
            },
        },
    };

    const pageConfigPayload: TPageConfigPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        rootIds: ['home'],
        modalRootIds: [],
    };

    const componentsPayload: TComponentsPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        components: [
            {
                id: 'home',
                type: 'container',
                config: { components: [] },
            },
        ],
    };

    const i18nPayload: TI18nPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        lang: 'es',
        dictionary: {},
    };

    const createRuntimeBundle = (overrides: Partial<TRuntimeBundlePayload> = {}): TRuntimeBundlePayload => ({
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        sourceStage: 'published',
        versionId: '20260405T000000Z-test',
        lang: 'es',
        generatedAt: '2026-04-05T00:00:00Z',
        route: { pageId: 'default', path: '/', label: 'Home' },
        lifecycle: {
            updatedBy: 'test',
            status: 'active',
            fallbackMode: 'system',
            updatedAt: '2026-04-05T00:00:00Z',
        },
        siteConfig: siteConfigPayload,
        pageConfig: pageConfigPayload,
        components: componentsPayload,
        variables: null,
        angoraCombos: null,
        i18n: i18nPayload,
        metadata: {
            requestId: 'req-1',
            requestedDomain: 'alecfest-voliii.zoolandingpage.com.mx',
            resolvedAlias: 'alecfest-voliii.zoolandingpage.com.mx',
            resolvedPath: '/',
            bucket: 'bucket',
            prefix: 'prefix',
        },
        ...overrides,
    });

    const variablesPayload: TVariablesPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        variables: { nav: [] },
    };

    const combosPayload: TAngoraCombosPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        combos: { hero: ['ank-bg-primary'] },
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
        setBrowserUrl('/context.html');
        originalDraftsEnabled = environment.drafts.enabled;
        (environment.drafts as { enabled: boolean }).enabled = false;

        TestBed.configureTestingModule({
            providers: [
                ConfigSourceService,
                {
                    provide: ConfigApiService,
                    useValue: {
                        getRuntimeBundle: jasmine.createSpy('getRuntimeBundle').and.resolveTo(createRuntimeBundle()),
                        getSiteConfig: jasmine.createSpy('getSiteConfig').and.resolveTo(null),
                        getPageConfig: jasmine.createSpy('getPageConfig').and.resolveTo(null),
                        getComponents: jasmine.createSpy('getComponents').and.resolveTo(null),
                        getVariables: jasmine.createSpy('getVariables').and.resolveTo(variablesPayload),
                        getAngoraCombos: jasmine.createSpy('getAngoraCombos').and.resolveTo(combosPayload),
                        getI18n: jasmine.createSpy('getI18n').and.resolveTo(null),
                        getDebugWorkspacePageConfig: jasmine.createSpy('getDebugWorkspacePageConfig').and.resolveTo(null),
                        getDebugWorkspaceComponents: jasmine.createSpy('getDebugWorkspaceComponents').and.resolveTo(null),
                        getDebugWorkspaceAngoraCombos: jasmine.createSpy('getDebugWorkspaceAngoraCombos').and.resolveTo(null),
                    },
                },
                {
                    provide: DraftConfigLoaderService,
                    useValue: {
                        loadDebugWorkspacePageConfig: jasmine.createSpy('loadDebugWorkspacePageConfig').and.resolveTo(pageConfigPayload),
                        loadDebugWorkspaceComponents: jasmine.createSpy('loadDebugWorkspaceComponents').and.resolveTo(componentsPayload),
                        loadDebugWorkspaceCombos: jasmine.createSpy('loadDebugWorkspaceCombos').and.resolveTo(combosPayload),
                    },
                },
                ConfigStoreService,
                {
                    provide: LanguageService,
                    useValue: {
                        currentLanguage: () => 'es',
                    },
                },
            ],
        });
    });

    afterEach(() => {
        (environment.drafts as { enabled: boolean }).enabled = originalDraftsEnabled;
        setBrowserUrl('/context.html');
        TestBed.resetTestingModule();
    });

    it('returns null variables from the bundle without calling the legacy endpoint', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        const result = await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toBeNull();
        expect(api.getVariables).not.toHaveBeenCalled();
    });

    it('returns null angora combos from the bundle without calling the legacy endpoint', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        const result = await service.loadCombos('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toBeNull();
        expect(api.getAngoraCombos).not.toHaveBeenCalled();
    });

    it('falls back to variables using the canonical bundle identity when the field is absent from the bundle payload', async () => {
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const bundleWithoutVariables = { ...createRuntimeBundle() } as Record<string, unknown>;
        delete bundleWithoutVariables['variables'];
        api.getRuntimeBundle.and.resolveTo(bundleWithoutVariables as unknown as TRuntimeBundlePayload);

        const service = TestBed.inject(ConfigSourceService);
        await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(api.getVariables).toHaveBeenCalledWith('alecfest-voliii.com', 'default');
    });

    it('falls back to angora combos using the canonical bundle identity when the field is absent from the bundle payload', async () => {
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const bundleWithoutCombos = { ...createRuntimeBundle() } as Record<string, unknown>;
        delete bundleWithoutCombos['angoraCombos'];
        api.getRuntimeBundle.and.resolveTo(bundleWithoutCombos as unknown as TRuntimeBundlePayload);

        const service = TestBed.inject(ConfigSourceService);
        await service.loadCombos('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(api.getAngoraCombos).toHaveBeenCalledWith('alecfest-voliii.com', 'default');
    });

    it('returns bundled variables without hitting the legacy endpoint when they are already present', async () => {
        const bundledVariables: TVariablesPayload = {
            version: 1,
            domain: 'alecfest-voliii.com',
            pageId: 'default',
            variables: { featureFlags: { ready: true } },
        };

        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        api.getRuntimeBundle.and.resolveTo(createRuntimeBundle({ variables: bundledVariables }));

        const service = TestBed.inject(ConfigSourceService);
        const result = await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toEqual(bundledVariables);
        expect(api.getVariables).not.toHaveBeenCalled();
    });

    it('warms a target route so the next bundle-backed page load reuses the cached runtime request', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        await service.prefetchRoute('alecfest-voliii.zoolandingpage.com.mx', {
            pageId: 'default',
            lang: 'es',
            path: '/servicios',
        });

        spyOn<any>(service, 'resolveActivePath').and.returnValue('/servicios');
        await service.loadComponents('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(api.getRuntimeBundle.calls.count()).toBe(1);
    });

    it('keeps runtime bundle cache entries separate for the same page id on different paths', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        api.getRuntimeBundle.and.callFake((_domain: string, options?: { readonly path?: string }) => Promise.resolve(createRuntimeBundle({
            pageId: 'blog-article',
            pageConfig: {
                ...pageConfigPayload,
                pageId: 'blog-article',
                rootIds: [options?.path === '/blog/web/two' ? 'twoRoot' : 'oneRoot'],
            },
            metadata: {
                requestId: 'req-path',
                requestedDomain: 'alecfest-voliii.zoolandingpage.com.mx',
                resolvedAlias: 'alecfest-voliii.zoolandingpage.com.mx',
                resolvedPath: options?.path,
            },
        })));

        const first = await service.loadPageConfig('alecfest-voliii.zoolandingpage.com.mx', 'blog-article', {
            path: '/blog/web/one',
        });
        const second = await service.loadPageConfig('alecfest-voliii.zoolandingpage.com.mx', 'blog-article', {
            path: '/blog/web/two',
        });

        expect(first?.rootIds).toEqual(['oneRoot']);
        expect(second?.rootIds).toEqual(['twoRoot']);
        expect(api.getRuntimeBundle.calls.count()).toBe(2);
        expect(api.getRuntimeBundle.calls.allArgs().map(([, options]) => options?.path)).toEqual([
            '/blog/web/one',
            '/blog/web/two',
        ]);
    });

    it('does not call the legacy page endpoint in the browser when the route runtime bundle has no renderable roots', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        api.getRuntimeBundle.and.resolveTo(createRuntimeBundle({
            pageId: 'blog-article',
            pageConfig: {
                ...pageConfigPayload,
                pageId: 'blog-article',
                rootIds: [],
            },
        }));

        const result = await service.loadPageConfig('alecfest-voliii.zoolandingpage.com.mx', 'blog-article', {
            path: '/blog/web/runtime-only',
        });

        expect(result).toBeNull();
        expect(api.getPageConfig).not.toHaveBeenCalled();
    });

    it('does not call the legacy components endpoint in the browser when the route runtime bundle has no renderable components', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        api.getRuntimeBundle.and.resolveTo(createRuntimeBundle({
            pageId: 'blog-article',
            components: {
                ...componentsPayload,
                pageId: 'blog-article',
                components: [],
            },
        }));

        const result = await service.loadComponents('alecfest-voliii.zoolandingpage.com.mx', 'blog-article', {
            path: '/blog/web/runtime-only',
        });

        expect(result).toBeNull();
        expect(api.getComponents).not.toHaveBeenCalled();
    });

    it('reuses the alias runtime bundle when a site-config request resolves the canonical page identity', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        await service.loadSiteConfig('alecfest-voliii.zoolandingpage.com.mx');
        const components = await service.loadComponents('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(components).toEqual(componentsPayload);
        expect(api.getRuntimeBundle.calls.count()).toBe(1);
    });

    it('does not try synthesized shared-preview aliases when the canonical draft runtime is unavailable', async () => {
        const service = TestBed.inject(ConfigSourceService);
        spyOn<any>(service, 'isSharedTestingPreviewHost').and.returnValue(true);

        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        api.getRuntimeBundle.and.callFake((domain: string) => {
            if (domain === 'erosbarajas.com') {
                return Promise.reject(new Error('canonical runtime unavailable'));
            }

            return Promise.reject(new Error(`unexpected runtime domain ${ domain }`));
        });

        const result = await (service as unknown as {
            loadRuntimeBundle(domain: string): Promise<unknown>;
        }).loadRuntimeBundle('erosbarajas.com');

        expect(result).toBeNull();
        expect(api.getRuntimeBundle.calls.allArgs().map(([domain]) => domain)).toEqual(['erosbarajas.com']);
        expect(api.getRuntimeBundle.calls.allArgs().map(([, options]) => options?.environment)).toEqual([
            'test',
        ]);
        expect(api.getSiteConfig).not.toHaveBeenCalled();
    });

    it('requests the canonical draft domain first on shared testing detail routes', async () => {
        const service = TestBed.inject(ConfigSourceService);
        spyOn<any>(service, 'isSharedTestingPreviewHost').and.returnValue(true);

        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const zoositeSiteConfig: TDraftSiteConfigPayload = {
            ...siteConfigPayload,
            domain: 'zoositioweb.com.mx',
            aliases: ['sitiosweb.zoolandingpage.com.mx'],
        };
        api.getRuntimeBundle.and.callFake((domain: string, options?: { readonly path?: string }) => {
            const bundle = createRuntimeBundle({
                domain: 'zoositioweb.com.mx',
                pageId: 'admin-blog-articulo-editor',
                siteConfig: zoositeSiteConfig,
                pageConfig: {
                    ...pageConfigPayload,
                    domain: 'zoositioweb.com.mx',
                    pageId: 'admin-blog-articulo-editor',
                },
                components: {
                    ...componentsPayload,
                    domain: 'zoositioweb.com.mx',
                    pageId: 'admin-blog-articulo-editor',
                },
                metadata: {
                    requestId: 'req-zoosite-editor',
                    requestedDomain: domain,
                    resolvedAlias: null,
                    resolvedPath: options?.path,
                },
            });
            return Promise.resolve({
                ...bundle,
                components: {
                    ...bundle.components,
                    components: Object.fromEntries(bundle.components.components.map((component) => [component.id, component])),
                },
            } as any);
        });

        const result = await service.loadPageConfig('zoositioweb.com.mx', 'admin-blog-articulo-editor', {
            path: '/admin/blog/articulos/art_20260620_blog_builder/editor',
        });

        expect(result?.pageId).toBe('admin-blog-articulo-editor');
        expect(api.getRuntimeBundle.calls.allArgs().map(([domain]) => domain)).toEqual(['zoositioweb.com.mx']);
        expect(api.getRuntimeBundle.calls.first().args[0]).toBe('zoositioweb.com.mx');
        expect(api.getRuntimeBundle.calls.first().args[1]).toEqual(jasmine.objectContaining({
            environment: 'test',
            path: '/admin/blog/articulos/art_20260620_blog_builder/editor',
        }));
    });

    it('loads the canonical Zoolanding bundle directly on the shared testing host', async () => {
        const service = TestBed.inject(ConfigSourceService);
        spyOn<any>(service, 'isSharedTestingPreviewHost').and.returnValue(true);

        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        await service.loadSiteConfig('zoolandingpage.com.mx');

        expect(api.getRuntimeBundle.calls.allArgs().map(([domain]) => domain)).toEqual(['zoolandingpage.com.mx']);
    });

    it('reuses the hydrated site config instead of calling the legacy site-config endpoint when the browser runtime bundle request fails', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const store = TestBed.inject(ConfigStoreService);

        api.getRuntimeBundle.and.rejectWith(new Error('socket hang up'));
        store.setSiteConfig(siteConfigPayload);

        const result = await service.loadSiteConfig('alecfest-voliii.zoolandingpage.com.mx');

        expect(result).toEqual(siteConfigPayload);
        expect(api.getSiteConfig).not.toHaveBeenCalled();
    });

    it('reuses the hydrated site config instead of calling the legacy site-config endpoint for the canonical domain', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const store = TestBed.inject(ConfigStoreService);

        api.getRuntimeBundle.and.rejectWith(new Error('socket hang up'));
        store.setSiteConfig(siteConfigPayload);

        const result = await service.loadSiteConfig('alecfest-voliii.com');

        expect(result).toEqual(siteConfigPayload);
        expect(api.getSiteConfig).not.toHaveBeenCalled();
    });

    it('returns null instead of calling the legacy site-config endpoint when browser runtime loading fails before hydration', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        api.getRuntimeBundle.and.rejectWith(new Error('runtime unavailable'));

        const result = await service.loadSiteConfig('zoositioweb.com.mx');

        expect(result).toBeNull();
        expect(api.getSiteConfig).not.toHaveBeenCalled();
    });

    it('loads debug workspace payloads from versioned draft assets even when runtime config uses the API', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const drafts = TestBed.inject(DraftConfigLoaderService) as jasmine.SpyObj<DraftConfigLoaderService>;

        const pageConfig = await service.loadDebugWorkspacePageConfig();
        const components = await service.loadDebugWorkspaceComponents();
        const combos = await service.loadDebugWorkspaceCombos();

        expect(pageConfig).toEqual(pageConfigPayload);
        expect(components).toEqual(componentsPayload);
        expect(combos).toEqual(combosPayload);
        expect(drafts.loadDebugWorkspacePageConfig).toHaveBeenCalled();
        expect(drafts.loadDebugWorkspaceComponents).toHaveBeenCalled();
        expect(drafts.loadDebugWorkspaceCombos).toHaveBeenCalled();
        expect(api.getDebugWorkspacePageConfig).not.toHaveBeenCalled();
        expect(api.getDebugWorkspaceComponents).not.toHaveBeenCalled();
        expect(api.getDebugWorkspaceAngoraCombos).not.toHaveBeenCalled();
    });
});
