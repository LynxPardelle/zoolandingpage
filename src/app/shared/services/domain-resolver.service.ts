import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';

export type TResolvedDomain = {
    readonly domain: string;
    readonly source: 'queryParam' | 'urlHost' | 'unresolved';
};

@Injectable({ providedIn: 'root' })
export class DomainResolverService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

    private parseRequestUrl(): URL | null {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl.length === 0) {
            return null;
        }

        try {
            return new URL(requestUrl, 'http://localhost');
        } catch {
            return null;
        }
    }

    private isLocalHost(hostname: string): boolean {
        const normalized = String(hostname ?? '').trim().toLowerCase();
        return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
    }

    resolveDomain(): TResolvedDomain {
        if (this.isBrowser && window.location?.search) {
            const fromQuery = new URLSearchParams(window.location.search).get('draftDomain');
            const queryDomain = String(fromQuery ?? '').trim();
            if (queryDomain.length > 0) {
                return { domain: queryDomain, source: 'queryParam' };
            }
        }

        const requestUrl = this.parseRequestUrl();
        if (requestUrl) {
            const fromRequest = requestUrl.searchParams.get('draftDomain');
            const requestDomain = String(fromRequest ?? '').trim();
            if (requestDomain.length > 0) {
                return { domain: requestDomain, source: 'queryParam' };
            }
        }

        if (requestUrl?.hostname) {
            const host = requestUrl.hostname.trim();
            if (host.length > 0 && !this.isLocalHost(host)) {
                return { domain: host, source: 'urlHost' };
            }
        }

        if (this.isBrowser && window.location?.hostname) {
            const host = window.location.hostname.trim();
            if (host.length > 0 && !this.isLocalHost(host)) {
                return { domain: host, source: 'urlHost' };
            }
        }

        return { domain: '', source: 'unresolved' };
    }
}
