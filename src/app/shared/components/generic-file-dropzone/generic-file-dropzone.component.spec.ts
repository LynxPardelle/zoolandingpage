import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericFileDropzoneComponent } from './generic-file-dropzone.component';
import type { TGenericFileDropzoneValueChange } from './generic-file-dropzone.types';

describe('GenericFileDropzoneComponent', () => {
  let fixture: ComponentFixture<GenericFileDropzoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericFileDropzoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericFileDropzoneComponent);
  });

  it('renders disabled/loading/error states from draft text', () => {
    fixture.componentRef.setInput('config', {
      fieldId: 'assets',
      label: 'Archivos',
      loading: true,
      loadingText: 'Preparando carga',
      disabled: true,
      errorText: 'No disponible',
      dropzoneClasses: 'dropzone',
      disabledDropzoneClasses: 'is-disabled',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Archivos');
    expect(fixture.nativeElement.textContent).toContain('Preparando carga');
    expect(fixture.nativeElement.querySelector('.dropzone.is-disabled')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No disponible');
  });

  it('accepts matching files and rejects files outside accept or size rules', () => {
    const emitted: TGenericFileDropzoneValueChange[] = [];
    fixture.componentRef.setInput('config', {
      fieldId: 'assets',
      accept: 'image/*,.pdf',
      maxFileSizeBytes: 5,
      multiple: true,
      browseLabel: 'Elegir archivos',
    });
    fixture.componentInstance.valueChanged.subscribe((event) => emitted.push(event));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const goodFile = new File(['ok'], 'cover.png', { type: 'image/png' });
    const largeFile = new File(['too-large'], 'large.png', { type: 'image/png' });
    const badType = new File(['bad'], 'script.js', { type: 'text/javascript' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [goodFile, largeFile, badType],
    });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0].fileSummaries.map((file) => file.name)).toEqual(['cover.png']);
    expect(emitted[0].rejected.map((file) => [file.name, file.reason])).toEqual([
      ['large.png', 'maxSize'],
      ['script.js', 'accept'],
    ]);
  });
});
