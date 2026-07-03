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
import { inject, Injectable, makeStateKey, REQUEST, TransferState } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const RUNTIME_BUNDLE_ENDPOINT = 'runtime-bundle';
const RUNTIME_BUNDLE_TRANSFER_STATE_PREFIX = 'zlp-runtime-bundle:';
const SERVER_RUNTIME_BUNDLE_CACHE_TTL_MS = 60_000;

type TRuntimeBundleCacheEntry = {
    readonly expiresAt: number;
    readonly payload: TRuntimeBundlePayload;
};

type TRuntimeFallbackEnvironment = 'dev' | 'test' | 'production';

const serverRuntimeBundleCache = new Map<string, TRuntimeBundleCacheEntry>();

export function clearRuntimeBundleServerCacheForTesting(): void {
    serverRuntimeBundleCache.clear();
}

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
    private readonly http = inject(HttpClient);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly transferState = inject(TransferState, { optional: true });

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

    private resolveCurrentUrl(): URL | null {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'http://localhost');
            } catch {
                return null;
            }
        }

        if (typeof window !== 'undefined' && window.location?.href) {
            try {
                return new URL(window.location.href);
            } catch {
                return null;
            }
        }

        return null;
    }

    private isLocalHostname(hostname: string): boolean {
        const normalized = String(hostname ?? '').trim().toLowerCase();
        return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
    }

    private normalizeRuntimeFallbackEnvironment(value: unknown): TRuntimeFallbackEnvironment | null {
        const normalized = String(value ?? '').trim().toLowerCase();
        return normalized === 'dev' || normalized === 'test' || normalized === 'production'
            ? normalized
            : null;
    }

    private resolveRuntimeFallbackEnvironment(params: Record<string, string | undefined>): TRuntimeFallbackEnvironment {
        const explicit = this.normalizeRuntimeFallbackEnvironment(params['environment']);
        if (explicit) {
            return explicit;
        }

        const currentUrl = this.resolveCurrentUrl();
        const hostname = String(currentUrl?.hostname ?? '').trim().toLowerCase();
        if (hostname.startsWith('test.') || hostname.includes('.test.')) {
            return 'test';
        }

        return 'production';
    }

    private readSearchParam(params: URLSearchParams, key: string): string {
        return String(params.get(key) ?? '').trim();
    }

    private hasDebugWorkspaceQueryParam(params: URLSearchParams): boolean {
        if (!params.has('debugWorkspace')) {
            return false;
        }

        const value = this.readSearchParam(params, 'debugWorkspace').toLowerCase();
        return value === '' || value === 'true';
    }

    private shouldUseLocalDraftApi(path: string): boolean {
        const currentUrl = this.resolveCurrentUrl();
        if (!currentUrl) {
            return false;
        }

        if (path.startsWith('debug-workspace/')) {
            if (this.hasDebugWorkspaceQueryParam(currentUrl.searchParams)) {
                return true;
            }

            return false;
        }

        const hasDraftDomain = this.readSearchParam(currentUrl.searchParams, 'draftDomain').length > 0;
        return this.isLocalHostname(currentUrl.hostname) && hasDraftDomain && path === RUNTIME_BUNDLE_ENDPOINT;
    }

    private buildLocalDraftApiUrl(path: string, params: Record<string, string | undefined>): string | null {
        if (!this.shouldUseLocalDraftApi(path)) {
            return null;
        }

        return this.buildUrlForBase(this.resolveOrigin(), path, params);
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

    private readServerEnv(name: string): string {
        if (!this.isServerRequest()) {
            return '';
        }

        const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
        return String(processLike?.env?.[name] ?? '').trim();
    }

    private hasServerEnv(name: string): boolean {
        if (!this.isServerRequest()) {
            return false;
        }

        const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
        return Object.prototype.hasOwnProperty.call(processLike?.env ?? {}, name);
    }

    private resolveConfigApiBaseUrl(): string {
        return this.readServerEnv('CONFIG_API_URL') || String(environment.configApiUrl ?? environment.apiUrl ?? '').trim();
    }

    private resolveRuntimeFallbackBaseUrl(params: Record<string, string | undefined>): string {
        const runtimeEnvironment = this.resolveRuntimeFallbackEnvironment(params);
        const serverFallbacks = environment.configApiServerFallbackUrls ?? {};
        const runtimeFallbacks = environment.configApiRuntimeFallbackUrls ?? {};
        const serverFallback = this.hasServerEnv('CONFIG_API_SERVER_FALLBACK_URL')
            ? this.readServerEnv('CONFIG_API_SERVER_FALLBACK_URL')
            : null;
        const runtimeFallback = this.hasServerEnv('CONFIG_API_RUNTIME_FALLBACK_URL')
            ? this.readServerEnv('CONFIG_API_RUNTIME_FALLBACK_URL')
            : null;

        if (serverFallback !== null) {
            return serverFallback;
        }

        if (runtimeFallback !== null) {
            return runtimeFallback;
        }

        return String(serverFallbacks[runtimeEnvironment] ?? runtimeFallbacks[runtimeEnvironment] ?? '').trim()
            || String(environment.configApiRuntimeFallbackUrl ?? environment.configApiServerFallbackUrl ?? '').trim();
    }

    private resolveRuntimeFallbackUrl(path: string, params: Record<string, string | undefined>): string | null {
        if (path !== RUNTIME_BUNDLE_ENDPOINT) {
            return null;
        }

        const fallbackBase = this.resolveRuntimeFallbackBaseUrl(params);
        if (!fallbackBase) {
            return null;
        }

        const primaryBase = this.resolveConfigApiBaseUrl();
        if (!primaryBase || fallbackBase.replace(/\/$/, '') === primaryBase.replace(/\/$/, '')) {
            return null;
        }

        return this.buildUrlForBase(fallbackBase, path, params);
    }

    private async fetchJson<T>(url: string): Promise<T> {
        return await firstValueFrom(this.http.get<T>(url));
    }

    private resolveRuntimeCacheKey(path: string, params: Record<string, string | undefined>): string | null {
        if (path !== RUNTIME_BUNDLE_ENDPOINT) {
            return null;
        }

        return this.buildUrlForBase(this.resolveConfigApiBaseUrl(), path, params);
    }

    private readCachedRuntimeBundle<T>(cacheKey: string | null): T | null {
        if (!cacheKey) {
            return null;
        }

        const transferred = this.readTransferredRuntimeBundle<T>(cacheKey);
        if (transferred) {
            return transferred;
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

        this.writeTransferredRuntimeBundle(cacheKey, payload);

        serverRuntimeBundleCache.set(cacheKey, {
            expiresAt: Date.now() + SERVER_RUNTIME_BUNDLE_CACHE_TTL_MS,
            payload: payload as TRuntimeBundlePayload,
        });
    }

    private transferStateKey(cacheKey: string) {
        return makeStateKey<TRuntimeBundlePayload>(`${ RUNTIME_BUNDLE_TRANSFER_STATE_PREFIX }${ cacheKey }`);
    }

    private readTransferredRuntimeBundle<T>(cacheKey: string): T | null {
        if (this.isServerRequest() || !this.transferState) {
            return null;
        }

        const stateKey = this.transferStateKey(cacheKey);
        if (!this.transferState.hasKey(stateKey)) {
            return null;
        }

        const payload = this.transferState.get<TRuntimeBundlePayload | null>(stateKey, null);
        this.transferState.remove(stateKey);
        return payload as T | null;
    }

    private writeTransferredRuntimeBundle<T>(cacheKey: string, payload: T): void {
        if (!this.isServerRequest() || !this.transferState) {
            return;
        }

        this.transferState.set(this.transferStateKey(cacheKey), payload as TRuntimeBundlePayload);
    }

    private async getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
        const localDraftUrl = this.buildLocalDraftApiUrl(path, params);
        const runtimeCacheKey = path === RUNTIME_BUNDLE_ENDPOINT
            ? localDraftUrl ?? this.resolveRuntimeCacheKey(path, params)
            : null;
        const cachedRuntimeBundle = this.readCachedRuntimeBundle<T>(runtimeCacheKey);
        if (cachedRuntimeBundle) {
            return cachedRuntimeBundle;
        }

        if (localDraftUrl) {
            try {
                const payload = await this.fetchJson<T>(localDraftUrl);
                this.writeCachedRuntimeBundle(runtimeCacheKey, payload);
                return payload;
            } catch {
                // Fall through to the configured API endpoints when the local draft server cannot serve the payload.
            }
        }

        const url = this.buildUrlForBase(this.resolveConfigApiBaseUrl(), path, params);
        const fallbackUrl = this.resolveRuntimeFallbackUrl(path, params);
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
        environment?: string;
    }): Promise<TRuntimeBundlePayload> {
        return this.getJson<TRuntimeBundlePayload>('runtime-bundle', {
            domain,
            pageId: opts?.pageId,
            lang: opts?.lang,
            path: opts?.path,
            environment: opts?.environment,
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
