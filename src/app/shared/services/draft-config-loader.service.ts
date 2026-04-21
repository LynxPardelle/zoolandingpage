import { getLocaleCandidates } from '@/app/shared/i18n/locale.utils';
import type {
    TAngoraCombosPayload,
    TComponentPayloadEntry,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    isAngoraCombosPayload,
    isComponentsPayload,
    isDraftSiteConfigPayload,
    isI18nPayload,
    isPageConfigPayload,
    isVariablesPayload
} from '@/app/shared/utility/config-validation/config-payload.validators';
import { environment } from '@/environments/environment';
import { Injectable } from '@angular/core';

type TDraftCacheEntry<T> = {
    readonly expiresAt: number;
    readonly value: Promise<T | null>;
};

@Injectable({ providedIn: 'root' })
export class DraftConfigLoaderService {
    private readonly draftCacheTtlMs = 5000;
    private readonly debugWorkspaceBase = `${ String(environment.drafts.basePath ?? 'drafts').replace(/\/$/, '') }/_debug/debug-workspace`;
    private readonly siteConfigCache = new Map<string, TDraftCacheEntry<TDraftSiteConfigPayload>>();
    private readonly pageConfigCache = new Map<string, TDraftCacheEntry<TPageConfigPayload>>();
    private readonly componentsCache = new Map<string, TDraftCacheEntry<TComponentsPayload>>();
    private readonly variablesCache = new Map<string, TDraftCacheEntry<TVariablesPayload>>();
    private readonly combosCache = new Map<string, TDraftCacheEntry<TAngoraCombosPayload>>();
    private readonly i18nCache = new Map<string, TDraftCacheEntry<TI18nPayload>>();

    private createDomainCacheKey(domain?: string): string {
        return String(domain ?? '').trim().toLowerCase();
    }

    private createPageCacheKey(domain?: string, pageId?: string): string {
        return `${ this.createDomainCacheKey(domain) }::${ String(pageId ?? '').trim() }`;
    }

    private createI18nCacheKey(domain?: string, pageId?: string, lang?: string): string {
        return `${ this.createPageCacheKey(domain, pageId) }::${ String(lang ?? '').trim().toLowerCase() }`;
    }

    private isWarmCacheEntry<T>(cache: Map<string, TDraftCacheEntry<T>>, key: string): boolean {
        const cached = cache.get(key);
        return !!cached && cached.expiresAt > Date.now();
    }

    private getCachedValue<T>(
        cache: Map<string, TDraftCacheEntry<T>>,
        key: string,
        loader: () => Promise<T | null>,
    ): Promise<T | null> {
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.value;
        }

        const value = loader().catch((error) => {
            cache.delete(key);
            throw error;
        });

        cache.set(key, {
            expiresAt: now + this.draftCacheTtlMs,
            value,
        });

        return value;
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    private deepMergeRecord<T extends Record<string, unknown>>(base: T, override: T): T {
        const merged: Record<string, unknown> = { ...base };

        Object.entries(override).forEach(([key, value]) => {
            const existing = merged[key];
            if (this.isRecord(existing) && this.isRecord(value)) {
                merged[key] = this.deepMergeRecord(existing, value);
                return;
            }

            merged[key] = value;
        });

        return merged as T;
    }

    private getDomainBase(domain?: string): string {
        const base = String(environment.drafts.basePath ?? 'drafts').replace(/\/$/, '');
        const d = String(domain ?? '').trim();
        if (!d) {
            return '';
        }

        return `${ base }/${ encodeURIComponent(d) }`;
    }

    private getDraftBase(domain?: string, pageId?: string): string {
        const base = this.getDomainBase(domain);
        const p = String(pageId ?? '').trim();
        if (!base || !p) {
            return '';
        }

        return `${ base }/${ encodeURIComponent(p) }`;
    }

    private async getJson<T>(path: string): Promise<T | null> {
        try {
            const response = await fetch(path, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                return null;
            }

            const raw = await response.text();
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    private async loadComponentsPayload(path: string): Promise<TComponentsPayload | null> {
        const payload = await this.getJson<TComponentsPayload>(path);
        return isComponentsPayload(payload) ? payload : null;
    }

    private mergeComponentsPayloads(
        domain: string,
        pageId: string,
        payloads: readonly (TComponentsPayload | null)[],
    ): TComponentsPayload | null {
        const entries = new Map<string, TComponentPayloadEntry>();

        payloads.forEach((payload) => {
            payload?.components.forEach((component) => {
                const componentDomain = String(component.domain ?? payload.domain ?? domain).trim() || domain;
                const componentPageId = String(component.pageId ?? payload.pageId ?? pageId).trim() || pageId;

                entries.set(component.id, {
                    ...component,
                    domain: componentDomain,
                    pageId: componentPageId,
                });
            });
        });

        if (entries.size === 0) {
            return null;
        }

        const version = payloads.find((payload) => payload)?.version ?? 1;

        return {
            version,
            domain,
            pageId,
            components: Array.from(entries.values()),
        };
    }

    private mergeVariablesPayloads(
        domain: string,
        pageId: string,
        payloads: readonly (TVariablesPayload | null)[],
    ): TVariablesPayload | null {
        const availablePayloads = payloads.filter((payload): payload is TVariablesPayload => !!payload);
        if (availablePayloads.length === 0) {
            return null;
        }

        return availablePayloads.reduce<TVariablesPayload>((merged, payload) => ({
            version: payload.version ?? merged.version,
            domain,
            pageId,
            variables: this.deepMergeRecord(merged.variables, payload.variables),
            computed: this.isRecord(merged.computed) || this.isRecord(payload.computed)
                ? this.deepMergeRecord(
                    this.isRecord(merged.computed) ? merged.computed : {},
                    this.isRecord(payload.computed) ? payload.computed : {},
                )
                : undefined,
        }), {
            version: availablePayloads[0].version,
            domain,
            pageId,
            variables: {},
        });
    }

    private mergeCombosPayloads(
        domain: string,
        pageId: string,
        payloads: readonly (TAngoraCombosPayload | null)[],
    ): TAngoraCombosPayload | null {
        const availablePayloads = payloads.filter((payload): payload is TAngoraCombosPayload => !!payload);
        if (availablePayloads.length === 0) {
            return null;
        }

        return availablePayloads.reduce<TAngoraCombosPayload>((merged, payload) => ({
            version: payload.version ?? merged.version,
            domain,
            pageId,
            combos: {
                ...merged.combos,
                ...payload.combos,
            },
        }), {
            version: availablePayloads[0].version,
            domain,
            pageId,
            combos: {},
        });
    }

    private mergeI18nPayloads(
        domain: string,
        pageId: string,
        lang: string,
        payloads: readonly (TI18nPayload | null)[],
    ): TI18nPayload | null {
        const availablePayloads = payloads.filter((payload): payload is TI18nPayload => !!payload);
        if (availablePayloads.length === 0) {
            return null;
        }

        return availablePayloads.reduce<TI18nPayload>((merged, payload) => ({
            version: payload.version ?? merged.version,
            domain,
            pageId,
            lang: payload.lang || merged.lang,
            dictionary: this.deepMergeRecord(merged.dictionary, payload.dictionary),
        }), {
            version: availablePayloads[0].version,
            domain,
            pageId,
            lang,
            dictionary: {},
        });
    }

    hasWarmSiteConfig(domain?: string): boolean {
        return this.isWarmCacheEntry(this.siteConfigCache, this.createDomainCacheKey(domain));
    }

    hasWarmPagePayloads(opts?: { domain?: string; pageId?: string; lang?: string }): boolean {
        const pageKey = this.createPageCacheKey(opts?.domain, opts?.pageId);
        const langKey = this.createI18nCacheKey(opts?.domain, opts?.pageId, opts?.lang);

        return this.isWarmCacheEntry(this.pageConfigCache, pageKey)
            && this.isWarmCacheEntry(this.componentsCache, pageKey)
            && this.isWarmCacheEntry(this.variablesCache, pageKey)
            && this.isWarmCacheEntry(this.combosCache, pageKey)
            && (!String(opts?.lang ?? '').trim() || this.isWarmCacheEntry(this.i18nCache, langKey));
    }

    async prefetchSiteConfig(domain?: string): Promise<void> {
        await this.loadSiteConfig(domain);
    }

    async prefetchPagePayloads(opts?: { domain?: string; pageId?: string; lang?: string }): Promise<void> {
        const domain = String(opts?.domain ?? '').trim();
        const pageId = String(opts?.pageId ?? '').trim();
        const lang = String(opts?.lang ?? '').trim();

        if (!domain || !pageId) {
            return;
        }

        await this.prefetchSiteConfig(domain);
        await Promise.all([
            this.loadPageConfig(domain, pageId),
            this.loadComponents(domain, pageId),
            this.loadVariables(domain, pageId),
            this.loadAngoraCombos(domain, pageId),
            lang ? this.loadI18n(domain, pageId, lang) : Promise.resolve(null),
        ]);
    }

    async loadSiteConfig(domain?: string): Promise<TDraftSiteConfigPayload | null> {
        const domainBase = this.getDomainBase(domain);
        if (!domainBase) {
            return null;
        }

        const key = this.createDomainCacheKey(domain);
        return this.getCachedValue(this.siteConfigCache, key, async () => {
            const url = `${ domainBase }/site-config.json`;
            const payload = await this.getJson<TDraftSiteConfigPayload>(url);
            return isDraftSiteConfigPayload(payload) ? payload : null;
        });
    }

    async loadPageConfig(domain?: string, pageId?: string): Promise<TPageConfigPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const key = this.createPageCacheKey(domain, pageId);
        return this.getCachedValue(this.pageConfigCache, key, async () => {
            const url = `${ draftBase }/page-config.json`;
            const payload = await this.getJson<TPageConfigPayload>(url);
            return isPageConfigPayload(payload) ? payload : null;
        });
    }

    async loadComponents(domain?: string, pageId?: string): Promise<TComponentsPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

        const key = this.createPageCacheKey(domain, pageId);
        return this.getCachedValue(this.componentsCache, key, async () => {
            const [sitePayload, pagePayload] = await Promise.all([
                this.loadComponentsPayload(`${ domainBase }/components.json`),
                this.loadComponentsPayload(`${ draftBase }/components.json`),
            ]);

            return this.mergeComponentsPayloads(normalizedDomain, normalizedPageId, [sitePayload, pagePayload]);
        });
    }

    async loadVariables(domain?: string, pageId?: string): Promise<TVariablesPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

        const key = this.createPageCacheKey(domain, pageId);
        return this.getCachedValue(this.variablesCache, key, async () => {
            const [sitePayload, pagePayload] = await Promise.all([
                this.getJson<TVariablesPayload>(`${ domainBase }/variables.json`),
                this.getJson<TVariablesPayload>(`${ draftBase }/variables.json`),
            ]);

            return this.mergeVariablesPayloads(
                normalizedDomain,
                normalizedPageId,
                [
                    isVariablesPayload(sitePayload) ? sitePayload : null,
                    isVariablesPayload(pagePayload) ? pagePayload : null,
                ],
            );
        });
    }

    async loadAngoraCombos(domain?: string, pageId?: string): Promise<TAngoraCombosPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

        const key = this.createPageCacheKey(domain, pageId);
        return this.getCachedValue(this.combosCache, key, async () => {
            const [sitePayload, pagePayload] = await Promise.all([
                this.getJson<TAngoraCombosPayload>(`${ domainBase }/angora-combos.json`),
                this.getJson<TAngoraCombosPayload>(`${ draftBase }/angora-combos.json`),
            ]);

            return this.mergeCombosPayloads(
                normalizedDomain,
                normalizedPageId,
                [
                    isAngoraCombosPayload(sitePayload) ? sitePayload : null,
                    isAngoraCombosPayload(pagePayload) ? pagePayload : null,
                ],
            );
        });
    }

    async loadDebugWorkspacePageConfig(): Promise<TPageConfigPayload | null> {
        const payload = await this.getJson<TPageConfigPayload>(`${ this.debugWorkspaceBase }/page-config.json`);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadDebugWorkspaceComponents(): Promise<TComponentsPayload | null> {
        return this.loadComponentsPayload(`${ this.debugWorkspaceBase }/components.json`);
    }

    async loadDebugWorkspaceCombos(): Promise<TAngoraCombosPayload | null> {
        const payload = await this.getJson<TAngoraCombosPayload>(`${ this.debugWorkspaceBase }/angora-combos.json`);
        return isAngoraCombosPayload(payload) ? payload : null;
    }

    async loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const base = this.getDraftBase(domain, pageId);
        if (!domainBase || !base) {
            return null;
        }

        const key = this.createI18nCacheKey(domain, pageId, lang);
        return this.getCachedValue(this.i18nCache, key, async () => {
            const candidates = getLocaleCandidates(lang);

            for (const candidate of candidates) {
                const [sitePayload, pagePayload] = await Promise.all([
                    this.getJson<TI18nPayload>(`${ domainBase }/i18n/${ encodeURIComponent(candidate) }.json`),
                    this.getJson<TI18nPayload>(`${ base }/i18n/${ encodeURIComponent(candidate) }.json`),
                ]);

                const merged = this.mergeI18nPayloads(domain, pageId, candidate, [
                    isI18nPayload(sitePayload) ? sitePayload : null,
                    isI18nPayload(pagePayload) ? pagePayload : null,
                ]);

                if (merged) {
                    return merged;
                }
            }

            return null;
        });
    }
}
