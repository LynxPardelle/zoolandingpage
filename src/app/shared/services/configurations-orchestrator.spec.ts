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
});
