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
            'drafts/zoolandingpage.com.mx/i18n/es-MX.json',
            'drafts/zoolandingpage.com.mx/default/i18n/es-MX.json',
            'drafts/zoolandingpage.com.mx/i18n/es.json',
            'drafts/zoolandingpage.com.mx/default/i18n/es.json',
        ]);
    });

    it('merges shared domain components with page-specific components and lets the page win by id', async () => {
        spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.endsWith('drafts/zoolandingpage.com.mx/components.json')) {
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

            if (url.endsWith('drafts/zoolandingpage.com.mx/default/components.json')) {
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

    it('reuses a warm site-config response within the in-memory draft cache window', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.endsWith('drafts/zoolandingpage.com.mx/site-config.json')) {
                return Promise.resolve(createJsonResponse({
                    version: 1,
                    domain: 'zoolandingpage.com.mx',
                    defaultPageId: 'default',
                    routes: [{ path: '/', pageId: 'default' }],
                    site: {
                        appIdentity: {
                            identifier: 'zoolandingpagecommx',
                            name: 'Zoo Landing Page',
                        },
                        theme: {
                            palettes: {
                                light: {
                                    bgColor: '#ffffff',
                                    textColor: '#111111',
                                    titleColor: '#111111',
                                    linkColor: '#111111',
                                    accentColor: '#111111',
                                    secondaryBgColor: '#f5f5f5',
                                    secondaryTextColor: '#333333',
                                    secondaryTitleColor: '#111111',
                                    secondaryLinkColor: '#111111',
                                    secondaryAccentColor: '#111111',
                                    successColor: '#198754',
                                    onSuccessColor: '#ffffff',
                                    errorColor: '#dc3545',
                                    onErrorColor: '#ffffff',
                                    warningColor: '#f59e0b',
                                    onWarningColor: '#111111',
                                    infoColor: '#0d6efd',
                                    onInfoColor: '#ffffff',
                                },
                                dark: {
                                    bgColor: '#111111',
                                    textColor: '#f5f5f5',
                                    titleColor: '#f5f5f5',
                                    linkColor: '#f5f5f5',
                                    accentColor: '#f5f5f5',
                                    secondaryBgColor: '#1f1f1f',
                                    secondaryTextColor: '#e5e5e5',
                                    secondaryTitleColor: '#f5f5f5',
                                    secondaryLinkColor: '#f5f5f5',
                                    secondaryAccentColor: '#f5f5f5',
                                    successColor: '#32d583',
                                    onSuccessColor: '#052e1c',
                                    errorColor: '#ff6b6b',
                                    onErrorColor: '#3b0a10',
                                    warningColor: '#f5b942',
                                    onWarningColor: '#3a2400',
                                    infoColor: '#58a6ff',
                                    onInfoColor: '#041b44',
                                },
                            },
                        },
                        i18n: {
                            defaultLanguage: 'es',
                            supportedLanguages: ['es'],
                        },
                    },
                }));
            }

            return Promise.reject(new Error(`Unexpected fetch: ${ url }`));
        });

        await service.loadSiteConfig('zoolandingpage.com.mx');
        await service.loadSiteConfig('zoolandingpage.com.mx');

        expect(service.hasWarmSiteConfig('zoolandingpage.com.mx')).toBeTrue();
        expect(fetchSpy.calls.count()).toBe(1);
    });
});
