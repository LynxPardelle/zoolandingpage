import { findInteractionScopeHost } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import type { EventHandler } from '../event-handler.types';

export const setScopeValueHandler = (): EventHandler => ({
    id: 'setScopeValue',
    handle: (ctx, args) => {
        const host = findInteractionScopeHost(ctx.host);
        const fieldId = String(args?.[0] ?? '').trim();
        if (!host || !fieldId) return;
        host.interactionScope.setFieldValue(fieldId, args?.[1], { markTouched: true });
    },
});

export const resetScopeHandler = (): EventHandler => ({
    id: 'resetScope',
    handle: (ctx) => {
        const host = findInteractionScopeHost(ctx.host);
        if (!host) return;
        host.resetInteractionScope?.();
        if (!host.resetInteractionScope) {
            host.interactionScope.reset();
        }
    },
});

export const submitScopeHandler = (): EventHandler => ({
    id: 'submitScope',
    handle: (ctx) => {
        const host = findInteractionScopeHost(ctx.host);
        if (!host) return;
        host.submitInteractionScope?.();
        if (!host.submitInteractionScope) {
            host.interactionScope.submit();
        }
    },
});
