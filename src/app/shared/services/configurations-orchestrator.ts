import { I18nService } from '@/app/shared/services/i18n.service';
import type { TComponentsPayload, TDraftModalUiConfig } from '@/app/shared/types/config-payloads.types';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import type { ModalConfig } from '../components/generic-modal/generic-modal.types';
import type { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import {
    collectAllClassesFromComponents,
    ComponentRenderTracker,
    findComponentById,
    materializeLoopComponents,
    normalizeComponentIfNeeded,
} from '../utility/component-orchestrator.utility';
import { forwardAnalyticsEvent } from '../utility/forwardAnalyticsEvent.utility';
import { AnalyticsEvents } from './analytics.events';
import { AnalyticsService } from './analytics.service';
import { BrowserStateService, type TBrowserRuntimeState } from './browser-state.service';
import { ComponentEvent, ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { LanguageService } from './language.service';
import { RuntimeConfigService } from './runtime-config.service';
import { ValueOrchestrator } from './value-orchestrator';
import { VariableStoreService } from './variable-store.service';

type TDraftExportFile = {
    readonly name: string;
    readonly downloadName: string;
    readonly data: unknown;
};

@Injectable({
    providedIn: 'root',
})
export class ConfigurationsOrchestratorService {
    readonly analytics = inject(AnalyticsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly modal = inject(GenericModalService);
    private readonly globalI18n = inject(I18nService);
    private readonly componentEventDispatcher = inject(ComponentEventDispatcherService);
    private readonly browserState = inject(BrowserStateService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly language = inject(LanguageService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly valueOrchestrator = inject(ValueOrchestrator);
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
    readonly fallbackModalHostConfig: ModalConfig = this.resolveModalHostConfig();

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
            size: payloadConfig?.size,
            showAccentBar: payloadConfig?.showAccentBar,
            accentColor: payloadConfig?.accentColor,
            variant: payloadConfig?.variant,
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

    // Template-friendly: emits a plain object so consumers don't need to call a signal.
    readonly modalHostConfig$ = toObservable(this.modalHostConfig);

    get runtimeState(): TBrowserRuntimeState {
        return this.browserState.snapshot();
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
        if (!this.runtimeConfig.isDebugMode() || typeof document === 'undefined') return;

        const context = this.draftExportContext();
        const payloads = this.buildDraftPayloads(context.domain, context.pageId);

        payloads.forEach((payload) => {
            const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = payload.downloadName;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    async writeDraftPayloadsToDisk(): Promise<void> {
        if (!this.runtimeConfig.isDebugMode() || typeof window === 'undefined') return;

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

    get navigation(): readonly Record<string, unknown>[] {
        const raw = this.variableStore.navigation();
        if (!Array.isArray(raw)) {
            if (!this.warnedNavigationMissing) {
                console.warn('[ConfigurationsOrchestrator] Expected variables.navigation to be an array. Navigation will remain hidden.');
                this.warnedNavigationMissing = true;
            }
            return [];
        }

        return raw.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
    }

    private externalComponents: readonly TGenericComponent[] | null = null;
    private readonly auxiliaryComponentGroups = new Map<string, readonly TGenericComponent[]>();
    private componentRenderTracker = new ComponentRenderTracker([]);
    private readonly externalComponentsRevision = signal(0);

    readonly componentsRevision = computed(() => this.externalComponentsRevision());

    private parseComponentsPayload(payload: TComponentsPayload | null): readonly TGenericComponent[] {
        const entries = Array.isArray(payload?.components) ? payload.components : [];
        return entries
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                const component = entry as TGenericComponent;
                return typeof component.id === 'string' && component.id.trim().length > 0 ? component : null;
            })
            .filter((component): component is TGenericComponent => !!component);
    }

    private auxiliaryComponents(): readonly TGenericComponent[] {
        return Array.from(this.auxiliaryComponentGroups.values()).flat();
    }

    private resetComponentTracking(): void {
        this.componentRenderTracker = new ComponentRenderTracker(this.getActiveComponentSource().map((component) => component.id));
        this.externalComponentsRevision.update((value) => value + 1);
    }

    private getActiveComponentSource(): readonly TGenericComponent[] {
        const merged = new Map<string, TGenericComponent>();

        [...(this.externalComponents ?? []), ...this.auxiliaryComponents()]
            .forEach((component) => merged.set(component.id, component));

        return Array.from(merged.values());
    }

    setExternalComponentsFromPayload(payload: TComponentsPayload | null): void {
        const entries = this.parseComponentsPayload(payload);

        if (entries.length === 0) {
            this.externalComponents = null;
            this.resetComponentTracking();
            return;
        }

        this.externalComponents = entries;
        this.resetComponentTracking();
    }

    setAuxiliaryComponentsFromPayload(groupId: string, payload: TComponentsPayload | null): void {
        const normalizedGroupId = String(groupId ?? '').trim();
        if (!normalizedGroupId) return;

        const entries = this.parseComponentsPayload(payload);
        if (entries.length === 0) {
            this.auxiliaryComponentGroups.delete(normalizedGroupId);
            this.resetComponentTracking();
            return;
        }

        this.auxiliaryComponentGroups.set(normalizedGroupId, entries);
        this.resetComponentTracking();
    }

    exportDraftComponentsPayload(domain: string, pageId: string): TComponentsPayload {
        return this.createDraftComponentsPayload(domain, pageId, this.externalComponents ?? []);
    }

    private buildDraftPayloads(domain: string, pageId: string): TDraftExportFile[] {
        const context = this.draftExportContext();
        const resolvedDomain = String(domain).trim() || context.domain || this.domainResolver.resolveDomain().domain;
        const resolvedPageId = String(pageId).trim() || context.pageId;
        const basePageConfig = this.configStore.pageConfig() ?? {
            version: 1,
            pageId: resolvedPageId,
            domain: resolvedDomain,
            rootIds: context.rootIds,
            modalRootIds: context.modalRootIds,
        };
        const variables = this.configStore.variables();
        const combos = this.configStore.combos();
        const seo = this.configStore.seo();
        const structured = this.configStore.structuredData();
        const analytics = this.configStore.analytics();
        const i18n = this.configStore.i18n();
        const pageConfig = {
            ...basePageConfig,
            ...(seo ? { seo } : {}),
            ...(structured ? { structuredData: structured } : {}),
            ...(!basePageConfig.analytics && analytics ? {
                analytics: {
                    sectionIds: analytics.sectionIds,
                    scrollMilestones: analytics.scrollMilestones,
                },
            } : {}),
        };
        const pageRoot = `${ resolvedDomain }/${ resolvedPageId }`;
        const payloads: TDraftExportFile[] = [
            {
                name: `${ pageRoot }/page-config.json`,
                downloadName: this.toDownloadFileName(`${ pageRoot }/page-config.json`),
                data: pageConfig,
            },
            ...this.buildDraftComponentsFiles(resolvedDomain, resolvedPageId),
        ];

        if (variables) {
            payloads.push({
                name: `${ pageRoot }/variables.json`,
                downloadName: this.toDownloadFileName(`${ pageRoot }/variables.json`),
                data: variables,
            });
        }
        if (combos) {
            payloads.push({
                name: `${ pageRoot }/angora-combos.json`,
                downloadName: this.toDownloadFileName(`${ pageRoot }/angora-combos.json`),
                data: combos,
            });
        }
        if (i18n) {
            payloads.push({
                name: `${ pageRoot }/i18n/${ i18n.lang }.json`,
                downloadName: this.toDownloadFileName(`${ pageRoot }/i18n/${ i18n.lang }.json`),
                data: i18n,
            });
        }

        return payloads;
    }

    private buildDraftComponentsFiles(domain: string, pageId: string): TDraftExportFile[] {
        const sourcePayload = this.configStore.components() ?? {
            version: 1,
            domain,
            pageId,
            components: (this.externalComponents ?? []) as readonly Record<string, unknown>[],
        };
        const sharedComponents: Record<string, unknown>[] = [];
        const pageComponents: Record<string, unknown>[] = [];

        sourcePayload.components.forEach((component) => {
            const componentDomain = String(component['domain'] ?? sourcePayload.domain ?? domain).trim() || domain;
            const componentPageId = String(component['pageId'] ?? sourcePayload.pageId ?? pageId).trim() || pageId;

            if (componentDomain === domain && componentPageId === 'allPages') {
                sharedComponents.push(component);
                return;
            }

            pageComponents.push(component);
        });

        const payloads: TDraftExportFile[] = [];
        if (sharedComponents.length > 0) {
            payloads.push({
                name: `${ domain }/components.json`,
                downloadName: this.toDownloadFileName(`${ domain }/components.json`),
                data: this.createDraftComponentsPayload(domain, 'allPages', sharedComponents),
            });
        }

        const pagePath = `${ domain }/${ pageId }/components.json`;
        payloads.push({
            name: pagePath,
            downloadName: this.toDownloadFileName(pagePath),
            data: this.createDraftComponentsPayload(domain, pageId, pageComponents),
        });

        return payloads;
    }

    private createDraftComponentsPayload(
        domain: string,
        pageId: string,
        source: readonly unknown[],
    ): TComponentsPayload {
        return {
            version: 1,
            domain,
            pageId,
            components: source.map((component) => this.sanitizeComponentForPayload(component) as any),
        };
    }

    private toDownloadFileName(path: string): string {
        return path.replace(/[\\/]+/g, '--');
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

    getComponentById(id: string, host?: unknown) {
        const resolved = this.resolveLoopComponents(false, host);
        let component = resolved.get(id) ?? findComponentById(this.getActiveComponentSource(), id);
        if (!component) {
            console.error(`Component with id "${ id }" not found in ConfigurationsOrchestratorService.`);
        } else {
            component = normalizeComponentIfNeeded(component);
            this.markComponentRendered(id);
        }
        return component;
    }

    getAllTheClassesFromComponents(host?: unknown): string[] {
        const effectiveHost = host ?? this;

        return collectAllClassesFromComponents(
            Array.from(this.resolveLoopComponents(false, effectiveHost).values())
                .map((component) => this.valueOrchestrator.apply(component, { host: effectiveHost }))
        );
    }

    handleComponentEvent(event: ComponentEvent, host?: unknown): void {
        this.componentEventDispatcher.dispatch(
            { event, host: host ?? this },
            {},
        );
    }

    private sanitizeComponentForPayload(component: unknown): Record<string, unknown> {
        const sanitized = JSON.parse(
            JSON.stringify(component, (_key, value) => (typeof value === 'function' ? undefined : value))
        ) as Record<string, unknown>;

        delete sanitized['domain'];
        delete sanitized['pageId'];

        return sanitized;
    }

    private resolveLoopComponents(warnOnMissingSource: boolean, host?: unknown): Map<string, TGenericComponent> {
        return materializeLoopComponents({
            sourceComponents: this.getActiveComponentSource(),
            warnOnMissingSource,
            host,
            getVariable: (path) => this.variableStore.get(path),
            getI18n: (path) => this.globalI18n.get(path),
            getCurrentLanguage: () => this.language.currentLanguage(),
            resolveI18nKey: (key) => this.resolveI18nKeyString(key),
            onMissingTemplate: (templateId) => {
                console.warn(`[ConfigurationsOrchestrator] loopConfig template not found: ${ templateId }`);
            },
            onMissingSource: (source, path) => {
                this.warnLoopPathOnce(source, path);
            },
            finalizeComponent: (component, template, generatedId) => {
                if (template.type === 'generic-card') {
                    this.attachGeneratedCardCta(component as any, template, generatedId);
                }
                return component;
            },
        });
    }

    private warnLoopPathOnce(source: 'var' | 'i18n' | 'host', path: string): void {
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
}
