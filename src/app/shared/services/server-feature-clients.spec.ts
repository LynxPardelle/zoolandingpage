import { TestBed } from '@angular/core/testing';
import { CommerceClientService } from './commerce-client.service';
import { ConfigStoreService } from './config-store.service';
import { DataSpaceClientService } from './data-space-client.service';
import { IntegrationPlatformClientService } from './integration-platform-client.service';
import { LanguageService } from './language.service';
import { serverFeatureRequestUrl } from './server-feature-http';

describe('server feature clients', () => {
    let commerce: CommerceClientService;
    let dataSpaces: DataSpaceClientService;
    let integrations: IntegrationPlatformClientService;
    let fetchSpy: jasmine.Spy<typeof fetch>;

    beforeEach(() => {
        const language = jasmine.createSpyObj<LanguageService>('LanguageService', ['currentLanguage']);
        language.currentLanguage.and.returnValue('es');
        fetchSpy = spyOn(globalThis, 'fetch').and.callFake(() => Promise.resolve(new Response(JSON.stringify({
            ok: true,
            data: { items: [] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

        TestBed.configureTestingModule({
            providers: [
                CommerceClientService,
                ConfigStoreService,
                DataSpaceClientService,
                IntegrationPlatformClientService,
                { provide: LanguageService, useValue: language },
            ],
        });
        const configStore = TestBed.inject(ConfigStoreService);
        configStore.setSiteConfig({
            version: 1,
            domain: 'preview.example.test',
            routes: [],
            runtime: {
                auth: {
                    authProfileId: 'staff',
                    session: {
                        csrfCookieName: 'zlp_csrf',
                        csrfHeaderName: 'X-ZLP-CSRF',
                    },
                },
            },
            site: {},
        } as any);
        document.cookie = 'zlp_csrf=csrf-test; Path=/';
        commerce = TestBed.inject(CommerceClientService);
        dataSpaces = TestBed.inject(DataSpaceClientService);
        integrations = TestBed.inject(IntegrationPlatformClientService);
    });

    afterEach(() => {
        document.cookie = 'zlp_csrf=; Max-Age=0; Path=/';
        TestBed.resetTestingModule();
    });

    it('uses the exact public Data Spaces route with only public context', async () => {
        await dataSpaces.readSource({
            domain: 'preview.example.test',
            pageId: 'catalog',
            sourceId: 'published-products',
            input: {
                dataSpace: { read: 'recordList', spaceId: 'catalog-content', access: 'public' },
                collectionId: 'products',
                limit: 20,
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args;
        const headers = init?.headers as Record<string, string>;
        expect(url).toBe('/features/data-spaces/public-read');
        expect(init?.credentials).toBe('include');
        expect(headers['X-ZLP-Domain']).toBe('preview.example.test');
        expect(headers['X-ZLP-Auth-Profile-Id']).toBeUndefined();
        expect(headers['X-ZLP-CSRF']).toBeUndefined();
        expect(JSON.parse(String(init?.body))).toEqual({
            operation: 'recordList',
            spaceId: 'catalog-content',
            input: { collectionId: 'products', limit: 20 },
        });
    });

    it('accepts the backend success envelope when ok is omitted', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            data: { items: [{ connectionId: 'connection-synthetic' }] },
            requestId: 'integrations-read-123',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

        const response = await integrations.readSource<{ items: readonly { connectionId: string }[] }>({
            domain: 'preview.example.test',
            pageId: 'integrations',
            sourceId: 'connections',
            input: { integrations: { read: 'connectionList' } },
        });

        expect(response.ok).toBeUndefined();
        expect(response.requestId).toBe('integrations-read-123');
        expect(response.data.items[0].connectionId).toBe('connection-synthetic');
    });

    it('rejects malformed successful envelopes without exposing their body', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({ internal: 'private@example.test' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        await expectAsync(integrations.readSource({
            domain: 'preview.example.test',
            pageId: 'integrations',
            sourceId: 'connections',
            input: { integrations: { read: 'connectionList' } },
        })).toBeRejectedWithError('No pudimos completar la operación. Vuelve a intentar.');
    });

    it('adds protected context, CSRF, idempotency, timeout, and credentials to Data Spaces mutations', async () => {
        await dataSpaces.executeAction({
            domain: 'preview.example.test',
            pageId: 'admin-products',
            actionId: 'create-product',
            input: {
                dataSpace: { action: 'createRecord', spaceId: 'catalog-content' },
                collectionId: 'products',
                recordId: 'product-basic',
                data: { title: 'Basic' },
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args;
        const headers = init?.headers as Record<string, string>;
        expect(url).toBe('/features/data-spaces/action');
        expect(init?.credentials).toBe('include');
        expect(init?.signal).toBeDefined();
        expect(headers['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(headers['X-ZLP-CSRF']).toBe('csrf-test');
        expect(headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('fails safely before fetch when an idempotent payload cannot be canonicalized', async () => {
        const cyclicData: Record<string, unknown> = { title: 'Cyclic' };
        cyclicData['self'] = cyclicData;

        await expectAsync(dataSpaces.executeAction({
            domain: 'preview.example.test',
            pageId: 'admin-products',
            actionId: 'create-product',
            input: {
                dataSpace: { action: 'createRecord', spaceId: 'catalog-content' },
                collectionId: 'products',
                recordId: 'product-cyclic',
                data: cyclicData,
            },
        })).toBeRejectedWithError('El servicio seguro no respondió correctamente. Vuelve a intentar en unos segundos.');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rebuilds public Checkout so browser prices and provider scope cannot travel', async () => {
        await commerce.executeAction({
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' },
                lines: [{
                    offerVersionId: 'offer-basic-v1',
                    quantity: 1,
                    unitPrice: 1,
                    providerAccountId: 'acct-must-not-travel',
                }],
                amountMinor: 1,
                currency: 'MXN',
                tenantId: 'tenant-must-not-travel',
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args;
        const headers = init?.headers as Record<string, string>;
        expect(url).toBe('/features/commerce/public-action');
        expect(headers['X-ZLP-Auth-Profile-Id']).toBeUndefined();
        expect(headers['X-ZLP-CSRF']).toBeUndefined();
        expect(headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(JSON.parse(String(init?.body))).toEqual({
            operation: 'admitCheckout',
            input: { lines: [{ offerVersionId: 'offer-basic-v1', quantity: 1 }] },
        });
    });

    it('reuses a generated Checkout recovery key only after an ambiguous exact retry', async () => {
        const exactRequest = {
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' as const },
                lines: [{ offerVersionId: 'offer-basic-v1', quantity: 1 }],
            },
        };
        fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
        await expectAsync(commerce.executeAction(exactRequest)).toBeRejected();
        const firstKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];

        fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: true, data: { orderId: 'order-basic' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        await commerce.executeAction(exactRequest);
        const retryKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(retryKey).toBe(firstKey);

        fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
        await expectAsync(commerce.executeAction({
            ...exactRequest,
            input: {
                commerce: { action: 'admitCheckout' },
                lines: [{ offerVersionId: 'offer-basic-v1', quantity: 2 }],
            },
        })).toBeRejected();
        const changedInputKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(changedInputKey).not.toBe(firstKey);
    });

    it('keeps the Checkout key when response headers arrive but the body stream fails', async () => {
        const request = {
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' as const },
                lines: [{ offerVersionId: 'offer-stream-v1', quantity: 1 }],
            },
        };
        fetchSpy.and.resolveTo({
            ok: true,
            status: 200,
            text: () => Promise.reject(new TypeError('response stream failed')),
        } as Response);
        await expectAsync(commerce.executeAction(request)).toBeRejected();
        const firstKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];

        fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: true, data: { orderId: 'order-stream' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        await commerce.executeAction(request);
        const retryKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(retryKey).toBe(firstKey);
    });

    it('retains one Checkout recovery key across ambiguous HTTP statuses and clears it after success', async () => {
        const request = {
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' as const },
                lines: [{ offerVersionId: 'offer-ambiguous-v1', quantity: 1 }],
            },
        };
        const keys: string[] = [];
        for (const status of [500, 408, 425, 429]) {
            fetchSpy.and.resolveTo(new Response(JSON.stringify({
                error: { code: status === 429 ? 'rate_limited' : 'upstream_unavailable' },
            }), { status, headers: { 'Content-Type': 'application/json' } }));
            await expectAsync(commerce.executeAction(request)).toBeRejected();
            keys.push((fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key']);
        }
        expect(new Set(keys).size).toBe(1);

        fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: true, data: { orderId: 'order-ambiguous' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        await commerce.executeAction(request);
        expect((fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe(keys[0]);

        fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: true, data: { orderId: 'order-after-success' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        await commerce.executeAction(request);
        expect((fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key']).not.toBe(keys[0]);
    });

    it('clears a Checkout recovery key after a definitive client error', async () => {
        const request = {
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' as const },
                lines: [{ offerVersionId: 'offer-definitive-v1', quantity: 1 }],
            },
        };
        fetchSpy.and.resolveTo(new Response(JSON.stringify({ error: { code: 'validation_error' } }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }));
        await expectAsync(commerce.executeAction(request)).toBeRejected();
        const rejectedKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];

        fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: true, data: { orderId: 'order-definitive' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        await commerce.executeAction(request);
        expect((fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key']).not.toBe(rejectedKey);
    });

    it('forbids redirects so 307 or 308 responses cannot forward a mutation payload', async () => {
        for (const status of [307, 308]) {
            fetchSpy.and.resolveTo(new Response(JSON.stringify({ error: { code: 'unexpected_redirect' } }), {
                status,
                headers: { 'Content-Type': 'application/json', Location: 'https://evil.example.test/collect' },
            }));
            await expectAsync(commerce.executeAction({
                domain: 'preview.example.test',
                pageId: 'checkout',
                actionId: `checkout-${ status }`,
                input: {
                    commerce: { action: 'admitCheckout' },
                    lines: [{ offerVersionId: `offer-redirect-${ status }`, quantity: 1 }],
                },
            })).toBeRejected();
            expect(fetchSpy.calls.mostRecent().args[1]?.redirect).toBe('error');
        }
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('fails closed at the ambiguous mutation cap without evicting an exact Checkout retry', async () => {
        fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
        const firstRequest = (quantity: number) => ({
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' as const },
                lines: [{ offerVersionId: 'offer-cap-v1', quantity }],
            },
        });

        for (let quantity = 1; quantity <= 20; quantity += 1) {
            await expectAsync(commerce.executeAction(firstRequest(quantity))).toBeRejected();
        }
        const firstKey = (fetchSpy.calls.argsFor(0)[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(fetchSpy).toHaveBeenCalledTimes(20);

        await expectAsync(commerce.executeAction(firstRequest(21))).toBeRejected();
        expect(fetchSpy).toHaveBeenCalledTimes(20);

        await expectAsync(commerce.executeAction(firstRequest(1))).toBeRejected();
        expect(fetchSpy).toHaveBeenCalledTimes(21);
        const retryKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(retryKey).toBe(firstKey);
    });

    it('treats omitted and undefined optional Checkout fields as the same retry request', async () => {
        fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
        await expectAsync(commerce.executeAction({
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' },
                lines: [{ offerVersionId: 'offer-undefined-v1', quantity: 1 }],
                discountVersionId: undefined,
            },
        })).toBeRejected();
        const firstKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];

        await expectAsync(commerce.executeAction({
            domain: 'preview.example.test',
            pageId: 'checkout',
            actionId: 'checkout',
            input: {
                commerce: { action: 'admitCheckout' },
                lines: [{ offerVersionId: 'offer-undefined-v1', quantity: 1 }],
            },
        })).toBeRejected();
        const retryKey = (fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Idempotency-Key'];
        expect(retryKey).toBe(firstKey);
    });

    it('uses the dedicated Stripe onboarding route only for onboarding actions', async () => {
        await integrations.executeAction({
            domain: 'preview.example.test',
            pageId: 'integrations',
            actionId: 'stripe-start',
            input: {
                integrations: { action: 'stripeOnboardingStart', bindingId: 'stripe-main' },
            },
        });
        expect(fetchSpy.calls.mostRecent().args[0]).toBe('/features/integrations/stripe/onboarding');

        await integrations.executeAction({
            domain: 'preview.example.test',
            pageId: 'integrations',
            actionId: 'disable-connection',
            input: {
                integrations: { action: 'disable' },
                connectionId: 'stripe-main',
                expectedRevision: 2,
            },
        });
        expect(fetchSpy.calls.mostRecent().args[0]).toBe('/features/integrations/action');
    });

    it('treats migration status as protected read-like traffic without CSRF or idempotency', async () => {
        await commerce.executeAction({
            domain: 'preview.example.test',
            pageId: 'subscriptions',
            actionId: 'migration-status',
            input: {
                commerce: { action: 'migrationStatus' },
                commercialRequestId: 'migration-basic',
                limit: 25,
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args;
        const headers = init?.headers as Record<string, string>;
        expect(url).toBe('/features/commerce/subscription/action');
        expect(headers['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(headers['X-ZLP-CSRF']).toBeUndefined();
        expect(headers['Idempotency-Key']).toBeUndefined();
    });

    it('fails closed before fetch for unknown or mismatched operations', async () => {
        await expectAsync(commerce.executeAction({
            domain: 'preview.example.test',
            pageId: 'admin',
            actionId: 'unknown',
            input: { commerce: { action: 'not-real' } },
        })).toBeRejected();
        await expectAsync(dataSpaces.readSource({
            domain: 'preview.example.test',
            pageId: 'admin',
            sourceId: 'wrong-public-read',
            input: { dataSpace: { read: 'collectionList', spaceId: 'catalog', access: 'public' } },
        })).toBeRejected();
        await expectAsync(integrations.executeAction({
            domain: 'preview.example.test',
            pageId: 'admin',
            actionId: 'unknown',
            input: { integrations: { action: 'not-real' } },
        })).toBeRejected();

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('replaces raw backend errors with a localized safe message', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            error: {
                code: 'internal_error',
                message: 'Customer private@example.test failed with acct_secret.',
                requestId: 'req-safe-123',
                retryable: false,
            },
        }), { status: 500, headers: { 'Content-Type': 'application/json' } }));

        let failure: (Error & { requestId?: string }) | null = null;
        try {
            await integrations.readSource({
                domain: 'preview.example.test',
                pageId: 'integrations',
                sourceId: 'connections',
                input: { integrations: { read: 'connectionList' } },
            });
        } catch (error) {
            failure = error as Error & { requestId?: string };
        }

        expect(failure?.message).toBe('El servicio seguro no respondió correctamente. Vuelve a intentar en unos segundos.');
        expect(failure?.message).not.toContain('private@example.test');
        expect(failure?.message).not.toContain('acct_secret');
        expect(failure?.requestId).toBe('req-safe-123');
    });

    it('preserves the backend request-id contract without requiring a req prefix', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            error: { code: 'internal_error', requestId: 'request-data-spaces-123' },
        }), { status: 500, headers: { 'Content-Type': 'application/json' } }));

        let failure: (Error & { requestId?: string }) | null = null;
        try {
            await integrations.readSource({
                domain: 'preview.example.test', pageId: 'admin', sourceId: 'connections',
                input: { integrations: { read: 'connectionList' } },
            });
        } catch (error) {
            failure = error as Error & { requestId?: string };
        }
        expect(failure?.requestId).toBe('request-data-spaces-123');
    });

    it('resolves same-origin feature paths against the SSR request origin', () => {
        expect(serverFeatureRequestUrl(
            '/features/data-spaces/public-read',
            'https://test.zoolandingpage.com.mx/catalog?draftDomain=preview.example.test',
            '',
        )).toBe('https://test.zoolandingpage.com.mx/features/data-spaces/public-read');
        expect(() => serverFeatureRequestUrl(
            'https://evil.example.test/features/data-spaces/public-read',
            'https://test.zoolandingpage.com.mx/',
            '',
        )).toThrow();
        expect(() => serverFeatureRequestUrl(
            '//evil.example.test/features/data-spaces/public-read',
            'https://test.zoolandingpage.com.mx/',
            '',
        )).toThrow();
        expect(() => serverFeatureRequestUrl(
            '/features/data-spaces/public-read',
            'http://preview.example.test/',
            '',
        )).toThrow();
    });
});
