import { AnalyticsCategories } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { AngoraCombosService } from '@/app/shared/services/angora-combos.service';
import { ConfigBootstrapService } from '@/app/shared/services/config-bootstrap.service';
import { ConfigSourceService } from '@/app/shared/services/config-source.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DomainResolverService } from '@/app/shared/services/domain-resolver.service';
import { DraftRegistryService } from '@/app/shared/services/draft-registry.service';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { RuntimeDataSourceService } from '@/app/shared/services/runtime-data-source.service';
import { ThemeService } from '@/app/shared/services/theme.service';
import type { TComponentPayloadEntry, TComponentsPayload } from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoadingCurtainService } from './loading-curtain.service';
import { RuntimeService } from './runtime.service';

const createComponentsPayload = (
    components: Record<string, TComponentPayloadEntry>,
    overrides: Partial<{ domain: string; pageId: string }> = {},
): TComponentsPayload => ({
    version: 1,
    domain: overrides.domain ?? 'pamelabetancourt.com',
    pageId: overrides.pageId ?? 'home',
    components: Object.values(components) as TComponentPayloadEntry[],
});

const flushPostBootstrapBrowserWork = async (): Promise<void> => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await Promise.resolve();
    await Promise.resolve();
};

const flushCssReadinessPasses = async (): Promise<void> => {
    await flushPostBootstrapBrowserWork();
    for (let index = 0; index < 24; index++) {
        await Promise.resolve();
    }
};

const nativeHistoryReplaceState = History.prototype.replaceState;

describe('RuntimeService', () => {
    const originalUrl = window.location.pathname + window.location.search + window.location.hash;
    const originalProduction = environment.production;
    const setExternalComponentsFromPayload = jasmine.createSpy('setExternalComponentsFromPayload');
    const setAuxiliaryComponentsFromPayload = jasmine.createSpy('setAuxiliaryComponentsFromPayload');
    const setDraftExportContext = jasmine.createSpy('setDraftExportContext');
    const getAllTheClassesFromComponents = jasmine.createSpy('getAllTheClassesFromComponents').and.returnValue(['hero']);
    const scheduleCssCreate = jasmine.createSpy('scheduleCssCreate');
    const updateClasses = jasmine.createSpy('updateClasses');
    const updateRenderedDomClasses = jasmine.createSpy('updateRenderedDomClasses');
    const collectRenderedDomClasses = jasmine.createSpy('collectRenderedDomClasses').and.returnValue(['ank-d-flex']);
    const containsRegisteredComboClass = jasmine.createSpy('containsRegisteredComboClass').and.returnValue(true);
    const waitForCssReady = jasmine.createSpy('waitForCssReady').and.resolveTo(true);
    const setAuxiliaryCombos = jasmine.createSpy('setAuxiliaryCombos');
    const clearAuxiliaryCombos = jasmine.createSpy('clearAuxiliaryCombos');
    const revealCssTimer = jasmine.createSpy('revealCssTimer');
    const analyticsInitializeRuntimeState = jasmine.createSpy('initializeRuntimeState');
    const analyticsPageViewEventName = jasmine.createSpy('pageViewEventName').and.returnValue('page_view');
    const analyticsTrack = jasmine.createSpy('track').and.resolveTo(undefined);
    const analyticsStartPageEngagementTracking = jasmine.createSpy('startPageEngagementTracking');
    const analyticsStopPageEngagementTracking = jasmine.createSpy('stopPageEngagementTracking');
    const runtimeDataSourcesStart = jasmine.createSpy('runtimeDataSources.start').and.resolveTo(undefined);
    const runtimeDataSourcesMarkInitialSourcesLoading = jasmine.createSpy('runtimeDataSources.markInitialSourcesLoading');
    const runtimeDataSourcesStop = jasmine.createSpy('runtimeDataSources.stop');
    const prefetchRoute = jasmine.createSpy('prefetchRoute').and.resolveTo(undefined);
    const configureLoadingCurtain = jasmine.createSpy('configureFromDraft');
    const hideLoadingCurtain = jasmine.createSpy('hideWhenReady');
    const applyTheme = jasmine.createSpy('applyTheme');
    let loadSiteConfig: jasmine.Spy;
    let bootstrapLoad: jasmine.Spy;
    let setCombos: jasmine.Spy;
    let store: ConfigStoreService;
    let runtimeHref = 'http://localhost/home?draftDomain=pamelabetancourt.com';
    let draftRuntimeResolveActiveDraftContext: jasmine.Spy;

    const normalizePath = (path: string): string => {
        const trimmed = String(path ?? '').trim() || '/';
        let normalized = trimmed;
        try {
            normalized = decodeURIComponent(trimmed);
        } catch {
            normalized = trimmed;
        }

        normalized = normalized.replace(/\\+/g, '/');
        if (!normalized.startsWith('/')) normalized = `/${ normalized }`;
        normalized = normalized.replace(/\/+/g, '/');
        if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
        return normalized || '/';
    };

    const setRuntimeUrl = (href: string): URL => {
        const url = new URL(href, 'http://localhost');
        runtimeHref = url.href;
        nativeHistoryReplaceState.call(window.history, {}, '', `${ url.pathname }${ url.search }${ url.hash }`);
        return url;
    };

    const resolveRuntimeContext = async () => {
        const url = new URL(runtimeHref);
        const domain = 'pamelabetancourt.com';
        const siteConfig = await loadSiteConfig(domain);
        store?.setSiteConfig(siteConfig);

        const path = normalizePath(url.pathname);
        const explicitPageId = String(url.searchParams.get('draftPageId') ?? '').trim();
        const route = Array.isArray(siteConfig?.routes)
            ? siteConfig.routes.find((entry: { readonly path?: string }) => normalizePath(entry.path ?? '') === path) ?? null
            : null;

        return {
            domain,
            pageId: explicitPageId || route?.pageId || siteConfig?.defaultPageId || 'home',
            path,
            route,
            explicitPageId: explicitPageId.length > 0,
        };
    };

    beforeEach(() => {
        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        loadSiteConfig = jasmine.createSpy('loadSiteConfig').and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                { path: '/home', pageId: 'home' },
                { path: '/servicios', pageId: 'servicios' },
            ],
        });

        bootstrapLoad = jasmine.createSpy('load').and.callFake(async ({ domain, pageId, lang }: { domain?: string; pageId?: string; lang?: string }) => {
            const combos = lang ? {
                version: 1,
                domain: domain ?? 'pamelabetancourt.com',
                pageId: pageId ?? 'home',
                combos: {
                    hero: ['ank-bg-primary'],
                },
            } : null;

            store?.setCombos(combos);

            return {
                domain: domain ?? 'pamelabetancourt.com',
                pageId: pageId ?? 'home',
                structuredDataApplied: false,
                pageConfig: {
                    version: 1,
                    domain: domain ?? 'pamelabetancourt.com',
                    pageId: pageId ?? 'home',
                    rootIds: [`${ pageId ?? 'home' }-root`],
                    modalRootIds: [],
                },
                components: createComponentsPayload({
                    [`${ pageId ?? 'home' }Root`]: {
                        id: `${ pageId ?? 'home' }Root`,
                        type: 'container',
                        config: { components: [] },
                    },
                }, {
                    domain: domain ?? 'pamelabetancourt.com',
                    pageId: pageId ?? 'home',
                }),
                combos,
            };
        });
        draftRuntimeResolveActiveDraftContext = jasmine.createSpy('resolveActiveDraftContext').and.callFake(resolveRuntimeContext);

        setExternalComponentsFromPayload.calls.reset();
        setAuxiliaryComponentsFromPayload.calls.reset();
        setDraftExportContext.calls.reset();
        getAllTheClassesFromComponents.calls.reset();
        scheduleCssCreate.calls.reset();
        updateClasses.calls.reset();
        updateRenderedDomClasses.calls.reset();
        collectRenderedDomClasses.calls.reset();
        collectRenderedDomClasses.and.returnValue(['ank-d-flex']);
        containsRegisteredComboClass.calls.reset();
        containsRegisteredComboClass.and.returnValue(true);
        waitForCssReady.calls.reset();
        waitForCssReady.and.resolveTo(true);
        setAuxiliaryCombos.calls.reset();
        clearAuxiliaryCombos.calls.reset();
        revealCssTimer.calls.reset();
        analyticsInitializeRuntimeState.calls.reset();
        analyticsPageViewEventName.calls.reset();
        analyticsTrack.calls.reset();
        analyticsStartPageEngagementTracking.calls.reset();
        analyticsStopPageEngagementTracking.calls.reset();
        runtimeDataSourcesStart.calls.reset();
        runtimeDataSourcesMarkInitialSourcesLoading.calls.reset();
        runtimeDataSourcesStop.calls.reset();
        prefetchRoute.calls.reset();
        configureLoadingCurtain.calls.reset();
        hideLoadingCurtain.calls.reset();
        applyTheme.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                RuntimeService,
                {
                    provide: DraftRuntimeService,
                    useValue: {
                        resolveActiveDraftContext: draftRuntimeResolveActiveDraftContext,
                    },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'pamelabetancourt.com' }),
                        resolveStorageKey: (suffix: string) => `pamelabetancourt-com:${ suffix }`,
                    },
                },
                {
                    provide: ConfigSourceService,
                    useValue: {
                        loadSiteConfig,
                        prefetchRoute,
                        loadDebugWorkspacePageConfig: jasmine.createSpy('loadDebugWorkspacePageConfig').and.resolveTo(null),
                        loadDebugWorkspaceComponents: jasmine.createSpy('loadDebugWorkspaceComponents').and.resolveTo(null),
                        loadDebugWorkspaceCombos: jasmine.createSpy('loadDebugWorkspaceCombos').and.resolveTo(null),
                    },
                },
                {
                    provide: DraftRegistryService,
                    useValue: {
                        listDrafts: () => of([]),
                    },
                },
                {
                    provide: ConfigBootstrapService,
                    useValue: {
                        load: bootstrapLoad,
                    },
                },
                {
                    provide: ConfigurationsOrchestratorService,
                    useValue: {
                        setExternalComponentsFromPayload,
                        setAuxiliaryComponentsFromPayload,
                        setDraftExportContext,
                        getAllTheClassesFromComponents,
                    },
                },
                {
                    provide: AngoraCombosService,
                    useValue: {
                        scheduleCssCreate,
                        updateClasses,
                        updateRenderedDomClasses,
                        collectRenderedDomClasses,
                        containsRegisteredComboClass,
                        waitForCssReady,
                        setAuxiliaryCombos,
                        clearAuxiliaryCombos,
                        revealCssTimer,
                        stopCssRuntime: () => undefined,
                    },
                },
                {
                    provide: AnalyticsService,
                    useValue: {
                        initializeRuntimeState: analyticsInitializeRuntimeState,
                        pageViewEventName: analyticsPageViewEventName,
                        track: analyticsTrack,
                        promptForConsentIfNeeded: () => undefined,
                        startPageEngagementTracking: analyticsStartPageEngagementTracking,
                        stopPageEngagementTracking: analyticsStopPageEngagementTracking,
                    },
                },
                {
                    provide: RuntimeDataSourceService,
                    useValue: {
                        start: runtimeDataSourcesStart,
                        markInitialSourcesLoading: runtimeDataSourcesMarkInitialSourcesLoading,
                        stop: runtimeDataSourcesStop,
                    },
                },
                {
                    provide: LoadingCurtainService,
                    useValue: {
                        configureFromDraft: configureLoadingCurtain,
                        hideWhenReady: hideLoadingCurtain,
                    },
                },
                {
                    provide: ThemeService,
                    useValue: {
                        applyTheme,
                    },
                },
            ],
        });

        store = TestBed.inject(ConfigStoreService);
        setCombos = spyOn(store, 'setCombos').and.callThrough();
    });

    afterEach(async () => {
        try {
            TestBed.inject(RuntimeService).disconnect();
        } catch {
            // Best-effort cleanup for specs that failed before TestBed was ready.
        }
        await flushPostBootstrapBrowserWork();
        (environment as { production: boolean }).production = originalProduction;
        setRuntimeUrl(originalUrl);
        TestBed.resetTestingModule();
    });

    it('reinitializes the rendered draft when client navigation changes the route path', async () => {
        const service = TestBed.inject(RuntimeService);
        const expectedModalRootIds: string[] = [];

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(bootstrapLoad).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'home',
            lang: 'es',
            routePath: '/home',
            routeParams: undefined,
        });
        expect(setCombos).toHaveBeenCalledWith({
            version: 1,
            domain: 'pamelabetancourt.com',
            pageId: 'home',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });
        expect(service.rootComponentsIds()).toEqual(['home-root']);

        setRuntimeUrl('/servicios?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(bootstrapLoad).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'servicios',
            lang: 'es',
            routePath: '/servicios',
            routeParams: undefined,
        });
        expect(service.rootComponentsIds()).toEqual(['servicios-root']);
        expect(configureLoadingCurtain).toHaveBeenCalled();
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'servicios',
            rootIds: ['servicios-root'],
            modalRootIds: expectedModalRootIds,
        });
    });

    it('prefetches sibling routes after a successful draft bootstrap', async () => {
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);

        const service = TestBed.inject(RuntimeService);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(prefetchRoute).not.toHaveBeenCalled();
        await flushPostBootstrapBrowserWork();

        expect(prefetchRoute).toHaveBeenCalledOnceWith('pamelabetancourt.com', {
            pageId: 'servicios',
            lang: 'es',
            path: '/servicios',
        });
    });

    it('hides the boot curtain after rendered component classes are sent to Angora', async () => {
        const service = TestBed.inject(RuntimeService);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(configureLoadingCurtain).toHaveBeenCalled();
        expect(updateClasses).toHaveBeenCalledOnceWith(['hero']);
        expect(hideLoadingCurtain).not.toHaveBeenCalledWith('rendered-components-css-updated');

        await flushCssReadinessPasses();

        expect(collectRenderedDomClasses).toHaveBeenCalled();
        expect(updateClasses.calls.allArgs()).toEqual([
            [['hero']],
            [['hero', 'ank-d-flex']],
            [['hero', 'ank-d-flex']],
            [['hero', 'ank-d-flex']],
            [['hero', 'ank-d-flex']],
        ]);
        expect(waitForCssReady).toHaveBeenCalled();
        expect(waitForCssReady).toHaveBeenCalledWith(jasmine.any(Number), ['hero', 'ank-d-flex']);
        expect(updateRenderedDomClasses).not.toHaveBeenCalled();
        expect(hideLoadingCurtain).toHaveBeenCalledWith('rendered-components-css-updated');
    });

    it('does not wait for the full CSS timeout when rendered text is already safe', async () => {
        let now = 0;
        const dateNowSpy = spyOn(Date, 'now').and.callFake(() => now);

        try {
            waitForCssReady.and.resolveTo(false);
            const service = TestBed.inject(RuntimeService);

            setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
            await service.initialize('es');
            await flushCssReadinessPasses();

            expect(waitForCssReady).toHaveBeenCalledWith(750, ['hero', 'ank-d-flex']);
            expect(hideLoadingCurtain).not.toHaveBeenCalledWith('rendered-components-css-updated');

            now = 3_000;
            await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
            await flushCssReadinessPasses();

            expect(hideLoadingCurtain).toHaveBeenCalledWith('rendered-components-css-updated');
        } finally {
            dateNowSpy.and.callThrough();
        }
    });

    it('does not wait for the full CSS timeout when rendered combos are not registered', async () => {
        let now = 0;
        const dateNowSpy = spyOn(Date, 'now').and.callFake(() => now);

        try {
            containsRegisteredComboClass.and.returnValue(false);
            const service = TestBed.inject(RuntimeService);

            setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
            await service.initialize('es');
            await flushCssReadinessPasses();

            expect(hideLoadingCurtain).not.toHaveBeenCalledWith('rendered-components-css-updated');

            now = 3_000;
            await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
            await flushCssReadinessPasses();

            expect(updateClasses).toHaveBeenCalledWith(['hero', 'ank-d-flex']);
            expect(waitForCssReady).not.toHaveBeenCalled();
            expect(hideLoadingCurtain).toHaveBeenCalledWith('rendered-components-css-updated');
        } finally {
            dateNowSpy.and.callThrough();
        }
    });

    it('re-samples rendered combo classes after ready passes before hiding the boot curtain', async () => {
        collectRenderedDomClasses.and.returnValues(
            ['navCombo'],
            ['navCombo'],
            ['navCombo', 'sectionTitle'],
            ['navCombo', 'sectionTitle'],
            ['navCombo', 'sectionTitle'],
        );
        const service = TestBed.inject(RuntimeService);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');
        await flushCssReadinessPasses();

        expect(waitForCssReady.calls.allArgs()).toEqual([
            [jasmine.any(Number), ['hero', 'navCombo']],
            [jasmine.any(Number), ['hero', 'navCombo', 'sectionTitle']],
            [jasmine.any(Number), ['hero', 'navCombo', 'sectionTitle']],
        ]);
        expect(hideLoadingCurtain).toHaveBeenCalledWith('rendered-components-css-updated');
    });

    it('keeps the boot curtain while rendered section title color is still stale', async () => {
        const style = document.createElement('style');
        const title = document.createElement('h1');
        const previousTitleColor = document.body.style.getPropertyValue('--ank-titleColor');
        const previousTitleColorPriority = document.body.style.getPropertyPriority('--ank-titleColor');
        style.textContent = `
            :root { --ank-titleColor: rgb(32, 23, 18); }
        `;
        title.className = 'sectionTitle';
        title.style.color = 'rgb(255, 248, 230)';
        title.textContent = 'Title';
        document.head.appendChild(style);
        document.body.appendChild(title);
        document.body.style.setProperty('--ank-titleColor', 'rgb(32, 23, 18)');

        try {
            const service = TestBed.inject(RuntimeService);

            setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
            await service.initialize('es');
            await flushCssReadinessPasses();

            expect(hideLoadingCurtain).not.toHaveBeenCalledWith('rendered-components-css-updated');

            title.style.color = 'var(--ank-titleColor)';
            await new Promise<void>((resolve) => window.setTimeout(resolve, 75));
            await flushCssReadinessPasses();

            expect(getComputedStyle(title).color).toBe('rgb(32, 23, 18)');
            expect(hideLoadingCurtain).toHaveBeenCalledWith('rendered-components-css-updated');
        } finally {
            title.remove();
            style.remove();
            if (previousTitleColor) {
                document.body.style.setProperty('--ank-titleColor', previousTitleColor, previousTitleColorPriority);
            } else {
                document.body.style.removeProperty('--ank-titleColor');
            }
        }
    });

    it('skips sibling route prefetches during automated browser audits', async () => {
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(true);

        const service = TestBed.inject(RuntimeService);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');
        await flushPostBootstrapBrowserWork();

        expect(prefetchRoute).not.toHaveBeenCalled();
        expect(analyticsInitializeRuntimeState).not.toHaveBeenCalled();
        expect(analyticsPageViewEventName).not.toHaveBeenCalled();
        expect(analyticsStartPageEngagementTracking).not.toHaveBeenCalled();
        expect(analyticsTrack).not.toHaveBeenCalled();
    });

    it('skips analytics network work for production builds opened from localhost previews', async () => {
        (environment as { production: boolean }).production = true;
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);

        const service = TestBed.inject(RuntimeService);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');
        await flushPostBootstrapBrowserWork();

        expect(prefetchRoute).not.toHaveBeenCalled();
        expect(analyticsInitializeRuntimeState).not.toHaveBeenCalled();
        expect(analyticsPageViewEventName).not.toHaveBeenCalled();
        expect(analyticsTrack).not.toHaveBeenCalled();
    });

    it('tracks an initial page view on the first successful browser bootstrap', async () => {
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
        const service = TestBed.inject(RuntimeService);
        spyOn<any>(service, 'resolveCurrentBrowserUrlLabel').and.returnValue('/home?draftDomain=pamelabetancourt.com');

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(analyticsInitializeRuntimeState).not.toHaveBeenCalled();
        expect(analyticsPageViewEventName).not.toHaveBeenCalled();
        expect(analyticsTrack).not.toHaveBeenCalled();

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await flushPostBootstrapBrowserWork();

        expect(analyticsInitializeRuntimeState).toHaveBeenCalled();
        expect(analyticsPageViewEventName).toHaveBeenCalled();
        expect(analyticsTrack).toHaveBeenCalledWith('page_view', {
            category: AnalyticsCategories.Navigation,
            label: '/home?draftDomain=pamelabetancourt.com',
        });

        await service.initialize('es');
        await flushPostBootstrapBrowserWork();

        expect(analyticsTrack.calls.count()).toBe(1);
    });

    it('tracks a content hub view event for configured article routes', async () => {
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
        const service = TestBed.inject(RuntimeService);
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'zoositioweb.com.mx',
            defaultPageId: 'home',
            routes: [
                { path: '/blog/web/blog-builder-seo', pageId: 'blog-article' },
                { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
            ],
            runtime: {
                contentHubs: [
                    {
                        hubId: 'zoosite-main',
                        ownerDraftDomain: 'zoositioweb.com.mx',
                        source: 'primary',
                        routeBasePath: '/blog',
                        listPath: '/blog',
                        articlePathPattern: '/blog/:categorySlug/:articleSlug',
                        defaultLocale: 'es',
                        locales: ['es'],
                        canonicalMode: 'host-adaptive',
                        analyticsContext: {
                            contentGroup: 'blog',
                            eventPrefix: 'blog',
                            piiPolicy: 'no-pii',
                        },
                        publicArticles: [
                            {
                                articleId: 'art_20260620_blog_builder',
                                locale: 'es',
                                status: 'published',
                                title: 'Blog builder SEO',
                                path: '/blog/web/blog-builder-seo',
                                categorySlug: 'web',
                                tags: ['seo', 'blogs'],
                                publishedAt: '2026-06-20T00:00:00.000Z',
                            },
                        ],
                    },
                ],
            },
        } as any);

        setRuntimeUrl('/blog/web/blog-builder-seo?draftDomain=zoositioweb.com.mx&lang=es');
        await service.initialize('es');
        await flushPostBootstrapBrowserWork();

        expect(analyticsTrack).toHaveBeenCalledWith('blog_view', {
            category: AnalyticsCategories.Engagement,
            label: '/blog/web/blog-builder-seo',
            meta: {
                hubId: 'zoosite-main',
                contentGroup: 'blog',
                articleId: 'art_20260620_blog_builder',
                category: 'web',
                tags: ['seo', 'blogs'],
                path: '/blog/web/blog-builder-seo',
                params: {
                    articleSlug: 'blog-builder-seo',
                    categorySlug: 'web',
                },
            },
        });
    });

    it('does not track a content hub view for unknown article slugs', async () => {
        spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
        spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
        const service = TestBed.inject(RuntimeService);
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'zoositioweb.com.mx',
            defaultPageId: 'home',
            routes: [
                { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
            ],
            runtime: {
                contentHubs: [
                    {
                        hubId: 'zoosite-main',
                        ownerDraftDomain: 'zoositioweb.com.mx',
                        source: 'primary',
                        routeBasePath: '/blog',
                        listPath: '/blog',
                        articlePathPattern: '/blog/:categorySlug/:articleSlug',
                        defaultLocale: 'es',
                        locales: ['es'],
                        canonicalMode: 'host-adaptive',
                        analyticsContext: {
                            contentGroup: 'blog',
                            eventPrefix: 'blog',
                            piiPolicy: 'no-pii',
                        },
                        publicArticles: [
                            {
                                articleId: 'art_20260620_blog_builder',
                                locale: 'es',
                                status: 'published',
                                title: 'Blog builder SEO',
                                path: '/blog/web/blog-builder-seo',
                                publishedAt: '2026-06-20T00:00:00.000Z',
                            },
                        ],
                    },
                ],
            },
        } as any);

        setRuntimeUrl('/blog/web/no-existe?draftDomain=zoositioweb.com.mx&lang=es');
        await service.initialize('es');
        await flushPostBootstrapBrowserWork();

        expect(analyticsTrack).toHaveBeenCalledWith('page_view', jasmine.any(Object));
        expect(analyticsTrack).not.toHaveBeenCalledWith('blog_view', jasmine.any(Object));
    });

    it('does not repeat the initial browser bootstrap when connect follows an app initializer', async () => {
        const service = TestBed.inject(RuntimeService);
        const host = document.createElement('div');

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');
        expect(bootstrapLoad.calls.count()).toBe(1);

        service.connect({
            host,
            destroyRef: { onDestroy: () => undefined } as any,
            showDebugWorkspace: () => false,
            currentLanguage: () => 'es',
        });
        await flushPostBootstrapBrowserWork();

        expect(bootstrapLoad.calls.count()).toBe(1);
        expect(service.rootComponentsIds()).toEqual(['home-root']);
    });

    it('queues a fresh draft initialization when navigation changes during an active load', async () => {
        const service = TestBed.inject(RuntimeService);
        const expectedModalRootIds: string[] = [];
        let resolveFirstLoad!: () => void;
        let hasResolveFirstLoad = false;
        let firstLoadPending = true;

        bootstrapLoad.and.callFake(({ domain, pageId, lang }: { domain?: string; pageId?: string; lang?: string }) => {
            const createBootPayload = () => {
                const combos = lang ? {
                    version: 1,
                    domain: domain ?? 'pamelabetancourt.com',
                    pageId: pageId ?? 'home',
                    combos: {
                        hero: ['ank-bg-primary'],
                    },
                } : null;

                store?.setCombos(combos);

                return {
                    domain: domain ?? 'pamelabetancourt.com',
                    pageId: pageId ?? 'home',
                    structuredDataApplied: false,
                    pageConfig: {
                        version: 1,
                        domain: domain ?? 'pamelabetancourt.com',
                        pageId: pageId ?? 'home',
                        rootIds: [`${ pageId ?? 'home' }-root`],
                        modalRootIds: [],
                    },
                    components: createComponentsPayload({
                        [`${ pageId ?? 'home' }Root`]: {
                            id: `${ pageId ?? 'home' }Root`,
                            type: 'container',
                            config: { components: [] },
                        },
                    }, {
                        domain: domain ?? 'pamelabetancourt.com',
                        pageId: pageId ?? 'home',
                    }),
                    combos,
                };
            };

            if (firstLoadPending && pageId === 'home') {
                firstLoadPending = false;
                return new Promise((resolve) => {
                    hasResolveFirstLoad = true;
                    resolveFirstLoad = () => resolve(createBootPayload());
                });
            }

            return Promise.resolve(createBootPayload());
        });

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        const firstInitialize = service.initialize('es');
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

        expect(hasResolveFirstLoad).withContext('first draft load resolver should be captured').toBeTrue();
        expect(bootstrapLoad.calls.allArgs()).toEqual([[
            {
                domain: 'pamelabetancourt.com',
                pageId: 'home',
                lang: 'es',
                routePath: '/home',
                routeParams: undefined,
            },
        ]]);

        setRuntimeUrl('/servicios?draftDomain=pamelabetancourt.com');
        const secondInitialize = service.initialize('es');

        resolveFirstLoad();
        await Promise.all([firstInitialize, secondInitialize]);

        expect(bootstrapLoad.calls.allArgs()).toEqual([
            [{
                domain: 'pamelabetancourt.com',
                pageId: 'home',
                lang: 'es',
                routePath: '/home',
                routeParams: undefined,
            }],
            [{
                domain: 'pamelabetancourt.com',
                pageId: 'servicios',
                lang: 'es',
                routePath: '/servicios',
                routeParams: undefined,
            }],
        ]);
        expect(service.rootComponentsIds()).toEqual(['servicios-root']);
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'servicios',
            rootIds: ['servicios-root'],
            modalRootIds: expectedModalRootIds,
        });
    });

    it('skips bootstrap when no draft identity is resolved yet', async () => {
        const service = TestBed.inject(RuntimeService);
        const expectedModalRootIds: string[] = [];
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: '',
            pageId: '',
            path: '/',
            route: null,
            explicitPageId: false,
        });

        await service.initialize('es');

        expect(bootstrapLoad).not.toHaveBeenCalled();
        expect(service.rootComponentsIds()).toEqual([]);
        expect(service.modalRootIds()).toEqual(expectedModalRootIds);
        expect(hideLoadingCurtain).toHaveBeenCalledWith('missing-draft-context');
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: '',
            pageId: '',
            rootIds: [],
            modalRootIds: expectedModalRootIds,
        });
    });

    it('loads authored debug workspace roots when debug workspace is enabled', async () => {
        const service = TestBed.inject(RuntimeService);
        const configSource = TestBed.inject(ConfigSourceService) as jasmine.SpyObj<ConfigSourceService>;
        const host = document.createElement('div');

        configSource.loadDebugWorkspacePageConfig.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            rootIds: ['debugWorkspaceRoot'],
            modalRootIds: ['modalDemoRoot'],
        });
        configSource.loadDebugWorkspaceComponents.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            components: [
                {
                    id: 'debugWorkspaceRoot',
                    type: 'container',
                    config: { tag: 'div', components: [] },
                },
            ],
        });
        configSource.loadDebugWorkspaceCombos.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            combos: {
                debugBtnBase: ['ank-display-flex'],
            },
        });

        service.connect({
            host,
            destroyRef: { onDestroy: () => undefined } as any,
            showDebugWorkspace: () => true,
            currentLanguage: () => 'es',
        });

        await service.initialize('es');

        expect(service.debugWorkspaceRootIds()).toEqual(['debugWorkspaceRoot']);
        expect(service.modalRootIds()).toEqual(['modalDemoRoot']);
        expect(setAuxiliaryComponentsFromPayload).toHaveBeenCalledWith('debug-workspace', jasmine.objectContaining({
            components: jasmine.any(Array),
        }));
        expect(setAuxiliaryCombos).toHaveBeenCalledWith('debug-workspace', {
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            combos: {
                debugBtnBase: ['ank-display-flex'],
            },
        });
    });

    it('loads debug workspace roots when the browser shell connects after bootstrap', async () => {
        const service = TestBed.inject(RuntimeService);
        const configSource = TestBed.inject(ConfigSourceService) as jasmine.SpyObj<ConfigSourceService>;
        const host = document.createElement('div');

        configSource.loadDebugWorkspacePageConfig.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            rootIds: ['debugWorkspaceRoot'],
            modalRootIds: [],
        });
        configSource.loadDebugWorkspaceComponents.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            components: [
                {
                    id: 'debugWorkspaceRoot',
                    type: 'container',
                    config: { tag: 'div', components: [] },
                },
            ],
        });
        configSource.loadDebugWorkspaceCombos.and.resolveTo(null);

        await service.initialize('es');
        expect(service.debugWorkspaceRootIds()).toEqual([]);

        service.connect({
            host,
            destroyRef: { onDestroy: () => undefined } as any,
            showDebugWorkspace: () => true,
            currentLanguage: () => 'es',
        });
        await flushPostBootstrapBrowserWork();

        expect(service.debugWorkspaceRootIds()).toEqual(['debugWorkspaceRoot']);
        expect(setAuxiliaryComponentsFromPayload).toHaveBeenCalledWith('debug-workspace', jasmine.objectContaining({
            components: jasmine.any(Array),
        }));
    });

    it('starts runtime data sources from site runtime config after valid bootstrap', async () => {
        const service = TestBed.inject(RuntimeService);
        const dataSources = [
            {
                id: 'spotify-releases',
                proxySourceId: 'spotifyArtistAlbums',
                target: 'remote.music.releases',
            },
            {
                id: 'blog-posts',
                proxySourceId: 'cmsRecentPosts',
                target: 'remote.blog.posts',
            },
        ];
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [{ path: '/home', pageId: 'home' }],
            runtime: {
                dataSources,
            },
            site: {},
        } as any);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');

        expect(runtimeDataSourcesStart).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'home',
            dataSources,
            mode: 'all',
        });
    });

    it('keeps protected auth-admin browser routes hidden until initial data sources settle', async () => {
        const service = TestBed.inject(RuntimeService);
        let resolveDataSources!: () => void;
        const dataSourcesLoaded = new Promise<void>((resolve) => {
            resolveDataSources = resolve;
        });
        runtimeDataSourcesStart.and.returnValue(dataSourcesLoaded);
        spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            account: {
                subject: 'client-sub',
                email: 'client@example.test',
                roles: ['zoosite-client'],
                enabled: true,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const authAdminDataSources = [
            {
                id: 'auth-account',
                kind: 'auth-admin',
                authAdminSource: 'account',
                target: 'remote.auth.account',
                pageIds: ['mi-cuenta'],
            },
        ];
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                {
                    path: '/mi-cuenta',
                    pageId: 'mi-cuenta',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-client'],
                        redirectTo: '/acceso',
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    session: {
                        mode: 'server-cookie',
                        mePath: '/auth/session/me',
                    },
                },
                dataSources: authAdminDataSources,
            },
            site: {},
        } as any);

        setRuntimeUrl('/mi-cuenta?draftDomain=pamelabetancourt.com');
        const initialize = service.initialize('es');
        for (let attempt = 0; attempt < 8 && !runtimeDataSourcesStart.calls.any(); attempt++) {
            await flushPostBootstrapBrowserWork();
        }

        expect(runtimeDataSourcesStart).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'mi-cuenta',
            dataSources: authAdminDataSources,
            mode: 'all',
        });
        expect(service.rootComponentsIds()).toEqual([]);
        expect(setExternalComponentsFromPayload).not.toHaveBeenCalled();

        resolveDataSources();
        await initialize;

        expect(service.rootComponentsIds()).toEqual(['mi-cuenta-root']);
        expect(setExternalComponentsFromPayload).toHaveBeenCalledWith(jasmine.objectContaining({
            pageId: 'mi-cuenta',
        }));
    });

    it('exposes private-route loading while server-cookie auth and initial data sources settle', async () => {
        const service = TestBed.inject(RuntimeService);
        const privateRouteLoading = () => (service as any).privateRouteLoading?.();
        let resolveMe!: () => void;
        let resolveDataSources!: () => void;
        const meResponse = new Promise<Response>((resolve) => {
            resolveMe = () => resolve(new Response(JSON.stringify({
                ok: true,
                account: {
                    subject: 'client-sub',
                    roles: ['zoosite-client'],
                    enabled: true,
                },
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }));
        });
        const dataSourcesLoaded = new Promise<void>((resolve) => {
            resolveDataSources = resolve;
        });
        runtimeDataSourcesStart.and.returnValue(dataSourcesLoaded);
        spyOn(window, 'fetch').and.returnValue(meResponse);
        const authAdminDataSources = [
            {
                id: 'auth-account',
                kind: 'auth-admin',
                authAdminSource: 'account',
                target: 'remote.auth.account',
                pageIds: ['mi-cuenta'],
            },
        ];
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                {
                    path: '/mi-cuenta',
                    pageId: 'mi-cuenta',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-client'],
                        redirectTo: '/acceso',
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    session: {
                        mode: 'server-cookie',
                        mePath: '/auth/session/me',
                    },
                },
                dataSources: authAdminDataSources,
            },
            site: {},
        } as any);

        setRuntimeUrl('/mi-cuenta?draftDomain=pamelabetancourt.com');
        const initialize = service.initialize('es');
        for (let attempt = 0; attempt < 8 && !(window.fetch as jasmine.Spy).calls.any(); attempt++) {
            await flushPostBootstrapBrowserWork();
        }

        expect(privateRouteLoading()).toEqual({
            active: true,
            phase: 'session',
        });

        resolveMe();
        for (let attempt = 0; attempt < 8 && !runtimeDataSourcesStart.calls.any(); attempt++) {
            await flushPostBootstrapBrowserWork();
        }

        expect(privateRouteLoading()).toEqual({
            active: true,
            phase: 'content',
        });
        expect(service.rootComponentsIds()).toEqual([]);

        resolveDataSources();
        await initialize;

        expect(privateRouteLoading()).toEqual({
            active: false,
            phase: null,
        });
        expect(service.rootComponentsIds()).toEqual(['mi-cuenta-root']);
    });

    it('marks runtime data sources loading before refreshing after client navigation', async () => {
        const service = TestBed.inject(RuntimeService);
        const host = document.createElement('div');
        const dataSources = [
            {
                id: 'pokemon-type',
                proxySourceId: 'pokeapiTypePokemon',
                target: 'remote.pokemon.catalog',
                statusTarget: 'remoteStatus.pokemon.catalog.type',
                pageIds: ['home'],
            },
        ];
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [{ path: '/home', pageId: 'home' }],
            runtime: {
                dataSources,
            },
            site: {},
        } as any);

        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com');
        await service.initialize('es');
        store.setPageConfig({
            version: 1,
            domain: 'pamelabetancourt.com',
            pageId: 'home',
            rootIds: ['home-root'],
            modalRootIds: [],
        });
        service.connect({
            host,
            destroyRef: { onDestroy: () => undefined } as any,
            showDebugWorkspace: () => false,
            currentLanguage: () => 'es',
        });

        runtimeDataSourcesMarkInitialSourcesLoading.calls.reset();
        bootstrapLoad.calls.reset();
        setRuntimeUrl('/home?draftDomain=pamelabetancourt.com&type=electric');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flushPostBootstrapBrowserWork();

        expect(runtimeDataSourcesMarkInitialSourcesLoading).toHaveBeenCalledWith({
            pageId: 'home',
            dataSources,
        });
        expect(runtimeDataSourcesMarkInitialSourcesLoading).toHaveBeenCalledBefore(bootstrapLoad);
    });

    it('stops runtime data sources on disconnect', () => {
        const service = TestBed.inject(RuntimeService);

        service.disconnect();

        expect(runtimeDataSourcesStop).toHaveBeenCalled();
    });
});
