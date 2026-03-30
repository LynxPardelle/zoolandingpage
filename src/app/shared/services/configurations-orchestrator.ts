import { resolveLocaleMapValue } from '@/app/shared/i18n/locale.utils';
import { I18nService } from '@/app/shared/services/i18n.service';
import type { TComponentsPayload, TDraftModalUiConfig } from '@/app/shared/types/config-payloads.types';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import type { ModalConfig } from '../components/generic-modal/generic-modal.types';
import type {
    TGenericComponent,
    TGenericComponentType,
    TLoopBinding,
    TLoopBindingSource,
    TLoopBindingTransform,
    TLoopConfig,
} from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import type { TThemeAccentColorToken } from '../types/theme.types';
import {
    collectAllClassesFromComponents,
    ComponentRenderTracker,
    findComponentById,
    normalizeComponentIfNeeded,
} from '../utility/component-orchestrator.utility';
import { forwardAnalyticsEvent } from '../utility/forwardAnalyticsEvent.utility';
import { toNavigationHref } from '../utility/navigation/navigation-target.utility';
import { AnalyticsEvents } from './analytics.events';
import { AnalyticsService } from './analytics.service';
import { ComponentEvent, ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { devOnlyComponents } from './component-stores/devOnlyComponents.component-store';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { LanguageService } from './language.service';
import { VariableStoreService } from './variable-store.service';

const LOOP_INDEX_TOKEN = '{{index}}';
const LOOP_WHOLE_ITEM_TOKEN = '$item';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

@Injectable({
    providedIn: 'root',
})
export class ConfigurationsOrchestratorService {
    readonly analytics = inject(AnalyticsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly modal = inject(GenericModalService);
    private readonly globalI18n = inject(I18nService);
    private readonly componentEventDispatcher = inject(ComponentEventDispatcherService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly language = inject(LanguageService);
    private readonly variableStore = inject(VariableStoreService);
    private warnedNavigationMissing = false;
    private warnedLoopPaths = new Set<string>();
    private readonly loopComponentFinalizers: Partial<Record<
        TGenericComponentType,
        (nextComponent: any, template: TGenericComponent, generatedId: string) => void
    >> = {
            container: (nextComponent, _template, generatedId) => {
                this.materializeContainerLoopComponent(nextComponent, generatedId);
            },
            'generic-card': (nextComponent, template, generatedId) => {
                this.attachGeneratedCardCta(nextComponent, template, generatedId);
            },
            link: (nextComponent) => {
                if (!nextComponent.config?.ariaLabel && typeof nextComponent.config?.text === 'string') {
                    nextComponent.config.ariaLabel = nextComponent.config.text;
                }
            },
        };
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
    readonly fallbackModalHostConfig: ModalConfig = this.resolveModalHostConfig();

    private resolveAccentToken(path: string, fallback: TThemeAccentColorToken): TThemeAccentColorToken {
        const value = this.variableStore.get(path);
        return value === 'accentColor' || value === 'secondaryAccentColor' ? value : fallback;
    }

    private getModalDefaultsConfig(): TDraftModalUiConfig | null {
        const value = this.variableStore.get('ui.modals._default');
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        return value as TDraftModalUiConfig;
    }

    private getPayloadModalConfig(modalId?: string): TDraftModalUiConfig | null {
        const defaults = this.getModalDefaultsConfig();
        if (!modalId) return defaults;

        const value = this.variableStore.get(`ui.modals.${ modalId }`);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;

        return {
            ...(defaults ?? {}),
            ...(value as TDraftModalUiConfig),
        };
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
            ariaDescribedBy: payloadConfig?.ariaDescribedBy,
            closeOnBackdrop: payloadConfig?.closeOnBackdrop ?? true,
            showCloseButton: payloadConfig?.showCloseButton ?? true,
            size: payloadConfig?.size ?? 'sm',
            showAccentBar: payloadConfig?.showAccentBar ?? true,
            accentColor: payloadConfig?.accentColor ?? this.resolveModalAccentColor(modalId),
            variant: payloadConfig?.variant ?? 'dialog',
            containerClasses: payloadConfig?.containerClasses,
            containerDialogClasses: payloadConfig?.containerDialogClasses,
            containerSheetClasses: payloadConfig?.containerSheetClasses,
            panelClasses: payloadConfig?.panelClasses,
            panelDialogClasses: payloadConfig?.panelDialogClasses,
            panelSheetClasses: payloadConfig?.panelSheetClasses,
            panelMotionClasses: payloadConfig?.panelMotionClasses,
            panelNoMotionClasses: payloadConfig?.panelNoMotionClasses,
            panelSMClasses: payloadConfig?.panelSMClasses,
            panelMDClasses: payloadConfig?.panelMDClasses,
            panelLGClasses: payloadConfig?.panelLGClasses,
            accentBarClasses: payloadConfig?.accentBarClasses,
            closeButtonClasses: payloadConfig?.closeButtonClasses,
        };
    }

    private resolveModalAccentColor(modalId?: string): TThemeAccentColorToken {
        if (modalId === 'demo-modal') {
            return this.resolveAccentToken('theme.ui.demoModalAccentColor', 'accentColor');
        }

        if (modalId === 'terms-of-service' || modalId === 'data-use') {
            return this.resolveAccentToken('theme.ui.legalModalAccentColor', 'secondaryAccentColor');
        }

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
                resolved.set(generatedId, this.materializeLoopComponent(template, generatedId, item, loop as TLoopConfig));
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

    private resolveGeneratedLoopIndex(generatedId: string): string {
        return String(generatedId.split('__').pop() ?? '').trim();
    }

    private getLoopBindingSourcePath(source: TLoopBindingSource): string {
        return typeof source === 'string' ? source : source.from;
    }

    private getLoopBindingSourceTransform(source: TLoopBindingSource): TLoopBindingTransform | undefined {
        return typeof source === 'string' ? undefined : source.transform;
    }

    private getLoopItemValue(item: unknown, path: string): unknown {
        const normalizedPath = path.trim();
        if (!normalizedPath) return undefined;
        if (normalizedPath === LOOP_WHOLE_ITEM_TOKEN) return item;

        let current: unknown = item;
        for (const segment of normalizedPath.split('.').map((entry) => entry.trim()).filter(Boolean)) {
            if (Array.isArray(current)) {
                const index = Number(segment);
                if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
                current = current[index];
                continue;
            }

            if (!isRecord(current) || !(segment in current)) return undefined;
            current = current[segment];
        }

        return current;
    }

    private hasResolvedLoopBindingValue(value: unknown): boolean {
        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    }

    private applyLoopBindingTransform(value: unknown, transform?: TLoopBindingTransform): unknown {
        if (transform === undefined) return value;

        switch (transform) {
            case 'i18nKey':
                return this.resolveI18nKeyString(value);
            case 'locale':
                if (typeof value === 'string') return value.trim();
                if (isRecord(value)) {
                    return resolveLocaleMapValue(value, this.language.currentLanguage());
                }
                return undefined;
            case 'navigationHref':
                return value == null ? undefined : toNavigationHref(value);
            default:
                return value;
        }
    }

    private resolveLoopBindingValue(binding: TLoopBinding, item: unknown): unknown {
        for (const source of binding.sources) {
            const rawValue = this.getLoopItemValue(item, this.getLoopBindingSourcePath(source));
            const transformedValue = this.applyLoopBindingTransform(rawValue, this.getLoopBindingSourceTransform(source));
            if (this.hasResolvedLoopBindingValue(transformedValue)) {
                return transformedValue;
            }
        }

        if (Object.prototype.hasOwnProperty.call(binding, 'fallback')) {
            return binding.fallback;
        }

        return undefined;
    }

    private assignLoopBindingValue(target: Record<string, unknown>, path: string, value: unknown): void {
        const segments = path.split('.').map((entry) => entry.trim()).filter(Boolean);
        if (segments.length === 0) return;

        let current = target;
        for (const segment of segments.slice(0, -1)) {
            const existing = current[segment];
            const next = Array.isArray(existing)
                ? [...existing]
                : isRecord(existing)
                    ? { ...existing }
                    : {};

            current[segment] = next;
            current = next as Record<string, unknown>;
        }

        current[segments.at(-1)!] = value;
    }

    private applyLoopBindings(nextComponent: any, bindings: readonly TLoopBinding[] | undefined, item: unknown): void {
        if (!Array.isArray(bindings) || bindings.length === 0) return;

        for (const binding of bindings) {
            const resolvedValue = this.resolveLoopBindingValue(binding, item);
            if (resolvedValue === undefined && !Object.prototype.hasOwnProperty.call(binding, 'fallback')) {
                continue;
            }

            this.assignLoopBindingValue(nextComponent as Record<string, unknown>, binding.to, resolvedValue);
        }
    }

    private replaceLoopIndexToken(value: unknown, generatedId: string): unknown {
        if (typeof value !== 'string' || !value.includes(LOOP_INDEX_TOKEN)) return value;

        const index = this.resolveGeneratedLoopIndex(generatedId);
        if (!index) return value;

        return value.split(LOOP_INDEX_TOKEN).join(index);
    }

    private materializeContainerLoopComponent(nextComponent: any, generatedId: string): void {
        if (!Array.isArray(nextComponent.config?.components)) return;

        nextComponent.config.components = nextComponent.config.components.map((componentId: unknown) => {
            return this.replaceLoopIndexToken(componentId, generatedId);
        });
    }

    private attachGeneratedCardCta(nextComponent: any, template: TGenericComponent, generatedId: string): void {
        if (typeof nextComponent.config?.buttonLabel !== 'string' || nextComponent.config.buttonLabel.trim().length === 0) {
            return;
        }

        nextComponent.config.onCta = (title: string) => {
            this.handleComponentEvent({
                componentId: generatedId,
                eventName: 'cta',
                meta_title: String((template as any).meta_title ?? AnalyticsEvents.CtaClick),
                eventData: { label: title },
                eventInstructions: String((template as any).eventInstructions ?? ''),
            });
        };
    }

    private materializeLoopComponent(template: TGenericComponent, generatedId: string, item: unknown, loop: TLoopConfig): TGenericComponent {
        const nextComponent: any = {
            ...template,
            id: generatedId,
            config: {
                ...(template as any).config,
            },
        };

        if (typeof nextComponent.config?.id === 'string') {
            nextComponent.config.id = generatedId;
        }

        this.applyLoopBindings(nextComponent, loop.bindings, item);

        const finalizeComponent = this.loopComponentFinalizers[template.type];
        if (finalizeComponent) {
            finalizeComponent(nextComponent, template, generatedId);
        }

        return nextComponent as TGenericComponent;
    }
}
