import { TestBed } from '@angular/core/testing';
import { RuntimeApiProxyClientService } from './runtime-api-proxy-client.service';

describe('RuntimeApiProxyClientService', () => {
    let service: RuntimeApiProxyClientService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [RuntimeApiProxyClientService],
        });
        service = TestBed.inject(RuntimeApiProxyClientService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('posts read requests to the api proxy read endpoint', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            data: { items: [{ title: 'Song A' }] },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const result = await service.readSource({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            sourceId: 'spotify-releases',
            input: { locale: 'en' },
        });

        expect(result).toEqual({
            ok: true,
            data: { items: [{ title: 'Song A' }] },
        });

        const [requestUrl, requestInit] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(requestUrl).toContain('/api-proxy/read');
        expect(requestInit.method).toBe('POST');
        expect(new Headers(requestInit.headers).get('Content-Type')).toBe('application/json');
        expect(JSON.parse(String(requestInit.body))).toEqual({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            sourceId: 'spotify-releases',
            input: { locale: 'en' },
        });
    });

    it('posts action requests to the api proxy action endpoint', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            data: { status: 'subscribed' },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const result = await service.executeAction({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            actionId: 'newsletter-signup',
            input: { email: 'listener@example.test' },
        });

        expect(result).toEqual({
            ok: true,
            data: { status: 'subscribed' },
        });
        expect(String(fetchSpy.calls.mostRecent().args[0])).toContain('/api-proxy/action');
        expect(JSON.parse(String(fetchSpy.calls.mostRecent().args[1]?.body))).toEqual({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            actionId: 'newsletter-signup',
            input: { email: 'listener@example.test' },
        });
    });

    it('throws a safe error message when the proxy request fails', async () => {
        spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'Unknown sourceId',
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }));

        await expectAsync(service.readSource({
            domain: 'music.lynxpardelle.com',
            sourceId: 'missing-source',
        })).toBeRejectedWithError('Unknown sourceId');
    });
});
