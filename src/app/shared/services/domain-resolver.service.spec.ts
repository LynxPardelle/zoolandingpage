import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomainResolverService } from './domain-resolver.service';

describe('DomainResolverService', () => {
  it('uses REQUEST query params from the shared testing preview host', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
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

  it('ignores REQUEST draftDomain query params on branded production hosts', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
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

  it('derives runtime-safe storage keys from the resolved domain', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
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
});
