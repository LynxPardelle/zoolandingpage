import { environment } from '@/environments/environment';
import { inject, Injectable, REQUEST } from '@angular/core';

export type TResolvedDomain = {
    readonly domain: string;
    readonly source: 'queryParam' | 'devOverride' | 'urlHost' | 'fallback';
};

@Injectable({ providedIn: 'root' })
export class DomainResolverService {
    private readonly request = inject(REQUEST, { optional: true });

    resolveDomain(): TResolvedDomain {
        if (typeof window !== 'undefined' && window.location?.search) {
            const fromQuery = new URLSearchParams(window.location.search).get('draftDomain');
            const queryDomain = String(fromQuery ?? '').trim();
            if (queryDomain.length > 0) {
                return { domain: queryDomain, source: 'queryParam' };
            }
        }

        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl.length > 0) {
            try {
                const fromRequest = new URL(requestUrl).searchParams.get('draftDomain');
                const requestDomain = String(fromRequest ?? '').trim();
                if (requestDomain.length > 0) {
                    return { domain: requestDomain, source: 'queryParam' };
                }
            } catch {
                // Ignore malformed request URLs and continue with standard fallbacks.
            }
        }

        const devOverride = String(environment.domain.devOverride ?? '').trim();
        if (environment.development && devOverride.length > 0) {
            return { domain: devOverride, source: 'devOverride' };
        }

        if (typeof window !== 'undefined' && window.location?.hostname) {
            const host = window.location.hostname.trim();
            if (host.length > 0) {
                return { domain: host, source: 'urlHost' };
            }
        }

        return { domain: environment.domain.defaultDomain, source: 'fallback' };
    }
}
