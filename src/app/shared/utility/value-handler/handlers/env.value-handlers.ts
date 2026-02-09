import { environment } from '@/environments/environment';
import type { ValueHandler } from '../value-handler.types';

function getEnvPath(path: string): unknown {
    const parts = String(path ?? '').trim().split('.').filter(Boolean);
    let cur: any = environment as any;
    for (const part of parts) {
        if (cur == null) return undefined;
        cur = cur[part];
    }
    return cur;
}

export const envValueHandler = (): ValueHandler => ({
    id: 'env',
    resolve: (_ctx, args) => {
        const path = String(args?.[0] ?? '').trim();
        if (!path) return undefined;
        return getEnvPath(path);
    },
});

export const envOrValueHandler = (): ValueHandler => ({
    id: 'envOr',
    resolve: (_ctx, args) => {
        const path = String(args?.[0] ?? '').trim();
        const fallback = args?.[1];
        const v = path ? getEnvPath(path) : undefined;
        return v == null ? (fallback ?? '') : v;
    },
});
