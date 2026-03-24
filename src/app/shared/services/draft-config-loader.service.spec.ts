import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DraftConfigLoaderService } from './draft-config-loader.service';

describe('DraftConfigLoaderService', () => {
    let service: DraftConfigLoaderService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DraftConfigLoaderService,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        service = TestBed.inject(DraftConfigLoaderService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('falls back to the base locale when the region-specific draft file is missing', async () => {
        const promise = service.loadI18n('zoolandingpage.com.mx', 'default', 'es-MX');

        const missingRequest = httpMock.expectOne('assets/drafts/zoolandingpage.com.mx/default/i18n/es-MX.json');
        missingRequest.flush('Not found', { status: 404, statusText: 'Not Found' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        const fallbackRequests = httpMock.match((request) => request.url.includes('/i18n/es.json'));
        expect(fallbackRequests.length).toBe(1);

        const fallbackRequest = fallbackRequests[0];
        fallbackRequest.flush({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            lang: 'es',
            dictionary: {
                hero: {
                    badges: [{ text: 'ok' }],
                },
            },
        });

        await expectAsync(promise).toBeResolvedTo(jasmine.objectContaining({ lang: 'es' }));
    });
});
