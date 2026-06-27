import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import { GenericRichTextComponent } from './generic-rich-text.component';
import type { TGenericRichTextValueChange } from './generic-rich-text.types';

describe('GenericRichTextComponent', () => {
  let fixture: ComponentFixture<GenericRichTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericRichTextComponent],
      providers: [InteractionScopeService],
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

  it('writes rich text values into the nearest interaction scope', () => {
    const scope = TestBed.inject(InteractionScopeService);
    scope.configure({ scopeId: 'articleEditor' });
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'textarea',
      format: 'markdown',
    });
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Contenido desde editor';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(scope.submit().values['articleContent']).toBe('Contenido desde editor');
  });

  it('keeps a separate Quill model for plain text output so user edits do not reset the cursor', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const initialQuillModel = component.quillModel;
    expect(component.quillFormat()).toBe('object');

    component.onQuillContentChanged({
      content: { ops: [{ insert: 'Texto inicial con formato\n' }] },
      text: 'Texto inicial con formato\n',
      source: 'user',
    });

    expect(component.currentValue()).toBe('Texto inicial con formato');
    expect(component.quillModel).toBe(initialQuillModel);
  });
});
