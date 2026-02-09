import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

export const i18nValueHandler = (): ValueHandler => {
    const i18n = inject(I18nService);

    return {
        id: 'i18n',
        resolve: (_ctx, args) => {
            const key = String(args?.[0] ?? '').trim();
            const fallback = args?.[1] == null ? undefined : String(args[1]);
            if (!key) return '';
            return fallback == null ? i18n.t(key) : i18n.tOr(key, fallback);
        },
    };
};
