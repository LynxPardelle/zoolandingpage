import { AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { setLanguageHandler } from './ui.handlers';

describe('setLanguageHandler', () => {
    let analytics: jasmine.SpyObj<AnalyticsService>;
    let language: LanguageService;
    let context: EventExecutionContext;

    beforeEach(() => {
        localStorage.clear();
        analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['track']);
        analytics.track.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            providers: [
                LanguageService,
                { provide: AnalyticsService, useValue: analytics }
            ]
        });

        language = TestBed.inject(LanguageService);
        language.configureLanguages(['es', 'pt-BR'], { defaultLanguage: 'es', requestedLanguage: 'es' });
        context = {
            event: {
                componentId: 'languageMenu',
                eventName: 'selectItem'
            },
            host: null
        };
    });

    it('should set a supported language and track the change', () => {
        const handler = TestBed.runInInjectionContext(() => setLanguageHandler());

        handler.handle(context, ['pt-br']);

        expect(language.currentLanguage()).toBe('pt-BR');
        expect(analytics.track).toHaveBeenCalledOnceWith(
            AnalyticsEvents.LanguageToggle,
            jasmine.objectContaining({
                label: 'es->pt-BR',
                meta: jasmine.objectContaining({
                    before: 'es',
                    after: 'pt-BR',
                    type: 'language',
                    action: 'set'
                })
            })
        );
    });

    it('should ignore unsupported languages without tracking', () => {
        const handler = TestBed.runInInjectionContext(() => setLanguageHandler());

        handler.handle(context, ['ja']);

        expect(language.currentLanguage()).toBe('es');
        expect(analytics.track).not.toHaveBeenCalled();
    });
});
