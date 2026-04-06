import type { ValueHandler } from '../value-handler.types';

export const coalesceValueHandler = (): ValueHandler => ({
    id: 'coalesce',
    resolve: (_ctx, args) => {
        for (const a of args ?? []) {
            if (a == null) continue;
            if (typeof a === 'string' && a.trim().length === 0) continue;
            return a;
        }
        return '';
    },
});

export const upperValueHandler = (): ValueHandler => ({
    id: 'upper',
    resolve: (_ctx, args) => String(args?.[0] ?? '').toUpperCase(),
});

export const lowerValueHandler = (): ValueHandler => ({
    id: 'lower',
    resolve: (_ctx, args) => String(args?.[0] ?? '').toLowerCase(),
});
