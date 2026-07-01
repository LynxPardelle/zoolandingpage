import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AngoraCombosService } from './angora-combos.service';
import { ComboCatalogRuntimeService } from './combo-catalog-runtime.service';
import { ConfigStoreService } from './config-store.service';
import type { TDraftSiteConfigPayload } from '../types/config-payloads.types';

const DOMAIN = 'zoositioweb.com.mx';
const PAGE_ID = 'admin-combos';

const siteConfig = (comboCatalog?: Record<string, unknown>): TDraftSiteConfigPayload => ({
    version: 1,
    domain: DOMAIN,
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
    runtime: comboCatalog ? { comboCatalog } : {},
    site: {
        appIdentity: { identifier: 'zoosite', name: 'Zoosite' },
        theme: { palettes: {} },
        i18n: { defaultLanguage: 'es', supportedLanguages: ['es'] },
    },
} as unknown as TDraftSiteConfigPayload);

describe('ComboCatalogRuntimeService', () => {
    let service: ComboCatalogRuntimeService;
    let store: ConfigStoreService;
    let http: HttpTestingController;
    let combos: jasmine.SpyObj<AngoraCombosService>;

    beforeEach(() => {
        combos = jasmine.createSpyObj<AngoraCombosService>('AngoraCombosService', [
            'setAuxiliaryCombos',
            'clearAuxiliaryCombos',
        ]);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: AngoraCombosService, useValue: combos },
            ],
        });

        service = TestBed.inject(ComboCatalogRuntimeService);
        store = TestBed.inject(ConfigStoreService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
    });

    it('does not request remote combos when comboCatalog is absent or disabled', async () => {
        store.setSiteConfig(siteConfig());

        await expectAsync(service.load(DOMAIN, PAGE_ID)).toBeResolvedTo(true);
        http.expectNone('/features/combo-catalog/read');
        expect(combos.clearAuxiliaryCombos).toHaveBeenCalledWith('combo-catalog');

        combos.clearAuxiliaryCombos.calls.reset();
        store.setSiteConfig(siteConfig({
            enabled: false,
            endpoint: '/features/combo-catalog/read',
        }));

        await expectAsync(service.load(DOMAIN, PAGE_ID)).toBeResolvedTo(true);
        http.expectNone('/features/combo-catalog/read');
        expect(combos.clearAuxiliaryCombos).toHaveBeenCalledWith('combo-catalog');
    });

    it('requests runtime combos with only public routing metadata and installs valid payloads', async () => {
        store.setSiteConfig(siteConfig({
            enabled: true,
            endpoint: '/features/combo-catalog/read',
            authProfileId: 'staff',
            draftDomain: DOMAIN,
        }));

        const resolved = service.load(DOMAIN, PAGE_ID);
        const request = http.expectOne('/features/combo-catalog/read');
        expect(request.request.method).toBe('POST');
        expect(request.request.withCredentials).toBeTrue();
        expect(request.request.body).toEqual({
            read: 'runtimeCombos',
            domain: DOMAIN,
            authProfileId: 'staff',
            draftDomain: DOMAIN,
        });
        expect(JSON.stringify(request.request.body)).not.toContain('credentialRef');
        expect(JSON.stringify(request.request.body)).not.toContain('tableName');
        expect(JSON.stringify(request.request.body)).not.toContain('clientSecret');

        request.flush({
            ok: true,
            data: {
                combos: {
                    'combo-card-corporate': ['ank-p-24', 'ank-bg-bgColor'],
                },
            },
        });

        await expectAsync(resolved).toBeResolvedTo(true);
        expect(combos.setAuxiliaryCombos).toHaveBeenCalledOnceWith('combo-catalog', {
            version: 1,
            domain: DOMAIN,
            pageId: PAGE_ID,
            combos: {
                'combo-card-corporate': ['ank-p-24', 'ank-bg-bgColor'],
            },
        });
    });

    it('fails closed and clears remote combos when the endpoint response is invalid', async () => {
        store.setSiteConfig(siteConfig({
            enabled: true,
            endpoint: '/features/combo-catalog/read',
        }));

        const resolved = service.load(DOMAIN, PAGE_ID);
        http.expectOne('/features/combo-catalog/read').flush({
            ok: true,
            data: {
                combos: {
                    invalid: 'ank-p-24',
                },
            },
        });

        await expectAsync(resolved).toBeResolvedTo(false);
        expect(combos.setAuxiliaryCombos).not.toHaveBeenCalled();
        expect(combos.clearAuxiliaryCombos).toHaveBeenCalledWith('combo-catalog');
    });
});
