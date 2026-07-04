import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import type { TDraftLocalStorageSlot } from '../types/config-payloads.types';
import { isLocalRequestHostname, parseSsrRequestUrl } from '../utility/request/ssr-request-url.utility';
import { ConfigStoreService } from './config-store.service';

export type TResolvedDomain = {
    readonly domain: string;
    readonly source: 'queryParam' | 'urlHost' | 'unresolved';
};

@Injectable({ providedIn: 'root' })
export class DomainResolverService {
    private readonly testingDraftPreviewHost = 'test.zoolandingpage.com.mx';
    private readonly testingDraftPreviewFallbackDomain = 'zoolandingpage.com.mx';
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly configStore = inject(ConfigStoreService);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private parseRequestUrl(): URL | null {
        return parseSsrRequestUrl(this.request);
    }

    private isLocalHost(hostname: string): boolean {
        return isLocalRequestHostname(hostname);
    }

    canUseDraftQueryParamsOnHost(hostname: string): boolean {
        const normalized = String(hostname ?? '').trim().toLowerCase();
        return this.isLocalHost(normalized) || normalized === this.testingDraftPreviewHost;
    }

    private sanitizeToken(value: unknown): string {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private configuredStorageSuffix(slotOrSuffix: string): string {
        const localStorageConfig = this.configStore.siteConfig()?.runtime?.localStorage;
        const normalizedSlot = String(slotOrSuffix ?? '').trim() as TDraftLocalStorageSlot;
        const configured = localStorageConfig?.[normalizedSlot];
        return typeof configured === 'string' && configured.trim().length > 0
            ? configured.trim()
            : String(slotOrSuffix ?? '').trim();
    }

    private readSearchParam(params: URLSearchParams, key: string): string {
        const direct = String(params.get(key) ?? '').trim();
        if (direct.length > 0) {
            return direct;
        }

        for (const [entryKey] of params.entries()) {
            const normalizedKey = String(entryKey ?? '').trim();
            if (!normalizedKey.startsWith(`${ key }=`)) {
                continue;
            }

            const value = normalizedKey.slice(key.length + 1).trim();
            if (value.length > 0) {
                return value;
            }
        }

        return '';
    }

    resolveDomain(): TResolvedDomain {
        const requestUrl = this.parseRequestUrl();

        if (this.isBrowser && window.location?.search) {
            const queryDomain = this.readSearchParam(new URLSearchParams(window.location.search), 'draftDomain');
            if (queryDomain.length > 0 && this.canUseDraftQueryParamsOnHost(window.location.hostname)) {
                return { domain: queryDomain, source: 'queryParam' };
            }
        }

        if (requestUrl) {
            const requestDomain = this.readSearchParam(requestUrl.searchParams, 'draftDomain');
            if (requestDomain.length > 0 && this.canUseDraftQueryParamsOnHost(requestUrl.hostname)) {
                return { domain: requestDomain, source: 'queryParam' };
            }
        }

        if (requestUrl?.hostname) {
            const host = requestUrl.hostname.trim();
            if (host.length > 0 && !this.isLocalHost(host)) {
                if (host.toLowerCase() === this.testingDraftPreviewHost) {
                    return { domain: this.testingDraftPreviewFallbackDomain, source: 'urlHost' };
                }

                return { domain: host, source: 'urlHost' };
            }
        }

        if (this.isBrowser && window.location?.hostname) {
            const host = window.location.hostname.trim();
            if (host.length > 0 && !this.isLocalHost(host)) {
                if (host.toLowerCase() === this.testingDraftPreviewHost) {
                    return { domain: this.testingDraftPreviewFallbackDomain, source: 'urlHost' };
                }

                return { domain: host, source: 'urlHost' };
            }
        }

        return { domain: '', source: 'unresolved' };
    }

    resolveStorageNamespace(): string {
        return this.sanitizeToken(this.resolveDomain().domain) || 'app';
    }

    resolveStorageKey(suffix: string): string {
        const normalizedSuffix = this.sanitizeToken(this.configuredStorageSuffix(suffix)) || 'value';
        return `${ this.resolveStorageNamespace() }:${ normalizedSuffix }`;
    }
}
