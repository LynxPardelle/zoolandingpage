import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TResolvedAnalyticsConfig,
    TSeoPayload,
    TStructuredDataPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { Injectable, computed, signal } from '@angular/core';

export type TConfigBootstrapStage =
    | 'idle'
    | 'page-config'
    | 'components'
    | 'variables'
    | 'angora-combos'
    | 'i18n'
    | 'done'
    | 'error';

@Injectable({ providedIn: 'root' })
export class ConfigStoreService {
    private readonly _siteConfig = signal<TDraftSiteConfigPayload | null>(null);
    private readonly _pageConfig = signal<TPageConfigPayload | null>(null);
    private readonly _components = signal<TComponentsPayload | null>(null);
    private readonly _variables = signal<TVariablesPayload | null>(null);
    private readonly _combos = signal<TAngoraCombosPayload | null>(null);
    private readonly _i18n = signal<TI18nPayload | null>(null);
    private readonly _seo = signal<TSeoPayload | null>(null);
    private readonly _structuredData = signal<TStructuredDataPayload | null>(null);
    private readonly _analytics = signal<TResolvedAnalyticsConfig | null>(null);
    private readonly _stage = signal<TConfigBootstrapStage>('idle');
    private readonly _validationIssues = signal<readonly string[]>([]);

    readonly siteConfig = this._siteConfig.asReadonly();
    readonly pageConfig = this._pageConfig.asReadonly();
    readonly components = this._components.asReadonly();
    readonly variables = this._variables.asReadonly();
    readonly combos = this._combos.asReadonly();
    readonly i18n = this._i18n.asReadonly();
    readonly seo = this._seo.asReadonly();
    readonly structuredData = this._structuredData.asReadonly();
    readonly analytics = this._analytics.asReadonly();
    readonly stage = this._stage.asReadonly();
    readonly validationIssues = this._validationIssues.asReadonly();

    readonly ready = computed(() => this._stage() === 'done');

    setStage(stage: TConfigBootstrapStage): void {
        this._stage.set(stage);
    }

    setSiteConfig(payload: TDraftSiteConfigPayload | null): void {
        this._siteConfig.set(payload);
    }

    setPageConfig(payload: TPageConfigPayload | null): void {
        this._pageConfig.set(payload);
    }

    setComponents(payload: TComponentsPayload | null): void {
        this._components.set(payload);
    }

    setVariables(payload: TVariablesPayload | null): void {
        this._variables.set(payload);
    }

    setCombos(payload: TAngoraCombosPayload | null): void {
        this._combos.set(payload);
    }

    setI18n(payload: TI18nPayload | null): void {
        this._i18n.set(payload);
    }

    setSeo(payload: TSeoPayload | null): void {
        this._seo.set(payload);
    }

    setStructuredData(payload: TStructuredDataPayload | null): void {
        this._structuredData.set(payload);
    }

    setAnalytics(payload: TResolvedAnalyticsConfig | null): void {
        this._analytics.set(payload);
    }

    setValidationIssues(issues: readonly string[]): void {
        this._validationIssues.set(issues);
    }

    resetPagePayloads(): void {
        this._pageConfig.set(null);
        this._components.set(null);
        this._variables.set(null);
        this._combos.set(null);
        this._i18n.set(null);
        this._seo.set(null);
        this._structuredData.set(null);
        this._analytics.set(null);
        this._stage.set('idle');
        this._validationIssues.set([]);
    }

    reset(): void {
        this._siteConfig.set(null);
        this.resetPagePayloads();
    }
}
