import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';

export type TResolvedDomain = {
    readonly domain: string;
    readonly source: 'queryParam' | 'devOverride' | 'urlHost' | 'fallback';
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

        const devOverride = String(environment.domain.devOverride ?? '').trim();
        if (environment.development && devOverride.length > 0) {
            return { domain: devOverride, source: 'devOverride' };
        }

        if (this.isBrowser && window.location?.hostname) {
            const host = window.location.hostname.trim();
            if (host.length > 0) {
                return { domain: host, source: 'urlHost' };
            }
        }

        return { domain: environment.domain.defaultDomain, source: 'fallback' };
    }
}
