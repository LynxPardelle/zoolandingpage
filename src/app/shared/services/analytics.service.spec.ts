import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsCategories, AnalyticsEvents } from './analytics.events';
import { AnalyticsService } from './analytics.service';
import { ConfigStoreService } from './config-store.service';
import { QuickStatsService } from './quick-stats.service';
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

  it('does not send remote analytics when debug mode is enabled but analytics is disabled', async () => {
    const post = jasmine.createSpy('post').and.returnValue(of({ ok: true }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'zoolandingpagecommx',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => true,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => slot,
            track: () => [],
          },
        },
        {
          provide: HttpClient,
          useValue: { post } as any,
        },
      ],
    });

    const svc = TestBed.inject(AnalyticsService);

    await svc.track('test_event', { category: 'test', label: 'A' });

    expect(post).not.toHaveBeenCalled();
  });

  it('does not bump remote quick stats when analytics is disabled', () => {
    const quickStats = jasmine.createSpyObj<QuickStatsService>('QuickStatsService', ['inc', 'getNumber']);
    quickStats.inc.and.returnValue(of({ ok: true }));
    quickStats.getNumber.and.returnValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ConfigStoreService,
        {
          provide: QuickStatsService,
          useValue: quickStats,
        },
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

    const store = TestBed.inject(ConfigStoreService);
    store.setAnalytics({
      sectionIds: [],
      scrollMilestones: [],
      enabled: false,
      consentUI: 'none',
      consentSnoozeSeconds: 86400,
      quickStats: {
        pageView: { event: 'page_view', path: 'metrics.pageViews', by: 1 },
      },
    });

    const svc = TestBed.inject(AnalyticsService);
    svc.initializeRuntimeState();

    expect(quickStats.inc).not.toHaveBeenCalled();
  });

  it('falls back to default engagement milestones when none are configured', () => {
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

    const svc = TestBed.inject(AnalyticsService) as any;

    expect(svc.resolveScrollMilestones([])).toEqual([25, 50, 75, 100]);
    expect(svc.resolveScrollMilestones([50, 25, 50, 100])).toEqual([25, 50, 100]);
  });

  it('falls back to section ids found in the rendered document when none are configured', () => {
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

    const svc = TestBed.inject(AnalyticsService) as any;
    const doc = document.implementation.createHTMLDocument('analytics');
    doc.body.innerHTML = `
      <section id="home"></section>
      <div id="ignored"></div>
      <section id="games-section"></section>
    `;

    expect(svc.resolveSectionIds([], doc)).toEqual(['home', 'games-section']);
    expect(svc.resolveSectionIds(['custom-section'], doc)).toEqual(['custom-section']);
  });

  it('tracks in-page anchor clicks through the centralized engagement listener', () => {
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
    spyOn(svc, 'track').and.returnValue(Promise.resolve());

    const doc = document.implementation.createHTMLDocument('analytics');
    const anchor = doc.createElement('a');
    anchor.setAttribute('href', '#games-section');
    anchor.textContent = 'Juegos';
    doc.body.appendChild(anchor);

    svc.startPageEngagementTracking({ sectionIds: [], scrollMilestones: [] }, doc);
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(svc.track).toHaveBeenCalledWith(AnalyticsEvents.NavClick, {
      category: AnalyticsCategories.Navigation,
      label: 'games-section',
      meta: {
        href: '#games-section',
        navigationType: 'in-page',
      },
    });

    svc.stopPageEngagementTracking();
  });

  it('skips centralized nav click tracking when the link already declares nav_click in its DSL instructions', () => {
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
    spyOn(svc, 'track').and.returnValue(Promise.resolve());

    const doc = document.implementation.createHTMLDocument('analytics');
    const anchor = doc.createElement('a');
    anchor.setAttribute('href', '#features-section');
    anchor.setAttribute('data-event-instructions', 'trackEvent:nav_click,navigation,event.eventData;navigationToSection:event.eventData');
    doc.body.appendChild(anchor);

    svc.startPageEngagementTracking({ sectionIds: [], scrollMilestones: [] }, doc);
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(svc.track).not.toHaveBeenCalledWith(AnalyticsEvents.NavClick, jasmine.anything());

    svc.stopPageEngagementTracking();
  });

  it('picks the real scroll container when body is taller than the document element', () => {
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

    const svc = TestBed.inject(AnalyticsService) as any;
    const doc = document.implementation.createHTMLDocument('analytics');

    Object.defineProperty(doc.documentElement, 'scrollHeight', { configurable: true, value: 845 });
    Object.defineProperty(doc.documentElement, 'clientHeight', { configurable: true, value: 845 });
    Object.defineProperty(doc.body, 'scrollHeight', { configurable: true, value: 19406 });
    Object.defineProperty(doc.body, 'clientHeight', { configurable: true, value: 845 });

    expect(svc.resolveScrollElement(doc)).toBe(doc.body);
  });
});
