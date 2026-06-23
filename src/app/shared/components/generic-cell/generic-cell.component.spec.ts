import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
