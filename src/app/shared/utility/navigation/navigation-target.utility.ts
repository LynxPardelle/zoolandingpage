const STICKY_QUERY_PARAMS = ['debugWorkspace'] as const;

export type TResolvedNavigationTarget = {
    readonly href: string;
    readonly internal: boolean;
    readonly hashOnly: boolean;
    readonly path: string | null;
    readonly queryParams: Readonly<Record<string, string>> | null;
    readonly fragment: string | null;
};

const currentLocationHref = (): string => {
    if (typeof window !== 'undefined' && window.location?.href) {
        return window.location.href;
    }

    return 'http://localhost/';
};

const normalizeInternalPathname = (value: string): string => {
    let normalized = String(value ?? '').trim() || '/';

    for (let index = 0; index < 3; index += 1) {
        try {
            const decoded = decodeURIComponent(normalized);
            if (decoded === normalized) {
                break;
            }
            normalized = decoded;
        } catch {
            break;
        }
    }

    normalized = normalized.replace(/\\+/g, '/');
    if (!normalized.startsWith('/')) {
        normalized = `/${ normalized }`;
    }
    normalized = normalized.replace(/\/+/g, '/');
    if (normalized.length > 1) {
        normalized = normalized.replace(/\/+$/g, '');
    }

    return normalized || '/';
};

export const toNavigationHref = (value: unknown): string => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return '';

    if (
        normalized.startsWith('#')
        || normalized.startsWith('/')
        || /^(mailto:|tel:|sms:)/i.test(normalized)
        || /^[a-z][a-z0-9+.-]*:/i.test(normalized)
    ) {
        return normalized;
    }

    return `#${ normalized.replace(/^#/, '') }`;
};

export const resolveNavigationTarget = (href: string): TResolvedNavigationTarget => {
    const value = String(href ?? '').trim();
    if (!value) {
        return { href: '', internal: false, hashOnly: false, path: null, queryParams: null, fragment: null };
    }

    if (value.startsWith('#')) {
        return {
            href: value,
            internal: true,
            hashOnly: true,
            path: null,
            queryParams: null,
            fragment: value.slice(1) || null,
        };
    }

    if (/^(mailto:|tel:|sms:)/i.test(value)) {
        return { href: value, internal: false, hashOnly: false, path: null, queryParams: null, fragment: null };
    }

    try {
        const currentUrl = new URL(currentLocationHref());
        const targetUrl = new URL(value, currentUrl);
        const internal = targetUrl.origin === currentUrl.origin;

        if (!internal) {
            return { href: value, internal: false, hashOnly: false, path: null, queryParams: null, fragment: null };
        }

        for (const key of STICKY_QUERY_PARAMS) {
            if (targetUrl.searchParams.has(key) || !currentUrl.searchParams.has(key)) {
                continue;
            }

            targetUrl.searchParams.set(key, currentUrl.searchParams.get(key) ?? '');
        }

        const normalizedPath = normalizeInternalPathname(targetUrl.pathname);
        targetUrl.pathname = normalizedPath;
        const queryParams = Object.fromEntries(targetUrl.searchParams.entries());

        return {
            href: `${ targetUrl.pathname }${ targetUrl.search }${ targetUrl.hash }`,
            internal: true,
            hashOnly: false,
            path: normalizedPath,
            queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
            fragment: targetUrl.hash ? targetUrl.hash.slice(1) : null,
        };
    } catch {
        return { href: value, internal: false, hashOnly: false, path: null, queryParams: null, fragment: null };
    }
};
