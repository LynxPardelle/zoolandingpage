import { resolveLocaleMapValue } from '@/app/shared/i18n/locale.utils';
import { I18nService } from '@/app/shared/services/i18n.service';
import type { TComponentsPayload, TDraftModalUiConfig } from '@/app/shared/types/config-payloads.types';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import type { ModalConfig } from '../components/generic-modal/generic-modal.types';
import { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import type { TThemeAccentColorToken } from '../types/theme.types';
import {
    collectAllClassesFromComponents,
    ComponentRenderTracker,
    findComponentById,
    normalizeComponentIfNeeded,
} from '../utility/component-orchestrator.utility';
import { forwardAnalyticsEvent } from '../utility/forwardAnalyticsEvent.utility';
import { toNavigationHref } from '../utility/navigation/navigation-target.utility';
import { AnalyticsService } from './analytics.service';
import { ComponentEvent, ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { devOnlyComponents } from './component-stores/devOnlyComponents.component-store';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { LanguageService } from './language.service';
import { QuickStatsService } from './quick-stats.service';
import { VariableStoreService } from './variable-store.service';
@Injectable({
    providedIn: 'root',
})
export class ConfigurationsOrchestratorService {
    readonly analytics = inject(AnalyticsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly quickStats = inject(QuickStatsService);
    private readonly modal = inject(GenericModalService);
    private readonly globalI18n = inject(I18nService);
    private readonly componentEventDispatcher = inject(ComponentEventDispatcherService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly language = inject(LanguageService);
    private readonly variableStore = inject(VariableStoreService);
    private warnedNavigationMissing = false;
    private warnedLoopPaths = new Set<string>();
    private readonly draftExportContext = signal({
        domain: '',
        pageId: '',
        rootIds: [] as readonly string[],
        modalRootIds: [] as readonly string[],
    });

    // [MODALS-1] Centralize modal state/config in orchestrator (moved from AppShell).
    readonly activeModalRef = computed(() => this.modal.modalRef());

    readonly modalHostConfig = computed<ModalConfig>(() => {
        return this.resolveModalHostConfig(this.activeModalRef()?.id);
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

    private resolveAccentToken(path: string, fallback: TThemeAccentColorToken): TThemeAccentColorToken {
        const value = this.variableStore.get(path);
        return value === 'accentColor' || value === 'secondaryAccentColor' ? value : fallback;
    }

    private getPayloadModalConfig(modalId?: string): TDraftModalUiConfig | null {
        if (!modalId) return null;

        const value = this.variableStore.get(`ui.modals.${ modalId }`);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        return value as TDraftModalUiConfig;
    }

    private resolveModalAriaLabel(modalId: string | undefined, payloadConfig: TDraftModalUiConfig | null): string {
        if (typeof payloadConfig?.ariaLabel === 'string' && payloadConfig.ariaLabel.trim().length > 0) {
            return payloadConfig.ariaLabel.trim();
        }

        if (typeof payloadConfig?.ariaLabelKey === 'string' && payloadConfig.ariaLabelKey.trim().length > 0) {
            return this.globalI18n.t(payloadConfig.ariaLabelKey);
        }

        return this.globalI18n.t('ui.accessibility.dialog');
    }

    private resolveModalHostConfig(modalId?: string): ModalConfig {
        const payloadConfig = this.getPayloadModalConfig(modalId);

        return {
            ariaLabel: this.resolveModalAriaLabel(modalId, payloadConfig),
            closeOnBackdrop: payloadConfig?.closeOnBackdrop ?? true,
            showCloseButton: payloadConfig?.showCloseButton ?? true,
            size: payloadConfig?.size ?? 'sm',
            showAccentBar: payloadConfig?.showAccentBar ?? true,
            accentColor: payloadConfig?.accentColor ?? this.resolveModalAccentColor(modalId),
            variant: payloadConfig?.variant ?? 'dialog',
        };
    }

    private resolveModalAccentColor(modalId?: string): TThemeAccentColorToken {
        return this.resolveAccentToken('theme.ui.modalAccentColor', 'secondaryAccentColor');
    }

    // Template-friendly: emits a plain object so consumers don't need to call a signal.
    readonly modalHostConfig$ = toObservable(this.modalHostConfig);

    // Dev-only demo controls rendered via orchestrator + eventInstructions (no template handlers).
    get devDemoControlsComponents(): readonly TGenericComponent[] {
        if (!environment.features.debugMode) return [];
        return devOnlyComponents.filter((c) => c.id === 'devDemoControlsRoot');
    }

    setDraftExportContext(context: {
        domain: string;
        pageId: string;
        rootIds: readonly string[];
        modalRootIds: readonly string[];
    }): void {
        this.draftExportContext.set({
            domain: String(context.domain).trim(),
            pageId: String(context.pageId).trim(),
            rootIds: [...context.rootIds],
            modalRootIds: [...context.modalRootIds],
        });
    }

    downloadDraftPayloads(): void {
        if (!environment.features.debugMode || typeof document === 'undefined') return;

        const context = this.draftExportContext();
        const payloads = this.buildDraftPayloads(context.domain, context.pageId);

        payloads.forEach((payload) => {
            const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = payload.name;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    async writeDraftPayloadsToDisk(): Promise<void> {
        if (!environment.features.debugMode || typeof window === 'undefined') return;

        const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
        if (typeof picker !== 'function') {
            this.downloadDraftPayloads();
            return;
        }

        const context = this.draftExportContext();
        const payloads = this.buildDraftPayloads(context.domain, context.pageId);

        try {
            const dirHandle = await picker();
            for (const payload of payloads) {
                await this.writeFileToDir(dirHandle, payload.name, JSON.stringify(payload.data, null, 2));
            }
        } catch {
            this.downloadDraftPayloads();
        }
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
            this.modal.analyticsEvents$
                ?.pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((e) => forwardAnalyticsEvent(this.analytics, e as any));
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

    readonly statsStripAverageTimeFallback = computed(() => Math.max(
        0,
        Number(this.statsStripRemote()?.['metrics']?.['avgTimeSecs'] ?? this.analytics.getSessionEventCount() * 5)
    ));

    readonly components: TGenericComponent[] = [...devOnlyComponents];

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
    private readonly externalComponentsRevision = signal(0);

    readonly componentsRevision = computed(() => this.externalComponentsRevision());

    private getActiveComponentSource(): readonly TGenericComponent[] {
        if (!this.externalComponents || this.externalComponents.length === 0) {
            return this.components;
        }

        const overridden = new Set(this.externalComponents.map((component) => component.id));
        return [
            ...this.components.filter((component) => !overridden.has(component.id)),
            ...this.externalComponents,
        ];
    }

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
            this.externalComponentsRevision.update((value) => value + 1);
            return;
        }

        this.externalComponents = entries;
        this.externalComponentsMap = new Map(entries.map((component) => [component.id, component]));
        this.componentRenderTracker = new ComponentRenderTracker(this.getActiveComponentSource().map((component) => component.id));
        this.externalComponentsRevision.update((value) => value + 1);
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

    private buildDraftPayloads(domain: string, pageId: string): { name: string; data: unknown }[] {
        const context = this.draftExportContext();
        const resolvedDomain = String(domain).trim() || context.domain || this.domainResolver.resolveDomain().domain;
        const resolvedPageId = String(pageId).trim() || context.pageId;
        const pageConfig = this.configStore.pageConfig() ?? {
            version: 1,
            pageId: resolvedPageId,
            domain: resolvedDomain,
            rootIds: context.rootIds,
            modalRootIds: context.modalRootIds,
        };
        const componentsPayload = this.configStore.components() ?? this.exportDraftComponentsPayload(resolvedDomain, resolvedPageId);
        const variables = this.configStore.variables();
        const combos = this.configStore.combos();
        const seo = this.configStore.seo();
        const structured = this.configStore.structuredData();
        const analytics = this.configStore.analytics();
        const i18n = this.configStore.i18n();

        const payloads: { name: string; data: unknown }[] = [
            { name: 'page-config.json', data: pageConfig },
            { name: 'components.json', data: componentsPayload },
        ];

        if (variables) payloads.push({ name: 'variables.json', data: variables });
        if (combos) payloads.push({ name: 'angora-combos.json', data: combos });
        if (seo) payloads.push({ name: 'seo.json', data: seo });
        if (structured) payloads.push({ name: 'structured-data.json', data: structured });
        if (analytics) payloads.push({ name: 'analytics-config.json', data: analytics });
        if (i18n) payloads.push({ name: `i18n/${ i18n.lang }.json`, data: i18n });

        return payloads;
    }

    private async writeFileToDir(dirHandle: any, name: string, contents: string): Promise<void> {
        const parts = name.split('/').filter(Boolean);
        let current = dirHandle;
        while (parts.length > 1) {
            const part = parts.shift() as string;
            current = await current.getDirectoryHandle(part, { create: true });
        }
        const fileName = parts[0];
        const fileHandle = await current.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();
    }

    markComponentRendered(id: string): void {
        this.componentRenderTracker.markRendered(id);
    }

    getComponentById(id: string) {
        const resolved = this.resolveLoopComponents(false);
        let component = resolved.get(id) ?? findComponentById(this.getActiveComponentSource(), id);
        if (!component) {
            console.error(`Component with id "${ id }" not found in ConfigurationsOrchestratorService.`);
        } else {
            component = normalizeComponentIfNeeded(component);
            this.markComponentRendered(id);
        }
        return component;
    }

    getAllTheClassesFromComponents(): string[] {
        return collectAllClassesFromComponents(Array.from(this.resolveLoopComponents(false).values()));
    }

    handleComponentEvent(event: ComponentEvent, host?: unknown): void {
        this.componentEventDispatcher.dispatch(
            { event, host: host ?? this },
            {},
        );
    }

    private sanitizeComponentForPayload(component: TGenericComponent): Record<string, unknown> {
        return JSON.parse(
            JSON.stringify(component, (_key, value) => (typeof value === 'function' ? undefined : value))
        ) as Record<string, unknown>;
    }

    private resolveLoopComponents(warnOnMissingSource: boolean): Map<string, TGenericComponent> {
        const source = this.getActiveComponentSource();
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

            const items = this.resolveLoopItems(loop, warnOnMissingSource);
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

    private resolveLoopItems(loop: any, warnOnMissingSource: boolean): readonly unknown[] {
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
                if (warnOnMissingSource) this.warnLoopPathOnce('var', path);
                return [];
            }
            return raw;
        }

        if (source === 'i18n') {
            const raw = this.globalI18n.get(path);
            if (!Array.isArray(raw)) {
                if (warnOnMissingSource) this.warnLoopPathOnce('i18n', path);
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
            const href = typeof record['href'] === 'string'
                ? record['href'].trim()
                : typeof record['url'] === 'string'
                    ? record['url'].trim()
                    : toNavigationHref(record['value']);

            const lang = this.language.currentLanguage();
            const labelFromKey = this.resolveI18nKeyString(record['labelKey']);
            const ariaFromKey = this.resolveI18nKeyString(record['ariaLabelKey']);
            const localizedLabelFromValue = resolveLocaleMapValue(record['label'], lang);
            const localizedLabelFromLabels = resolveLocaleMapValue(record['labels'], lang);
            const fallbackLabel = typeof record['label'] === 'string' ? record['label'].trim() : undefined;
            const localizedAriaLabel = resolveLocaleMapValue(record['ariaLabel'], lang);

            nextComponent.config.id = generatedId;
            if (typeof href === 'string' && href.length > 0) {
                nextComponent.config.href = href;
            }
            if (typeof labelFromKey === 'string' && labelFromKey.trim().length > 0) {
                nextComponent.config.text = labelFromKey;
            } else if (typeof localizedLabelFromValue === 'string' && localizedLabelFromValue.trim().length > 0) {
                nextComponent.config.text = localizedLabelFromValue;
            } else if (typeof localizedLabelFromLabels === 'string' && localizedLabelFromLabels.trim().length > 0) {
                nextComponent.config.text = localizedLabelFromLabels;
            } else if (typeof fallbackLabel === 'string' && fallbackLabel.length > 0) {
                nextComponent.config.text = fallbackLabel;
            }
            if (typeof record['icon'] === 'string') nextComponent.config.text = record['icon'];
            if (typeof ariaFromKey === 'string' && ariaFromKey.trim().length > 0) {
                nextComponent.config.ariaLabel = ariaFromKey;
            } else if (typeof localizedAriaLabel === 'string' && localizedAriaLabel.trim().length > 0) {
                nextComponent.config.ariaLabel = localizedAriaLabel;
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
