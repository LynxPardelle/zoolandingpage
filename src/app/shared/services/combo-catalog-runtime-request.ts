import type {
    TComboCatalogRuntimeActionBinding,
    TComboCatalogRuntimeReadBinding,
} from '@/app/shared/types/combo-catalog.types';

const COMBO_CATALOG_FORBIDDEN_PUBLIC_INPUT_KEYS = new Set([
    'access',
    'accesstoken',
    'auth',
    'authorization',
    'authorizer',
    'awsaccesskeyid',
    'awssecretaccesskey',
    'clientsecret',
    'credentialref',
    'credentials',
    'idtoken',
    'jwks',
    'lambdaarn',
    'partitionkey',
    'policyarn',
    'refreshtoken',
    'secret',
    'secretarn',
    'secretref',
    'signedurl',
    'table',
    'tablename',
    'tenant',
    'tenantid',
    'token',
    'xamzcredential',
    'xamzsecuritytoken',
    'xamzsignature',
]);

const FORBIDDEN_PUBLIC_INPUT_VALUE_PATTERN =
    /(?:ssm:\/|secretsmanager:\/|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|AWSAccessKeyId=|Signature=|Expires=)/i;

const COMBO_CATALOG_SAFE_READ_INPUT_KEYS = new Set([
    'category',
    'comboId',
    'component',
    'draftDomain',
    'feature',
    'group',
    'groupId',
    'limit',
    'offset',
    'page',
    'pageSize',
    'query',
    'scope',
]);

const COMBO_CATALOG_SAFE_ACTION_INPUT_KEYS = new Set([
    ...COMBO_CATALOG_SAFE_READ_INPUT_KEYS,
    'allowedCombos',
    'allowedComponents',
    'allowedFeatures',
    'allowedGroups',
    'batchJson',
    'categories',
    'classes',
    'combo',
    'comboId',
    'comboIds',
    'combos',
    'defaultAccess',
    'deniedCombos',
    'deniedComponents',
    'deniedFeatures',
    'deniedGroups',
    'description',
    'features',
    'group',
    'groupId',
    'groups',
    'label',
    'theme',
    'updatedAt',
]);

const COMBO_CATALOG_BINDING_KEYS = new Set(['action', 'read']);
const COMBO_CATALOG_SAFE_ID_KEYS = new Set(['comboId', 'groupId', 'scope']);
const COMBO_CATALOG_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const COMBO_CATALOG_PLACEHOLDER_ID_VALUES = new Set(['null', 'undefined', 'unknown']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isForbiddenComboCatalogPublicInputKey = (key: string): boolean =>
    COMBO_CATALOG_FORBIDDEN_PUBLIC_INPUT_KEYS.has(String(key ?? '').replace(/[-_\s]/g, '').toLowerCase());

const isForbiddenComboCatalogPublicInputValue = (value: unknown): boolean =>
    typeof value === 'string' && FORBIDDEN_PUBLIC_INPUT_VALUE_PATTERN.test(value);

const isComboCatalogSafePublicId = (value: unknown): boolean =>
    typeof value === 'string'
    && COMBO_CATALOG_SAFE_ID_PATTERN.test(value.trim())
    && !COMBO_CATALOG_PLACEHOLDER_ID_VALUES.has(value.trim().toLowerCase());

const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue).filter((entry) => entry !== undefined);
    }

    if (!isRecord(value)) {
        return isForbiddenComboCatalogPublicInputValue(value) ? undefined : value;
    }

    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
        if (isForbiddenComboCatalogPublicInputKey(key)) {
            return acc;
        }
        const sanitized = sanitizeValue(entry);
        if (sanitized !== undefined) {
            acc[key] = sanitized;
        }
        return acc;
    }, {});
};

const sanitizeBinding = (
    binding: TComboCatalogRuntimeReadBinding | TComboCatalogRuntimeActionBinding | undefined,
): Record<string, unknown> | undefined => {
    if (!binding || !isRecord(binding)) return undefined;

    const sanitized = Object.entries(binding).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (!COMBO_CATALOG_BINDING_KEYS.has(key) || isForbiddenComboCatalogPublicInputKey(key)) {
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

const sanitizeInput = (
    input: Record<string, unknown> | undefined,
    allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | undefined => {
    if (!input) return undefined;

    const sanitized = Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (!allowedKeys.has(key) || isForbiddenComboCatalogPublicInputKey(key)) {
            return acc;
        }
        const safeValue = sanitizeValue(value);
        if (COMBO_CATALOG_SAFE_ID_KEYS.has(key) && safeValue != null && safeValue !== '' && !isComboCatalogSafePublicId(safeValue)) {
            return acc;
        }
        if (safeValue !== undefined) {
            acc[key] = safeValue;
        }
        return acc;
    }, {});

    return Object.keys(sanitized).length ? sanitized : undefined;
};

export const buildComboCatalogRuntimeInput = (
    binding: TComboCatalogRuntimeReadBinding | TComboCatalogRuntimeActionBinding | undefined,
    input: Record<string, unknown> | undefined,
    mode: 'read' | 'action' = 'read',
): Record<string, unknown> | undefined => {
    const comboCatalog = sanitizeBinding(binding);
    const safeInput = sanitizeInput(
        input,
        mode === 'action' ? COMBO_CATALOG_SAFE_ACTION_INPUT_KEYS : COMBO_CATALOG_SAFE_READ_INPUT_KEYS,
    );
    if (!comboCatalog && !safeInput) return undefined;

    return {
        ...(comboCatalog ?? {}),
        ...(safeInput ?? {}),
    };
};
