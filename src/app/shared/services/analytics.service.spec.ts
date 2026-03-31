import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { ConfigStoreService } from './config-store.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('AnalyticsService', () => {
  it('tracks events and buffers them', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpClient,
          useValue: {
            post: jasmine.createSpy('post').and.returnValue(of({ ok: true })),
          } as any,
        },
      ],
    });
    const svc = TestBed.inject(AnalyticsService);
    spyOn(console, 'log');
    void svc.track('test_event', { category: 'test', label: 'A' });
    const buf = svc.flush();
    expect(buf.length).toBe(1);
    expect(buf[0].name).toBe('test_event');
    expect(buf[0].category).toBe('test');
    expect(buf[0].label).toBe('A');
    expect(typeof buf[0].timestamp).toBe('number');
  });

  it('replays recent events to late subscribers', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpClient,
          useValue: {
            post: jasmine.createSpy('post').and.returnValue(of({ ok: true })),
          } as any,
        },
      ],
    });

    const svc = TestBed.inject(AnalyticsService);
    const received: string[] = [];

    await svc.track('first_event', { category: 'test', label: 'one' });
    await svc.track('second_event', { category: 'test', label: 'two' });

    const subscription = svc.onEvent().subscribe((evt) => {
      received.push(evt.name);
    });

    expect(received).toEqual(['first_event', 'second_event']);

    subscription.unsubscribe();
  });

  it('resolves transport taxonomy from analytics config', () => {
    TestBed.configureTestingModule({
      providers: [
        ConfigStoreService,
        {
          provide: HttpClient,
          useValue: {
            post: jasmine.createSpy('post').and.returnValue(of({ ok: true })),
          } as any,
        },
      ],
    });

    const store = TestBed.inject(ConfigStoreService);
    store.setAnalytics({
      sectionIds: [],
      scrollMilestones: [],
      enabled: false,
      consentUI: 'none',
      consentSnoozeSeconds: 86400,
      events: { test_event: 'api_test_event' },
      categories: { test: 'api_test' },
    });

    const svc = TestBed.inject(AnalyticsService) as any;
    const resolved = svc.resolveTransportEvent({
      name: 'test_event',
      category: 'test',
      label: 'A',
      timestamp: Date.now(),
    });

    expect(resolved.name).toBe('api_test_event');
    expect(resolved.category).toBe('api_test');
  });

  it('resolves the analytics app identifier from runtime config', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'zoolandingpagecommx',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => slot,
            track: () => [],
          },
        },
        {
          provide: HttpClient,
          useValue: {
            post: jasmine.createSpy('post').and.returnValue(of({ ok: true })),
          } as any,
        },
      ],
    });

    const svc = TestBed.inject(AnalyticsService) as any;

    expect(svc.resolveAppName()).toBe('zoolandingpagecommx');
  });
});
