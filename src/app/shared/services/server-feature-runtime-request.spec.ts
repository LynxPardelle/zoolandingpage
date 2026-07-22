import {
    buildCommerceRuntimeInput,
    buildDataSpaceRuntimeInput,
    buildIntegrationPlatformRuntimeInput,
} from './server-feature-runtime-request';

describe('server feature runtime request builders', () => {
    it('keeps generic Data Spaces record data without silently rewriting nested fields', () => {
        expect(buildDataSpaceRuntimeInput(
            { action: 'createRecord', spaceId: 'catalog-content' },
            {
                collectionId: 'products',
                recordId: 'product-basic',
                data: {
                    title: 'Basic plan',
                    priceLabel: '$900 MXN',
                    operationalNote: 'Expires=tomorrow is ordinary content.',
                    domain: 'customer-facing.example',
                    environment: 'seasonal',
                    nested: {
                        access: 'members', role: 'editor', policy: 'reviewed', groups: ['preferred'],
                        account: 'customer-label', provider: 'shipping-label', tenant: 'display-label', visible: true,
                    },
                },
                accessToken: 'must-not-travel',
            },
        )).toEqual({
            dataSpace: { action: 'createRecord', spaceId: 'catalog-content' },
            collectionId: 'products',
            recordId: 'product-basic',
            data: {
                title: 'Basic plan',
                priceLabel: '$900 MXN',
                operationalNote: 'Expires=tomorrow is ordinary content.',
                domain: 'customer-facing.example',
                environment: 'seasonal',
                nested: {
                    access: 'members', role: 'editor', policy: 'reviewed', groups: ['preferred'],
                    account: 'customer-label', provider: 'shipping-label', tenant: 'display-label', visible: true,
                },
            },
        });
    });

    it('keeps only server-supported public Checkout inputs', () => {
        expect(buildCommerceRuntimeInput(
            { action: 'admitCheckout' },
            {
                lines: [{
                    offerVersionId: 'offer-basic-v1',
                    quantity: 1,
                    unitPrice: 1,
                    providerAccountId: 'acct-must-not-travel',
                }],
                discountVersionId: 'discount-launch-v1',
                amountMinor: 1,
                currency: 'MXN',
                tenantId: 'tenant-must-not-travel',
                providerAccountId: 'acct-must-not-travel',
            },
            'action',
        )).toEqual({
            commerce: { action: 'admitCheckout' },
            lines: [{ offerVersionId: 'offer-basic-v1', quantity: 1 }],
            discountVersionId: 'discount-launch-v1',
        });
    });

    it('keeps only configured Integrations onboarding return fields', () => {
        expect(buildIntegrationPlatformRuntimeInput(
            { action: 'stripeOnboardingReturn', bindingId: 'stripe-main' },
            {
                bindingId: 'attacker-overrides-binding',
                state: 'opaque-state',
                code: 'opaque-code',
                returnUrl: 'https://evil.example.test',
                stripeAccountId: 'acct-must-not-travel',
                clientSecret: 'must-not-travel',
            },
        )).toEqual({
            integrations: { action: 'stripeOnboardingReturn' },
            bindingId: 'stripe-main',
            state: 'opaque-state',
            code: 'opaque-code',
        });
    });

    it('uses exact per-operation top-level allowlists for protected Data Spaces and Commerce inputs', () => {
        expect(buildDataSpaceRuntimeInput(
            { action: 'updateRecord', spaceId: 'catalog' },
            {
                collectionId: 'products',
                recordId: 'basic',
                data: { title: 'Basic', providerAccountId: 'generic-record-field' },
                expectedRevision: 2,
                limit: 99,
            },
        )).toEqual({
            dataSpace: { action: 'updateRecord', spaceId: 'catalog' },
            collectionId: 'products', recordId: 'basic',
            data: { title: 'Basic', providerAccountId: 'generic-record-field' },
            expectedRevision: 2,
        });
        expect(buildCommerceRuntimeInput(
            { action: 'adjustStock' },
            { stockId: 'stock-basic', delta: 2, expectedRevision: 3, amountMinor: 1 },
            'action',
        )).toEqual({
            commerce: { action: 'adjustStock' },
            stockId: 'stock-basic',
            delta: 2,
            expectedRevision: 3,
        });
    });

    it('rejects unknown operations and invalid public read combinations', () => {
        expect(buildDataSpaceRuntimeInput(
            { read: 'collectionList', spaceId: 'catalog', access: 'public' },
            {},
        )).toBeUndefined();
        expect(buildCommerceRuntimeInput({ action: 'not-real' } as any, {}, 'action')).toBeUndefined();
        expect(buildIntegrationPlatformRuntimeInput({ action: 'not-real' } as any, {})).toBeUndefined();
    });

    it('drops top-level scope overrides while leaving selected generic record content intact', () => {
        expect(buildDataSpaceRuntimeInput(
            { action: 'createRecord', spaceId: 'catalog' },
            {
                collectionId: 'products', recordId: 'basic',
                data: {
                    title: 'Basic',
                    authority: {
                        domain: 'customer-facing.example', environment: 'production',
                        provider: 'directory-label', account: 'content-value', accountId: 'record-account', role: 'admin',
                    },
                },
                domain: 'scope-override.example', environment: 'production', tenantId: 'scope-override',
                providerAccountId: 'scope-override', credentialRef: 'scope-override',
            },
        )).toEqual({
            dataSpace: { action: 'createRecord', spaceId: 'catalog' },
            collectionId: 'products', recordId: 'basic', data: {
                title: 'Basic',
                authority: { domain: 'customer-facing.example', environment: 'production', provider: 'directory-label', account: 'content-value', accountId: 'record-account', role: 'admin' },
            },
        });
    });
});
