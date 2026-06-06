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
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import { ConfigApiService } from './config-api.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { ConfigStoreService } from './config-store.service';
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
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly language = inject(LanguageService);
    private readonly store = inject(ConfigStoreService);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
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
            return bundle?.siteConfig ?? this.resolveHydratedSiteConfig(domain) ?? this.legacyApiSource.loadSiteConfig(domain);
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
            if (bundle && Object.prototype.hasOwnProperty.call(bundle, 'variables')) {
                return bundle.variables ?? null;
            }

            const resolved = this.resolveBundleIdentity(bundle, domain, pageId);
            return this.legacyApiSource.loadVariables(resolved.domain, resolved.pageId);
        },
        loadCombos: async (domain, pageId) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId });
            if (bundle && Object.prototype.hasOwnProperty.call(bundle, 'angoraCombos')) {
                return bundle.angoraCombos ?? null;
            }

            const resolved = this.resolveBundleIdentity(bundle, domain, pageId);
            return this.legacyApiSource.loadCombos(resolved.domain, resolved.pageId);
        },
        loadI18n: async (domain, pageId, lang) => {
            const bundle = await this.tryLoadRuntimeBundle(domain, { pageId, lang });
            return bundle?.i18n ?? this.legacyApiSource.loadI18n(domain, pageId, lang);
        },
    };

    private parseRequestUrl(): URL | null {
        if (this.isBrowser) {
            return null;
        }

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

    private collectRuntimeBundleDomains(requestedDomain: string, payload: TRuntimeBundlePayload): readonly string[] {
        const candidates = [
            requestedDomain,
            payload.domain,
            payload.siteConfig?.domain,
            payload.metadata?.['requestedDomain'],
            payload.metadata?.['resolvedAlias'],
            ...(Array.isArray(payload.siteConfig?.aliases) ? payload.siteConfig.aliases : []),
        ];

        return Array.from(new Set(
            candidates
                .map((entry) => String(entry ?? '').trim())
                .filter(Boolean)
        ));
    }

    private collectRuntimeBundlePageIds(requestedPageId: string, payload: TRuntimeBundlePayload): readonly string[] {
        return Array.from(new Set(
            [requestedPageId, payload.pageId]
                .map((entry) => String(entry ?? '').trim())
        ));
    }

    private collectRuntimeBundleLanguages(requestedLang: string, payload: TRuntimeBundlePayload): readonly string[] {
        return Array.from(new Set(
            [requestedLang, payload.lang]
                .map((entry) => String(entry ?? '').trim())
                .filter(Boolean)
        ));
    }

    private seedRuntimeBundleCacheAliases(
        payload: TRuntimeBundlePayload,
        requested: {
            domain: string;
            pageId: string;
            lang: string;
            path: string;
        },
        resolved: Promise<TRuntimeBundlePayload>,
    ): void {
        const domains = this.collectRuntimeBundleDomains(requested.domain, payload);
        const pageIds = this.collectRuntimeBundlePageIds(requested.pageId, payload);
        const languages = this.collectRuntimeBundleLanguages(requested.lang, payload);

        domains.forEach((domain) => {
            pageIds.forEach((pageId) => {
                languages.forEach((lang) => {
                    this.runtimeBundleCache.set(
                        this.createRuntimeBundleCacheKey(domain, pageId, lang, requested.path),
                        resolved,
                    );
                });
            });
        });
    }

    private resolveRuntimeBundlePath(pathOverride?: string): string {
        const explicitPath = String(pathOverride ?? '').trim();
        if (explicitPath) {
            return this.normalizePath(explicitPath);
        }

        return this.resolveActivePath();
    }

    private normalizeHost(value: unknown): string {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/:\d+$/, '')
            .replace(/^\[(.*)\]$/, '$1');
    }

    private resolveRuntimeHost(): string {
        if (this.isBrowser && typeof window !== 'undefined') {
            return this.normalizeHost(window.location?.hostname);
        }

        const requestHeaders = this.request?.headers as Headers | undefined;
        const forwardedHost = String(requestHeaders?.get?.('x-forwarded-host') ?? '')
            .split(',')[0]
            .trim();
        const headerHost = String(requestHeaders?.get?.('host') ?? '').trim();
        const requestUrl = this.parseRequestUrl();
        return this.normalizeHost(forwardedHost || headerHost || requestUrl?.hostname);
    }

    private isSharedTestingPreviewHost(): boolean {
        return this.resolveRuntimeHost() === 'test.zoolandingpage.com.mx';
    }

    private testAliasesForDomain(domain: string): readonly string[] {
        const normalized = this.normalizeHost(domain);
        if (!normalized || normalized.startsWith('test.')) {
            return normalized ? [normalized] : [];
        }

        const names = new Set<string>([`test.${ normalized }`]);
        const firstLabel = normalized.split('.')[0];
        if (!normalized.endsWith('zoolandingpage.com.mx') && firstLabel) {
            names.add(`test.${ firstLabel }.zoolandingpage.com.mx`);
        }

        return Array.from(names);
    }

    private runtimeBundleRequestDomains(domain: string): readonly string[] {
        const normalized = String(domain ?? '').trim();
        if (!normalized || !this.isSharedTestingPreviewHost()) {
            return normalized ? [normalized] : [];
        }

        return Array.from(new Set([
            ...this.testAliasesForDomain(normalized),
            normalized,
        ]));
    }

    private async loadRuntimeBundle(domain: string, opts?: {
        pageId?: string;
        lang?: string;
        forceRefresh?: boolean;
        path?: string;
    }): Promise<TRuntimeBundlePayload | null> {
        const normalizedDomain = String(domain ?? '').trim();
        if (!normalizedDomain) {
            return null;
        }

        const pageId = String(opts?.pageId ?? '').trim();
        const lang = this.resolveLanguage(opts?.lang);
        const currentPath = this.resolveRuntimeBundlePath(opts?.path);
        const requestedKey = this.createRuntimeBundleCacheKey(normalizedDomain, pageId, lang, currentPath);
        const candidateDomains = this.runtimeBundleRequestDomains(normalizedDomain);

        if (opts?.forceRefresh) {
            this.runtimeBundleCache.delete(requestedKey);
            candidateDomains.forEach((candidateDomain) => {
                this.runtimeBundleCache.delete(this.createRuntimeBundleCacheKey(candidateDomain, pageId, lang, currentPath));
            });
        }

        const cached = this.runtimeBundleCache.get(requestedKey);
        if (cached) {
            return cached;
        }

        for (const candidateDomain of candidateDomains) {
            const candidateKey = this.createRuntimeBundleCacheKey(candidateDomain, pageId, lang, currentPath);
            const candidateCached = this.runtimeBundleCache.get(candidateKey);
            if (candidateCached) {
                const payload = await candidateCached;
                if (payload) {
                    this.runtimeBundleCache.set(requestedKey, Promise.resolve(payload));
                    return payload;
                }
            }

            const requestPromise = this.api.getRuntimeBundle(candidateDomain, {
                pageId: pageId || undefined,
                lang,
                path: currentPath,
            })
                .then((payload) => isRuntimeBundlePayload(payload) ? payload : null)
                .then((payload) => {
                    if (!payload) {
                        this.runtimeBundleCache.delete(candidateKey);
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
                    this.runtimeBundleCache.set(candidateKey, resolved);
                    this.runtimeBundleCache.set(actualKey, resolved);
                    this.seedRuntimeBundleCacheAliases(payload, {
                        domain: normalizedDomain,
                        pageId,
                        lang,
                        path: currentPath,
                    }, resolved);
                    return payload;
                })
                .catch((error) => {
                    this.runtimeBundleCache.delete(candidateKey);
                    throw error;
                });

            this.runtimeBundleCache.set(candidateKey, requestPromise);

            try {
                const payload = await requestPromise;
                if (payload) {
                    return payload;
                }
            } catch {
                // Try the next shared-preview alias candidate before giving up.
            }
        }

        this.runtimeBundleCache.delete(requestedKey);
        return null;
    }

    private async tryLoadRuntimeBundle(domain: string, opts?: {
        pageId?: string;
        lang?: string;
        path?: string;
    }): Promise<TRuntimeBundlePayload | null> {
        try {
            return await this.loadRuntimeBundle(domain, opts);
        } catch {
            return null;
        }
    }

    private resolveBundleIdentity(
        bundle: TRuntimeBundlePayload | null,
        requestedDomain: string,
        requestedPageId: string,
    ): { domain: string; pageId: string } {
        const domain = String(bundle?.domain ?? requestedDomain ?? '').trim();
        const pageId = String(bundle?.pageId ?? requestedPageId ?? '').trim();

        return {
            domain: domain || requestedDomain,
            pageId: pageId || requestedPageId,
        };
    }

    private normalizeDomainToken(value: unknown): string {
        return String(value ?? '').trim().toLowerCase();
    }

    private resolveHydratedSiteConfig(requestedDomain: string): TDraftSiteConfigPayload | null {
        if (!this.isBrowser) {
            return null;
        }

        const siteConfig = this.store.siteConfig();
        if (!siteConfig) {
            return null;
        }

        const normalizedRequestedDomain = this.normalizeDomainToken(requestedDomain);
        if (!normalizedRequestedDomain) {
            return null;
        }

        const normalizedCanonicalDomain = this.normalizeDomainToken(siteConfig.domain);
        const normalizedAliases = Array.isArray(siteConfig.aliases)
            ? siteConfig.aliases.map((alias) => this.normalizeDomainToken(alias)).filter(Boolean)
            : [];
        const knownDomains = [normalizedCanonicalDomain, ...normalizedAliases].filter(Boolean);

        return knownDomains.includes(normalizedRequestedDomain) ? siteConfig : null;
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

    async prefetchRoute(domain: string, opts?: { pageId?: string; lang?: string; path?: string }): Promise<void> {
        const normalizedDomain = String(domain ?? '').trim();
        if (!normalizedDomain) {
            return;
        }

        if (environment.drafts.enabled) {
            await this.drafts.prefetchSiteConfig(normalizedDomain);

            const pageId = String(opts?.pageId ?? '').trim();
            if (!pageId) {
                return;
            }

            await this.drafts.prefetchPagePayloads({
                domain: normalizedDomain,
                pageId,
                lang: opts?.lang,
            });
            return;
        }

        await this.tryLoadRuntimeBundle(normalizedDomain, {
            pageId: opts?.pageId,
            lang: opts?.lang,
            path: opts?.path,
        });
    }

    loadDebugWorkspacePageConfig(): Promise<TPageConfigPayload | null> {
        return this.drafts.loadDebugWorkspacePageConfig();
    }

    loadDebugWorkspaceComponents(): Promise<TComponentsPayload | null> {
        return this.drafts.loadDebugWorkspaceComponents();
    }

    loadDebugWorkspaceCombos(): Promise<TAngoraCombosPayload | null> {
        return this.drafts.loadDebugWorkspaceCombos();
    }
}
