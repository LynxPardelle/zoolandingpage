import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { RoiCalculatorSectionComponent } from './roi-calculator-section.component';

describe('RoiCalculatorSectionComponent analytics', () => {
  let fixture: ComponentFixture<RoiCalculatorSectionComponent>;
  let component: RoiCalculatorSectionComponent;
  let analytics: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RoiCalculatorSectionComponent],
    });
    fixture = TestBed.createComponent(RoiCalculatorSectionComponent);
    component = fixture.componentInstance;
    analytics = TestBed.inject(AnalyticsService);
    spyOn(analytics, 'track').and.callThrough();
    // Provide minimal required inputs
    (component as any).businessSize = () => 'small';
    (component as any).industry = () => 'retail';
    (component as any).visitors = () => 1000;
    (component as any).calculatedROI = () => ({ roiPercentage: 250, monthlyIncrease: 5000 });
    fixture.detectChanges();
  });

  it('tracks ROI interactions', () => {
    component.updateBusinessSize('medium');
    component.updateIndustry('tech');
    expect(analytics.track).toHaveBeenCalledWith('roi_size_change', jasmine.any(Object));
    expect(analytics.track).toHaveBeenCalledWith('roi_industry_change', jasmine.any(Object));
  });
});
