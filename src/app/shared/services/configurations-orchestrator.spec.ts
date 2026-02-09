import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import { AnalyticsService } from './analytics.service';
import { ComponentEventDispatcherService } from './component-event-dispatcher.service';
import { ConfigurationsOrchestratorService } from './configurations-orchestrator';
import { I18nService } from './i18n.service';
import { InteractiveProcessStoreService } from './interactive-process-store.service';
import { QuickStatsService } from './quick-stats.service';

describe('ConfigurationsOrchestratorService', () => {
  let service: ConfigurationsOrchestratorService;

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
            get: () => undefined,
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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
