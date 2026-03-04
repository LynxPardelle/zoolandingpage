import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const navigationConditionHandler: ConditionHandler = {
    id: 'navigation',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        const host: any = ctx.host;
        const items = host?.navigation;
        if (!Array.isArray(items)) return false;
        if (!Array.isArray(args) || args.length === 0) return items.length > 0;
        const mode = String(args[0] ?? '').trim();
        if (mode === 'exists') return items.length > 0;
        return false;
    },
};
