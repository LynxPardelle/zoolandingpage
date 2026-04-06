import { findInteractionScope } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import type { ValueHandler } from '../value-handler.types';

export const scopeValueHandler = (): ValueHandler => ({
    id: 'scope',
    resolve: (ctx, args) => {
        const scope = findInteractionScope(ctx.host);
        if (!scope) return undefined;

        const path = String(args?.[0] ?? '').trim();
        return scope.resolvePath(path);
    },
});

export const scopeOrValueHandler = (): ValueHandler => ({
    id: 'scopeOr',
    resolve: (ctx, args) => {
        const scope = findInteractionScope(ctx.host);
        const path = String(args?.[0] ?? '').trim();
        const fallback = args?.[1];
        const value = scope?.resolvePath(path);
        return value == null ? (fallback ?? '') : value;
    },
});
