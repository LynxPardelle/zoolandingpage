import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../services/language.service';
import { ConfigStoreService } from '../../services/config-store.service';
import { GenericCellComponent } from './generic-cell.component';

describe('GenericCellComponent', () => {
  let fixture: ComponentFixture<GenericCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericCellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericCellComponent);
  });

  it('renders formatted fallback text from config', () => {
    fixture.componentRef.setInput('column', {
      id: 'published',
      format: 'boolean',
      trueText: 'Publicado',
      falseText: 'Borrador',
    });
    fixture.componentRef.setInput('value', true);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Publicado');
  });

  it('renders object arrays with the list format and configured item path', () => {
    fixture.componentRef.setInput('column', {
      id: 'tags',
      format: 'list',
      itemPath: 'label',
      separator: ' · ',
      emptyText: 'Sin tags',
    });
    fixture.componentRef.setInput('value', [
      { label: 'SEO', taxonomyId: 'tag-seo' },
      { label: 'Builder', taxonomyId: 'tag-builder' },
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('SEO · Builder');
  });

  it('uses safe object labels for list values when itemPath is omitted', () => {
    fixture.componentRef.setInput('column', {
      id: 'tags',
      format: 'list',
      emptyText: 'Sin tags',
    });
    fixture.componentRef.setInput('value', [
      { slug: 'seo' },
      { taxonomyId: 'tag-builder' },
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('seo, tag-builder');
  });

  it('falls back to safe object labels when list itemPath is missing', () => {
    fixture.componentRef.setInput('column', {
      id: 'tags',
      format: 'list',
      itemPath: 'label',
      emptyText: 'Sin tags',
    });
    fixture.componentRef.setInput('value', [
      { slug: 'seo' },
      { taxonomyId: 'tag-builder' },
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('seo, tag-builder');
  });

  it('builds a wrapper host context with row, column, value, and parent host', () => {
    const row = { id: 'art-1', title: 'Artículo' };
    const column = { id: 'title', componentId: 'titleRenderer' };
    const parent = { source: 'host' };

    fixture.componentRef.setInput('column', column);
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('value', 'Artículo');
    fixture.componentRef.setInput('rowIndex', 3);
    fixture.componentRef.setInput('hostContext', parent);
    fixture.detectChanges();

    expect(fixture.componentInstance.cellContext()).toEqual({
      parent,
      row,
      column,
      value: 'Artículo',
      rowIndex: 3,
    });
  });

  for (const locale of ['es', 'en', 'zh']) {
    it(`formats exact whole-peso MXN currency in ${locale}`, () => {
      const language = TestBed.inject(LanguageService);
      language.configureLanguages(['es', 'en', 'zh'], {
        defaultLanguage: 'es',
        requestedLanguage: locale,
      });
      fixture.componentRef.setInput('column', {
        id: 'amount',
        format: 'currency',
        currency: 'MXN',
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
        showCurrencyCode: true,
        emptyText: '--',
      } as any);
      fixture.componentRef.setInput('value', 400000);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent.trim()).toBe('$400,000 MXN');
    });
  }

  it('formats zero as exact whole-peso MXN currency', () => {
    const language = TestBed.inject(LanguageService);
    language.configureLanguages(['es'], { defaultLanguage: 'es', requestedLanguage: 'es' });
    fixture.componentRef.setInput('column', {
      id: 'amount',
      format: 'currency',
      currency: 'MXN',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
      showCurrencyCode: true,
    } as any);
    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('$0 MXN');
  });

  it('keeps number formatting raw and fails invalid currency config safely', () => {
    fixture.componentRef.setInput('column', { id: 'raw', format: 'number', emptyText: '--' });
    fixture.componentRef.setInput('value', 400000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('400000');

    fixture.componentRef.setInput('column', {
      id: 'invalid',
      format: 'currency',
      currency: 'mxn',
      emptyText: '--',
    } as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('--');
  });

  it('falls back from an invalid active locale to the configured site default locale', () => {
    TestBed.inject(ConfigStoreService).setSiteConfig({
      version: 1,
      domain: 'example.test',
      defaultPageId: 'home',
      routes: [{ path: '/', pageId: 'home' }],
      site: {
        appIdentity: { identifier: 'example', name: 'Example' },
        theme: { defaultMode: 'light', palettes: {} },
        i18n: {
          defaultLanguage: 'de',
          supportedLanguages: ['x', 'de'],
        },
      },
    } as any);
    TestBed.inject(LanguageService).configureLanguages(['x', 'de'], {
      defaultLanguage: 'de',
      requestedLanguage: 'x',
    });
    fixture.componentRef.setInput('column', {
      id: 'amount',
      format: 'currency',
      currency: 'EUR',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    } as any);
    fixture.componentRef.setInput('value', 1234);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('1.234 €');
  });
});
