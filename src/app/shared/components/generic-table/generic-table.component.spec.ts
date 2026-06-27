import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GenericTableComponent } from './generic-table.component';
import type { TGenericTableActionEvent, TGenericTableConfig } from './generic-table.types';

describe('GenericTableComponent', () => {
  let fixture: ComponentFixture<GenericTableComponent>;

  const tableConfig: TGenericTableConfig = {
    id: 'articles-table',
    label: 'Artículos',
    rows: [
      { articleId: 'a2', title: 'Zeta', status: 'draft' },
      { articleId: 'a1', title: 'Alpha', status: 'published' },
    ],
    rowIdPath: 'articleId',
    eventPayloadFields: ['articleId', 'status'],
    columns: [
      { id: 'title', header: 'Título', valuePath: 'title', sortable: true },
      { id: 'status', header: 'Estado', valuePath: 'status' },
    ],
    actionColumnLabel: 'Acciones',
    sort: { active: 'title', direction: 'asc' },
    selection: { enabled: true, mode: 'multiple', label: 'Seleccionar' },
    rowActions: [{ id: 'edit', label: 'Editar', icon: 'edit' }],
    emitOnRowClick: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericTableComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericTableComponent);
  });

  it('renders configured headers and sorted rows without domain-specific text', () => {
    fixture.componentRef.setInput('config', tableConfig);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Artículos');
    expect(text).toContain('Título');
    expect(text).toContain('Acciones');
    expect(text.indexOf('Alpha')).toBeLessThan(text.indexOf('Zeta'));
    expect(text).not.toContain('zoositioweb');
    expect(text).not.toContain('blog-admin');
  });

  it('renders loading, error, and empty states from draft text', () => {
    fixture.componentRef.setInput('config', {
      ...tableConfig,
      loading: true,
      loadingText: 'Cargando contenido',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando contenido');

    fixture.componentRef.setInput('config', {
      ...tableConfig,
      loading: false,
      errorText: 'No se pudo cargar',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar');

    fixture.componentRef.setInput('config', {
      ...tableConfig,
      errorText: '',
      rows: [],
      emptyText: 'Sin artículos',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin artículos');
  });

  it('emits row actions with allowlisted row payload only', () => {
    const emitted: TGenericTableActionEvent[] = [];
    fixture.componentRef.setInput('config', tableConfig);
    fixture.componentInstance.rowAction.subscribe((event) => emitted.push(event));
    fixture.detectChanges();

    const editButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button: HTMLButtonElement) => button.textContent?.includes('Editar')) as HTMLButtonElement | undefined;
    editButton?.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(jasmine.objectContaining({
      actionId: 'edit',
      rowId: 'a1',
      rowIndex: 0,
      rowData: { articleId: 'a1', status: 'published' },
    }));
    expect(JSON.stringify(emitted[0])).not.toContain('Alpha');
  });

  it('renders row action icons as SVG instead of visible icon-name text', () => {
    fixture.componentRef.setInput('config', tableConfig);
    fixture.detectChanges();

    const editButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button: HTMLButtonElement) => button.textContent?.includes('Editar')) as HTMLButtonElement | undefined;

    expect(editButton).toBeTruthy();
    expect(editButton?.querySelector('svg')).toBeTruthy();
    expect(editButton?.textContent?.trim()).toBe('Editar');
  });

  it('can render row action labels as native tooltips for compact action tables', () => {
    fixture.componentRef.setInput('config', {
      ...tableConfig,
      actionLabelMode: 'tooltip',
      actionIconClasses: 'ank-width-14px ank-height-14px',
    });
    fixture.detectChanges();

    const editButton = fixture.nativeElement.querySelector('button[aria-label="Editar"]') as HTMLButtonElement | null;

    expect(editButton).toBeTruthy();
    expect(editButton?.getAttribute('title')).toBe('Editar');
    expect(editButton?.textContent?.trim()).toBe('');
    expect(editButton?.querySelector('svg')).toBeTruthy();
  });

  it('can render row actions as safe internal links from row href templates', () => {
    fixture.componentRef.setInput('config', {
      ...tableConfig,
      actionLabelMode: 'tooltip',
      actionButtonStyles: {
        height: '52px',
        minHeight: '52px',
        minWidth: '52px',
        width: '52px',
      },
      rowActions: [
        {
          id: 'edit',
          label: 'Editar',
          icon: 'edit',
          hrefTemplate: '/admin/blog/articulos/{articleId}/editor',
        },
      ],
    });
    fixture.detectChanges();

    const editLinks = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a[aria-label="Editar"]'));
    const alphaLink = editLinks.find((link) => link.getAttribute('href')?.includes('/admin/blog/articulos/a1/editor'));

    expect(alphaLink).toBeTruthy();
    expect(alphaLink?.getAttribute('href')).not.toContain('articleId=');
    expect(alphaLink?.getAttribute('title')).toBe('Editar');
    expect(alphaLink?.textContent?.trim()).toBe('');
    expect(alphaLink?.style.minWidth).toBe('52px');
    expect(alphaLink?.style.minHeight).toBe('52px');
  });

  it('can hide the Material paginator when every row fits on one page', () => {
    fixture.componentRef.setInput('config', {
      ...tableConfig,
      pagination: {
        enabled: true,
        pageSize: 10,
        hideWhenSinglePage: true,
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
  });

  it('keeps the Material paginator visible when a second page exists', () => {
    fixture.componentRef.setInput('config', {
      ...tableConfig,
      rows: [
        { articleId: 'a1', title: 'Alpha', status: 'draft' },
        { articleId: 'a2', title: 'Beta', status: 'draft' },
        { articleId: 'a3', title: 'Gamma', status: 'draft' },
      ],
      pagination: {
        enabled: true,
        pageSize: 2,
        hideWhenSinglePage: true,
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy();
  });
});
