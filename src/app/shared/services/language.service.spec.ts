import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
    let service: LanguageService;

    beforeEach(() => {
        localStorage.clear();
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
});
