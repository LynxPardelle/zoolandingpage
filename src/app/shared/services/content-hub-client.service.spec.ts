import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfigStoreService } from './config-store.service';
import { ContentHubClientService } from './content-hub-client.service';
import { LanguageService } from './language.service';

describe('ContentHubClientService', () => {
    let fetchSpy: jasmine.Spy;

    beforeEach(() => {
        fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            data: { status: 'ok' },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                ContentHubClientService,
                { provide: REQUEST, useValue: new Request('https://zoositioweb.com.mx/admin/blog') },
            ],
        });

        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                authRemote: {
                    enabled: true,
                    authProfileId: 'staff',
                    endpoint: '/auth/runtime-config',
                },
                contentHubs: [
                    {
                        hubId: 'zoosite-main',
                        ownerDraftDomain: 'zoositioweb.com.mx',
                        source: 'primary',
                        routeBasePath: '/blog',
                        listPath: '/blog',
                        articlePathPattern: '/blog/:categorySlug/:articleSlug',
                        defaultLocale: 'es',
                        locales: ['es'],
                        canonicalMode: 'host-adaptive',
                        publicApiBasePath: '/features/content-hub',
                    },
                ],
            },
            site: {},
        } as any);
        TestBed.inject(LanguageService).configureLanguages(['es', 'en'], {
            defaultLanguage: 'es',
            requestedLanguage: 'es',
        });
    });

    afterEach(() => {
        delete (document as unknown as { cookie?: string }).cookie;
        TestBed.resetTestingModule();
    });

    it('reads through the same-origin content hub endpoint with draft and hub context headers', async () => {
        const service = TestBed.inject(ContentHubClientService);

        await service.readSource({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-blog-articulos',
            sourceId: 'contentHubArticleList',
            input: {
                contentHub: {
                    read: 'articleList',
                    hubId: 'zoosite-main',
                },
                limit: 20,
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toBe('/features/content-hub/read');
        expect(init.credentials).toBe('include');
        expect(init.method).toBe('POST');
        expect(init.body).toBe(JSON.stringify({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-blog-articulos',
            sourceId: 'contentHubArticleList',
            input: {
                contentHub: {
                    read: 'articleList',
                    hubId: 'zoosite-main',
                },
                limit: 20,
            },
        }));
        expect(init.headers).toEqual(jasmine.objectContaining({
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-ZLP-Domain': 'zoositioweb.com.mx',
            'X-ZLP-Auth-Profile-Id': 'staff',
            'X-ZLP-Content-Hub-Id': 'zoosite-main',
        }));
    });

    it('executes mutations with csrf and same-origin credentials', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=csrf-token',
        });
        const service = TestBed.inject(ContentHubClientService);

        await service.executeAction({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-blog-articulos',
            actionId: 'contentHubPublish',
            input: {
                contentHub: {
                    action: 'publish',
                    hubId: 'zoosite-main',
                },
                articleId: 'intro',
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toBe('/features/content-hub/action');
        expect(init.credentials).toBe('include');
        expect(init.headers).toEqual(jasmine.objectContaining({
            'X-ZLP-CSRF': 'csrf-token',
            'X-ZLP-Domain': 'zoositioweb.com.mx',
            'X-ZLP-Auth-Profile-Id': 'staff',
            'X-ZLP-Content-Hub-Id': 'zoosite-main',
        }));
    });

    it('serializes uploadAsset browser files into bounded JSON payloads', async () => {
        const service = TestBed.inject(ContentHubClientService);
        const file = new File(['asset'], 'cover.png', { type: 'image/png' });

        await service.executeAction({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-blog-medios',
            actionId: 'contentHubUploadAsset',
            input: {
                contentHub: {
                    action: 'uploadAsset',
                    hubId: 'zoosite-main',
                },
                articleId: 'intro',
                files: [file],
            },
        });

        const [, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        const body = JSON.parse(String(init.body));
        expect(body.input.files).toEqual([
            jasmine.objectContaining({
                kind: 'browser-file',
                name: 'cover.png',
                mimeType: 'image/png',
                size: 5,
                dataBase64: 'YXNzZXQ=',
            }),
        ]);
        expect(JSON.stringify(body)).not.toContain('credentialRef');
    });

    it('maps technical content hub identity errors to safe user-facing copy', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'Invalid id',
            requestId: 'req-safe-123',
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(ContentHubClientService);

        try {
            await service.executeAction({
                domain: 'zoositioweb.com.mx',
                pageId: 'admin-blog-articulos-nuevo',
                actionId: 'contentHubCreateArticle',
                input: {
                    contentHub: {
                        action: 'createArticle',
                        hubId: 'zoosite-main',
                    },
                },
            });
            fail('expected content hub request to fail');
        } catch (error) {
            expect(error).toEqual(jasmine.any(Error));
            expect((error as Error).message).toBe('No pudimos identificar el artículo o la versión. Abre la acción desde la lista y vuelve a intentar.');
            expect((error as Error & { requestId?: string }).requestId).toBe('req-safe-123');
        }
    });

    it('does not expose malformed content hub request ids', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'Invalid id',
            requestId: 'req-unsafe/<script>',
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(ContentHubClientService);

        try {
            await service.executeAction({
                domain: 'zoositioweb.com.mx',
                pageId: 'admin-blog-articulos-nuevo',
                actionId: 'contentHubCreateArticle',
                input: {
                    contentHub: {
                        action: 'createArticle',
                        hubId: 'zoosite-main',
                    },
                },
            });
            fail('expected content hub request to fail');
        } catch (error) {
            expect(error).toEqual(jasmine.any(Error));
            expect((error as Error & { requestId?: string }).requestId).toBeUndefined();
        }
    });

    it('maps authorization failures without exposing raw backend terms', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'forbidden',
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(ContentHubClientService);

        await expectAsync(service.readSource({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-blog-articulos',
            sourceId: 'contentHubArticleList',
            input: {
                contentHub: {
                    read: 'articleList',
                    hubId: 'zoosite-main',
                },
            },
        })).toBeRejectedWithError('No tienes permisos para completar esta acción en el gestor de contenido.');
    });
});
