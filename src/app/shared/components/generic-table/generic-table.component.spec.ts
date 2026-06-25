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
});
