import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

function resolveLogic(
    ctx: ConditionExecutionContext,
    args: unknown[],
    registry: Record<string, ConditionHandler>,
    op: 'and' | 'or' | 'nand' | 'nor' | 'not'
): boolean {
    if (!Array.isArray(args) || args.length === 0) return false;
    const results = args.map((arg) => {
        if (typeof arg === 'object' && arg !== null && 'handler' in arg && Array.isArray((arg as any).args)) {
            const handlerId = (arg as any).handler;
            const handlerArgs = (arg as any).args;
            const handler = registry[handlerId];
            if (handler) {
                return !!handler.resolve(ctx, handlerArgs);
            }
        }
        return Boolean(arg);
    });
    switch (op) {
        case 'and': return results.every(Boolean);
        case 'or': return results.some(Boolean);
        case 'nand': return !results.every(Boolean);
        case 'nor': return !results.some(Boolean);
        case 'not': return !results[0];
        default: return false;
    }
}

export function createLogicHandlers(registry: Record<string, ConditionHandler>): ConditionHandler[] {
    return [
        {
            id: 'and',
            resolve: (ctx, args) => resolveLogic(ctx, args, registry, 'and'),
        },
        {
            id: 'or',
            resolve: (ctx, args) => resolveLogic(ctx, args, registry, 'or'),
        },
        {
            id: 'nand',
            resolve: (ctx, args) => resolveLogic(ctx, args, registry, 'nand'),
        },
        {
            id: 'nor',
            resolve: (ctx, args) => resolveLogic(ctx, args, registry, 'nor'),
        },
        {
            id: 'not',
            resolve: (ctx, args) => resolveLogic(ctx, args, registry, 'not'),
        },
    ];
}
