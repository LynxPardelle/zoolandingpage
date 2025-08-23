import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { ServicesSectionComponent } from './services-section.component';

describe('ServicesSectionComponent analytics', () => {
  let fixture: ComponentFixture<ServicesSectionComponent>;
  let component: ServicesSectionComponent;
  let analytics: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServicesSectionComponent],
    });
    fixture = TestBed.createComponent(ServicesSectionComponent);
    component = fixture.componentInstance;
    analytics = TestBed.inject(AnalyticsService);
    spyOn(analytics, 'track').and.callThrough();
    // Provide minimal input
    (component as any).services = () => [
      {
        icon: 'check',
        title: 'T1',
        description: 'D',
        features: [],
        color: 'accentColor',
      },
    ];
    fixture.detectChanges();
  });

  it('tracks service CTA clicks', () => {
    component.onCta('T1');
    expect(analytics.track).toHaveBeenCalledWith('services_cta_click', jasmine.any(Object));
  });
});
