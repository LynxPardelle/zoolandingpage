import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericStepperComponent } from './generic-stepper.component';

describe('GenericStepperComponent', () => {
  let fixture: ComponentFixture<GenericStepperComponent>;
  let comp: GenericStepperComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericStepperComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericStepperComponent);
    comp = fixture.componentInstance;
    comp.stepsSource = [
      { id: 's1', label: 'One', completed: true },
      { id: 's2', label: 'Two' },
      { id: 's3', label: 'Three', optional: true },
    ];
    comp.config = { linear: true };
    fixture.detectChanges();
  });
  it('should render steps and enforce linear navigation', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button.step-trigger')) as HTMLButtonElement[];
    expect(buttons.length).toBe(3);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(false); // next incomplete allowed
    expect(buttons[2].disabled).toBe(true);
  });
  it('should select active step on click if allowed', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button.step-trigger')) as HTMLButtonElement[];
    buttons[1].click();
    fixture.detectChanges();
    expect(comp.isActive(1)).toBe(true);
  });
});
