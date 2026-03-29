import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { EventExecutionContext } from '../event-handler.types';
import { openModalHandler } from './legal-modal.handlers';
import { navigateToUrlHandler, setLanguageHandler } from './ui.handlers';
import { openFaqCtaWhatsAppHandler, openFinalCtaWhatsAppHandler, openWhatsAppHandler } from './whatsapp.handlers';

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

describe('openModalHandler', () => {
    let analytics: jasmine.SpyObj<AnalyticsService>;
    let modal: jasmine.SpyObj<GenericModalService>;
    let context: EventExecutionContext;

    beforeEach(() => {
        analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['track']);
        analytics.track.and.returnValue(Promise.resolve());
        modal = jasmine.createSpyObj<GenericModalService>('GenericModalService', ['open', 'close']);

        TestBed.configureTestingModule({
            providers: [
                { provide: AnalyticsService, useValue: analytics },
                { provide: GenericModalService, useValue: modal },
            ]
        });

        context = {
            event: {
                componentId: 'footerTermsButton',
                eventName: 'clicked'
            },
            host: null
        };
    });

    it('should open a payload-specified modal and optionally track it', () => {
        const handler = TestBed.runInInjectionContext(() => openModalHandler());

        handler.handle(context, ['terms-of-service', 'footer:terms', 'open_terms_modal', 'footer']);

        expect(modal.open).toHaveBeenCalledOnceWith({ id: 'terms-of-service' });
        expect(analytics.track).toHaveBeenCalledOnceWith(
            AnalyticsEvents.ActionTrigger,
            jasmine.objectContaining({
                label: 'footer:terms',
                meta: jasmine.objectContaining({
                    modalId: 'terms-of-service',
                    action: 'open_terms_modal',
                    location: 'footer',
                })
            })
        );
    });

    it('should no-op when the modal id is missing', () => {
        const handler = TestBed.runInInjectionContext(() => openModalHandler());

        handler.handle(context, []);

        expect(modal.open).not.toHaveBeenCalled();
        expect(analytics.track).not.toHaveBeenCalled();
    });
});

describe('whatsapp handlers', () => {
    let analytics: jasmine.SpyObj<AnalyticsService>;
    let variables: VariableStoreService;
    let context: EventExecutionContext;
    let openSpy: jasmine.Spy<(url?: string | URL, target?: string, features?: string) => Window | null>;

    beforeEach(() => {
        analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['track']);
        analytics.track.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            providers: [
                VariableStoreService,
                LanguageService,
                I18nService,
                { provide: AnalyticsService, useValue: analytics }
            ]
        });

        variables = TestBed.inject(VariableStoreService);
        variables.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563'
                    }
                }
            }
        } as any);

        const i18n = TestBed.inject(I18nService);
        i18n.setTranslations('es', {
            ui: {
                contact: {
                    whatsappMessage: 'Hola desde WhatsApp'
                },
                sections: {
                    faq: {
                        subtitle: 'Preguntas frecuentes'
                    }
                }
            },
            hero: {
                subtitle: 'Hero subtitle'
            }
        }, { applyIfCurrent: true });

        context = {
            event: {
                componentId: 'ctaButton',
                eventName: 'clicked'
            },
            host: null
        };
        openSpy = spyOn(window, 'open').and.returnValue(null);
    });

    it('should resolve the WhatsApp destination from draft variables', () => {
        const handler = TestBed.runInInjectionContext(() => openWhatsAppHandler());

        handler.handle(context, [AnalyticsEvents.CtaClick, 'hero', undefined]);

        expect(openSpy).toHaveBeenCalledOnceWith(
            'https://wa.me/525522699563?text=Hola%20desde%20WhatsApp',
            '_blank',
            'noopener,noreferrer'
        );
    });

    it('should no-op when the draft omits the WhatsApp destination', () => {
        variables.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {}
        } as any);

        const handler = TestBed.runInInjectionContext(() => openFinalCtaWhatsAppHandler());

        handler.handle(context, [AnalyticsEvents.CtaClick, 'primary']);

        expect(openSpy).not.toHaveBeenCalled();
    });

    it('should reuse the configured phone for FAQ CTA events', () => {
        const handler = TestBed.runInInjectionContext(() => openFaqCtaWhatsAppHandler());

        handler.handle(context, []);

        expect(openSpy).toHaveBeenCalledOnceWith(
            'https://wa.me/525522699563?text=Preguntas%20frecuentes',
            '_blank',
            'noopener,noreferrer'
        );
    });
});
