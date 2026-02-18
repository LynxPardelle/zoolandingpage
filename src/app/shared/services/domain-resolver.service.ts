import { environment } from '@/environments/environment';
import { Injectable } from '@angular/core';

export type TResolvedDomain = {
    readonly domain: string;
    readonly source: 'devOverride' | 'urlHost' | 'fallback';
};

@Injectable({ providedIn: 'root' })
export class DomainResolverService {
    resolveDomain(): TResolvedDomain {
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
