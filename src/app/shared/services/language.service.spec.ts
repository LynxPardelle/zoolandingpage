import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { LanguageService } from './language.service';

const nativeHistoryReplaceState = History.prototype.replaceState;
const setBrowserUrl = (url: string): void => {
    nativeHistoryReplaceState.call(window.history, {}, '', url);
};

describe('LanguageService', () => {
    let service: LanguageService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
        document.cookie = 'zlp_lang=; Path=/; Max-Age=0; SameSite=Lax';
        setBrowserUrl('/context.html');
        TestBed.configureTestingModule({
            providers: [
                LanguageService,
                { provide: PLATFORM_ID, useValue: 'browser' },
            ]
        });

        service = TestBed.inject(LanguageService);
    });

    afterEach(() => {
        setBrowserUrl('/context.html');
        TestBed.resetTestingModule();
    });

    it('should support arbitrary dialects declared by the draft', () => {
        service.configureLanguages(['es', 'pt-BR', 'zh-Hant'], {
            defaultLanguage: 'pt-BR',
            requestedLanguage: 'pt-br'
        });

        expect(service.currentLanguage()).toBe('pt-BR');
        expect(service.getAvailableLanguages()).toEqual(['es', 'pt-BR', 'zh-Hant']);
        expect(service.languageLabel()).toBe('PT-BR');
    });

    it('keeps the requested URL language before draft languages are configured', () => {
        TestBed.resetTestingModule();
        localStorage.clear();
        setBrowserUrl('/mi-cuenta?draftDomain=zoositioweb.com.mx&lang=es');
        TestBed.configureTestingModule({
            providers: [
                LanguageService,
                { provide: PLATFORM_ID, useValue: 'browser' },
            ],
        });

        const bootstrapService = TestBed.inject(LanguageService);

        expect(bootstrapService.currentLanguage()).toBe('es');
        expect(bootstrapService.getRequestedLanguagePreference()).toBe('es');
    });

    it('should fall back to the only draft language when a requested language is unavailable', () => {
        service.configureLanguages(['it'], {
            defaultLanguage: 'it',
            requestedLanguage: 'en'
        });

        expect(service.currentLanguage()).toBe('it');
        expect(service.nextLanguage()).toBe('it');

        service.toggleLanguage();

        expect(service.currentLanguage()).toBe('it');
    });

    it('persists user-selected language in the URL and cookie for reload-safe SSR', () => {
        setBrowserUrl('/home?draftDomain=pamelabetancourt.com');
        const replaceState = spyOn(window.history, 'replaceState').and.callThrough();
        spyOn<any>(service, 'parseCurrentBrowserUrl').and.returnValue(new URL('http://localhost/home?draftDomain=pamelabetancourt.com'));
        service.configureLanguages(['es', 'en'], {
            defaultLanguage: 'es',
            requestedLanguage: 'en'
        });
        setBrowserUrl('/home?draftDomain=pamelabetancourt.com');

        service.setLanguage('es');

        expect(service.currentLanguage()).toBe('es');
        expect(replaceState.calls.mostRecent().args[2]).toBe('/home?draftDomain=pamelabetancourt.com&lang=es');
        expect(document.cookie).toContain('zlp_lang=es');
    });

    it('reads the SSR language preference from the request URL', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                LanguageService,
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: REQUEST,
                    useValue: new Request('https://pamelabetancourt.zoolandingpage.com.mx/home?lang=es'),
                },
            ],
        });

        const serverService = TestBed.inject(LanguageService);

        expect(serverService.getRequestedLanguagePreference()).toBe('es');
    });
});
