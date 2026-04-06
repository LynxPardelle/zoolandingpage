import { LanguageService } from '@/app/shared/services/language.service';
import { TestBed } from '@angular/core/testing';
import { langPickValueHandler, languageLabelValueHandler } from './language.value-handlers';

describe('langPickValueHandler', () => {
    let language: LanguageService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [LanguageService]
        });

        language = TestBed.inject(LanguageService);
    });

    it('should resolve locale maps using exact and base locale fallbacks', () => {
        language.configureLanguages(['pt-BR', 'en'], {
            defaultLanguage: 'pt-BR',
            requestedLanguage: 'pt-BR'
        });

        const handler = TestBed.runInInjectionContext(() => langPickValueHandler());

        expect(handler.resolve({ component: {} as any, host: null }, [{
            pt: 'Ola base',
            en: 'Hello',
            default: 'Fallback'
        }])).toBe('Ola base');

        expect(handler.resolve({ component: {} as any, host: null }, [{
            'pt-BR': 'Ola Brasil',
            pt: 'Ola base',
            en: 'Hello'
        }])).toBe('Ola Brasil');
    });

    it('should resolve the formatted current language label', () => {
        language.configureLanguages(['es', 'en'], {
            defaultLanguage: 'es',
            requestedLanguage: 'en'
        });

        const handler = TestBed.runInInjectionContext(() => languageLabelValueHandler());

        expect(handler.resolve({ component: {} as any, host: null }, [])).toBe('EN');
    });
});
