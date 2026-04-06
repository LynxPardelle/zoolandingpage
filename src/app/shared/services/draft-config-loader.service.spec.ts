import type { TComponentPayloadEntry, TComponentsPayload } from '@/app/shared/types/config-payloads.types';
import { TestBed } from '@angular/core/testing';
import { DraftConfigLoaderService } from './draft-config-loader.service';

describe('DraftConfigLoaderService', () => {
    let service: DraftConfigLoaderService;

    const createJsonResponse = (body: unknown, status = 200, statusText = 'OK') =>
        new Response(JSON.stringify(body), {
            status,
            statusText,
            headers: { 'Content-Type': 'application/json' },
        });

    const createComponentsPayload = (
        components: Record<string, TComponentPayloadEntry>,
        overrides: Partial<{ domain: string; pageId: string }> = {},
    ): TComponentsPayload => ({
        version: 1,
        domain: overrides.domain ?? 'zoolandingpage.com.mx',
        pageId: overrides.pageId ?? 'default',
        components: Object.values(components) as TComponentPayloadEntry[],
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DraftConfigLoaderService,
            ],
        });

        service = TestBed.inject(DraftConfigLoaderService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('falls back to the base locale when the region-specific draft file is missing', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.endsWith('/i18n/es-MX.json')) {
                return Promise.resolve(createJsonResponse({ message: 'Not found' }, 404, 'Not Found'));
            }

            if (url.endsWith('/i18n/es.json')) {
                return Promise.resolve(createJsonResponse({
                    version: 1,
                    pageId: 'default',
                    domain: 'zoolandingpage.com.mx',
                    lang: 'es',
                    dictionary: {
                        hero: {
                            badges: [{ text: 'ok' }],
                        },
                    },
                }));
            }

            return Promise.reject(new Error(`Unexpected fetch: ${ url }`));
        });

        await expectAsync(service.loadI18n('zoolandingpage.com.mx', 'default', 'es-MX'))
            .toBeResolvedTo(jasmine.objectContaining({ lang: 'es' }));

        expect(fetchSpy.calls.allArgs().map((args) => String(args[0]))).toEqual([
            'assets/drafts/zoolandingpage.com.mx/default/i18n/es-MX.json',
            'assets/drafts/zoolandingpage.com.mx/default/i18n/es.json',
        ]);
    });

    it('merges shared domain components with page-specific components and lets the page win by id', async () => {
        spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.endsWith('assets/drafts/zoolandingpage.com.mx/components.json')) {
                return Promise.resolve(createJsonResponse(createComponentsPayload({
                    siteHeader: {
                        id: 'siteHeader',
                        type: 'container',
                        config: { components: [] },
                    },
                    ctaButton: {
                        id: 'ctaButton',
                        type: 'button',
                        config: { label: 'Shared CTA' },
                    },
                }, { pageId: 'allPages' })));
            }

            if (url.endsWith('assets/drafts/zoolandingpage.com.mx/default/components.json')) {
                return Promise.resolve(createJsonResponse(createComponentsPayload({
                    landingPage: {
                        id: 'landingPage',
                        type: 'container',
                        config: { components: ['ctaButton'] },
                    },
                    ctaButton: {
                        id: 'ctaButton',
                        type: 'button',
                        config: { label: 'Page CTA' },
                    },
                })));
            }

            return Promise.reject(new Error(`Unexpected fetch: ${ url }`));
        });

        const payload = await service.loadComponents('zoolandingpage.com.mx', 'default');

        expect(payload).toEqual({
            version: 1,
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            components: [
                {
                    id: 'siteHeader',
                    domain: 'zoolandingpage.com.mx',
                    pageId: 'allPages',
                    type: 'container',
                    config: { components: [] },
                },
                {
                    id: 'ctaButton',
                    domain: 'zoolandingpage.com.mx',
                    pageId: 'default',
                    type: 'button',
                    config: { label: 'Page CTA' },
                },
                {
                    id: 'landingPage',
                    domain: 'zoolandingpage.com.mx',
                    pageId: 'default',
                    type: 'container',
                    config: { components: ['ctaButton'] },
                },
            ],
        });
    });
});
