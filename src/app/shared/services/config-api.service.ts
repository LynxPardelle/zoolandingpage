import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeBundlePayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, REQUEST } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const RUNTIME_BUNDLE_ENDPOINT = 'runtime-bundle';

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
    private readonly http = inject(HttpClient);
    private readonly request = inject(REQUEST, { optional: true });

    private resolveOrigin(): string {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'http://localhost').origin;
            } catch {
                // Fall through to browser or localhost origin.
            }
        }

        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin;
        }

        return 'http://localhost';
    }

    private buildUrlForBase(baseUrl: string, path: string, params: Record<string, string | undefined>): string {
        const base = String(baseUrl ?? '').trim().replace(/\/$/, '');
        const target = `${ base }/${ path.replace(/^\//, '') }`;
        const url = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(base)
            ? new URL(target)
            : new URL(target, this.resolveOrigin());
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        return url.toString();
    }

    private buildUrl(path: string, params: Record<string, string | undefined>): string {
        return this.buildUrlForBase(String(environment.configApiUrl ?? environment.apiUrl ?? ''), path, params);
    }

    private isServerRequest(): boolean {
        return !!this.request;
    }

    private resolveRuntimeFallbackUrl(path: string, params: Record<string, string | undefined>): string | null {
        if (!this.isServerRequest() || path !== RUNTIME_BUNDLE_ENDPOINT) {
            return null;
        }

        const fallbackBase = String(environment.configApiServerFallbackUrl ?? '').trim();
        if (!fallbackBase) {
            return null;
        }

        const primaryBase = String(environment.configApiUrl ?? environment.apiUrl ?? '').trim();
        if (!primaryBase || fallbackBase.replace(/\/$/, '') === primaryBase.replace(/\/$/, '')) {
            return null;
        }

        return this.buildUrlForBase(fallbackBase, path, params);
    }

    private async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${ url }: ${ response.status } ${ response.statusText }`);
        }

        return await response.json() as T;
    }

    private async getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
        const url = this.buildUrl(path, params);
        const fallbackUrl = this.resolveRuntimeFallbackUrl(path, params);

        if (fallbackUrl) {
            try {
                return await this.fetchJson<T>(fallbackUrl);
            } catch {
                return await firstValueFrom(this.http.get<T>(url));
            }
        }

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

    getRuntimeBundle(domain: string, opts?: {
        pageId?: string;
        lang?: string;
        path?: string;
    }): Promise<TRuntimeBundlePayload> {
        return this.getJson<TRuntimeBundlePayload>('runtime-bundle', {
            domain,
            pageId: opts?.pageId,
            lang: opts?.lang,
            path: opts?.path,
        });
    }

    getDebugWorkspacePageConfig(): Promise<TPageConfigPayload> {
        return this.getJson<TPageConfigPayload>('debug-workspace/page-config', {});
    }

    getDebugWorkspaceComponents(): Promise<TComponentsPayload> {
        return this.getJson<TComponentsPayload>('debug-workspace/components', {});
    }

    getDebugWorkspaceAngoraCombos(): Promise<TAngoraCombosPayload> {
        return this.getJson<TAngoraCombosPayload>('debug-workspace/angora-combos', {});
    }
}
