import { TestBed } from '@angular/core/testing';
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
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should emit pressed event on click', () => {
    const fixture = TestBed.createComponent(GenericButtonComponent);
    const component = fixture.componentInstance;
    spyOn(component.pressed, 'emit');

    const button = fixture.nativeElement.querySelector('button');
    button?.click();

    expect(component.pressed.emit).toHaveBeenCalled();
  });
});
