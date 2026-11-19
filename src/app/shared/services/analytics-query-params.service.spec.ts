import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { restoreTestBrowserHistory, setTestBrowserUrl } from '@/test-browser-state';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { GoogleTagService } from './google-tag.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('AnalyticsService URL query context', () => {
  let service: AnalyticsService;
  let post: jasmine.Spy;
  let forwardEvent: jasmine.Spy;
  let enabled: boolean;
  let consentMode: 'none' | 'modal';

  const setUrl = (url: string): void => {
    restoreTestBrowserHistory();
    setTestBrowserUrl(url);
  };

  beforeEach(() => {
    enabled = false;
    consentMode = 'none';
    post = jasmine.createSpy('post').and.returnValue(of({ ok: true }));
    forwardEvent = jasmine.createSpy('forwardEvent').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { post } },
        { provide: GoogleTagService, useValue: { initialize: () => undefined, forwardEvent } },
        {
          provide: RuntimeConfigService,
          useValue: {
            appIdentifier: () => 'query-fixture',
            isAnalyticsEnabled: () => enabled,
            isDebugMode: () => false,
            analyticsConsentMode: () => consentMode,
            resolveStorageKey: (slot: string) => `query-fixture:${ slot }`,
            track: () => [],
          },
        },
      ],
    });
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => setUrl('/context.html'));

  it('captures arbitrary query names, duplicates, decoded characters and empty values in URL order', async () => {
    setUrl('/?source=newsletter&campaign=oto%C3%B1o+2026&tag=one&tag=two&custom_flag&empty=&label=a%26b%3Dc#ignored=value');

    await service.track('test_event', { label: 'original-label', meta: { custom: true } });

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({
      label: 'original-label',
      meta: { custom: true },
      queryParams: [
        { key: 'source', value: 'newsletter' },
        { key: 'campaign', value: 'otoño 2026' },
        { key: 'tag', value: 'one' },
        { key: 'tag', value: 'two' },
        { key: 'custom_flag', value: '' },
        { key: 'empty', value: '' },
        { key: 'label', value: 'a&b=c' },
      ],
    }));
  });

  it('captures a fresh snapshot on each navigation and uses an empty array without queries', async () => {
    setUrl('/?source=first');
    await service.track('first_event');
    setUrl('/next?campaign=second');
    await service.track('second_event');
    setUrl('/next#source=fragment');
    await service.track('third_event');

    expect(service.flush()).toEqual([
      jasmine.objectContaining({ queryParams: [{ key: 'source', value: 'first' }] }),
      jasmine.objectContaining({ queryParams: [{ key: 'campaign', value: 'second' }] }),
      jasmine.objectContaining({ queryParams: [] }),
    ]);
  });

  it('uses an empty array when the injected document has no browser window', async () => {
    spyOnProperty(TestBed.inject(DOCUMENT), 'defaultView', 'get').and.returnValue(null);

    await service.track('server_event');

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({ queryParams: [] }));
  });

  it('does not allow supplied event data to replace the captured URL query context', async () => {
    setUrl('/?source=real-url');

    await service.track('test_event', { queryParams: [{ key: 'source', value: 'supplied' }] } as any);

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({
      queryParams: [{ key: 'source', value: 'real-url' }],
    }));
  });

  it('excludes sensitive names and recognizable private values while preserving campaign names', async () => {
    const params = new URLSearchParams({
      source: 'newsletter', campaign_name: 'autumn', access_token: 'redacted-fixture',
      'X-Amz-Signature': 'redacted-fixture', password: 'redacted-fixture', code: 'redacted-fixture',
      email: 'redacted-fixture', full_name: 'redacted-fixture', phone: 'redacted-fixture',
      custom: 'person@example.invalid', contact: '+1 (202) 555-0100',
      auth: 'Bearer redacted-fixture', redirect: 'https://example.invalid/?X-Amz-Credential=redacted-fixture',
    });
    setUrl(`/?${ params }`);

    await service.track('test_event');

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({
      queryParams: [
        { key: 'source', value: 'newsletter' },
        { key: 'campaign_name', value: 'autumn' },
      ],
    }));
  });

  it('excludes Unicode email addresses and decimal phone digits recognized by the backend privacy checks', async () => {
    const params = new URLSearchParams({
      source: 'campaña',
      unicodeLocal: 'é@example.invalid',
      unicodeDomain: 'café@exämple.invalid',
      unicodeDigits: '١٢٣٤٥٦٧٨٩',
    });
    setUrl(`/?${ params }`);

    await service.track('test_event');

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({
      queryParams: [{ key: 'source', value: 'campaña' }],
    }));
  });

  const enableRemoteTransport = (): void => {
    enabled = true;
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    (service as any).isProduction = true;
    spyOn(service, 'getAllDataFromUser').and.resolveTo({ sessionId: 'fixture-session', localId: 'fixture-local' });
  };

  it('excludes common API credentials and credentials embedded in nested URL queries', async () => {
    const params = new URLSearchParams({
      source: 'newsletter', api_key: 'redacted-fixture', apiKey: 'redacted-fixture',
      'subscription-key': 'redacted-fixture', sig: 'redacted-fixture',
      redirect: 'https://example.invalid/object?X-Goog-Signature=redacted-fixture',
      next: '/object?sig=redacted-fixture',
      nested: 'https://example.invalid/?next=%2Fobject%3Fapi%255Fkey%3Dredacted-fixture',
      malformed: 'https://[invalid/?api_key=redacted-fixture',
      landing: 'https://example.invalid/?source=public',
    });
    setUrl(`/?${ params }`);

    await service.track('test_event');

    expect(service.flush()[0]).toEqual(jasmine.objectContaining({
      queryParams: [
        { key: 'source', value: 'newsletter' },
        { key: 'landing', value: 'https://example.invalid/?source=public' },
      ],
    }));
  });

  it('includes the captured array in both first and subsequent HTTP analytics payloads', async () => {
    enableRemoteTransport();
    service.initializeRuntimeState();
    setUrl('/?source=first');
    await service.track('first_event');
    await Promise.resolve();
    setUrl('/next?campaign=second');
    await service.track('second_event');

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
      appName: 'query-fixture', sessionId: 'fixture-session',
      queryParams: [{ key: 'source', value: 'first' }],
    }));
    expect(post.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
      queryParams: [{ key: 'campaign', value: 'second' }],
    }));
  });

  it('keeps each original query snapshot while awaiting consent and sends it only after acceptance', async () => {
    enableRemoteTransport();
    consentMode = 'modal';
    setUrl('/?source=first');
    await service.track('first_event');
    setUrl('/next?campaign=second');
    await service.track('second_event');
    expect(post).not.toHaveBeenCalled();
    expect(forwardEvent).not.toHaveBeenCalled();

    setUrl('/consent-without-query');
    await (service as any).finishConsent(true);

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
      queryParams: [{ key: 'source', value: 'first' }],
    }));
    expect(post.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
      queryParams: [{ key: 'campaign', value: 'second' }],
    }));
  });

  it('discards queued query context when consent is declined', async () => {
    enableRemoteTransport();
    consentMode = 'modal';
    setUrl('/?campaign=declined');
    await service.track('test_event');

    await (service as any).finishConsent(false);
    await service.track('later_event');

    expect(post).not.toHaveBeenCalled();
    expect(forwardEvent).not.toHaveBeenCalled();
  });
});
