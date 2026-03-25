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
import { environment } from '@/environments/environment';
import { inject, Injectable } from '@angular/core';
import { ConfigApiService } from './config-api.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';

type TConfigSource = {
    readonly loadPageConfig: (domain: string, pageId: string) => Promise<TPageConfigPayload | null>;
    readonly loadComponents: (domain: string, pageId: string) => Promise<TComponentsPayload | null>;
    readonly loadVariables: (domain: string, pageId: string) => Promise<TVariablesPayload | null>;
    readonly loadCombos: (domain: string, pageId: string) => Promise<TAngoraCombosPayload | null>;
    readonly loadI18n: (domain: string, pageId: string, lang: string) => Promise<TI18nPayload | null>;
    readonly loadSeo: (domain: string, pageId: string) => Promise<TSeoPayload | null>;
    readonly loadStructuredData: (domain: string, pageId: string) => Promise<TStructuredDataPayload | null>;
    readonly loadAnalytics: (domain: string, pageId: string) => Promise<TAnalyticsConfigPayload | null>;
};

@Injectable({ providedIn: 'root' })
export class ConfigSourceService {
    private readonly api = inject(ConfigApiService);
    private readonly drafts = inject(DraftConfigLoaderService);

    private readonly draftSource: TConfigSource = {
        loadPageConfig: (domain, pageId) => this.drafts.loadPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.drafts.loadComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.drafts.loadVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.drafts.loadAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.drafts.loadI18n(domain, pageId, lang),
        loadSeo: (domain, pageId) => this.drafts.loadSeo(domain, pageId),
        loadStructuredData: (domain, pageId) => this.drafts.loadStructuredData(domain, pageId),
        loadAnalytics: (domain, pageId) => this.drafts.loadAnalyticsConfig(domain, pageId),
    };

    private readonly apiSource: TConfigSource = {
        loadPageConfig: (domain, pageId) => this.api.getPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.api.getComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.api.getVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.api.getAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.api.getI18n(domain, lang, pageId),
        loadSeo: (domain, pageId) => this.api.getSeo(domain, pageId),
        loadStructuredData: (domain, pageId) => this.api.getStructuredData(domain, pageId),
        loadAnalytics: (domain, pageId) => this.api.getAnalyticsConfig(domain, pageId),
    };

    private get source(): TConfigSource {
        return environment.drafts.enabled ? this.draftSource : this.apiSource;
    }

    loadPageConfig(domain: string, pageId: string): Promise<TPageConfigPayload | null> {
        return this.source.loadPageConfig(domain, pageId);
    }

    loadComponents(domain: string, pageId: string): Promise<TComponentsPayload | null> {
        return this.source.loadComponents(domain, pageId);
    }

    loadVariables(domain: string, pageId: string): Promise<TVariablesPayload | null> {
        return this.source.loadVariables(domain, pageId);
    }

    loadCombos(domain: string, pageId: string): Promise<TAngoraCombosPayload | null> {
        return this.source.loadCombos(domain, pageId);
    }

    loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        return this.source.loadI18n(domain, pageId, lang);
    }

    loadSeo(domain: string, pageId: string): Promise<TSeoPayload | null> {
        return this.source.loadSeo(domain, pageId);
    }

    loadStructuredData(domain: string, pageId: string): Promise<TStructuredDataPayload | null> {
        return this.source.loadStructuredData(domain, pageId);
    }

    loadAnalytics(domain: string, pageId: string): Promise<TAnalyticsConfigPayload | null> {
        return this.source.loadAnalytics(domain, pageId);
    }
}
