import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomainResolverService } from './domain-resolver.service';

describe('DomainResolverService', () => {
  const originalUrl = window.location.pathname + window.location.search + window.location.hash;
  const nativeHistoryReplaceState = History.prototype.replaceState;

  const setBrowserUrl = (href: string): void => {
    const url = new URL(href);
    nativeHistoryReplaceState.call(window.history, {}, '', `${ url.pathname }${ url.search }${ url.hash }`);
  };

  afterEach(() => {
    nativeHistoryReplaceState.call(window.history, {}, '', originalUrl);
    TestBed.resetTestingModule();
  });

  it('uses REQUEST query params from the shared testing preview host', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('https://test.zoolandingpage.com.mx/?draftDomain=despacholegalastralex.com'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'despacholegalastralex.com',
      source: 'queryParam',
    });
  });

  it('uses the canonical Zoolanding domain on the shared testing host without a draftDomain', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('https://test.zoolandingpage.com.mx/'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'zoolandingpage.com.mx',
      source: 'urlHost',
    });
  });

  it('ignores REQUEST draftDomain query params on branded production hosts', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('https://music.lynxpardelle.com/?draftDomain=zoolandingpage.com.mx'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'music.lynxpardelle.com',
      source: 'urlHost',
    });
  });

  it('supports relative SSR request URLs', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: { url: '/?draftDomain=despacholegalastralex.com' },
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'despacholegalastralex.com',
      source: 'queryParam',
    });
  });

  it('uses request host headers to block relative SSR draftDomain params outside testing', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: {
            url: '/?draftDomain=zoolandingpage.com.mx',
            headers: {
              host: 'music.lynxpardelle.com',
            },
          },
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'music.lynxpardelle.com',
      source: 'urlHost',
    });
  });

  it('prefers a non-local request host over a conflicting forwarded host during SSR', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: {
            url: '/blog',
            headers: {
              host: 'zoositioweb.com.mx',
              'x-forwarded-host': 'zoolandingpage.com.mx',
              'x-forwarded-proto': 'https',
            },
          },
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'zoositioweb.com.mx',
      source: 'urlHost',
    });
  });

  it('normalizes absolute local SSR URLs to the forwarded branded host', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: {
            url: 'http://127.0.0.1:4307/blog?lang=es',
            headers: {
              host: 'zoositioweb.com.mx',
              'x-forwarded-proto': 'https',
            },
          },
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'zoositioweb.com.mx',
      source: 'urlHost',
    });
  });

  it('derives runtime-safe storage keys from the resolved domain', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('https://test.zoolandingpage.com.mx/?draftDomain=zoolandingpage.com.mx'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveStorageNamespace()).toBe('zoolandingpage-com-mx');
    expect(service.resolveStorageKey('theme')).toBe('zoolandingpage-com-mx:theme');
  });

  it('recovers draft domains from malformed encoded query-param keys', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('https://test.zoolandingpage.com.mx/?debugWorkspace=true&draftDomain%3Dzoolandingpage.com.mx=&draftPageId=default'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'zoolandingpage.com.mx',
      source: 'queryParam',
    });
  });

  it('uses browser query params on dynamic routes from the shared testing preview host', () => {
    setBrowserUrl('https://test.zoolandingpage.com.mx/admin/blog/articulos/art_123/editor?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: REQUEST,
          useValue: new Request('https://test.zoolandingpage.com.mx/admin/blog/articulos/art_123/editor'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'zoositioweb.com.mx',
      source: 'queryParam',
    });
  });
});
