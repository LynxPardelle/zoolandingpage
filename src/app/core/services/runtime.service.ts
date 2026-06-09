import { AnalyticsCategories } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { AngoraCombosService } from '@/app/shared/services/angora-combos.service';
import { ConfigBootstrapService } from '@/app/shared/services/config-bootstrap.service';
import { ConfigSourceService } from '@/app/shared/services/config-source.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS, DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { RuntimeDataSourceService } from '@/app/shared/services/runtime-data-source.service';
import { RuntimeConfigService } from '@/app/shared/services/runtime-config.service';
import { ThemeService } from '@/app/shared/services/theme.service';
import { AuthFacade } from '@/app/state/auth/auth.facade';
import { AuthRuntimeService } from '@/app/state/auth/auth-runtime.service';
import { applyNavigationScroll, currentBrowserPath, navigateInCurrentWindow } from '@/app/shared/utility/navigation/browser-navigation.utility';
import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { LoadingCurtainService } from './loading-curtain.service';

@Injectable({ providedIn: 'root' })
export class RuntimeService {
    private readonly prefetchSiblingCap = 5;
    private readonly configBootstrap = inject(ConfigBootstrapService);
    private readonly configSource = inject(ConfigSourceService);
    private readonly orchestrator = inject(ConfigurationsOrchestratorService);
    private readonly draftRuntime = inject(DraftRuntimeService);
    private readonly combosService = inject(AngoraCombosService);
    private readonly analytics = inject(AnalyticsService);
    private readonly runtimeDataSources = inject(RuntimeDataSourceService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly auth = inject(AuthFacade);
    private readonly authRuntime = inject(AuthRuntimeService);
    private readonly theme = inject(ThemeService);
    private readonly loadingCurtain = inject(LoadingCurtainService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    readonly rootComponentsIds = signal<readonly string[]>([]);
    readonly modalRootIds = signal<readonly string[]>([]);
    readonly debugWorkspaceRootIds = signal<readonly string[]>([]);
    readonly debugWorkspaceModalRootIds = signal<readonly string[]>([]);
    private initializeQueue: Promise<void> = Promise.resolve();
    private debugWorkspaceEnabled = false;
    private debugWorkspaceInit: Promise<void> | null = null;
    private cssMutationObserver: MutationObserver | null = null;
    private navigationUnlisten: (() => void) | null = null;
    private currentLanguageResolver: (() => string) | null = null;
    private showDebugWorkspaceResolver: (() => boolean) | null = null;
    private renderedClassesRoot: HTMLElement | null = null;
    private hasCompletedInitialBootstrap = false;
    private initialPageViewTracked = false;
    private postBootstrapBrowserWorkId = 0;
    private renderedCssUpdateId = 0;
    private loadingCurtainReadyId = 0;
    private readonly cssReadyRetryDelayMs = 250;
    private readonly cssRenderedComboRetryDelayMs = 50;
    private readonly cssReadyAttemptWaitMs = 750;
    private readonly cssReadyMaxWaitMs = 20_000;
    private readonly cssReadySoftFallbackMs = 2_500;
    private readonly cssReadyStabilityPasses = 2;
    private readonly criticalRenderedTextCombos = [
        { className: 'sectionTitle', tokenName: 'titleColor' },
        { className: 'sectionSubtitle', tokenName: 'secondaryTitleColor' },
        { className: 'heroCaption', tokenName: 'secondaryTitleColor' },
    ] as const;

    connect(options: {
        host: HTMLElement;
        destroyRef: DestroyRef;
        showDebugWorkspace: () => boolean;
        currentLanguage: () => string;
    }): void {
        this.currentLanguageResolver = options.currentLanguage;
        this.showDebugWorkspaceResolver = options.showDebugWorkspace;
        this.debugWorkspaceEnabled = options.showDebugWorkspace();
        this.renderedClassesRoot = options.host;
        if (this.isBrowser) {
            this.bindCssMutationRefresh(options.host);
            this.bindNavigationRefresh();
        }

        options.destroyRef.onDestroy(() => this.disconnect());

        if (!this.hasCompletedInitialBootstrap) {
            void this.initialize(options.currentLanguage())
                .catch((error) => {
                    console.error('[Runtime] Initial page bootstrap failed.', error);
                });
            return;
        }

        this.configureDebugWorkspaceAfterConnect();
    }

    disconnect(): void {
        this.analytics.stopPageEngagementTracking();
        this.runtimeDataSources.stop();
        this.combosService.stopCssRuntime();
        this.postBootstrapBrowserWorkId++;
        this.renderedCssUpdateId++;
        this.loadingCurtainReadyId++;
        this.navigationUnlisten?.();
        this.navigationUnlisten = null;

        try {
            this.cssMutationObserver?.disconnect();
        } catch {
            // no-op
        }

        this.cssMutationObserver = null;
        this.currentLanguageResolver = null;
        this.showDebugWorkspaceResolver = null;
        this.renderedClassesRoot = null;
    }

    requestCssCreate(delayMs = 0): void {
        this.combosService.scheduleCssCreate(delayMs);
    }

    requestRenderedComponentsCssUpdate(): void {
        const authoredClasses = this.orchestrator.getAllTheClassesFromComponents();
        const renderedClasses = this.combosService.collectRenderedDomClasses(this.renderedClassesRoot ?? undefined);
        const requiredCssClasses = [...authoredClasses, ...renderedClasses];
        this.combosService.updateClasses(requiredCssClasses);
        this.theme.applyTheme();
        this.hideLoadingCurtainAfterCssReady('rendered-components-css-updated', Date.now(), requiredCssClasses);
    }

    async initialize(lang?: string): Promise<void> {
        const nextLanguage = lang;
        this.initializeQueue = this.initializeQueue
            .catch(() => undefined)
            .then(async () => {
                this.debugWorkspaceEnabled = this.showDebugWorkspaceResolver?.() ?? false;
                await this.ensureDebugWorkspaceConfigured();
                await this.doInitialize(nextLanguage);
                this.hasCompletedInitialBootstrap = this.hasRenderableState();
            });

        return this.initializeQueue;
    }

    private hasRenderableState(): boolean {
        return this.rootComponentsIds().length > 0
            || this.modalRootIds().length > 0
            || this.debugWorkspaceRootIds().length > 0
            || this.debugWorkspaceModalRootIds().length > 0;
    }

    private async ensureDebugWorkspaceConfigured(): Promise<void> {
        if (!this.debugWorkspaceEnabled) {
            this.debugWorkspaceInit = null;
            this.debugWorkspaceRootIds.set([]);
            this.debugWorkspaceModalRootIds.set([]);
            this.orchestrator.setAuxiliaryComponentsFromPayload('debug-workspace', null);
            this.combosService.clearAuxiliaryCombos('debug-workspace');
            return;
        }

        if (!this.debugWorkspaceInit) {
            this.debugWorkspaceInit = this.loadDebugWorkspacePayloads();
        }

        await this.debugWorkspaceInit;
    }

    private configureDebugWorkspaceAfterConnect(): void {
        if (!this.debugWorkspaceEnabled) {
            return;
        }

        void this.ensureDebugWorkspaceConfigured()
            .then(() => {
                this.modalRootIds.set(this.resolveModalRootIds(this.modalRootIds()));
                this.requestRenderedComponentsCssUpdate();
            })
            .catch(() => undefined);
    }

    private async loadDebugWorkspacePayloads(): Promise<void> {
        const [pageConfig, components, combos] = await Promise.all([
            this.configSource.loadDebugWorkspacePageConfig?.() ?? Promise.resolve(null),
            this.configSource.loadDebugWorkspaceComponents?.() ?? Promise.resolve(null),
            this.configSource.loadDebugWorkspaceCombos?.() ?? Promise.resolve(null),
        ]);

        this.orchestrator.setAuxiliaryComponentsFromPayload('debug-workspace', components);
        this.combosService.setAuxiliaryCombos('debug-workspace', combos);
        this.debugWorkspaceRootIds.set(pageConfig?.rootIds ?? []);
        this.debugWorkspaceModalRootIds.set(pageConfig?.modalRootIds ?? []);
    }

    private resolveAuthRedirectHref(redirectTo: string): string {
        if (!this.isSafeSameOriginRedirectPath(redirectTo)) {
            return '/';
        }

        if (!this.isBrowser || typeof window === 'undefined' || !window.location) {
            return redirectTo;
        }

        const nextUrl = new URL(redirectTo, window.location.href);
        const currentUrl = new URL(window.location.href);
        DRAFT_RUNTIME_STICKY_QUERY_PARAMS.forEach((key) => {
            if (!nextUrl.searchParams.has(key) && currentUrl.searchParams.has(key)) {
                nextUrl.searchParams.set(key, currentUrl.searchParams.get(key) ?? '');
            }
        });
        return `${ nextUrl.pathname || '/' }${ nextUrl.search || '' }${ nextUrl.hash || '' }`;
    }

    private isSafeSameOriginRedirectPath(value: string): boolean {
        return value.length > 0
            && value.startsWith('/')
            && !value.startsWith('//')
            && !value.includes('\\')
            && !/[\s\u0000-\u001F\u007F]/.test(value);
    }

    private async doInitialize(lang?: string): Promise<void> {
        const context = await this.draftRuntime.resolveActiveDraftContext();
        if (!context.domain || !context.pageId) {
            this.clearRenderedDraft(context.domain, context.pageId);
            this.loadingCurtain.hideWhenReady('missing-draft-context');
            if (this.runtimeConfig.isDebugMode()) {
                console.warn('[Runtime] Skipping page bootstrap until a draft domain and page are selected.', {
                    domain: context.domain,
                    pageId: context.pageId,
                    path: context.path,
                });
            }
            return;
        }

        const remoteAuthResolved = await this.runtimeConfig.resolveRemoteAuth(context.domain);
        if (!remoteAuthResolved && this.runtimeConfig.isDebugMode()) {
            console.warn('[Runtime] Remote auth runtime resolution failed closed.', {
                reason: this.runtimeConfig.remoteAuthError(),
            });
        }

        this.auth.restoreSession();
        const routeAccess = this.authRuntime.evaluateRouteAccess(context.route);
        if (!routeAccess.allowed) {
            this.clearRenderedDraft(context.domain, context.pageId);
            this.auth.requestSignIn(this.authRuntime.profile()?.provider);
            this.loadingCurtain.hideWhenReady(`auth-route-${ routeAccess.reason }`);
            // SSR has no response redirect hook in this runtime; protected drafts render no private content.
            if (this.isBrowser && routeAccess.redirectTo) {
                navigateInCurrentWindow(this.resolveAuthRedirectHref(routeAccess.redirectTo), {
                    scrollRestoration: this.runtimeConfig.siteRuntime()?.navigation?.scrollRestoration,
                });
            }
            return;
        }

        const pageId = context.pageId;
        const boot = await this.configBootstrap.load({
            domain: context.domain,
            pageId,
            lang,
        });

        const domain = boot.domain || context.domain;
        this.loadingCurtain.configureFromDraft();
        const pageConfig = boot.pageConfig;
        const componentsPayload = boot.components;
        const validationIssues = this.configStore.validationIssues();
        const hasRenderableComponents = !!componentsPayload && Object.keys(componentsPayload.components ?? {}).length > 0;
        const rootIds = pageConfig?.rootIds ?? [];
        const modalRootIds = this.resolveModalRootIds(pageConfig?.modalRootIds ?? []);

        if (validationIssues.length > 0 || !hasRenderableComponents || rootIds.length === 0) {
            this.clearRenderedDraft(domain, pageId);
            this.loadingCurtain.hideWhenReady('invalid-draft-payload');
            if (this.runtimeConfig.isDebugMode()) {
                console.error('[Drafts] Draft render aborted because the active payload set is invalid.', {
                    domain,
                    pageId,
                    validationIssues,
                    hasRenderableComponents,
                    rootIds,
                });
            }
            return;
        }

        this.orchestrator.setExternalComponentsFromPayload(componentsPayload);
        const dataSourcesLoaded = this.startRuntimeDataSources(domain, pageId);
        if (!this.isBrowser) {
            await dataSourcesLoaded;
        }

        this.prewarmAuthoredComponentsCss();
        this.rootComponentsIds.set(rootIds);
        this.modalRootIds.set(modalRootIds);
        this.orchestrator.setDraftExportContext({ domain, pageId, rootIds, modalRootIds });

        this.scheduleRenderedComponentsCssUpdate();
        const initialPageViewLabel = this.resolveCurrentBrowserUrlLabel();
        this.schedulePostBootstrapBrowserWork(() => {
            if (this.shouldSkipPostBootstrapBrowserWork()) {
                return;
            }

            this.analytics.initializeRuntimeState();
            this.analytics.startPageEngagementTracking(this.configStore.analytics());
            this.prefetchSiblingRoutes(domain, pageId, lang, context.path);
            this.trackInitialPageView(initialPageViewLabel);
        });
    }

    private startRuntimeDataSources(domain: string, pageId: string): Promise<void> {
        const dataSources = this.configStore.siteConfig()?.runtime?.dataSources ?? [];
        if (!dataSources.length) {
            this.runtimeDataSources.stop();
            return Promise.resolve();
        }

        return this.runtimeDataSources.start({
            domain,
            pageId,
            dataSources,
            mode: this.isBrowser ? 'all' : 'ssr',
        }).catch((error) => {
            if (this.runtimeConfig.isDebugMode()) {
                console.error('[Runtime] Runtime data source bootstrap failed.', error);
            }
        });
    }

    private scheduleRenderedComponentsCssUpdate(): void {
        if (!this.isBrowser || typeof window === 'undefined') {
            return;
        }

        const updateId = ++this.renderedCssUpdateId;
        window.setTimeout(() => {
            if (updateId !== this.renderedCssUpdateId) {
                return;
            }

            this.requestRenderedComponentsCssUpdate();
        }, 0);
    }

    private prewarmAuthoredComponentsCss(): void {
        if (!this.isBrowser) {
            return;
        }

        const authoredClasses = this.orchestrator.getAllTheClassesFromComponents();
        if (authoredClasses.length === 0) {
            return;
        }

        this.combosService.updateClasses(authoredClasses);
        this.theme.applyTheme();
    }

    private hideLoadingCurtainAfterCssReady(
        reason: string,
        startedAt = Date.now(),
        requiredCssClasses: readonly string[] = [],
        stableReadyPasses = 0,
    ): void {
        if (!this.isBrowser) {
            return;
        }

        const readyId = ++this.loadingCurtainReadyId;
        const cssClassesToVerify = this.collectCssClassesToVerify(requiredCssClasses);
        const hasRenderedCombo = this.combosService.containsRegisteredComboClass(cssClassesToVerify);

        const elapsedBeforeComboMs = Date.now() - startedAt;

        if (!hasRenderedCombo && elapsedBeforeComboMs < this.cssReadySoftFallbackMs) {
            window.setTimeout(() => {
                if (readyId !== this.loadingCurtainReadyId) {
                    return;
                }

                this.hideLoadingCurtainAfterCssReady(reason, startedAt, cssClassesToVerify, stableReadyPasses);
            }, this.cssRenderedComboRetryDelayMs);
            return;
        }

        if (!hasRenderedCombo) {
            this.combosService.updateClasses(cssClassesToVerify);
            this.loadingCurtain.hideWhenReady(reason);
            return;
        }

        this.combosService.updateClasses(cssClassesToVerify);

        const elapsedMs = Date.now() - startedAt;
        const attemptWaitMs = Math.max(0, Math.min(this.cssReadyAttemptWaitMs, this.cssReadyMaxWaitMs - elapsedMs));

        void this.combosService.waitForCssReady(attemptWaitMs, cssClassesToVerify)
            .then((ready) => {
                if (readyId !== this.loadingCurtainReadyId) {
                    return;
                }

                const elapsedAfterAttemptMs = Date.now() - startedAt;
                const criticalTextReady = this.renderedCriticalTextColorsReady();

                if (!ready && elapsedAfterAttemptMs >= this.cssReadySoftFallbackMs && criticalTextReady) {
                    this.loadingCurtain.hideWhenReady(reason);
                    return;
                }

                if (!ready && elapsedAfterAttemptMs < this.cssReadyMaxWaitMs) {
                    window.setTimeout(() => {
                        if (readyId !== this.loadingCurtainReadyId) {
                            return;
                        }

                        this.hideLoadingCurtainAfterCssReady(reason, startedAt, cssClassesToVerify);
                    }, this.cssReadyRetryDelayMs);
                    return;
                }

                if (ready && stableReadyPasses < this.cssReadyStabilityPasses) {
                    this.hideLoadingCurtainAfterCssReady(reason, startedAt, cssClassesToVerify, stableReadyPasses + 1);
                    return;
                }

                if (ready && !criticalTextReady && elapsedAfterAttemptMs < this.cssReadyMaxWaitMs) {
                    window.setTimeout(() => {
                        if (readyId !== this.loadingCurtainReadyId) {
                            return;
                        }

                        this.hideLoadingCurtainAfterCssReady(reason, startedAt, cssClassesToVerify, stableReadyPasses);
                    }, this.cssRenderedComboRetryDelayMs);
                    return;
                }

                if (!ready && this.runtimeConfig.isDebugMode()) {
                    console.warn('[Runtime] Hiding loading curtain after CSS readiness timeout.', { reason });
                }

                this.loadingCurtain.hideWhenReady(reason);
            })
            .catch((error) => {
                if (readyId !== this.loadingCurtainReadyId) {
                    return;
                }

                if (Date.now() - startedAt < this.cssReadyMaxWaitMs) {
                    window.setTimeout(() => {
                        if (readyId !== this.loadingCurtainReadyId) {
                            return;
                        }

                        this.hideLoadingCurtainAfterCssReady(reason, startedAt, cssClassesToVerify);
                    }, this.cssReadyRetryDelayMs);
                    return;
                }

                if (this.runtimeConfig.isDebugMode()) {
                    console.warn('[Runtime] Hiding loading curtain after CSS readiness error.', { reason, error });
                }

                this.loadingCurtain.hideWhenReady(reason);
            });
    }

    private collectCssClassesToVerify(requiredCssClasses: readonly string[]): string[] {
        const latestRenderedClasses = this.combosService.collectRenderedDomClasses(this.renderedClassesRoot ?? undefined);
        return Array.from(new Set([...requiredCssClasses, ...latestRenderedClasses]));
    }

    private renderedCriticalTextColorsReady(): boolean {
        if (!this.isBrowser || typeof document === 'undefined') {
            return true;
        }

        return this.criticalRenderedTextCombos.every(({ className, tokenName }) => (
            this.renderedComboColorReady(className, tokenName)
        ));
    }

    private renderedComboColorReady(className: string, tokenName: string): boolean {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(`.${ className }`));
        if (elements.length === 0) {
            return true;
        }

        const expectedColor = this.resolveCssColorToken(tokenName);
        if (!expectedColor) {
            return true;
        }

        return elements.every((element) => getComputedStyle(element).color === expectedColor);
    }

    private resolveCssColorToken(tokenName: string): string | null {
        if (typeof document === 'undefined' || !document.body) {
            return null;
        }

        const probe = document.createElement('span');
        probe.style.color = `var(--ank-${ tokenName })`;
        probe.style.position = 'absolute';
        probe.style.pointerEvents = 'none';
        probe.style.visibility = 'hidden';
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color || null;
    }

    private schedulePostBootstrapBrowserWork(task: () => void): void {
        if (!this.isBrowser) {
            return;
        }

        const workId = ++this.postBootstrapBrowserWorkId;
        window.setTimeout(() => {
            if (workId !== this.postBootstrapBrowserWorkId) {
                return;
            }

            task();
        }, 0);
    }

    private trackInitialPageView(label?: string): void {
        if (!this.isBrowser || this.initialPageViewTracked) {
            return;
        }

        const currentUrl = label ?? this.resolveCurrentBrowserUrlLabel();
        this.initialPageViewTracked = true;
        void this.analytics.track(this.analytics.pageViewEventName(), {
            category: AnalyticsCategories.Navigation,
            label: currentUrl || '/',
        });
    }

    private resolveCurrentBrowserUrlLabel(): string {
        if (!this.isBrowser || typeof window === 'undefined') {
            return '/';
        }

        return `${ window.location.pathname || '/' }${ window.location.search || '' }${ window.location.hash || '' }` || '/';
    }

    private isAutomatedBrowser(): boolean {
        if (!this.isBrowser || typeof navigator === 'undefined') {
            return false;
        }

        if (navigator.webdriver) {
            return true;
        }

        const userAgent = navigator.userAgent || '';
        return /Chrome-Lighthouse|Lighthouse|PageSpeed|GTmetrix|Pingdom|WebPageTest|SpeedCurve|HeadlessChrome/i.test(userAgent);
    }

    private isLocalBrowserHost(): boolean {
        if (!this.isBrowser || typeof window === 'undefined') {
            return false;
        }

        const hostname = String(window.location?.hostname ?? '').trim();
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }

    private shouldSkipPostBootstrapBrowserWork(): boolean {
        return this.isAutomatedBrowser() || (environment.production && this.isLocalBrowserHost());
    }

    clearRenderedDraft(domain: string, pageId: string): void {
        this.rootComponentsIds.set([]);
        this.modalRootIds.set(this.resolveModalRootIds([]));
        this.orchestrator.setExternalComponentsFromPayload(null);
        this.orchestrator.setDraftExportContext({
            domain,
            pageId,
            rootIds: [],
            modalRootIds: this.resolveModalRootIds([]),
        });
    }

    private resolveModalRootIds(modalRootIds: readonly string[]): readonly string[] {
        if (!this.debugWorkspaceEnabled) {
            return [...modalRootIds];
        }

        return Array.from(new Set([...modalRootIds, ...this.debugWorkspaceModalRootIds()]));
    }

    private bindNavigationRefresh(): void {
        if (!this.isBrowser || this.navigationUnlisten) {
            return;
        }

        const handleNavigation = () => {
            void this.analytics.track(this.analytics.pageViewEventName(), {
                category: AnalyticsCategories.Navigation,
                label: currentBrowserPath(),
            });

            this.markRuntimeDataSourcesLoadingForNavigation();
            const lang = this.currentLanguageResolver?.();
            void this.initialize(lang)
                .then(() => this.applyConfiguredNavigationScroll())
                .catch((error) => {
                    console.error('[Runtime] Runtime refresh failed after navigation.', error);
                });
        };

        window.addEventListener('popstate', handleNavigation);
        this.navigationUnlisten = () => window.removeEventListener('popstate', handleNavigation);
    }

    private markRuntimeDataSourcesLoadingForNavigation(): void {
        const dataSources = this.configStore.siteConfig()?.runtime?.dataSources ?? [];
        if (!dataSources.length) {
            return;
        }

        this.runtimeDataSources.markInitialSourcesLoading?.({
            pageId: this.configStore.pageConfig()?.pageId,
            dataSources,
        });
    }

    private applyConfiguredNavigationScroll(): void {
        if (!this.isBrowser) {
            return;
        }

        applyNavigationScroll(this.configStore.siteConfig()?.runtime?.navigation?.scrollRestoration);
    }

    private prefetchSiblingRoutes(domain: string, pageId: string, lang: string | undefined, currentPath: string): void {
        const siteConfig = this.configStore.siteConfig();
        const routes = siteConfig?.routes ?? [];
        if (!domain || routes.length === 0) {
            return;
        }

        const seen = new Set<string>();
        let prefetchCount = 0;
        for (const route of routes) {
            if (prefetchCount >= this.prefetchSiblingCap) {
                break;
            }

            const routePageId = String(route?.pageId ?? '').trim();
            const routePath = String(route?.path ?? '').trim();
            if (!routePageId || !routePath) {
                continue;
            }

            const routeKey = `${ routePageId }::${ routePath }`;
            if (seen.has(routeKey)) {
                continue;
            }

            seen.add(routeKey);
            if (routePageId === pageId && routePath === currentPath) {
                continue;
            }

            void this.configSource.prefetchRoute(domain, {
                pageId: routePageId,
                lang,
                path: routePath,
            });
            prefetchCount++;
        }
    }

    private bindCssMutationRefresh(root: HTMLElement): void {
        if (!this.isBrowser || this.cssMutationObserver) {
            return;
        }

        const observer = new MutationObserver((mutations) => {
            if (!this.hasRelevantCssMutation(mutations)) {
                return;
            }

            this.requestRenderedComponentsCssUpdate();
        });

        try {
            observer.observe(root, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class'],
            });
            this.cssMutationObserver = observer;
        } catch {
            observer.disconnect();
        }
    }

    private hasRelevantCssMutation(mutations: readonly MutationRecord[]): boolean {
        return mutations.some((mutation) => {
            if (mutation.type === 'attributes') {
                return mutation.target instanceof HTMLElement;
            }

            return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
        });
    }
}
