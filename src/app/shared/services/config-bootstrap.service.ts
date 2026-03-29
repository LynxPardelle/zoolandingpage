import { formatLocaleLabel, normalizeLocaleCode } from '@/app/shared/i18n/locale.utils';
import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftI18nVariableConfig,
    TDraftLanguageDefinition,
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
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { ConfigSourceService } from './config-source.service';
import { ConfigStoreService, TConfigBootstrapStage } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { I18nService } from './i18n.service';
import { LanguageService } from './language.service';
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
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly store = inject(ConfigStoreService);
    private readonly source = inject(ConfigSourceService);
    private readonly resolver = inject(DomainResolverService);
    private readonly i18n = inject(I18nService);
    private readonly language = inject(LanguageService);
    private readonly structured = inject(StructuredDataService);
    private readonly variablesStore = inject(VariableStoreService);
    private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

    readonly error = signal<string | null>(null);

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    private isNonEmptyString(value: unknown): value is string {
        return typeof value === 'string' && value.trim().length > 0;
    }

    private collectChildComponentIds(component: unknown): readonly string[] {
        if (!this.isRecord(component)) return [];
        const config = this.isRecord(component['config']) ? component['config'] : null;
        if (!config || !Array.isArray(config['components'])) return [];
        return config['components'].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    }

    private resolveLoopTemplateId(component: unknown): string | null {
        if (!this.isRecord(component)) return null;
        const loopConfig = this.isRecord(component['loopConfig']) ? component['loopConfig'] : null;
        const templateId = loopConfig?.['templateId'];
        return typeof templateId === 'string' && templateId.trim().length > 0 ? templateId.trim() : null;
    }

    private normalizeDraftLanguageDefinition(entry: string | TDraftLanguageDefinition): TDraftLanguageDefinition | null {
        if (typeof entry === 'string') {
            const code = normalizeLocaleCode(entry);
            return code ? { code, label: formatLocaleLabel(code) } : null;
        }

        const code = normalizeLocaleCode(entry.code);
        if (!code) return null;

        return {
            code,
            label: typeof entry.label === 'string' && entry.label.trim().length > 0 ? entry.label.trim() : formatLocaleLabel(code),
            dir: entry.dir,
            ogLocale: typeof entry.ogLocale === 'string' && entry.ogLocale.trim().length > 0 ? entry.ogLocale.trim() : undefined,
            aliases: Array.isArray(entry.aliases)
                ? entry.aliases.map((alias) => normalizeLocaleCode(alias)).filter(Boolean)
                : undefined,
        };
    }

    private extractDraftI18nConfig(variables: TVariablesPayload | null): TDraftI18nVariableConfig | null {
        const config = variables?.variables?.['i18n'];
        return this.isRecord(config) ? (config as TDraftI18nVariableConfig) : null;
    }

    private buildDraftLanguageDefinitions(variables: TVariablesPayload | null): readonly TDraftLanguageDefinition[] {
        const i18nConfig = this.extractDraftI18nConfig(variables);
        return Array.isArray(i18nConfig?.supportedLanguages)
            ? i18nConfig.supportedLanguages
                .map((entry) => this.normalizeDraftLanguageDefinition(entry))
                .filter((entry): entry is TDraftLanguageDefinition => !!entry)
            : [];
    }

    private defaultDraftLanguage(variables: TVariablesPayload | null, languages: readonly TDraftLanguageDefinition[]): string {
        const configured = normalizeLocaleCode(this.extractDraftI18nConfig(variables)?.defaultLanguage);
        if (configured && languages.some((entry) => entry.code === configured)) return configured;
        return languages[0]?.code ?? 'es';
    }

    private secondaryLanguage(primary: string, languages: readonly TDraftLanguageDefinition[]): string | null {
        const secondary = languages.find((entry) => entry.code !== primary);
        return secondary?.code ?? null;
    }

    async load(opts?: { domain?: string; pageId?: string; lang?: string }): Promise<TBootstrapResult> {
        const resolved = this.resolver.resolveDomain();
        const domain = String(opts?.domain ?? resolved.domain ?? '').trim();
        const pageId = String(opts?.pageId ?? '').trim();
        const requestedLang = String(
            opts?.lang
            ?? (this.isBrowser ? this.language.currentLanguage() : '')
            ?? 'es'
        );

        if (!domain || !pageId) {
            throw new Error(`[ConfigBootstrap] Missing active config identity. domain="${ domain }" pageId="${ pageId }".`);
        }

        this.i18n.disableAutoLoad();
        this.configureI18nLoader(domain, pageId);

        this.store.reset();
        this.store.setStage('page-config');
        this.error.set(null);

        const pageConfig = await this.loadPageConfig(domain, pageId);
        this.store.setPageConfig(pageConfig);

        this.store.setStage('components');
        const components = await this.loadComponents(domain, pageId);
        this.store.setComponents(components);

        this.store.setStage('variables');
        const loadedVariables = await this.loadVariables(domain, pageId);
        const draftLanguages = this.buildDraftLanguageDefinitions(loadedVariables);
        const defaultLanguage = this.defaultDraftLanguage(loadedVariables, draftLanguages);
        this.language.configureLanguages(
            draftLanguages.map((entry) => entry.code),
            { defaultLanguage, requestedLanguage: requestedLang }
        );
        const lang = this.language.currentLanguage();
        const fallbackLang = this.secondaryLanguage(lang, draftLanguages);

        const variables = loadedVariables;
        const combos = await this.loadCombos(domain, pageId);
        this.store.setVariables(variables);
        this.store.setCombos(combos);
        this.variablesStore.setPayload(variables);

        this.store.setStage('i18n');
        const i18nPayload = await this.loadI18n(domain, pageId, lang);
        this.store.setI18n(i18nPayload);

        if (fallbackLang) {
            void this.i18n.prefetch(fallbackLang);
        }

        const seo = await this.loadSeo(domain, pageId);
        const structuredData = await this.loadStructuredData(domain, pageId);
        const analytics = await this.loadAnalytics(domain, pageId);
        this.store.setSeo(seo);
        this.store.setStructuredData(structuredData);
        this.store.setAnalytics(analytics);

        const structuredDataApplied = this.structured.applyEntries(structuredData?.entries, 'sd:bootstrap');

        this.i18n.setTranslations(
            i18nPayload?.lang ?? lang,
            i18nPayload?.dictionary ?? {},
            { cache: true, applyIfCurrent: true }
        );

        if (fallbackLang) {
            const secondary = await this.loadI18n(domain, pageId, fallbackLang);
            this.i18n.setTranslations(
                secondary?.lang ?? fallbackLang,
                secondary?.dictionary ?? {},
                { cache: true, applyIfCurrent: false }
            );
        }

        this.i18n.enableAutoLoad();

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
            const payload = await this.source.loadPageConfig(domain, pageId);
            return payload && isPageConfigPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('page-config', error);
            return null;
        }
    }

    private async loadComponents(domain: string, pageId: string): Promise<TComponentsPayload | null> {
        try {
            const payload = await this.source.loadComponents(domain, pageId);
            return payload && isComponentsPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('components', error);
            return null;
        }
    }

    private async loadVariables(domain: string, pageId: string): Promise<TVariablesPayload | null> {
        try {
            const payload = await this.source.loadVariables(domain, pageId);
            return payload && isVariablesPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('variables', error);
            return null;
        }
    }

    private async loadCombos(domain: string, pageId: string): Promise<TAngoraCombosPayload | null> {
        try {
            const payload = await this.source.loadCombos(domain, pageId);
            return payload && isAngoraCombosPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('angora-combos', error);
            return null;
        }
    }

    private async loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        try {
            const payload = await this.source.loadI18n(domain, pageId, lang);
            return payload && isI18nPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('i18n', error);
            return null;
        }
    }

    private async loadSeo(domain: string, pageId: string): Promise<TSeoPayload | null> {
        try {
            const payload = await this.source.loadSeo(domain, pageId);
            return payload && isSeoPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('seo', error);
            return null;
        }
    }

    private async loadStructuredData(domain: string, pageId: string): Promise<TStructuredDataPayload | null> {
        try {
            const payload = await this.source.loadStructuredData(domain, pageId);
            return payload && isStructuredDataPayload(payload) ? payload : null;
        } catch (error) {
            this.captureError('structured-data', error);
            return null;
        }
    }

    private async loadAnalytics(domain: string, pageId: string): Promise<TAnalyticsConfigPayload | null> {
        try {
            const payload = await this.source.loadAnalytics(domain, pageId);
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
        const addIssue = (condition: boolean, message: string) => {
            if (condition) issues.push(message);
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
        addMissing('i18n', payloads.i18n);
        addMissing('seo', payloads.seo);

        addVersionMismatch('page-config', payloads.pageConfig);
        addVersionMismatch('components', payloads.components as any);
        addVersionMismatch('variables', payloads.variables as any);
        addVersionMismatch('i18n', payloads.i18n as any);
        addVersionMismatch('seo', payloads.seo as any);

        const pageConfig = payloads.pageConfig;
        addIssue(!pageConfig || pageConfig.rootIds.length === 0, 'page-config.rootIds must include at least one render root.');

        const components = payloads.components?.components ?? {};
        addIssue(Object.keys(components).length === 0, 'components.json must include at least one component entry.');

        const componentIds = new Set(Object.keys(components));
        const addMissingReferenceIssue = (message: string) => {
            if (!issues.includes(message)) {
                issues.push(message);
            }
        };

        for (const rootId of pageConfig?.rootIds ?? []) {
            addIssue(!componentIds.has(rootId), `page-config.rootIds references missing component "${ rootId }".`);
        }

        for (const modalRootId of pageConfig?.modalRootIds ?? []) {
            addIssue(!componentIds.has(modalRootId), `page-config.modalRootIds references missing component "${ modalRootId }".`);
        }

        for (const [componentId, component] of Object.entries(components)) {
            for (const childId of this.collectChildComponentIds(component)) {
                if (!componentIds.has(childId)) {
                    addMissingReferenceIssue(`Component "${ componentId }" references missing child component "${ childId }".`);
                }
            }

            const templateId = this.resolveLoopTemplateId(component);
            if (templateId && !componentIds.has(templateId)) {
                addMissingReferenceIssue(`Component "${ componentId }" references missing loop template "${ templateId }".`);
            }
        }

        const variables = payloads.variables?.variables ?? {};
        const theme = this.isRecord(variables['theme']) ? variables['theme'] : null;
        const i18n = this.isRecord(variables['i18n']) ? variables['i18n'] : null;
        const ui = this.isRecord(variables['ui']) ? variables['ui'] : null;
        const contact = this.isRecord(ui?.['contact']) ? ui['contact'] : null;

        addIssue(!theme, 'variables.theme is required.');
        addIssue(!i18n, 'variables.i18n is required.');
        addIssue(!this.isNonEmptyString(i18n?.['defaultLanguage']), 'variables.i18n.defaultLanguage is required.');
        addIssue(!Array.isArray(i18n?.['supportedLanguages']) || i18n['supportedLanguages'].length === 0, 'variables.i18n.supportedLanguages must include at least one language.');

        const requiresWhatsAppContact = Object.values(components).some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            if (typeof instructions !== 'string') return false;
            return /(^|;)(openWhatsApp|openFaqCtaWhatsApp|openFinalCtaWhatsApp)(:|;|$)/.test(instructions);
        });

        const requiresFaqWhatsAppMessage = Object.values(components).some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            return typeof instructions === 'string' && /(^|;)openFaqCtaWhatsApp(:|;|$)/.test(instructions);
        });

        const requiresFinalCtaWhatsAppMessage = Object.values(components).some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            return typeof instructions === 'string' && /(^|;)openFinalCtaWhatsApp(:|;|$)/.test(instructions);
        });

        addIssue(requiresWhatsAppContact && !contact, 'variables.ui.contact is required when WhatsApp handlers are used.');
        addIssue(requiresWhatsAppContact && !this.isNonEmptyString(contact?.['whatsappPhone']), 'variables.ui.contact.whatsappPhone is required when WhatsApp handlers are used.');
        addIssue(requiresWhatsAppContact && !this.isNonEmptyString(contact?.['whatsappMessageKey']), 'variables.ui.contact.whatsappMessageKey is required when WhatsApp handlers are used.');
        addIssue(requiresFaqWhatsAppMessage && !this.isNonEmptyString(contact?.['faqMessageKey']) && !this.isNonEmptyString(contact?.['whatsappMessageKey']), 'variables.ui.contact.faqMessageKey or variables.ui.contact.whatsappMessageKey is required when FAQ WhatsApp handlers are used.');
        addIssue(requiresFinalCtaWhatsAppMessage && !this.isNonEmptyString(contact?.['finalCtaMessageKey']) && !this.isNonEmptyString(contact?.['whatsappMessageKey']), 'variables.ui.contact.finalCtaMessageKey or variables.ui.contact.whatsappMessageKey is required when final CTA WhatsApp handlers are used.');

        addIssue(!this.isNonEmptyString(payloads.seo?.title), 'seo.title is required.');
        addIssue(!this.isNonEmptyString(payloads.seo?.description), 'seo.description is required.');
        addIssue(!this.isNonEmptyString(payloads.seo?.canonical), 'seo.canonical is required.');

        return issues;
    }

    private configureI18nLoader(domain: string, pageId: string): void {
        this.i18n.setLoader(
            async (lang) => {
                try {
                    const payload = await this.source.loadI18n(domain, pageId, lang);
                    const dict = payload?.dictionary as Record<string, unknown> | undefined;
                    if (dict && Object.keys(dict).length > 0) {
                        return dict;
                    }
                } catch {
                    // Fall through to an empty dictionary when the draft/API payload is unavailable.
                }

                return {};
            },
            { clearCache: true, reload: false }
        );
    }
}
