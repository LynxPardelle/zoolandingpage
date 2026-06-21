import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericRichTextComponent } from './generic-rich-text.component';
import type { TGenericRichTextValueChange } from './generic-rich-text.types';

describe('GenericRichTextComponent', () => {
  let fixture: ComponentFixture<GenericRichTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericRichTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericRichTextComponent);
  });

  it('renders draft-configured textarea copy and classes', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'body',
      provider: 'textarea',
      format: 'markdown',
      label: 'Contenido',
      description: 'Escribe el artículo.',
      helperText: 'Usa encabezados claros.',
      placeholder: 'Empieza aquí',
      textareaClasses: 'article-editor',
    });
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement | null;
    expect(fixture.nativeElement.textContent).toContain('Contenido');
    expect(fixture.nativeElement.textContent).toContain('Escribe el artículo.');
    expect(fixture.nativeElement.textContent).toContain('Usa encabezados claros.');
    expect(textarea?.className).toContain('article-editor');
    expect(textarea?.placeholder).toBe('Empieza aquí');
  });

  it('emits textarea value metadata without using HTML as source', () => {
    const emitted: TGenericRichTextValueChange[] = [];
    fixture.componentRef.setInput('config', {
      fieldId: 'body',
      provider: 'textarea',
      format: 'markdown',
      sanitizerPolicyId: 'trusted-authors',
    });
    fixture.componentInstance.valueChanged.subscribe((event) => emitted.push(event));
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '# Título\nContenido útil';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(emitted[0]).toEqual({
      fieldId: 'body',
      provider: 'textarea',
      format: 'markdown',
      value: '# Título\nContenido útil',
      plainText: '# Título\nContenido útil',
      isEmpty: false,
      wordCount: 4,
      source: 'textarea',
      sanitizerPolicyId: 'trusted-authors',
    });
  });
});
