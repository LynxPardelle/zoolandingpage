import { AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { EventExecutionContext } from '../event-handler.types';
import { navigateToUrlHandler, setLanguageHandler } from './ui.handlers';

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

describe('navigateToUrlHandler', () => {
    let router: jasmine.SpyObj<Router>;
    let context: EventExecutionContext;
    let openSpy: jasmine.Spy<(url?: string | URL, target?: string, features?: string) => Window | null>;

    beforeEach(() => {
        window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
        router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
        router.navigateByUrl.and.returnValue(Promise.resolve(true));

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
            ]
        });

        context = {
            event: {
                componentId: 'navLink',
                eventName: 'clicked'
            },
            host: null
        };
        openSpy = spyOn(window, 'open').and.returnValue(null);
    });

    afterEach(() => {
        window.history.replaceState({}, '', '/context.html');
    });

    it('should keep internal _blank URLs in the same tab', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/servicios?draftDomain=pamelabetancourt.preview', '_blank']);
        await Promise.resolve();

        expect(openSpy).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/servicios?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
    });

    it('should preserve debugWorkspace on internal same-tab navigation', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/acerca-de-mi?draftDomain=pamelabetancourt.preview']);
        await Promise.resolve();

        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/acerca-de-mi?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
    });

    it('should avoid double-encoding unicode internal routes', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview']);
        await Promise.resolve();

        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
    });

    it('should still open external _blank URLs in a new tab', () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['https://example.com/profile', '_blank']);

        expect(openSpy).toHaveBeenCalledOnceWith('https://example.com/profile', '_blank', 'noopener,noreferrer');
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
});
