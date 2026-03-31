import { formatLocaleLabel, normalizeLocaleCode } from '@/app/shared/i18n/locale.utils';
import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftAnalyticsRuntimeConfig,
    TDraftI18nVariableConfig,
    TDraftLanguageDefinition,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TResolvedAnalyticsConfig,
    TSeoPayload,
    TStructuredDataPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    isAngoraCombosPayload,
    isComponentsPayload,
    isI18nPayload,
    isPageConfigPayload,
    isVariablesPayload,
} from '@/app/shared/utility/config-validation/config-payload.validators';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { ConfigSourceService } from './config-source.service';
import { ConfigStoreService, TConfigBootstrapStage } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { I18nService } from './i18n.service';
import { LanguageService } from './language.service';
import { RuntimeConfigService } from './runtime-config.service';
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
    readonly analytics?: TResolvedAnalyticsConfig | null;
    readonly structuredDataApplied: boolean;
};

const EXPECTED_CONFIG_VERSION = 1;
const LOOP_INDEX_TOKEN = '{{index}}';

@Injectable({ providedIn: 'root' })
export class ConfigBootstrapService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly store = inject(ConfigStoreService);
    private readonly source = inject(ConfigSourceService);
    private readonly resolver = inject(DomainResolverService);
    private readonly i18n = inject(I18nService);
    private readonly language = inject(LanguageService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
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

    private collectReferencedModalIds(components: readonly Record<string, unknown>[]): readonly string[] {
        const modalIds = new Set<string>();

        components.forEach((component) => {
            if (!this.isRecord(component)) return;

            const eventInstructions = component['eventInstructions'];
            if (typeof eventInstructions === 'string') {
                eventInstructions
                    .split(';')
                    .map((segment) => segment.trim())
                    .filter(Boolean)
                    .forEach((segment) => {
                        const [action, ...rawArgs] = segment.split(':');
                        if (action.trim() !== 'openModal') return;

                        const modalId = rawArgs.join(':').split(',')[0]?.trim();
                        if (modalId) {
                            modalIds.add(modalId);
                        }
                    });
            }

            const condition = component['condition'];
            if (typeof condition === 'string') {
                const matches = condition.matchAll(/(?:^|;)\s*(?:all|any|not):modalRefId,([^,;]+)/g);
                for (const match of matches) {
                    const modalId = match[1]?.trim();
                    if (modalId) {
                        modalIds.add(modalId);
                    }
                }
            }
        });

        return [...modalIds];
    }

    private resolveLoopTemplateId(component: unknown): string | null {
        if (!this.isRecord(component)) return null;
        const loopConfig = this.isRecord(component['loopConfig']) ? component['loopConfig'] : null;
        const templateId = loopConfig?.['templateId'];
        return typeof templateId === 'string' && templateId.trim().length > 0 ? templateId.trim() : null;
    }

    private resolveLoopIdPrefix(component: unknown): string | null {
        if (!this.isRecord(component)) return null;
        const loopConfig = this.isRecord(component['loopConfig']) ? component['loopConfig'] : null;
        const explicitIdPrefix = loopConfig?.['idPrefix'];
        if (typeof explicitIdPrefix === 'string' && explicitIdPrefix.trim().length > 0) {
            return explicitIdPrefix.trim();
        }

        return this.resolveLoopTemplateId(component);
    }

    private collectGeneratedLoopPrefixes(components: readonly Record<string, unknown>[]): ReadonlySet<string> {
        const prefixes = new Set<string>();

        components.forEach((component) => {
            const prefix = this.resolveLoopIdPrefix(component);
            if (prefix) prefixes.add(prefix);
        });

        return prefixes;
    }

    private isGeneratedLoopReference(childId: string, generatedPrefixes: ReadonlySet<string>): boolean {
        if (!childId.includes(LOOP_INDEX_TOKEN)) return false;

        for (const prefix of generatedPrefixes) {
            if (childId === `${ prefix }__${ LOOP_INDEX_TOKEN }`) {
                return true;
            }
        }

        return false;
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

    private buildEffectiveVariables(siteConfig: TDraftSiteConfigPayload | null, variables: TVariablesPayload | null): Record<string, unknown> {
        return this.variablesStore.buildEffectiveVariables(variables, siteConfig);
    }

    private extractDraftI18nConfig(siteConfig: TDraftSiteConfigPayload | null, variables: TVariablesPayload | null): TDraftI18nVariableConfig | null {
        const config = this.buildEffectiveVariables(siteConfig, variables)['i18n'];
        return this.isRecord(config) ? (config as TDraftI18nVariableConfig) : null;
    }

    private buildDraftLanguageDefinitions(siteConfig: TDraftSiteConfigPayload | null, variables: TVariablesPayload | null): readonly TDraftLanguageDefinition[] {
        const i18nConfig = this.extractDraftI18nConfig(siteConfig, variables);
        return Array.isArray(i18nConfig?.supportedLanguages)
            ? i18nConfig.supportedLanguages
                .map((entry) => this.normalizeDraftLanguageDefinition(entry))
                .filter((entry): entry is TDraftLanguageDefinition => !!entry)
            : [];
    }

    private defaultDraftLanguage(siteConfig: TDraftSiteConfigPayload | null, variables: TVariablesPayload | null, languages: readonly TDraftLanguageDefinition[]): string {
        const configured = normalizeLocaleCode(this.extractDraftI18nConfig(siteConfig, variables)?.defaultLanguage);
        if (configured && languages.some((entry) => entry.code === configured)) return configured;
        return languages[0]?.code ?? 'es';
    }

    private secondaryLanguage(primary: string, languages: readonly TDraftLanguageDefinition[]): string | null {
        const secondary = languages.find((entry) => entry.code !== primary);
        return secondary?.code ?? null;
    }

    private buildResolvedAnalyticsConfig(
        siteAnalytics: TDraftAnalyticsRuntimeConfig | null | undefined,
        pageAnalytics: TAnalyticsConfigPayload | null,
    ): TResolvedAnalyticsConfig | null {
        if (!siteAnalytics && !pageAnalytics) {
            return null;
        }

        return {
            sectionIds: pageAnalytics?.sectionIds ?? [],
            scrollMilestones: pageAnalytics?.scrollMilestones ?? [],
            enabled: siteAnalytics?.enabled ?? false,
            consentUI: siteAnalytics?.consentUI ?? 'none',
            consentSnoozeSeconds: siteAnalytics?.consentSnoozeSeconds ?? 86400,
            track: pageAnalytics?.track ?? siteAnalytics?.track,
            events: {
                ...(siteAnalytics?.events ?? {}),
                ...(pageAnalytics?.events ?? {}),
            },
            categories: {
                ...(siteAnalytics?.categories ?? {}),
                ...(pageAnalytics?.categories ?? {}),
            },
            quickStats: {
                ...(siteAnalytics?.quickStats ?? {}),
                ...(pageAnalytics?.quickStats ?? {}),
                events: pageAnalytics?.quickStats?.events ?? siteAnalytics?.quickStats?.events,
            },
        };
    }

    async load(opts?: { domain?: string; pageId?: string; lang?: string }): Promise<TBootstrapResult> {
        const resolved = this.resolver.resolveDomain();
        const siteConfig = this.store.siteConfig();
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

        this.store.resetPagePayloads();
        this.store.setStage('page-config');
        this.error.set(null);

        const pageConfig = await this.loadPageConfig(domain, pageId);
        this.store.setPageConfig(pageConfig);

        this.store.setStage('components');
        const components = await this.loadComponents(domain, pageId);
        this.store.setComponents(components);

        this.store.setStage('variables');
        const loadedVariables = await this.loadVariables(domain, pageId);
        const draftLanguages = this.buildDraftLanguageDefinitions(siteConfig, loadedVariables);
        const defaultLanguage = this.defaultDraftLanguage(siteConfig, loadedVariables, draftLanguages);
        this.language.configureLanguages(
            draftLanguages.map((entry) => entry.code),
            { defaultLanguage, requestedLanguage: requestedLang }
        );
        const lang = this.language.currentLanguage();
        const fallbackLang = this.secondaryLanguage(lang, draftLanguages);

        const variables = loadedVariables;
        this.store.setStage('angora-combos');
        const combos = await this.loadCombos(domain, pageId);
        this.store.setVariables(variables);
        this.store.setCombos(combos);
        this.variablesStore.setPayload(variables, siteConfig);

        this.store.setStage('i18n');
        const i18nPayload = await this.loadI18n(domain, pageId, lang);
        this.store.setI18n(i18nPayload);

        if (fallbackLang) {
            void this.i18n.prefetch(fallbackLang);
        }

        const seo = pageConfig?.seo ?? null;
        const structuredData = pageConfig?.structuredData ?? null;
        const loadedAnalytics = pageConfig?.analytics ?? null;
        const analytics = this.buildResolvedAnalyticsConfig(
            this.store.siteConfig()?.runtime?.analytics,
            loadedAnalytics,
        );
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
            siteConfig,
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

    private captureError(stage: TConfigBootstrapStage, error: unknown): void {
        this.store.setStage('error');
        this.error.set(`Failed to load ${ stage }`);
        if (this.runtimeConfig.isDebugMode()) {
            console.error('[ConfigBootstrap]', stage, error);
        }
    }

    private buildValidationIssues(payloads: {
        siteConfig: TDraftSiteConfigPayload | null;
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

        addMissing('site-config', payloads.siteConfig);
        addMissing('page-config', payloads.pageConfig);
        addMissing('components', payloads.components);
        addMissing('i18n', payloads.i18n);

        addVersionMismatch('site-config', payloads.siteConfig);
        addVersionMismatch('page-config', payloads.pageConfig);
        addVersionMismatch('components', payloads.components as any);
        addVersionMismatch('variables', payloads.variables as any);
        addVersionMismatch('i18n', payloads.i18n as any);

        const pageConfig = payloads.pageConfig;
        addIssue(!pageConfig || pageConfig.rootIds.length === 0, 'page-config.rootIds must include at least one render root.');

        const components = payloads.components?.components ?? [];
        addIssue(components.length === 0, 'components.json must include at least one component entry.');

        const componentEntries: readonly Record<string, unknown>[] = components;
        const componentIds = new Set(
            componentEntries
                .map((component) => component['id'])
                .filter((id): id is string => this.isNonEmptyString(id))
                .map((id) => id.trim())
        );
        const generatedLoopPrefixes = this.collectGeneratedLoopPrefixes(components);
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

        for (const component of componentEntries) {
            const componentId = String(component['id']).trim();
            for (const childId of this.collectChildComponentIds(component)) {
                if (this.isGeneratedLoopReference(childId, generatedLoopPrefixes)) {
                    continue;
                }

                if (!componentIds.has(childId)) {
                    addMissingReferenceIssue(`Component "${ componentId }" references missing child component "${ childId }".`);
                }
            }

            const templateId = this.resolveLoopTemplateId(component);
            if (templateId && !componentIds.has(templateId)) {
                addMissingReferenceIssue(`Component "${ componentId }" references missing loop template "${ templateId }".`);
            }
        }

        const variables = this.buildEffectiveVariables(payloads.siteConfig, payloads.variables);
        const site = this.isRecord(payloads.siteConfig?.site) ? payloads.siteConfig.site : null;
        const appIdentity = this.isRecord(variables['appIdentity']) ? variables['appIdentity'] : null;
        const theme = this.isRecord(variables['theme']) ? variables['theme'] : null;
        const i18n = this.isRecord(variables['i18n']) ? variables['i18n'] : null;
        const ui = this.isRecord(variables['ui']) ? variables['ui'] : null;
        const contact = this.isRecord(ui?.['contact']) ? ui['contact'] : null;
        const modalConfigs = this.isRecord(ui?.['modals']) ? ui['modals'] as Record<string, unknown> : null;
        const referencedModalIds = this.collectReferencedModalIds(componentEntries);

        addIssue(!site, 'site-config.site is required.');
        addIssue(!appIdentity, 'site-config.site.appIdentity is required.');
        addIssue(
            !!appIdentity
            && !this.isNonEmptyString(appIdentity['identifier'])
            && !this.isNonEmptyString(appIdentity['name']),
            'site-config.site.appIdentity.identifier or site-config.site.appIdentity.name is required.'
        );
        addIssue(!theme, 'site-config.site.theme is required.');
        addIssue(!i18n, 'site-config.site.i18n is required.');
        addIssue(!this.isNonEmptyString(i18n?.['defaultLanguage']), 'site-config.site.i18n.defaultLanguage is required.');
        addIssue(!Array.isArray(i18n?.['supportedLanguages']) || i18n['supportedLanguages'].length === 0, 'site-config.site.i18n.supportedLanguages must include at least one language.');

        referencedModalIds.forEach((modalId) => {
            const modalConfig = modalConfigs && this.isRecord(modalConfigs[modalId]) ? modalConfigs[modalId] as Record<string, unknown> : null;

            addIssue(!modalConfig, `config.ui.modals.${ modalId } is required when modal "${ modalId }" is referenced.`);
            addIssue(
                !!modalConfig
                && !this.isNonEmptyString(modalConfig['ariaLabel'])
                && !this.isNonEmptyString(modalConfig['ariaLabelKey']),
                `config.ui.modals.${ modalId }.ariaLabel or ariaLabelKey is required when modal "${ modalId }" is referenced.`
            );
        });

        const requiresWhatsAppContact = componentEntries.some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            if (typeof instructions !== 'string') return false;
            return /(^|;)(openWhatsApp|openFaqCtaWhatsApp|openFinalCtaWhatsApp)(:|;|$)/.test(instructions);
        });

        const requiresFaqWhatsAppMessage = componentEntries.some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            return typeof instructions === 'string' && /(^|;)openFaqCtaWhatsApp(:|;|$)/.test(instructions);
        });

        const requiresFinalCtaWhatsAppMessage = componentEntries.some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            return typeof instructions === 'string' && /(^|;)openFinalCtaWhatsApp(:|;|$)/.test(instructions);
        });

        const requiresGeneralWhatsAppMessage = componentEntries.some((component) => {
            if (!this.isRecord(component)) return false;
            const instructions = component['eventInstructions'];
            return typeof instructions === 'string' && /(^|;)openWhatsApp(:|;|$)/.test(instructions);
        });

        addIssue(requiresWhatsAppContact && !contact, 'config.ui.contact is required when WhatsApp handlers are used.');
        addIssue(requiresWhatsAppContact && !this.isNonEmptyString(contact?.['whatsappPhone']), 'config.ui.contact.whatsappPhone is required when WhatsApp handlers are used.');
        addIssue(requiresGeneralWhatsAppMessage && !this.isNonEmptyString(contact?.['whatsappMessageKey']), 'config.ui.contact.whatsappMessageKey is required when openWhatsApp handlers are used.');
        addIssue(requiresFaqWhatsAppMessage && !this.isNonEmptyString(contact?.['faqMessageKey']), 'config.ui.contact.faqMessageKey is required when FAQ WhatsApp handlers are used.');
        addIssue(requiresFinalCtaWhatsAppMessage && !this.isNonEmptyString(contact?.['finalCtaMessageKey']), 'config.ui.contact.finalCtaMessageKey is required when final CTA WhatsApp handlers are used.');

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
