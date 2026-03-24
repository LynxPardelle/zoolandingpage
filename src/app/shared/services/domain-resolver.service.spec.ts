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
});
