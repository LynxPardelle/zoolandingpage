import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomainResolverService } from './domain-resolver.service';

describe('DomainResolverService', () => {
  it('uses REQUEST query params when window query params are not available', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        {
          provide: REQUEST,
          useValue: new Request('https://example.test/?draftDomain=despacholegalastralex.com'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveDomain()).toEqual({
      domain: 'despacholegalastralex.com',
      source: 'queryParam',
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

  it('derives runtime-safe identifiers and storage keys from the resolved domain', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        {
          provide: REQUEST,
          useValue: new Request('https://example.test/?draftDomain=zoolandingpage.com.mx'),
        },
      ],
    });

    const service = TestBed.inject(DomainResolverService);

    expect(service.resolveAppIdentifier()).toBe('zoolandingpagecommx');
    expect(service.resolveStorageNamespace()).toBe('zoolandingpage-com-mx');
    expect(service.resolveStorageKey('theme')).toBe('zoolandingpage-com-mx:theme');
  });

  it('recovers draft domains from malformed encoded query-param keys', () => {
    TestBed.configureTestingModule({
      providers: [
        DomainResolverService,
        {
          provide: REQUEST,
          useValue: new Request('https://example.test/?debugWorkspace=true&draftDomain%3Dzoolandingpage.com.mx=&draftPageId=default'),
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
