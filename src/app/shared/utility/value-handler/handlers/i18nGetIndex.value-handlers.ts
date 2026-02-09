import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

export const i18nGetIndexValueHandler = (): ValueHandler => {
    const i18n = inject(I18nService);

    const resolvePropPath = (root: unknown, propPath: string): unknown => {
        const parts = String(propPath ?? '')
            .split('.')
            .map((p) => p.trim())
            .filter(Boolean);
        let cur: any = root as any;
        for (const part of parts) {
            if (cur == null) return undefined;
            cur = cur[part];
        }
        return cur;
    };

    return {
        id: 'i18nGetIndex',
        resolve: (_ctx, args) => {
            const key = String(args?.[0] ?? '').trim();
            const index = Number(args?.[1] ?? NaN);
            const propPath = args?.[2] == null ? '' : String(args[2]).trim();
            const fallback = args?.[3];

            if (!key || Number.isNaN(index)) return fallback ?? '';

            const arr = i18n.getOr<any[]>(key, []);
            const item = arr?.[index];
            if (propPath.length === 0) return item ?? (fallback ?? '');

            const value = resolvePropPath(item, propPath);
            return value ?? (fallback ?? (propPath.endsWith('s') ? [] : ''));
        },
    };
};
