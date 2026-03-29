import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import { AnalyticsService } from './analytics.service';
import { ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { ConfigurationsOrchestratorService } from './configurations-orchestrator';
import { I18nService } from './i18n.service';
import { QuickStatsService } from './quick-stats.service';
import { VariableStoreService } from './variable-store.service';

describe('ConfigurationsOrchestratorService', () => {
  let service: ConfigurationsOrchestratorService;
  let variables: VariableStoreService;
  let i18n: I18nService;
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
          provide: QuickStatsService,
          useValue: { remoteStats: signal(undefined) } as any,
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

  it('uses live analytics time fallback without an arbitrary minimum floor', () => {
    (service as any).analytics.getSessionEventCount = () => 7;

    expect(service.statsStripAverageTimeFallback()).toBe(35);
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

  it('materializes dynamic text loops from i18n strings and objects', () => {
    spyOn(i18n, 'get').and.callFake(((key: string) => {
      if (key === 'footer.legal.data.points') {
        return ['Point A', 'Point B'];
      }
      if (key === 'footer.legal.terms.sections') {
        return [
          { title: 'Section 1', text: 'Body 1' },
          { title: 'Section 2', body: 'Body 2' },
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
          loopConfig: { source: 'i18n', path: 'footer.legal.data.points', templateId: 'textTemplate', idPrefix: 'pointText' },
          config: { tag: 'ul', components: [] },
        },
        sectionsSection: {
          id: 'sectionsSection',
          type: 'container',
          loopConfig: { source: 'i18n', path: 'footer.legal.terms.sections', templateId: 'textTemplate', idPrefix: 'sectionText' },
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
    expect(sectionTwo?.config?.text).toBe('Section 2: Body 2');
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
          eventInstructions: 'trackNavClick:event.eventData,event.eventData;navigationToSection:event.eventData',
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
          eventInstructions: 'trackNavClick:event.eventData,event.eventData;navigationToSection:event.eventData',
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
