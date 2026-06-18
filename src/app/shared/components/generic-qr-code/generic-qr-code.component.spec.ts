import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericQrCodeComponent } from './generic-qr-code.component';

describe('GenericQrCodeComponent', () => {
  let fixture: ComponentFixture<GenericQrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericQrCodeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericQrCodeComponent);
  });

  it('renders a module grid for configured values without exposing the encoded value as text', () => {
    const encodedValue = 'qr-payload-value-that-must-stay-hidden';

    fixture.componentRef.setInput('config', {
      id: 'mfa-setup-qr',
      value: encodedValue,
      ariaLabel: 'Código QR para configurar verificación en dos pasos',
      classes: 'qr-wrapper',
      gridClasses: 'qr-grid',
      moduleClasses: 'qr-module',
      size: 176,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    fixture.detectChanges();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('#mfa-setup-qr');
    const grid: HTMLElement | null = fixture.nativeElement.querySelector('.zlp-qr-code__grid.qr-grid');
    const modules = fixture.nativeElement.querySelectorAll('[data-qr-module].qr-module');

    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('role')).toBe('img');
    expect(wrapper?.getAttribute('aria-label')).toBe('Código QR para configurar verificación en dos pasos');
    expect(wrapper?.style.width).toBe('176px');
    expect(wrapper?.style.height).toBe('176px');
    expect(grid).not.toBeNull();
    expect(modules.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain(encodedValue);
    expect(fixture.nativeElement.innerHTML).not.toContain(encodedValue);
  });

  it('shows the configured empty-state message when no value is available', () => {
    fixture.componentRef.setInput('config', {
      id: 'missing-qr',
      value: '',
      emptyText: 'QR no disponible',
      classes: 'qr-wrapper',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-qr-module]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('QR no disponible');
  });
});
