import type {
    TContentHubRuntimeActionBinding,
    TContentHubRuntimeReadBinding,
} from '@/app/shared/types/content-hub.types';

export const CONTENT_HUB_FORBIDDEN_PUBLIC_INPUT_KEYS = new Set([
    'access',
    'accesstoken',
    'auth',
    'authorization',
    'authorizer',
    'authorizerpolicy',
    'awsaccesskeyid',
    'awssecretaccesskey',
    'bucket',
    'bucketname',
    'clientsecret',
    'credentialref',
    'credentials',
    'groups',
    'groupstoroles',
    'idtoken',
    'jwks',
    'lambdaarn',
    'partitionkey',
    'policy',
    'refreshtoken',
    'secret',
    'secretarn',
    'secretref',
    'serverpolicy',
    'signedurl',
    'signedurlpolicy',
    'table',
    'tablename',
    'tenant',
    'tenantid',
    'token',
    'xamzcredential',
    'xamzsecuritytoken',
    'xamzsignature',
    'upstream',
    'upstreamurl',
]);

const CONTENT_HUB_FORBIDDEN_PUBLIC_INPUT_VALUE_PATTERN =
    /(?:ssm:\/|secretsmanager:\/|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|AWSAccessKeyId=|Signature=|Expires=)/i;

export const CONTENT_HUB_SAFE_READ_INPUT_KEYS = new Set([
    'articleId',
    'assetId',
    'category',
    'categoryId',
    'categorySlug',
    'commentId',
    'direction',
    'from',
    'language',
    'limit',
    'locale',
    'moderationStatus',
    'offset',
    'page',
    'pageSize',
    'query',
    'renderDomain',
    'revisionId',
    'scheduleId',
    'search',
    'slug',
    'sort',
    'status',
    'tag',
    'tagId',
    'tagSlug',
    'taxonomyId',
    'taxonomyKind',
    'to',
    'visibility',
]);

export const CONTENT_HUB_SAFE_ID_INPUT_KEYS = new Set([
    'articleId',
    'assetId',
    'categoryId',
    'categorySlug',
    'commentId',
    'latestRevisionId',
    'revisionId',
    'scheduleId',
    'slug',
    'tagId',
    'tagSlug',
    'taxonomyId',
]);

const CONTENT_HUB_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

const CONTENT_HUB_BINDING_KEYS = new Set([
    'action',
    'articleId',
    'assetId',
    'commentId',
    'hubId',
    'language',
    'read',
    'revisionId',
    'scheduleId',
    'taxonomyId',
    'taxonomyKind',
]);

export const isForbiddenContentHubPublicInputKey = (key: string): boolean =>
    CONTENT_HUB_FORBIDDEN_PUBLIC_INPUT_KEYS.has(String(key ?? '').replace(/[-_\s]/g, '').toLowerCase());

export const isForbiddenContentHubPublicInputValue = (value: unknown): boolean =>
    typeof value === 'string' && CONTENT_HUB_FORBIDDEN_PUBLIC_INPUT_VALUE_PATTERN.test(value);

export const isContentHubSafePublicId = (value: unknown): value is string =>
    typeof value === 'string' && CONTENT_HUB_SAFE_ID_PATTERN.test(value.trim());

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isBrowserFile = (value: unknown): value is File =>
    typeof File !== 'undefined' && value instanceof File;

const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue).filter((entry) => entry !== undefined);
    }

    if (isBrowserFile(value)) {
        return value;
    }

    if (!isRecord(value)) {
        if (isForbiddenContentHubPublicInputValue(value)) {
            return undefined;
        }
        return value;
    }

    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
        if (isForbiddenContentHubPublicInputKey(key)) {
            return acc;
        }
        const sanitized = sanitizeValue(entry);
        if (sanitized !== undefined) {
            acc[key] = sanitized;
        }
        return acc;
    }, {});
};

export const sanitizeContentHubRuntimeInput = (
    input: Record<string, unknown> | undefined,
    allowedKeys: ReadonlySet<string> | readonly string[] = CONTENT_HUB_SAFE_READ_INPUT_KEYS,
): Record<string, unknown> | undefined => {
    if (!input) return undefined;
    const allowlist = new Set(Array.isArray(allowedKeys) ? allowedKeys : Array.from(allowedKeys));

    const sanitized = Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (!allowlist.has(key) || isForbiddenContentHubPublicInputKey(key)) {
            return acc;
        }
        const safeValue = sanitizeValue(value);
        if (CONTENT_HUB_SAFE_ID_INPUT_KEYS.has(key) && !isContentHubSafePublicId(safeValue)) {
            return acc;
        }
        if (safeValue !== undefined) {
            acc[key] = safeValue;
        }
        return acc;
    }, {});

    return Object.keys(sanitized).length ? sanitized : undefined;
};

export const sanitizeContentHubRuntimeBinding = (
    binding: TContentHubRuntimeReadBinding | TContentHubRuntimeActionBinding | undefined,
): Record<string, unknown> | undefined => {
    if (!binding || !isRecord(binding)) return undefined;

    const sanitized = Object.entries(binding).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (!CONTENT_HUB_BINDING_KEYS.has(key) || isForbiddenContentHubPublicInputKey(key)) {
            return acc;
        }
        const safeValue = sanitizeValue(value);
        if (safeValue !== undefined) {
            acc[key] = safeValue;
        }
        return acc;
    }, {});

    return Object.keys(sanitized).length ? sanitized : undefined;
};

export const buildContentHubRuntimeInput = (
    binding: TContentHubRuntimeReadBinding | TContentHubRuntimeActionBinding | undefined,
    input: Record<string, unknown> | undefined,
    allowedInputKeys?: ReadonlySet<string> | readonly string[],
): Record<string, unknown> | undefined => {
    const contentHub = sanitizeContentHubRuntimeBinding(binding);
    const safeInput = sanitizeContentHubRuntimeInput(input, allowedInputKeys);
    if (!contentHub && !safeInput) return undefined;

    return {
        ...(contentHub ? { contentHub } : {}),
        ...(safeInput ?? {}),
    };
};
