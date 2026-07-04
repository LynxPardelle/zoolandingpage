type TSsrRequestLike = {
    readonly url?: unknown;
    readonly headers?: unknown;
};

type THeadersLike = {
    readonly get?: (name: string) => unknown;
};

export function firstSsrHeaderValue(value: unknown): string {
    return String(value ?? '').split(',')[0]?.trim() ?? '';
}

export function readSsrRequestHeader(request: unknown, name: string): string {
    const headers = (request as TSsrRequestLike | null | undefined)?.headers;
    if (!headers) {
        return '';
    }

    const headersLike = headers as THeadersLike;
    if (typeof headersLike.get === 'function') {
        return String(headersLike.get(name) ?? '').trim();
    }

    const normalizedName = String(name ?? '').trim().toLowerCase();
    const record = headers as Record<string, unknown>;
    const entryKey = Object.keys(record).find((key) => key.toLowerCase() === normalizedName);
    const value = entryKey ? record[entryKey] : '';

    if (Array.isArray(value)) {
        return String(value[0] ?? '').trim();
    }

    return String(value ?? '').trim();
}

export function hostnameFromSsrAuthority(value: unknown): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return '';
    }

    try {
        return new URL(`https://${ trimmed }`).hostname.trim().toLowerCase();
    } catch {
        return trimmed
            .replace(/^\[(.*)\]$/, '$1')
            .split(':')[0]?.trim()
            .toLowerCase() ?? '';
    }
}

export function isLocalRequestHostname(hostname: unknown): boolean {
    const normalized = String(hostname ?? '')
        .trim()
        .toLowerCase()
        .replace(/^\[(.*)\]$/, '$1');
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function resolveSsrRequestAuthorityHost(request: unknown): string {
    const directHost = firstSsrHeaderValue(readSsrRequestHeader(request, 'host'));
    const forwardedHost = firstSsrHeaderValue(readSsrRequestHeader(request, 'x-forwarded-host'));
    const directHostname = hostnameFromSsrAuthority(directHost);
    const forwardedHostname = hostnameFromSsrAuthority(forwardedHost);

    if (
        directHost
        && forwardedHost
        && directHostname
        && forwardedHostname
        && directHostname !== forwardedHostname
        && !isLocalRequestHostname(directHostname)
    ) {
        return directHost;
    }

    return forwardedHost || directHost;
}

export function resolveSsrRequestBaseUrl(request: unknown): string {
    const host = resolveSsrRequestAuthorityHost(request);
    if (!host) {
        return 'http://localhost';
    }

    const protocol = firstSsrHeaderValue(readSsrRequestHeader(request, 'x-forwarded-proto')) || 'https';
    return `${ protocol }://${ host }`;
}

export function parseSsrRequestUrl(request: unknown): URL | null {
    const requestUrl = String((request as TSsrRequestLike | null | undefined)?.url ?? '').trim();
    if (!requestUrl) {
        return null;
    }

    try {
        const baseUrl = resolveSsrRequestBaseUrl(request);
        const parsed = new URL(requestUrl, baseUrl);
        const authorityHost = hostnameFromSsrAuthority(resolveSsrRequestAuthorityHost(request));
        if (isLocalRequestHostname(parsed.hostname) && authorityHost && !isLocalRequestHostname(authorityHost)) {
            return new URL(`${ parsed.pathname }${ parsed.search }${ parsed.hash }`, baseUrl);
        }

        return parsed;
    } catch {
        return null;
    }
}

export function resolveSsrRequestHostname(request: unknown): string {
    const parsed = parseSsrRequestUrl(request);
    if (parsed?.hostname) {
        return parsed.hostname.trim().toLowerCase();
    }

    return hostnameFromSsrAuthority(resolveSsrRequestAuthorityHost(request));
}
