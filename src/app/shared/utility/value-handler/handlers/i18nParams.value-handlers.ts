import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

/**
 * i18nParams
 *
 * Args:
 * - key
 * - (optional) fallback  (only when total arg count is even)
 * - then pairs: paramKey, paramValue, paramKey2, paramValue2...
 *
 * Example:
 *   set:config.text,i18nParams,footer.legal.terms.intro,org,env.app.name
 *   set:config.text,i18nParams,missing.key,My fallback,org,env.app.name
 */
export const i18nParamsValueHandler = (): ValueHandler => {
    const i18n = inject(I18nService);

    return {
        id: 'i18nParams',
        resolve: (_ctx, args) => {
            const key = String(args?.[0] ?? '').trim();
            if (!key) return '';

            const hasFallback = Array.isArray(args) && args.length >= 2 && args.length % 2 === 0;
            const fallback = hasFallback ? String(args?.[1] ?? '') : undefined;
            const startIdx = hasFallback ? 2 : 1;

            const params: Record<string, unknown> = {};
            for (let i = startIdx; i < (args?.length ?? 0); i += 2) {
                const k = String(args?.[i] ?? '').trim();
                if (!k) continue;
                params[k] = args?.[i + 1];
            }

            return hasFallback ? i18n.tOr(key, fallback ?? key, params) : i18n.t(key, params);
        },
    };
};
