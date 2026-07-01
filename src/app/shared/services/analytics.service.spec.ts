import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsCategories, AnalyticsEvents } from './analytics.events';
import { AnalyticsService } from './analytics.service';
import { ConfigStoreService } from './config-store.service';
import { GoogleTagService } from './google-tag.service';
import { QuickStatsService } from './quick-stats.service';
import { RuntimeConfigService } from './runtime-config.service';

const nativeHistoryPushState = History.prototype.pushState;
const nativeHistoryReplaceState = History.prototype.replaceState;

const restoreNativeHistoryStateMethods = (): void => {
  Object.defineProperty(window.history, 'pushState', {
    configurable: true,
    writable: true,
    value: nativeHistoryPushState.bind(window.history),
  });
  Object.defineProperty(window.history, 'replaceState', {
    configurable: true,
    writable: true,
    value: nativeHistoryReplaceState.bind(window.history),
  });
};

const setSpecUrl = (url: string): void => {
  restoreNativeHistoryStateMethods();
  nativeHistoryReplaceState.call(window.history, {}, '', url);
};

describe('AnalyticsService', () => {
  afterEach(() => {
    setSpecUrl('/context.html');
  });

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

  it('disables remote analytics for automated Lighthouse user agents', () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Chrome-Lighthouse');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'zoolandingpagecommx',
            isAnalyticsEnabled: () => true,
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

    expect(svc.isRemoteAnalyticsEnabled()).toBeFalse();
  });

  it('disables remote analytics for browser automation even when the user agent is generic headless Chrome', () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 HeadlessChrome/147.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'zoolandingpagecommx',
            isAnalyticsEnabled: () => true,
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

    expect(svc.isRemoteAnalyticsEnabled()).toBeFalse();
  });

  it('does not log console errors when geolocation access is denied', async () => {
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);

    const getCurrentPosition = spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(
      (_success: PositionCallback, error?: PositionErrorCallback | null) => {
        error?.({
          code: 1,
          message: 'Permission denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'zoolandingpagecommx',
            isAnalyticsEnabled: () => true,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => slot,
            track: () => ['geolocationLatitude', 'geolocationLongitude', 'geolocationAccuracy'],
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

    const svc = TestBed.inject(AnalyticsService);
    const consoleError = spyOn(console, 'error');

    svc.initializeRuntimeState();
    const data = await svc.getAllDataFromUser();

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(data?.geolocationLatitude).toBeUndefined();
    expect(data?.geolocationLongitude).toBeUndefined();
    expect(data?.geolocationAccuracy).toBeUndefined();
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

  it('mirrors internal page views to Google dataLayer with stored ad attribution but without ad params in page_location', async () => {
    const attributionStorageKey = 'fixture:adAttribution';

    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    (window as any).dataLayer = [];
    delete (window as any).gtag;

    try {
      window.sessionStorage.setItem(attributionStorageKey, JSON.stringify({
        params: {
          gclid: 'test-gclid',
          utm_source: 'google',
          utm_campaign: 'spring',
        },
        expiresAt: Date.now() + 86_400_000,
      }));

      TestBed.configureTestingModule({
        providers: [
          {
            provide: RuntimeConfigService,
            useValue: {
              appIdentifier: () => 'fixture',
              isAnalyticsEnabled: () => false,
              isDebugMode: () => false,
              analyticsConsentMode: () => 'none',
              resolveStorageKey: (slot: string) => `fixture:${ slot }`,
              track: () => [],
              analytics: () => ({
                googleTag: {
                  enabled: true,
                  environments: { local: true, test: true, production: true },
                  measurementIds: ['G-TEST123'],
                  attribution: { storage: 'session', ttlDays: 7 },
                },
              }),
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

      const googleTag = TestBed.inject(GoogleTagService) as any;
      spyOn(googleTag, 'captureAttributionFromLocation').and.stub();
      spyOn(googleTag, 'cleanCurrentUrl').and.returnValue(`${ window.location.origin }/`);
      spyOn(googleTag, 'cleanCurrentPath').and.returnValue('/');

      const svc = TestBed.inject(AnalyticsService);

      await svc.track('page_view', {
        category: 'navigation',
        label: '/?gclid=test-gclid&utm_source=google&utm_campaign=spring',
      });

      const pageView = [...(window as any).dataLayer]
        .reverse()
        .find((entry: Record<string, unknown>) => entry['event'] === 'page_view');

      expect(pageView).toEqual(jasmine.objectContaining({
        event: 'page_view',
        event_label: '/',
        page_location: `${ window.location.origin }/`,
        page_path: '/',
        gclid: 'test-gclid',
        utm_source: 'google',
        utm_campaign: 'spring',
      }));
      expect(pageView?.email).toBeUndefined();
    } finally {
      window.sessionStorage.removeItem(attributionStorageKey);
      setSpecUrl('/context.html');
      (window as any).dataLayer = [];
      delete (window as any).gtag;
    }
  });

  it('sends whatsapp_click as a GA4 event and Ads conversion with an event_callback when gtag is present', async () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    const gtagCalls: unknown[][] = [];
    (window as any).dataLayer = [];
    (window as any).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
      const params = args[2] as Record<string, unknown> | undefined;
      if (typeof params?.['event_callback'] === 'function') {
        (params['event_callback'] as () => void)();
      }
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'fixture',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => `fixture:${ slot }`,
            track: () => [],
            analytics: () => ({
              googleTag: {
                enabled: true,
                environments: { local: true, test: true, production: true },
                measurementIds: ['G-TEST123'],
                adsIds: ['AW-TEST123'],
                conversions: {
                  whatsapp_click: {
                    sendTo: 'AW-TEST123/whatsappLabel',
                    value: 1,
                    currency: 'MXN',
                  },
                },
              },
            }),
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

    const svc = TestBed.inject(AnalyticsService);

    await svc.track(AnalyticsEvents.WhatsAppClick, {
      category: AnalyticsCategories.CTA,
      label: 'floating-whatsapp',
      meta: { location: 'mobile-floating', phone: '+525522699563' },
    });

    expect(gtagCalls).toContain(jasmine.arrayContaining(['event', 'whatsapp_click']));
    expect(gtagCalls).toContain(jasmine.arrayContaining([
      'event',
      'conversion',
      jasmine.objectContaining({
        send_to: 'AW-TEST123/whatsappLabel',
        value: 1,
        currency: 'MXN',
        event_callback: jasmine.any(Function),
      }),
    ]));
    const whatsappEvent = gtagCalls.find((call) => call[1] === 'whatsapp_click')?.[2] as Record<string, unknown>;
    expect(whatsappEvent?.['phone']).toBeUndefined();
  });

  it('maps whatsapp_click to the configured Google event name with static safe params', async () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    const gtagCalls: unknown[][] = [];
    (window as any).dataLayer = [];
    (window as any).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'fixture',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => `fixture:${ slot }`,
            track: () => [],
            analytics: () => ({
              googleTag: {
                enabled: true,
                environments: { local: true, test: true, production: true },
                measurementIds: ['G-TEST123'],
                events: {
                  whatsapp_click: {
                    name: 'lead_conversion_whatsapp',
                    params: {
                      pyme_id: 'fixture-pyme',
                    },
                  },
                },
              },
            }),
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

    const svc = TestBed.inject(AnalyticsService);

    await svc.track(AnalyticsEvents.WhatsAppClick, {
      category: AnalyticsCategories.CTA,
      label: 'floating-whatsapp',
      meta: { location: 'mobile-floating', phone: '+525522699563' },
    });

    expect(gtagCalls).toContain(jasmine.arrayContaining(['event', 'lead_conversion_whatsapp']));
    const whatsappEvent = gtagCalls.find((call) => call[1] === 'lead_conversion_whatsapp')?.[2] as Record<string, unknown>;
    expect(whatsappEvent).toEqual(jasmine.objectContaining({
      pyme_id: 'fixture-pyme',
      location: 'mobile-floating',
    }));
    expect(whatsappEvent?.['phone']).toBeUndefined();
  });

  it('waits for the mapped GA4 WhatsApp event callback before resolving tracking', async () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    const gtagCalls: unknown[][] = [];
    let eventCallback: (() => void) | undefined;
    (window as any).dataLayer = [];
    (window as any).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
      const params = args[2] as Record<string, unknown> | undefined;
      if (args[1] === 'lead_conversion_whatsapp') {
        eventCallback = params?.['event_callback'] as (() => void) | undefined;
      }
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'fixture',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => `fixture:${ slot }`,
            track: () => [],
            analytics: () => ({
              googleTag: {
                enabled: true,
                environments: { local: true, test: true, production: true },
                measurementIds: ['G-TEST123'],
                events: {
                  whatsapp_click: {
                    name: 'lead_conversion_whatsapp',
                    params: {
                      pyme_id: 'fixture-pyme',
                    },
                  },
                },
              },
            }),
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

    const svc = TestBed.inject(AnalyticsService);
    let resolved = false;
    const tracking = svc.track(AnalyticsEvents.WhatsAppClick, {
      category: AnalyticsCategories.CTA,
      label: 'floating-whatsapp',
      meta: { location: 'mobile-floating' },
    }).then(() => {
      resolved = true;
    });

    await Promise.resolve();

    expect(gtagCalls).toContain(jasmine.arrayContaining(['event', 'lead_conversion_whatsapp']));
    expect(eventCallback).toEqual(jasmine.any(Function));
    expect(resolved).toBeFalse();

    eventCallback?.();
    await tracking;

    expect(resolved).toBeTrue();
  });

  it('resolves the mapped GA4 WhatsApp event after the callback timeout when Google does not call back', async () => {
    jasmine.clock().install();
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    const gtagCalls: unknown[][] = [];
    (window as any).dataLayer = [];
    (window as any).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'fixture',
            isAnalyticsEnabled: () => false,
            isDebugMode: () => false,
            analyticsConsentMode: () => 'none',
            resolveStorageKey: (slot: string) => `fixture:${ slot }`,
            track: () => [],
            analytics: () => ({
              googleTag: {
                enabled: true,
                environments: { local: true, test: true, production: true },
                measurementIds: ['G-TEST123'],
                events: {
                  whatsapp_click: {
                    name: 'lead_conversion_whatsapp',
                    params: {
                      pyme_id: 'fixture-pyme',
                    },
                  },
                },
              },
            }),
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

    const svc = TestBed.inject(AnalyticsService);
    let resolved = false;
    try {
      const tracking = svc.track(AnalyticsEvents.WhatsAppClick, {
        category: AnalyticsCategories.CTA,
        label: 'floating-whatsapp',
        meta: { location: 'mobile-floating' },
      }).then(() => {
        resolved = true;
      });

      await Promise.resolve();

      expect(gtagCalls).toContain(jasmine.arrayContaining(['event', 'lead_conversion_whatsapp']));
      expect(resolved).toBeFalse();

      jasmine.clock().tick(199);
      await Promise.resolve();
      expect(resolved).toBeFalse();

      jasmine.clock().tick(1);
      await tracking;
      expect(resolved).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
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

  it('enriches article engagement events with current content hub article context', () => {
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
    store.setSiteConfig({
      version: 1,
      domain: 'zoositioweb.com.mx',
      routes: [],
      site: {},
      runtime: {
        contentHubs: [
          {
            hubId: 'zoosite-main',
            ownerDraftDomain: 'zoositioweb.com.mx',
            source: 'primary',
            articlePathPattern: '/blog/:categorySlug/:slug',
            defaultLocale: 'es',
            locales: ['es'],
            canonicalMode: 'host-adaptive',
            analyticsContext: {
              eventPrefix: 'blog',
              contentGroup: 'zoosite-blog',
            },
            publicArticles: [
              {
                articleId: 'art_public',
                status: 'published',
                visibility: 'public',
                path: '/blog/web/guia-seo',
                categorySlug: 'web',
                tags: ['seo', 'sites'],
                locale: 'es',
                title: 'Guia SEO',
              },
            ],
          },
        ],
      },
    } as any);
    setSpecUrl('/blog/web/guia-seo?draftDomain=zoositioweb.com.mx');

    const svc = TestBed.inject(AnalyticsService) as any;

    expect(svc.buildEngagementMeta({ depthPercent: 50 })).toEqual(jasmine.objectContaining({
      depthPercent: 50,
      hubId: 'zoosite-main',
      contentGroup: 'zoosite-blog',
      articleId: 'art_public',
      category: 'web',
      tags: ['seo', 'sites'],
      path: '/blog/web/guia-seo',
      params: jasmine.objectContaining({
        categorySlug: 'web',
        slug: 'guia-seo',
      }),
    }));
  });
});
