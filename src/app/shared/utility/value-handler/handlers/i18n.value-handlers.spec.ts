import { I18nService } from '@/app/shared/services/i18n.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { TestBed } from '@angular/core/testing';
import { i18nValueHandler } from './i18n.value-handlers';

describe('i18nValueHandler', () => {
    let i18n: I18nService;
    let language: LanguageService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [LanguageService, I18nService],
        });

        language = TestBed.inject(LanguageService);
        language.configureLanguages(['en'], {
            defaultLanguage: 'en',
            requestedLanguage: 'en',
        });

        i18n = TestBed.inject(I18nService);
        i18n.setTranslations('en', {
            plainText: 'Hello',
            matterType: {
                options: [
                    { value: 'contract-review', label: 'Contract review' },
                    { value: 'corporate-advisory', label: 'Corporate advisory' },
                ],
            },
        });
    });

    it('returns translated strings for scalar values', () => {
        const handler = TestBed.runInInjectionContext(() => i18nValueHandler());

        expect(handler.resolve({ component: {} as never, host: null }, ['plainText'])).toBe('Hello');
    });

    it('preserves structured values such as option arrays', () => {
        const handler = TestBed.runInInjectionContext(() => i18nValueHandler());

        expect(handler.resolve({ component: {} as never, host: null }, ['matterType.options'])).toEqual([
            { value: 'contract-review', label: 'Contract review' },
            { value: 'corporate-advisory', label: 'Corporate advisory' },
        ]);
    });
});
