import { getLocaleCandidates } from '@/app/shared/i18n/locale.utils';
import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TSeoPayload,
    TStructuredDataPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    isAnalyticsConfigPayload,
    isAngoraCombosPayload,
    isDraftSiteConfigPayload,
    isI18nPayload,
    isPageConfigPayload,
    isSeoPayload,
    isStructuredDataPayload,
    isVariablesPayload
} from '@/app/shared/utility/config-validation/config-payload.validators';
import { environment } from '@/environments/environment';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DraftConfigLoaderService {
    private getDomainBase(domain?: string): string {
        const base = String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '');
        const d = String(domain ?? environment.drafts.defaultDomain ?? '').trim();
        return `${ base }/${ encodeURIComponent(d) }`;
    }

    private getDraftBase(domain?: string, pageId?: string): string {
        const base = this.getDomainBase(domain);
        const p = String(pageId ?? environment.drafts.defaultPageId ?? '').trim();
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

    async loadSiteConfig(domain?: string): Promise<TDraftSiteConfigPayload | null> {
        const url = `${ this.getDomainBase(domain) }/site-config.json`;
        const payload = await this.getJson<TDraftSiteConfigPayload>(url);
        return isDraftSiteConfigPayload(payload) ? payload : null;
    }

    async loadPageConfig(domain?: string, pageId?: string): Promise<TPageConfigPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/page-config.json`;
        const payload = await this.getJson<TPageConfigPayload>(url);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadComponents(domain?: string, pageId?: string): Promise<TComponentsPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/components.json`;
        const payload = await this.getJson<TComponentsPayload>(url);
        return payload && typeof payload === 'object' ? (payload as TComponentsPayload) : null;
    }

    async loadVariables(domain?: string, pageId?: string): Promise<TVariablesPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/variables.json`;
        const payload = await this.getJson<TVariablesPayload>(url);
        return isVariablesPayload(payload) ? payload : null;
    }

    async loadAngoraCombos(domain?: string, pageId?: string): Promise<TAngoraCombosPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/angora-combos.json`;
        const payload = await this.getJson<TAngoraCombosPayload>(url);
        return isAngoraCombosPayload(payload) ? payload : null;
    }

    async loadSeo(domain?: string, pageId?: string): Promise<TSeoPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/seo.json`;
        const payload = await this.getJson<TSeoPayload>(url);
        return isSeoPayload(payload) ? payload : null;
    }

    async loadStructuredData(domain?: string, pageId?: string): Promise<TStructuredDataPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/structured-data.json`;
        const payload = await this.getJson<TStructuredDataPayload>(url);
        return isStructuredDataPayload(payload) ? payload : null;
    }

    async loadAnalyticsConfig(domain?: string, pageId?: string): Promise<TAnalyticsConfigPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/analytics-config.json`;
        const payload = await this.getJson<TAnalyticsConfigPayload>(url);
        return isAnalyticsConfigPayload(payload) ? payload : null;
    }

    async loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        const base = this.getDraftBase(domain, pageId);
        const candidates = getLocaleCandidates(lang);

        for (const candidate of candidates) {
            const url = `${ base }/i18n/${ encodeURIComponent(candidate) }.json`;
            const payload = await this.getJson<TI18nPayload>(url);
            if (isI18nPayload(payload)) {
                return payload;
            }
        }

        return null;
    }
}
