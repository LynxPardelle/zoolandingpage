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
const SERVER_RUNTIME_BUNDLE_CACHE_TTL_MS = 60_000;

type TRuntimeBundleCacheEntry = {
    readonly expiresAt: number;
    readonly payload: TRuntimeBundlePayload;
};

const serverRuntimeBundleCache = new Map<string, TRuntimeBundleCacheEntry>();

export function clearRuntimeBundleServerCacheForTesting(): void {
    serverRuntimeBundleCache.clear();
}

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

    private resolveRuntimeCacheKey(path: string, params: Record<string, string | undefined>): string | null {
        if (!this.isServerRequest() || path !== RUNTIME_BUNDLE_ENDPOINT) {
            return null;
        }

        return this.buildUrl(path, params);
    }

    private readCachedRuntimeBundle<T>(cacheKey: string | null): T | null {
        if (!cacheKey) {
            return null;
        }

        const cached = serverRuntimeBundleCache.get(cacheKey);
        if (!cached) {
            return null;
        }

        if (cached.expiresAt <= Date.now()) {
            serverRuntimeBundleCache.delete(cacheKey);
            return null;
        }

        return cached.payload as T;
    }

    private writeCachedRuntimeBundle<T>(cacheKey: string | null, payload: T): void {
        if (!cacheKey) {
            return;
        }

        serverRuntimeBundleCache.set(cacheKey, {
            expiresAt: Date.now() + SERVER_RUNTIME_BUNDLE_CACHE_TTL_MS,
            payload: payload as TRuntimeBundlePayload,
        });
    }

    private async getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
        const url = this.buildUrl(path, params);
        const fallbackUrl = this.resolveRuntimeFallbackUrl(path, params);
        const runtimeCacheKey = this.resolveRuntimeCacheKey(path, params);
        const cachedRuntimeBundle = this.readCachedRuntimeBundle<T>(runtimeCacheKey);
        if (cachedRuntimeBundle) {
            return cachedRuntimeBundle;
        }

        if (fallbackUrl) {
            try {
                const payload = await this.fetchJson<T>(fallbackUrl);
                this.writeCachedRuntimeBundle(runtimeCacheKey, payload);
                return payload;
            } catch {
                const payload = await firstValueFrom(this.http.get<T>(url));
                this.writeCachedRuntimeBundle(runtimeCacheKey, payload);
                return payload;
            }
        }

        const payload = await firstValueFrom(this.http.get<T>(url));
        this.writeCachedRuntimeBundle(runtimeCacheKey, payload);
        return payload;
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
