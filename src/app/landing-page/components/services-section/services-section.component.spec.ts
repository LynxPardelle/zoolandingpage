import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServicesSectionComponent } from './services-section.component';

describe('ServicesSectionComponent analytics', () => {
  let fixture: ComponentFixture<ServicesSectionComponent>;
  let component: ServicesSectionComponent;
  let emitted: any = null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServicesSectionComponent],
    });
    fixture = TestBed.createComponent(ServicesSectionComponent);
    component = fixture.componentInstance;
    component.analyticsEvent.subscribe(e => emitted = e);
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

  it('emits analytics event for service CTA clicks', () => {
    component.onCta('T1');
    expect(emitted?.name).toBe('services_cta_click');
    expect(emitted?.category).toBe('cta');
    expect(emitted?.label).toBe('T1');
    expect(emitted?.meta?.location).toBe('services-section');
  });
});
