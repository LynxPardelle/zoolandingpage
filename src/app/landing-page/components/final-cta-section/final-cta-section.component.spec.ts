import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalCtaSectionComponent } from './final-cta-section.component';

describe('FinalCtaSectionComponent', () => {
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

  it('renders wrapper-orchestrator', () => {
    expect(component).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('wrapper-orchestrator')).not.toBeNull();
  });
});
