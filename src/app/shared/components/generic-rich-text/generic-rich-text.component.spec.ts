import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { QuillEditorComponent } from 'ngx-quill';
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

  it('keeps Quill formatting state while emitting plain text output', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const formattedModel = { ops: [{ insert: 'Texto inicial con formato', attributes: { bold: true } }, { insert: '\n' }] };
    expect(component.quillFormat()).toBe('object');

    component.onQuillContentChanged({
      content: formattedModel,
      text: 'Texto inicial con formato\n',
      source: 'user',
    });

    expect(component.currentValue()).toBe('Texto inicial con formato');
    expect(component.quillModel).toBe(formattedModel);
  });

  it('does not reset the Quill model when the parent echoes the same user value', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const userModel = {
      ops: [
        { insert: 'Texto inicial con formato', attributes: { bold: true } },
        { insert: '\n' },
      ],
    };

    component.quillModel = userModel;
    component.onQuillContentChanged({
      content: userModel,
      text: 'Texto inicial con formato\n',
      source: 'user',
    });
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial con formato',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    expect(component.quillModel).toBe(userModel);
  });

  it('does not reset dirty Quill edits when the parent replays stale config', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'plain-text',
      value: '',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const userModel = {
      ops: [
        { insert: 'Contenido escrito por el usuario', attributes: { bold: true } },
        { insert: '\n' },
      ],
    };

    component.onQuillContentChanged({
      content: userModel,
      text: 'Contenido escrito por el usuario\n',
      source: 'user',
    });
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'plain-text',
      value: '',
      helperText: 'La config se recalculó sin valor nuevo.',
      toolbar: ['bold', 'italic', 'heading', 'bulletList', 'orderedList'],
    });
    fixture.detectChanges();

    expect(component.currentValue()).toBe('Contenido escrito por el usuario');
    expect(component.quillModel).toBe(userModel);
  });

  it('does not reset dirty Quill delta-object edits when the parent replays stale config', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: { ops: [] },
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const userModel = {
      ops: [
        { insert: 'Contenido enriquecido', attributes: { bold: true } },
        { insert: '\n' },
      ],
    };

    component.onQuillContentChanged({
      content: userModel,
      text: 'Contenido enriquecido\n',
      source: 'user',
    });
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: { ops: [] },
      helperText: 'La config se recalculó sin valor nuevo.',
    });
    fixture.detectChanges();

    expect(component.currentValue()).toBe(userModel);
    expect(component.quillModel).toBe(userModel);
  });

  it('hydrates legacy plain text into a Quill delta object', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: 'Contenido legado sin Delta',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.quillModel).toEqual({
      ops: [{ insert: 'Contenido legado sin Delta\n' }],
    });
  });

  it('resolves dynamic config values before hydrating Quill delta content', () => {
    const dynamicValue = {
      ops: [
        { insert: 'Contenido remoto desde articleDetail', attributes: { bold: true } },
        { insert: '\n' },
      ],
    };

    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: () => dynamicValue,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.currentValue()).toBe(dynamicValue);
    expect(fixture.componentInstance.quillModel).toBe(dynamicValue);
    expect(JSON.stringify(fixture.componentInstance.quillModel)).not.toContain('=>');
  });

  it('resolves dynamic config values before hydrating legacy plain text content', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: () => 'Texto remoto legado',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.currentValue()).toBe('Texto remoto legado');
    expect(fixture.componentInstance.quillModel).toEqual({
      ops: [{ insert: 'Texto remoto legado\n' }],
    });
    expect(JSON.stringify(fixture.componentInstance.quillModel)).not.toContain('=>');
  });

  it('does not mark the interaction scope dirty for programmatic Quill updates', () => {
    const emitted: TGenericRichTextValueChange[] = [];
    const scope = TestBed.inject(InteractionScopeService);
    const initialValue = { ops: [{ insert: 'Contenido inicial\n' }] };
    scope.configure({ scopeId: 'articleEditor' });
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: initialValue,
    });
    fixture.componentInstance.valueChanged.subscribe((event) => emitted.push(event));
    fixture.detectChanges();

    fixture.componentInstance.onQuillContentChanged({
      content: initialValue,
      text: 'Contenido inicial\n',
      source: 'api',
    });

    expect(emitted).toEqual([]);
    expect(scope.getFieldState('articleContent')?.dirty).toBe(false);
    expect(scope.getFieldState('articleContent')?.value).toEqual(initialValue);
  });

  it('asks ngx-quill to compare delta values before resetting the editor model', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleContent',
      provider: 'quill',
      format: 'quill-delta-object',
      value: { ops: [{ insert: 'Contenido\n' }] },
    });
    fixture.detectChanges();

    const quill = fixture.debugElement.query(By.directive(QuillEditorComponent));
    expect(quill.componentInstance.compareValues()).toBe(true);
  });

  it('keeps configured toolbar groups for headings, lists, links, and cleanup', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      toolbar: ['bold', 'italic', 'underline', 'heading', 'bulletList', 'orderedList', 'blockquote', 'link', 'clean'],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.quillModules().toolbar).toEqual([
      ['bold', 'italic', 'underline'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'bullet' }, { list: 'ordered' }],
      ['blockquote', 'link'],
      ['clean'],
    ]);
  });

  it('keeps the same Quill modules reference when only unrelated config changes', () => {
    const toolbar = ['bold', 'italic', 'heading', 'bulletList', 'orderedList'] as const;
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial',
      helperText: 'Primer texto',
      toolbar,
    });
    fixture.detectChanges();

    const before = fixture.componentInstance.quillModules();
    fixture.componentRef.setInput('config', {
      fieldId: 'articleSummary',
      provider: 'quill',
      format: 'plain-text',
      value: 'Texto inicial',
      helperText: 'El estado cambió, la barra no.',
      toolbar,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.quillModules()).toBe(before);
  });
});
