import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const footerConfigConditionHandler: ConditionHandler = {
    id: 'footerConfig',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        // Usage: all:footerConfig,showLegalLinks
        const host: any = ctx.host;
        const footerConfig = host?.footerConfig;
        if (!footerConfig || !Array.isArray(args) || args.length === 0) return false;
        const prop = String(args[0]);
        return Boolean(footerConfig[prop]);
    },
};
