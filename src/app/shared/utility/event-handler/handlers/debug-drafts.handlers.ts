import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { inject, Injector } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

type TDebugWorkspaceHost = {
    readonly selectDebugDraft?: (key: string) => void;
    readonly refreshDebugDraftRegistry?: () => void;
    readonly toggleDebugDraftPanel?: () => void;
    readonly toggleDebugDiagnosticsPanel?: () => void;
};

const asDebugWorkspaceHost = (host: unknown): TDebugWorkspaceHost =>
    (host && typeof host === 'object') ? (host as TDebugWorkspaceHost) : {};

export const downloadDraftPayloadsHandler = (): EventHandler => {
    const injector = inject(Injector);

    return {
        id: 'downloadDraftPayloads',
        handle: () => {
            injector.get(ConfigurationsOrchestratorService).downloadDraftPayloads();
        },
    };
};

export const writeDraftsToDiskHandler = (): EventHandler => {
    const injector = inject(Injector);

    return {
        id: 'writeDraftsToDisk',
        handle: () => {
            void injector.get(ConfigurationsOrchestratorService).writeDraftPayloadsToDisk();
        },
    };
};

export const selectDebugDraftHandler = (): EventHandler => ({
    id: 'selectDebugDraft',
    handle: (ctx, args) => {
        const key = String(args?.[0] ?? '').trim();
        if (!key) return;
        asDebugWorkspaceHost(ctx.host).selectDebugDraft?.(key);
    },
});

export const refreshDebugDraftRegistryHandler = (): EventHandler => ({
    id: 'refreshDebugDraftRegistry',
    handle: (ctx) => {
        asDebugWorkspaceHost(ctx.host).refreshDebugDraftRegistry?.();
    },
});

export const toggleDebugDraftPanelHandler = (): EventHandler => ({
    id: 'toggleDebugDraftPanel',
    handle: (ctx) => {
        asDebugWorkspaceHost(ctx.host).toggleDebugDraftPanel?.();
    },
});

export const toggleDebugDiagnosticsPanelHandler = (): EventHandler => ({
    id: 'toggleDebugDiagnosticsPanel',
    handle: (ctx) => {
        asDebugWorkspaceHost(ctx.host).toggleDebugDiagnosticsPanel?.();
    },
});
