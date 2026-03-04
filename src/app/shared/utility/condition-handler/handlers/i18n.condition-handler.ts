import { I18nService } from '@/app/shared/services/i18n.service';
import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const i18nExistsConditionHandler: ConditionHandler = {
    id: 'i18n',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        // Usage: all:i18n,hero.subtitle
        // Host should provide globalI18n or fallback to direct inject
        const host: any = ctx.host;
        const i18n: I18nService = host?.globalI18n ?? host?.i18n ?? undefined;
        if (!i18n || !Array.isArray(args) || args.length === 0) return false;

        const first = String(args[0]);
        const key = first === 'exists' ? String(args[1] ?? '') : first;
        if (!key) return false;

        const getValue = typeof (i18n as any).getOr === 'function' ? (i18n as any).getOr(key, undefined) : undefined;
        const tValue = typeof i18n.t === 'function' ? i18n.t(key) : undefined;

        // Prefer direct dictionary lookup. If i18n.t returns the key itself, treat it as missing.
        const value = getValue !== undefined
            ? getValue
            : (typeof tValue === 'string' && tValue === key ? undefined : tValue);

        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value as object).length > 0;
        return Boolean(value);
    },
};
