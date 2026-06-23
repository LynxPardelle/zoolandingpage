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

const SAFE_RESPONSE_REFERENCE_PATHS: Record<string, readonly string[]> = {
    articleId: ['articleId', 'article.articleId', 'createdArticle.articleId', 'created.articleId', 'result.articleId'],
    revisionId: ['revisionId', 'revision.revisionId', 'createdRevision.revisionId', 'created.revisionId', 'result.revisionId'],
    latestRevisionId: ['latestRevisionId', 'article.latestRevisionId', 'createdArticle.latestRevisionId', 'result.latestRevisionId'],
    assetId: ['assetId', 'asset.assetId', 'createdAsset.assetId', 'result.assetId'],
    path: ['path', 'article.path', 'createdArticle.path', 'result.path'],
    status: ['status', 'article.status', 'createdArticle.status', 'result.status'],
};

const resolvePath = (value: unknown, path: string): unknown => {
    let current = value;
    for (const segment of path.split('.').filter(Boolean)) {
        const record = asRecord(current);
        if (!(segment in record)) {
            return undefined;
        }
        current = record[segment];
    }
    return current;
};

const safeReferenceValue = (value: unknown): string | number | boolean | undefined => {
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    return undefined;
};

const responseReferences = (data: unknown): Record<string, string | number | boolean> => {
    const references: Record<string, string | number | boolean> = {};

    Object.entries(SAFE_RESPONSE_REFERENCE_PATHS).forEach(([target, paths]) => {
        for (const path of paths) {
            const value = safeReferenceValue(resolvePath(data, path));
            if (value !== undefined) {
                references[target] = value;
                break;
            }
        }
    });

    return references;
};

const writeStatus = (
    variables: VariableStoreService,
    action: TRuntimeApiActionConfig,
    state: TProxyActionStatusState,
    error: string | null,
    data?: unknown,
): void => {
    const references = state === 'success' ? responseReferences(data) : {};
    variables.setRuntimeValue(statusTargetFor(action), {
        state,
        updatedAt: state === 'loading' ? null : new Date().toISOString(),
        error,
        ...(state === 'success' ? { data } : {}),
        ...references,
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
