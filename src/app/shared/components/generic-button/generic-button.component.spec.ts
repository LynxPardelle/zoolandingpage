import { TestBed } from '@angular/core/testing';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import { GenericButtonComponent } from './generic-button.component';

describe('GenericButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericButtonComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render with default variant', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    fixture.componentRef.setInput('config', { label: 'Default' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should compose root and child ids from the component id when config.id is missing', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);

    fixture.componentRef.setInput('componentId', 'cta');
    fixture.componentRef.setInput('config', {
      label: 'Send',
      icon: 'send',
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.id).toBe('cta-button');
    expect(button.querySelector('#cta-button-content')).toBeTruthy();
    expect(button.querySelector('#cta-button-content-label')?.textContent).toContain('Send');
    expect(button.querySelector('#cta-button-content-icon-before')).toBeTruthy();
  });

  it('should emit pressed event on click', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const component = fixture.componentInstance;
    spyOn(component.pressed, 'emit');

    fixture.componentRef.setInput('config', { label: 'Click me' });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button?.click();

    expect(component.pressed.emit).toHaveBeenCalled();
  });

  it('should call config.pressed on click', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const pressed = jasmine.createSpy('pressed');

    fixture.componentRef.setInput('config', { label: 'Click me', pressed });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button?.click();

    expect(pressed).toHaveBeenCalled();
  });

  it('should resolve thunk-backed config values into DOM attributes', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);

    fixture.componentRef.setInput('config', {
      label: () => 'Dynamic label',
      type: () => 'submit',
      tabIndex: () => 2,
      ariaSelected: () => true,
      ariaLabel: () => 'Submit dynamic label',
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.textContent).toContain('Dynamic label');
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.getAttribute('tabindex')).toBe('2');
    expect(button.getAttribute('aria-selected')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Submit dynamic label');
  });

  it('should resolve dynamic inline styles', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);

    fixture.componentRef.setInput('config', {
      label: 'Dynamic style',
      styles: () => ({
        backgroundColor: '#ee8130',
        '--button-accent': '#ee8130',
      }),
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.style.backgroundColor).toBe('rgb(238, 129, 48)');
    expect(button.style.getPropertyValue('--button-accent')).toBe('#ee8130');
  });

  it('should not invoke handlers when disabled', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const component = fixture.componentInstance;
    const pressed = jasmine.createSpy('pressed');
    spyOn(component.pressed, 'emit');

    fixture.componentRef.setInput('config', { label: 'Disabled', disabled: true, pressed });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(pressed).not.toHaveBeenCalled();
    expect(component.pressed.emit).not.toHaveBeenCalled();
  });

  it('should append configured disabled classes when disabled', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);

    fixture.componentRef.setInput('config', {
      label: 'Continuar',
      disabled: true,
      classes: 'btnBase ank-cursor-pointer',
      disabledClasses: 'btnDisabled zlp-cursor-not-allowed ank-opacity-0_45',
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
    expect(button.className).toContain('btnBase');
    expect(button.className).toContain('btnDisabled');
    expect(button.className).toContain('zlp-cursor-not-allowed');
    expect(button.className).toContain('ank-opacity-0_45');
    expect(button.className).not.toContain('ank-cursor-pointer');
  });

  it('should not invoke handlers when loading', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const component = fixture.componentInstance;
    const pressed = jasmine.createSpy('pressed');
    spyOn(component.pressed, 'emit');

    fixture.componentRef.setInput('config', { label: 'Loading', loading: true, pressed });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(pressed).not.toHaveBeenCalled();
    expect(component.pressed.emit).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('can disable itself while the nearest interaction scope is invalid', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GenericButtonComponent],
      providers: [InteractionScopeService],
    });
    const scope = TestBed.inject(InteractionScopeService);
    scope.configure({ scopeId: 'signup' });
    scope.registerField({ fieldId: 'email', initialValue: '', required: true });

    const fixture = TestBed.createComponent(GenericButtonComponent);
    fixture.componentRef.setInput('config', {
      label: 'Crear cuenta',
      disabledWhenInvalidScope: true,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();

    scope.setFieldValue('email', 'user@example.com', { markTouched: true });
    fixture.detectChanges();

    expect(button.disabled).toBeFalse();
  });

  it('keeps scoped submit disabled when a rendered form field is invalid', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GenericButtonComponent],
      providers: [InteractionScopeService],
    });
    const scope = TestBed.inject(InteractionScopeService);
    scope.configure({ scopeId: 'signup' });
    scope.registerField({ fieldId: 'email', initialValue: '', required: true });

    const fixture = TestBed.createComponent(GenericButtonComponent);
    const form = document.createElement('form');
    const renderedField = document.createElement('generic-input');
    renderedField.setAttribute('data-zlp-field-valid', 'false');
    form.appendChild(renderedField);
    form.appendChild(fixture.nativeElement);
    document.body.appendChild(form);

    fixture.componentRef.setInput('config', {
      label: 'Crear cuenta',
      disabledWhenInvalidScope: true,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();

    form.remove();
  });

  it('does not trap scoped submit disabled when rendered form fields are valid', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GenericButtonComponent],
      providers: [InteractionScopeService],
    });
    const scope = TestBed.inject(InteractionScopeService);
    scope.configure({ scopeId: 'signup' });
    scope.registerField({ fieldId: 'staleHiddenField', initialValue: '', required: true });

    const fixture = TestBed.createComponent(GenericButtonComponent);
    const form = document.createElement('form');
    const renderedField = document.createElement('generic-input');
    renderedField.setAttribute('data-zlp-field-valid', 'true');
    form.appendChild(renderedField);
    form.appendChild(fixture.nativeElement);
    document.body.appendChild(form);

    fixture.componentRef.setInput('config', {
      label: 'Crear cuenta',
      disabledWhenInvalidScope: true,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeFalse();

    form.remove();
  });

  it('should render the icon after the label when iconPosition is after', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);

    fixture.componentRef.setInput('componentId', 'more');
    fixture.componentRef.setInput('config', {
      label: 'More',
      icon: 'expand_more',
      iconPosition: 'after',
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const content = button.querySelector('#more-button-content') as HTMLElement | null;
    const firstChild = content?.firstElementChild as HTMLElement | null;
    const lastChild = content?.lastElementChild as HTMLElement | null;

    expect(firstChild?.tagName).toBe('SPAN');
    expect(lastChild?.tagName.toLowerCase()).toBe('generic-icon');
  });
});
