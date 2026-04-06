import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const modalRefIdConditionHandler: ConditionHandler = {
    id: 'modalRefId',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        // Usage: all:modalRefId,terms-of-service
        const host: any = ctx.host;
        const activeModalRef = typeof host.activeModalRef === 'function' ? host.activeModalRef() : undefined;
        if (!activeModalRef || !Array.isArray(args) || args.length === 0) return false;
        return String(activeModalRef.id) === String(args[0]);
    },
};
