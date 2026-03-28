import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { AngoraCombosService } from '@/app/shared/services/angora-combos.service';
import { ConfigBootstrapService } from '@/app/shared/services/config-bootstrap.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RuntimeService {
    private readonly configBootstrap = inject(ConfigBootstrapService);
    private readonly orchestrator = inject(ConfigurationsOrchestratorService);
    private readonly draftRuntime = inject(DraftRuntimeService);
    private readonly combosService = inject(AngoraCombosService);
    private readonly analytics = inject(AnalyticsService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly router = inject(Router, { optional: true });
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

    readonly rootComponentsIds = signal<readonly string[]>([]);
    readonly modalRootIds = signal<readonly string[]>([]);
    private initializeQueue: Promise<void> = Promise.resolve();
    private cssMutationObserver: MutationObserver | null = null;
    private navigationSubscription: Subscription | null = null;
    private currentLanguageResolver: (() => string) | null = null;

    connect(options: {
        host: HTMLElement;
        destroyRef: DestroyRef;
        showDebugWorkspace: boolean;
        currentLanguage: () => string;
    }): void {
        this.currentLanguageResolver = options.currentLanguage;
        if (this.isBrowser) {
            this.analytics.promptForConsentIfNeeded();
            this.combosService.initializeBaseCombos(1000);
            this.bindCssMutationRefresh(options.host);
            this.bindNavigationRefresh();

            if (options.showDebugWorkspace) {
                this.combosService.revealCssTimer();
            }
        }

        options.destroyRef.onDestroy(() => this.disconnect());

        void this.initialize(options.currentLanguage())
            .catch((error) => {
                console.error('[Runtime] Initial page bootstrap failed.', error);
            });
    }

    disconnect(): void {
        this.analytics.stopPageEngagementTracking();
        this.navigationSubscription?.unsubscribe();
        this.navigationSubscription = null;
        this.combosService.stopCssRuntime();

        try {
            this.cssMutationObserver?.disconnect();
        } catch {
            // no-op
        }

        this.cssMutationObserver = null;
        this.currentLanguageResolver = null;
    }

    requestCssCreate(delayMs = 0): void {
        this.combosService.scheduleCssCreate(delayMs);
    }

    async initialize(lang?: string): Promise<void> {
        const nextLanguage = lang;
        this.initializeQueue = this.initializeQueue
            .catch(() => undefined)
            .then(() => this.doInitialize(nextLanguage));

        return this.initializeQueue;
    }

    private async doInitialize(lang?: string): Promise<void> {
        const context = await this.draftRuntime.resolveActiveDraftContext();
        const pageId = context.pageId;
        const boot = await this.configBootstrap.load({
            domain: context.domain,
            pageId,
            lang,
        });

        const domain = boot.domain || context.domain || environment.drafts.defaultDomain;
        const pageConfig = boot.pageConfig;
        const componentsPayload = boot.components;
        const validationIssues = this.configStore.validationIssues();
        const hasRenderableComponents = !!componentsPayload && Object.keys(componentsPayload.components ?? {}).length > 0;
        const rootIds = pageConfig?.rootIds ?? [];
        const modalRootIds = pageConfig?.modalRootIds ?? [];

        if (validationIssues.length > 0 || !hasRenderableComponents || rootIds.length === 0) {
            this.clearRenderedDraft(domain, pageId);
            if (environment.features.debugMode) {
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
        this.rootComponentsIds.set(rootIds);
        this.modalRootIds.set(modalRootIds);
        this.orchestrator.setDraftExportContext({ domain, pageId, rootIds, modalRootIds });

        this.combosService.applyPayload(boot.combos);
        this.combosService.scheduleCssCreate();
        this.analytics.startPageEngagementTracking(this.configStore.analytics());
    }

    clearRenderedDraft(domain: string, pageId: string): void {
        this.rootComponentsIds.set([]);
        this.modalRootIds.set([]);
        this.orchestrator.setExternalComponentsFromPayload(null);
        this.orchestrator.setDraftExportContext({
            domain,
            pageId,
            rootIds: [],
            modalRootIds: [],
        });
    }

    private bindNavigationRefresh(): void {
        if (!this.isBrowser || !this.router || this.navigationSubscription) {
            return;
        }

        this.navigationSubscription = this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => {
                void this.analytics.track(AnalyticsEvents.PageView, {
                    category: AnalyticsCategories.Navigation,
                    label: event.urlAfterRedirects,
                });

                const lang = this.currentLanguageResolver?.();
                void this.initialize(lang)
                    .catch((error) => {
                        console.error('[Runtime] Runtime refresh failed after navigation.', error);
                    });
            });
    }

    private bindCssMutationRefresh(root: HTMLElement): void {
        if (!this.isBrowser || this.cssMutationObserver) {
            return;
        }

        const observer = new MutationObserver((mutations) => {
            if (!this.hasRelevantCssMutation(mutations)) {
                return;
            }

            this.combosService.scheduleCssCreate();
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
