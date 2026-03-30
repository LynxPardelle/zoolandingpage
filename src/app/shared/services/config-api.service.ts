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
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
    private readonly http = inject(HttpClient);

    private buildUrl(path: string, params: Record<string, string | undefined>): string {
        const base = String(environment.apiUrl ?? '').replace(/\/$/, '');
        const url = new URL(`${ base }/${ path.replace(/^\//, '') }`);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        return url.toString();
    }

    private async getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
        const url = this.buildUrl(path, params);
        return await firstValueFrom(this.http.get<T>(url));
    }

    getSiteConfig(domain: string): Promise<TDraftSiteConfigPayload> {
        return this.getJson<TDraftSiteConfigPayload>('site-config', { domain });
    }

    getPageConfig(domain: string, pageId?: string): Promise<TPageConfigPayload> {
        return this.getJson<TPageConfigPayload>('page-config', { domain, pageId });
    }

    getComponents(domain: string, pageId?: string): Promise<TComponentsPayload> {
        return this.getJson<TComponentsPayload>('components', { domain, pageId });
    }

    getVariables(domain: string, pageId?: string): Promise<TVariablesPayload> {
        return this.getJson<TVariablesPayload>('variables', { domain, pageId });
    }

    getAngoraCombos(domain: string, pageId?: string): Promise<TAngoraCombosPayload> {
        return this.getJson<TAngoraCombosPayload>('angora-combos', { domain, pageId });
    }

    getI18n(domain: string, lang: string, pageId?: string): Promise<TI18nPayload> {
        return this.getJson<TI18nPayload>('i18n', { domain, lang, pageId });
    }

    getSeo(domain: string, pageId?: string): Promise<TSeoPayload> {
        return this.getJson<TSeoPayload>('seo', { domain, pageId });
    }

    getStructuredData(domain: string, pageId?: string): Promise<TStructuredDataPayload> {
        return this.getJson<TStructuredDataPayload>('structured-data', { domain, pageId });
    }

    getAnalyticsConfig(domain: string, pageId?: string): Promise<TAnalyticsConfigPayload> {
        return this.getJson<TAnalyticsConfigPayload>('analytics-config', { domain, pageId });
    }

    getDebugWorkspacePageConfig(): Promise<TPageConfigPayload> {
        return this.getJson<TPageConfigPayload>('debug-workspace/page-config', {});
    }

    getDebugWorkspaceComponents(): Promise<TComponentsPayload> {
        return this.getJson<TComponentsPayload>('debug-workspace/components', {});
    }
}
