import { TestBed } from '@angular/core/testing';
import { PublicImageUploadService } from './public-image-upload.service';

describe('PublicImageUploadService', () => {
    let service: PublicImageUploadService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PublicImageUploadService],
        });

        service = TestBed.inject(PublicImageUploadService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('sends imageBase64 for direct uploads when the file is a small optimizable image', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            bucket: 'bucket',
            key: 'domain/default/images/hero.jpg',
            contentType: 'image/jpeg',
            publicUrl: 'https://assets.example/hero.jpg',
            uploadStrategy: 'direct',
            compression: {
                optimized: true,
                sourceBytes: 3,
                storedBytes: 2,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const file = new File(['abc'], 'hero.jpg', { type: 'image/jpeg' });
        const result = await service.uploadImage({
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            assetKind: 'hero-images',
            assetId: 'hero-image',
            file,
            maxWidth: 1600,
            quality: 80,
        });

        expect(result.uploadStrategy).toBe('direct');
        expect(result.publicUrl).toBe('https://assets.example/hero.jpg');
        expect(fetchSpy.calls.count()).toBe(1);

        const [requestUrl, requestInit] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(requestUrl).toContain('/image-upload/presign');
        expect(requestInit.method).toBe('POST');

        const payload = JSON.parse(String(requestInit.body));
        expect(payload).toEqual(jasmine.objectContaining({
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            assetKind: 'hero-images',
            assetId: 'hero-image',
            contentType: 'image/jpeg',
            quality: 80,
            maxWidth: 1600,
            imageBase64: 'YWJj',
        }));
    });

    it('falls back to the presigned upload flow for non-optimizable image types', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.includes('/image-upload/presign')) {
                return Promise.resolve(new Response(JSON.stringify({
                    ok: true,
                    bucket: 'bucket',
                    key: 'domain/default/images/logo.svg',
                    contentType: 'image/svg+xml',
                    publicUrl: 'https://assets.example/logo.svg',
                    uploadStrategy: 'presigned-put',
                    uploadUrl: 'https://signed-upload.example/logo.svg',
                    headers: {
                        'Content-Type': 'image/svg+xml',
                    },
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }));
            }

            if (url === 'https://signed-upload.example/logo.svg') {
                return Promise.resolve(new Response('', { status: 200 }));
            }

            return Promise.reject(new Error(`Unexpected fetch: ${ url } ${ JSON.stringify(init) }`));
        });

        const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
        const result = await service.uploadImage({
            domain: 'zoolandingpage.com.mx',
            assetId: 'logo',
            file,
        });

        expect(result.uploadStrategy).toBe('presigned-put');
        expect(result.publicUrl).toBe('https://assets.example/logo.svg');
        expect(fetchSpy.calls.count()).toBe(2);

        const firstBody = JSON.parse(String(fetchSpy.calls.argsFor(0)[1]?.body));
        expect(firstBody.imageBase64).toBeUndefined();

        const putInit = fetchSpy.calls.argsFor(1)[1] as RequestInit;
        expect(putInit.method).toBe('PUT');
        expect(new Headers(putInit.headers).get('Content-Type')).toBe('image/svg+xml');
    });
});
