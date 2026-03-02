import { ProcessStep } from '@/app/landing-page/components/interactive-process/interactive-process-leaf.types';
import type { TGenericStatsCounterConfig } from '@/app/shared/components/generic-stats-counter/generic-stats-counter.types';
import { I18N_CONFIG } from '@/app/shared/i18n/index.i18n';
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
import { accordions } from './component-stores/accordions.component-store';
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
import { VariableStoreService } from './variable-store.service';
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
    private readonly variableStore = inject(VariableStoreService);
    private warnedFooterSocialLinksMissing = false;
    private warnedFooterSocialLinksEmpty = false;
    private warnedNavigationMissing = false;

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
    readonly cards: TGenericComponent[] = createCards();
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
        accordions: accordions,
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

    get footerSocialLinks(): readonly Record<string, unknown>[] {
        const raw = this.variableStore.get('footerSocialLinks');
        if (!Array.isArray(raw)) {
            if (!this.warnedFooterSocialLinksMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.footerSocialLinks to be an array.');
                this.warnedFooterSocialLinksMissing = true;
            }
            return [];
        }
        if (raw.length === 0 && !this.warnedFooterSocialLinksEmpty) {
            console.warn('[ConfigurationsOrchestrator] variables.footerSocialLinks is empty. Footer social links will not render.');
            this.warnedFooterSocialLinksEmpty = true;
        }
        return raw.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
    }

    get footerConfig(): Record<string, unknown> {
        const fallback = {
            showLegalLinks: true,
            showSocialLinks: true,
            showCopyright: true,
            copyrightText: '© 2025 Zoo Landing Page. Todos los derechos reservados.',
        };
        return this.variableStore.getOr<Record<string, unknown>>('footerConfig', fallback);
    }

    get footerTranslations(): Record<string, Record<string, string>> {
        const esFooter = (I18N_CONFIG.translations.es as any)?.footer?.legal;
        const enFooter = (I18N_CONFIG.translations.en as any)?.footer?.legal;
        return {
            en: {
                legalTitle: String(enFooter?.title ?? 'Legal'),
                termsLink: String(enFooter?.terms?.link ?? 'Terms of Service'),
                dataLink: String(enFooter?.data?.link ?? 'Data Privacy'),
                termsAriaLabel: String(enFooter?.terms?.link ?? 'Terms of Service'),
                dataAriaLabel: String(enFooter?.data?.link ?? 'Data Privacy'),
            },
            es: {
                legalTitle: String(esFooter?.title ?? 'Legal'),
                termsLink: String(esFooter?.terms?.link ?? 'Terminos de servicio'),
                dataLink: String(esFooter?.data?.link ?? 'Privacidad de datos'),
                termsAriaLabel: String(esFooter?.terms?.link ?? 'Terminos de servicio'),
                dataAriaLabel: String(esFooter?.data?.link ?? 'Privacidad de datos'),
            },
        };
    }

    get navigation(): readonly Record<string, unknown>[] {
        const fallback: readonly Record<string, unknown>[] = [
            { id: 'home', sectionId: 'home', href: '#home', analyticsKey: 'home', labelEn: 'Home', labelEs: 'Inicio' },
            { id: 'benefits', sectionId: 'features-section', href: '#features-section', analyticsKey: 'benefits', labelEn: 'Benefits', labelEs: 'Beneficios' },
            { id: 'process', sectionId: 'process-section', href: '#process-section', analyticsKey: 'process', labelEn: 'Process', labelEs: 'Proceso' },
            { id: 'services', sectionId: 'services-section', href: '#services-section', analyticsKey: 'services', labelEn: 'Services', labelEs: 'Servicios' },
            { id: 'contact', sectionId: 'contact-section', href: '#contact-section', analyticsKey: 'contact', labelEn: 'Contact', labelEs: 'Contacto' },
        ];

        const raw = this.variableStore.get('navigation');
        if (!Array.isArray(raw)) {
            if (!this.warnedNavigationMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.navigation to be an array. Using fallback navigation.');
                this.warnedNavigationMissing = true;
            }
            return fallback;
        }

        return raw.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
    }

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
        const resolved = this.resolveLoopComponents();
        let component = resolved.get(id) ?? this.externalComponentsMap.get(id) ?? findComponentById(this.components, id);
        if (!component) {
            console.error(`Component with id "${ id }" not found in ConfigurationsOrchestratorService.`);
        } else {
            component = normalizeComponentIfNeeded(component);
            this.markComponentRendered(id);
        }
        return component;
    }

    getAllTheClassesFromComponents(): string[] {
        return collectAllClassesFromComponents(Array.from(this.resolveLoopComponents().values()));
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

    private resolveLoopComponents(): Map<string, TGenericComponent> {
        const source = this.externalComponents ?? this.components;
        const resolved = new Map<string, TGenericComponent>(source.map((component) => [component.id, component]));

        for (const component of source) {
            const loop = (component as any).loopConfig;
            if (!loop) continue;

            const templateId = String(loop.templateId ?? '').trim();
            if (!templateId) continue;

            const template = resolved.get(templateId) ?? source.find((item) => item.id === templateId);
            if (!template) {
                console.warn(`[ConfigurationsOrchestrator] loopConfig template not found: ${ templateId }`);
                continue;
            }

            const items = this.resolveLoopItems(loop);
            const prefix = String(loop.idPrefix ?? templateId).trim() || templateId;
            const generatedIds = items.map((_, index) => `${ prefix }__${ index + 1 }`);

            if (component.type === 'container') {
                const nextContainer = {
                    ...component,
                    config: {
                        ...component.config,
                        components: generatedIds,
                    },
                } as TGenericComponent;
                resolved.set(component.id, nextContainer);
            }

            items.forEach((item, index) => {
                const generatedId = generatedIds[index];
                resolved.set(generatedId, this.materializeLoopComponent(template, generatedId, item));
            });
        }

        return resolved;
    }

    private resolveLoopItems(loop: any): readonly unknown[] {
        const source = String(loop?.source ?? '').trim();
        if (source === 'repeat') {
            const count = Number(loop?.count ?? 0);
            if (!Number.isFinite(count) || count <= 0) return [];
            return Array.from({ length: Math.floor(count) }, (_, index) => ({ index: index + 1 }));
        }

        const path = String(loop?.path ?? '').trim();
        if (!path) return [];

        if (source === 'var') {
            const raw = this.variableStore.get(path);
            if (!Array.isArray(raw)) {
                console.warn(`[ConfigurationsOrchestrator] loopConfig var source is not an array at path: ${ path }`);
                return [];
            }
            return raw;
        }

        if (source === 'i18n') {
            const raw = this.globalI18n.get(path);
            if (!Array.isArray(raw)) {
                console.warn(`[ConfigurationsOrchestrator] loopConfig i18n source is not an array at path: ${ path }`);
                return [];
            }
            return raw;
        }

        return [];
    }

    private materializeLoopComponent(template: TGenericComponent, generatedId: string, item: unknown): TGenericComponent {
        const nextComponent: any = {
            ...template,
            id: generatedId,
            config: {
                ...(template as any).config,
            },
        };

        if (template.type === 'link' && item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            nextComponent.config.id = generatedId;
            if (typeof record['url'] === 'string') nextComponent.config.href = record['url'];
            if (typeof record['icon'] === 'string') nextComponent.config.text = record['icon'];
            if (typeof record['ariaLabel'] === 'string') nextComponent.config.ariaLabel = record['ariaLabel'];
            if (typeof record['target'] === 'string') nextComponent.config.target = record['target'];
            if (typeof record['rel'] === 'string') nextComponent.config.rel = record['rel'];
        }

        if (template.type === 'feature-card' && item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            if (typeof record['icon'] === 'string') nextComponent.config.icon = record['icon'];
            if (typeof record['title'] === 'string') nextComponent.config.title = record['title'];
            if (typeof record['description'] === 'string') nextComponent.config.description = record['description'];

            const benefits = Array.isArray(record['benefits'])
                ? record['benefits']
                : Array.isArray(record['features'])
                    ? record['features']
                    : undefined;
            if (Array.isArray(benefits)) nextComponent.config.benefits = benefits;

            if (typeof record['buttonLabel'] === 'string') {
                nextComponent.config.buttonLabel = record['buttonLabel'];
                nextComponent.config.onCta = (title: string) => {
                    this.handleComponentEvent({
                        componentId: generatedId,
                        eventName: 'cta',
                        meta_title: String((template as any).meta_title ?? 'services_cta_click'),
                        eventData: { label: title },
                        eventInstructions: String((template as any).eventInstructions ?? ''),
                    });
                };
            }
        }

        if (template.type === 'testimonial-card' && item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            if (typeof record['name'] === 'string') nextComponent.config.name = record['name'];
            if (typeof record['role'] === 'string') nextComponent.config.role = record['role'];
            if (typeof record['company'] === 'string') nextComponent.config.company = record['company'];
            if (typeof record['content'] === 'string') nextComponent.config.content = record['content'];
            if (typeof record['avatar'] === 'string') nextComponent.config.avatar = record['avatar'];
            if (typeof record['rating'] === 'number' && Number.isFinite(record['rating'])) {
                nextComponent.config.rating = record['rating'];
            }
        }

        if (template.type === 'text' && item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            if (typeof record['text'] === 'string') {
                nextComponent.config.text = record['text'];
            }
        }

        if (template.type === 'container' && Array.isArray(nextComponent.config?.components)) {
            nextComponent.config.components = nextComponent.config.components.map((componentId: unknown) => {
                if (componentId === 'badgeTextTemplate') {
                    const suffix = generatedId.split('__').pop() ?? '';
                    return `badgeText__${ suffix }`;
                }
                return componentId;
            });
        }

        return nextComponent as TGenericComponent;
    }
}
