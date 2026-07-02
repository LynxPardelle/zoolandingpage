import { TestBed } from '@angular/core/testing';
import { ConfigStoreService } from './config-store.service';
import { ComboCatalogClientService } from './combo-catalog-client.service';
import { LanguageService } from './language.service';

describe('ComboCatalogClientService', () => {
    let service: ComboCatalogClientService;
    let configStore: ConfigStoreService;
    let fetchSpy: jasmine.Spy<typeof fetch>;
    let language: jasmine.SpyObj<LanguageService>;

    beforeEach(() => {
        language = jasmine.createSpyObj<LanguageService>('LanguageService', ['currentLanguage']);
        language.currentLanguage.and.returnValue('es');
        fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            data: { saved: true },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        TestBed.configureTestingModule({
            providers: [
                ComboCatalogClientService,
                ConfigStoreService,
                { provide: LanguageService, useValue: language },
            ],
        });

        service = TestBed.inject(ComboCatalogClientService);
        configStore = TestBed.inject(ConfigStoreService);
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                auth: {
                    authProfileId: 'staff',
                    session: {
                        csrfCookieName: 'zlp_csrf',
                        csrfHeaderName: 'X-ZLP-CSRF',
                    },
                },
                comboCatalog: {
                    endpoint: '/features/combo-catalog/read',
                    authProfileId: 'staff',
                    draftDomain: 'zoositioweb.com.mx',
                    enabled: true,
                },
            },
            site: {},
        } as any);
        document.cookie = 'zlp_csrf=csrf-test; Path=/';
    });

    afterEach(() => {
        document.cookie = 'zlp_csrf=; Max-Age=0; Path=/';
        TestBed.resetTestingModule();
    });

    it('posts reads to the same-origin combo catalog read endpoint', async () => {
        await service.readSource({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-combos',
            sourceId: 'combo_catalog_combo_list',
            input: {
                query: 'hero',
                read: 'comboList',
                scope: 'draft',
            },
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.calls.mostRecent().args;
        expect(url).toBe('/features/combo-catalog/read');
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)['X-ZLP-Domain']).toBe('zoositioweb.com.mx');
        expect((init?.headers as Record<string, string>)['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(JSON.parse(String(init?.body))).toEqual(jasmine.objectContaining({
            domain: 'zoositioweb.com.mx',
            draftDomain: 'zoositioweb.com.mx',
            pageId: 'admin-combos',
            query: 'hero',
            read: 'comboList',
            scope: 'draft',
            sourceId: 'combo_catalog_combo_list',
        }));
    });

    it('posts authenticated writes to the action endpoint with normalized list fields', async () => {
        await service.executeAction({
            domain: 'zoositioweb.com.mx',
            pageId: 'admin-combos',
            actionId: 'combo_catalog_batch_upsert_combos',
            input: {
                action: 'batchUpsertCombos',
                batchJson: '[{"combo":"HeroCard","classes":["ank-d-flex"]}]',
                categories: 'web, seo',
                comboGroups: 'corporativo, landing',
                scope: 'draft',
            },
        });

        const [url, init] = fetchSpy.calls.mostRecent().args;
        const headers = init?.headers as Record<string, string>;
        const body = JSON.parse(String(init?.body));

        expect(url).toBe('/features/combo-catalog/action');
        expect(headers['X-ZLP-CSRF']).toBe('csrf-test');
        expect(body).toEqual(jasmine.objectContaining({
            action: 'batchUpsertCombos',
            categories: ['web', 'seo'],
            combos: [{ combo: 'HeroCard', classes: ['ank-d-flex'] }],
            draftDomain: 'zoositioweb.com.mx',
            groups: ['corporativo', 'landing'],
            scope: 'draft',
        }));
    });

    it('localizes backend errors instead of exposing raw identifiers', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'Invalid id',
            requestId: 'req-combo-123',
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        }));

        let failure: Error & { requestId?: string } | null = null;
        try {
            await service.executeAction({
                domain: 'zoositioweb.com.mx',
                pageId: 'admin-combos',
                actionId: 'combo_catalog_update_combo',
                input: {
                    action: 'updateCombo',
                    comboId: 'bad/id',
                    scope: 'draft',
                },
            });
        } catch (error) {
            failure = error as Error & { requestId?: string };
        }

        expect(failure).not.toBeNull();
        expect(failure?.message).toBe('No pudimos identificar el combo, grupo o política. Abre la acción desde la lista y vuelve a intentar.');
        expect(failure?.message).not.toContain('Invalid id');
        expect(failure?.requestId).toBe('req-combo-123');
    });
});
