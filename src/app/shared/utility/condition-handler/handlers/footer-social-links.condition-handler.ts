import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const footerSocialLinksConditionHandler: ConditionHandler = {
    id: 'footerSocialLinks',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        const host: any = ctx.host;
        const links = host?.footerSocialLinks;
        if (!Array.isArray(links)) return false;
        if (!Array.isArray(args) || args.length === 0) return links.length > 0;
        const mode = String(args[0]);
        if (mode === 'exists') return links.length > 0;
        return false;
    },
};
