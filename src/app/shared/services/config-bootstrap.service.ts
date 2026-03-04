import type { TLanguage } from '@/app/shared/i18n/i18n.types';
import { I18N_CONFIG } from '@/app/shared/i18n/index.i18n';
import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TI18nPayload,
    TPageConfigPayload,
    TSeoPayload,
    TStructuredDataPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    isAnalyticsConfigPayload,
    isAngoraCombosPayload,
    isComponentsPayload,
    isI18nPayload,
    isPageConfigPayload,
    isSeoPayload,
    isStructuredDataPayload,
    isVariablesPayload,
} from '@/app/shared/utility/config-validation/config-payload.validators';
import { environment } from '@/environments/environment';
import { inject, Injectable, signal } from '@angular/core';
import { ConfigApiService } from './config-api.service';
import { ConfigStoreService, TConfigBootstrapStage } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { I18nService } from './i18n.service';
import { StructuredDataService } from './structured-data.service';
import { VariableStoreService } from './variable-store.service';

export type TBootstrapResult = {
    readonly domain: string;
    readonly pageId: string;
    readonly pageConfig?: TPageConfigPayload | null;
    readonly components?: TComponentsPayload | null;
    readonly variables?: TVariablesPayload | null;
    readonly combos?: TAngoraCombosPayload | null;
    readonly i18n?: TI18nPayload | null;
    readonly seo?: TSeoPayload | null;
    readonly structuredData?: TStructuredDataPayload | null;
    readonly analytics?: TAnalyticsConfigPayload | null;
    readonly structuredDataApplied: boolean;
};

const EXPECTED_CONFIG_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class ConfigBootstrapService {
    private readonly api = inject(ConfigApiService);
    private readonly store = inject(ConfigStoreService);
    private readonly drafts = inject(DraftConfigLoaderService);
    private readonly resolver = inject(DomainResolverService);
    private readonly i18n = inject(I18nService);
    private readonly structured = inject(StructuredDataService);
    private readonly variablesStore = inject(VariableStoreService);

    readonly error = signal<string | null>(null);

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    private getFallbackI18n(lang: string): Record<string, unknown> {
        const key = String(lang ?? '').trim() as TLanguage;
        const fallback = I18N_CONFIG.translations[key]
            ?? I18N_CONFIG.translations['es']
            ?? I18N_CONFIG.translations['en'];
        return (fallback ?? {}) as unknown as Record<string, unknown>;
    }

    private withoutFooterFallback(dictionary: Record<string, unknown>): Record<string, unknown> {
        if (!this.isRecord(dictionary)) return {};
        const next = { ...dictionary };
        delete next['footer'];
        return next;
    }

    private removePath(root: Record<string, unknown>, path: string): void {
        const parts = String(path ?? '').split('.').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) return;

        let current: any = root;
        for (let index = 0; index < parts.length - 1; index += 1) {
            const key = parts[index];
            if (!current || typeof current !== 'object' || !(key in current)) return;
            current = current[key];
        }

        const leaf = parts[parts.length - 1];
        if (current && typeof current === 'object') {
            delete current[leaf];
        }
    }

    private withoutApiDrivenFallback(dictionary: Record<string, unknown>): Record<string, unknown> {
        if (!this.isRecord(dictionary)) return {};
        const next = this.withoutFooterFallback(dictionary);

        // These sections are API-driven and should not fall back to static in-app content.
        this.removePath(next, 'featuresSection');
        this.removePath(next, 'features');
        this.removePath(next, 'services');
        this.removePath(next, 'testimonials');
        this.removePath(next, 'processSection');
        this.removePath(next, 'process');
        this.removePath(next, 'finalCtaSection');
        this.removePath(next, 'ui.sections.services');
        this.removePath(next, 'ui.sections.testimonials');
        this.removePath(next, 'ui.sections.finalCta');
        this.removePath(next, 'landing.processSection');

        return next;
    }

    private mergeI18n(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
        if (!this.isRecord(base)) return { ...override };
        if (!this.isRecord(override)) return { ...base };

        const merged: Record<string, unknown> = { ...base };
        for (const [key, value] of Object.entries(override)) {
            const baseValue = merged[key];
            if (this.isRecord(baseValue) && this.isRecord(value)) {
                merged[key] = this.mergeI18n(baseValue, value);
                continue;
            }
            merged[key] = value;
        }
        return merged;
    }

    async load(opts?: { pageId?: string; lang?: string }): Promise<TBootstrapResult> {
        const resolved = this.resolver.resolveDomain();
        const domain = resolved.domain || environment.domain.defaultDomain;
        const pageId = String(opts?.pageId ?? environment.drafts.defaultPageId ?? 'default');
        const lang = String(opts?.lang ?? 'es');

        this.configureI18nLoader(domain, pageId);
        const fallbackLang = lang === 'es' ? 'en' : 'es';
        void this.i18n.prefetch(fallbackLang);

        this.store.reset();
        this.store.setStage('page-config');
        this.error.set(null);

        const pageConfig = await this.loadPageConfig(domain, pageId);
        this.store.setPageConfig(pageConfig);

        this.store.setStage('components');
        const components = await this.loadComponents(domain, pageId);
        this.store.setComponents(components);

        this.store.setStage('variables');
        const variables = await this.loadVariables(domain, pageId);
        const combos = await this.loadCombos(domain, pageId);
        this.store.setVariables(variables);
        this.store.setCombos(combos);
        this.variablesStore.setPayload(variables);

        this.store.setStage('i18n');
        const i18nPayload = await this.loadI18n(domain, pageId, lang);
        this.store.setI18n(i18nPayload);

        const seo = await this.loadSeo(domain, pageId);
        const structuredData = await this.loadStructuredData(domain, pageId);
        const analytics = await this.loadAnalytics(domain, pageId);
        this.store.setSeo(seo);
        this.store.setStructuredData(structuredData);
        this.store.setAnalytics(analytics);

        let structuredDataApplied = false;
        if (structuredData?.entries?.length) {
            structuredData.entries.forEach((entry, index) => {
                this.structured.injectOnce(`sd:bootstrap:${ index }`, entry);
            });
            structuredDataApplied = true;
        }

        if (i18nPayload?.dictionary && Object.keys(i18nPayload.dictionary).length > 0) {
            const fallbackDict = this.withoutApiDrivenFallback(this.getFallbackI18n(i18nPayload.lang ?? lang));
            const merged = this.mergeI18n(fallbackDict, i18nPayload.dictionary);
            this.i18n.setTranslations(i18nPayload.lang, merged, { cache: true, applyIfCurrent: true });
        } else {
            const fallbackDict = this.withoutApiDrivenFallback(this.getFallbackI18n(lang));
            this.i18n.setTranslations(lang, fallbackDict, { cache: true, applyIfCurrent: true });
        }

        const secondary = await this.loadI18n(domain, pageId, fallbackLang);
        if (secondary?.dictionary && Object.keys(secondary.dictionary).length > 0) {
            const fallbackSecondary = this.withoutApiDrivenFallback(this.getFallbackI18n(secondary.lang ?? fallbackLang));
            const mergedSecondary = this.mergeI18n(fallbackSecondary, secondary.dictionary);
            this.i18n.setTranslations(secondary.lang, mergedSecondary, { cache: true, applyIfCurrent: false });
        } else {
            const fallbackSecondary = this.withoutApiDrivenFallback(this.getFallbackI18n(fallbackLang));
            this.i18n.setTranslations(fallbackLang, fallbackSecondary, { cache: true, applyIfCurrent: false });
        }

        this.store.setStage('done');
        this.store.setValidationIssues(this.buildValidationIssues({
            pageConfig,
            components,
            variables,
            combos,
            i18n: i18nPayload,
            seo,
            structuredData,
            analytics,
        }));

        return {
            domain,
            pageId,
            pageConfig,
            components,
            variables,
            combos,
            i18n: i18nPayload,
            seo,
            structuredData,
            analytics,
            structuredDataApplied,
        };
    }

    private async loadPageConfig(domain: string, pageId: string): Promise<TPageConfigPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadPageConfig(domain, pageId)
                : await this.api.getPageConfig(domain, pageId);
            return payload && isPageConfigPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('page-config', error);
            return null;
        }
    }

    private async loadComponents(domain: string, pageId: string): Promise<TComponentsPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadComponents(domain, pageId)
                : await this.api.getComponents(domain, pageId);
            return payload && isComponentsPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('components', error);
            return null;
        }
    }

    private async loadVariables(domain: string, pageId: string): Promise<TVariablesPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadVariables(domain, pageId)
                : await this.api.getVariables(domain, pageId);
            return payload && isVariablesPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('variables', error);
            return null;
        }
    }

    private async loadCombos(domain: string, pageId: string): Promise<TAngoraCombosPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadAngoraCombos(domain, pageId)
                : await this.api.getAngoraCombos(domain, pageId);
            return payload && isAngoraCombosPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('angora-combos', error);
            return null;
        }
    }

    private async loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadI18n(domain, pageId, lang)
                : await this.api.getI18n(domain, lang, pageId);
            return payload && isI18nPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('i18n', error);
            return null;
        }
    }

    private async loadSeo(domain: string, pageId: string): Promise<TSeoPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadSeo(domain, pageId)
                : await this.api.getSeo(domain, pageId);
            return payload && isSeoPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('seo', error);
            return null;
        }
    }

    private async loadStructuredData(domain: string, pageId: string): Promise<TStructuredDataPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadStructuredData(domain, pageId)
                : await this.api.getStructuredData(domain, pageId);
            return payload && isStructuredDataPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('structured-data', error);
            return null;
        }
    }

    private async loadAnalytics(domain: string, pageId: string): Promise<TAnalyticsConfigPayload | null> {
        try {
            const payload = environment.drafts.enabled
                ? await this.drafts.loadAnalyticsConfig(domain, pageId)
                : await this.api.getAnalyticsConfig(domain, pageId);
            return payload && isAnalyticsConfigPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('analytics-config', error);
            return null;
        }
    }

    private captureError(stage: TConfigBootstrapStage, error: unknown): void {
        this.store.setStage('error');
        this.error.set(`Failed to load ${ stage }`);
        if (environment.features.debugMode) {
            console.error('[ConfigBootstrap]', stage, error);
        }
    }

    private buildValidationIssues(payloads: {
        pageConfig: TPageConfigPayload | null;
        components: TComponentsPayload | null;
        variables: TVariablesPayload | null;
        combos: TAngoraCombosPayload | null;
        i18n: TI18nPayload | null;
        seo: TSeoPayload | null;
        structuredData: TStructuredDataPayload | null;
        analytics: TAnalyticsConfigPayload | null;
    }): readonly string[] {
        const issues: string[] = [];
        const addMissing = (label: string, value: unknown) => {
            if (!value) issues.push(`Missing or invalid ${ label } payload.`);
        };
        const addVersionMismatch = (label: string, value: { version?: number } | null) => {
            if (!value || typeof value.version !== 'number') return;
            if (value.version !== EXPECTED_CONFIG_VERSION) {
                issues.push(`Version mismatch for ${ label }: expected ${ EXPECTED_CONFIG_VERSION }, got ${ value.version }.`);
            }
        };

        addMissing('page-config', payloads.pageConfig);
        addMissing('components', payloads.components);
        addMissing('variables', payloads.variables);
        addMissing('angora-combos', payloads.combos);
        addMissing('i18n', payloads.i18n);
        addMissing('seo', payloads.seo);
        addMissing('structured-data', payloads.structuredData);
        addMissing('analytics-config', payloads.analytics);

        addVersionMismatch('page-config', payloads.pageConfig);
        addVersionMismatch('components', payloads.components as any);
        addVersionMismatch('variables', payloads.variables as any);
        addVersionMismatch('angora-combos', payloads.combos as any);
        addVersionMismatch('i18n', payloads.i18n as any);
        addVersionMismatch('seo', payloads.seo as any);
        addVersionMismatch('structured-data', payloads.structuredData as any);
        addVersionMismatch('analytics-config', payloads.analytics as any);

        return issues;
    }

    private configureI18nLoader(domain: string, pageId: string): void {
        const useDrafts = environment.drafts.enabled;
        this.i18n.setLoader(
            async (lang) => {
                try {
                    if (useDrafts) {
                        const payload = await this.drafts.loadI18n(domain, pageId, lang);
                        const dict = payload?.dictionary as Record<string, unknown> | undefined;
                        if (dict && Object.keys(dict).length > 0) {
                            return this.mergeI18n(this.withoutApiDrivenFallback(this.getFallbackI18n(lang)), dict);
                        }
                    } else {
                        const payload = await this.api.getI18n(domain, lang, pageId);
                        const dict = payload?.dictionary as Record<string, unknown> | undefined;
                        if (dict && Object.keys(dict).length > 0) {
                            return this.mergeI18n(this.withoutApiDrivenFallback(this.getFallbackI18n(lang)), dict);
                        }
                    }
                } catch {
                    // Fall through to static i18n when API/drafts fail.
                }

                return this.withoutApiDrivenFallback(this.getFallbackI18n(lang));
            },
            { clearCache: true, reload: false }
        );
    }
}
