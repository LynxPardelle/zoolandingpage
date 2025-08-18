import { TestBed } from '@angular/core/testing';
import { StatsCounterComponent } from './stats-counter.component';

describe('StatsCounterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsCounterComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(StatsCounterComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display initial value', () => {
    const fixture = TestBed.createComponent(StatsCounterComponent);
    fixture.componentRef.setInput('config', {
      target: 100,
      durationMs: 0, // No animation for test
      startOnVisible: false,
      format: (v: number) => v.toString(),
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent?.trim()).toBe('100');
  });

  it('should emit completed event when animation finishes', () => {
    const fixture = TestBed.createComponent(StatsCounterComponent);
    const component = fixture.componentInstance;
    spyOn(component.completed, 'emit');

    fixture.componentRef.setInput('config', {
      target: 50,
      durationMs: 0, // No animation for test
      startOnVisible: false,
    });
    fixture.detectChanges();

    // The completed event should be emitted when duration is 0
    expect(component.completed.emit).toHaveBeenCalled();
  });

  it('should respect prefers-reduced-motion', () => {
    // Mock matchMedia for reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jasmine.createSpy().and.callFake((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jasmine.createSpy(),
        removeListener: jasmine.createSpy(),
      })),
    });

    const fixture = TestBed.createComponent(StatsCounterComponent);
    fixture.componentRef.setInput('config', {
      target: 100,
      startOnVisible: true,
    });
    fixture.detectChanges();

    // When reduced motion is preferred, should show target value immediately
    expect(fixture.componentInstance.internalValue()).toBe(100);
  });
});
