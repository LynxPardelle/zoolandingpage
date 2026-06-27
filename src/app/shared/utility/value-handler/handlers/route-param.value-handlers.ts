import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot } from '@angular/router';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
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

export const readRouteParamFromRecord = (
    params: Readonly<Record<string, string>> | undefined,
    key: unknown,
): string | undefined => {
    const normalizedKey = String(key ?? '').trim();
    if (!params || !normalizedKey) {
        return undefined;
    }

    const value = String(params[normalizedKey] ?? '').trim();
    return value || undefined;
};

export const routeParamValueHandler = (): ValueHandler => {
    const router = inject(Router);
    const draftRuntime = inject(DraftRuntimeService, { optional: true });
    return {
        id: 'routeParam',
        resolve: (_ctx, args) =>
            readRouteParamFromSnapshot(router.routerState.snapshot.root, args?.[0])
            ?? readRouteParamFromRecord(draftRuntime?.resolvedDraftRouteParams(), args?.[0]),
    };
};

export const routeParamOrValueHandler = (): ValueHandler => {
    const router = inject(Router);
    const draftRuntime = inject(DraftRuntimeService, { optional: true });
    return {
        id: 'routeParamOr',
        resolve: (_ctx, args) =>
            readRouteParamFromSnapshot(router.routerState.snapshot.root, args?.[0])
            ?? readRouteParamFromRecord(draftRuntime?.resolvedDraftRouteParams(), args?.[0])
            ?? args?.[1]
            ?? '',
    };
};
