import type { ValueHandler } from '../value-handler.types';

const readQueryParam = (key: unknown): string | undefined => {
    const normalizedKey = String(key ?? '').trim();
    if (!normalizedKey || typeof window === 'undefined' || !window.location?.search) {
        return undefined;
    }

    const value = new URLSearchParams(window.location.search).get(normalizedKey);
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
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
