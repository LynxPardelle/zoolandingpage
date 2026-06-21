import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ContentHubClientService } from '@/app/shared/services/content-hub-client.service';
import { buildContentHubRuntimeInput } from '@/app/shared/services/content-hub-runtime-request';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import type { TRuntimeApiActionConfig } from '@/app/shared/types/config-payloads.types';
import { inject } from '@angular/core';
import type { EventExecutionContext, EventHandler } from '../event-handler.types';

type TProxyActionStatusState = 'loading' | 'success' | 'error';

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'API proxy action failed.';

const statusTargetFor = (action: TRuntimeApiActionConfig): string =>
    action.statusTarget || `remoteStatus.${ action.id }`;

const writeStatus = (
    variables: VariableStoreService,
    action: TRuntimeApiActionConfig,
    state: TProxyActionStatusState,
    error: string | null,
    data?: unknown,
): void => {
    variables.setRuntimeValue(statusTargetFor(action), {
        state,
        updatedAt: state === 'loading' ? null : new Date().toISOString(),
        error,
        ...(state === 'success' ? { data } : {}),
    });
};

const pickActionInput = (
    action: TRuntimeApiActionConfig,
    eventData: Record<string, unknown>,
): Record<string, unknown> | undefined => {
    const fields = action.inputFields ?? [];
    if (!fields.length) return undefined;

    return fields.reduce<Record<string, unknown>>((input, field) => {
        if (field in eventData) {
            input[field] = eventData[field];
        }
        return input;
    }, {});
};

const resolveActionInput = (
    action: TRuntimeApiActionConfig,
    eventData: Record<string, unknown>,
): Record<string, unknown> | undefined => {
    const input = pickActionInput(action, eventData);
    if (action.kind !== 'content-hub') {
        return input;
    }

    return buildContentHubRuntimeInput(action.contentHub, input, action.inputFields ?? []);
};

export const proxyActionHandler = (): EventHandler => {
    const configStore = inject(ConfigStoreService);
    const contentHub = inject(ContentHubClientService);
    const proxy = inject(RuntimeApiProxyClientService);
    const variables = inject(VariableStoreService);

    return {
        id: 'proxyAction',
        handle: async (ctx: EventExecutionContext, args: unknown[]) => {
            const actionId = String(args?.[0] ?? '').trim();
            if (!actionId) return;

            const siteConfig = configStore.siteConfig();
            const action = siteConfig?.runtime?.apiActions?.find((candidate) =>
                candidate.id === actionId && candidate.enabled !== false,
            );
            const domain = siteConfig?.domain;
            if (!action || !domain) return;

            const pageId = configStore.pageConfig()?.pageId;
            const proxyActionId = String(action.proxyActionId || action.id).trim();
            if (!proxyActionId) return;

            writeStatus(variables, action, 'loading', null);

            try {
                const client = action.kind === 'content-hub' ? contentHub : proxy;
                const response = await client.executeAction({
                    domain,
                    pageId,
                    actionId: proxyActionId,
                    input: resolveActionInput(action, asRecord(ctx.event.eventData)),
                });
                writeStatus(variables, action, 'success', null, response.data);
            } catch (error) {
                writeStatus(variables, action, 'error', errorMessage(error));
            }
        },
    };
};
