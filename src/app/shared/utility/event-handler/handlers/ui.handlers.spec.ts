import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { openModalHandler } from './legal-modal.handlers';
import { navigateToUrlHandler, navigateWithScopeQueryHandler, setLanguageHandler } from './ui.handlers';
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
    let context: EventExecutionContext;
    let openSpy: jasmine.Spy<(url?: string | URL, target?: string, features?: string) => Window | null>;

    beforeEach(() => {
        window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true');

        TestBed.configureTestingModule({
            providers: []
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

        handler.handle(context, ['/servicios?draftDomain=pamelabetancourt.com', '_blank']);
        await Promise.resolve();

        expect(openSpy).not.toHaveBeenCalled();
        expect(window.location.pathname + window.location.search).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    });

    it('should preserve debugWorkspace on internal same-tab navigation', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/acerca-de-mi?draftDomain=pamelabetancourt.com']);
        await Promise.resolve();

        expect(window.location.pathname + window.location.search).toBe('/acerca-de-mi?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    });

    it('should preserve the active draftDomain on internal navigation when the target omits it', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/servicios']);
        await Promise.resolve();

        expect(window.location.pathname + window.location.search).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    });

    it('should optionally scroll to top on internal same-tab navigation', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());
        const scrollTo = spyOn(window, 'scrollTo');

        handler.handle(context, ['/servicios', '_self', 'top']);
        await Promise.resolve();

        expect(window.location.pathname + window.location.search).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo.calls.argsFor(0)[0] as ScrollToOptions).toEqual({ top: 0, left: 0, behavior: 'auto' });
    });

    it('should avoid double-encoding unicode internal routes', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['/cont%C3%A1ctame?draftDomain=pamelabetancourt.com']);
        await Promise.resolve();

        expect(window.location.pathname + window.location.search).toBe('/cont%C3%A1ctame?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    });

    it('should still open external _blank URLs in a new tab', () => {
        const handler = TestBed.runInInjectionContext(() => navigateToUrlHandler());

        handler.handle(context, ['https://example.com/profile', '_blank']);

        expect(openSpy).toHaveBeenCalledOnceWith('https://example.com/profile', '_blank', 'noopener,noreferrer');
        expect(window.location.pathname + window.location.search).toBe('/home?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    });
});

describe('navigateWithScopeQueryHandler', () => {
    let context: EventExecutionContext;

    beforeEach(() => {
        window.history.replaceState({}, '', '/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false&move=mega-punch');
        TestBed.configureTestingModule({
            providers: []
        });
        context = {
            event: {
                componentId: 'pokemonCatalogView',
                eventName: 'submitScope',
                eventData: {
                    values: {
                        search: 'Lucario ',
                        type: 'all',
                        attack: 'aura-sphere',
                        sort: 'number-desc',
                        page: 3,
                        pageSize: 8,
                    },
                },
            },
            host: null,
        };
    });

    afterEach(() => {
        window.history.replaceState({}, '', '/context.html');
    });

    it('builds a fresh internal URL from submitted scope values and preserves draft query params', async () => {
        const handler = TestBed.runInInjectionContext(() => navigateWithScopeQueryHandler());

        handler.handle(context, [
            '/',
            '#pokemon-grid',
            'pokemon=values.search',
            'type=values.type',
            'move=values.attack',
            'sort=values.sort',
            'page=values.page',
            'pageSize=values.pageSize',
        ]);
        await Promise.resolve();

        expect(window.location.pathname + window.location.search + window.location.hash).toBe(
            '/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false&pokemon=Lucario&move=aura-sphere&sort=number-desc&page=3&pageSize=8#pokemon-grid'
        );
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
    let language: LanguageService;
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

        language = TestBed.inject(LanguageService);
        language.configureLanguages(['es'], { defaultLanguage: 'es', requestedLanguage: 'es' });
        variables = TestBed.inject(VariableStoreService);
        variables.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        whatsappMessageKey: 'ui.contact.whatsappMessage',
                        faqMessageKey: 'ui.sections.faq.subtitle',
                        finalCtaMessageKey: 'hero.subtitle'
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

    it('should still open the WhatsApp phone link when the general CTA omits its configured message key', () => {
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

        const handler = TestBed.runInInjectionContext(() => openWhatsAppHandler());

        handler.handle(context, [AnalyticsEvents.CtaClick, 'hero', undefined]);

        expect(openSpy).toHaveBeenCalledOnceWith(
            'https://wa.me/525522699563',
            '_blank',
            'noopener,noreferrer'
        );
    });

    it('should no-op when the FAQ CTA message key is missing', () => {
        variables.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        whatsappMessageKey: 'ui.contact.whatsappMessage'
                    }
                }
            }
        } as any);

        const handler = TestBed.runInInjectionContext(() => openFaqCtaWhatsAppHandler());

        handler.handle(context, []);

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

    it('should no-op when the final CTA message key is missing', () => {
        variables.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        whatsappMessageKey: 'ui.contact.whatsappMessage'
                    }
                }
            }
        } as any);

        const handler = TestBed.runInInjectionContext(() => openFinalCtaWhatsAppHandler());

        handler.handle(context, [AnalyticsEvents.CtaClick, 'primary']);

        expect(openSpy).not.toHaveBeenCalled();
    });
});
