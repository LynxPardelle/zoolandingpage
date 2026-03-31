import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { inject, Injectable } from '@angular/core';
import { ConfigApiService } from './config-api.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';

type TConfigSource = {
    readonly loadSiteConfig: (domain: string) => Promise<TDraftSiteConfigPayload | null>;
    readonly loadPageConfig: (domain: string, pageId: string) => Promise<TPageConfigPayload | null>;
    readonly loadComponents: (domain: string, pageId: string) => Promise<TComponentsPayload | null>;
    readonly loadVariables: (domain: string, pageId: string) => Promise<TVariablesPayload | null>;
    readonly loadCombos: (domain: string, pageId: string) => Promise<TAngoraCombosPayload | null>;
    readonly loadI18n: (domain: string, pageId: string, lang: string) => Promise<TI18nPayload | null>;
};

@Injectable({ providedIn: 'root' })
export class ConfigSourceService {
    private readonly api = inject(ConfigApiService);
    private readonly drafts = inject(DraftConfigLoaderService);

    private readonly draftSource: TConfigSource = {
        loadSiteConfig: (domain) => this.drafts.loadSiteConfig(domain),
        loadPageConfig: (domain, pageId) => this.drafts.loadPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.drafts.loadComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.drafts.loadVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.drafts.loadAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.drafts.loadI18n(domain, pageId, lang),
    };

    private readonly apiSource: TConfigSource = {
        loadSiteConfig: (domain) => this.api.getSiteConfig(domain),
        loadPageConfig: (domain, pageId) => this.api.getPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.api.getComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.api.getVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.api.getAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.api.getI18n(domain, lang, pageId),
    };

    private get source(): TConfigSource {
        return environment.drafts.enabled ? this.draftSource : this.apiSource;
    }

    loadSiteConfig(domain: string): Promise<TDraftSiteConfigPayload | null> {
        return this.source.loadSiteConfig(domain);
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

    loadDebugWorkspacePageConfig(): Promise<TPageConfigPayload | null> {
        return environment.drafts.enabled
            ? this.drafts.loadDebugWorkspacePageConfig()
            : this.api.getDebugWorkspacePageConfig();
    }

    loadDebugWorkspaceComponents(): Promise<TComponentsPayload | null> {
        return environment.drafts.enabled
            ? this.drafts.loadDebugWorkspaceComponents()
            : this.api.getDebugWorkspaceComponents();
    }

    loadDebugWorkspaceCombos(): Promise<TAngoraCombosPayload | null> {
        return environment.drafts.enabled
            ? this.drafts.loadDebugWorkspaceCombos()
            : this.api.getDebugWorkspaceAngoraCombos();
    }
}
