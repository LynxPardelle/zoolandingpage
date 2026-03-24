import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import { AnalyticsService } from './analytics.service';
import { ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { ConfigurationsOrchestratorService } from './configurations-orchestrator';
import { I18nService } from './i18n.service';
import { InteractiveProcessStoreService } from './interactive-process-store.service';
import { QuickStatsService } from './quick-stats.service';
import { VariableStoreService } from './variable-store.service';

describe('ConfigurationsOrchestratorService', () => {
  let service: ConfigurationsOrchestratorService;
  let variables: VariableStoreService;
  let i18n: I18nService;

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
            modalRef: () => null,
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
        {
          provide: InteractiveProcessStoreService,
          useValue: { currentStep: signal(0) } as any,
        },
      ],
    });
    service = TestBed.inject(ConfigurationsOrchestratorService);
    variables = TestBed.inject(VariableStoreService);
    i18n = TestBed.inject(I18nService);
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
        footerSocialLinks: [
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
            path: 'footerSocialLinks',
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

  it('returns false when interactive process variable config is missing', () => {
    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {},
    });

    expect(service.hasValidInteractiveProcessConfig).toBeFalse();
  });

  it('returns true when interactive process variable config is valid', () => {
    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        processSection: {
          titleKey: 'landing.processSection.title',
          steps: [
            {
              step: 1,
              titleKey: 'landing.process.0.title',
              descriptionKey: 'landing.process.0.description',
              detailedDescriptionKey: 'landing.process.0.detailedDescription',
              durationKey: 'landing.process.0.duration',
              deliverablesKey: 'landing.process.0.deliverables',
            },
          ],
        },
      },
    });

    expect(service.hasValidInteractiveProcessConfig).toBeTrue();
  });

  it('keeps footer sections hidden when footerConfig payload is missing', () => {
    variables.setPayload(null);

    const footerConfig = service.footerConfig;
    expect(footerConfig['showLegalLinks']).toBeFalse();
    expect(footerConfig['showSocialLinks']).toBeFalse();
    expect(footerConfig['showCopyright']).toBeFalse();
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
          { id: 'home', sectionId: 'home', labelEn: 'Home', labelEs: 'Inicio' },
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
            sectionId: 'home',
            labelKey: 'navigation.links.home.label',
            ariaLabelKey: 'navigation.links.home.aria',
            labelEn: 'Home Fallback',
            labelEs: 'Inicio Fallback',
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

  it('allows external draft components to override built-in ids while keeping missing built-in ids available', () => {
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
    expect(service.getComponentById('siteHeader')).toBeDefined();
    expect(console.error).not.toHaveBeenCalled();
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
