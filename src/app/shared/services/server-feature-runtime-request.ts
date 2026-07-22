const DATA_SPACE_READ_FIELDS: Readonly<Record<string, readonly string[]>> = {
    collectionList: ['limit', 'cursor'],
    collectionSchema: ['collectionId'],
    recordList: ['collectionId', 'limit', 'cursor'],
    recordDetail: ['collectionId', 'recordId'],
};
const DATA_SPACE_ACTION_FIELDS: Readonly<Record<string, readonly string[]>> = {
    createCollection: ['collectionId', 'schema'],
    updateCollection: ['collectionId', 'schema', 'expectedRevision'],
    createRecord: ['collectionId', 'recordId', 'data'],
    updateRecord: ['collectionId', 'recordId', 'data', 'expectedRevision'],
    publishRecord: ['collectionId', 'recordId', 'expectedRevision'],
    unpublishRecord: ['collectionId', 'recordId', 'expectedRevision'],
};
const COMMERCE_READ_FIELDS: Readonly<Record<string, readonly string[]>> = {
    itemList: ['limit', 'cursor'],
    itemDetail: ['resourceId'],
    offerList: ['limit', 'cursor'],
    offerDetail: ['resourceId'],
    discountList: ['limit', 'cursor'],
    discountDetail: ['resourceId'],
};
const COMMERCE_PUBLIC_READ_FIELDS: Readonly<Record<string, readonly string[]>> = {
    offerList: ['limit', 'cursor'],
    offerDetail: ['offerVersionId'],
};
const COMMERCE_ACTION_FIELDS: Readonly<Record<string, readonly string[]>> = {
    createItem: ['itemId', 'sellableType', 'variants', 'dataSpaceReference'],
    createOfferVersion: [
        'versionId', 'catalogItemId', 'revision', 'sellableType', 'unitPrice', 'taxBehavior',
        'variantId', 'recurrence', 'displayName', 'displayDescription',
    ],
    createDiscountVersion: [
        'versionId', 'revision', 'duration', 'percentageBasisPoints', 'fixedAmount',
        'durationInMonths', 'eligibleOfferVersionIds', 'redemptionLimit', 'redeemByEpoch',
        'customerFacingCode', 'displayName', 'displayDescription',
    ],
    advanceOfferLifecycle: ['versionId', 'targetState', 'expectedRevision'],
    updateOfferPresentation: ['versionId', 'expectedRevision', 'displayName', 'displayDescription'],
    advanceDiscountLifecycle: ['versionId', 'targetState', 'expectedRevision'],
    updateDiscountPresentation: ['versionId', 'expectedRevision', 'displayName', 'displayDescription'],
    adjustStock: ['stockId', 'delta', 'expectedRevision'],
    changePlan: ['subscriptionId', 'targetOfferVersionId', 'expectedRevision'],
    applyDiscount: ['subscriptionId', 'discountVersionId', 'expectedRevision'],
    removeDiscount: ['subscriptionId', 'expectedRevision'],
    pause: ['subscriptionId', 'expectedRevision'],
    resume: ['subscriptionId', 'expectedRevision'],
    openPortal: ['subscriptionId'],
    migrationPreview: ['sourceOfferVersionId', 'targetOfferVersionId'],
    migrationExecute: ['commercialRequestId', 'dryRunRevision', 'dryRunHash', 'confirmation'],
    migrationPause: ['commercialRequestId', 'expectedRevision'],
    migrationResume: ['commercialRequestId', 'expectedRevision'],
    migrationCancel: ['commercialRequestId', 'expectedRevision'],
    migrationStatus: ['commercialRequestId', 'limit', 'cursor'],
    admitCheckout: ['lines', 'discountVersionId'],
};
const INTEGRATION_ACTION_FIELDS: Readonly<Record<string, readonly string[]>> = {
    disable: ['connectionId', 'expectedRevision'],
    requestReconnect: ['connectionId', 'expectedRevision'],
    stripeOnboardingStart: [],
    stripeOnboardingReturn: ['state', 'code', 'error'],
    stripeOnboardingDeauthorize: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const isServerFeatureSafeId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value);

const selectFields = (input: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> =>
    fields.reduce<Record<string, unknown>>((result, field) => {
        if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
            result[field] = input[field];
        }
        return result;
    }, {});

const exactObject = (value: unknown, fields: readonly string[]): Record<string, unknown> | undefined =>
    isRecord(value) ? selectFields(value, fields) : undefined;

const normalizeCommerceNestedInput = (operation: string, selected: Record<string, unknown>): Record<string, unknown> => {
    if (operation === 'createItem') {
        if (Array.isArray(selected['variants'])) {
            selected['variants'] = selected['variants'].map((value) => exactObject(value, ['variantId', 'sku']) ?? {});
        }
        if (selected['dataSpaceReference'] !== undefined) {
            selected['dataSpaceReference'] = exactObject(
                selected['dataSpaceReference'],
                ['spaceId', 'collectionId', 'recordId', 'revision', 'fieldIds'],
            ) ?? {};
        }
    }
    if (operation === 'createOfferVersion') {
        if (selected['unitPrice'] !== undefined) selected['unitPrice'] = exactObject(selected['unitPrice'], ['amountMinor', 'currency']) ?? {};
        if (selected['recurrence'] !== undefined) selected['recurrence'] = exactObject(selected['recurrence'], ['interval', 'intervalCount']) ?? {};
    }
    if (operation === 'createDiscountVersion' && selected['fixedAmount'] !== undefined) {
        selected['fixedAmount'] = exactObject(selected['fixedAmount'], ['amountMinor', 'currency']) ?? {};
    }
    if (operation === 'admitCheckout' && Array.isArray(selected['lines'])) {
        selected['lines'] = selected['lines'].map((value) => exactObject(value, ['offerVersionId', 'quantity']) ?? {});
    }
    return selected;
};

export const buildDataSpaceRuntimeInput = (
    binding: unknown,
    input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
    if (!isRecord(binding) || !isServerFeatureSafeId(binding['spaceId'])) return undefined;
    if ('read' in binding) {
        const read = cleanText(binding['read']);
        const access = binding['access'] === 'public' ? 'public' : binding['access'] === 'protected' || binding['access'] === undefined ? 'protected' : '';
        if (!access || !DATA_SPACE_READ_FIELDS[read] || (access === 'public' && !['recordList', 'recordDetail'].includes(read))) return undefined;
        return {
            dataSpace: { read, spaceId: binding['spaceId'], access },
            ...selectFields(isRecord(input) ? input : {}, DATA_SPACE_READ_FIELDS[read]),
        };
    }
    const action = cleanText(binding['action']);
    if (!action || !DATA_SPACE_ACTION_FIELDS[action]) return undefined;
    return {
        dataSpace: { action, spaceId: binding['spaceId'] },
        ...selectFields(isRecord(input) ? input : {}, DATA_SPACE_ACTION_FIELDS[action]),
    };
};

export const buildCommerceRuntimeInput = (
    binding: unknown,
    input: Record<string, unknown> | undefined,
    mode: 'read' | 'action' = 'read',
): Record<string, unknown> | undefined => {
    if (!isRecord(binding)) return undefined;
    if (mode === 'read') {
        if (!('read' in binding)) return undefined;
        const read = cleanText(binding['read']);
        const access = binding['access'] === 'public' ? 'public' : binding['access'] === 'protected' || binding['access'] === undefined ? 'protected' : '';
        const fields = access === 'public' ? COMMERCE_PUBLIC_READ_FIELDS[read] : COMMERCE_READ_FIELDS[read];
        if (!access || !fields) return undefined;
        return { commerce: { read, access }, ...selectFields(isRecord(input) ? input : {}, fields) };
    }
    if (!('action' in binding)) return undefined;
    const action = cleanText(binding['action']);
    const fields = COMMERCE_ACTION_FIELDS[action];
    if (!fields) return undefined;
    return {
        commerce: { action },
        ...normalizeCommerceNestedInput(action, selectFields(isRecord(input) ? input : {}, fields)),
    };
};

export const buildIntegrationPlatformRuntimeInput = (
    binding: unknown,
    input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
    if (!isRecord(binding)) return undefined;
    if ('read' in binding) {
        const read = cleanText(binding['read']);
        return read === 'connectionList' ? { integrations: { read } } : undefined;
    }
    const action = cleanText(binding['action']);
    const fields = INTEGRATION_ACTION_FIELDS[action];
    if (!fields) return undefined;
    const onboarding = action.startsWith('stripeOnboarding');
    const bindingId = cleanText(binding['bindingId']);
    if (onboarding && !isServerFeatureSafeId(bindingId)) return undefined;
    return {
        integrations: { action },
        ...(onboarding ? { bindingId } : {}),
        ...selectFields(isRecord(input) ? input : {}, fields),
    };
};

export const serverFeatureRecord = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
