import { ProcessStep } from '@/app/landing-page/components/interactive-process/interactive-process-leaf.types';
import type { TGenericStatsCounterConfig } from '@/app/shared/components/generic-stats-counter/generic-stats-counter.types';
import { I18nService } from '@/app/shared/services/i18n.service';
import type { TComponentsPayload } from '@/app/shared/types/config-payloads.types';
import { computed, effect, inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import type { ModalConfig } from '../components/generic-modal/generic-modal.types';
import { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import {
    collectAllClassesFromComponents,
    ComponentRenderTracker,
    findComponentById,
    normalizeComponentIfNeeded,
} from '../utility/component-orchestrator.utility';
import { forwardAnalyticsEvent } from '../utility/forwardAnalyticsEvent.utility';
import { AnalyticsService } from './analytics.service';
import { ComponentEvent, ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { createAccordions } from './component-stores/accordions.component-store';
import { buttons } from './component-stores/buttons.component-store';
import { createCards } from './component-stores/cards.component-store';
import { createComponents } from './component-stores/components.component-store';
import { createContainers } from './component-stores/containers.component-store';
import { devOnlyComponents } from './component-stores/devOnlyComponents.component-store';
import { dropdowns } from './component-stores/dropdowns.component-store';
import { icons } from './component-stores/icons.component-store';
import { createInteractiveProcesses } from './component-stores/interactiveProcesses.component-store';
import { links } from './component-stores/links.component-store';
import { loadingSpinners } from './component-stores/loadingSpinners.component-store';
import { media } from './component-stores/media.component-store';
import { modals } from './component-stores/modals.component-store';
import { progressBars } from './component-stores/progressBars.component-store';
import { searchBoxes } from './component-stores/searchBoxes.component-store';
import { createStatsCounters } from './component-stores/statsCounters.component-store';
import { steppers } from './component-stores/steppers.component-store';
import { tabGroups } from './component-stores/tabGroups.component-store';
import { texts } from './component-stores/texts.component-store';
import { toasts } from './component-stores/toasts.component-store';
import { tooltips } from './component-stores/tooltips.component-store';
import { InteractiveProcessStoreService } from './interactive-process-store.service';
import { QuickStatsService } from './quick-stats.service';
@Injectable({
    providedIn: 'root',
})
export class ConfigurationsOrchestratorService {
    readonly analytics = inject(AnalyticsService);
    private readonly quickStats = inject(QuickStatsService);
    private readonly modal = inject(GenericModalService);
    private readonly globalI18n = inject(I18nService);
    private readonly componentEventDispatcher = inject(ComponentEventDispatcherService);
    private readonly interactiveProcessStore = inject(InteractiveProcessStoreService);

    // [MODALS-1] Centralize modal state/config in orchestrator (moved from AppShell).
    readonly activeModalRef = computed(() => this.modal.modalRef());

    readonly consentVariant = computed<'dialog' | 'sheet'>(() => {
        const mode = environment.features.analyticsConsentUI;
        return mode === 'sheet' ? 'sheet' : 'dialog';
    });

    readonly modalHostConfig = computed<ModalConfig>(() => {
        const id = this.activeModalRef()?.id;
        return {
            ariaLabel:
                id === 'analytics-consent'
                    ? 'Analytics consent dialog'
                    : id === 'terms-of-service'
                        ? this.globalI18n.t('footer.legal.terms.title')
                        : id === 'data-use'
                            ? this.globalI18n.t('footer.legal.data.title')
                            : 'Dialog',
            closeOnBackdrop: id === 'analytics-consent' ? false : true,
            showCloseButton: id === 'analytics-consent' ? false : true,
            size: id === 'terms-of-service' ? 'lg' : id === 'data-use' ? 'md' : 'sm',
            showAccentBar: true,
            accentColor: 'secondaryAccentColor',
            variant: id === 'analytics-consent' ? this.consentVariant() : 'dialog',
        };
    });

    // Used as a safe fallback while async pipe resolves first emission.
    readonly fallbackModalHostConfig: ModalConfig = {
        ariaLabel: 'Dialog',
        closeOnBackdrop: true,
        showCloseButton: true,
        size: 'sm',
        showAccentBar: true,
        accentColor: 'secondaryAccentColor',
        variant: 'dialog',
    };

    // Template-friendly: emits a plain object so consumers don't need to call a signal.
    readonly modalHostConfig$ = toObservable(this.modalHostConfig);

    // Dev-only demo controls rendered via orchestrator + eventInstructions (no template handlers).
    get devDemoControlsComponents(): readonly TGenericComponent[] {
        if (!environment.features.debugMode) return [];
        return devOnlyComponents.filter((c) => c.id === 'devDemoControlsRoot');
    }

    constructor() {
        // [MODALS-2] Keep analytics consent visibility in sync with modal overlay.
        effect(() => {
            const needsConsent = this.analytics.consentVisible();
            const active = this.modal.modalRef();
            if (needsConsent && !active) {
                this.modal.open({ id: 'analytics-consent' });
            } else if (!needsConsent && active?.id === 'analytics-consent') {
                this.modal.close();
            }
        });

        // [MODALS-3] Forward modal analytics events into orchestrator analytics pipeline.
        try {
            this.modal.analyticsEvents$?.subscribe((e) => forwardAnalyticsEvent(this.analytics, e as any));
        } catch {
            // ignore
        }
    }

    private readonly footerConfig = {
        showCopyright: true,
        showSocialLinks: false,
        showLegalLinks: true,
        organizationName: 'Zoo Landing',
        copyrightText: '© 2025 Zoo Landing Page. All rights reserved.',
    } as const;

    private readonly footerTranslations = {
        en: {
            legalTitle: 'Legal',
            termsLink: 'Terms of Service',
            dataLink: 'Data Privacy',
            termsAriaLabel: 'Terms of Service',
            dataAriaLabel: 'Data Privacy',
        },
        es: {
            legalTitle: 'Legal',
            termsLink: 'Términos de servicio',
            dataLink: 'Privacidad de datos',
            termsAriaLabel: 'Términos de servicio',
            dataAriaLabel: 'Privacidad de datos',
        },
    } as const;

    private readonly statsStripRemote = computed(() => this.quickStats.remoteStats());

    private readonly statsStripVisitsConfig = computed<TGenericStatsCounterConfig>(() => ({
        target: Number(this.statsStripRemote()?.['metrics']?.['pageViews'] ?? this.analytics.getPageViewCount()),
        durationMs: 1600,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.globalI18n.t('statsStrip.visitsLabel'),
    }));

    private readonly statsStripCtaInteractionsConfig = computed<TGenericStatsCounterConfig>(() => ({
        target: Number(this.statsStripRemote()?.['metrics']?.['ctaClicks'] ?? this.analytics.getEventCount('ctaClicks')),
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.globalI18n.t('statsStrip.ctaInteractionsLabel'),
    }));

    private readonly statsStripAverageTimeConfig = computed<TGenericStatsCounterConfig>(() => ({
        target: Math.min(
            600,
            Math.max(
                284,
                Number(this.statsStripRemote()?.['metrics']?.['avgTimeSecs'] ?? this.analytics.getSessionEventCount() * 5)
            )
        ),
        durationMs: 2000,
        startOnVisible: true,
        format: (v: number) => `${ Math.round(v) }s`,
        ariaLabel: this.globalI18n.t('statsStrip.averageTimeLabel'),
    }));

    private readonly interactiveProcessSteps = computed<readonly ProcessStep[]>(() => {
        const stepIndex = this.interactiveProcessStore.currentStep();
        return this.globalI18n.getOr<readonly ProcessStep[]>('process', []).map((demo: ProcessStep) => ({
            ...demo,
            isActive: demo.step === stepIndex + 1,
        }));
    });
    readonly cards: TGenericComponent[] = createCards({
        globalI18n: this.globalI18n,
        onComponentEvent: (event) => this.handleComponentEvent(event),
    });
    readonly accordions: TGenericComponent[] = createAccordions(this.globalI18n);
    readonly containers: TGenericComponent[] = createContainers(this.globalI18n);
    readonly statsCounters: TGenericComponent[] = createStatsCounters({
        statsStripVisitsConfig: this.statsStripVisitsConfig,
        statsStripCtaInteractionsConfig: this.statsStripCtaInteractionsConfig,
        statsStripAverageTimeConfig: this.statsStripAverageTimeConfig,
    });
    readonly interactiveProcesses: TGenericComponent[] = createInteractiveProcesses({
        process: this.interactiveProcessSteps,
        currentStep: this.interactiveProcessStore.currentStep,
    });
    readonly components: TGenericComponent[] = createComponents({
        accordions: this.accordions,
        buttons: buttons,
        links: links,
        media: media,
        containers: this.containers,
        dropdowns: dropdowns,
        cards: this.cards,
        icons: icons,
        interactiveProcesses: this.interactiveProcesses,
        loadingSpinners: loadingSpinners,
        modals: modals,
        progressBars: progressBars,
        searchBoxes: searchBoxes,
        statsCounters: this.statsCounters,
        steppers: steppers,
        tabGroups: tabGroups,
        texts: texts,
        toasts: toasts,
        tooltips: tooltips,
        devOnlyComponents: devOnlyComponents,
    });

    private externalComponents: TGenericComponent[] | null = null;
    private externalComponentsMap = new Map<string, TGenericComponent>();
    private componentRenderTracker = new ComponentRenderTracker(this.components.map((c) => c.id));

    setExternalComponentsFromPayload(payload: TComponentsPayload | null): void {
        const record = payload?.components ?? {};
        const entries = Object.entries(record)
            .map(([id, value]) => {
                if (!value || typeof value !== 'object') return null;
                const component = value as TGenericComponent;
                return component.id ? component : { ...component, id };
            })
            .filter((component): component is TGenericComponent => !!component);

        if (entries.length === 0) {
            this.externalComponents = null;
            this.externalComponentsMap = new Map();
            this.componentRenderTracker = new ComponentRenderTracker(this.components.map((c) => c.id));
            return;
        }

        this.externalComponents = entries;
        this.externalComponentsMap = new Map(entries.map((component) => [component.id, component]));
        this.componentRenderTracker = new ComponentRenderTracker(entries.map((component) => component.id));
    }

    exportDraftComponentsPayload(domain: string, pageId: string): TComponentsPayload {
        const source = this.externalComponents ?? this.components;
        const components: Record<string, unknown> = {};

        source.forEach((component) => {
            components[component.id] = this.sanitizeComponentForPayload(component);
        });

        return {
            version: 1,
            domain,
            pageId,
            components,
        };
    }

    markComponentRendered(id: string): void {
        this.componentRenderTracker.markRendered(id);
    }

    getComponentById(id: string) {
        let component = this.externalComponentsMap.get(id) ?? findComponentById(this.components, id);
        if (!component) {
            console.error(`Component with id "${ id }" not found in ConfigurationsOrchestratorService.`);
        } else {
            component = normalizeComponentIfNeeded(component);
            this.markComponentRendered(id);
        }
        return component;
    }

    getAllTheClassesFromComponents(): string[] {
        return collectAllClassesFromComponents(this.externalComponents ?? this.components);
    }

    handleComponentEvent(event: ComponentEvent): void {
        this.componentEventDispatcher.dispatch(
            { event, host: this },
            {},
        );
    }

    private sanitizeComponentForPayload(component: TGenericComponent): Record<string, unknown> {
        return JSON.parse(
            JSON.stringify(component, (_key, value) => (typeof value === 'function' ? undefined : value))
        ) as Record<string, unknown>;
    }
}
