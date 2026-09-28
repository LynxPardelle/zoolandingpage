import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { QuillEditorComponent } from 'ngx-quill';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import { GenericRichTextComponent } from './generic-rich-text.component';
import type { TGenericRichTextValueChange } from './generic-rich-text.types';
import {createFixedArticleRegistry} from '../../utility/content-hub/fixed-article-quill-registry';
import type Image from 'quill/formats/image';

describe('GenericRichTextComponent', () => {
  let fixture: ComponentFixture<GenericRichTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericRichTextComponent],
      providers: [InteractionScopeService],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericRichTextComponent);
  });

  it('keeps rich text toolbar controls large enough for touch input', () => {
    const componentMetadata = GenericRichTextComponent as unknown as {
      readonly ɵcmp?: { readonly styles?: readonly string[] };
    };
    const styles = (componentMetadata.ɵcmp?.styles ?? []).join('\n');

    expect(styles).toContain('min-height: 44px');
    expect(styles).toContain('min-width: 44px');
    expect(styles).toContain('touch-action: manipulation');
  });
  it('renders only registered private Blob images under the opt-in fixed article policy',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    try {
      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:[url],value:{ops:[{insert:{image:url}},{insert:'\n'}]}});
      fixture.detectChanges();await import('quill');await fixture.whenStable();fixture.detectChanges();await fixture.whenStable();
      let src:string|null|undefined;
      for(let i=0;i<60&&src!==url;i++) {
        await new Promise(requestAnimationFrame);fixture.detectChanges();
        const editor=fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
        src=editor?.quillEditor?.root.querySelector('img')?.getAttribute('src');
      }
      expect(src).toBe(url);
    } finally { URL.revokeObjectURL(url); }
  });
  it('shows a newly uploaded private image as soon as its preview source arrives',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    const text='Existing article text';
    const config=(image:string|null,sources:readonly string[])=>({
      fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',
      privateImageSources:sources,
      value:{ops:[{insert:`${text}\n`},...(image?[{insert:{image}}]:[]),{insert:'\n'}]},
    });
    try {
      fixture.componentRef.setInput('config',config(null,[]));
      fixture.detectChanges();await import('quill');await fixture.whenStable();fixture.detectChanges();
      const editor=()=>fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
      for(let i=0;i<60&&!editor()?.quillEditor;i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();}
      expect(editor()?.quillEditor?.root.textContent).toContain(text);

      // The saved asset ID appears before the private preview read has returned.
      fixture.componentRef.setInput('config',config('asset-1',[]));fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      expect(editor()?.quillEditor?.root.querySelector('img')?.getAttribute('src')).toContain('data:image/gif');

      // Runtime values are propagated separately: the URL can reach Quill
      // before the allowlist does, so it is initially sanitized to the GIF.
      fixture.componentRef.setInput('config',config(url,[]));fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      expect(editor()?.quillEditor?.root.querySelector('img')?.getAttribute('src')).toContain('data:image/gif');
      fixture.componentRef.setInput('config',config(url,[url]));fixture.detectChanges();await fixture.whenStable();
      let src:string|null|undefined;
      for(let i=0;i<60&&src!==url;i++) {
        await new Promise(requestAnimationFrame);fixture.detectChanges();
        src=editor()?.quillEditor?.root.querySelector('img')?.getAttribute('src');
      }
      expect(src).toBe(url);
      expect(editor()?.quillEditor?.root.textContent).toContain(text);
    } finally { URL.revokeObjectURL(url); }
  });
  it('keeps saved typing when an inline image is added in the same editing session',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    const text='Typed and saved before the upload';
    const base={ops:[{insert:`${text}\n`}]};
    try {
      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:[],value:base});
      fixture.detectChanges();await import('quill');await fixture.whenStable();fixture.detectChanges();
      const editor=()=>fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
      for(let i=0;i<60&&!editor()?.quillEditor;i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();}
      const scope=TestBed.inject(InteractionScopeService);
      scope.setFieldValue('body',base,{markTouched:true});
      expect(scope.getFieldState('body')?.dirty).toBeTrue();

      const withImage={ops:[...base.ops,{insert:{image:url}},{insert:'\n'}]};
      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:[url],value:withImage});
      fixture.detectChanges();await fixture.whenStable();
      let src:string|null|undefined;
      for(let i=0;i<60&&src!==url;i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();src=editor()?.quillEditor?.root.querySelector('img')?.getAttribute('src');}
      expect(src).toBe(url);
      expect(editor()?.quillEditor?.root.textContent).toContain(text);
    } finally { URL.revokeObjectURL(url); }
  });
  it('resolves a newly appended asset after typing alongside an existing private image',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const oldUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    const newUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    const base={ops:[{insert:'Existing text\n'},{insert:{image:oldUrl}},{insert:'\nTyped and saved text\n'}]};
    const config=(value:unknown,sources:readonly string[])=>({fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:sources,value});
    try {
      fixture.componentRef.setInput('config',config(base,[oldUrl]));
      fixture.detectChanges();await import('quill');await fixture.whenStable();fixture.detectChanges();
      const editor=()=>fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
      for(let i=0;i<60&&!editor()?.quillEditor;i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();}
      const scope=TestBed.inject(InteractionScopeService);
      scope.setFieldValue('body',base,{markTouched:true});
      fixture.componentRef.setInput('config',config({ops:[...base.ops,{insert:{image:'asset-new'}},{insert:'\n'}]},[oldUrl]));
      fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      fixture.componentRef.setInput('config',config({ops:[...base.ops,{insert:{image:newUrl}},{insert:'\n'}]},[oldUrl]));
      fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      fixture.componentRef.setInput('config',config({ops:[...base.ops,{insert:{image:newUrl}},{insert:'\n'}]},[oldUrl,newUrl]));
      fixture.detectChanges();await fixture.whenStable();
      let sources:string[]=[];
      for(let i=0;i<60&&!sources.includes(newUrl);i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();sources=Array.from(editor().quillEditor.root.querySelectorAll('img')).map(image=>image.getAttribute('src')??'');}
      await new Promise(resolve=>setTimeout(resolve,250));fixture.detectChanges();await fixture.whenStable();
      sources=Array.from(editor().quillEditor.root.querySelectorAll('img')).map(image=>image.getAttribute('src')??'');
      expect(sources).toEqual([oldUrl,newUrl]);
      expect(editor().quillEditor.root.textContent).toContain('Typed and saved text');
    } finally { URL.revokeObjectURL(oldUrl);URL.revokeObjectURL(newUrl); }
  });
  it('renders a private preview from runtime signals without a new config input or forced detection',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    const value=signal<unknown>({ops:[{insert:'Saved article text\n'}]});
    const sources=signal<readonly string[]>([]);
    const readOnly=signal(false);
    try {
      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:()=>sources(),value:()=>value(),readOnly:()=>readOnly()});
      fixture.autoDetectChanges();await import('quill');await fixture.whenStable();
      const editor=()=>fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
      for(let i=0;i<60&&!editor()?.quillEditor;i++) {await new Promise(requestAnimationFrame);await fixture.whenStable();}
      readOnly.set(true);await fixture.whenStable();
      value.set({ops:[{insert:'Saved article text\n'},{insert:{image:'asset-new'}},{insert:'\n'}]});
      readOnly.set(false);
      await fixture.whenStable();await new Promise(resolve=>setTimeout(resolve,150));await fixture.whenStable();
      expect(editor().quillEditor.root.querySelector('img')?.getAttribute('src')).toContain('data:image/gif');
      value.set({ops:[{insert:'Saved article text\n'},{insert:{image:url}},{insert:'\n'}]});
      sources.set([url]);
      await fixture.whenStable();await new Promise(resolve=>setTimeout(resolve,150));await fixture.whenStable();
      expect(editor().quillEditor.root.querySelector('img')?.getAttribute('src')).toBe(url);
      expect(editor().quillEditor.root.textContent).toContain('Saved article text');
    } finally { URL.revokeObjectURL(url); }
  });
  it('does not replace divergent unsaved article text with an incoming image update',async()=>{
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    try {
      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:[],value:{ops:[{insert:'Original\n'}]}});
      fixture.detectChanges();await import('quill');await fixture.whenStable();fixture.detectChanges();
      const editor=()=>fixture.debugElement.query(By.directive(QuillEditorComponent))?.componentInstance as QuillEditorComponent;
      for(let i=0;i<60&&!editor()?.quillEditor;i++) {await new Promise(requestAnimationFrame);fixture.detectChanges();}
      const local={ops:[{insert:'Unsaved local writing\n'}]};
      editor().quillEditor.setContents(local.ops,'user');
      fixture.componentInstance.onQuillContentChanged({content:local,text:'Unsaved local writing\n',source:'user'});
      fixture.detectChanges();

      fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',sanitizerPolicyId:'fixed-article-v2',privateImageSources:[url],value:{ops:[{insert:'Different server text\n'},{insert:{image:url}},{insert:'\n'}]}});
      fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      expect(editor().quillEditor.root.textContent).toContain('Unsaved local writing');
      expect(editor().quillEditor.root.querySelector('img')).toBeNull();
    } finally { URL.revokeObjectURL(url); }
  });
  it('keeps private image registrations instance-scoped and rejects pasted or stale sources',async()=>{
    fixture.componentRef.setInput('config',{fieldId:'body'});
    const {default:quill}=await import('quill');
    const global=quill.import('formats/image') as typeof Image;
    let sources=['blob:https://admin.example.test/private'];
    const registry=createFixedArticleRegistry(quill,()=>sources);
    const privateImage=registry.query('image') as typeof Image;
    expect(privateImage.sanitize(sources[0])).toBe(sources[0]);
    expect(global.sanitize(sources[0])).toBe('//:0');
    expect(privateImage.sanitize('https://tracker.example.test/image')).not.toContain('tracker');
    sources=[];
    expect(privateImage.sanitize('blob:https://admin.example.test/private')).not.toContain('blob:');
  });

  it('does not defer image values for editors outside the private article policy',()=>{
    const value={ops:[{insert:{image:'blob:https://example.test/other-editor'}},{insert:'\n'}]};
    fixture.componentRef.setInput('config',{fieldId:'body',provider:'quill',format:'quill-delta-object',value});
    fixture.detectChanges();
    expect(fixture.componentInstance.currentValue()).toEqual(value);
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
