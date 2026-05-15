import type { ValueHandler } from '../value-handler.types';

export const readQueryParamFromSearch = (search: string, key: unknown): string | undefined => {
    const normalizedKey = String(key ?? '').trim();
    const normalizedSearch = String(search ?? '').trim();
    if (!normalizedKey || !normalizedSearch) {
        return undefined;
    }

    const value = new URLSearchParams(normalizedSearch).get(normalizedKey);
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
};

const readQueryParam = (key: unknown): string | undefined => {
    if (typeof window === 'undefined' || !window.location?.search) {
        return undefined;
    }

    return readQueryParamFromSearch(window.location.search, key);
};

export const queryParamValueHandler = (): ValueHandler => ({
    id: 'queryParam',
    resolve: (_ctx, args) => readQueryParam(args?.[0]),
});

export const queryParamOrValueHandler = (): ValueHandler => ({
    id: 'queryParamOr',
    resolve: (_ctx, args) => {
        const value = readQueryParam(args?.[0]);
        return value ?? args?.[1] ?? '';
    },
});
