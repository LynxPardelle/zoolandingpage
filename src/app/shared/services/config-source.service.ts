import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeBundlePayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { isRuntimeBundlePayload } from '@/app/shared/utility/config-validation/config-payload.validators';
import { environment } from '@/environments/environment';
import { inject, Injectable, REQUEST } from '@angular/core';
import { ConfigApiService } from './config-api.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { LanguageService } from './language.service';

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
    private readonly request = inject(REQUEST, { optional: true });
    private readonly language = inject(LanguageService);
    private readonly runtimeBundleCache = new Map<string, Promise<TRuntimeBundlePayload | null>>();

    private readonly draftSource: TConfigSource = {
        loadSiteConfig: (domain) => this.drafts.loadSiteConfig(domain),
        loadPageConfig: (domain, pageId) => this.drafts.loadPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.drafts.loadComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.drafts.loadVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.drafts.loadAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.drafts.loadI18n(domain, pageId, lang),
    };

    private readonly legacyApiSource: TConfigSource = {
        loadSiteConfig: (domain) => this.api.getSiteConfig(domain),
        loadPageConfig: (domain, pageId) => this.api.getPageConfig(domain, pageId),
        loadComponents: (domain, pageId) => this.api.getComponents(domain, pageId),
        loadVariables: (domain, pageId) => this.api.getVariables(domain, pageId),
        loadCombos: (domain, pageId) => this.api.getAngoraCombos(domain, pageId),
        loadI18n: (domain, pageId, lang) => this.api.getI18n(domain, lang, pageId),
    };

    private readonly apiSource: TConfigSource = {
        loadSiteConfig: async (domain) => {
            const bundle = await this.tryLoadRuntimeBundle(domain);
            return bundle?.siteConfig ?? this.legacyApiSource.loadSiteConfig(domain);
        },
        loadPageConfig: async (domain, pageId) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId });
            return bundle?.pageConfig ?? this.legacyApiSource.loadPageConfig(domain, pageId);
        },
        loadComponents: async (domain, pageId) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId });
            return bundle?.components ?? this.legacyApiSource.loadComponents(domain, pageId);
        },
        loadVariables: async (domain, pageId) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId });
            return bundle?.variables ?? this.legacyApiSource.loadVariables(domain, pageId);
        },
        loadCombos: async (domain, pageId) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId });
            return bundle?.angoraCombos ?? this.legacyApiSource.loadCombos(domain, pageId);
        },
        loadI18n: async (domain, pageId, lang) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId, lang });
            return bundle?.i18n ?? this.legacyApiSource.loadI18n(domain, pageId, lang);
        },
    };

    private parseRequestUrl(): URL | null {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (!requestUrl) {
            return null;
        }

        try {
            return new URL(requestUrl, 'http://localhost');
        } catch {
            return null;
        }
    }

    private normalizePath(path: string): string {
        const trimmed = String(path ?? '').trim();
        if (!trimmed) return '/';

        let normalized = trimmed;
        try {
            normalized = decodeURIComponent(trimmed);
        } catch {
            normalized = trimmed;
        }

        normalized = normalized.replace(/\\+/g, '/');
        if (!normalized.startsWith('/')) normalized = `/${ normalized }`;
        normalized = normalized.replace(/\/+/g, '/');
        if (normalized.length > 1) {
            normalized = normalized.replace(/\/+$/, '');
        }

        return normalized || '/';
    }

    private resolveActivePath(): string {
        const requestUrl = this.parseRequestUrl();
        if (requestUrl) {
            return this.normalizePath(requestUrl.pathname);
        }

        if (typeof window !== 'undefined' && window.location?.pathname) {
            return this.normalizePath(window.location.pathname);
        }

        return '/';
    }

    private resolveLanguage(explicitLang?: string): string {
        const explicit = String(explicitLang ?? '').trim();
        if (explicit) {
            return explicit;
        }

        const active = String(this.language.currentLanguage() ?? '').trim();
        return active || 'en';
    }

    private createRuntimeBundleCacheKey(domain: string, pageId: string, lang: string, path: string): string {
        return [domain.trim().toLowerCase(), pageId.trim(), lang.trim().toLowerCase(), this.normalizePath(path)].join('::');
    }

    private async loadRuntimeBundle(domain: string, opts?: {
        pageId?: string;
        lang?: string;
        forceRefresh?: boolean;
    }): Promise<TRuntimeBundlePayload | null> {
        const normalizedDomain = String(domain ?? '').trim();
        if (!normalizedDomain) {
            return null;
        }

        const pageId = String(opts?.pageId ?? '').trim();
        const lang = this.resolveLanguage(opts?.lang);
        const currentPath = this.resolveActivePath();
        const requestedKey = this.createRuntimeBundleCacheKey(normalizedDomain, pageId, lang, currentPath);

        if (opts?.forceRefresh) {
            this.runtimeBundleCache.delete(requestedKey);
        }

        const cached = this.runtimeBundleCache.get(requestedKey);
        if (cached) {
            return cached;
        }

        const requestPromise = this.api.getRuntimeBundle(normalizedDomain, {
            pageId: pageId || undefined,
            lang,
            path: currentPath,
        })
            .then((payload) => isRuntimeBundlePayload(payload) ? payload : null)
            .then((payload) => {
                if (!payload) {
                    this.runtimeBundleCache.delete(requestedKey);
                    return null;
                }

                const actualKey = this.createRuntimeBundleCacheKey(
                    payload.domain,
                    payload.pageId,
                    String(payload.lang ?? lang),
                    currentPath,
                );

                const resolved = Promise.resolve(payload);
                this.runtimeBundleCache.set(requestedKey, resolved);
                this.runtimeBundleCache.set(actualKey, resolved);
                return payload;
            })
            .catch((error) => {
                this.runtimeBundleCache.delete(requestedKey);
                throw error;
            });

        this.runtimeBundleCache.set(requestedKey, requestPromise);
        return requestPromise;
    }

    private async tryLoadRuntimeBundle(domain: string, opts?: {
        pageId?: string;
        lang?: string;
    }): Promise<TRuntimeBundlePayload | null> {
        try {
            return await this.loadRuntimeBundle(domain, opts);
        } catch {
            return null;
        }
    }

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
