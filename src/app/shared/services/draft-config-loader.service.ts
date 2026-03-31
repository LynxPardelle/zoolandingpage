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

@Injectable({ providedIn: 'root' })
export class DraftConfigLoaderService {
    private readonly debugWorkspaceBase = `${ String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '') }/_debug/debug-workspace`;

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
        const base = String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '');
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

    async loadSiteConfig(domain?: string): Promise<TDraftSiteConfigPayload | null> {
        const domainBase = this.getDomainBase(domain);
        if (!domainBase) {
            return null;
        }

        const url = `${ domainBase }/site-config.json`;
        const payload = await this.getJson<TDraftSiteConfigPayload>(url);
        return isDraftSiteConfigPayload(payload) ? payload : null;
    }

    async loadPageConfig(domain?: string, pageId?: string): Promise<TPageConfigPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const url = `${ draftBase }/page-config.json`;
        const payload = await this.getJson<TPageConfigPayload>(url);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadComponents(domain?: string, pageId?: string): Promise<TComponentsPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

        const [sitePayload, pagePayload] = await Promise.all([
            this.loadComponentsPayload(`${ domainBase }/components.json`),
            this.loadComponentsPayload(`${ draftBase }/components.json`),
        ]);

        return this.mergeComponentsPayloads(normalizedDomain, normalizedPageId, [sitePayload, pagePayload]);
    }

    async loadVariables(domain?: string, pageId?: string): Promise<TVariablesPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

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
    }

    async loadAngoraCombos(domain?: string, pageId?: string): Promise<TAngoraCombosPayload | null> {
        const domainBase = this.getDomainBase(domain);
        const draftBase = this.getDraftBase(domain, pageId);
        const normalizedDomain = String(domain ?? '').trim();
        const normalizedPageId = String(pageId ?? '').trim();
        if (!domainBase || !draftBase || !normalizedDomain || !normalizedPageId) {
            return null;
        }

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
    }
}
