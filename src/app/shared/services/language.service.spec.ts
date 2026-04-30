import { TestBed } from '@angular/core/testing';
import { REQUEST } from '@angular/core';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
    let service: LanguageService;

    beforeEach(() => {
        localStorage.clear();
        document.cookie = 'zlp_lang=; Path=/; Max-Age=0; SameSite=Lax';
        window.history.replaceState({}, '', '/context.html');
        TestBed.configureTestingModule({
            providers: [LanguageService]
        });

        service = TestBed.inject(LanguageService);
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
        window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.com');
        service.configureLanguages(['es', 'en'], {
            defaultLanguage: 'es',
            requestedLanguage: 'en'
        });

        service.setLanguage('es');

        expect(service.currentLanguage()).toBe('es');
        expect(window.location.pathname + window.location.search).toBe('/home?draftDomain=pamelabetancourt.com&lang=es');
        expect(document.cookie).toContain('zlp_lang=es');
    });

    it('reads the SSR language preference from the request URL', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                LanguageService,
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
