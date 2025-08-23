import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { FinalCtaSectionComponent } from './final-cta-section.component';

describe('FinalCtaSectionComponent analytics', () => {
  let fixture: ComponentFixture<FinalCtaSectionComponent>;
  let component: FinalCtaSectionComponent;
  let analytics: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinalCtaSectionComponent],
    });
    fixture = TestBed.createComponent(FinalCtaSectionComponent);
    component = fixture.componentInstance;
    analytics = TestBed.inject(AnalyticsService);
    spyOn(analytics, 'track').and.callThrough();
    fixture.detectChanges();
  });

  it('tracks primary/secondary clicks', () => {
    component.onPrimary();
    component.onSecondary();
    expect(analytics.track).toHaveBeenCalledWith('final_cta_primary_click', jasmine.any(Object));
    expect(analytics.track).toHaveBeenCalledWith('final_cta_secondary_click', jasmine.any(Object));
  });
});
