import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { StructuredDataService } from './structured-data.service';
import { VariableStoreService } from './variable-store.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;
  let variables: VariableStoreService;
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('structured-data');

    TestBed.configureTestingModule({
      providers: [
        StructuredDataService,
        VariableStoreService,
        { provide: DOCUMENT, useValue: doc },
      ],
    });

    service = TestBed.inject(StructuredDataService);
    variables = TestBed.inject(VariableStoreService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('updates existing JSON-LD entries when runtime variables change', () => {
    variables.setRuntimeValue('remote.pokemon.selected', {
      items: [{ name: 'pikachu', image: 'https://example.com/pikachu.png' }],
    });

    const entries = [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '{{var:remote.pokemon.selected.items.0.name|titleCase}}',
      image: '{{var:remote.pokemon.selected.items.0.image}}',
    }];

    service.applyEntries(entries, 'sd:test');
    variables.setRuntimeValue('remote.pokemon.selected', {
      items: [{ name: 'charizard', image: 'https://example.com/charizard.png' }],
    });
    service.applyEntries(entries, 'sd:test');

    const scripts = doc.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    expect(JSON.parse((scripts[0] as HTMLScriptElement).text)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Charizard',
      image: 'https://example.com/charizard.png',
    });
  });

  it('escapes HTML-sensitive characters in JSON-LD script text', () => {
    service.applyEntries([{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '</script><script>alert(1)</script>',
      description: 'A & B > C',
    }], 'sd:test');

    const script = doc.head.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    expect(script.text).not.toContain('</script>');
    expect(script.text).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(script.text).description).toBe('A & B > C');
  });
});
