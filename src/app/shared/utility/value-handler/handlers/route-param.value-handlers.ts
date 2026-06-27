import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot } from '@angular/router';
import type { ValueHandler } from '../value-handler.types';

export const readRouteParamFromSnapshot = (
    snapshot: Pick<ActivatedRouteSnapshot, 'children' | 'paramMap' | 'params'> | undefined,
    key: unknown,
): string | undefined => {
    const normalizedKey = String(key ?? '').trim();
    if (!snapshot || !normalizedKey) {
        return undefined;
    }

    let found: string | undefined;
    const visit = (node: Pick<ActivatedRouteSnapshot, 'children' | 'paramMap' | 'params'>): void => {
        const rawValue = typeof node.paramMap?.get === 'function'
            ? node.paramMap.get(normalizedKey)
            : (node.params as Record<string, unknown> | undefined)?.[normalizedKey];
        const value = String(rawValue ?? '').trim();
        if (value) {
            found = value;
        }

        for (const child of node.children ?? []) {
            visit(child);
        }
    };

    visit(snapshot);
    return found;
};

export const routeParamValueHandler = (): ValueHandler => {
    const router = inject(Router);
    return {
        id: 'routeParam',
        resolve: (_ctx, args) => readRouteParamFromSnapshot(router.routerState.snapshot.root, args?.[0]),
    };
};

export const routeParamOrValueHandler = (): ValueHandler => {
    const router = inject(Router);
    return {
        id: 'routeParamOr',
        resolve: (_ctx, args) =>
            readRouteParamFromSnapshot(router.routerState.snapshot.root, args?.[0]) ?? args?.[1] ?? '',
    };
};
