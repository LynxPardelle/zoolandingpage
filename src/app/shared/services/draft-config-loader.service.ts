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
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DraftConfigLoaderService {
    private readonly http = inject(HttpClient);

    private getDraftBase(domain?: string, pageId?: string): string {
        const base = String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '');
        const d = String(domain ?? environment.drafts.defaultDomain ?? '').trim();
        const p = String(pageId ?? environment.drafts.defaultPageId ?? '').trim();
        return `${ base }/${ encodeURIComponent(d) }/${ encodeURIComponent(p) }`;
    }

    private async getJson<T>(path: string): Promise<T | null> {
        try {
            return await firstValueFrom(this.http.get<T>(path));
        } catch {
            return null;
        }
    }

    async loadPageConfig(domain?: string, pageId?: string): Promise<TPageConfigPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/page-config.json`;
        const payload = await this.getJson<TPageConfigPayload>(url);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadComponents(domain?: string, pageId?: string): Promise<TComponentsPayload | null> {
        const url = `${ this.getDraftBase(domain, pageId) }/components.json`;
        const payload = await this.getJson<TComponentsPayload>(url);
        return isComponentsPayload(payload) ? payload : null;
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
        const url = `${ base }/i18n/${ encodeURIComponent(lang) }.json`;
        const payload = await this.getJson<TI18nPayload>(url);
        return isI18nPayload(payload) ? payload : null;
    }
}
