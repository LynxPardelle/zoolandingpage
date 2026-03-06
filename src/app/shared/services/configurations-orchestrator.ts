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
import { cards } from './component-stores/cards.component-store';
import { createComponents } from './component-stores/components.component-store';
import { containers } from './component-stores/containers.component-store';
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
import { LanguageService } from './language.service';
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
    private readonly language = inject(LanguageService);
    private readonly variableStore = inject(VariableStoreService);
    private warnedFooterSocialLinksMissing = false;
    private warnedFooterSocialLinksEmpty = false;
    private warnedFooterConfigMissing = false;
    private warnedFooterLegalMissing = false;
    private warnedFooterCopyrightMissing = false;
    private warnedNavigationMissing = false;
    private warnedProcessSectionMissing = false;
    private warnedProcessSectionInvalid = false;
    private warnedLoopPaths = new Set<string>();

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
                    ? this.globalI18n.t('ui.accessibility.analyticsConsentDialog')
                    : id === 'terms-of-service'
                        ? this.globalI18n.t('footer.legal.terms.title')
                        : id === 'data-use'
                            ? this.globalI18n.t('footer.legal.data.title')
                            : this.globalI18n.t('ui.accessibility.dialog'),
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
        ariaLabel: '',
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

    readonly statsStripVisitsFallback = computed(() => Number(
        this.statsStripRemote()?.['metrics']?.['pageViews'] ?? this.analytics.getPageViewCount()
    ));

    readonly statsStripCtaFallback = computed(() => Number(
        this.statsStripRemote()?.['metrics']?.['ctaClicks'] ?? this.analytics.getEventCount('ctaClicks')
    ));

    readonly statsStripAverageTimeFallback = computed(() => Math.min(
        600,
        Math.max(
            284,
            Number(this.statsStripRemote()?.['metrics']?.['avgTimeSecs'] ?? this.analytics.getSessionEventCount() * 5)
        )
    ));

    private readonly interactiveProcessVariableSteps = computed<readonly Record<string, unknown>[]>(() => {
        const raw = this.variableStore.get('processSection.steps');
        if (!Array.isArray(raw)) {
            if (!this.warnedProcessSectionMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.processSection.steps to be a non-empty array. Interactive process will remain hidden.');
                this.warnedProcessSectionMissing = true;
            }
            return [];
        }

        const valid = raw.filter((entry): entry is Record<string, unknown> => this.isInteractiveProcessStepConfig(entry));
        if (valid.length === 0 && !this.warnedProcessSectionInvalid) {
            console.warn('[ConfigurationsOrchestrator] variables.processSection.steps does not contain valid step records. Interactive process will remain hidden.');
            this.warnedProcessSectionInvalid = true;
        }

        return valid;
    });

    get hasValidInteractiveProcessConfig(): boolean {
        return this.interactiveProcessVariableSteps().length > 0;
    }

    readonly statsCounters: TGenericComponent[] = createStatsCounters();
    readonly interactiveProcesses: TGenericComponent[] = createInteractiveProcesses({
        currentStep: this.interactiveProcessStore.currentStep,
    });
    readonly components: TGenericComponent[] = createComponents({
        accordions: accordions,
        buttons: buttons,
        links: links,
        media: media,
        containers: containers,
        dropdowns: dropdowns,
        cards: cards,
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
        const raw = this.variableStore.get('footerConfig');
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            if (!this.warnedFooterConfigMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.footerConfig to be an object. Footer sections will remain hidden.');
                this.warnedFooterConfigMissing = true;
            }
            return {
                showLegalLinks: false,
                showSocialLinks: false,
                showCopyright: false,
                copyrightText: '',
            };
        }

        const footerConfig = raw as Record<string, unknown>;
        const legalRequested = Boolean(footerConfig['showLegalLinks']);
        const socialRequested = Boolean(footerConfig['showSocialLinks']);
        const copyrightRequested = Boolean(footerConfig['showCopyright']);
        const legalReady = this.hasFooterLegalI18n();
        const copyrightText = typeof footerConfig['copyrightText'] === 'string'
            ? footerConfig['copyrightText'].trim()
            : '';

        if (legalRequested && !legalReady && !this.warnedFooterLegalMissing) {
            console.warn('[ConfigurationsOrchestrator] Missing API i18n footer legal keys. Legal links will remain hidden.');
            this.warnedFooterLegalMissing = true;
        }

        if (copyrightRequested && copyrightText.length === 0 && !this.warnedFooterCopyrightMissing) {
            console.warn('[ConfigurationsOrchestrator] Missing variables.footerConfig.copyrightText. Copyright will remain hidden.');
            this.warnedFooterCopyrightMissing = true;
        }

        return {
            showLegalLinks: legalRequested && legalReady,
            showSocialLinks: socialRequested,
            showCopyright: copyrightRequested && copyrightText.length > 0,
            copyrightText,
        };
    }

    private hasFooterLegalI18n(): boolean {
        const legalTitle = this.globalI18n.get('footer.legal.title');
        const termsLink = this.globalI18n.get('footer.legal.terms.link');
        const dataLink = this.globalI18n.get('footer.legal.data.link');
        const termsSections = this.globalI18n.get('footer.legal.terms.sections');
        const dataPoints = this.globalI18n.get('footer.legal.data.points');

        const hasStrings = [legalTitle, termsLink, dataLink].every((value) => typeof value === 'string' && value.trim().length > 0);
        const hasSections = Array.isArray(termsSections) && termsSections.length > 0;
        const hasPoints = Array.isArray(dataPoints) && dataPoints.length > 0;
        return hasStrings && hasSections && hasPoints;
    }

    get navigation(): readonly Record<string, unknown>[] {
        const raw = this.variableStore.get('navigation');
        if (!Array.isArray(raw)) {
            if (!this.warnedNavigationMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.navigation to be an array. Navigation will remain hidden.');
                this.warnedNavigationMissing = true;
            }
            return [];
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
                this.warnLoopPathOnce('var', path);
                return [];
            }
            return raw;
        }

        if (source === 'i18n') {
            const raw = this.globalI18n.get(path);
            if (!Array.isArray(raw)) {
                this.warnLoopPathOnce('i18n', path);
                return [];
            }
            return raw;
        }

        return [];
    }

    private warnLoopPathOnce(source: 'var' | 'i18n', path: string): void {
        const key = `${ source }:${ path }`;
        if (this.warnedLoopPaths.has(key)) return;
        this.warnedLoopPaths.add(key);
        console.warn(`[ConfigurationsOrchestrator] loopConfig ${ source } source is not an array at path: ${ path }`);
    }

    private resolveI18nKeyString(key: unknown): string | undefined {
        if (typeof key !== 'string') return undefined;
        const normalized = key.trim();
        if (!normalized) return undefined;

        const direct = this.globalI18n.get(normalized);
        if (typeof direct === 'string' && direct.trim().length > 0) {
            return direct;
        }

        const translated = this.globalI18n.t(normalized);
        if (typeof translated === 'string' && translated.trim().length > 0 && translated !== normalized) {
            return translated;
        }

        return undefined;
    }

    private isInteractiveProcessStepConfig(entry: unknown): entry is Record<string, unknown> {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
        const record = entry as Record<string, unknown>;

        const hasTitle = typeof record['title'] === 'string' || typeof record['titleKey'] === 'string';
        const hasDescription = typeof record['description'] === 'string' || typeof record['descriptionKey'] === 'string';
        const hasDetailed = typeof record['detailedDescription'] === 'string' || typeof record['detailedDescriptionKey'] === 'string';
        const hasDuration = typeof record['duration'] === 'string' || typeof record['durationKey'] === 'string';
        const hasDeliverables =
            Array.isArray(record['deliverables']) ||
            typeof record['deliverablesKey'] === 'string' ||
            Array.isArray(record['deliverableKeys']);

        return hasTitle && hasDescription && hasDetailed && hasDuration && hasDeliverables;
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
            const sectionId = typeof record['sectionId'] === 'string'
                ? record['sectionId'].trim()
                : typeof record['value'] === 'string'
                    ? record['value'].trim()
                    : undefined;
            const href = typeof record['href'] === 'string'
                ? record['href'].trim()
                : sectionId && sectionId.length > 0
                    ? `#${ sectionId }`
                    : undefined;

            const lang = this.language.currentLanguage();
            const labelFromKey = this.resolveI18nKeyString(record['labelKey']);
            const ariaFromKey = this.resolveI18nKeyString(record['ariaLabelKey']);
            const localizedLabel = lang === 'es'
                ? (record['labelEs'] ?? record['label'])
                : (record['labelEn'] ?? record['label']);

            nextComponent.config.id = generatedId;
            if (typeof href === 'string' && href.length > 0) {
                nextComponent.config.href = href;
            } else if (typeof record['url'] === 'string') {
                nextComponent.config.href = record['url'];
            }
            if (typeof labelFromKey === 'string' && labelFromKey.trim().length > 0) {
                nextComponent.config.text = labelFromKey;
            } else if (typeof localizedLabel === 'string' && localizedLabel.trim().length > 0) {
                nextComponent.config.text = localizedLabel;
            }
            if (typeof record['icon'] === 'string') nextComponent.config.text = record['icon'];
            if (typeof ariaFromKey === 'string' && ariaFromKey.trim().length > 0) {
                nextComponent.config.ariaLabel = ariaFromKey;
            } else if (typeof record['ariaLabel'] === 'string') {
                nextComponent.config.ariaLabel = record['ariaLabel'];
            }
            if (typeof record['target'] === 'string') nextComponent.config.target = record['target'];
            if (typeof record['rel'] === 'string') nextComponent.config.rel = record['rel'];

            if (!nextComponent.config.ariaLabel && typeof nextComponent.config.text === 'string') {
                nextComponent.config.ariaLabel = nextComponent.config.text;
            }
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
            const recordText = typeof record['text'] === 'string' ? record['text'] : undefined;
            const recordBody = typeof record['body'] === 'string' ? record['body'] : undefined;
            const recordTitle = typeof record['title'] === 'string' ? record['title'] : undefined;

            if (recordText != null) {
                nextComponent.config.text = recordText;
            } else if (recordBody != null && recordTitle != null) {
                nextComponent.config.text = `${ recordTitle }: ${ recordBody }`;
            } else if (recordBody != null) {
                nextComponent.config.text = recordBody;
            } else if (recordTitle != null) {
                nextComponent.config.text = recordTitle;
            }
        }

        if (template.type === 'text' && typeof item === 'string') {
            nextComponent.config.text = item;
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
