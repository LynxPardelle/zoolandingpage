import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalCtaSectionComponent } from './final-cta-section.component';

describe('FinalCtaSectionComponent analytics', () => {
  let fixture: ComponentFixture<FinalCtaSectionComponent>;
  let component: FinalCtaSectionComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinalCtaSectionComponent],
    });
    fixture = TestBed.createComponent(FinalCtaSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits primary/secondary outputs on click handlers', () => {
    const primarySpy = jasmine.createSpy('primary');
    const secondarySpy = jasmine.createSpy('secondary');
    component.primary.subscribe(primarySpy);
    component.secondary.subscribe(secondarySpy);
    component.onPrimary();
    component.onSecondary();
    expect(primarySpy).toHaveBeenCalled();
    expect(secondarySpy).toHaveBeenCalled();
  });
});
