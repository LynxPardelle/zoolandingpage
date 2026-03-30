import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import { AnalyticsService } from './analytics.service';
import { ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { ConfigurationsOrchestratorService } from './configurations-orchestrator';
import { I18nService } from './i18n.service';
import { LanguageService } from './language.service';
import { VariableStoreService } from './variable-store.service';

describe('ConfigurationsOrchestratorService', () => {
  let service: ConfigurationsOrchestratorService;
  let variables: VariableStoreService;
  let i18n: I18nService;
  let language: LanguageService;
  const modalRefSignal = signal<any>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            consentVisible: signal(false),
            track: async () => { },
            flush: () => [],
            getPageViewCount: () => 0,
            getEventCount: () => 0,
            getSessionEventCount: () => 0,
          } as any,
        },
        {
          provide: GenericModalService,
          useValue: {
            modalRef: () => modalRefSignal(),
            open: () => ({ id: 'test-modal', close: () => { } }),
            close: () => { },
            analyticsEvents$: undefined,
          } as any,
        },
        {
          provide: I18nService,
          useValue: {
            t: (key: string) => key,
            get: (key: string) => {
              if (key === 'features') {
                return [
                  { title: 'Feature 1', description: 'Desc 1' },
                  { title: 'Feature 2', description: 'Desc 2' },
                ];
              }
              return undefined;
            },
            getOr: <T>(_key: string, fallback: T) => fallback,
          } as any,
        },
        {
          provide: ComponentEventDispatcherService,
          useValue: { dispatch: () => { } } as any,
        },
      ],
    });
    service = TestBed.inject(ConfigurationsOrchestratorService);
    variables = TestBed.inject(VariableStoreService);
    i18n = TestBed.inject(I18nService);
    language = TestBed.inject(LanguageService);
    modalRefSignal.set(null);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('materializes loopConfig from variables into generated link components', () => {
    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        socialLinks: [
          { url: 'https://example.com/a', icon: 'A', ariaLabel: 'A label' },
          { url: 'https://example.com/b', icon: 'B', ariaLabel: 'B label' },
        ],
      },
    });

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        footerSocialLinkTemplate: {
          id: 'footerSocialLinkTemplate',
          type: 'link',
          config: {
            id: 'footerSocialLinkTemplate',
            href: '#',
            text: '',
            ariaLabel: '',
          },
        },
        footerSocialSection: {
          id: 'footerSocialSection',
          type: 'container',
          loopConfig: {
            source: 'var',
            path: 'socialLinks',
            templateId: 'footerSocialLinkTemplate',
            idPrefix: 'footerSocialLink',
            bindings: [
              { to: 'config.href', sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }] },
              { to: 'config.text', sources: ['icon', { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.ariaLabel', sources: [{ from: 'ariaLabelKey', transform: 'i18nKey' }, { from: 'ariaLabel', transform: 'locale' }, { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.target', sources: ['target'] },
              { to: 'config.rel', sources: ['rel'] },
            ],
          },
          config: {
            tag: 'div',
            components: [],
          },
        },
      },
    });

    const section = service.getComponentById('footerSocialSection') as any;
    expect(section?.config?.components).toEqual(['footerSocialLink__1', 'footerSocialLink__2']);

    const firstLink = service.getComponentById('footerSocialLink__1') as any;
    expect(firstLink?.config?.href).toBe('https://example.com/a');
    expect(firstLink?.config?.text).toBe('A');
    expect(firstLink?.config?.ariaLabel).toBe('A label');
  });

  it('uses key-based footer social aria labels while keeping icon text', () => {
    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'footer.social.facebook.label') return 'Facebook';
      if (key === 'footer.social.facebook.ariaLabel') return 'Visit our Facebook page';
      return undefined;
    }) as any);

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        socialLinks: [
          {
            url: 'https://example.com/facebook',
            icon: '📘',
            labelKey: 'footer.social.facebook.label',
            ariaLabelKey: 'footer.social.facebook.ariaLabel',
          },
        ],
      },
    });

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        footerSocialLinkTemplate: {
          id: 'footerSocialLinkTemplate',
          type: 'link',
          config: {
            id: 'footerSocialLinkTemplate',
            href: '#',
            text: '',
            ariaLabel: '',
          },
        },
        footerSocialSection: {
          id: 'footerSocialSection',
          type: 'container',
          loopConfig: {
            source: 'var',
            path: 'socialLinks',
            templateId: 'footerSocialLinkTemplate',
            idPrefix: 'footerSocialLink',
            bindings: [
              { to: 'config.href', sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }] },
              { to: 'config.text', sources: ['icon', { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.ariaLabel', sources: [{ from: 'ariaLabelKey', transform: 'i18nKey' }, { from: 'ariaLabel', transform: 'locale' }, { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.target', sources: ['target'] },
              { to: 'config.rel', sources: ['rel'] },
            ],
          },
          config: {
            tag: 'div',
            components: [],
          },
        },
      },
    });

    const firstLink = service.getComponentById('footerSocialLink__1') as any;
    expect(firstLink?.config?.text).toBe('📘');
    expect(firstLink?.config?.ariaLabel).toBe('Visit our Facebook page');
  });

  it('materializes repeat and i18n loop sources', () => {
    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        textTemplate: {
          id: 'textTemplate',
          type: 'text',
          config: { tag: 'span', text: '' },
        },
        repeatSection: {
          id: 'repeatSection',
          type: 'container',
          loopConfig: { source: 'repeat', count: 3, templateId: 'textTemplate', idPrefix: 'repeatText' },
          config: { tag: 'div', components: [] },
        },
        featuresSection: {
          id: 'featuresSection',
          type: 'container',
          loopConfig: { source: 'i18n', path: 'features', templateId: 'textTemplate', idPrefix: 'featureText' },
          config: { tag: 'div', components: [] },
        },
      },
    });

    const repeat = service.getComponentById('repeatSection') as any;
    expect(repeat?.config?.components).toEqual(['repeatText__1', 'repeatText__2', 'repeatText__3']);

    const features = service.getComponentById('featuresSection') as any;
    expect(features?.config?.components).toEqual(['featureText__1', 'featureText__2']);
  });

  it('materializes host loop sources against the provided render host', () => {
    service.setAuxiliaryComponentsFromPayload('debug-workspace', {
      version: 1,
      pageId: 'default',
      domain: 'debug-workspace',
      components: {
        debugDraftButtonTemplate: {
          id: 'debugDraftButtonTemplate',
          type: 'button',
          config: {
            label: '',
            classes: '',
            ariaLabel: '',
          },
        },
        debugDraftButtons: {
          id: 'debugDraftButtons',
          type: 'container',
          loopConfig: {
            source: 'host',
            path: 'draftOptions',
            templateId: 'debugDraftButtonTemplate',
            idPrefix: 'debugDraftButton',
            bindings: [
              { to: 'config.label', sources: ['label'] },
              { to: 'config.classes', sources: ['buttonClasses'] },
              { to: 'config.ariaLabel', sources: ['ariaLabel'] },
              { to: 'meta_title', sources: ['key'] },
            ],
          },
          config: {
            tag: 'div',
            components: [],
          },
        },
      },
    });

    const host = {
      draftOptions: [
        {
          key: 'preview.example.test::default',
          label: 'Preview / default',
          buttonClasses: 'active',
          ariaLabel: 'Open draft Preview / default',
        },
        {
          key: 'music.example.test::default',
          label: 'Music / default',
          buttonClasses: 'inactive',
          ariaLabel: 'Open draft Music / default',
        },
      ],
    };

    const section = service.getComponentById('debugDraftButtons', host) as any;
    expect(section?.config?.components).toEqual(['debugDraftButton__1', 'debugDraftButton__2']);

    const firstButton = service.getComponentById('debugDraftButton__1', host) as any;
    expect(firstButton?.config?.label).toBe('Preview / default');
    expect(firstButton?.config?.classes).toBe('active');
    expect(firstButton?.meta_title).toBe('preview.example.test::default');
  });

  it('resolves legal modal host config from the variables payload', () => {
    spyOn(i18n, 't').and.callFake(((key: string) => key === 'footer.legal.terms.title' ? 'Terms of Service' : key) as any);
    modalRefSignal.set({ id: 'terms-of-service', close: () => { } });

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        ui: {
          modals: {
            'terms-of-service': {
              size: 'lg',
              ariaLabelKey: 'footer.legal.terms.title',
            },
          },
        },
      },
    });

    const config = service.modalHostConfig();

    expect(config.size).toBe('lg');
    expect(config.ariaLabel).toBe('Terms of Service');
    expect(config.showCloseButton).toBeTrue();
    expect(config.closeOnBackdrop).toBeTrue();
  });

  it('merges ui.modals._default with modal-specific overrides', () => {
    spyOn(i18n, 't').and.callFake(((key: string) => key === 'footer.legal.data.title' ? 'Data Use' : key) as any);
    modalRefSignal.set({ id: 'data-use', close: () => { } });

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        theme: {
          palettes: {
            light: {
              bgColor: '#ffffff',
              textColor: '#111111',
              titleColor: '#222222',
              linkColor: '#333333',
              accentColor: '#444444',
              secondaryBgColor: '#f5f5f5',
              secondaryTextColor: '#555555',
              secondaryTitleColor: '#666666',
              secondaryLinkColor: '#777777',
              secondaryAccentColor: '#888888',
              successColor: '#198754',
              onSuccessColor: '#052e1c',
              errorColor: '#dc3545',
              onErrorColor: '#3b0a10',
              warningColor: '#f59e0b',
              onWarningColor: '#3a2400',
              infoColor: '#0d6efd',
              onInfoColor: '#041b44',
            },
            dark: {
              bgColor: '#000000',
              textColor: '#fefefe',
              titleColor: '#efefef',
              linkColor: '#dddddd',
              accentColor: '#cccccc',
              secondaryBgColor: '#111111',
              secondaryTextColor: '#bbbbbb',
              secondaryTitleColor: '#aaaaaa',
              secondaryLinkColor: '#999999',
              secondaryAccentColor: '#123456',
              successColor: '#32d583',
              onSuccessColor: '#f3fff8',
              errorColor: '#ff6b6b',
              onErrorColor: '#fff5f5',
              warningColor: '#f5b942',
              onWarningColor: '#fff7e6',
              infoColor: '#58a6ff',
              onInfoColor: '#f5fbff',
            },
          },
        },
        ui: {
          modals: {
            _default: {
              closeOnBackdrop: false,
              showCloseButton: false,
              accentColor: 'secondaryAccentColor',
              panelClasses: 'modal-shell',
            },
            'data-use': {
              size: 'md',
              ariaLabelKey: 'footer.legal.data.title',
              showCloseButton: true,
            },
          },
        },
      },
    });

    const config = service.modalHostConfig();

    expect(config.size).toBe('md');
    expect(config.ariaLabel).toBe('Data Use');
    expect(config.closeOnBackdrop).toBeFalse();
    expect(config.showCloseButton).toBeTrue();
    expect(config.panelClasses).toBe('modal-shell');
    expect(config.accentColor).toBe('secondaryAccentColor');
  });

  it('reads analytics consent modal behavior from payload-owned ui.modals config', () => {
    modalRefSignal.set({ id: 'analytics-consent', close: () => { } });

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        ui: {
          modals: {
            'analytics-consent': {
              closeOnBackdrop: false,
              showCloseButton: false,
              variant: 'dialog',
              ariaLabelKey: 'ui.accessibility.analyticsConsentDialog',
            },
          },
        },
      },
    });

    const config = service.modalHostConfig();

    expect(config.showCloseButton).toBeFalse();
    expect(config.closeOnBackdrop).toBeFalse();
    expect(config.variant).toBe('dialog');
  });

  it('materializes explicit text loop bindings from i18n strings and objects', () => {
    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'footer.legal.data.points') {
        return ['Point A', 'Point B'];
      }
      if (key === 'footer.legal.terms.sections') {
        return [
          { body: 'Body 1' },
          { body: 'Body 2' },
        ];
      }
      if (key === 'features') {
        return [
          { title: 'Feature 1', description: 'Desc 1' },
          { title: 'Feature 2', description: 'Desc 2' },
        ];
      }
      return undefined;
    }) as any);

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        textTemplate: {
          id: 'textTemplate',
          type: 'text',
          config: { tag: 'p', text: '' },
        },
        pointsSection: {
          id: 'pointsSection',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'footer.legal.data.points',
            templateId: 'textTemplate',
            idPrefix: 'pointText',
            bindings: [{ to: 'config.text', sources: ['$item'] }],
          },
          config: { tag: 'ul', components: [] },
        },
        sectionsSection: {
          id: 'sectionsSection',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'footer.legal.terms.sections',
            templateId: 'textTemplate',
            idPrefix: 'sectionText',
            bindings: [{ to: 'config.text', sources: ['body'] }],
          },
          config: { tag: 'div', components: [] },
        },
      },
    });

    const pointOne = service.getComponentById('pointText__1') as any;
    const pointTwo = service.getComponentById('pointText__2') as any;
    expect(pointOne?.config?.text).toBe('Point A');
    expect(pointTwo?.config?.text).toBe('Point B');

    const sectionOne = service.getComponentById('sectionText__1') as any;
    const sectionTwo = service.getComponentById('sectionText__2') as any;
    expect(sectionOne?.config?.text).toBe('Body 1');
    expect(sectionTwo?.config?.text).toBe('Body 2');
  });

  it('materializes explicit generic-card loop bindings and preserves CTA dispatch', () => {
    const dispatcher = TestBed.inject(ComponentEventDispatcherService) as any;
    const dispatchSpy = spyOn(dispatcher, 'dispatch');

    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'services') {
        return [
          {
            icon: 'rocket_launch',
            title: 'Launch faster',
            description: 'A measurable landing page service.',
            benefits: ['Fast setup'],
            buttonLabel: 'Request info',
          },
        ];
      }

      if (key === 'testimonials') {
        return [
          {
            name: 'Ada',
            role: 'Founder',
            company: 'Example Co',
            content: 'Excellent work.',
            rating: 5,
            avatar: 'A',
            verified: true,
          },
        ];
      }

      return undefined;
    }) as any);

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        servicesCardTemplate: {
          id: 'servicesCardTemplate',
          type: 'generic-card',
          meta_title: 'services_cta_click',
          eventInstructions: 'openWhatsApp:event.meta_title,services,event.eventData.label',
          config: {
            variant: 'feature',
            icon: '',
            title: '',
            description: '',
            benefits: [],
            buttonLabel: '',
          },
        },
        servicesSectionGrid: {
          id: 'servicesSectionGrid',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'services',
            templateId: 'servicesCardTemplate',
            idPrefix: 'servicesCard',
            bindings: [
              { to: 'config.icon', sources: ['icon'] },
              { to: 'config.title', sources: ['title'] },
              { to: 'config.description', sources: ['description'] },
              { to: 'config.benefits', sources: ['benefits'] },
              { to: 'config.buttonLabel', sources: ['buttonLabel'] },
            ],
          },
          config: { tag: 'div', components: [] },
        },
        testimonialsCardTemplate: {
          id: 'testimonialsCardTemplate',
          type: 'generic-card',
          config: {
            variant: 'testimonial',
            name: '',
            role: '',
            company: '',
            content: '',
            rating: 0,
            avatar: '',
            verified: false,
          },
        },
        testimonialsSectionGrid: {
          id: 'testimonialsSectionGrid',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'testimonials',
            templateId: 'testimonialsCardTemplate',
            idPrefix: 'testimonialsCard',
            bindings: [
              { to: 'config.name', sources: ['name'] },
              { to: 'config.role', sources: ['role'] },
              { to: 'config.company', sources: ['company'] },
              { to: 'config.content', sources: ['content'] },
              { to: 'config.rating', sources: ['rating'] },
              { to: 'config.avatar', sources: ['avatar'] },
              { to: 'config.verified', sources: ['verified'] },
            ],
          },
          config: { tag: 'div', components: [] },
        },
      },
    });

    const serviceCard = service.getComponentById('servicesCard__1') as any;
    expect(serviceCard?.config?.title).toBe('Launch faster');
    expect(serviceCard?.config?.benefits).toEqual(['Fast setup']);
    expect(serviceCard?.config?.buttonLabel).toBe('Request info');
    expect(typeof serviceCard?.config?.onCta).toBe('function');

    serviceCard.config.onCta('Request info');
    expect(dispatchSpy).toHaveBeenCalled();

    const testimonialCard = service.getComponentById('testimonialsCard__1') as any;
    expect(testimonialCard?.config?.name).toBe('Ada');
    expect(testimonialCard?.config?.company).toBe('Example Co');
    expect(testimonialCard?.config?.verified).toBeTrue();
  });

  it('resolves generic loop index placeholders for nested generated child ids', () => {
    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'hero.badges') {
        return ['Badge A', 'Badge B'];
      }
      return undefined;
    }) as any);

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        badgesListContainer: {
          id: 'badgesListContainer',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'hero.badges',
            templateId: 'badgeContainerTemplate',
            idPrefix: 'badgeContainer',
          },
          config: {
            tag: 'div',
            components: [],
          },
        },
        badgeContainerTemplate: {
          id: 'badgeContainerTemplate',
          type: 'container',
          config: {
            tag: 'div',
            components: ['badgePoint', 'badgeText__{{index}}'],
          },
        },
        badgePoint: {
          id: 'badgePoint',
          type: 'container',
          config: { tag: 'span' },
        },
        badgeTextTemplate: {
          id: 'badgeTextTemplate',
          type: 'text',
          loopConfig: {
            source: 'i18n',
            path: 'hero.badges',
            templateId: 'badgeTextTemplate',
            idPrefix: 'badgeText',
            bindings: [{ to: 'config.text', sources: ['$item'] }],
          },
          config: { tag: 'span', text: '' },
        },
      },
    });

    const firstBadge = service.getComponentById('badgeContainer__1') as any;
    const secondBadgeText = service.getComponentById('badgeText__2') as any;

    expect(firstBadge?.config?.components).toEqual(['badgePoint', 'badgeText__1']);
    expect(secondBadgeText?.config?.text).toBe('Badge B');
  });

  it('returns empty navigation when API navigation payload is missing', () => {
    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {},
    });

    expect(service.navigation).toEqual([]);
  });

  it('materializes header navigation link template from variable navigation payload', () => {
    language.configureLanguages(['es', 'en'], { defaultLanguage: 'es', requestedLanguage: 'es' });

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        navigation: [
          { id: 'home', value: 'home', label: { en: 'Home', es: 'Inicio', default: 'Home' } },
        ],
      },
    });

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        headerNavLinkTemplate: {
          id: 'headerNavLinkTemplate',
          type: 'link',
          eventInstructions: 'trackEvent:nav_click,navigation,event.eventData,href,event.eventData;navigationToSection:event.eventData',
          config: {
            id: 'headerNavLinkTemplate',
            href: '',
            text: '',
          },
        },
        headerDesktopNavLinks: {
          id: 'headerDesktopNavLinks',
          type: 'container',
          loopConfig: {
            source: 'var',
            path: 'navigation',
            templateId: 'headerNavLinkTemplate',
            idPrefix: 'headerNavLink',
            bindings: [
              { to: 'config.href', sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }] },
              { to: 'config.text', sources: [{ from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.ariaLabel', sources: [{ from: 'ariaLabelKey', transform: 'i18nKey' }, { from: 'ariaLabel', transform: 'locale' }, { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
            ],
          },
          config: {
            tag: 'ul',
            components: [],
          },
        },
      },
    });

    const generated = service.getComponentById('headerNavLink__1') as any;
    expect(generated?.config?.href).toBe('#home');
    expect(generated?.config?.text).toBe('Inicio');
  });

  it('uses labelKey and ariaLabelKey for loop-materialized links when available', () => {
    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'navigation.links.home.label') return 'Inicio API';
      if (key === 'navigation.links.home.aria') return 'Ir a inicio';
      if (key === 'features') {
        return [
          { title: 'Feature 1', description: 'Desc 1' },
          { title: 'Feature 2', description: 'Desc 2' },
        ];
      }
      return undefined;
    }) as any);

    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        navigation: [
          {
            id: 'home',
            value: 'home',
            labelKey: 'navigation.links.home.label',
            ariaLabelKey: 'navigation.links.home.aria',
            label: { en: 'Home Fallback', es: 'Inicio Fallback', default: 'Home Fallback' },
          },
        ],
      },
    });

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        headerNavLinkTemplate: {
          id: 'headerNavLinkTemplate',
          type: 'link',
          eventInstructions: 'trackEvent:nav_click,navigation,event.eventData,href,event.eventData;navigationToSection:event.eventData',
          config: {
            id: 'headerNavLinkTemplate',
            href: '',
            text: '',
            ariaLabel: '',
          },
        },
        headerDesktopNavLinks: {
          id: 'headerDesktopNavLinks',
          type: 'container',
          loopConfig: {
            source: 'var',
            path: 'navigation',
            templateId: 'headerNavLinkTemplate',
            idPrefix: 'headerNavLink',
            bindings: [
              { to: 'config.href', sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }] },
              { to: 'config.text', sources: [{ from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
              { to: 'config.ariaLabel', sources: [{ from: 'ariaLabelKey', transform: 'i18nKey' }, { from: 'ariaLabel', transform: 'locale' }, { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }] },
            ],
          },
          config: {
            tag: 'ul',
            components: [],
          },
        },
      },
    });

    const generated = service.getComponentById('headerNavLink__1') as any;
    expect(generated?.config?.href).toBe('#home');
    expect(generated?.config?.text).toBe('Inicio API');
    expect(generated?.config?.ariaLabel).toBe('Ir a inicio');
  });

  it('uses only external draft components when built-in component stores are removed', () => {
    spyOn(console, 'error');

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'despacholegalastralex.com',
      components: {
        siteFooter: {
          id: 'siteFooter',
          type: 'text',
          config: { tag: 'p', text: 'External footer override' },
        },
      },
    });

    expect((service.getComponentById('siteFooter') as any)?.config?.text).toBe('External footer override');
    expect(service.getComponentById('siteHeader')).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('does not warn about unresolved loop sources when only collecting classes', () => {
    const warnSpy = spyOn(console, 'warn');

    service.setExternalComponentsFromPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      components: {
        missingLoopTemplate: {
          id: 'missingLoopTemplate',
          type: 'text',
          config: { tag: 'span', text: '', classes: 'ank-color-textColor' },
        },
        missingLoopSection: {
          id: 'missingLoopSection',
          type: 'container',
          loopConfig: {
            source: 'i18n',
            path: 'hero.badges',
            templateId: 'missingLoopTemplate',
            idPrefix: 'missingLoopItem',
          },
          config: {
            tag: 'div',
            components: [],
            classes: 'ank-display-flex',
          },
        },
      },
    });

    const classes = service.getAllTheClassesFromComponents();

    expect(classes).toContain('ank-display-flex');
    expect(warnSpy).not.toHaveBeenCalledWith('[ConfigurationsOrchestrator] loopConfig i18n source is not an array at path: hero.badges');
  });
});
