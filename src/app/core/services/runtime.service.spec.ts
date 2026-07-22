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
import { EventOrchestrator } from '@/app/shared/services/event-orchestrator';
import { ThemeService } from '@/app/shared/services/theme.service';
import type { TComponentPayloadEntry, TComponentsPayload } from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { setTestBrowserUrl } from '@/test-browser-state';
import { LoadingCurtainService } from './loading-curtain.service';
import { RuntimeService } from './runtime.service';
import { AuthRuntimeService } from '@/app/state/auth/auth-runtime.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';

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
    const routeLoadExecuteAsync = jasmine.createSpy('executeAsync').and.resolveTo(undefined);
    let loadSiteConfig: jasmine.Spy;
    let bootstrapLoad: jasmine.Spy;
    let setCombos: jasmine.Spy;
    let store: ConfigStoreService;
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
        setTestBrowserUrl(`${ url.pathname }${ url.search }${ url.hash }`);
        return url;
    };

    const resolveRuntimeContext = async () => {
        const url = new URL(window.location.href);
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
        runtimeDataSourcesStart.and.resolveTo(undefined);
        runtimeDataSourcesMarkInitialSourcesLoading.calls.reset();
        runtimeDataSourcesStop.calls.reset();
        prefetchRoute.calls.reset();
        configureLoadingCurtain.calls.reset();
        hideLoadingCurtain.calls.reset();
        applyTheme.calls.reset();
        routeLoadExecuteAsync.calls.reset();
        routeLoadExecuteAsync.and.resolveTo(undefined);

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
                    provide: EventOrchestrator,
                    useValue: {
                        executeAsync: routeLoadExecuteAsync,
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

    it('waits for the full CSS timeout when rendered text is safe but Angora CSS is not ready', async () => {
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

            expect(hideLoadingCurtain).not.toHaveBeenCalledWith('rendered-components-css-updated');

            now = 20_500;
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

    it('renders the login route after an unauthenticated protected-route redirect during initial bootstrap', async () => {
        const service = TestBed.inject(RuntimeService);
        spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ ok: false }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        }));
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                { path: '/acceso', pageId: 'acceso' },
                {
                    path: '/admin/blog',
                    pageId: 'admin-blog',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-admin'],
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
            },
            site: {},
        } as any);

        setRuntimeUrl('/admin/blog?draftDomain=pamelabetancourt.com&lang=es');
        service.connect({
            host: document.createElement('main'),
            destroyRef: { destroyed: false, onDestroy: () => () => undefined } as any,
            showDebugWorkspace: () => false,
            currentLanguage: () => 'es',
        });
        for (let attempt = 0; attempt < 8 && service.rootComponentsIds().length === 0; attempt++) {
            await flushPostBootstrapBrowserWork();
        }

        expect(window.location.pathname).toBe('/acceso');
        expect(window.location.search).toContain('draftDomain=pamelabetancourt.com');
        expect(service.rootComponentsIds()).toEqual(['acceso-root']);
        expect(bootstrapLoad.calls.allArgs()).toEqual([[
            {
                domain: 'pamelabetancourt.com',
                pageId: 'acceso',
                lang: 'es',
                routePath: '/acceso',
                routeParams: undefined,
            },
        ]]);
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

    it('runs a protected Stripe return action once before rendered components and data sources', async () => {
        spyOn(TestBed.inject(AuthRuntimeService), 'evaluateRouteAccessAsync').and.resolveTo({
            allowed: true,
            reason: 'authenticated',
            redirectTo: null,
            requiredGroups: ['draft-owner'],
        });
        const service = TestBed.inject(RuntimeService);
        const protectedSiteConfig = {
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'stripe-return',
            routes: [{
                path: '/integraciones/stripe/retorno',
                pageId: 'stripe-return',
                auth: {
                    required: true,
                    allowedGroups: ['draft-owner'],
                    redirectTo: '/acceso',
                },
            }],
            runtime: {
                apiActions: [{
                    id: 'complete-stripe-onboarding',
                    kind: 'integrations',
                    integrations: {
                        action: 'stripeOnboardingReturn',
                        bindingId: 'stripe-main',
                    },
                    trigger: 'route-load',
                    pageIds: ['stripe-return'],
                }],
                dataSources: [{
                    id: 'integration-status',
                    kind: 'integrations',
                    integrations: { read: 'connectionList' },
                    target: 'remote.integrations',
                    pageIds: ['stripe-return'],
                }],
            },
            site: {},
        } as any;
        loadSiteConfig.and.resolveTo(protectedSiteConfig);
        store.setSiteConfig(protectedSiteConfig);
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: 'pamelabetancourt.com',
            pageId: 'stripe-return',
            path: '/integraciones/stripe/retorno',
            route: protectedSiteConfig.routes[0],
            routeParams: undefined,
            explicitPageId: false,
        });
        setRuntimeUrl('/integraciones/stripe/retorno?draftDomain=pamelabetancourt.com&state=opaque&code=opaque');

        await service.initialize('es');
        await service.initialize('es');

        expect(routeLoadExecuteAsync).toHaveBeenCalledOnceWith({
            event: {
                componentId: 'route-load:complete-stripe-onboarding',
                eventName: 'route-load',
                eventInstructions: 'proxyAction:complete-stripe-onboarding',
                eventData: {},
                userGesture: false,
            },
            host: null,
            pageId: 'stripe-return',
        }, {
            allowedActions: ['proxyAction'],
        });
        const routeLoadOrder = (routeLoadExecuteAsync.calls.first() as unknown as { invocationOrder: number }).invocationOrder;
        const bootstrapOrder = (bootstrapLoad.calls.first() as unknown as { invocationOrder: number }).invocationOrder;
        const componentOrder = (setExternalComponentsFromPayload.calls.first() as unknown as { invocationOrder: number }).invocationOrder;
        const dataSourceOrder = (runtimeDataSourcesStart.calls.first() as unknown as { invocationOrder: number }).invocationOrder;
        expect(routeLoadOrder).toBeLessThan(bootstrapOrder);
        expect(routeLoadOrder).toBeLessThan(componentOrder);
        expect(routeLoadOrder).toBeLessThan(dataSourceOrder);
    });

    it('restores only the safe Stripe return status after bootstrap clears runtime values', async () => {
        spyOn(TestBed.inject(AuthRuntimeService), 'evaluateRouteAccessAsync').and.resolveTo({
            allowed: true,
            reason: 'authenticated',
            redirectTo: null,
            requiredGroups: ['draft-owner'],
        });
        const variables = TestBed.inject(VariableStoreService);
        const statusTarget = 'admin.connections.onboardingReturn';
        const protectedSiteConfig = {
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'stripe-return',
            routes: [{
                path: '/integraciones/stripe/retorno',
                pageId: 'stripe-return',
                auth: { required: true, allowedGroups: ['draft-owner'], redirectTo: '/acceso' },
            }],
            runtime: {
                apiActions: [{
                    id: 'complete-stripe-onboarding',
                    kind: 'integrations',
                    integrations: { action: 'stripeOnboardingReturn', bindingId: 'stripe-main' },
                    trigger: 'route-load',
                    pageIds: ['stripe-return'],
                    statusTarget,
                }],
            },
            site: {},
        } as any;
        loadSiteConfig.and.resolveTo(protectedSiteConfig);
        store.setSiteConfig(protectedSiteConfig);
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: 'pamelabetancourt.com',
            pageId: 'stripe-return',
            path: '/integraciones/stripe/retorno',
            route: protectedSiteConfig.routes[0],
            routeParams: undefined,
            explicitPageId: false,
        });
        routeLoadExecuteAsync.and.callFake(async () => {
            variables.setRuntimeValue(statusTarget, {
                state: 'success',
                updatedAt: '2026-07-21T22:00:00.000Z',
                error: null,
                data: {
                    status: 'ready',
                    chargesEnabled: true,
                    payoutsEnabled: true,
                    detailsSubmitted: true,
                    capabilitiesReady: true,
                    requirementsDueCount: 0,
                    state: 'must-not-survive',
                    code: 'must-not-survive',
                    redirectUrl: 'https://example.invalid/must-not-survive',
                },
            });
        });
        bootstrapLoad.and.callFake(async () => {
            variables.clearRuntimeValues();
            return {
                domain: 'pamelabetancourt.com',
                pageId: 'stripe-return',
                structuredDataApplied: false,
                pageConfig: {
                    version: 1,
                    domain: 'pamelabetancourt.com',
                    pageId: 'stripe-return',
                    rootIds: [],
                    modalRootIds: [],
                },
                components: null,
                combos: null,
            };
        });
        setRuntimeUrl('/integraciones/stripe/retorno?draftDomain=pamelabetancourt.com&state=opaque&code=opaque');

        await TestBed.inject(RuntimeService).initialize('es');

        expect(routeLoadExecuteAsync).toHaveBeenCalledTimes(1);
        expect(variables.getRecord(statusTarget)).toEqual({
            state: 'success',
            updatedAt: jasmine.any(String),
            error: null,
            data: {
                status: 'ready',
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true,
                capabilitiesReady: true,
                requirementsDueCount: 0,
            },
            status: 'ready',
        });
        expect(JSON.stringify(variables.getRecord(statusTarget))).not.toContain('must-not-survive');
        expect(runtimeDataSourcesStart).not.toHaveBeenCalled();
    });

    it('renders protected auth-admin browser routes after auth while initial data sources settle', async () => {
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
        await initialize;

        resolveDataSources();

        expect(service.rootComponentsIds()).toEqual(['mi-cuenta-root']);
        expect(setExternalComponentsFromPayload).toHaveBeenCalledWith(jasmine.objectContaining({
            pageId: 'mi-cuenta',
        }));
    });

    it('keeps protected browser routes renderable when a runtime data source fails synchronously', async () => {
        const service = TestBed.inject(RuntimeService);
        const authAdminDataSources = [
            {
                id: 'content-hub-article-detail',
                kind: 'content-hub',
                target: 'remote.contentHub.article',
                pageIds: ['admin-blog-articulo-editor'],
            },
        ];
        runtimeDataSourcesStart.and.callFake(() => {
            throw new Error('sync data source failure');
        });
        spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            account: {
                subject: 'admin-sub',
                email: 'admin@example.test',
                roles: ['zoosite-admin'],
                enabled: true,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const protectedSiteConfig = {
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                {
                    path: '/admin/blog/articulos/:id/editor',
                    pageId: 'admin-blog-articulo-editor',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-admin'],
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
        } as any;
        loadSiteConfig.and.resolveTo(protectedSiteConfig);
        store.setSiteConfig(protectedSiteConfig);
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: 'pamelabetancourt.com',
            pageId: 'admin-blog-articulo-editor',
            path: '/admin/blog/articulos/art_20260623/editor',
            route: protectedSiteConfig.routes[0],
            routeParams: { id: 'art_20260623' },
            explicitPageId: false,
        });

        setRuntimeUrl('/admin/blog/articulos/art_20260623/editor?draftDomain=pamelabetancourt.com&lang=es');
        await service.initialize('es');

        expect(runtimeDataSourcesStart).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.com',
            pageId: 'admin-blog-articulo-editor',
            routeParams: { id: 'art_20260623' },
            dataSources: authAdminDataSources,
            mode: 'all',
        });
        expect(service.rootComponentsIds()).toEqual(['admin-blog-articulo-editor-root']);
        expect(setExternalComponentsFromPayload).toHaveBeenCalledWith(jasmine.objectContaining({
            pageId: 'admin-blog-articulo-editor',
        }));
    });

    it('exposes private-route loading while server-cookie auth settles before rendering protected content', async () => {
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

        await initialize;
        resolveDataSources();

        expect(privateRouteLoading()).toEqual({
            active: false,
            phase: null,
        });
        expect(service.rootComponentsIds()).toEqual(['mi-cuenta-root']);
    });

    it('fails closed instead of keeping a protected browser route loading forever when session validation stalls', async () => {
        const service = TestBed.inject(RuntimeService);
        (service as any).protectedRouteAccessTimeoutMs = 1;
        const privateRouteLoading = () => (service as any).privateRouteLoading?.();
        spyOn(window, 'fetch').and.returnValue(new Promise<Response>(() => undefined));
        const protectedSiteConfig = {
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                {
                    path: '/admin/blog/articulos/:id/editor',
                    pageId: 'admin-blog-articulo-editor',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-admin'],
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
            },
            site: {},
        } as any;
        loadSiteConfig.and.resolveTo(protectedSiteConfig);
        store.setSiteConfig(protectedSiteConfig);
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: 'pamelabetancourt.com',
            pageId: 'admin-blog-articulo-editor',
            path: '/admin/blog/articulos/art_20260623/editor',
            route: {
                path: '/admin/blog/articulos/:id/editor',
                pageId: 'admin-blog-articulo-editor',
                auth: {
                    required: true,
                    allowedGroups: ['zoosite-admin'],
                    redirectTo: '/acceso',
                },
            },
            routeParams: { id: 'art_20260623' },
            explicitPageId: false,
        });

        setRuntimeUrl('/admin/blog/articulos/art_20260623/editor?draftDomain=pamelabetancourt.com&lang=es');
        await service.initialize('es');
        await new Promise<void>((resolve) => window.setTimeout(resolve, 5));
        await flushPostBootstrapBrowserWork();

        expect(window.fetch).toHaveBeenCalled();
        expect(privateRouteLoading()).toEqual({
            active: false,
            phase: null,
        });
        expect(service.rootComponentsIds()).toEqual([]);
        expect(window.location.pathname).toBe('/acceso');
        expect(window.location.search).toContain('draftDomain=pamelabetancourt.com');
        expect(bootstrapLoad).not.toHaveBeenCalled();
    });

    it('keeps a safe protected-route shell during SSR when route access cannot be authorized server-side', async () => {
        const service = TestBed.inject(RuntimeService);
        (service as any).isBrowser = false;
        const privateRouteLoading = () => (service as any).privateRouteLoading?.();
        loadSiteConfig.and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.com',
            defaultPageId: 'home',
            routes: [
                {
                    path: '/admin/blog/articulos/:id/editor',
                    pageId: 'admin-blog-articulo-editor',
                    auth: {
                        required: true,
                        allowedGroups: ['zoosite-admin'],
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
            },
            site: {},
        } as any);
        draftRuntimeResolveActiveDraftContext.and.resolveTo({
            domain: 'pamelabetancourt.com',
            pageId: 'admin-blog-articulo-editor',
            path: '/admin/blog/articulos/art_20260623/editor',
            route: {
                path: '/admin/blog/articulos/:id/editor',
                pageId: 'admin-blog-articulo-editor',
                auth: {
                    required: true,
                    allowedGroups: ['zoosite-admin'],
                    redirectTo: '/acceso',
                },
            },
            routeParams: { id: 'art_20260623' },
            explicitPageId: false,
        });

        await service.initialize('es');

        expect(privateRouteLoading()).toEqual({
            active: true,
            phase: 'session',
        });
        expect(service.rootComponentsIds()).toEqual([]);
        expect(bootstrapLoad).not.toHaveBeenCalled();
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

    it('does not continue an in-flight initialization after disconnect', async () => {
        let releaseContext!: () => void;
        let markContextRequested!: () => void;
        const contextRequested = new Promise<void>((resolve) => {
            markContextRequested = resolve;
        });
        draftRuntimeResolveActiveDraftContext.and.callFake(() => new Promise((resolve) => {
            releaseContext = () => resolve({
                domain: 'pamelabetancourt.com',
                pageId: 'home',
                path: '/home',
                route: { path: '/home', pageId: 'home' },
                explicitPageId: false,
            });
            markContextRequested();
        }));
        const service = TestBed.inject(RuntimeService);
        const initialization = service.initialize('es');

        await contextRequested;
        service.disconnect();
        releaseContext();
        await initialization;

        expect(bootstrapLoad).not.toHaveBeenCalled();
        expect(setExternalComponentsFromPayload).not.toHaveBeenCalled();
    });

    it('does not connect runtime work after its host has already been destroyed', () => {
        const service = TestBed.inject(RuntimeService);
        const initialize = spyOn(service, 'initialize').and.resolveTo();
        const onDestroy = jasmine.createSpy('onDestroy');

        service.connect({
            host: document.createElement('main'),
            destroyRef: { destroyed: true, onDestroy } as any,
            showDebugWorkspace: () => false,
            currentLanguage: () => 'es',
        });

        expect(onDestroy).not.toHaveBeenCalled();
        expect(initialize).not.toHaveBeenCalled();
    });

    it('does not listen for browser navigation before connecting to a host', () => {
        const service = TestBed.inject(RuntimeService);
        const initialize = spyOn(service, 'initialize').and.resolveTo();

        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));

        expect(initialize).not.toHaveBeenCalled();
    });
});
