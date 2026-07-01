import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ContentHubClientService } from '@/app/shared/services/content-hub-client.service';
import { buildContentHubRuntimeInput, CONTENT_HUB_SAFE_ID_INPUT_KEYS, isContentHubSafePublicId } from '@/app/shared/services/content-hub-runtime-request';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import type { TRuntimeApiActionConfig } from '@/app/shared/types/config-payloads.types';
import { inject } from '@angular/core';
import { findInteractionScopeHost } from '../../../components/interaction-scope/interaction-scope.service';
import type { EventExecutionContext, EventHandler } from '../event-handler.types';

type TProxyActionStatusState = 'loading' | 'success' | 'error';

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'API proxy action failed.';

const errorRequestId = (error: unknown): string => {
    const value = asRecord(error)['requestId'];
    return typeof value === 'string' && /^req-[A-Za-z0-9._:-]{1,120}$/.test(value)
        ? value
        : '';
};

const statusTargetFor = (action: TRuntimeApiActionConfig): string =>
    action.statusTarget || `remoteStatus.${ action.id }`;

const userGestureError = 'This action requires a direct user action.';
const safeContentHubIdError = 'Select a valid content item before continuing.';
const REQUIRED_CONTENT_HUB_ACTION_IDS: Record<string, readonly string[]> = {
    updatePackage: ['articleId'],
    uploadAsset: ['articleId'],
    validate: ['articleId'],
    submitReview: ['articleId', 'revisionId'],
    approveArticle: ['articleId', 'revisionId'],
    publish: ['articleId', 'revisionId'],
    unpublishArticle: ['articleId'],
    archiveArticle: ['articleId'],
    schedule: ['articleId'],
    cancelSchedule: ['scheduleId'],
    moderateComment: ['commentId'],
    queueComment: ['articleId'],
    recordInteraction: ['articleId'],
    restoreRevision: ['articleId', 'revisionId'],
};

const SAFE_RESPONSE_REFERENCE_PATHS: Record<string, readonly string[]> = {
    articleId: ['articleId', 'article.articleId', 'createdArticle.articleId', 'created.articleId', 'result.articleId'],
    revisionId: ['revisionId', 'revision.revisionId', 'article.latestRevisionId', 'createdArticle.latestRevisionId', 'createdRevision.revisionId', 'created.revisionId', 'result.revisionId', 'result.latestRevisionId'],
    latestRevisionId: ['latestRevisionId', 'article.latestRevisionId', 'createdArticle.latestRevisionId', 'result.latestRevisionId'],
    assetId: ['assetId', 'asset.assetId', 'createdAsset.assetId', 'result.assetId'],
    fileName: ['fileName', 'asset.fileName', 'createdAsset.fileName', 'result.fileName'],
    taxonomyId: ['taxonomyId', 'taxonomy.taxonomyId', 'result.taxonomyId'],
    commentId: ['commentId', 'comment.commentId', 'result.commentId'],
    interactionId: ['interactionId', 'interaction.interactionId', 'result.interactionId'],
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
    requestId = '',
): void => {
    const references = state === 'success' ? responseReferences(data) : {};
    variables.setRuntimeValue(statusTargetFor(action), {
        state,
        updatedAt: state === 'loading' ? null : new Date().toISOString(),
        error,
        ...(state === 'error' && requestId ? { requestId } : {}),
        ...(state === 'success' ? { data } : {}),
        ...references,
    });
};

const pickActionInput = (
    action: TRuntimeApiActionConfig,
    eventData: Record<string, unknown>,
    ctx: EventExecutionContext,
): Record<string, unknown> | undefined => {
    const fields = action.inputFields ?? [];
    if (!fields.length) return undefined;
    const rowData = asRecord(eventData['rowData']);
    const scopeHost = findInteractionScopeHost(ctx.host);
    const scopeSnapshot = scopeHost?.submitInteractionScope?.() ?? scopeHost?.interactionScope.submit();
    const scopeValues = asRecord(scopeSnapshot?.values);
    const merged = {
        ...scopeValues,
        ...rowData,
        ...eventData,
    };

    return fields.reduce<Record<string, unknown>>((input, field) => {
        if (field in merged) {
            input[field] = merged[field];
        }
        return input;
    }, {});
};

const resolveActionInput = (
    action: TRuntimeApiActionConfig,
    input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
    if (action.kind !== 'content-hub') {
        return input;
    }

    return buildContentHubRuntimeInput(action.contentHub, input, action.inputFields ?? []);
};

const hasSafeContentHubActionIds = (
    action: TRuntimeApiActionConfig,
    rawInput: Record<string, unknown> | undefined,
): boolean => {
    if (action.kind !== 'content-hub') {
        return true;
    }

    const requiredFields = new Set(REQUIRED_CONTENT_HUB_ACTION_IDS[String(action.contentHub?.action ?? '')] ?? []);

    return (action.inputFields ?? [])
        .map((field) => String(field ?? '').trim())
        .filter((field) => CONTENT_HUB_SAFE_ID_INPUT_KEYS.has(field))
        .every((field) => {
            if (!rawInput || !Object.prototype.hasOwnProperty.call(rawInput, field)) {
                return !requiredFields.has(field);
            }

            const value = rawInput[field];
            if (value == null) {
                return !requiredFields.has(field);
            }

            const normalized = String(value).trim().toLowerCase();
            if (!normalized || normalized === 'undefined' || normalized === 'null') {
                return !requiredFields.has(field);
            }

            return isContentHubSafePublicId(value);
        });
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

            if (action.requiresUserGesture === true && ctx.event.userGesture !== true) {
                writeStatus(variables, action, 'error', userGestureError);
                return;
            }

            try {
                const rawInput = pickActionInput(action, asRecord(ctx.event.eventData), ctx);
                if (!hasSafeContentHubActionIds(action, rawInput)) {
                    writeStatus(variables, action, 'error', safeContentHubIdError);
                    return;
                }
                const input = resolveActionInput(action, rawInput);

                writeStatus(variables, action, 'loading', null);
                const client = action.kind === 'content-hub' ? contentHub : proxy;
                const response = await client.executeAction({
                    domain,
                    pageId,
                    actionId: proxyActionId,
                    input,
                });
                writeStatus(variables, action, 'success', null, response.data);
            } catch (error) {
                writeStatus(variables, action, 'error', errorMessage(error), undefined, errorRequestId(error));
            }
        },
    };
};
